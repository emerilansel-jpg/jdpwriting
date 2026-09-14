const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';
const SPREADSHEET_ID = '1fx422m0zHyOB56KJMEfQZrFNRYPNyETnf0D35ZmwBdQ';

async function main() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

  const wfs = await fetch(`${N8N_URL}/api/v1/workflows`, { headers }).then(r => r.json());
  const wpWf = wfs.data.find(w => w.name.includes('Step 5A'));

  if (!wpWf) {
    console.log('Step 5A not found');
    return;
  }

  const jsFormatterCode = `const input = $input.first().json;
let titleMeta = input.title_meta || {};
if (typeof titleMeta === 'string') {
  try { titleMeta = JSON.parse(titleMeta); } catch (e) {}
}

let imagePrompts = input.image_prompts || {};
if (typeof imagePrompts === 'string') {
  try { imagePrompts = JSON.parse(imagePrompts); } catch (e) {}
}

let altTexts = input.alt_texts || {};
if (typeof altTexts === 'string') {
  try { altTexts = JSON.parse(altTexts); } catch (e) {}
}

const title = titleMeta.title || input.keyword || 'Draft Article';
const metaDesc = titleMeta.meta_description || '';
const slug = titleMeta.slug || (input.keyword ? input.keyword.toLowerCase().replace(/\\s+/g, '-') : 'draft');
const articleBody = input.article || '';
const infographicPrompt = input.infographic_prompt || '';

// Assemble clean end-result markdown bundle
let fullMarkdown = '# ' + title + '\\n\\n';
fullMarkdown += '**Slug:** /' + slug + ' | **Meta Description:** ' + metaDesc + '\\n\\n---\\n\\n';
fullMarkdown += articleBody;
fullMarkdown += '\\n\\n---\\n\\n### 🎨 Generated Image Prompts (SF Academy SOP 3.8)\\n';
if (imagePrompts.featured_prompt || imagePrompts.featured_image) {
  fullMarkdown += '\\n**1. Featured Image (16:9):**\\n- Prompt: ' + (imagePrompts.featured_prompt || imagePrompts.featured_image || '') + '\\n- Alt Text: ' + (altTexts.featured_image_alt || '') + '\\n';
}
if (imagePrompts.supporting_prompts || imagePrompts.supporting_images) {
  const sups = imagePrompts.supporting_prompts || imagePrompts.supporting_images || [];
  sups.forEach((p, idx) => {
    fullMarkdown += '\\n**' + (idx + 2) + '. Supporting Image ' + (idx + 1) + ':**\\n- Prompt: ' + (p.prompt || p) + '\\n- Alt Text: ' + (altTexts['supporting_image_' + (idx+1) + '_alt'] || '') + '\\n';
  });
}
if (infographicPrompt) {
  fullMarkdown += '\\n**5. Infographic Data Visualization:**\\n- Prompt: ' + infographicPrompt + '\\n- Alt Text: ' + (altTexts.infographic_alt || '') + '\\n';
}

return [{
  json: {
    ...input,
    title,
    meta_description: metaDesc,
    slug,
    deliverable_markdown: fullMarkdown,
    status: 'draft_ready_offline',
    timestamp: new Date().toISOString()
  }
}];`;

  const updatedNodes = [
    {
      id: 'trigger',
      name: 'trigger',
      type: 'n8n-nodes-base.executeWorkflowTrigger',
      position: [100, 300],
      parameters: {}
    },
    {
      id: 'format_deliverable',
      name: 'format_deliverable',
      type: 'n8n-nodes-base.code',
      position: [400, 300],
      parameters: {
        jsCode: jsFormatterCode
      }
    },
    {
      id: 'save_history',
      name: 'save_history',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [700, 300],
      parameters: {
        operation: 'append',
        documentId: { '__rl': true, 'mode': 'list', 'value': SPREADSHEET_ID },
        sheetName: { '__rl': true, 'mode': 'list', 'value': 'HISTORY' },
        range: 'A:Z',
        values: {
          mappingMode: 'autoMapInputData',
          value: '={{ JSON.stringify({ keyword: $json.keyword, title: $json.title, slug: $json.slug, meta_description: $json.meta_description, status: "draft_ready", timestamp: $json.timestamp, deliverable_preview: $json.deliverable_markdown.substring(0, 500) }) }}'
        }
      },
      credentials: {
        googleSheetsOAuth2Api: {
          id: '9uDB213ud11FEioT',
          name: 'google-sheets-jdp'
        }
      }
    },
    {
      id: 'return',
      name: 'return',
      type: 'n8n-nodes-base.code',
      position: [1000, 300],
      parameters: {
        jsCode: 'return [{\n  json: {\n    ...$input.first().json,\n    post_url: "[Draft Ready — Offline Mode (No WP Publish)]",\n    status: "draft_ready"\n  }\n}];'
      }
    }
  ];

  const updatedConnections = {
    trigger: { main: [[{ node: 'format_deliverable', type: 'main', index: 0 }]] },
    format_deliverable: { main: [[{ node: 'save_history', type: 'main', index: 0 }]] },
    save_history: { main: [[{ node: 'return', type: 'main', index: 0 }]] }
  };

  await fetch(`${N8N_URL}/api/v1/workflows/${wpWf.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: 'JDP Step 5A — Save Draft Deliverable (Offline Mode)',
      nodes: updatedNodes,
      connections: updatedConnections,
      settings: { executionOrder: 'v1' }
    })
  });

  const act = await fetch(`${N8N_URL}/api/v1/workflows/${wpWf.id}/activate`, {
    method: 'POST',
    headers
  }).then(r => r.json());

  console.log('✅ Step 5A converted to Safe Offline Draft Saver & Activated:', act);
}

main().catch(console.error);
