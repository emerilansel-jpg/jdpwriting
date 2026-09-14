const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

async function testDebug() {
  const headers = { 'X-N8N-API-KEY': API_KEY };
  const d1e = await fetch(`${N8N_URL}/api/v1/executions/127?includeData=true`, { headers }).then(r => r.json());
  const input = d1e.data.resultData.runData['find_config'][0].data.main[0][0].json;

  console.log('--- Input to prepare_vars ---');
  console.log('keyword:', input.keyword);
  console.log('cta:', input.cta);
  console.log('internal_links:', input.internal_links);
  console.log('user_prompt template has {{keyword}}?:', input.user_prompt.includes('{{keyword}}'));

  // Test split/join replacement
  let user = input.user_prompt;
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' || typeof v === 'number') {
      user = user.split('{{' + k + '}}').join(String(v));
    }
  }

  console.log('\n--- Replaced user_prompt with split/join ---');
  console.log(user.slice(0, 400));
  console.log('Still has {{keyword}}?:', user.includes('{{keyword}}'));
}

testDebug().catch(console.error);
