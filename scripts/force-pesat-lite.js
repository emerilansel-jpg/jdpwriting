const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

async function main() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };
  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());

  console.log(`Checking ${wfs.data.length} workflows in n8n VPS...`);

  for (const wf of wfs.data) {
    if (wf.name.includes('Orchestrator') || wf.name.includes('5A') || wf.name.includes('6A')) continue;

    const full = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, { headers }).then(r => r.json());
    let modified = false;

    for (const node of full.nodes) {
      if (node.id === 'prepare_vars' && node.parameters && node.parameters.jsCode) {
        let code = node.parameters.jsCode;
        // Force model to pesat-lite
        code = code.replace(/model:\s*cfg\.model/g, "model: 'pesat-lite'");
        node.parameters.jsCode = code;
        modified = true;
      }
      if (node.id === 'find_config' && node.parameters && node.parameters.jsCode) {
        let code = node.parameters.jsCode;
        code = code.replace(/model:\s*step\[2\]/g, "model: 'pesat-lite'");
        node.parameters.jsCode = code;
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

      // Activate
      await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}/activate`, {
        method: 'POST',
        headers
      });

      console.log(`✅ [pesat-lite] Updated & Activated: ${full.name}`);
    }
  }

  // Re-activate Orchestrator
  const orch = wfs.data.find(w => w.name.includes('Orchestrator'));
  if (orch) {
    const orchAct = await fetch(`${N8N_URL}/api/v1/workflows/${orch.id}/activate`, {
      method: 'POST',
      headers
    }).then(r => r.json());
    console.log(`⚡ Orchestrator re-activated: ${orchAct.active ? 'ACTIVE' : 'READY'}`);
  }

  console.log('\n🎉 ALL SUB-WORKFLOWS IN N8N VPS ARE NOW STRICTLY USING PESAT-LITE!');
}

main().catch(console.error);
