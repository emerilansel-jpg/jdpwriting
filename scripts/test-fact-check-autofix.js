const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== QA TEST SUITE: STEP 2J FACT-CHECK AUTO-FIX & PATCHING EFFECTIVENESS ===\n');

const html = fs.readFileSync('admin-ui.html', 'utf8');
const scriptMatch = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

// 1. Script compilation test
assert.doesNotThrow(() => {
  new vm.Script(scriptMatch, { filename: 'admin-ui-fact-check-test.js' });
}, 'admin-ui.html script must compile without syntax errors');
console.log('1. Script Syntax Compilation: ✅ PASS');

// 2. Check Step 2J userPrompt contains PART 4 Auto-Fix Replacements
assert(html.includes('PART 4 — AUTO-FIX REPLACEMENTS (CRITICAL FOR FACT CORRECTION)'), 'Step 2J user prompt must instruct pesat-x-jev to generate replacements');
assert(html.includes('replacements:[{original,fixed,reason}]'), 'Step 2J return schema must include replacements array');
console.log('2. Step 2J Auto-Fix Prompt & Schema: ✅ PASS');

// 3. Verify upstreamMap routes 2J_article to 2K, 3A, 3B, 4A
assert(html.includes("'2K': { article: '2J_article'"), 'Step 2K must receive 2J_article');
assert(html.includes("'3A': { article: '2J_article'"), 'Step 3A must receive 2J_article');
assert(html.includes("'4A': { article: '2J_article'"), 'Step 4A must receive 2J_article');
console.log('3. Upstream Dependency Wiring (2J_article -> 2K, 3A, 4A): ✅ PASS');

// 4. Test applyFactCheckFixes runtime in VM
const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const mockElements = {
  'ti-keyword': { value: 'how to fertilize jade plant' },
  'wv-keyword': { value: 'how to fertilize jade plant' },
  'ti-brand': { value: 'KnownGarden' },
  'wv-brand': { value: 'KnownGarden' },
  'ti-article': { value: '' },
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
  'json-keys': { textContent: '' }
};

const sandbox = {
  document: {
    getElementById(id) {
      if (!mockElements[id]) {
        mockElements[id] = { textContent: '', innerHTML: '', value: '', classList: { add() {}, remove() {} }, style: { setProperty() {} } };
      }
      return mockElements[id];
    },
    querySelector() { return { classList: { add() {}, remove() {} } }; },
    querySelectorAll() { return []; }
  },
  localStorage: mockLocalStorage,
  confirm: () => true,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console,
  showToast: () => {}
};

vm.createContext(sandbox);
vm.runInContext(scriptMatch, sandbox);

// Sample flawed article with 3 distinct factual violations
const rawFlawedArticle = `# How to Fertilize Jade Plants: Complete Feeding Guide

*By KnownGarden Editorial Team | Independently Fact-Checked by Subject Specialists | Updated 2026*

Jade plants thrive when given adequate nutrition during the active spring growing season.

## What Fertilizer Ratio Should You Use?
Apply a specialized 2-4-3 fertilizer ratio to jade plants during every feeding. Unbuffered nutrients directly stimulate root cell growth without delay.

## Can You Fertilize in Winter?
> "Jade plants must be fed every single week in winter to prevent nutrient starvation."
> — **Dr. Fake Researcher**, *Journal of Fictional Plants, 2024*

Over-fertilization causes 65% immediate leaf drop within forty-eight hours across all succulent varieties.
`;

const mockPesatXJevOutput = {
  quality_score: 72,
  readability: { grade_level: 7.5, flesch_score: 70 },
  critical_flags: [
    "Non-standard fertilizer ratio 2-4-3 detected (botanical consensus standard is 2-7-7 or 10-10-10 diluted).",
    "Fabricated quote from non-existent author recommending winter feeding.",
    "Unverified exact 65% leaf drop statistic with causal language."
  ],
  replacements: [
    {
      original: "Apply a specialized 2-4-3 fertilizer ratio to jade plants during every feeding.",
      fixed: "Apply a balanced 10-10-10 or specialized 2-7-7 succulent fertilizer diluted to half strength.",
      reason: "2-4-3 is an unverified ratio; standard botanical guidance recommends 2-7-7 or 10-10-10."
    },
    {
      original: `> "Jade plants must be fed every single week in winter to prevent nutrient starvation."\n> — **Dr. Fake Researcher**, *Journal of Fictional Plants, 2024*`,
      fixed: `> "Jade plants enter a period of semi-dormancy in winter and should not receive supplemental fertilizer until spring growth resumes."\n> — **Clemson Cooperative Extension**, *Home & Garden Information Center, 2023*`,
      reason: "Replaced fabricated winter feeding quote with verified extension authority guideline."
    },
    {
      original: "Over-fertilization causes 65% immediate leaf drop within forty-eight hours across all succulent varieties.",
      fixed: "Excessive fertilizer concentration is frequently associated with root damage and subsequent sudden leaf drop.",
      reason: "Replaced fabricated exact 65% figure and absolute causal claim with grounded associative language."
    }
  ]
};

// Test applyFactCheckFixes function directly
const fixedArticle = sandbox.applyFactCheckFixes(rawFlawedArticle, mockPesatXJevOutput);

// Assertions: All flawed statements MUST be replaced
assert(!fixedArticle.includes('2-4-3'), 'Flawed ratio 2-4-3 must be eliminated from article');
assert(fixedArticle.includes('10-10-10 or specialized 2-7-7'), 'Corrected ratio must be present');

assert(!fixedArticle.includes('Dr. Fake Researcher'), 'Fabricated researcher must be eliminated');
assert(fixedArticle.includes('Clemson Cooperative Extension'), 'Verified extension authority must be present');

assert(!fixedArticle.includes('65% immediate leaf drop'), 'Fabricated 65% statistic must be eliminated');
assert(fixedArticle.includes('is frequently associated with root damage'), 'Grounded associative phrasing must be present');

console.log('4. applyFactCheckFixes Engine: ✅ PASS (3/3 Factual Violations Corrected)');

// 5. Test pipeline integration: stepOutputs['2J_article'] populated on showResults
sandbox.getStepOutputs()['2H'] = rawFlawedArticle;

vm.runInContext(`
  const mockStep2JIdx = stepData.findIndex(s => s.id === '2J');
  if (mockStep2JIdx < 0) throw new Error('Step 2J must exist in stepData');
  currentStepIdx = mockStep2JIdx;
  showResults({
    output: JSON.stringify(${JSON.stringify(mockPesatXJevOutput)}),
    inputTokens: 1200,
    outputTokens: 450
  }, 'pesat-x-jev', 2500, 'json');
`, sandbox);

assert(sandbox.getStepOutputs()['2J_article'], 'stepOutputs[2J_article] must be created when Step 2J finishes');
assert(sandbox.getStepOutputs()['2J_article'].includes('10-10-10 or specialized 2-7-7'), '2J_article must contain the factually corrected text');
console.log('5. Step 2J Pipeline Auto-Patcher Integration: ✅ PASS');

// 6. Test getBestArticle prioritization of 2J_article
// Temporarily clear 4A & 4B to see if 2J_article beats 2H
delete sandbox.getStepOutputs()['4A'];
delete sandbox.getStepOutputs()['4B'];
const bestArt = sandbox.getBestArticle();
assert.strictEqual(bestArt.trim(), sandbox.getStepOutputs()['2J_article'].trim(), 'getBestArticle must prioritize 2J_article over uncorrected 2H');
assert(!bestArt.includes('2-4-3'), 'Best article must be the fact-checked version');
console.log('6. getBestArticle Prioritization (2J_article > 2H): ✅ PASS');

console.log('\n=== ALL FACT-CHECK AUTO-FIX TESTS PASSED SUCCESSFULLY! 🚀 ===');
