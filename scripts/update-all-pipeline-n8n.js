const fs = require('fs');
const vm = require('vm');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

// Read STEPS from admin-ui.html
const html = fs.readFileSync('admin-ui.html', 'utf8');
const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/g)];
const mainScript = scripts[scripts.length - 1][1];

const context = { console, setTimeout: () => {}, clearTimeout: () => {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document: { getElementById: () => ({ classList: { add: ()=>{}, remove: ()=>{} }, style: { setProperty: ()=>{} } }), querySelectorAll: () => [], querySelector: () => null } };
vm.createContext(context);
vm.runInContext(mainScript + '\n;globalThis.__STEPS = STEPS;', context);
const steps = context.__STEPS;

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

const outputVarMap = {
  '1A': 'serp_data',
  '1B': 'info_gain',
  '1C': 'lsi_keywords',
  '1D': 'outline',
  '1E': 'article',
  '2A': 'title_meta',
  '2B': 'intro_rewrite',         // Snippet: do NOT overwrite article
  '2C': 'article',               // Full draft originality
  '2D': 'article',               // Full draft fluff check
  '2E': 'faq',                   // FAQ JSON
  '2F': 'conclusion_rewrite',    // Snippet: do NOT overwrite article
  '2G': 'article',               // Full draft with table
  '2H': 'article',               // Full draft with quotes
  '2I': 'eeat_hcu_eav_analysis',
  '2J': 'quality_fact_check',
  '2K': 'seo_geo_evaluator',
  '3A': 'image_prompts',
  '3B': 'infographic_prompt',
  '3C': 'alt_texts',
  '4A': 'article',               // Full draft with internal links
  '4B': 'article'                // Full draft with external links
};

async function updateSubWorkflows(wfs) {
  console.log('🔄 Updating all 21 LLM Sub-Workflows...');

  for (const step of steps) {
    if (step.id === '5A' || step.id === '6A') continue;
    const wf = wfs.data.find(w => w.name.includes(`Step ${step.id} `) || w.id === step.n8nId);
    if (!wf) continue;

    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    const outVar = outputVarMap[step.id] || 'output';

    // 1. Trigger goes directly to find_config
    full.connections['trigger'] = {
      main: [[{ node: 'find_config', type: 'main', index: 0 }]]
    };
    delete full.connections['read_prompts'];

    // 2. Fix find_config with built-in robust prompt & config
    const fcNode = full.nodes.find(n => n.id === 'find_config');
    if (fcNode) {
      fcNode.typeVersion = 1;
      fcNode.parameters = {
        jsCode: `
const items = $input.all();
const inputItem = items.find(i => i.json && !Array.isArray(i.json.data)) || items[0] || {};
const input = inputItem.json || {};

const cfg = {
  step_id: '${step.id}',
  step_name: ${JSON.stringify(step.name)},
  model: '${step.model}',
  temperature: ${step.temp},
  max_tokens: ${step.maxTokens},
  output_format: '${step.outputFormat}',
  system_prompt: ${JSON.stringify(step.systemPrompt)},
  user_prompt: ${JSON.stringify(step.userPrompt)},
  enabled: ${step.enabled ? 'true' : 'false'},
  llm_url: 'https://api.pesatrouter.com/v1/chat/completions',
  credential: 'pesatrouter-api-key',
  output_variable: '${outVar}'
};

return [{
  json: {
    ...input,
    ...cfg
  }
}];
`
      };
    }

    // 3. Fix prepare_vars
    const pvNode = full.nodes.find(n => n.id === 'prepare_vars');
    if (pvNode) {
      pvNode.typeVersion = 1;
    }

    // 4. Fix parse_result
    const prNode = full.nodes.find(n => n.id === 'parse_result');
    if (prNode) {
      prNode.typeVersion = 1;
    }

    // 5. Fix return node
    const retNode = full.nodes.find(n => n.id === 'return');
    if (retNode) {
      retNode.typeVersion = 1;
    }

    // 6. Fix save_tracking
    const trackNode = full.nodes.find(n => n.id === 'save_tracking');
    if (trackNode) {
      trackNode.continueOnFail = true;
      trackNode.alwaysOutputData = true;
      trackNode.parameters = {
        operation: 'append',
        documentId: { '__rl': true, 'value': SPREADSHEET_ID, 'mode': 'id' },
        sheetName: { '__rl': true, 'value': 'TRACKING', 'mode': 'name' },
        dataMode: 'autoMapInputData',
        options: {}
      };
    }

    // Save & Activate
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
    console.log(`✅ [Step ${step.id}] Updated & Activated (${step.model} -> ${outVar})`);
  }
}

async function updateOrchestrator(wfs) {
  console.log('\n🔄 Updating Orchestrator cQiEML8ZSa1UcmqH...');
  const orch = await fetch(`${N8N_URL}/api/v1/workflows/cQiEML8ZSa1UcmqH`, { headers }).then(r => r.json());

  // 1. Map all step executeWorkflow nodes to n8n v2 format
  const stepNodes = orch.nodes.filter(n => n.type === 'n8n-nodes-base.executeWorkflow');
  stepNodes.forEach(sn => {
    // Determine step ID from node name or id
    const match = sn.name.match(/Step ([0-9][A-K])/i) || sn.id.match(/step_([0-9][a-k])/i);
    if (!match) return;
    const stepId = match[1].toUpperCase();
    const stepInfo = steps.find(s => s.id === stepId);
    const targetWfId = stepInfo ? stepInfo.n8nId : (sn.parameters.workflowId?.value || sn.parameters.workflowId);

    sn.parameters = {
      source: 'database',
      workflowId: {
        __rl: true,
        value: targetWfId,
        mode: 'id'
      },
      mode: 'combine',
      options: {}
    };
  });

  // 2. Fix read_input
  const readInput = orch.nodes.find(n => n.id === 'read_input');
  if (readInput) {
    readInput.alwaysOutputData = true;
  }

  // 3. Fix init_accumulator
  const initAcc = orch.nodes.find(n => n.id === 'init_accumulator');
  if (initAcc) {
    initAcc.type = 'n8n-nodes-base.code';
    initAcc.typeVersion = 1;
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

  // 4. Update all Merge nodes in Orchestrator to typeVersion: 1 and preserve accumulated state
  orch.nodes.forEach(n => {
    if (n.name.startsWith('Merge ') && n.type === 'n8n-nodes-base.code') {
      n.typeVersion = 1;
    }
  });

  // 5. Ensure Step 3C -> Merge 3C -> Step 4A chaining
  if (!orch.nodes.find(n => n.id === 'merge_3c')) {
    orch.nodes.push({
      id: 'merge_3c',
      name: 'Merge 3C',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [7300, 300],
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
    });

    orch.connections['Step 3C: Alt Texts'] = {
      main: [[{ node: 'Merge 3C', type: 'main', index: 0 }]]
    };
    orch.connections['Merge 3C'] = {
      main: [[{ node: 'Step 4A: Internal Links', type: 'main', index: 0 }]]
    };
  }

  // 6. Save & Activate Orchestrator
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
  console.log('✅ Orchestrator updated & activated!');
}

async function main() {
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());
  await updateSubWorkflows(wfs);
  await updateOrchestrator(wfs);
  console.log('\n🚀 ALL WORKFLOWS IN N8N VPS ARE NOW RECONFIGURED FOR SOLID MULTI-STEP EXECUTION!');
}

main().catch(console.error);
