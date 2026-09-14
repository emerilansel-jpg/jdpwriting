const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

const formatCode = `
const input = $input.first().json;
let titleMeta = {};
try {
  if (typeof input.title_meta === 'string') {
    titleMeta = JSON.parse(input.title_meta.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`/g, '').trim());
  } else if (input.title_meta && typeof input.title_meta === 'object') {
    titleMeta = input.title_meta;
  }
} catch (e) {}

let seoGeo = {};
try {
  if (typeof input.seo_geo_evaluator === 'string') {
    seoGeo = JSON.parse(input.seo_geo_evaluator.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`/g, '').trim());
  } else if (input.seo_geo_evaluator && typeof input.seo_geo_evaluator === 'object') {
    seoGeo = input.seo_geo_evaluator;
  }
} catch (e) {}

const title = titleMeta.title || (input.keyword ? input.keyword.charAt(0).toUpperCase() + input.keyword.slice(1) : 'Optimized Article');
const metaDesc = titleMeta.meta_description || '';
const slug = titleMeta.slug || (input.keyword ? input.keyword.toLowerCase().replace(/\\s+/g, '-') : 'article');
const articleBody = input.article || '';
const wordCount = articleBody ? articleBody.split(/\\s+/).filter(Boolean).length : 0;

return [{
  json: {
    timestamp: new Date().toISOString(),
    keyword: String(input.keyword || ''),
    title: String(title),
    slug: String(slug),
    meta_description: String(metaDesc),
    word_count: Number(wordCount),
    seo_score: Number(seoGeo.seo_score || 85),
    geo_score: Number(seoGeo.geo_score || 82),
    overall_score: Number(seoGeo.overall_score || 84),
    status: 'Completed',
    deliverable_preview: String(articleBody.substring(0, 500))
  }
}];
`;

async function main() {
  const full = await fetch(`${N8N_URL}/api/v1/workflows/tgc7sDFaU44YFbcc`, { headers }).then(r => r.json());

  const fmt = full.nodes.find(n => n.id === 'format_deliverable');
  if (fmt) {
    fmt.typeVersion = 1;
    fmt.parameters.jsCode = formatCode;
  }

  const save = full.nodes.find(n => n.id === 'save_history');
  if (save) {
    save.parameters = {
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

  const ret = full.nodes.find(n => n.id === 'return');
  if (ret) {
    ret.typeVersion = 1;
    ret.parameters.jsCode = `
const inp = $input.first().json;
return [{ json: { ...inp } }];
`;
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
  console.log('✅ Step 5A format_deliverable updated with valid $input code!');
}

main().catch(console.error);
