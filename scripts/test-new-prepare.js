const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

async function testNewPrepare() {
  const headers = { 'X-N8N-API-KEY': API_KEY };
  const d1e = await fetch(`${N8N_URL}/api/v1/executions/127?includeData=true`, { headers }).then(r => r.json());
  const input = d1e.data.resultData.runData['find_config'][0].data.main[0][0].json;
  const cfg = input;

  let user = cfg.user_prompt || '';

  // First pass
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null && typeof v !== 'object') {
      user = user.split('{{' + k + '}}').join(String(v));
    } else if (typeof v === 'object') {
      user = user.split('{{' + k + '}}').join(JSON.stringify(v));
    }
  }

  // Second pass for nested placeholders
  if (input.keyword) user = user.split('{{keyword}}').join(String(input.keyword));
  if (input.cta) user = user.split('{{cta}}').join(String(input.cta));
  if (input.internal_links) user = user.split('{{internal_links}}').join(String(input.internal_links));

  console.log('Contains {{keyword}}?:', user.includes('{{keyword}}'));
  console.log('Contains {{outline}}?:', user.includes('{{outline}}'));
  console.log('Contains {{cta}}?:', user.includes('{{cta}}'));
  console.log('Contains {{internal_links}}?:', user.includes('{{internal_links}}'));
  console.log('\n--- First 300 chars ---\n', user.slice(0, 300));
  console.log('\n--- Last 300 chars ---\n', user.slice(-300));
}

testNewPrepare().catch(console.error);
