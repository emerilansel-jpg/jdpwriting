const fs = require('fs');

let html = fs.readFileSync('admin-ui.html', 'utf8');

// 1. Add Full Article button in Header
const headerBtnOld = '<button onclick="toggleTestPanel()" id="test-toggle-btn" class="px-3 py-1.5 text-xs bg-emerald-800 hover:bg-emerald-700 rounded text-emerald-200 flex items-center gap-1.5 font-semibold">';
const headerBtnNew = `<button onclick="viewFullArticleBundle()" id="view-bundle-btn" class="px-3 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 rounded text-purple-100 flex items-center gap-1.5 font-semibold shadow-sm" title="Buka dan copy paket artikel utuh (Judul + Meta + Naskah Lengkap + 5 Prompt Gambar + Alt Text)">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      📄 Full Article
    </button>
    ${headerBtnOld}`;

if (!html.includes('viewFullArticleBundle')) {
  html = html.replace(headerBtnOld, headerBtnNew);
}

// 2. Add button in test output toolbar
const copyBtnOld = '<button onclick="copyOutput()" class="text-xs text-slate-500 hover:text-slate-300">Copy</button>';
const copyBtnNew = `<button onclick="copyOutput()" class="text-xs text-slate-500 hover:text-slate-300">Copy Step</button>
            <button onclick="copyFullArticleBundle()" class="text-xs bg-purple-900/70 hover:bg-purple-800 text-purple-200 px-2 py-0.5 rounded font-medium">📦 Copy Full Article Bundle</button>`;

if (!html.includes('copyFullArticleBundle()')) {
  html = html.replace(copyBtnOld, copyBtnNew);
}

// 3. Add Modal Markup
const modalMarkup = `
<!-- FULL ARTICLE BUNDLE MODAL -->
<div id="bundle-modal" class="fixed inset-0 bg-black/80 z-50 hidden flex items-center justify-center p-4">
  <div class="bg-surface-card border border-surface-border rounded-xl flex flex-col w-[920px] max-w-full max-h-[90vh] overflow-hidden shadow-2xl">
    <div class="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-slate-900/90">
      <div class="flex items-center gap-2.5">
        <span class="text-xl">📄</span>
        <div>
          <h2 class="font-bold text-white text-base">Complete Deliverable Article Bundle</h2>
          <p class="text-xs text-slate-400">Semua bagian terangkum rapi sesuai SOP SF Academy Ver. 3.8</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="copyFullArticleBundle()" class="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold flex items-center gap-1.5 shadow">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
          Copy All to Clipboard
        </button>
        <button onclick="downloadBundleAsMd()" class="px-3.5 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 rounded text-white font-semibold flex items-center gap-1.5 shadow">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Download .md File
        </button>
        <button onclick="closeBundleModal()" class="text-slate-400 hover:text-white text-2xl ml-2 leading-none">✕</button>
      </div>
    </div>
    <div class="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-200 bg-slate-950/80 whitespace-pre-wrap leading-relaxed select-all" id="bundle-content"></div>
  </div>
</div>
`;

if (!html.includes('id="bundle-modal"')) {
  html = html.replace('<!-- SETTINGS MODAL (API Keys) -->', modalMarkup + '\n<!-- SETTINGS MODAL (API Keys) -->');
}

// 4. Add JavaScript logic
const bundleJs = `
// ─── FULL ARTICLE BUNDLE EXPORT ──────────────────────────────────────────────
function buildFullArticleBundle() {
  let title = document.getElementById('ti-title') ? document.getElementById('ti-title').value.trim() : '';
  let metaDesc = document.getElementById('ti-meta-description') ? document.getElementById('ti-meta-description').value.trim() : '';
  let slug = document.getElementById('ti-slug') ? document.getElementById('ti-slug').value.trim() : '';
  const keyword = document.getElementById('ti-keyword') ? document.getElementById('ti-keyword').value.trim() : '';

  if (stepOutputs['2A']) {
    try {
      const parsed = JSON.parse(stepOutputs['2A'].replace(/\`\`\`json\\n?/g,'').replace(/\`\`\`/g,'').trim());
      if (parsed.title) title = parsed.title;
      if (parsed.meta_description) metaDesc = parsed.meta_description;
      if (parsed.slug) slug = parsed.slug;
    } catch {}
  }
  if (!title) title = keyword ? (keyword.charAt(0).toUpperCase() + keyword.slice(1)) : 'Optimized Article';
  if (!slug) slug = keyword ? keyword.toLowerCase().replace(/\\s+/g, '-') : 'article';

  const articleCandidates = ['4B', '4A', '2H', '2G', '2F', '2D', '2C', '2B', '1E'];
  let bestArticle = '';
  for (const stepId of articleCandidates) {
    if (stepOutputs[stepId] && typeof stepOutputs[stepId] === 'string' && stepOutputs[stepId].trim().length > 100) {
      bestArticle = stepOutputs[stepId].trim();
      break;
    }
  }
  if (!bestArticle && document.getElementById('ti-article')) {
    bestArticle = document.getElementById('ti-article').value.trim();
  }

  let imagePrompts = {};
  if (stepOutputs['3A']) {
    try {
      imagePrompts = JSON.parse(stepOutputs['3A'].replace(/\`\`\`json\\n?/g,'').replace(/\`\`\`/g,'').trim());
    } catch {}
  }

  let infographicPrompt = stepOutputs['3B'] || '';

  let altTexts = {};
  if (stepOutputs['3C']) {
    try {
      altTexts = JSON.parse(stepOutputs['3C'].replace(/\`\`\`json\\n?/g,'').replace(/\`\`\`/g,'').trim());
    } catch {}
  }

  let bundle = '# ' + title + '\\n\\n';
  bundle += '> **URL Slug:** \`/' + slug + '\`\\n';
  bundle += '> **Meta Description:** ' + (metaDesc || 'N/A') + '\\n';
  bundle += '> **Primary Keyword:** ' + (keyword || 'N/A') + '\\n\\n';
  bundle += '---\\n\\n';

  if (bestArticle) {
    bundle += bestArticle + '\\n\\n';
  } else {
    bundle += '*[Belum ada artikel yang digenerate. Jalankan Step 1E atau Run All terlebih dahulu.]*\\n\\n';
  }

  bundle += '---\\n\\n';
  bundle += '## 🎨 Image Production Assets (SF Academy SOP Ver. 3.8)\\n\\n';

  const featPrompt = imagePrompts.prompt_1_featured?.prompt || imagePrompts.featured_prompt || imagePrompts.featured_image || imagePrompts['1'] || (typeof imagePrompts.prompt_1 === 'string' ? imagePrompts.prompt_1 : '');
  const featAlt = altTexts.featured_image_alt || altTexts.featured || '';
  bundle += '### 1. Featured Image (16:9 Banner)\\n';
  bundle += '- **Prompt:** ' + (featPrompt || '[Run Step 3A to generate]') + '\\n';
  bundle += '- **Alt Text:** ' + (featAlt || '[Run Step 3C to generate]') + '\\n\\n';

  for (let i = 1; i <= 3; i++) {
    const supPrompt = imagePrompts['prompt_' + (i+1) + '_supporting']?.prompt || imagePrompts['supporting_image_' + i] || imagePrompts['prompt_' + (i+1)] || (imagePrompts.supporting_prompts && imagePrompts.supporting_prompts[i-1]?.prompt);
    const supAlt = altTexts['supporting_image_' + i + '_alt'] || altTexts['supporting_' + i] || '';
    bundle += '### ' + (i+1) + '. Supporting Image ' + i + '\\n';
    bundle += '- **Prompt:** ' + (supPrompt || '[Run Step 3A to generate]') + '\\n';
    bundle += '- **Alt Text:** ' + (supAlt || '[Run Step 3C to generate]') + '\\n\\n';
  }

  const infoAlt = altTexts.infographic_alt || altTexts.infographic || '';
  bundle += '### 5. Infographic Data Visualization\\n';
  bundle += '- **Prompt:** ' + (infographicPrompt.trim() || '[Run Step 3B to generate]') + '\\n';
  bundle += '- **Alt Text:** ' + (infoAlt || '[Run Step 3C to generate]') + '\\n\\n';

  if (stepOutputs['2K']) {
    try {
      const evalData = JSON.parse(stepOutputs['2K'].replace(/\`\`\`json\\n?/g,'').replace(/\`\`\`/g,'').trim());
      bundle += '---\\n\\n## 📊 Quality & Evaluation Scores (Step 2K Gate)\\n';
      bundle += '- **SEO Score:** ' + (evalData.seo_score || 'N/A') + '/100\\n';
      bundle += '- **GEO Score:** ' + (evalData.geo_score || 'N/A') + '/100\\n';
      bundle += '- **Overall Score:** ' + (evalData.overall_score || 'N/A') + '/100\\n';
      bundle += '- **Status:** ' + (evalData.pass ? '✅ PASSED QUALITY GATE' : '⚠️ HUMAN REVIEW RECOMMENDED') + '\\n';
    } catch {}
  }

  return bundle;
}

function viewFullArticleBundle() {
  const content = buildFullArticleBundle();
  const el = document.getElementById('bundle-content');
  if (el) el.textContent = content;
  const modal = document.getElementById('bundle-modal');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.classList.remove('hidden');
  }
}

function closeBundleModal() {
  const modal = document.getElementById('bundle-modal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.add('hidden');
  }
}

function copyFullArticleBundle() {
  const content = buildFullArticleBundle();
  navigator.clipboard.writeText(content).then(() => {
    showToast('✓ Berhasil copy seluruh artikel + prompt gambar!');
  });
}

function downloadBundleAsMd() {
  const content = buildFullArticleBundle();
  const keyword = document.getElementById('ti-keyword') ? document.getElementById('ti-keyword').value.trim() : 'article';
  const filename = (keyword ? keyword.toLowerCase().replace(/\\s+/g, '-') : 'article') + '-bundle.md';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✓ Berhasil download ' + filename);
}
`;

if (!html.includes('buildFullArticleBundle')) {
  html = html.replace('function copyOutput()', bundleJs + '\nfunction copyOutput()');
}

fs.writeFileSync('admin-ui.html', html, 'utf8');

const worker = 'export default { async fetch() { return new Response(' + JSON.stringify(html) + ', { headers: { "Content-Type": "text/html; charset=utf-8" } }); } };';
fs.writeFileSync('worker-deploy/worker.js', worker, 'utf8');

console.log('✅ Added buildFullArticleBundle, modal, copy, and download features!');
