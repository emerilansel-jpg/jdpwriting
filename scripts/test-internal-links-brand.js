const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: INTERNAL LINKS INJECTION & BRAND INFERENCE ===');

const html = fs.readFileSync('admin-ui.html', 'utf8');

// 1. Script compilation
const vm = require('vm');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
assert.doesNotThrow(() => {
  new vm.Script(script, { filename: 'admin-ui-test.js' });
}, 'Embedded script in admin-ui.html must compile with 0 syntax errors');
console.log('1. Script Syntax Compilation: ✅ PASS');

// 2. Check DOM Elements exist
assert(html.includes('id="wv-brand"'), 'wv-brand element must exist in Writer Mode');
assert(html.includes('id="ti-brand"'), 'ti-brand element must exist in Dev Mode');
assert(html.includes('onInternalLinksInput()'), 'onInternalLinksInput handler must be hooked');
console.log('2. DOM Elements & Handlers: ✅ PASS');

// 3. Test Brand Inference Logic
const scriptContext = {
  document: {
    querySelector: () => ({ classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => [],
    addEventListener: () => {},
    getElementById: (id) => {
      if (id === 'wv-internal-links' || id === 'ti-links') {
        return { value: 'https://knowngarden.com/how-to-save-a-dying-jade-plant/\nhttps://knowngarden.com/jade-plant-propagation/' };
      }
      if (id === 'wv-brand' || id === 'ti-brand') {
        return { value: '' };
      }
      return {
        value: '',
        textContent: '',
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        style: { setProperty: () => {} },
        addEventListener: () => {}
      };
    }
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  window: {},
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  console: console,
  URL: URL,
  Set: Set,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};

vm.createContext(scriptContext);
const testCode = `
${script}

globalThis.brandFromLinks = inferBrandName('https://knowngarden.com/how-to-save-a-dying-jade-plant/');
globalThis.domainFromLinks = inferBrandDomain('https://knowngarden.com/how-to-save-a-dying-jade-plant/');
globalThis.activeBrand = getActiveBrand();
`;

vm.runInContext(testCode, scriptContext);

assert.strictEqual(scriptContext.brandFromLinks, 'KnownGarden');
assert.strictEqual(scriptContext.domainFromLinks, 'knowngarden.com');
assert.strictEqual(scriptContext.activeBrand, 'KnownGarden');
console.log('3. Brand Inference (knowngarden.com -> KnownGarden): ✅ PASS');

// 4. Test injectMissingInternalLinks on User Attached Article
const attachedArticle = fs.readFileSync('C:/Users/Kusuma/.zcode/tmp/paste-attachments/2026-09-29/pasted-text-20260929-130135-530077d6.txt', 'utf8');
const userLinks = `https://knowngarden.com/how-to-save-a-dying-jade-plant/
https://knowngarden.com/jade-plant-propagation/
https://knowngarden.com/propagating-a-philodendron/`;

const injectionTestCode = `
globalThis.processed = injectMissingInternalLinks(rawArticle, rawLinks, "KnownGarden");
`;
scriptContext.rawArticle = attachedArticle;
scriptContext.rawLinks = userLinks;
vm.runInContext(injectionTestCode, scriptContext);

const processedArticle = scriptContext.processed;
assert(processedArticle.includes('[saving a dying jade plant](https://knowngarden.com/how-to-save-a-dying-jade-plant/)'), 'Must inject link for saving a dying jade plant');
assert(processedArticle.includes('[succulent propagation methods](https://knowngarden.com/jade-plant-propagation/)'), 'Must inject link for succulent propagation methods');
assert(processedArticle.includes('[propagating tropical foliage](https://knowngarden.com/propagating-a-philodendron/)'), 'Must inject link for propagating tropical foliage');
console.log('4. injectMissingInternalLinks on attached article: ✅ PASS');

// 5. Test sanitizeArticleContent preserves internal links and caps external links <= 5
const sanitizeTestCode = `
globalThis.sanitized = sanitizeArticleContent(processed);
`;
vm.runInContext(sanitizeTestCode, scriptContext);
const sanitizedArticle = scriptContext.sanitized;

assert(sanitizedArticle.includes('https://knowngarden.com/how-to-save-a-dying-jade-plant/'), 'Sanitizer must preserve internal link 1');
assert(sanitizedArticle.includes('https://knowngarden.com/jade-plant-propagation/'), 'Sanitizer must preserve internal link 2');
assert(sanitizedArticle.includes('https://knowngarden.com/propagating-a-philodendron/'), 'Sanitizer must preserve internal link 3');

// Count external links
const extMatches = [...sanitizedArticle.matchAll(/\[([^\]]+)\]\((https?:\/\/(?!knowngarden\.com)[^\)]+)\)/g)];
console.log('Sanitized external links count:', extMatches.length);
assert(extMatches.length <= 5, 'External links must be capped at <= 5');
console.log('5. sanitizeArticleContent External & Internal links separation: ✅ PASS');

// 6. Test Step 1E, 4A, 4B, 2F prompts have brand and preservation rules
assert(html.includes('Publishing Brand: {{brand_name}} (Domain: {{brand_domain}})'), 'Prompts must include dynamic brand');
assert(html.includes('PRESERVE ALL INTERNAL LINKS (MANDATORY)'), 'Step 4B prompt must strictly mandate preserving internal links');
console.log('6. Prompts dynamic brand & 4B internal links preservation rule: ✅ PASS');

// 7. Check deliverable byline uses dynamic brand
assert(html.includes('`*By ${activeBrandName} Editorial Team'), 'Deliverable byline must dynamically use active brand name');
console.log('7. Deliverable byline dynamic brand: ✅ PASS');

console.log('\nALL 7 TESTS PASSED SUCCESSFULLY! 🚀');
