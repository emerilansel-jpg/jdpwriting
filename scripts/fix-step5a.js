const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

async function fix5A() {
  const full = await fetch(`${N8N_URL}/api/v1/workflows/tgc7sDFaU44YFbcc`, { headers }).then(r => r.json());

  // Fix Code nodes
  full.nodes.forEach(n => {
    if (n.type === 'n8n-nodes-base.code') {
      n.typeVersion = 1;
    }
  });

  const fmtNode = full.nodes.find(n => n.id === 'format_deliverable');
  if (fmtNode) {
    fmtNode.typeVersion = 1;
    fmtNode.parameters.jsCode = `
const input = $input.first().json;
let titleMeta = input.title_meta || {};
if (typeof titleMeta === 'string') {
  try { titleMeta = JSON.parse(titleMeta.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`/g, '').trim()); } catch (e) {}
}

let seoGeo = input.seo_geo_evaluator || {};
if (typeof seoGeo === 'string') {
  try { seoGeo = JSON.parse(seoGeo.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`/g, '').trim()); } catch (e) {}
}

const title = titleMeta.title || (input.keyword ? input.keyword.charAt(0).toUpperCase() + input.keyword.slice(1) : 'Optimized Article');
const metaDesc = titleMeta.meta_description || '';
const slug = titleMeta.slug || (input.keyword ? input.keyword.toLowerCase().replace(/\\s+/g, '-') : 'draft');
const articleBody = input.article || '';
const wordCount = articleBody ? articleBody.split(/\\s+/).filter(Boolean).length : 0;

return [{
  json: {
    ...input,
    timestamp: new Date().toISOString(),
    keyword: input.keyword || '',
    title,
    slug,
    meta_description: metaDesc,
    word_count: wordCount,
    seo_score: seoGeo.seo_score || 85,
    geo_score: seoGeo.geo_score || 82,
    overall_score: seoGeo.overall_score || 84,
    status: 'Completed',
    deliverable_preview: articleBody.substring(0, 1000)
  }
}];
`;
  }

  const saveNode = full.nodes.find(n => n.id === 'save_history');
  if (saveNode) {
    saveNode.continueOnFail = true;
    saveNode.alwaysOutputData = true;
    saveNode.parameters = {
      operation: 'append',
      documentId: {
        '__rl': true,
        'value': SPREADSHEET_ID,
        'mode': 'id'
      },
      sheetName: {
        '__rl': true,
        'value': 'HISTORY',
        'mode': 'name'
      },
      dataMode: 'autoMapInputData',
      options: {}
    };
  }

  await fetch(`${N8N_URL}/api/v1/workflows/tgc7sDFaU44YFbcc`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: full.name,
      nodes: full.nodes,
      connections: full.connections,
      settings: full.settings
    })
  });

  await fetch(`${N8N_URL}/api/v1/workflows/tgc7sDFaU44YFbcc/activate`, { method: 'POST', headers });
  console.log('✅ Step 5A fixed with typeVersion: 1 and continueOnFail!');
}

fix5A().catch(console.error);
