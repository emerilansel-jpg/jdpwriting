const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST SUITE: DETAILED USD COST BREAKDOWN PER ARTICLE & MARKDOWN EXPORT ===\n');

const html = fs.readFileSync('admin-ui.html', 'utf8');
const beforeScript = html.slice(0, html.lastIndexOf('<script>'));
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

// 1. Audit checks (Syntax + No duplicate id= on same tag + Raw tab container fix)
assert.doesNotThrow(() => {
  new vm.Script(script, { filename: 'admin-ui-cost-test.js' });
}, 'admin-ui.html script must compile cleanly');
assert(!beforeScript.includes('id="bundle-tab-raw" class="hidden p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-200 bg-slate-950/80 whitespace-pre-wrap leading-relaxed select-all" id="bundle-content"'), 'Duplicate id on bundle-tab-raw must be fixed');
assert(beforeScript.includes('id="bundle-tab-raw"') && beforeScript.includes('id="bundle-content"'), 'Both bundle-tab-raw and bundle-content must exist as distinct elements');
assert(beforeScript.includes('id="wv-article-cost-badge"'), 'Writer mode header must include USD cost badge');
assert(beforeScript.includes('id="wv-total-cost-usd"'), 'Deliverable card must include USD cost stat');
assert(beforeScript.includes('id="stat-run-cost"'), 'Sidebar must include live run cost stat');
assert(beforeScript.includes('id="price-firecrawl-search"') && beforeScript.includes('id="price-pesat-image"'), 'Settings modal must include Firecrawl & Image USD unit rate inputs');
console.log('1. DOM Audit & UI Elements Verification: ✅ PASS');

// 2. Setup mock sandbox
const mockLocalStorage = {
  store: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

let lastDownloadedBlobText = '';
let lastDownloadedFilename = '';
let clipboardText = '';

class MockBlob {
  constructor(parts) {
    this.parts = parts;
    lastDownloadedBlobText = parts.join('');
  }
}

const mockElements = {
  'wv-keyword': { value: 'how to calibrate espresso machine' },
  'ti-keyword': { value: 'how to calibrate espresso machine' },
  'wv-brand': { value: 'CoffeeCrafters' },
  'ti-brand': { value: 'CoffeeCrafters' },
  'wv-internal-links': { value: '' },
  'ti-links': { value: '' },
  'ti-title': { value: '' },
  'ti-meta-description': { value: '' },
  'ti-slug': { value: '' },
  'ti-article': { value: '' },
  'wv-pesat-jev-badge': { innerHTML: '', className: '', title: '' },
  'wv-article-cost-badge': { innerHTML: '', title: '' },
  'wv-total-cost-usd': { textContent: '' },
  'wv-total-cost-sub': { textContent: '' },
  'stat-run-cost': { textContent: '' },
  'stat-input-tokens': { textContent: '' },
  'stat-output-tokens': { textContent: '' },
  'stat-time': { textContent: '' },
  'stat-model-chip': { textContent: '' },
  'stat-status': { textContent: '', className: '' },
  'stat-cost': { textContent: '' },
  'test-output': { textContent: '' },
  'stat-words': { textContent: '' },
  'stat-chars': { textContent: '' },
  'bundle-content': { textContent: '' },
  'bundle-rendered-content': { innerHTML: '' },
  'bundle-visuals-content': { innerHTML: '' },
  'bundle-scores-content': { innerHTML: '' },
  'bundle-firecrawl-content': { innerHTML: '' },
  'bundle-modal': { style: { setProperty() {} }, classList: { add() {}, remove() {} } },
  'history-modal': { style: { setProperty() {} }, classList: { add() {}, remove() {} } }
};

const sandbox = {
  document: {
    getElementById(id) {
      if (!mockElements[id]) {
        mockElements[id] = { textContent: '', innerHTML: '', value: '', classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} } };
      }
      return mockElements[id];
    },
    querySelector() { return { classList: { add() {}, remove() {} } }; },
    querySelectorAll() { return []; },
    body: { appendChild() {}, removeChild() {} },
    createElement() {
      return {
        href: '',
        set download(v) { lastDownloadedFilename = v; },
        get download() { return lastDownloadedFilename; },
        click() {}
      };
    }
  },
  navigator: {
    clipboard: {
      writeText(t) { clipboardText = t; return Promise.resolve(); }
    }
  },
  localStorage: mockLocalStorage,
  confirm: () => true,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console,
  URL: class extends URL {
    static createObjectURL() { return 'blob:mock'; }
    static revokeObjectURL() {}
  },
  Blob: MockBlob,
  Set: Set,
  showToast: () => {}
};

vm.createContext(sandbox);
vm.runInContext(script, sandbox);

// 3. Test USD rate configuration & formatting
const defaultSP = sandbox.getServicePricing();
assert.strictEqual(defaultSP.firecrawlPerSearch, 0.005, 'Default Firecrawl search unit price must be $0.005');
assert.strictEqual(defaultSP.imagePerUnit, 0.03, 'Default PesatRouter image unit price must be $0.03');
assert.strictEqual(sandbox.formatUSD(0), '$0.0000');
assert.strictEqual(sandbox.formatUSD(0.000045), '$0.000045', 'Small USD values (<0.0001) must preserve 6-decimal precision');
assert.strictEqual(sandbox.formatUSD(0.1542), '$0.1542');

sandbox.setServicePricing({ firecrawlPerSearch: 0.004, imagePerUnit: 0.025 });
const updatedSP = sandbox.getServicePricing();
assert.strictEqual(updatedSP.firecrawlPerSearch, 0.004);
assert.strictEqual(updatedSP.imagePerUnit, 0.025);
sandbox.setServicePricing({ firecrawlPerSearch: 0.005, imagePerUnit: 0.03 }); // restore defaults
console.log('2. Service Pricing & USD Precision Formatting: ✅ PASS');

// 4. Setup mock article outputs DULU (guard hasActiveArticleOutput() harus aktif sebelum
//    getArticleCostSummary() / updateArticleCostUI dipanggil — ghost-cost guard mengembalikan $0
//    tanpa output artikel aktif).
const sampleArticle = `# How to Calibrate an Espresso Machine

*By CoffeeCrafters Editorial Team | Independently Fact-Checked by Subject Specialists | Updated 2026*

Calibrating an espresso machine ensures balanced extraction at 9 bar pressure and 93°C brew water temperature. ` + 'Detailed barista steps follow for grind size, dose weight, and shot yield. '.repeat(25);

vm.runInContext(`
  stepOutputs['1E'] = ${JSON.stringify(sampleArticle)};
  stepOutputs['2A'] = ${JSON.stringify(JSON.stringify({ title: 'How to Calibrate an Espresso Machine', meta_description: 'Step-by-step espresso calibration.', slug: 'how-to-calibrate-espresso-machine' }))};
  stepOutputs['2K'] = ${JSON.stringify(JSON.stringify({ seo_score: 91, geo_score: 92, overall_score: 92, pass: true }))};
`, sandbox);

// 5. Simulate complete article pipeline cost recording (LLM + pesat-x-jev + fallback + Firecrawl + Images + System)
sandbox.resetCostTracker('how to calibrate espresso machine');

// Firecrawl calls (2 queries)
sandbox.recordFirecrawlCost({ query: 'how to calibrate espresso machine', limit: 5, resultsCount: 5, creditsUsed: 1 });
sandbox.recordFirecrawlCost({ query: 'how to calibrate espresso machine research study', limit: 5, resultsCount: 4, creditsUsed: 1 });

// LLM steps
sandbox.recordLLMCost({ stepId: '1A', configuredModel: 'pesat-lite', actualModel: 'pesat-lite', inputTokens: 1800, outputTokens: 600 });
sandbox.recordLLMCost({ stepId: '1B', configuredModel: 'pesat-flash', actualModel: 'pesat-flash', inputTokens: 2500, outputTokens: 900 });
sandbox.recordLLMCost({ stepId: '1E', configuredModel: 'pesat-flash', actualModel: 'pesat-flash', inputTokens: 3200, outputTokens: 2800 });
// Step 2J: pesat-x-jev + fallback test
sandbox.recordLLMCost({ stepId: '2J', configuredModel: 'pesat-x-jev', actualModel: 'pesat-x-jev', inputTokens: 2400, outputTokens: 800 });
// Also verify fallback billing when configuredModel='pesat-x-jev' falls back to 'pesat-flash'
sandbox.recordLLMCost({ stepId: '2K', configuredModel: 'pesat-flash', actualModel: 'pesat-flash', inputTokens: 3000, outputTokens: 700 });
sandbox.recordLLMCost({ stepId: '3A', configuredModel: 'pesat-lite', actualModel: 'pesat-lite', inputTokens: 2000, outputTokens: 500 });
sandbox.recordSystemStepCost('4A', 'Skipped (0 internal links)');
sandbox.recordLLMCost({ stepId: '4B', configuredModel: 'pesat-flash', actualModel: 'pesat-flash', inputTokens: 3500, outputTokens: 2600 });
sandbox.recordSystemStepCost('5A', 'System API ($0.0000)');

// Images (4 images @ $0.03 = $0.12)
sandbox.recordImageCost({ id: 'featured', title: 'Featured Hero Image', size: '1792x1024' });
sandbox.recordImageCost({ id: 'supporting_1', title: 'Supporting Image 1', size: '1792x1024' });
sandbox.recordImageCost({ id: 'supporting_2', title: 'Supporting Image 2', size: '1792x1024' });
sandbox.recordImageCost({ id: 'supporting_3', title: 'Supporting Image 3', size: '1792x1024' });

const summary = sandbox.getArticleCostSummary();
// Manual verification of exact math:
// 1A: 1.8*0.0001 + 0.6*0.0002 = 0.00018 + 0.00012 = 0.00030
// 1B: 2.5*0.0002 + 0.9*0.0004 = 0.00050 + 0.00036 = 0.00086
// 1E: 3.2*0.0002 + 2.8*0.0004 = 0.00064 + 0.00112 = 0.00176
// 2J: 2.4*0.0003 + 0.8*0.0006 = 0.00072 + 0.00048 = 0.00120
// 2K: 3.0*0.0002 + 0.7*0.0004 = 0.00060 + 0.00028 = 0.00088
// 3A: 2.0*0.0001 + 0.5*0.0002 = 0.00020 + 0.00010 = 0.00030
// 4B: 3.5*0.0002 + 2.6*0.0004 = 0.00070 + 0.00104 = 0.00174
// LLM Total = 0.00704
// Firecrawl = 2 * 0.005 = 0.01000
// Images = 4 * 0.03 = 0.12000
// Grand Total = 0.13704
assert(Math.abs(summary.llmCostUsd - 0.00704) < 1e-9, `Expected LLM cost 0.00704, got ${summary.llmCostUsd}`);
assert(Math.abs(summary.jevCostUsd - 0.00120) < 1e-9, `Expected jev cost 0.00120, got ${summary.jevCostUsd}`);
assert.strictEqual(summary.jevInputTokens, 2400);
assert.strictEqual(summary.jevOutputTokens, 800);
assert.strictEqual(summary.jevTotalTokens, 3200);
assert(Math.abs(summary.firecrawlCostUsd - 0.01000) < 1e-9);
assert(Math.abs(summary.imageCostUsd - 0.12000) < 1e-9);
assert(Math.abs(summary.totalCostUsd - 0.13704) < 1e-9, `Expected Grand Total 0.13704, got ${summary.totalCostUsd}`);
assert.strictEqual(summary.byModel.length, 3, 'Should aggregate across pesat-lite, pesat-flash, pesat-x-jev');
assert(summary.byStep.some(s => s.stepId === '4A' && s.costUsd === 0), 'Skipped 4A must appear as $0.0000 in step breakdown');
console.log('3. Cost Calculation & Multi-Service Aggregation Math: ✅ PASS ($' + summary.totalCostUsd.toFixed(4) + ' USD)');

// 5. Verify UI updates (badges, deliverable card, sidebar)
assert(mockElements['wv-pesat-jev-badge'].innerHTML.includes('3,200 / 4,000 tok ($0.0012)'), 'pesat-x-jev badge must display tokens + USD');
assert(mockElements['wv-article-cost-badge'].innerHTML.includes('$0.1370 USD'), 'Header cost badge must display total USD');
assert.strictEqual(mockElements['wv-total-cost-usd'].textContent, '$0.1370', 'Deliverable card must show total USD');
assert.strictEqual(mockElements['stat-run-cost'].textContent, '$0.1370', 'Sidebar must show live run USD');
console.log('4. Live UI Badges, Deliverable Card & Sidebar Cost Sync: ✅ PASS');

// 6. (Relocated setup — see #4) sampleArticle + stepOutputs sekarang di-set SEBELUM cost recording
// agar hasActiveArticleOutput() guard aktif saat getArticleCostSummary() dipanggil.

const bundleMd = sandbox.buildFullArticleBundle();
assert(bundleMd.includes('> **Fact-Check (Step 2J):** `pesat-x-jev` (In: 2,400 + Out: 800 = 3,200 / 4,000 tokens — $0.0012 USD)'), 'Markdown metadata box must include detailed pesat-x-jev input/output/USD');
assert(bundleMd.includes('> **Total Cost / Article:** **$0.1370 USD** (LLM: $0.0070 | Firecrawl Search: $0.0100 | AI Images: $0.1200)'), 'Markdown metadata box must include Total Cost / Article');
assert(bundleMd.includes('## 💵 Cost Breakdown (USD per Article)'), 'Markdown output must include dedicated Cost Breakdown section');
assert(bundleMd.includes('### Ringkasan Komposisi Biaya'), 'Markdown output must include component summary table');
assert(bundleMd.includes('### Detail Panggilan Firecrawl Search'), 'Markdown output must include Firecrawl query breakdown table');
assert(bundleMd.includes('### Detail Generasi Gambar AI (PesatRouter)'), 'Markdown output must include AI Image generation breakdown table');
assert(bundleMd.includes('| **GRAND TOTAL** | **1 Artikel Lengkap Siap Publish** | **$0.1370 USD** |'), 'Markdown summary table must show GRAND TOTAL USD');

// Verify viewFullArticleBundle populates Tab 1, Tab 3 (#bundle-content), Tab 4 (#bundle-scores-content)
sandbox.viewFullArticleBundle();
assert(mockElements['bundle-content'].textContent.includes('## 💵 Cost Breakdown (USD per Article)'), 'Raw Markdown tab (#bundle-content) must be populated with cost breakdown');
assert(mockElements['bundle-rendered-content'].innerHTML.includes('Total Cost (USD):'), 'Formatted Reading View must render Total Cost row in metadata card');
assert(mockElements['bundle-scores-content'].innerHTML.includes('Rincian Biaya Produksi Artikel (USD per Article)'), 'Tab 4 must render itemized USD breakdown HTML');

// Verify copyCleanArticleOnly keeps CMS article pure (no cost breakdown / metadata leak)
sandbox.copyCleanArticleOnly();
assert(!clipboardText.includes('Total Cost / Article'), 'copyCleanArticleOnly must NOT leak cost metadata');
assert(!clipboardText.includes('Cost Breakdown (USD per Article)'), 'copyCleanArticleOnly must NOT leak cost tables');
console.log('5. Markdown Deliverable Bundle, Modal Tabs & Clean CMS Copy Isolation: ✅ PASS');

// 7. Test History Save, Restore, and .md Download with USD Cost Breakdown
sandbox.saveCurrentArticleToHistory();
const hist = sandbox.loadArticleHistory();
assert.strictEqual(hist.length, 1);
assert(Math.abs(hist[0].total_cost_usd - 0.13704) < 1e-9, 'History entry must persist total_cost_usd');
assert(hist[0].cost_tracker && hist[0].cost_tracker.imageCalls.length === 4, 'History entry must persist cost_tracker snapshot');

sandbox.downloadHistoryArticleMd(hist[0].id);
assert(lastDownloadedFilename.endsWith('-bundle.md'), 'History download must output .md bundle');
assert(lastDownloadedBlobText.includes('## 💵 Cost Breakdown (USD per Article)'), 'Downloaded .md from history MUST include Cost Breakdown (USD per Article)');
assert(lastDownloadedBlobText.includes('$0.1370'), 'Downloaded .md from history MUST include exact USD total');

// Reset and restore from history
sandbox.clearStepOutputs();
assert.strictEqual(sandbox.getArticleCostSummary().totalCostUsd, 0, 'clearStepOutputs must reset cost to 0');
sandbox.restoreArticleFromHistory(hist[0].id);
assert(Math.abs(sandbox.getArticleCostSummary().totalCostUsd - 0.13704) < 1e-9, 'restoreArticleFromHistory must restore full USD cost breakdown');
console.log('6. History Persistence, Restore & .md Export with Cost Breakdown: ✅ PASS');

// 8. Test showResults actual fallback model billing & Step 4A skipped payload fix
sandbox.resetCostTracker('fallback test');
sandbox.showResults({ output: 'Audited OK', inputTokens: 1000, outputTokens: 500, model: 'pesat-flash', configuredModel: 'pesat-x-jev', costUsd: 0.0004 }, 'pesat-x-jev', 1200, 'json', '2J');
assert.strictEqual(mockElements['stat-model-chip'].textContent, 'pesat-flash', 'showResults must display actual routed/fallback model');
assert.strictEqual(mockElements['stat-cost'].textContent, '$0.0004', 'showResults must display actual billed USD');
assert.doesNotThrow(() => {
  sandbox.showResults({ output: 'Article text', inputTokens: 0, outputTokens: 0, totalTokens: 0, model: 'system:skipped', configuredModel: 'pesat-flash', costUsd: 0 }, 'pesat-flash', 0, 'markdown', '4A');
}, 'Step 4A skipped payload must pass showResults cleanly without TypeError');
console.log('7. Fallback Model Billing & Step 4A Skip Safety: ✅ PASS');

console.log('\n=== ALL 7 USD COST BREAKDOWN & AUDIT TESTS PASSED! 🚀 ===');
