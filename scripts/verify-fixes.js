// Runnable verification self-check for JDP Writing Pipeline logic & bug fixes
const fs = require('fs');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
console.log('--- START RUNNABLE VERIFICATION CHECK ---');

// 1. admin-ui.html syntax
const htmlPath = path.join(ROOT, 'admin-ui.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi);
assert(scriptMatch && scriptMatch.length >= 2, 'Must have at least 2 script blocks');
const mainScript = scriptMatch[1].replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
assert.doesNotThrow(() => new Function('localStorage', 'document', 'window', 'navigator', mainScript), 'mainScript must evaluate cleanly without syntax errors');
console.log('✓ 1. admin-ui.html script syntax: VALID');

// 2. No duplicate IDs
const idMatches = html.match(/id=\"([^\"]+)\"/g);
const counts = {};
idMatches.forEach(m => {
  const id = m.replace('id=\"', '').replace('\"', '');
  counts[id] = (counts[id] || 0) + 1;
});
const duplicates = Object.entries(counts).filter(([id, c]) => c > 1);
assert.strictEqual(duplicates.length, 0, 'No duplicate IDs allowed in admin-ui.html');
console.log('✓ 2. Duplicate IDs check: 0 DUPLICATES');

// 3. extractPromptText and extractAltText logic test
function createFreshMockEl() {
  return {
    value: '',
    textContent: '',
    checked: true,
    style: { setProperty: () => {} },
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }
  };
}
const elements = {};
const mockLocalStorage = { getItem: () => null, setItem: () => {} };
const mockDocument = {
  getElementById: (id) => {
    if (!elements[id]) elements[id] = createFreshMockEl();
    return elements[id];
  },
  querySelectorAll: () => [],
  querySelector: () => createFreshMockEl()
};
const mockWindow = {};
const mockNavigator = { clipboard: { writeText: async () => {} } };

const helperExtract = new Function('localStorage', 'document', 'window', 'navigator', mainScript + `;
return {
  extractPromptText,
  extractAltText,
  getBestArticle,
  stepOutputs
};
`)(mockLocalStorage, mockDocument, mockWindow, mockNavigator);

const { extractPromptText, extractAltText, getBestArticle, stepOutputs } = helperExtract;

// Test object with prompt property
assert.strictEqual(extractPromptText({ prompt: 'A cozy bedroom at night', dimensions: '1200x630' }), 'A cozy bedroom at night');
// Test flat string
assert.strictEqual(extractPromptText('Direct prompt string'), 'Direct prompt string');
// Test object with description
assert.strictEqual(extractPromptText({ description: 'Description prompt' }), 'Description prompt');
// Test empty
assert.strictEqual(extractPromptText(''), '');
assert.strictEqual(extractPromptText(null), '');

// Test alt text
assert.strictEqual(extractAltText({ alt: 'Alt description' }), 'Alt description');
assert.strictEqual(extractAltText('Plain alt text'), 'Plain alt text');

// Test getBestArticle waterfall
stepOutputs['1E'] = 'Raw draft '.repeat(50);
assert(getBestArticle().startsWith('Raw draft'), 'Should return 1E when only 1E exists');
stepOutputs['2H'] = 'Quoted draft '.repeat(50);
assert(getBestArticle().startsWith('Quoted draft'), 'Should return 2H over 1E');
stepOutputs['4B'] = 'Final linked draft '.repeat(50);
assert(getBestArticle().startsWith('Final linked draft'), 'Should return 4B as best');
console.log('✓ 3. extractPromptText & extractAltText & getBestArticle: PASSED');

// 4. Token budget in pipeline mode vs single step
assert(mainScript.includes('const tokenLimit = isPipelineMode ? (s.maxTokens || 5000) : (budgetTokens || s.maxTokens || 2000);'), 'Pipeline mode must use s.maxTokens');
console.log('✓ 4. Token limit pipeline mode decoupling: VERIFIED');

// 5. worker-deploy/worker.js in sync with admin-ui.html
const workerPath = path.join(ROOT, 'worker-deploy', 'worker.js');
const worker = fs.readFileSync(workerPath, 'utf8');
assert(worker.includes(JSON.stringify(html)), 'worker.js must contain exact JSON.stringify(admin-ui.html)');
console.log('✓ 5. worker-deploy/worker.js synchronization: IN SYNC');

// 6. current-orchestrator.json integrity
const orchPath = path.join(ROOT, 'current-orchestrator.json');
const orch = JSON.parse(fs.readFileSync(orchPath, 'utf8'));
assert.strictEqual(orch.nodes.length, 47, 'current-orchestrator.json must have 47 nodes');
const nodeNames = new Set(orch.nodes.map(n => n.name));
let broken = 0;
for (const [from, c] of Object.entries(orch.connections)) {
  if (!nodeNames.has(from)) broken++;
  c.main.forEach(g => g.forEach(t => { if (!nodeNames.has(t.node)) broken++; }));
}
assert.strictEqual(broken, 0, 'No broken connections in orchestrator');
console.log('✓ 6. current-orchestrator.json: 47 NODES, 0 BROKEN CONNS');

console.log('--- ALL VERIFICATION CHECKS PASSED ---');
