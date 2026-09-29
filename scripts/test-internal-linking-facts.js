const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST SUITE: STRICT INTERNAL LINKING & FACTUAL ACCURACY ===');

const html = fs.readFileSync('admin-ui.html', 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

// 1. Prompts must enforce PARTIAL KEYWORD and ZERO REFERRAL LANGUAGE
assert(html.includes('PARTIAL KEYWORDS ONLY') || html.includes('PARTIAL KEYWORD ANCHORS'), 'Prompts must enforce partial keyword anchors');
assert(html.includes('ZERO REFERRAL / META LANGUAGE (STRICTLY BANNED)'), 'Step 1E must ban referral language');
assert(html.includes('ZERO META / REFERRAL FRAMING (STRICTLY FORBIDDEN)'), 'Step 4A must ban referral language');
assert(html.includes('BANNED: "If your jade is sick, check this guide on'), 'Step 1E must include negative examples');
console.log('1. Prompt Rules & Anti-Pattern Examples: ✅ PASS');

// 2. Factual Accuracy Prompt Rules
assert(html.includes('2-7-7'), 'Step 1E prompt must mandate standard 2-7-7 ratio');
assert(html.includes('NEVER cite unverified or non-standard ratios like 2-4-3'), 'Step 1E prompt must ban fake 2-4-3 ratio');
assert(html.includes('only provide dilute feeding in winter if the plant is actively producing visible new leaves'), 'Winter feeding must be conditioned on visible new growth');
console.log('2. Factual Accuracy Rules (2-7-7 NPK & Winter Growth): ✅ PASS');

// 3. Test sanitizeArticleContent on the exact user-pasted article with bad referral phrasing
const testText = `
Understanding feeding needs during [jade plant propagation](https://knowngarden.com/jade-plant-propagation/) keeps stems healthy:
* **Root Establishment**: Keep the soil damp without adding nutrients. As with [propagating a philodendron](https://knowngarden.com/propagating-a-philodendron/) or other houseplants, baby roots burn easily from chemical salts.
If your jade has severe chemical damage, check this guide on [how to save a dying jade plant](https://knowngarden.com/how-to-save-a-dying-jade-plant/) to trim away dead roots.
Table: | Specialty Succulent Liquid | Low nitrogen (e.g., 2-4-3) |
`;

const scriptContext = {
  document: {
    getElementById: (id) => {
      if (id === 'wv-internal-links' || id === 'ti-links') {
        return { value: 'https://knowngarden.com/how-to-save-a-dying-jade-plant/\nhttps://knowngarden.com/jade-plant-propagation/' };
      }
      return { value: 'KnownGarden', classList: { add: () => {}, remove: () => {} }, style: { setProperty: () => {} } };
    },
    querySelector: () => ({ classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  console: console,
  URL: URL,
  Set: Set
};

vm.createContext(scriptContext);
const testCode = `
${script}

globalThis.cleaned = sanitizeArticleContent(rawText);
`;
scriptContext.rawText = testText;
vm.runInContext(testCode, scriptContext);

const cleaned = scriptContext.cleaned;

// Check 1: "check this guide on" must be completely removed
assert(!cleaned.includes('check this guide on'), 'Must strip "check this guide on"');
assert(cleaned.includes('[saving a dying jade plant](https://knowngarden.com/how-to-save-a-dying-jade-plant/) requires trimming away dead roots'), 'Must rephrase to natural declarative sentence');

// Check 2: "understanding feeding needs during" must be cleaned
assert(!cleaned.includes('Understanding feeding needs during'), 'Must clean meta-intro for jade propagation');
assert(cleaned.includes('Successful [jade plant propagation](https://knowngarden.com/jade-plant-propagation/) requires withholding nutrients'), 'Must rephrase propagation sentence');

// Check 3: "as with [propagating a philodendron] ... baby roots burn easily"
assert(!cleaned.includes('As with [propagating a philodendron]'), 'Must clean comparative filler');

// Check 4: 2-4-3 replaced with 2-7-7
assert(!cleaned.includes('2-4-3'), 'Must replace unverified 2-4-3');
assert(cleaned.includes('2-7-7'), 'Must contain verified 2-7-7');

console.log('3. Sanitizer Referral Stripping & Fact Correction: ✅ PASS');

console.log('\nALL STRICT LINKING & FACT-CHECK TESTS PASSED! 🚀');
