// Full 10-keyword anti-hallucination test v3
const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, sys, user, temp = 0.3, maxTokens = 2000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ model, temperature: temp, max_tokens: maxTokens,
      messages: [...(sys ? [{ role: 'system', content: sys }] : []), { role: 'user', content: user }] });
    const req = https.request({ hostname: 'api.pesatrouter.com', path: '/v1/chat/completions',
      method: 'POST', family: 4, timeout: 60000,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PESAT_API_KEY}` }
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => {
      try { resolve(JSON.parse(b).choices[0].message.content); } catch (e) { reject(new Error(b.substring(0, 200))); }
    }); });
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function checkUrl(urlStr) {
  return new Promise(resolve => {
    try {
      const u = new URL(urlStr);
      const mod = u.protocol === 'https:' ? https : require('http');
      const req = mod.request({ hostname: u.hostname, path: u.pathname + u.search,
        method: 'HEAD', family: 4, timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, res => resolve({ url: urlStr, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 }));
      req.on('timeout', () => { req.destroy(); resolve({ url: urlStr, status: 'TIMEOUT', ok: false }); });
      req.on('error', e => resolve({ url: urlStr, status: 'ERR_' + e.code, ok: false }));
      req.end();
    } catch { resolve({ url: urlStr, status: 'INVALID', ok: false }); }
  });
}

const SYS_1B = 'You are a Knowledge-Based Research Analyst. You synthesize what you genuinely know from your training data about a topic. You NEVER fabricate statistics, URLs, or source documents. You clearly mark your confidence level for each finding. You DO NOT pretend to search the web or access files — you report knowledge you actually have.';

function user1B(kw) {
  return `Provide a research briefing on '${kw}' using ONLY knowledge you genuinely have.

RULES:
1. ONLY report facts you are confident are real. Do NOT invent numbers.
2. Tag each finding: [HIGH] = very confident. [MEDIUM] = believe real but unsure of exact number. [LOW] = general knowledge.
3. DO NOT OUTPUT ANY URLs. No links, no DOIs, no PDF paths.
4. DO NOT pretend to search the web.

Output JSON with: topic, key_findings (array of {finding, source_name, year, confidence}), expert_consensus, landmark_studies (array of {study_name, journal, year, key_finding, confidence}).
Aim for 8-12 findings. Quality over quantity.`;
}

const SYS_2H = `You are an expert editorial researcher who strengthens E-E-A-T with real, verifiable citations.
- VERBATIM QUOTE: Use ONLY for landmark studies whose abstract text you genuinely know (major WHO/CDC/NIH statements, seminal >1000-citation papers).
- PARAPHRASE CITATION (default): Describe findings without quotation marks.
For URLs: ONLY Wikipedia canonical pages or institutional root domains. NEVER invent deep paths, PDF links, or DOIs.`;

function user2H(kw, article, research) {
  return `Add 2-3 verifiable citations to this article about '${kw}'.

Article:
${article}

Research Context:
${research}

CITATION FORMAT:
TYPE A (verbatim, rare): > "[Exact abstract text]" — [Author, Journal, Year]
TYPE B (paraphrase, default): > According to [Institution (Year)], [finding without quotes].

URL RULES:
- SAFE: Wikipedia (https://en.wikipedia.org/wiki/...), institutional roots (cdc.gov, who.int, nih.gov, heart.org, aap.org)
- FORBIDDEN: PDF links, DOIs from memory, deep institutional paths, commercial newsroom
- If unsure about a URL, cite institution name WITHOUT a link.

Return the FULL article with citations.`;
}

const KEYWORDS = [
  'how to calibrate an espresso machine',
  'what causes high bounce rate in analytics',
  'indoor plant leaf turning yellow reasons',
  'difference between microservices and monolith architecture',
  'strength training recovery time guidelines',
  'best noise cancelling headphones for office',
  'notion vs monday project management review',
  'top cloud hosting providers for small business',
  'ergonomic desk chair under 300',
  'semrush alternatives comparison'
];

async function testKeyword(kw) {
  try {
    // Step 1B
    const res1B = await queryAI('pesat-flash', SYS_1B, user1B(kw), 0.3, 2000);
    const urlsIn1B = [...res1B.matchAll(/https?:\/\/[^\s\)\"]+/g)];

    // Step 1E (abbreviated)
    const res1E = await queryAI('pesat-flash',
      'You are an expert SEO/GEO writer. NEVER fabricate statistics or URLs.',
      `Write a 400-word article excerpt about "${kw}". Research Data: ${res1B.substring(0, 1500)}
RULES: Only cite numbers from Research Data tagged [HIGH]. No URLs in body. Cite by institution name only.`,
      0.7, 1500);
    const urlsIn1E = [...res1E.matchAll(/https?:\/\/[^\s\)\"]+/g)];

    // Step 2H
    const res2H = await queryAI('pesat-flash', SYS_2H, user2H(kw, res1E, res1B.substring(0, 1000)), 0.2, 2500);

    // Extract and verify URLs
    const allUrls = [...new Set([...res2H.matchAll(/https?:\/\/[^\s\)\"\']+/g)].map(m => m[0]))];
    let live = 0, dead = 0, pdfs = 0;
    const deadList = [];
    for (const url of allUrls) {
      if (url.includes('.pdf')) pdfs++;
      const check = await checkUrl(url);
      if (check.ok) live++;
      else { dead++; deadList.push(`${url} (${check.status})`); }
    }

    return { kw, urlsIn1B: urlsIn1B.length, urlsIn1E: urlsIn1E.length,
      totalUrls: allUrls.length, live, dead, pdfs, deadList,
      pass: dead === 0 && pdfs === 0 && urlsIn1B.length === 0 };
  } catch (err) {
    return { kw, error: err.message, pass: false };
  }
}

async function run() {
  console.log('🔬 FULL 10-KEYWORD ANTI-HALLUCINATION TEST v3\n');
  const results = [];

  for (let i = 0; i < KEYWORDS.length; i++) {
    const kw = KEYWORDS[i];
    process.stdout.write(`[${i+1}/10] "${kw}" ... `);
    const r = await testKeyword(kw);
    results.push(r);

    if (r.error) {
      console.log(`❌ ERROR: ${r.error}`);
    } else {
      const status = r.pass ? '✅ PASS' : (r.dead > 0 ? '⚠️ DEAD URLs' : '⚠️ ISSUES');
      console.log(`${status} | 1B URLs:${r.urlsIn1B} 1E URLs:${r.urlsIn1E} | Final: ${r.live}/${r.totalUrls} live, ${r.pdfs} PDFs`);
      if (r.deadList.length > 0) r.deadList.forEach(d => console.log(`    ❌ ${d}`));
    }
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const totalUrls = results.reduce((s, r) => s + (r.totalUrls || 0), 0);
  const liveUrls = results.reduce((s, r) => s + (r.live || 0), 0);
  const deadUrls = results.reduce((s, r) => s + (r.dead || 0), 0);
  const leakedIn1B = results.reduce((s, r) => s + (r.urlsIn1B || 0), 0);
  const leakedIn1E = results.reduce((s, r) => s + (r.urlsIn1E || 0), 0);
  const pdfs = results.reduce((s, r) => s + (r.pdfs || 0), 0);

  console.log(`\n${'='.repeat(70)}`);
  console.log('FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`Pass rate: ${passed}/10 (${passed * 10}%)`);
  console.log(`URLs leaked in 1B (research): ${leakedIn1B} ${leakedIn1B === 0 ? '✅' : '❌'}`);
  console.log(`URLs leaked in 1E (article): ${leakedIn1E} ${leakedIn1E === 0 ? '✅' : '❌'}`);
  console.log(`Total final URLs: ${totalUrls}, Live: ${liveUrls}, Dead: ${deadUrls}`);
  console.log(`Live rate: ${totalUrls > 0 ? Math.round(liveUrls/totalUrls*100) : 100}%`);
  console.log(`Fabricated PDFs: ${pdfs} ${pdfs === 0 ? '✅' : '❌'}`);
  console.log(`\nVerdict: ${deadUrls === 0 && pdfs === 0 && leakedIn1B === 0 ? '✅ ZERO HALLUCINATIONS' : `❌ ${deadUrls} dead URLs, ${pdfs} PDFs, ${leakedIn1B} leaked`}`);

  // Save results
  require('fs').writeFileSync('scripts/anti-halu-v3-results.json', JSON.stringify({ timestamp: new Date().toISOString(), results, summary: { passed, totalUrls, liveUrls, deadUrls, leakedIn1B, leakedIn1E, pdfs } }, null, 2));
  console.log('\nResults saved to scripts/anti-halu-v3-results.json');
}

run().catch(console.error);
