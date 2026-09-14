const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

const OLD_SHEET_ID = '1fx422m0zHyOB56KJMEfQZrFNRYPNyETnf0D35ZmwBdQ';
const NEW_SHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

async function main() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());

  console.log(`Connecting all ${wfs.data.length} workflows in n8n VPS to NEW Spreadsheet ID: ${NEW_SHEET_ID}...`);

  for (const wf of wfs.data) {
    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    let modified = false;

    for (const node of full.nodes) {
      if (node.type === 'n8n-nodes-base.googleSheets') {
        if (node.parameters && node.parameters.documentId) {
          node.parameters.documentId = {
            '__rl': true,
            'mode': 'list',
            'value': NEW_SHEET_ID
          };
          modified = true;
        }
      }
    }

    if (modified) {
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

      // Activate workflow
      await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}/activate`, {
        method: 'POST',
        headers
      });

      console.log(`✅ [New Sheet Connected & Active]: ${full.name}`);
    }
  }

  // Re-activate Orchestrator specifically
  const orch = wfs.data.find(w => w.name.includes('Orchestrator'));
  if (orch) {
    const act = await fetch(`${N8N_URL}/api/v1/workflows/${orch.id}/activate`, {
      method: 'POST',
      headers
    }).then(r => r.json());
    console.log(`⚡ Orchestrator Webhook is ACTIVE on new Google Sheet! (active: ${act.active})`);
  }

  console.log('\n🎉 ALL WORKFLOWS NOW OPERATIONAL ON NEW SPREADSHEET!');
}

main().catch(console.error);
