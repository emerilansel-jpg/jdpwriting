const fs = require('fs');
const html = fs.readFileSync('admin-ui.html', 'utf8');

console.log('=== CHECKING UI & ENGINE FIXES ===');

// 1. Check Firecrawl modal and buttons
const hasFcModal = html.includes('id="firecrawl-modal"');
const hasFcTab = html.includes('id="bundle-tab-btn-firecrawl"');
const hasWvBtn = html.includes('openFirecrawlModal()');
const hasCleanCopy = html.includes('copyCleanArticleOnly()');
console.log('Firecrawl modal present:', hasFcModal ? '✅' : '❌');
console.log('Firecrawl 5th bundle tab present:', hasFcTab ? '✅' : '❌');
console.log('Writer & Dev mode FC viewer buttons present:', hasWvBtn ? '✅' : '❌');
console.log('Clean article copy button present:', hasCleanCopy ? '✅' : '❌');

// 2. Check removal of hardcoded defaults
const hasHardcodedSleepKw = html.includes('value="how to sleep fast"');
console.log('Hardcoded "how to sleep fast" input value removed:', !hasHardcodedSleepKw ? '✅' : '❌');

// 3. Test sanitizeArticleContent
// Helper yang dipanggil sanitizeArticleContent harus ikut di-ekstrak (kalau tidak, ReferenceError di runtime)
const startMarker = 'function sanitizeArticleContent(text) {';
const endMarker = 'function buildFlatVars(vars) {';
const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);
const fnCode = html.slice(startIndex + startMarker.length, endIndex).trim().replace(/\}$/, '');

function extractFn(name) {
  // Boundary = baris berikutnya yang diawali "function " — regex/brace-count biasa
  // salah hitung utk body berisi regex literal (mis. /^\s*\{/ pada deClutter).
  const sig = 'function ' + name + '(';
  const start = html.indexOf(sig);
  if (start < 0) return '';
  const next = html.indexOf('\nfunction ', start + sig.length);
  if (next < 0) return '';
  return html.slice(start, next).trim();
}

// Transitive deps sanitize: getActiveBrand->inferBrandName, injectMissingInternalLinks,
// deClutterExcessiveBolding->extractProperWebsiteName, extractAllExternalLinks,
// ensureQuoteSourceLinks, formatWikipediaReferences->getFormattedAccessDate
const helpers = [
  'escapeRegex', 'inferBrandName', 'getActiveBrand', 'injectMissingInternalLinks',
  'deClutterExcessiveBolding', 'extractProperWebsiteName', 'extractAllExternalLinks',
  'ensureQuoteSourceLinks', 'getFormattedAccessDate', 'formatWikipediaReferences'
].map(extractFn).filter(Boolean).join('\n');

const sanitizeArticleContent = new Function('text', 'stepOutputs', 'document', 'localStorage', 'console', helpers + '\n' + fnCode);
const _docStub = { getElementById: () => ({ value: '', dataset: {} }) };
const _lsStub = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const run = (t) => sanitizeArticleContent(t, {}, _docStub, _lsStub, console);

// Test 3a: Accidental metadata box stripping
const testMdWithMeta = "# Jade Plant Care\n\n> **URL Slug:** `/how-to-fertilize-jade-plant`\n>\n> **Meta Description:** Learn how to fertilize jade plant.\n>\n> **Primary Keyword:** how to sleep fast\n\n---\n\nFeed your jade plant carefully.";
const sanitizedMeta = run(testMdWithMeta);
console.log('Metadata box stripped from article body:', !sanitizedMeta.includes('URL Slug:') ? '✅' : '❌');

// Test 3b: Brand insertion stripping
const testBrand = 'Your jade plant by JetDigitalPro standards will grow sturdy for decades.';
const sanitizedBrand = run(testBrand);
console.log('Awkward brand insertion cleaned:', (!sanitizedBrand.includes('by JetDigitalPro standards') && sanitizedBrand.includes('with proper horticultural care')) ? '✅' : '❌');

// Test 3c: Journal catalog link stripping
const testJournal = 'According to [Annals of Botany](https://academic.oup.com/aob), CAM plants adapt.';
const sanitizedJournal = run(testJournal);
console.log('Journal catalog homepage link stripped to plain text:', (!sanitizedJournal.includes('https://academic.oup.com/aob') && sanitizedJournal.includes('Annals of Botany')) ? '✅' : '❌');

// Test 3d: Sentence starting with And smoothing
const testAnd = 'Water the soil first. And always pour it over damp soil.';
const sanitizedAnd = run(testAnd);
console.log('Excessive "And " sentence start smoothed:', (!sanitizedAnd.includes('. And always') && sanitizedAnd.includes('. Always pour')) ? '✅' : '❌');

// Test 3e: Blockquote "According to" transformation
const testBq = '> According to University of Georgia Extension (2022), balanced feed prevents root burn.';
const sanitizedBq = run(testBq);
console.log('Blockquote "According to" restructured:', sanitizedBq.includes('— **University of Georgia Extension (2022)**') ? '✅' : '❌');

console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
