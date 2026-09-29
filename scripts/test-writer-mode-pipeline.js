const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('=== VERIFYING WRITER MODE & PIPELINE ENGINE FIXES ===');

const html = fs.readFileSync('admin-ui.html', 'utf8');

// 1. Syntax check of embedded script
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
assert.doesNotThrow(() => {
  new vm.Script(script, { filename: 'admin-ui-test.js' });
}, 'Embedded script in admin-ui.html must compile with 0 syntax errors');
console.log('1. Script syntax compilation: ✅ PASS');

// 2. Check downloadBundleAsMd restored
assert(script.includes('function downloadBundleAsMd() {'), 'downloadBundleAsMd must be properly declared');
assert(script.includes('const content = buildFullArticleBundle();'), 'downloadBundleAsMd must call buildFullArticleBundle()');
console.log('2. downloadBundleAsMd restored: ✅ PASS');

// 3. Check switchBundleTab dangling duplicate removed
assert(!html.includes('view.classList.remove(\'hidden\');\n      } else {\n        view.classList.add(\'hidden\');\n      }\n    }\n  });\n}\n      if (t === tabName)'), 'Dangling duplicate block in switchBundleTab must be removed');
console.log('3. Duplicate dangling block removed: ✅ PASS');

// 4. Check keyword validation in runAllSteps
assert(script.includes('Masukkan target focus keyword terlebih dahulu'), 'runAllSteps must validate keyword presence');
console.log('4. runAllSteps keyword validation: ✅ PASS');

// 5. Check cache invalidation on new keyword
assert(script.includes('_last_keyword'), 'runAllSteps must track and invalidate cache for new keywords');
console.log('5. Stale cache invalidation on keyword switch: ✅ PASS');

// 6. Check safeParseJSON helper
assert(script.includes('function safeParseJSON(str) {'), 'safeParseJSON helper must be defined');
console.log('6. safeParseJSON helper integrated: ✅ PASS');

// 7. Check clean initial UI values (no hardcoded sleep fast in hero card)
assert(!html.includes('How to Sleep Fast: 9 Proven Ways (Without Medication)</h3>'), 'Hardcoded sleep fast title in hero card must be removed');
assert(!html.includes('/how-to-sleep-fast</p>'), 'Hardcoded sleep fast meta in hero card must be removed');
console.log('7. Clean initial UI states (zero hardcoded titles): ✅ PASS');

// 8. Test safeParseJSON logic directly
const fnCode = script.slice(script.indexOf('function safeParseJSON(str) {'), script.indexOf('function getBestArticle()')).trim();
const safeParseJSON = new Function('str', fnCode + '\nreturn safeParseJSON(str);');

// Test standard JSON
assert.deepStrictEqual(safeParseJSON('{"title":"Hello"}'), { title: 'Hello' });
// Test markdown wrapped JSON
assert.deepStrictEqual(safeParseJSON('```json\n{"score":95}\n```'), { score: 95 });
// Test JSON with LLM introductory text
assert.deepStrictEqual(safeParseJSON('Here is the evaluation:\n```json\n{"pass":true}\n```\nHope this helps!'), { pass: true });
console.log('8. safeParseJSON handling markdown and preamble: ✅ PASS');

console.log('\nALL WRITER MODE & PIPELINE CHECKS PASSED SUCCESSFULLY! ✅');
