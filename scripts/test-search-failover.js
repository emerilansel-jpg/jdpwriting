// Unit test: Firecrawl multi-key failover + Tavily fallback + result normalization
// Jalankan: node scripts/test-search-failover.js
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('admin-ui.html', 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = blocks.join('\n');

// ── Minimal browser/worker stubs ─────────────────────────────────────────────
const store = {};
const elements = {};
function makeEl(id) {
  if (!elements[id]) elements[id] = {
    id, value: '', textContent: '', className: '',
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: { setProperty(){}, removeProperty(){} },
    checked: false, options: [], addEventListener(){}, appendChild(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    focus(){}, click(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }
  };
  return elements[id];
}

const sandbox = {
  console,
  Date, Math, JSON, Number, String, Array, Object, Boolean, parseInt, parseFloat,
  isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURIComponent,
  setTimeout, clearTimeout, setInterval, clearInterval,
  AbortController,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  },
  document: {
    getElementById: id => makeEl(id),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeEl('tmp_' + Math.random()),
    addEventListener(){}, body: makeEl('body')
  },
  window: { addEventListener(){}, location: { href: 'https://jdpwriter.com' } },
  navigator: { userAgent: 'test' },
  location: { href: 'https://jdpwriter.com', search: '' },
  fetch: null, // ditimpa per kasus
  performance: { now: () => Date.now() },
  structuredClone: v => JSON.parse(JSON.stringify(v)),
  requestAnimationFrame: cb => setTimeout(cb, 0),
  Image: function(){ return makeEl('img'); },
  FileReader: function(){ return { readAsDataURL(){}, onload:null }; },
  Blob: function(){ return {}; },
  URL: URL,
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

// Ekstrak hanya fungsi yang kita butuh (hindari auto-run UI init)
const wanted = [
  'function getKeys(', 'function getDeadFirecrawlKeys(', 'function markFirecrawlKeyDead(',
  'function pruneDeadFirecrawlKeys(', 'function normalizeSearchResults(',
  'async function searchTavily(', 'async function searchFirecrawl(',
  'function updateSearchKeyStatusUI(', 'function recordFirecrawlCost(',
  'function getCostTracker(', 'function getServicePricing(', 'function createEmptyCostTracker(',
  'function formatUSD(', 'const DEFAULT_SERVICE_PRICING'
];
const lines = src.split('\n');
const picked = [];
let capturing = false, depth = 0, buf = [];
for (const line of lines) {
  if (!capturing) {
    if (wanted.some(w => line.includes(w))) {
      capturing = true; depth = 0; buf = [line];
      depth += (line.split('{').length - 1) - (line.split('}').length - 1);
      if (capturing && depth <= 0 && (line.includes('{') || line.includes(';'))) {
        // one-liner / const
        if (line.trim().startsWith('const ') || line.trim().startsWith('function ') && depth <= 0 && line.includes(';')) {
          picked.push(buf.join('\n')); capturing = false; buf = [];
        } else if (line.includes('{') && depth === 0 && line.trim().endsWith('}')) {
          picked.push(buf.join('\n')); capturing = false; buf = [];
        }
      }
      continue;
    }
  } else {
    buf.push(line);
    depth += (line.split('{').length - 1) - (line.split('}').length - 1);
    if (depth <= 0) { picked.push(buf.join('\n')); capturing = false; buf = []; }
  }
}
const extracted = picked.join('\n');
if (!extracted.includes('searchFirecrawl') || !extracted.includes('searchTavily')) {
  console.error('EXTRACT FAIL: fungsi inti tidak terambil');
  process.exit(1);
}

// Stub tambahan yang dipanggil recordFirecrawlCost
const prelude = `
let stepOutputs = { '_cost_tracker': null };
function saveStepOutputs(){}
function updateArticleCostUI(){}
function showToast(){}
function getPesatXJevLimit(){ return 4000; }
function setPesatXJevLimit(){}
function setServicePricing(){}
// Internal search keys (injected di build worker.js; di test di-set langsung)
const INTERNAL_SEARCH_KEYS = { firecrawl: ['fc-INT1','fc-INT2'], tavily: 'tvly-INT' };
`;

vm.createContext(sandbox);
vm.runInContext(prelude + extracted, sandbox);

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

(async () => {
  console.log('── 1. Key parsing & dedup ──');
  store['jdp_key_firecrawl'] = 'fc-AAA';
  store['jdp_key_firecrawl_pool'] = JSON.stringify(['fc-BBB', 'fc-AAA', 'fc-CCC']);
  store['jdp_key_tavily'] = 'tvly-XYZ';
  store['jdp_firecrawl_dead'] = '{}';
  let k = vm.runInContext('getKeys()', sandbox);
  check('dedup + urutan', JSON.stringify(k.firecrawlKeys) === JSON.stringify(['fc-AAA','fc-BBB','fc-CCC','fc-INT1','fc-INT2']), JSON.stringify(k.firecrawlKeys));
  check('tavily key', k.tavily === 'tvly-XYZ');
  check('primary = key pertama', k.firecrawl === 'fc-AAA');
  // Priority: external (localStorage) > internal (build) — internal ikut masuk setelah external
  check('internal key diappend setelah external', k.firecrawlKeys.includes('fc-INT1') && k.firecrawlKeys.includes('fc-INT2'), JSON.stringify(k.firecrawlKeys));
  check('internal bukan primary saat external ada', k.firecrawl === 'fc-AAA');
  check('flag hasExternalFirecrawl true', k.hasExternalFirecrawl === true);
  check('flag hasInternalFirecrawl true', k.hasInternalFirecrawl === true);
  check('flag hasExternalTavily true', k.hasExternalTavily === true);
  check('flag hasInternalTavily true', k.hasInternalTavily === true);
  // Tavily: external menang atas internal
  check('tavily external menang', k.tavily === 'tvly-XYZ');

  console.log('── 1b. Priority: tanpa external → internal dipakai ──');
  delete store['jdp_key_firecrawl'];
  delete store['jdp_key_firecrawl_pool'];
  delete store['jdp_key_tavily'];
  k = vm.runInContext('getKeys()', sandbox);
  check('internal jadi primary saat external kosong', k.firecrawl === 'fc-INT1', k.firecrawl);
  check('pool internal lengkap', JSON.stringify(k.firecrawlKeys) === JSON.stringify(['fc-INT1','fc-INT2']), JSON.stringify(k.firecrawlKeys));
  check('tavily fallback ke internal', k.tavily === 'tvly-INT', k.tavily);
  check('hasExternalFirecrawl false', k.hasExternalFirecrawl === false);
  check('hasExternalTavily false', k.hasExternalTavily === false);

  console.log('── 1c. Edge: primary=\'\' + pool external → external di depan internal ──');
  store['jdp_key_firecrawl'] = '';
  store['jdp_key_firecrawl_pool'] = JSON.stringify(['fc-EXT1', 'fc-EXT2']);
  delete store['jdp_key_tavily'];
  k = vm.runInContext('getKeys()', sandbox);
  check('urutan: external pool dulu, baru internal', JSON.stringify(k.firecrawlKeys) === JSON.stringify(['fc-EXT1','fc-EXT2','fc-INT1','fc-INT2']), JSON.stringify(k.firecrawlKeys));
  check('primary = external pertama', k.firecrawl === 'fc-EXT1', k.firecrawl);
  check('dedup: internal tak dobel', k.firecrawlKeys.length === 4, JSON.stringify(k.firecrawlKeys));
  check('hasExternalFirecrawl true (pool ada)', k.hasExternalFirecrawl === true);

  // restore utk skenario berikut
  store['jdp_key_firecrawl'] = 'fc-AAA';
  store['jdp_key_firecrawl_pool'] = JSON.stringify(['fc-BBB', 'fc-AAA', 'fc-CCC']);
  store['jdp_key_tavily'] = 'tvly-XYZ';

  console.log('── 2. Dead-key tracking & prune ──');
  // reset "masih datang" = 1 jam dari sekarang (tanggal hardcode cepat basi & bikin prune salah baca)
  const FUTURE_RESET = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  vm.runInContext(`markFirecrawlKeyDead('fc-AAA', '${FUTURE_RESET}')`, sandbox);
  let dead = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('key ditandai dead', dead['fc-AAA'] === FUTURE_RESET);
  // prune tidak menghapus (reset masih futurik)
  vm.runInContext('pruneDeadFirecrawlKeys()', sandbox);
  dead = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('belum diprune (reset masih datang)', 'fc-AAA' in dead);
  // reset lampau -> diprune
  vm.runInContext(`markFirecrawlKeyDead('fc-OLD', '2020-01-01T00:00:00.000Z')`, sandbox);
  vm.runInContext('pruneDeadFirecrawlKeys()', sandbox);
  dead = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('key reset lampau di-prune', !('fc-OLD' in dead) && ('fc-AAA' in dead));

  console.log('── 3. normalizeSearchResults ──');
  let norm = vm.runInContext(`normalizeSearchResults([
    {url:'https://a.com', title:'A', description:'dA'},
    {url:'https://b.com', title:'B', content:'cB'},
    {title:'tanpa-url'},
    null,
    {url:'https://c.com'}
  ])`, sandbox);
  check('item tanpa url dibuang (sisa 3)', norm.length === 3, JSON.stringify(norm));
  check('description dari content fallback', norm[1].description === 'cB');
  check('title default utk tanpa title', norm[2] && norm[2].title === 'Live Source' && norm[2].url === 'https://c.com');

  console.log('── 4. Failover: key1 402 -> key2 sukses ──');
  store['jdp_firecrawl_dead'] = '{}';
  store['jdp_key_firecrawl'] = 'fc-DEAD1';
  store['jdp_key_firecrawl_pool'] = JSON.stringify(['fc-GOOD2']);
  const calls = [];
  sandbox.fetch = async (url, opts) => {
    calls.push({ url, auth: opts.headers.Authorization });
    if (opts.headers.Authorization.includes('fc-DEAD1')) {
      return { ok: false, status: 402, json: async () => ({ error: 'insufficient_credits', resets_at: FUTURE_RESET }) };
    }
    return {
      ok: true, status: 200,
      json: async () => ({ success: true, creditsUsed: 2, data: { web: [
        { url: 'https://x.com', title: 'X', description: 'dx' },
        { url: 'https://y.com', title: 'Y', description: 'dy' }
      ] } })
    };
  };
  let res = await vm.runInContext(`searchFirecrawl('jade plant', 5)`, sandbox);
  check('hasil dari key2', Array.isArray(res) && res.length === 2, JSON.stringify(res));
  const fcCalls = calls.filter(c => c.url.includes('firecrawl'));
  check('2 panggilan firecrawl (failover)', fcCalls.length === 2, 'calls=' + calls.length);
  check('key1 lalu key2', fcCalls[0] && fcCalls[0].auth.includes('fc-DEAD1') && fcCalls[1] && fcCalls[1].auth.includes('fc-GOOD2'), JSON.stringify(fcCalls.map(c=>c.auth)));
  check('key1 ditandai dead dgn resets_at', vm.runInContext(`getDeadFirecrawlKeys()['fc-DEAD1']`, sandbox) === FUTURE_RESET);
  const tracker = vm.runInContext('getCostTracker()', sandbox);
  check('cost tercatat (credits 2)', tracker.firecrawlCalls.length === 1 && tracker.firecrawlCalls[0].creditsUsed === 2);

  console.log('── 5. Semua key habis -> Tavily fallback ──');
  // Semua key (external + internal) dianggap habis
  store['jdp_firecrawl_dead'] = JSON.stringify({ 'fc-DEAD1': FUTURE_RESET, 'fc-GOOD2': FUTURE_RESET, 'fc-INT1': FUTURE_RESET, 'fc-INT2': FUTURE_RESET });
  const calls2 = [];
  sandbox.fetch = async (url, opts) => {
    calls2.push(url);
    if (url.includes('tavily')) {
      return { ok: true, status: 200, json: async () => ({ results: [
        { url: 'https://t1.com', title: 'T1', content: 'ct1' },
        { url: 'https://t2.com', title: 'T2', content: 'ct2' }
      ] }) };
    }
    return { ok: false, status: 402, json: async () => ({ resets_at: FUTURE_RESET }) };
  };
  res = await vm.runInContext(`searchFirecrawl('espresso calibration', 5)`, sandbox);
  check('tavily melayani request', Array.isArray(res) && res.length === 2 && res[0].description === 'ct1', JSON.stringify(res));
  check('tavily dipanggil', calls2.some(u => u.includes('api.tavily.com')));
  const tr2 = vm.runInContext('getCostTracker()', sandbox);
  const last = tr2.firecrawlCalls[tr2.firecrawlCalls.length - 1];
  check('tavily cost $0', last.costUsd === 0);

  console.log('── 6. Semua habis + Tavily kosong -> null ──');
  store['jdp_key_tavily'] = '';
  // internal tetap dead (warisan sc5)
  sandbox.fetch = async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) });
  res = await vm.runInContext(`searchFirecrawl('x', 5)`, sandbox);
  check('null saat semua sumber habis', res === null);

  console.log('── 7. Semua key dead tapi Tavily ada -> Tavily (tanpa panggil firecrawl) ──');
  store['jdp_key_tavily'] = 'tvly-XYZ';
  // pastikan semua key (external + internal) dead utk skenario ini
  store['jdp_firecrawl_dead'] = JSON.stringify({ 'fc-DEAD1': FUTURE_RESET, 'fc-GOOD2': FUTURE_RESET, 'fc-INT1': FUTURE_RESET, 'fc-INT2': FUTURE_RESET });
  const calls3 = [];
  sandbox.fetch = async (url, opts) => {
    calls3.push(url);
    return { ok: true, status: 200, json: async () => ({ results: [{ url:'https://t.com', title:'T', content:'c' }] }) };
  };
  res = await vm.runInContext(`searchFirecrawl('y', 5)`, sandbox);
  check('tavily serve', Array.isArray(res) && res.length === 1);
  check('firecrawl TIDAK dipanggil (key dead di-skip)', !calls3.some(u => u.includes('firecrawl')), JSON.stringify(calls3));

  console.log('── 8. Format /v1 lama (data[]) tetap didukung ──');
  store['jdp_firecrawl_dead'] = '{}';
  store['jdp_key_tavily'] = '';
  store['jdp_key_firecrawl'] = 'fc-V1';
  store['jdp_key_firecrawl_pool'] = '[]';
  sandbox.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, creditsUsed: 1, data: [ { url:'https://v1.com', title:'V1', description:'d' } ] }) });
  res = await vm.runInContext(`searchFirecrawl('z', 5)`, sandbox);
  check('v1 data[] dinormalisasi', Array.isArray(res) && res.length === 1 && res[0].url === 'https://v1.com', JSON.stringify(res));

  console.log('── 9. F-01: 429 rate-limit TIDAK menandai key dead ──');
  store['jdp_firecrawl_dead'] = '{}';
  store['jdp_key_firecrawl'] = 'fc-RL';
  store['jdp_key_firecrawl_pool'] = JSON.stringify(['fc-RL2']);
  store['jdp_key_tavily'] = '';
  const calls9 = [];
  sandbox.fetch = async (url, opts) => {
    calls9.push(opts.headers.Authorization);
    if (opts.headers.Authorization.includes('fc-RL:') || opts.headers.Authorization === 'Bearer fc-RL') {
      return { ok: false, status: 429, json: async () => ({ error: 'rate limited' }) };
    }
    return { ok: true, status: 200, json: async () => ({ success: true, creditsUsed: 1, data: { web: [{ url:'https://ok.com', title:'OK', description:'d' }] } }) };
  };
  res = await vm.runInContext(`searchFirecrawl('rl test', 5)`, sandbox);
  const deadAfter429 = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('429 tidak menandai key dead', !deadAfter429['fc-RL'], JSON.stringify(deadAfter429));
  check('429 failover ke key berikut', Array.isArray(res) && res.length === 1, JSON.stringify(res));

  console.log('── 10. F-02: 401 invalid token menandai dead + failover ──');
  store['jdp_firecrawl_dead'] = '{}';
  store['jdp_key_firecrawl'] = 'fc-BAD';
  store['jdp_key_firecrawl_pool'] = JSON.stringify(['fc-GOOD']);
  sandbox.fetch = async (url, opts) => {
    if (opts.headers.Authorization.includes('fc-BAD')) {
      return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized: Invalid token' }) };
    }
    return { ok: true, status: 200, json: async () => ({ success: true, creditsUsed: 1, data: { web: [{ url:'https://good.com', title:'G', description:'d' }] } }) };
  };
  res = await vm.runInContext(`searchFirecrawl('401 test', 5)`, sandbox);
  const deadAfter401 = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('401 menandai key dead', deadAfter401['fc-BAD'] !== undefined, JSON.stringify(deadAfter401));
  check('401 failover ke key valid', Array.isArray(res) && res.length === 1 && res[0].url === 'https://good.com', JSON.stringify(res));

  console.log('── 11. F-03: resetsAt null TIDAK langsung ter-prune ──');
  store['jdp_firecrawl_dead'] = '{}';
  vm.runInContext(`markFirecrawlKeyDead('fc-NORESET', null)`, sandbox);
  let dead11 = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('key ditandai dead dgn null resetsAt', dead11['fc-NORESET'] === null, JSON.stringify(dead11));
  vm.runInContext('pruneDeadFirecrawlKeys()', sandbox);
  dead11 = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('setelah prune key MASIH dead (TTL 1 jam)', 'fc-NORESET' in dead11, JSON.stringify(dead11));

  console.log('── 12. F-04: entri lampau (reset lewat) tetap ter-prune ──');
  store['jdp_firecrawl_dead'] = JSON.stringify({ 'fc-PAST': '2020-01-01T00:00:00.000Z', 'fc-NORESET': null, 'fc-NORESET__at': new Date().toISOString() });
  vm.runInContext('pruneDeadFirecrawlKeys()', sandbox);
  const dead12 = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  check('reset lampau di-prune', !('fc-PAST' in dead12), JSON.stringify(dead12));
  check('null-reset baru tetap ada', 'fc-NORESET' in dead12, JSON.stringify(dead12));

  console.log('── 13. Retry-on-429: semua key 429 -> retry 1x sebelum Tavily ──');
  store['jdp_firecrawl_dead'] = '{}';
  store['jdp_key_firecrawl'] = 'fc-429A';
  store['jdp_key_firecrawl_pool'] = JSON.stringify(['fc-429B']);
  store['jdp_key_tavily'] = 'tvly-RETRY';
  // Stub setTimeout cepat: retry waitMs di-bypass utk kecepatan test
  const realSetTimeout = sandbox.setTimeout;
  sandbox.setTimeout = (fn) => { fn(); return 0; };
  const calls13 = [];
  let fc429Count = 0;
  sandbox.fetch = async (url, opts) => {
    calls13.push({ url, auth: opts.headers.Authorization });
    if (url.includes('tavily')) {
      return { ok: true, status: 200, json: async () => ({ results: [{ url:'https://rt.com', title:'RT', content:'cr' }] }) };
    }
    // Round 1 (2 call 429: fc-429A, fc-429B) -> semua 429.
    // Setelah 2x 429 (loop pertama selesai), flip ke round 2 (retry): fc-429A sukses.
    if (fc429Count < 2) {
      fc429Count++;
      return { ok: false, status: 429, json: async () => ({ error: 'Rate limit', retry_after_seconds: 1 }) };
    }
    if (opts.headers.Authorization.includes('fc-429A')) {
      return { ok: true, status: 200, json: async () => ({ success: true, creditsUsed: 1, data: { web: [{ url:'https://after-retry.com', title:'AR', description:'d' }] } }) };
    }
    return { ok: false, status: 429, json: async () => ({ error: 'Rate limit', retry_after_seconds: 1 }) };
  };
  res = await vm.runInContext(`searchFirecrawl('429 retry test', 5)`, sandbox);
  sandbox.setTimeout = realSetTimeout;
  const dead13 = vm.runInContext('getDeadFirecrawlKeys()', sandbox);
  const fcCalls13 = calls13.filter(c => c.url.includes('firecrawl'));
  const tavCalls13 = calls13.filter(c => c.url.includes('tavily'));
  check('429 tidak menandai dead key', !dead13['fc-429A'] && !dead13['fc-429B'], JSON.stringify(dead13));
  check('retry terjadi (>=2 round firecrawl)', fcCalls13.length >= 3, 'fcCalls=' + fcCalls13.length);
  check('hasil dari retry (bukan Tavily)', Array.isArray(res) && res.length === 1 && res[0].url === 'https://after-retry.com', JSON.stringify(res));
  check('Tavily TIDAK dipanggil saat retry sukses', tavCalls13.length === 0, JSON.stringify(tavCalls13.map(c=>c.url)));

  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
