const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

const parseResultCode = `
const resp = $input.first().json;
const originalInput = $('trigger').first()?.json || {};

const content = resp.choices?.[0]?.message?.content || resp.content || '';
const outputFormat = originalInput.output_format || 'markdown';
const outputVariable = originalInput.output_variable || 'output';

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

async function main() {
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());

  for (const wf of wfs.data) {
    if (wf.name.includes('Orchestrator') || wf.name.includes('5A') || wf.name.includes('6A')) continue;

    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    const prNode = full.nodes.find(n => n.id === 'parse_result');
    if (!prNode) continue;

    prNode.typeVersion = 1;
    prNode.parameters.jsCode = parseResultCode;

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
    console.log(`✅ [${full.name}] parse_result updated verbatim`);
  }
}

main().catch(console.error);
