const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

async function updateSubWorkflowsStatePreservation() {
  console.log('🔄 Updating parse_result across all sub-workflows to preserve incoming state...');
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());

  for (const wf of wfs.data) {
    if (wf.name.includes('Orchestrator') || wf.name.includes('5A') || wf.name.includes('6A')) continue;

    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    const prNode = full.nodes.find(n => n.id === 'parse_result');
    if (!prNode) continue;

    // Fix parse_result to spread ...resp and preserve all upstream state
    prNode.typeVersion = 1;
    prNode.parameters.jsCode = `
const resp = $input.first().json;
const content = resp.choices?.[0]?.message?.content || resp.content || '';
const outputFormat = resp.output_format || 'markdown';
const outputVariable = resp.output_variable || 'output';

let parsed = { raw_output: content };
try {
  parsed = JSON.parse(content);
} catch (e) {
  const m = content.match(/\`\`\`json\\n?([\\s\\S]*?)\\n?\`\`\`/);
  if (m) {
    try { parsed = JSON.parse(m[1]); } catch (e2) {}
  }
}

const outputValue = (outputFormat === 'json' || outputFormat === 'json_schema') ? JSON.stringify(parsed) : content;

return [{
  json: {
    ...resp, // PRESERVE ALL ACCUMULATED CONTEXT (keyword, cta, internal_links, outline, article, etc.)
    output_json: JSON.stringify(parsed),
    output_raw: content,
    [outputVariable]: outputValue,
    keyword: resp.keyword,
    step_id: resp.step_id,
    input_tokens: resp.usage?.prompt_tokens || resp.input_tokens || 0,
    output_tokens: resp.usage?.completion_tokens || resp.output_tokens || 0,
    model: resp.model || resp.model_name
  }
}];
`;

    // Ensure parse_result connects to return
    full.connections['parse_result'] = {
      main: [[{ node: 'return', type: 'main', index: 0 }]]
    };

    // Ensure all code nodes have typeVersion: 1
    full.nodes.forEach(n => {
      if (n.type === 'n8n-nodes-base.code') {
        n.typeVersion = 1;
      }
    });

    await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: full.name,
        nodes: full.nodes,
        connections: full.connections,
        settings: full.settings
      })
    });

    await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}/activate`, { method: 'POST', headers });
    console.log(`✅ ${full.name}: state preservation enabled`);
  }
}

async function updateOrchestratorMerges() {
  console.log('\n🔄 Updating all Merge nodes in Orchestrator to pass accumulated state...');
  const orch = await fetch(`${N8N_URL}/api/v1/workflows/cQiEML8ZSa1UcmqH`, { headers }).then(r => r.json());

  // Make sure every Merge node passes ...$input.first().json
  orch.nodes.forEach(n => {
    if (n.name.startsWith('Merge ') && n.type === 'n8n-nodes-base.code') {
      n.typeVersion = 1;
      n.parameters.jsCode = `
const inp = $input.first().json;
return [{
  json: {
    ...inp
  }
}];
`;
    }
  });

  // Ensure init_accumulator passes full initial state
  const initAcc = orch.nodes.find(n => n.id === 'init_accumulator');
  if (initAcc) {
    initAcc.type = 'n8n-nodes-base.code';
    initAcc.typeVersion = 1;
    initAcc.parameters.jsCode = `
const webhookBody = $('Webhook Trigger').first()?.json?.body || {};
const inputRow = $('Read INPUT Row').first()?.json || {};

const keyword = webhookBody.keyword || inputRow.keyword || 'how to sleep fast';
const cta = webhookBody.cta || inputRow.cta || 'Get your sleep optimization guide';
const internalLinks = webhookBody.internal_links || inputRow.internal_links || 'https://jetdigitalpro.com/sleep-tips';
const externalLinks = webhookBody.external_links || inputRow.external_links || '';

return [{
  json: {
    keyword,
    cta,
    internal_links: internalLinks,
    external_links: externalLinks,
    serp_data: '',
    info_gain: '',
    lsi_keywords: '',
    outline: '',
    article: '',
    title_meta: '',
    intro_rewrite: '',
    faq: '',
    conclusion_rewrite: '',
    eeat_hcu_eav_analysis: '',
    quality_fact_check: '',
    seo_geo_evaluator: '',
    image_prompts: '',
    infographic_prompt: '',
    alt_texts: '',
    retry_count: 0
  }
}];
`;
  }

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
  console.log('✅ Orchestrator merge nodes updated & activated!');
}

async function main() {
  await updateSubWorkflowsStatePreservation();
  await updateOrchestratorMerges();
  console.log('\n🚀 PERMANENT STATE PRESERVATION DEPLOYED! ACCUMULATOR NEVER LOSES CONTEXT.');
}

main().catch(console.error);
