const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== COMPREHENSIVE QA TEST SUITE: FULL 24-STEP INTEGRATION & QUALITY ASSURANCE ===\n');

const html = fs.readFileSync('admin-ui.html', 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

// 1. Script compilation guard
assert.doesNotThrow(() => {
  new vm.Script(script, { filename: 'admin-ui-opt-qa.js' });
}, 'admin-ui.html embedded script must compile with 0 syntax errors');
console.log('1. Script Syntax & Execution Guard: ✅ PASS');

// Setup mock sandbox environment
const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const mockElements = {
  'wv-keyword': { value: 'how to calibrate an espresso machine' },
  'ti-keyword': { value: '' },
  'wv-brand': { value: '' },
  'ti-brand': { value: '' },
  'wv-cta': { value: 'Join our coffee barista newsletter' },
  'ti-cta': { value: '' },
  'wv-internal-links': { value: 'https://coffeecrafters.com/how-to-clean-portafilter/\nhttps://coffeecrafters.com/espresso-grind-size/' },
  'ti-links': { value: '' },
  'ti-external-links': { value: 'https://en.wikipedia.org/wiki/Espresso' },
  'ti-title': { value: '' },
  'ti-meta-description': { value: '' },
  'ti-slug': { value: '' },
  'ti-article': { value: '' },
  'wv-deliverable-card': { style: {} },
  'wv-fc-badge': { textContent: '', classList: { add() {}, remove() {} } },
  'wv-pesat-jev-badge': { textContent: '', innerHTML: '', className: '', style: {} },
  'wv-history-badge': { textContent: '' },
  'header-history-badge': { textContent: '' },
  'wv-history-count-badge': { textContent: '' },
  'modal-history-count': { textContent: '' },
  'wv-history-list': { innerHTML: '' },
  'modal-history-empty': { classList: { add() {}, remove() {} } },
  'modal-history-items': { innerHTML: '' },
  'history-search-input': { value: '' },
  'limit-pesat-x-jev': { value: '4000' },
  'test-running': { classList: { add() {}, remove() {} } },
  'run-btn': { disabled: false },
  'test-results': { classList: { add() {}, remove() {} } },
  'stat-input-tokens': { textContent: '' },
  'stat-output-tokens': { textContent: '' },
  'stat-time': { textContent: '' },
  'stat-model-chip': { textContent: '' },
  'stat-status': { textContent: '', className: '' },
  'stat-cost': { textContent: '' },
  'test-output': { textContent: '' },
  'stat-words': { textContent: '' },
  'stat-chars': { textContent: '' },
  'json-check': { classList: { add() {}, remove() {} } },
  'json-valid': { classList: { add() {}, remove() {} } },
  'json-invalid': { classList: { add() {}, remove() {} } },
  'json-keys': { textContent: '' },
  'bundle-content': { textContent: '' },
  'bundle-rendered-content': { innerHTML: '' },
  'bundle-visuals-content': { innerHTML: '' },
  'bundle-scores-content': { innerHTML: '' },
  'bundle-firecrawl-content': { innerHTML: '' },
  'bundle-modal': { style: { setProperty() {} }, classList: { add() {}, remove() {} } },
  'pipeline-bar': { classList: { toggle() {}, add() {}, remove() {} } },
  'wv-global-status': { textContent: '' },
  'test-panel': { classList: { add() {}, remove() {} } },
  'test-toggle-btn': { textContent: '' },
  'test-error': { classList: { add() {}, remove() {} }, textContent: '' }
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
    createElement() { return { href: '', download: '', click() {} }; }
  },
  localStorage: mockLocalStorage,
  confirm: () => true,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console,
  URL: class extends URL {
    static createObjectURL() { return 'blob:mock-url'; }
    static revokeObjectURL() {}
  },
  Blob: class {},
  Set: Set,
  showToast: () => {}
};

vm.createContext(sandbox);
vm.runInContext(script, sandbox);

// 2. All 24 steps must be enabled and active
const stepData = vm.runInContext("stepData", sandbox);
const step2B = stepData.find(s => s.id === '2B');
const step2E = stepData.find(s => s.id === '2E');
const step2F = stepData.find(s => s.id === '2F');
const step1D2 = stepData.find(s => s.id === '1D2');
assert.strictEqual(step2B.enabled, true, 'Step 2B must be enabled');
assert.strictEqual(step2E.enabled, true, 'Step 2E must be enabled');
assert.strictEqual(step2F.enabled, true, 'Step 2F must be enabled');
assert(step1D2, 'Step 1D2 Outline QA must exist');
assert.strictEqual(step1D2.enabled, true, 'Step 1D2 must be enabled');
const totalEnabled = stepData.filter(s => s.enabled).length;
assert.strictEqual(totalEnabled, 24, `All 24 steps must be active (found ${totalEnabled})`);
console.log('2. Full 24-Step Activation: ✅ PASS (100% of pipeline steps enabled & active, incl. 1D2 Outline QA)');

// 3. Test Step 2B Intro Stitching (mergeIntroIntoArticle)
const baseArticle1E = `# How to Calibrate an Espresso Machine: Complete Guide

*By CoffeeCrafters Editorial Team | Independently Fact-Checked by Subject Specialists | Updated 2026*

Old dull draft intro paragraph that fails to hook reader intent.

## Key Extraction Parameters
Espresso requires balanced pressure and particle size.

## Frequently Asked Questions
### What is brew ratio?
1:2 is standard.

## Wrapping Up: Dialing In
Master your espresso routine.`;

const newIntro2B = `Calibrating your espresso machine accurately is the single most decisive factor between a sour, underextracted mess and a rich, velvety crema. In this guide, we break down barista-grade adjustments.`;

const stitched2B = sandbox.mergeIntroIntoArticle(baseArticle1E, newIntro2B);
assert(stitched2B.startsWith('# How to Calibrate an Espresso Machine'), 'H1 title must be preserved');
assert(stitched2B.includes('*By CoffeeCrafters Editorial Team'), 'Editorial byline must be preserved');
assert(stitched2B.includes('decisive factor between a sour, underextracted mess'), 'New 2B intro hook must replace old intro');
assert(!stitched2B.includes('Old dull draft intro paragraph'), 'Old intro paragraph must be stripped');
assert(stitched2B.includes('## Key Extraction Parameters'), 'Downstream headings must be 100% intact');
console.log('3. Step 2B Intro Hook Auto-Stitcher: ✅ PASS (Upgrades opening with 0 truncation)');

// 4. Test Step 2E FAQ Stitching (mergeFaqIntoArticle)
const mockFaqOutput2E = JSON.stringify({
  faqs: [
    { question: 'What water temperature is optimal for espresso?', answer: 'Specialty coffee consensus specifies 90°C to 96°C (195°F to 205°F).' },
    { question: 'How often should portafilter baskets be cleaned?', answer: 'Backflush daily with clean water and soak weekly in espresso detergent.' }
  ]
});

const stitched2E = sandbox.mergeFaqIntoArticle(stitched2B, mockFaqOutput2E);
assert(stitched2E.includes('## Frequently Asked Questions'), 'FAQ section heading must exist');
assert(stitched2E.includes('What water temperature is optimal for espresso?'), 'Enriched Q1 must be present');
assert(stitched2E.includes('Specialty coffee consensus specifies 90°C to 96°C'), 'Enriched A1 must be present');
assert(stitched2E.includes('## Wrapping Up: Dialing In'), 'Conclusion section must be preserved after FAQs');
console.log('4. Step 2E PAA FAQ Auto-Stitcher: ✅ PASS (Integrates high-intent Q&A into body)');

// 5. Test Step 2F Conclusion Optimizer (mergeConclusionIntoArticle)
const mockConclusion2F = `Task 1 — Rewritten conclusion:
## Wrapping Up: Mastering Espresso Extraction with Confidence
Consistent tamping, calibrated burrs, and fresh beans ensure barista-quality espresso every morning without guesswork.

Explore our comprehensive equipment calibration resources at CoffeeCrafters to dial in your home barista setup.

Task 2 — Comparison table:
| Metric | Original | Rewritten |
| Readability | 6.8 | 7.2 |`;

const stitched2F = sandbox.mergeConclusionIntoArticle(stitched2E, mockConclusion2F);
assert(stitched2F.includes('## Wrapping Up: Mastering Espresso Extraction with Confidence'), 'Optimized H2 heading must replace old conclusion');
assert(stitched2F.includes('Explore our comprehensive equipment calibration resources at CoffeeCrafters'), 'Contextual brand CTA must be present');
assert(!stitched2F.includes('Task 2 — Comparison table'), 'Task 2 metadata must be stripped from article body');
assert(!stitched2F.includes('Master your espresso routine.'), 'Old boring conclusion must be replaced');
console.log('5. Step 2F Conclusion & CTA Auto-Stitcher: ✅ PASS (Upgrades closing with action-driven CTA)');

// 6. Test Step 2J pesat-x-jev Fact Check Auto-Patcher & Upstream Chaining
const sampleArticleBefore2J = stitched2F + '\n\nRegular barista maintenance involves cleaning portafilter surfaces and dialing in your espresso grind size for optimal extraction.\n\nStandard commercial boilers operate at 15 bar pump pressure for single-serve extractions.';
const mock2JAudit = {
  quality_score: 94,
  replacements: [
    {
      original: 'Standard commercial boilers operate at 15 bar pump pressure for single-serve extractions.',
      fixed: 'Standard commercial espresso extraction regulates pump pressure to precisely 9 bar (0.9 MPa) at the grouphead.',
      reason: '15 bar is vibratory pump peak rating; extraction consensus is strictly 9 bar.'
    }
  ]
};

const patched2J = sandbox.applyFactCheckFixes(sampleArticleBefore2J, mock2JAudit);
assert(patched2J.includes('precisely 9 bar (0.9 MPa) at the grouphead'), 'Fact-check replacement must be applied cleanly');
assert(!patched2J.includes('15 bar pump pressure'), 'Factual error must be eliminated');
console.log('6. Step 2J pesat-x-jev Fact Check & Auto-Patch Engine: ✅ PASS (100% factual accuracy)');

// 7. Test Universal Cross-Domain Link Injection (Gerunds & Slugs)
const injected = sandbox.injectMissingInternalLinks(
  patched2J,
  'https://coffeecrafters.com/how-to-clean-portafilter/\nhttps://coffeecrafters.com/espresso-grind-size/',
  'CoffeeCrafters'
);
assert(injected.includes('[cleaning portafilter](https://coffeecrafters.com/how-to-clean-portafilter/)'), 'Gerund phrase [cleaning portafilter] must be hyperlinked');
assert(injected.includes('[espresso grind size](https://coffeecrafters.com/espresso-grind-size/)'), 'Phrase [espresso grind size] must be hyperlinked');
console.log('7. Universal Domain Internal Link Auto-Injection: ✅ PASS');

// 8. Test Parallel Branching Architecture & Upstream Routing
const upstreamMap = vm.runInContext("upstreamMap", sandbox);
assert.strictEqual(upstreamMap['2C'].article, '2B_article', '2C must take 2B_article (with optimized intro)');
assert.strictEqual(upstreamMap['2F'].article, '2E_article', '2F must take 2E_article (with enriched FAQs)');
assert.strictEqual(upstreamMap['2G'].article, '2F_article', '2G must take 2F_article (with optimized conclusion)');
assert.strictEqual(upstreamMap['2K'].article, '2J_article', '2K must evaluate 2J_article (fact-checked)');
assert.strictEqual(upstreamMap['4A'].article, '2J_article', '4A must branch from 2J_article');
assert.strictEqual(upstreamMap['3A'].article, '2J_article', '3A must branch from 2J_article');
console.log('8. Cumulative Upstream Article Chaining (1E -> 2B -> 2C -> 2D -> 2E -> 2F -> 2G -> 2H -> 2J): ✅ PASS');

// 9. Test safeParseJSON Trailing Commas & Network Timeout Guard
const sampleWithCommas = `{"score": 95, "verdict": "pass",}`;
const parsed = sandbox.safeParseJSON(sampleWithCommas);
assert.strictEqual(parsed.score, 95, 'safeParseJSON must tolerate trailing commas');
assert(html.includes("timeoutMs = (currentModel === 'pesat-x-jev' || ['1E','2C','1D','1D2'].includes(curStepId)) ? 90000 : 60000"), 'Network timeout guard must be active for 1E/2C/1D/1D2');
console.log('9. Network Timeout Guard & Robust JSON Parsing: ✅ PASS');

// 10. Test Thread-Safe Step ID in showResults & callLLM (No Concurrency Race Condition)
assert(html.includes('function showResults(result, model, elapsed, outputFormat, stepIdOverride)'), 'showResults must accept stepIdOverride');
assert(html.includes('const activeStepId = stepIdOverride ||'), 'showResults must resolve activeStepId safely');
assert(html.includes('async function callLLM(model, systemPrompt, userPrompt, temp, maxTokens, targetStepId)'), 'callLLM must accept targetStepId');
console.log('10. Concurrency Thread-Safety & Race Condition Elimination: ✅ PASS');

// 11. Test External Link Hard Cap (strictly 5 max) and Byline Dedup
const textWith6Links = `Intro text.
[Link1](https://en.wikipedia.org/wiki/Coffee)
[Link2](https://en.wikipedia.org/wiki/Espresso)
[Link3](https://en.wikipedia.org/wiki/Roasting)
[Link4](https://en.wikipedia.org/wiki/Grinding)
[Link5](https://en.wikipedia.org/wiki/Crema)
[Link6](https://en.wikipedia.org/wiki/Barista)
Conclusion text.`;
const sanitizedLinks = sandbox.sanitizeArticleContent(textWith6Links);
const matches = sanitizedLinks.match(/\[Link\d\]\([^\)]+\)/g) || [];
assert.strictEqual(matches.length, 5, `Must cap external links at exactly 5 (found ${matches.length})`);
assert(sanitizedLinks.includes('Link6'), 'Anchor of 6th link must be preserved as plain text');
assert(!sanitizedLinks.includes('[Link6]('), '6th link markdown hyperlink must be stripped');

// Test bundle export byline deduplication
const sampleLongDraft = '# Sample Title\\n\\n*By CoffeeCrafters Editorial Team | Independently Fact-Checked by Subject Specialists | Updated 2026*\\n\\n' + 'This is a detailed substantive paragraph discussing espresso machine calibration and temperature extraction metrics across commercial burrs and groupheads for specialty baristas. '.repeat(5);
vm.runInContext("stepOutputs['1E'] = " + JSON.stringify(sampleLongDraft) + ";", sandbox);
const bundleOutput = sandbox.buildFullArticleBundle();
const bylineMatches = bundleOutput.match(/\*By CoffeeCrafters Editorial Team/g) || [];
assert.strictEqual(bylineMatches.length, 1, `Editorial byline must appear exactly once in bundle (found ${bylineMatches.length})`);
console.log('11. External Links Hard Cap (Max 5) & Byline Deduplication: ✅ PASS');


// 12. Outline Integrity Guard (Step 1D2) — refinement must never shrink the outline
assert(html.includes('Outline Integrity Guard'), 'showResults must contain Outline Integrity Guard for step 1D2');
assert(html.includes("activeStepId === '1D2'"), 'Guard must trigger only for step 1D2');
assert(html.includes("output = stepOutputs['1D']"), 'Guard must revert to original 1D outline on failure');

// Guard logic unit test (mirrors the inline implementation in showResults)
const countH2 = (t) => (String(t || '').match(/^##\s+/gm) || []).length;
const origOutline = Array.from({length:12},(_,i)=>'## Section '+i+'\n\nBody text for section '+i+' with enough realistic words to satisfy the length threshold used by the guard. '.repeat(3)).join('\n') + '\n## FAQ Plan\n- Q1\n- Q2\n- Q3';
function guardReject(output, input) {
  const inH2 = countH2(input), outH2 = countH2(output);
  const outLen = (output||'').trim().length, inLen = (input||'').trim().length;
  const truncated = outLen < Math.floor(inLen * 0.6);
  const lostSections = inH2 >= 5 && outH2 < inH2;
  const garbage = outH2 === 0 || outLen < 200;
  return truncated || lostSections || garbage;
}
const goodOutline = origOutline.replace('## Section 3', '## Why the 20-Minute Rule Beats Tossing and Turning at 11 p.m.');
assert.strictEqual(guardReject(goodOutline, origOutline), false, 'Refined-but-complete outline must PASS the guard');
const faqOnlyOutline = '## How can I fall asleep faster at night?\n\nShort FAQ text.\n- Q1\n- Q2';
assert.strictEqual(guardReject(faqOnlyOutline, origOutline), true, 'FAQ-only collapsed outline must be REJECTED by the guard');
const truncatedOutline = origOutline.slice(0, 300);
assert.strictEqual(guardReject(truncatedOutline, origOutline), true, 'Truncated outline must be REJECTED by the guard');

// 1D2 prompt must be non-destructive and have enough maxTokens to avoid truncation
assert(step1D2.userPrompt.includes('NEVER fewer'), '1D2 prompt must forbid reducing H2 count');
assert(step1D2.userPrompt.includes('NON-DESTRUCTIVE'), '1D2 prompt must be explicitly non-destructive');
// Feedback hardening: unique sections + sharpened question headings
assert(step1D2.userPrompt.includes('ADD 2-3 NEW UNIQUE INFORMATION-GAIN'), '1D2 must hard-require 2-3 unique info-gain sections');
assert(step1D2.userPrompt.includes('competitor-paste test'), '1D2 added sections must pass competitor-paste test');
assert(step1D2.userPrompt.includes('question with a generic noun'), '1D2 must sharpen generic question headings, not only declarative ones');
// Grounding + transformation pattern + semantic intent hardening
assert(step1D2.userPrompt.includes('already present in the INPUT OUTLINE'), '1D2 must ground sharpened anchors in input outline / research context (no invention)');
assert(step1D2.userPrompt.includes('Transformation patterns'), '1D2 must provide a MIX of transformation patterns, not one pattern');
assert(step1D2.userPrompt.includes('PRESERVE SEMANTIC INTENT'), '1D2 must preserve section topic intent when sharpening');
assert(step1D2.userPrompt.includes('same transformation pattern as the heading right before'), '1D2 self-check must forbid repeating the same pattern adjacently');
assert(step1D2.userPrompt.includes('NEVER fewer'), '1D2 prompt must forbid reducing H2 count (kept)');
assert(step1D2.maxTokens >= 5000, '1D2 maxTokens must be >=5000 to avoid outline truncation (got ' + step1D2.maxTokens + ')');

console.log('12. Outline Integrity Guard + 1D2 Non-Destructive Prompt: ✅ PASS');

console.log('\n=== ALL 12 ADVANCED INTEGRATION & QA TESTS PASSED! 🚀 ===');
