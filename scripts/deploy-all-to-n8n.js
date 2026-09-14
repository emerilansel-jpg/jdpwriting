const fs = require('fs');
const path = require('path');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${N8N_URL}/api/v1${endpoint}`, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`n8n API ${method} ${endpoint} failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function main() {
  console.log('🚀 Starting Full Automated Setup on n8n VPS...');

  // 1. Ensure PesatRouter Credential exists
  console.log('\n🔑 Checking Credentials...');
  const creds = await api('/credentials');
  let pesatCred = creds.data.find(c => c.name === 'pesatrouter-api-key');
  if (!pesatCred) {
    console.log('Creating pesatrouter-api-key credential...');
    pesatCred = await api('/credentials', 'POST', {
      name: 'pesatrouter-api-key',
      type: 'httpHeaderAuth',
      data: {
        name: 'Authorization',
        value: `Bearer ${PESAT_API_KEY}`
      }
    });
  }
  console.log(`✅ PesatRouter Credential ID: ${pesatCred.id}`);

  // 2. Clean existing workflows if any
  console.log('\n🧹 Cleaning existing workflows...');
  const existingWfs = await api('/workflows');
  for (const wf of existingWfs.data) {
    console.log(`Deleting existing: ${wf.name} (${wf.id})...`);
    await api(`/workflows/${wf.id}`, 'DELETE').catch(e => console.warn(e.message));
  }

  // 3. Define Sub-workflows to import
  const subWorkflowFiles = [
    { file: 'step-1a-serp.json', step: '1A', orchNodeId: 'step_1a' },
    { file: 'step-1b-info-gain.json', step: '1B', orchNodeId: 'step_1b' },
    { file: 'step-1c-lsi-keywords.json', step: '1C', orchNodeId: 'step_1c' },
    { file: 'step-1d-outline.json', step: '1D', orchNodeId: 'step_1d' },
    { file: 'step-1e-article.json', step: '1E', orchNodeId: 'step_1e' },
    { file: 'step-2a-title-meta.json', step: '2A', orchNodeId: 'step_2a' },
    { file: 'step-2b-intro-rewrite.json', step: '2B', orchNodeId: 'step_2b' },
    { file: 'step-2c-originality-rewrite.json', step: '2C', orchNodeId: 'step_2c' },
    { file: 'step-2d-fluff-check.json', step: '2D', orchNodeId: 'step_2d' },
    { file: 'step-2e-faq-generation.json', step: '2E', orchNodeId: 'step_2e' },
    { file: 'step-2f-conclusion-optimizer.json', step: '2F', orchNodeId: 'step_2f' },
    { file: 'step-2g-add-table.json', step: '2G', orchNodeId: 'step_2g' },
    { file: 'step-2h-find-embed-quotes.json', step: '2H', orchNodeId: 'step_2h' },
    { file: 'step-2i-eeat-hcu-eav.json', step: '2I', orchNodeId: 'step_2i' },
    { file: 'step-2j-quality-fact-check.json', step: '2J', orchNodeId: 'step_2j' },
    { file: 'step-2k-seo-geo-evaluator.json', step: '2K', orchNodeId: 'step_2k' },
    { file: 'step-3a-image-prompts.json', step: '3A', orchNodeId: 'step_3a' },
    { file: 'step-3b-infographic-prompt.json', step: '3B', orchNodeId: 'step_3b' },
    { file: 'step-3c-alt-texts.json', step: '3C', orchNodeId: 'step_3c' },
    { file: 'step-4a-internal-linking.json', step: '4A', orchNodeId: 'step_4a' },
    { file: 'step-4b-external-linking.json', step: '4B', orchNodeId: 'step_4b' },
    { file: 'step-5a-wordpress.json', step: '5A', orchNodeId: 'step_5a' },
    { file: 'step-6a-indexing.json', step: '6A', orchNodeId: 'step_6a' },
  ];

  console.log('\n📦 Importing Sub-workflows...');
  const stepIdMap = {};

  for (const item of subWorkflowFiles) {
    const filePath = path.join(__dirname, '..', 'n8n-templates', item.file);
    const wfData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Fix node names and attach credentials
    for (const node of wfData.nodes) {
      if (!node.name) node.name = node.id;
      if (node.id === 'call_llm' || node.type === 'n8n-nodes-base.httpRequest') {
        node.credentials = {
          httpHeaderAuth: {
            id: pesatCred.id,
            name: pesatCred.name
          }
        };
      }
    }

    const created = await api('/workflows', 'POST', {
      name: wfData.name,
      nodes: wfData.nodes,
      connections: wfData.connections,
      settings: wfData.settings || { executionOrder: 'v1' }
    });

    stepIdMap[item.step] = created.id;
    stepIdMap[item.orchNodeId] = created.id;
    console.log(`✅ [Step ${item.step}] ${wfData.name} → ID: ${created.id}`);
  }

  // 4. Update Orchestrator Template with new Sub-workflow IDs
  console.log('\n🎼 Updating & Importing Orchestrator...');
  const orchPath = path.join(__dirname, '..', 'n8n-templates', 'orchestrator.json');
  const orchData = JSON.parse(fs.readFileSync(orchPath, 'utf8'));

  for (const node of orchData.nodes) {
    if (!node.name) node.name = node.id;
    if (node.type === 'n8n-nodes-base.executeWorkflow' && stepIdMap[node.id]) {
      node.parameters.workflowId = stepIdMap[node.id];
    }
  }

  const createdOrch = await api('/workflows', 'POST', {
    name: orchData.name,
    nodes: orchData.nodes,
    connections: orchData.connections,
    settings: orchData.settings || { executionOrder: 'v1' }
  });

  console.log(`✅ [Orchestrator] ${createdOrch.name} → ID: ${createdOrch.id}`);

  // Activate Orchestrator
  try {
    await api(`/workflows/${createdOrch.id}/activate`, 'POST');
    console.log(`⚡ Orchestrator Webhook Activated!`);
  } catch (e) {
    console.log(`Note: Activation status: ${e.message}`);
  }

  // 5. Update Admin UI and coldstart.md with new IDs
  console.log('\n📝 Syncing Workflow IDs to admin-ui.html and coldstart.md...');

  // Update admin-ui.html
  let adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin-ui.html'), 'utf8');
  for (const [step, id] of Object.entries(stepIdMap)) {
    if (step.length <= 3) {
      const reg = new RegExp(`id:'${step}',([\\s\\S]*?)n8nId:'[^']*'`, 'g');
      adminHtml = adminHtml.replace(reg, `id:'${step}',$1n8nId:'${id}'`);
    }
  }
  fs.writeFileSync(path.join(__dirname, '..', 'admin-ui.html'), adminHtml, 'utf8');

  // Update worker.js
  const workerContent = `export default { async fetch() { return new Response(${JSON.stringify(adminHtml)}, { headers: { "Content-Type": "text/html; charset=utf-8" } }); } };`;
  fs.writeFileSync(path.join(__dirname, '..', 'worker-deploy', 'worker.js'), workerContent, 'utf8');

  console.log('\n🎉 ALL 24 WORKFLOWS & CREDENTIALS DEPLOYED SUCCESSFULLY TO VPS!');
  console.log('Webhook Endpoint:', `${N8N_URL}/webhook/pipeline-orchestrator`);
}

main().catch(err => {
  console.error('Fatal Error during deployment:', err);
  process.exit(1);
});
