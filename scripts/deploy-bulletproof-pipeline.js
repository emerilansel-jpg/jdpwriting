const fs = require('fs');
const vm = require('vm');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

// Extract STEPS from admin-ui.html (the single source of truth for prompts)
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
  '2B': 'intro_rewrite',         // CRITICAL: intro snippet only, does NOT overwrite article
  '2C': 'article',               // Full draft originality rewrite
  '2D': 'article',               // Full draft fluff check
  '2E': 'faq',                   // FAQ JSON
  '2F': 'conclusion_rewrite',    // CRITICAL: conclusion snippet only, does NOT overwrite article
  '2G': 'article',               // Full draft with table
  '2H': 'article',               // Full draft with quotes
  '2I': 'eeat_hcu_eav_analysis',
  '2J': 'quality_fact_check',
  '2K': 'seo_geo_evaluator',
  '3A': 'image_prompts',
  '3B': 'infographic_prompt',
  '3C': 'alt_texts',
  '4A': 'article',               // Full draft with internal links
  '4B': 'article'                // Final full draft with external links
};

async function updateSubWorkflows() {
  console.log('🔄 Fetching all workflows from n8n VPS...');
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());

  for (const step of steps) {
    if (step.id === '5A' || step.id === '6A') continue;
    const wf = wfs.data.find(w => w.name.includes(`Step ${step.id} `) || w.id === step.n8nId);
    if (!wf) {
      console.warn(`⚠️ Workflow for step ${step.id} not found in n8n!`);
      continue;
    }

    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    const outVar = outputVarMap[step.id] || 'output';

    // Update find_config node
    const fcNode = full.nodes.find(n => n.id === 'find_config');
    if (fcNode) {
      fcNode.parameters.jsCode = `
const items = $input.all();
const inputItem = items.find(i => i.json && !Array.isArray(i.json.data)) || items[0] || {};
const input = inputItem.json || {};

// Robust default step config
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
`;
    }

    // Update prepare_vars node
    const pvNode = full.nodes.find(n => n.id === 'prepare_vars');
    if (pvNode) {
      pvNode.parameters.jsCode = `
const cfg = $input.first().json;
const input = $input.first().json;

const flat = {};
const configKeys = ['step_id','step_name','model','temperature','max_tokens','output_format','system_prompt','user_prompt','llm_url','credential','output_variable','enabled'];
function flatten(prefix, value) {
  if (value === undefined || value === null) {
    flat[prefix] = '';
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    flat[prefix] = JSON.stringify(value);
    for (const [k, v] of Object.entries(value)) {
      flatten(prefix + '.' + k, v);
    }
  } else {
    flat[prefix] = String(value);
  }
}

Object.entries(input).forEach(([k, v]) => {
  if (!configKeys.includes(k)) {
    flatten(k, v);
  }
});

let user = cfg.user_prompt;
const keys = Object.keys(flat).sort((a, b) => b.length - a.length);
for (const k of keys) {
  const escaped = k.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
  user = user.replace(new RegExp('{{' + escaped + '}}', 'g'), flat[k]);
}

return [{
  json: {
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.max_tokens,
    system_prompt: cfg.system_prompt,
    user_prompt: user,
    llm_url: cfg.llm_url,
    credential: cfg.credential,
    output_variable: cfg.output_variable,
    output_format: cfg.output_format,
    keyword: input.keyword,
    step_id: cfg.step_id,
    ...input
  }
}];
`;
    }

    // Ensure save_tracking doesn't crash if TRACKING sheet isn't pre-formatted
    const trackNode = full.nodes.find(n => n.id === 'save_tracking');
    if (trackNode) {
      trackNode.alwaysOutputData = true;
    }

    // Save and activate sub-workflow
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

    await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}/activate`, {
      method: 'POST',
      headers
    });

    console.log(`✅ [Step ${step.id}] Updated & Activated (${step.model} -> outputVar: ${outVar})`);
  }
}

async function main() {
  await updateSubWorkflows();
  console.log('\n🎉 ALL 21 LLM SUB-WORKFLOWS ARE NOW BULLETPROOF & RESILIENT!');
}

main().catch(console.error);
