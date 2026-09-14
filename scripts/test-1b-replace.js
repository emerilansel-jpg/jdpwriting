const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

async function test1b() {
  const headers = { 'X-N8N-API-KEY': API_KEY };
  const d1b = await fetch(`${N8N_URL}/api/v1/executions/124?includeData=true`, { headers }).then(r => r.json());
  const input = d1b.data.resultData.runData['find_config'][0].data.main[0][0].json;
  const cfg = input;

  console.log('cfg.keyword =', cfg.keyword);
  console.log('cfg.user_prompt =', cfg.user_prompt.slice(0, 100));

  let user = cfg.user_prompt;
  // Test split().join()
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null) {
      user = user.split('{{' + k + '}}').join(String(v));
    }
  }

  console.log('\n--- Replaced user prompt ---');
  console.log(user.slice(0, 200));
}

test1b().catch(console.error);
