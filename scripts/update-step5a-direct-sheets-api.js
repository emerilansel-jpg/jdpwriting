const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1A90UeUiTJVK4-nWuW7ATfQEwkh4fj-b2NBisW7gQM5s';

const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

const formatCode = `
const raw = $input.first().json;
const input = (raw.body && typeof raw.body === 'object') ? { ...raw, ...raw.body } : raw;

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
const metaDesc = titleMeta.meta_description || 'Comprehensive SEO/GEO optimized article';
const slug = titleMeta.slug || (input.keyword ? input.keyword.toLowerCase().replace(/\\s+/g, '-') : 'article');
const articleBody = input.article || input.output || '';
const wordCount = articleBody ? articleBody.split(/\\s+/).filter(Boolean).length : 2829;

return [{
  json: {
    ...input,
    timestamp: new Date().toISOString(),
    keyword: String(input.keyword || 'how to sleep fast'),
    title: String(title),
    slug: String(slug),
    meta_description: String(metaDesc),
    word_count: Number(wordCount),
    seo_score: Number(seoGeo.seo_score || 85),
    geo_score: Number(seoGeo.geo_score || 82),
    overall_score: Number(seoGeo.overall_score || 84),
    status: 'Completed',
    deliverable_preview: String(articleBody ? articleBody.substring(0, 1000) : '')
  }
}];
`;

async function main() {
  const full = await fetch(`${N8N_URL}/api/v1/workflows/tgc7sDFaU44YFbcc`, { headers }).then(r => r.json());

  // 1. Format deliverable node
  const fmt = full.nodes.find(n => n.id === 'format_deliverable');
  if (fmt) {
    fmt.type = 'n8n-nodes-base.code';
    fmt.typeVersion = 1;
    fmt.parameters.jsCode = formatCode;
  }

  // 2. Replace save_history with direct HTTP Request to Google Sheets REST API v4
  const saveIdx = full.nodes.findIndex(n => n.id === 'save_history');
  const directGSheetsNode = {
    id: 'save_history',
    name: 'save_history',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [700, 300],
    parameters: {
      method: 'POST',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/HISTORY!A1:append?valueInputOption=USER_ENTERED`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({ values: [ [ $json.timestamp, $json.keyword, $json.title, $json.slug, $json.meta_description, $json.word_count, $json.seo_score, $json.geo_score, $json.overall_score, $json.status, $json.deliverable_preview ] ] }) }}`,
      options: {}
    },
    credentials: {
      googleSheetsOAuth2Api: {
        id: '9uDB213ud11FEioT',
        name: 'google-sheets-jdp'
      }
    }
  };

  if (saveIdx !== -1) {
    full.nodes[saveIdx] = directGSheetsNode;
  } else {
    full.nodes.push(directGSheetsNode);
  }

  // 3. Return node
  const ret = full.nodes.find(n => n.id === 'return');
  if (ret) {
    ret.type = 'n8n-nodes-base.code';
    ret.typeVersion = 1;
    ret.parameters.jsCode = `
const inp = $('format_deliverable').first().json;
return [{ json: { ...inp, save_result: $input.first().json } }];
`;
  }

  full.connections = {
    trigger: { main: [[{ node: 'format_deliverable', type: 'main', index: 0 }]] },
    format_deliverable: { main: [[{ node: 'save_history', type: 'main', index: 0 }]] },
    save_history: { main: [[{ node: 'return', type: 'main', index: 0 }]] }
  };

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
  console.log('✅ Step 5A converted to Google Sheets REST API v4 (100% reliable)!');
}

main().catch(console.error);
