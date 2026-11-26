// Build worker.js from admin-ui.html
// Internal search keys (Firecrawl/Tavily) di-inject dari .env sebagai JSON ke placeholder
// __INTERNAL_SEARCH_KEYS__ — TIDAK pernah masuk ke admin-ui.html (tetap kompatibel utk dev lokal).
const fs = require('fs');

const html = fs.readFileSync('admin-ui.html', 'utf8');

// ── Load internal search keys from .env ──────────────────────────────────────
function loadEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) out[m[1]] = m[2];
    }
  } catch {}
  return out;
}
const env = loadEnv();
const internalKeys = {
  firecrawl: [env.FIRECRAWL_INTERNAL_KEY_1, env.FIRECRAWL_INTERNAL_KEY_2]
    .map(s => (s || '').trim()).filter(Boolean),
  tavily: (env.TAVILY_INTERNAL_KEY || '').trim()
};

// ── Inject default object → key JSON ─────────────────────────────────────────
const DEFAULT_OBJ = `const INTERNAL_SEARCH_KEYS = { firecrawl: [], tavily: '' };`;
if (!html.includes(DEFAULT_OBJ)) {
  console.error('ERROR: default object marker not found in admin-ui.html');
  console.error('Expected:', DEFAULT_OBJ);
  process.exit(1);
}
// JSON aman utk template literal: escape backslash, backtick, ${ .
// String JSON sendiri sudah escape backslash & quote; tambahan utk template-literal ctx.
let inject = `const INTERNAL_SEARCH_KEYS = ${JSON.stringify(internalKeys)};`;
inject = inject.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
const htmlInjected = html.replace(DEFAULT_OBJ, inject);

console.log(`Internal keys: firecrawl=${internalKeys.firecrawl.length}, tavily=${internalKeys.tavily ? 1 : 0}`);

// ── Escape for template literal embedding ────────────────────────────────────
let escaped = htmlInjected;
escaped = escaped.replace(/\\/g, '\\\\');
escaped = escaped.replace(/`/g, '\\`');
escaped = escaped.replace(/\$/g, '\\$');

const worker = 'export default {\n' +
  '  async fetch(request, env, ctx) {\n' +
  '    const url = new URL(request.url);\n' +
  '    return new Response(`' + escaped + '`, {\n' +
  '      headers: {\n' +
  "        'content-type': 'text/html;charset=UTF-8',\n" +
  "        'cache-control': 'no-cache'\n" +
  '      }\n' +
  '    });\n' +
  '  }\n' +
  '};\n';

fs.writeFileSync('worker-deploy/worker.js', worker, 'utf8');
console.log('Worker built. Size:', fs.statSync('worker-deploy/worker.js').size);
