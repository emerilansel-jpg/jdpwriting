const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST SUITE: UNIVERSAL CROSS-DOMAIN FACT-CHECKING ===');

const html = fs.readFileSync('admin-ui.html', 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

// 1. Script compilation
assert.doesNotThrow(() => {
  new vm.Script(script, { filename: 'admin-ui-universal-test.js' });
}, 'Embedded script in admin-ui.html must compile with 0 syntax errors');
console.log('1. Script Syntax Compilation: ✅ PASS');

// 2. Check Universal Byline (No hardcoded "Botanically")
assert(!html.includes('Botanically & Fact-Checked'), 'Byline must NOT contain hardcoded "Botanically"');
assert(html.includes('Independently Fact-Checked by Subject Specialists'), 'Byline must be universal: "Independently Fact-Checked by Subject Specialists"');
console.log('2. Universal Cross-Domain Editorial Byline: ✅ PASS');

// 3. Check Universal Technical Accuracy in Step 1E
assert(html.includes('17. UNIVERSAL DOMAIN & FACTUAL ACCURACY (APPLIES ACROSS ALL TOPICS)'), 'Step 1E must have universal technical accuracy rule');
assert(html.includes('DATA & SPECIFICATION FIDELITY'), 'Must mandate specification fidelity across all topics');
assert(html.includes('CONDITIONAL ACCURACY & NUANCE'), 'Must mandate conditional accuracy and nuance across all topics');
console.log('3. Step 1E Universal Factual Accuracy Requirement: ✅ PASS');

// 4. Check Universal Fact Check in Step 2J
assert(html.includes('UNIVERSAL DOMAIN-AGNOSTIC FACT CHECK (ALL TOPICS)'), 'Step 2J must perform universal domain-agnostic fact check');
assert(html.includes('PARAMETER & METRIC FIDELITY'), 'Step 2J must audit parameter and metric fidelity for any topic');
assert(html.includes('CONDITIONAL TRUTH AUDIT'), 'Step 2J must audit conditional truth for any topic');
console.log('4. Step 2J Universal Fact Verification Engine: ✅ PASS');

// 5. Check Universal Landmark Bodies in Step 1B
assert(html.includes('LANDMARK STUDIES & AUTHORITATIVE BODIES'), 'Step 1B must generalize to standards and agencies across all fields');
assert(html.includes('IEEE, NIST, ISO, W3C'), 'Step 1B must include cross-domain standards organizations');
console.log('5. Step 1B Universal Authoritative Bodies: ✅ PASS');

// 6. Test Multi-Niche Bundle Generation
const scriptContext = {
  document: {
    getElementById: (id) => {
      if (id === 'ti-keyword' || id === 'wv-keyword') return { value: 'how to calibrate espresso machine' };
      if (id === 'ti-brand' || id === 'wv-brand') return { value: 'CoffeeCrafters' };
      if (id === 'ti-links' || id === 'wv-internal-links') return { value: 'https://coffeecrafters.com/espresso-grind-size/\nhttps://coffeecrafters.com/espresso-tamping-guide/' };
      return { value: '', classList: { add: () => {}, remove: () => {} }, style: { setProperty: () => {} } };
    },
    querySelector: () => ({ classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => []
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  console: console,
  URL: URL,
  Set: Set
};

vm.createContext(scriptContext);
const testCode = `
${script}

globalThis.activeBrand = getActiveBrand();
globalThis.articleBundle = buildFullArticleBundle();
`;

vm.runInContext(testCode, scriptContext);

assert.strictEqual(scriptContext.activeBrand, 'CoffeeCrafters', 'Brand should be CoffeeCrafters');
assert(scriptContext.articleBundle.includes('*By CoffeeCrafters Editorial Team | Independently Fact-Checked by Subject Specialists | Updated 2026*'), 'Bundle byline must use CoffeeCrafters and universal fact-checked label');
assert(!scriptContext.articleBundle.includes('Botanically'), 'Bundle must never mention Botanically on a coffee topic');
console.log('6. Multi-Niche Bundle Verification (Coffee Niche): ✅ PASS');

console.log('\nALL UNIVERSAL FACT-CHECKING TESTS PASSED! 🚀');
