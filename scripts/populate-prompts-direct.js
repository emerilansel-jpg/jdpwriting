const fs = require('fs');
const vm = require('vm');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

// Read STEPS
const html = fs.readFileSync('admin-ui.html', 'utf8');
const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/g)];
const mainScript = scripts[scripts.length - 1][1];

const context = { console, setTimeout: () => {}, clearTimeout: () => {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document: { getElementById: () => ({ classList: { add: ()=>{}, remove: ()=>{} }, style: { setProperty: ()=>{} } }), querySelectorAll: () => [], querySelector: () => null } };
vm.createContext(context);
vm.runInContext(mainScript + '\n;globalThis.__STEPS = STEPS;', context);
const steps = context.__STEPS;

const rows = steps.map(s => [
  s.id,
  s.name,
  s.model,
  s.temp,
  s.maxTokens,
  s.outputFormat,
  s.systemPrompt,
  s.userPrompt,
  s.enabled ? 'TRUE' : 'FALSE',
  s.n8nId || ''
]);

async function populatePrompts() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

  // Create temporary workflow with direct HTTP Request to Google Sheets REST API v4
  const wf = {
    name: 'Populate All Prompts Direct API',
    nodes: [
      {
        id: 'wh',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [100, 300],
        webhookId: 'populate-all-prompts-direct-api',
        parameters: { httpMethod: 'POST', path: 'populate-all-prompts-direct-api', responseMode: 'lastNode', options: {} }
      },
      {
        id: 'append_sheets',
        name: 'Append via Google Sheets API',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [300, 300],
        parameters: {
          method: 'POST',
          url: `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/PROMPTS!A2:append?valueInputOption=USER_ENTERED`,
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'googleSheetsOAuth2Api',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: JSON.stringify({ values: rows }),
          options: {}
        },
        credentials: {
          googleSheetsOAuth2Api: {
            id: '9uDB213ud11FEioT',
            name: 'google-sheets-jdp'
          }
        }
      }
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Append via Google Sheets API', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const c = await fetch(`${N8N_URL}/api/v1/workflows`, { method: 'POST', headers, body: JSON.stringify(wf) }).then(r => r.json());
  await fetch(`${N8N_URL}/api/v1/workflows/${c.id}/activate`, { method: 'POST', headers });

  console.log('Sending all 23 prompt rows to Google Sheets PROMPTS tab...');
  const res = await fetch(`${N8N_URL}/webhook/populate-all-prompts-direct-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }).then(r => r.json());

  console.log('Populate result:', JSON.stringify(res?.updates || res, null, 2));

  await fetch(`${N8N_URL}/api/v1/workflows/${c.id}`, { method: 'DELETE', headers });
}

populatePrompts().catch(console.error);
