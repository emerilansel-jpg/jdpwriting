const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

async function fixMerges() {
  console.log('🔄 Rewriting all Merge nodes in Orchestrator to accumulate state without losing keyword...');
  const orch = await fetch(`${N8N_URL}/api/v1/workflows/cQiEML8ZSa1UcmqH`, { headers }).then(r => r.json());

  // 1. Convert Merge 1A to code
  const m1a = orch.nodes.find(n => n.id === 'merge_1a');
  if (m1a) {
    m1a.type = 'n8n-nodes-base.code';
    m1a.typeVersion = 1;
    m1a.parameters = {
      jsCode: `
const init = $('Initialize Accumulator').first().json;
const out = $input.first().json;
return [{
  json: {
    ...init,
    serp_data: out.serp_data || out.output || JSON.stringify(out)
  }
}];
`
    };
  }

  // 2. Convert Merge 1B to code
  const m1b = orch.nodes.find(n => n.id === 'merge_1b');
  if (m1b) {
    m1b.type = 'n8n-nodes-base.code';
    m1b.typeVersion = 1;
    m1b.parameters = {
      jsCode: `
const prior = $('Merge 1A').first()?.json || $('Initialize Accumulator').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    info_gain: out.info_gain || out.output || JSON.stringify(out)
  }
}];
`
    };
  }

  // 3. Convert Merge 1C to code
  const m1c = orch.nodes.find(n => n.id === 'merge_1c');
  if (m1c) {
    m1c.type = 'n8n-nodes-base.code';
    m1c.typeVersion = 1;
    m1c.parameters = {
      jsCode: `
const prior = $('Merge 1B').first()?.json || $('Initialize Accumulator').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    lsi_keywords: out.lsi_keywords || out.output || JSON.stringify(out)
  }
}];
`
    };
  }

  // 4. Convert Merge 1D to code
  const m1d = orch.nodes.find(n => n.id === 'merge_1d');
  if (m1d) {
    m1d.type = 'n8n-nodes-base.code';
    m1d.typeVersion = 1;
    m1d.parameters = {
      jsCode: `
const prior = $('Merge 1C').first()?.json || $('Initialize Accumulator').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    outline: out.outline || out.output || JSON.stringify(out)
  }
}];
`
    };
  }

  // 5. Convert Merge 1E to code
  const m1e = orch.nodes.find(n => n.id === 'merge_1e');
  if (m1e) {
    m1e.type = 'n8n-nodes-base.code';
    m1e.typeVersion = 1;
    m1e.parameters = {
      jsCode: `
const prior = $('Merge 1D').first()?.json || $('Initialize Accumulator').first().json;
const out = $input.first().json;
const art = out.article || out.output || '';
return [{
  json: {
    ...prior,
    article: art
  }
}];
`
    };
  }

  // 6. Convert Merge 2A to code
  const m2a = orch.nodes.find(n => n.id === 'merge_2a');
  if (m2a) {
    m2a.type = 'n8n-nodes-base.code';
    m2a.typeVersion = 1;
    m2a.parameters = {
      jsCode: `
const prior = $('Merge 1E').first()?.json || $('Initialize Accumulator').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    title_meta: out.title_meta || out.output || JSON.stringify(out)
  }
}];
`
    };
  }

  // 7. Convert Merge 2I to code
  const m2i = orch.nodes.find(n => n.id === 'merge_2i');
  if (m2i) {
    m2i.type = 'n8n-nodes-base.code';
    m2i.typeVersion = 1;
    m2i.parameters = {
      jsCode: `
const prior = $('Step 2H: Embed Quotes').first()?.json || $('Merge 2A').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    eeat_hcu_eav_analysis: out.eeat_hcu_eav_analysis || out.output || JSON.stringify(out)
  }
}];
`
    };
  }

  // 8. Convert Merge 2J to code
  const m2j = orch.nodes.find(n => n.id === 'merge_2j');
  if (m2j) {
    m2j.type = 'n8n-nodes-base.code';
    m2j.typeVersion = 1;
    m2j.parameters = {
      jsCode: `
const prior = $('Merge 2I').first()?.json || $('Merge 2A').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    quality_fact_check: out.quality_fact_check || out.output || JSON.stringify(out)
  }
}];
`
    };
  }

  // Also ensure intermediate Phase 2 optimization steps pass full article:
  // Step 2B -> Step 2C: Step 2B outputs intro_rewrite, we must keep article from 1E!
  // In connections:
  // Merge 2A -> Step 2B -> Step 2C
  // In Step 2C, user prompt takes {{article}}. If Step 2C takes input from Step 2B directly, it might only get intro_rewrite!
  // So let's insert a Bridge node between 2B and 2C:
  let bridge2b = orch.nodes.find(n => n.id === 'bridge_2b');
  if (!bridge2b) {
    bridge2b = {
      id: 'bridge_2b',
      name: 'Bridge 2B',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [3350, 300],
      parameters: {
        jsCode: `
const introOutput = $input.first().json;
const prior = $('Merge 2A').first().json;
return [{
  json: {
    ...prior,
    intro_rewrite: introOutput.intro_rewrite || introOutput.output || '',
    article: prior.article // PRESERVE FULL ARTICLE!
  }
}];
`
      }
    };
    orch.nodes.push(bridge2b);
    orch.connections['Step 2B: Intro Rewrite'] = { main: [[{ node: 'Bridge 2B', type: 'main', index: 0 }]] };
    orch.connections['Bridge 2B'] = { main: [[{ node: 'Step 2C: Originality', type: 'main', index: 0 }]] };
  }

  // Bridge between 2D and 2E:
  // Step 2D tightens article. Step 2E generates FAQ.
  // Step 2E -> Step 2F: Step 2E outputs FAQ. Step 2F needs article!
  let bridge2e = orch.nodes.find(n => n.id === 'bridge_2e');
  if (!bridge2e) {
    bridge2e = {
      id: 'bridge_2e',
      name: 'Bridge 2E',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [4050, 300],
      parameters: {
        jsCode: `
const faqOutput = $input.first().json;
const priorArticle = $('Step 2D: Fluff Check').first()?.json?.article || $('Merge 1E').first().json.article;
const prior = $('Bridge 2B').first()?.json || $('Merge 2A').first().json;
return [{
  json: {
    ...prior,
    faq: faqOutput.faq || faqOutput.output || JSON.stringify(faqOutput),
    article: priorArticle
  }
}];
`
      }
    };
    orch.nodes.push(bridge2e);
    orch.connections['Step 2E: FAQ'] = { main: [[{ node: 'Bridge 2E', type: 'main', index: 0 }]] };
    orch.connections['Bridge 2E'] = { main: [[{ node: 'Step 2F: Conclusion', type: 'main', index: 0 }]] };
  }

  // Bridge after 2F (Conclusion) to 2G (Table):
  // Step 2F outputs conclusion_rewrite. Step 2G needs full article from 2D!
  let bridge2f = orch.nodes.find(n => n.id === 'bridge_2f');
  if (!bridge2f) {
    bridge2f = {
      id: 'bridge_2f',
      name: 'Bridge 2F',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [4250, 300],
      parameters: {
        jsCode: `
const concOutput = $input.first().json;
const priorArticle = $('Step 2D: Fluff Check').first()?.json?.article || $('Merge 1E').first().json.article;
const prior = $('Bridge 2E').first()?.json || $('Merge 2A').first().json;
return [{
  json: {
    ...prior,
    conclusion_rewrite: concOutput.conclusion_rewrite || concOutput.output || '',
    article: priorArticle
  }
}];
`
      }
    };
    orch.nodes.push(bridge2f);
    orch.connections['Step 2F: Conclusion'] = { main: [[{ node: 'Bridge 2F', type: 'main', index: 0 }]] };
    orch.connections['Bridge 2F'] = { main: [[{ node: 'Step 2G: Add Table', type: 'main', index: 0 }]] };
  }

  // Save & Activate
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
  console.log('🎉 ALL ORCHESTRATOR MERGES & BRIDGES CONVERTED TO CODE ACCUMULATORS!');
}

fixMerges().catch(console.error);
