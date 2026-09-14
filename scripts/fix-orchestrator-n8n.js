const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

const orch = JSON.parse(fs.readFileSync('current-orchestrator.json', 'utf8'));

// 1. Fix read_input to always output data
const readInput = orch.nodes.find(n => n.id === 'read_input');
if (readInput) {
  readInput.alwaysOutputData = true;
}

// 2. Fix init_accumulator to safely merge webhook body or sheet row
const initAcc = orch.nodes.find(n => n.id === 'init_accumulator');
if (initAcc) {
  initAcc.type = 'n8n-nodes-base.code';
  initAcc.typeVersion = 2;
  initAcc.parameters = {
    jsCode: `
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
    serp_data: '{}',
    info_gain: '{}',
    lsi_keywords: '{}',
    outline: '',
    article: '',
    title_meta: '{}',
    intro_rewrite: '',
    faq: '[]',
    conclusion_rewrite: '',
    eeat_hcu_eav_analysis: '{}',
    quality_fact_check: '{}',
    seo_geo_evaluator: '{}',
    image_prompts: '{}',
    infographic_prompt: '',
    alt_texts: '{}',
    retry_count: 0
  }
}];
`
  };
}

// 3. Update all Merge nodes to use options: { includeOtherFields: true } so they never drop previous variables
const mergeNodes = orch.nodes.filter(n => n.name.startsWith('Merge '));
mergeNodes.forEach(m => {
  if (m.parameters) {
    m.parameters.options = { includeOtherFields: true };
  }
});

// 4. Ensure Step 4A gets article from 2H (NOT from 3C)
// In connections: Step 3C was connected to Step 4A.
// We should make Step 4A take the accumulated article!
// Let's add a bridge/merge node for Step 3C so it merges alt_texts into accumulator and keeps article from 2H
const altMergeNode = {
  id: 'merge_3c',
  name: 'Merge 3C',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [
    7300,
    300
  ],
  parameters: {
    jsCode: `
const altOutput = $input.first().json;
const priorArticle = $('Step 2H: Embed Quotes').first()?.json?.article || $('Step 1E: Generate Article').first()?.json?.article || '';
const init = $('Initialize Accumulator').first().json;

return [{
  json: {
    ...init,
    article: priorArticle,
    alt_texts: altOutput.alt_texts || altOutput.output || JSON.stringify(altOutput),
    image_prompts: $('Step 3A: Image Prompts').first()?.json?.image_prompts || '{}',
    infographic_prompt: $('Step 3B: Infographic').first()?.json?.infographic_prompt || '',
    title_meta: $('Step 2A: Title & Meta').first()?.json?.title_meta || '{}'
  }
}];
`
  }
};

// Check if merge_3c already exists
if (!orch.nodes.find(n => n.id === 'merge_3c')) {
  orch.nodes.push(altMergeNode);
  // Re-route: Step 3C -> Merge 3C -> Step 4A
  orch.connections['Step 3C: Alt Texts'] = {
    main: [[{ node: 'Merge 3C', type: 'main', index: 0 }]]
  };
  orch.connections['Merge 3C'] = {
    main: [[{ node: 'Step 4A: Internal Links', type: 'main', index: 0 }]]
  };
}

// 5. Save & Activate on n8n VPS
async function updateOrch() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };
  
  await fetch(`${N8N_URL}/api/v1/workflows/${orch.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: orch.name,
      nodes: orch.nodes,
      connections: orch.connections,
      settings: orch.settings
    })
  }).then(r => r.json());

  const act = await fetch(`${N8N_URL}/api/v1/workflows/${orch.id}/activate`, {
    method: 'POST',
    headers
  }).then(r => r.json());

  console.log(`✅ Orchestrator cQiEML8ZSa1UcmqH updated & activated! (active: ${act.active})`);
}

updateOrch().catch(console.error);
