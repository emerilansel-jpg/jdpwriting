const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

// Read STEPS from admin-ui.html
const html = fs.readFileSync('admin-ui.html', 'utf8');
const vm = require('vm');
const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/g)];
const mainScript = scripts[scripts.length - 1][1];

const context = {
  console,
  setTimeout: () => {},
  clearTimeout: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: { getElementById: () => ({ classList: { add: ()=>{}, remove: ()=>{} }, style: { setProperty: ()=>{} } }), querySelectorAll: () => [], querySelector: () => null }
};
vm.createContext(context);
vm.runInContext(mainScript + '\n;globalThis.__STEPS = STEPS;', context);
const steps = context.__STEPS;

console.log(`Extracted ${steps.length} steps from admin-ui.html`);

// Prepare rows for PROMPTS sheet
const rows = steps.map(s => ({
  step_id: s.id,
  step_name: s.name,
  model: s.model || 'pesat-flash',
  temperature: s.temp,
  max_tokens: s.maxTokens,
  output_format: s.outputFormat,
  system_prompt: s.systemPrompt,
  user_prompt: s.userPrompt,
  enabled: s.enabled ? 'TRUE' : 'FALSE',
  n8n_workflow_id: s.n8nId || ''
}));

async function main() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

  // Create temporary workflow in n8n to append these rows
  const ephemeralWf = {
    name: 'Ephemeral - Populate PROMPTS',
    nodes: [
      {
        id: 'trigger',
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [100, 300],
        parameters: {}
      },
      {
        id: 'generate_rows',
        name: 'Generate Rows',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [300, 300],
        parameters: {
          jsCode: `const data = ${JSON.stringify(rows)};\nreturn data.map(d => ({ json: d }));`
        }
      },
      {
        id: 'write_sheets',
        name: 'Write to PROMPTS',
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4,
        position: [500, 300],
        parameters: {
          operation: 'append',
          documentId: {
            '__rl': true,
            'value': SPREADSHEET_ID,
            'mode': 'id'
          },
          sheetName: {
            '__rl': true,
            'value': 'PROMPTS',
            'mode': 'name'
          },
          range: 'A:J',
          values: {
            mappingMode: 'autoMapInputData',
            value: '={{ JSON.stringify($json) }}'
          }
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
      'Manual Trigger': { main: [[{ node: 'Generate Rows', type: 'main', index: 0 }]] },
      'Generate Rows': { main: [[{ node: 'Write to PROMPTS', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const created = await fetch(`${N8N_URL}/api/v1/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify(ephemeralWf)
  }).then(r => r.json());

  console.log(`Created ephemeral workflow: ${created.id}`);

  // Trigger it via manual execution
  const runRes = await fetch(`${N8N_URL}/api/v1/workflows/${created.id}/activate`, {
    method: 'POST',
    headers
  }).then(r => r.json());

  console.log('Populated PROMPTS tab via n8n!');

  // Cleanup ephemeral workflow
  await fetch(`${N8N_URL}/api/v1/workflows/${created.id}`, {
    method: 'DELETE',
    headers
  });
  console.log(`Cleaned up ephemeral workflow.`);
}

main().catch(console.error);
