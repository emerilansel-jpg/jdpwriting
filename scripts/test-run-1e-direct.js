const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

async function testRun1E() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };
  
  // Get outline from execution 126
  const d1d = await fetch(`${N8N_URL}/api/v1/executions/126?includeData=true`, { headers }).then(r => r.json());
  const outline = d1d.data.resultData?.runData?.return?.[0]?.data?.main?.[0]?.[0]?.json?.outline || '';

  console.log('Got outline length:', outline.length);

  // Trigger Step 1E via a test runner workflow
  const testWf = {
    name: 'Test Runner 1E',
    nodes: [
      {
        id: 'wh',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [100, 300],
        webhookId: 'test-runner-1e-wh',
        parameters: { httpMethod: 'POST', path: 'test-runner-1e-wh', responseMode: 'lastNode', options: {} }
      },
      {
        id: 'exec',
        name: 'Exec 1E',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.1,
        position: [400, 300],
        parameters: {
          source: 'database',
          workflowId: { __rl: true, value: 'iC210o6qoXTO8muA', mode: 'id' },
          mode: 'combine',
          options: {}
        }
      }
    ],
    connections: { 'Webhook': { main: [[{ node: 'Exec 1E', type: 'main', index: 0 }]] } },
    settings: { executionOrder: 'v1' }
  };

  const c = await fetch(`${N8N_URL}/api/v1/workflows`, { method: 'POST', headers, body: JSON.stringify(testWf) }).then(r => r.json());
  await fetch(`${N8N_URL}/api/v1/workflows/${c.id}/activate`, { method: 'POST', headers });

  console.log('Triggering Step 1E with outline & keyword...');
  const res = await fetch(`${N8N_URL}/webhook/test-runner-1e-wh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'how to sleep fast',
      cta: 'Download our comprehensive rapid sleep routine',
      internal_links: 'https://jetdigitalpro.com/sleep-tips',
      outline: outline
    })
  }).then(r => r.json());

  const article = res.article || res.output_raw || '';
  const words = article.split(/\s+/).filter(Boolean).length;
  console.log(`\n🎉🎉🎉 STEP 1E DIRECT RUN COMPLETED!`);
  console.log(`Total Word Count: ${words} words!`);
  console.log('\n--- FIRST 600 CHARS ---\n', article.slice(0, 600));
  console.log('\n--- LAST 600 CHARS ---\n', article.slice(-600));

  await fetch(`${N8N_URL}/api/v1/workflows/${c.id}`, { method: 'DELETE', headers });
}

testRun1E().catch(console.error);
