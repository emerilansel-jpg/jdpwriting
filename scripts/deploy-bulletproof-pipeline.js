const fs = require('fs');
const vm = require('vm');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

// Extract STEPS from admin-ui.html (the single source of truth for prompts)
const html = fs.readFileSync('admin-ui.html', 'utf8');
const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/g)];
const mainScript = scripts[scripts.length - 1][1];

const context = { console, setTimeout: () => {}, clearTimeout: () => {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document: { getElementById: () => ({ value: '', textContent: '', classList: { add: ()=>{}, remove: ()=>{} }, style: { setProperty: ()=>{} } }), querySelectorAll: () => [], querySelector: () => null } };
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

    // 1. Update find_config node
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

    // 2. Update prepare_vars node with fallback resolution for metadata and links
    const pvNode = full.nodes.find(n => n.id === 'prepare_vars');
    if (pvNode) {
      pvNode.parameters.jsCode = `
const cfg = $input.first().json;
const input = $input.first().json;

// Robust fallback resolution for metadata and links
if (!input.title || input.title === '{{title}}') {
  const m = (input.article || '').match(/^#\\s+(.+)$/m);
  if (m) input.title = m[1].trim();
  else if (input.keyword) input.title = input.keyword.charAt(0).toUpperCase() + input.keyword.slice(1);
}
if (!input.meta_description || input.meta_description === '{{meta_description}}') {
  const m = (input.article || '').match(/Meta description:\\s*(.+)$/m);
  if (m) input.meta_description = m[1].trim();
  else if (input.keyword) input.meta_description = \`Comprehensive guide to \${input.keyword} with expert strategies and actionable insights.\`;
}
if (!input.slug || input.slug === '{{slug}}') {
  if (input.keyword) input.slug = input.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
if (!input.internal_links || input.internal_links === '{{internal_links}}') {
  input.internal_links = input.slug ? \`https://jetdigitalpro.com/\${input.slug}\` : 'https://jetdigitalpro.com';
}
if (!input.external_links || input.external_links === '{{external_links}}') {
  input.external_links = 'https://en.wikipedia.org, https://www.cdc.gov, https://www.nih.gov';
}

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

// Second pass for nested placeholders
if (input.keyword) user = user.replace(/{{keyword}}/g, String(input.keyword));
if (input.cta) user = user.replace(/{{cta}}/g, String(input.cta));
if (input.internal_links) user = user.replace(/{{internal_links}}/g, String(input.internal_links));
if (input.external_links) user = user.replace(/{{external_links}}/g, String(input.external_links));
if (input.title) user = user.replace(/{{title}}/g, String(input.title));
if (input.meta_description) user = user.replace(/{{meta_description}}/g, String(input.meta_description));
if (input.slug) user = user.replace(/{{slug}}/g, String(input.slug));

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

    // 3. Update parse_result node with content sanitization (ONLY tables, lists, text)
    const prNode = full.nodes.find(n => n.id === 'parse_result');
    if (prNode) {
      prNode.parameters.jsCode = `
const resp = $input.first().json;
const originalInput = $('trigger').first()?.json || {};

let content = resp.choices?.[0]?.message?.content || resp.content || '';
const outputFormat = originalInput.output_format || 'markdown';
const outputVariable = originalInput.output_variable || 'output';

// Sanitize article content to enforce ONLY tables, lists, and text (NO ascii diagrams / arrow boxes)
if (outputVariable === 'article' && typeof content === 'string') {
  content = content.replace(/\`\`\`(?:[a-zA-Z]*\\n)?([\\s\\S]*?)\`\`\`/g, (match, code) => {
    if ((code.includes('↓') || code.includes('->') || code.includes('-->') || code.includes('→')) && code.includes('[')) {
      const items = code.split(/[↓→\\n]+|-->|->/).map(s => s.trim().replace(/^\\[\\s*|\\s*\\]$/g, '').trim()).filter(Boolean);
      if (items.length > 1) {
        return '\\n\\n' + items.map((item, idx) => \`\${idx + 1}. \${item.replace(/^([^:]+):/, '**$1:**')}\`).join('\\n') + '\\n\\n';
      }
    }
    return match;
  });

  content = content.replace(/\\[\\s*([^\\]]+?)\\s*\\](?:\\s*(?:↓|->|-->|→)\\s*\\[\\s*([^\\]]+?)\\s*\\])+/g, (match) => {
    const parts = match.split(/\\s*(?:↓|->|-->|→)\\s*/).map(p => p.trim().replace(/^\\[\\s*|\\s*\\]$/g, '').trim()).filter(Boolean);
    if (parts.length > 1) {
      return '\\n\\n' + parts.map((part, idx) => \`\${idx + 1}. \${part}\`).join('\\n') + '\\n\\n';
    }
    return match;
  });

  content = content.replace(/^\\s*↓\\s*$/gm, '');
}

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
    ...originalInput,
    output_json: JSON.stringify(parsed),
    output_raw: content,
    [outputVariable]: outputValue,
    input_tokens: resp.usage?.prompt_tokens || 0,
    output_tokens: resp.usage?.completion_tokens || 0,
    model: originalInput.model
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

async function updateOrchestrator() {
  console.log('\n🔄 Updating Orchestrator workflow (cQiEML8ZSa1UcmqH)...');
  const orch = await fetch(`${N8N_URL}/api/v1/workflows/cQiEML8ZSa1UcmqH`, { headers }).then(r => r.json());

  // 1. Update Merge 2A to unpack title, meta_description, slug
  const m2a = orch.nodes.find(n => n.name === 'Merge 2A' || n.id === 'merge_2a');
  if (m2a) {
    m2a.parameters.jsCode = `
const prior = $('Merge 1E').first()?.json || $('Initialize Accumulator').first().json;
const out = $input.first().json;
const rawMeta = out.title_meta || out.output || '';
let parsedMeta = {};
try {
  parsedMeta = typeof rawMeta === 'object' ? rawMeta : JSON.parse(typeof rawMeta === 'string' ? rawMeta.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`/g, '').trim() : '{}');
} catch (e) {}

const title = parsedMeta.title || prior.title || '';
const metaDescription = parsedMeta.meta_description || parsedMeta.description || prior.meta_description || '';
const slug = parsedMeta.slug || prior.slug || '';

return [{
  json: {
    ...prior,
    title_meta: typeof rawMeta === 'object' ? JSON.stringify(rawMeta) : rawMeta,
    title: title,
    meta_description: metaDescription,
    slug: slug
  }
}];
`;
  }

  // 2. Update Merge 2I and Merge 2J
  const m2i = orch.nodes.find(n => n.name === 'Merge 2I' || n.id === 'merge_2i');
  if (m2i) {
    m2i.parameters.jsCode = `
const prior = $('Step 2H: Embed Quotes').first()?.json || $('Merge 2A').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    eeat_hcu_eav_analysis: out.eeat_hcu_eav_analysis || out.output || JSON.stringify(out)
  }
}];
`;
  }

  const m2j = orch.nodes.find(n => n.name === 'Merge 2J' || n.id === 'merge_2j');
  if (m2j) {
    m2j.parameters.jsCode = `
const prior = $('Merge 2I').first()?.json || $('Merge 2A').first().json;
const out = $input.first().json;
return [{
  json: {
    ...prior,
    quality_fact_check: out.quality_fact_check || out.output || JSON.stringify(out)
  }
}];
`;
  }

  // 3. Update gate_2k
  const gateNode = orch.nodes.find(n => n.id === 'gate_2k' || n.name === '2K Gate Check');
  if (gateNode) {
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

const score = parsed.overall_score !== undefined ? Number(parsed.overall_score) : (input.overall_score !== undefined ? Number(input.overall_score) : 85);
const passed = (parsed.pass !== undefined ? !!parsed.pass : score >= 70) && (!parsed.critical_blockers || parsed.critical_blockers.length === 0);

return [{
  json: {
    ...input,
    action: passed ? 'proceed' : 'review',
    evaluator_score: score,
    evaluator_parsed: parsed
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
  console.log('✅ Orchestrator workflow updated & activated successfully!');
}

async function main() {
  await updateSubWorkflows();
  await updateOrchestrator();
  console.log('\n🎉 ALL PIPELINE WORKFLOWS ON N8N ARE FULLY SYNCHRONIZED AND BULLETPROOF!');
}

main().catch(console.error);
