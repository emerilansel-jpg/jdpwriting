const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

async function main() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());

  console.log(`Fixing sheetName mode: "name" across all workflows...`);

  for (const wf of wfs.data) {
    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    let modified = false;

    for (const node of full.nodes) {
      if (node.type === 'n8n-nodes-base.googleSheets') {
        let sheetTitle = 'INPUT';
        if (node.parameters && node.parameters.sheetName) {
          if (typeof node.parameters.sheetName === 'string') {
            sheetTitle = node.parameters.sheetName;
          } else if (node.parameters.sheetName.value) {
            sheetTitle = node.parameters.sheetName.value;
          }
        }
        if (node.id === 'read_prompts') sheetTitle = 'PROMPTS';
        if (node.id === 'save_tracking') sheetTitle = 'TRACKING';
        if (node.id === 'save_history') sheetTitle = 'HISTORY';
        if (node.id === 'read_config') sheetTitle = 'CONFIG';

        node.parameters.documentId = {
          '__rl': true,
          'value': SPREADSHEET_ID,
          'mode': 'id'
        };

        node.parameters.sheetName = {
          '__rl': true,
          'value': sheetTitle,
          'mode': 'name'
        };

        modified = true;
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

      await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}/activate`, {
        method: 'POST',
        headers
      });

      console.log(`✅ [mode: name] Updated: ${full.name}`);
    }
  }

  // Re-activate Orchestrator
  const orch = wfs.data.find(w => w.name.includes('Orchestrator'));
  if (orch) {
    const act = await fetch(`${N8N_URL}/api/v1/workflows/${orch.id}/activate`, {
      method: 'POST',
      headers
    }).then(r => r.json());
    console.log(`⚡ Orchestrator is active: ${act.active}`);
  }

  console.log('\n🎉 ALL NODES FIXED TO mode: "name" (MATCH BY TAB NAME)!');
}

main().catch(console.error);
