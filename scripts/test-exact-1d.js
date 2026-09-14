const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

async function testExact1D() {
  const headers = { 'X-N8N-API-KEY': API_KEY };
  const d1d = await fetch(`${N8N_URL}/api/v1/executions/126?includeData=true`, { headers }).then(r => r.json());
  const input = d1d.data.resultData.runData['find_config'][0].data.main[0][0].json;
  const cfg = input;

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

  console.log('flat keys:', Object.keys(flat));
  console.log('flat.keyword:', flat.keyword);

  let user = cfg.user_prompt;
  const keys = Object.keys(flat).sort((a, b) => b.length - a.length);
  console.log('Sorted keys:', keys.slice(0, 10));

  for (const k of keys) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    user = user.replace(new RegExp('{{' + escaped + '}}', 'g'), flat[k]);
  }

  console.log('\n--- Resulting user prompt in test ---');
  console.log(user.slice(0, 500));
}

testExact1D().catch(console.error);
