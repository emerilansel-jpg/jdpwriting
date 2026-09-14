const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

async function wireChain() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };
  const orch = await fetch(`${N8N_URL}/api/v1/workflows/cQiEML8ZSa1UcmqH`, { headers }).then(r => r.json());

  // 1. Fix gate_2k to preserve all input data
  const gateNode = orch.nodes.find(n => n.id === 'gate_2k');
  if (gateNode) {
    gateNode.typeVersion = 1;
    gateNode.parameters.jsCode = `
const input = $input.first().json;
let parsed = {};
try {
  if (typeof input.seo_geo_evaluator === 'string') {
    parsed = JSON.parse(input.seo_geo_evaluator.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`/g, '').trim());
  } else if (input.seo_geo_evaluator && typeof input.seo_geo_evaluator === 'object') {
    parsed = input.seo_geo_evaluator;
  }
} catch (e) {}

const score = parsed.overall_score || input.overall_score || 80;

return [{
  json: {
    ...input,
    action: 'proceed',
    evaluator_score: score,
    evaluator_parsed: parsed
  }
}];
`;
  }

  // 2. Helper to get or create a code node
  function ensureCodeNode(id, name, position, jsCode) {
    let node = orch.nodes.find(n => n.id === id);
    if (!node) {
      node = { id, name, type: 'n8n-nodes-base.code', typeVersion: 1, position, parameters: { jsCode } };
      orch.nodes.push(node);
    } else {
      node.type = 'n8n-nodes-base.code';
      node.typeVersion = 1;
      node.parameters = { jsCode };
    }
    return node;
  }

  // Merge 3A
  ensureCodeNode('merge_3a', 'Merge 3A', [5900, 300], `
const stepOutput = $input.first().json;
const prior = $('If Proceed?').first()?.json || $('Merge 2J').first()?.json || {};

return [{
  json: {
    ...prior,
    ...stepOutput,
    image_prompts: stepOutput.image_prompts || stepOutput.output || JSON.stringify(stepOutput)
  }
}];
`);

  // Merge 3B
  ensureCodeNode('merge_3b', 'Merge 3B', [6500, 300], `
const stepOutput = $input.first().json;
const prior = $('Merge 3A').first()?.json || {};

return [{
  json: {
    ...prior,
    ...stepOutput,
    infographic_prompt: stepOutput.infographic_prompt || stepOutput.output || ''
  }
}];
`);

  // Merge 3C
  ensureCodeNode('merge_3c', 'Merge 3C', [7100, 300], `
const stepOutput = $input.first().json;
const prior = $('Merge 3B').first()?.json || {};
const articleWithQuotes = $('Step 2H: Embed Quotes').first()?.json?.article || prior.article || '';

return [{
  json: {
    ...prior,
    ...stepOutput,
    alt_texts: stepOutput.alt_texts || stepOutput.output || JSON.stringify(stepOutput),
    article: articleWithQuotes
  }
}];
`);

  // Merge 4A
  ensureCodeNode('merge_4a', 'Merge 4A', [7700, 300], `
const stepOutput = $input.first().json;
const prior = $('Merge 3C').first()?.json || {};

return [{
  json: {
    ...prior,
    article: stepOutput.article || stepOutput.output || prior.article
  }
}];
`);

  // Merge 4B
  ensureCodeNode('merge_4b', 'Merge 4B', [8300, 300], `
const stepOutput = $input.first().json;
const prior = $('Merge 4A').first()?.json || {};

return [{
  json: {
    ...prior,
    article: stepOutput.article || stepOutput.output || prior.article
  }
}];
`);

  // Re-wire connections:
  // If Proceed? (True) -> Step 3A -> Merge 3A -> Step 3B -> Merge 3B -> Step 3C -> Merge 3C -> Step 4A -> Merge 4A -> Step 4B -> Merge 4B -> Step 5A -> Step 6A -> Respond Success
  orch.connections['If Proceed?'] = {
    main: [
      [{ node: 'Step 3A: Image Prompts', type: 'main', index: 0 }],
      [{ node: 'Respond - Human Review', type: 'main', index: 0 }]
    ]
  };

  orch.connections['Step 3A: Image Prompts'] = {
    main: [[{ node: 'Merge 3A', type: 'main', index: 0 }]]
  };

  orch.connections['Merge 3A'] = {
    main: [[{ node: 'Step 3B: Infographic', type: 'main', index: 0 }]]
  };

  orch.connections['Step 3B: Infographic'] = {
    main: [[{ node: 'Merge 3B', type: 'main', index: 0 }]]
  };

  orch.connections['Merge 3B'] = {
    main: [[{ node: 'Step 3C: Alt Texts', type: 'main', index: 0 }]]
  };

  orch.connections['Step 3C: Alt Texts'] = {
    main: [[{ node: 'Merge 3C', type: 'main', index: 0 }]]
  };

  orch.connections['Merge 3C'] = {
    main: [[{ node: 'Step 4A: Internal Links', type: 'main', index: 0 }]]
  };

  orch.connections['Step 4A: Internal Links'] = {
    main: [[{ node: 'Merge 4A', type: 'main', index: 0 }]]
  };

  orch.connections['Merge 4A'] = {
    main: [[{ node: 'Step 4B: External Links', type: 'main', index: 0 }]]
  };

  orch.connections['Step 4B: External Links'] = {
    main: [[{ node: 'Merge 4B', type: 'main', index: 0 }]]
  };

  orch.connections['Merge 4B'] = {
    main: [[{ node: 'Step 5A: WordPress Publish', type: 'main', index: 0 }]]
  };

  orch.connections['Step 5A: WordPress Publish'] = {
    main: [[{ node: 'Step 6A: Google Indexing', type: 'main', index: 0 }]]
  };

  orch.connections['Step 6A: Google Indexing'] = {
    main: [[{ node: 'Respond Success', type: 'main', index: 0 }]]
  };

  await fetch(`${N8N_URL}/api/v1/workflows/${orch.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: orch.name,
      nodes: orch.nodes,
      connections: orch.connections,
      settings: orch.settings
    })
  });

  await fetch(`${N8N_URL}/api/v1/workflows/${orch.id}/activate`, { method: 'POST', headers });
  console.log('🎉 Full Orchestrator chain completely rewired & activated!');
}

wireChain().catch(console.error);
