#!/usr/bin/env node
/**
 * build-import-script.js
 *
 * Generates a self-contained browser console script that imports all n8n workflows.
 * Reads JSON templates from n8n-templates/ and embeds them inline.
 *
 * Usage: node scripts/build-import-script.js
 * Output: scripts/import-n8n-workflows.js (paste-ready browser console script)
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'n8n-templates');
const OUTPUT_FILE = path.join(__dirname, 'import-n8n-workflows.js');

// Import order: sub-workflows first, orchestrator last
const IMPORT_ORDER = [
  'step-1a-serp.json',
  'step-1b-info-gain.json',
  'step-1c-lsi-keywords.json',
  'step-1d-outline.json',
  'step-1e-article.json',
  'step-2a-title-meta.json',
  'step-2b-intro-rewrite.json',
  'step-2c-originality-rewrite.json',
  'step-2d-fluff-check.json',
  'step-2e-faq-generation.json',
  'step-2f-conclusion-optimizer.json',
  'step-2g-add-table.json',
  'step-2h-find-embed-quotes.json',
  'step-2i-eeat-hcu-eav.json',
  'step-2j-quality-fact-check.json',
  'step-2k-seo-geo-evaluator.json',
  'step-3a-image-prompts.json',
  'step-3b-infographic-prompt.json',
  'step-3c-alt-texts.json',
  'step-4a-internal-linking.json',
  'step-4b-external-linking.json',
  'step-5a-wordpress.json',
  'step-6a-indexing.json',
  'orchestrator.json',  // LAST — connects all sub-workflows
];

// Read and embed all templates
const workflows = {};
for (const file of IMPORT_ORDER) {
  const filePath = path.join(TEMPLATES_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠ Skipping missing file: ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const wf = JSON.parse(content);
    workflows[file] = wf;
  } catch (e) {
    console.error(`❌ Invalid JSON in ${file}: ${e.message}`);
  }
}

console.log(`Loaded ${Object.keys(workflows).length} workflow templates`);

// Generate the browser console script
const script = `// ═══════════════════════════════════════════════════════════════
// JDP Pipeline — n8n Workflow Import Script
// Paste this entire script into browser console (F12) while logged into n8n.
// Generated: ${new Date().toISOString()}
// Templates: ${Object.keys(workflows).length} workflows
// ═══════════════════════════════════════════════════════════════
(async () => {
  const workflows = ${JSON.stringify(workflows, null, 2)};

  let ok = 0, fail = 0, skip = 0;
  const results = [];

  // Check existing workflows first
  console.log('🔍 Checking existing workflows...');
  let existing = [];
  try {
    const r = await fetch('/rest/workflows', {
      headers: { 'Content-Type': 'application/json' }
    });
    if (r.ok) {
      const d = await r.json();
      existing = d.data || d || [];
      console.log('  Found', existing.length, 'existing workflows');
    }
  } catch (e) {
    console.log('  Could not list workflows (may need login)');
  }

  const existingNames = new Set(existing.map(w => w.name));

  // Import each workflow in order
  const files = ${JSON.stringify(IMPORT_ORDER)};
  console.log('\\n🚀 Starting import of', files.length, 'workflows...\\n');

  for (const file of files) {
    const wf = workflows[file];
    if (!wf) { skip++; continue; }

    // Skip if already exists
    if (existingNames.has(wf.name)) {
      console.log('⏭ ', wf.name, '— already exists, skipping');
      skip++;
      continue;
    }

    // Clean up workflow for import
    const payload = {
      name: wf.name,
      nodes: wf.nodes || [],
      connections: wf.connections || {},
      settings: wf.settings || {},
      staticData: wf.staticData || null,
      tags: wf.tags || [],
    };

    try {
      const resp = await fetch('/rest/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const created = await resp.json();
        const id = created.id || created.data?.id || '?';
        console.log('✅', wf.name, '→ ID:', id);
        results.push({ file, name: wf.name, id, status: 'ok' });
        ok++;
      } else {
        const err = await resp.text();
        console.log('❌', wf.name, '→ HTTP', resp.status, err.substring(0, 100));
        results.push({ file, name: wf.name, status: 'error', error: resp.status });
        fail++;
      }
    } catch (e) {
      console.log('❌', wf.name, '→', e.message);
      results.push({ file, name: wf.name, status: 'error', error: e.message });
      fail++;
    }

    // Small delay between imports
    await new Promise(r => setTimeout(r, 200));
  }

  // Summary
  console.log('\\n═══════════════════════════════════════════════════════════════');
  console.log('📊 IMPORT COMPLETE');
  console.log('   ✅ Imported:', ok);
  console.log('   ⏭  Skipped:', skip);
  console.log('   ❌ Failed:', fail);
  console.log('═══════════════════════════════════════════════════════════════\\n');

  if (ok > 0) {
    console.log('🔑 IMPORTANT: Copy these workflow IDs to update your orchestrator:');
    console.log('   (The orchestrator references sub-workflows by ID)\\n');
    for (const r of results) {
      if (r.status === 'ok' && r.id !== '?') {
        console.log('   ' + r.name + ' → ' + r.id);
      }
    }
    console.log('\\n📋 Also update the PROMPTS tab in Google Sheets (column J) with these IDs.');
  }

  if (fail > 0) {
    console.warn('\\n⚠️  Some imports failed. Check the errors above.');
    console.warn('   Common causes:');
    console.warn('   - Not logged in (open n8n UI first)');
    console.warn('   - n8n needs setup (create owner account first)');
    console.warn('   - Network error (n8n instance sleeping)');
  }

  return { ok, skip, fail, results };
})();
`;

fs.writeFileSync(OUTPUT_FILE, script, 'utf8');
console.log(`✅ Generated: ${OUTPUT_FILE}`);
console.log(`   Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
console.log(`   Workflows: ${Object.keys(workflows).length}`);
console.log(`\n📋 Instructions:`);
console.log(`   1. Login to https://n8n-jdp-pipeline.onrender.com`);
console.log(`   2. Open browser console (F12 → Console)`);
console.log(`   3. Paste the contents of scripts/import-n8n-workflows.js`);
console.log(`   4. Press Enter — all workflows will be imported automatically`);
