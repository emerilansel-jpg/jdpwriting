const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

const prepareVarsCode = `
const cfg = $input.first().json;
const input = $input.first().json;

let user = cfg.user_prompt || '';

// First pass: replace all incoming variables using reliable split/join
for (const [k, v] of Object.entries(input)) {
  if (v !== undefined && v !== null && typeof v !== 'object') {
    user = user.split('{{' + k + '}}').join(String(v));
  } else if (typeof v === 'object') {
    user = user.split('{{' + k + '}}').join(JSON.stringify(v));
  }
}

// Special alias mappings for research steps
if (input.serp_data && user.includes('{{prev_output}}') && cfg.step_id === '1B') {
  user = user.split('{{prev_output}}').join(String(input.serp_data));
}
if (input.info_gain && user.includes('{{prev_output}}') && cfg.step_id === '1C') {
  user = user.split('{{prev_output}}').join(String(input.info_gain));
}

// Second pass: if outline or article contained nested placeholders, resolve them completely!
if (input.keyword) user = user.split('{{keyword}}').join(String(input.keyword));
if (input.cta) user = user.split('{{cta}}').join(String(input.cta));
if (input.internal_links) user = user.split('{{internal_links}}').join(String(input.internal_links));
if (input.external_links) user = user.split('{{external_links}}').join(String(input.external_links));

return [{
  json: {
    ...input,
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
    step_id: cfg.step_id
  }
}];
`;

async function main() {
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());

  for (const wf of wfs.data) {
    if (wf.name.includes('Orchestrator') || wf.name.includes('5A') || wf.name.includes('6A')) continue;

    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    const pvNode = full.nodes.find(n => n.id === 'prepare_vars');
    if (!pvNode) continue;

    pvNode.typeVersion = 1;
    pvNode.parameters.jsCode = prepareVarsCode;

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
    console.log(`✅ [${full.name}] prepare_vars updated with 2-pass split/join`);
  }
}

main().catch(console.error);
