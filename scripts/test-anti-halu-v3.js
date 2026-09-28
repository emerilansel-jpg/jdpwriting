// Test v3 anti-hallucination: simulate 1B -> 1E -> 2H chain
const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, sys, user, temp = 0.3, maxTokens = 4500) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ model, temperature: temp, max_tokens: maxTokens,
      messages: [...(sys ? [{ role: 'system', content: sys }] : []), { role: 'user', content: user }] });
    const req = https.request({ hostname: 'api.pesatrouter.com', path: '/v1/chat/completions',
      method: 'POST', family: 4, timeout: 45000,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PESAT_API_KEY}` }
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => {
      try { resolve(JSON.parse(b).choices[0].message.content); } catch (e) { reject(e); }
    }); }); req.on('error', reject); req.write(data); req.end();
  });
}

function checkUrl(urlStr) {
  return new Promise(resolve => {
    try {
      const u = new URL(urlStr);
      const req = https.request({ hostname: u.hostname, path: u.pathname + u.search,
        method: 'HEAD', family: 4, timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }, res => resolve({ url: urlStr, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 }));
      req.on('timeout', () => { req.destroy(); resolve({ url: urlStr, status: 'TIMEOUT', ok: false }); });
      req.on('error', e => resolve({ url: urlStr, status: 'ERR_' + e.code, ok: false }));
      req.end();
    } catch { resolve({ url: urlStr, status: 'INVALID', ok: false }); }
  });
}

const KEYWORDS = [
  'how to calibrate an espresso machine',
  'what causes high bounce rate in analytics',
  'indoor plant leaf turning yellow reasons'
];

async function testKeyword(keyword) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`KEYWORD: "${keyword}"`);
  console.log('='.repeat(70));

  // Step 1B — Knowledge-based research
  console.log('\n--- Step 1B: Knowledge-Based Research ---');
  const sys1B = 'You are a Knowledge-Based Research Analyst. You synthesize what you genuinely know from your training data about a topic. You NEVER fabricate statistics, URLs, or source documents. You clearly mark your confidence level for each finding. You DO NOT pretend to search the web or access files — you report knowledge you actually have.';
  const user1B = `Provide a research briefing on '${keyword}' using ONLY knowledge you genuinely have from your training data.

STRICT ANTI-HALLUCINATION RULES:
1. ONLY report facts, statistics, and findings you are confident are real. Do NOT invent numbers.
2. For each finding, tag confidence: [HIGH] = you are very confident this is real. [MEDIUM] = you believe this is real but not 100% certain of exact number. [LOW] = general knowledge.
3. DO NOT OUTPUT ANY URLs. No links, no DOIs, no PDF paths.
4. DO NOT pretend to search the web or access files.
5. For each statistic, provide: the finding, the source name (journal/institution), approximate year, and confidence tag.

Output format — JSON with: topic, key_findings (array of {finding, source_name, year, confidence, suggested_use}), expert_consensus, content_gaps, landmark_studies (array of {study_name, authors, journal, year, key_finding, confidence}).
Aim for 10-15 findings. Quality over quantity.`;

  const res1B = await queryAI('pesat-flash', sys1B, user1B, 0.3, 2000);
  
  // Check if 1B output contains URLs (it shouldn't)
  const urlsIn1B = [...res1B.matchAll(/https?:\/\/[^\s\)\"]+/g)];
  console.log(`  URLs in 1B output: ${urlsIn1B.length} ${urlsIn1B.length === 0 ? '✅' : '❌ LEAKED URLs!'}`);
  if (urlsIn1B.length > 0) urlsIn1B.forEach(u => console.log(`    LEAKED: ${u[0]}`));

  // Check confidence tags
  const highTags = (res1B.match(/\[HIGH\]/gi) || []).length;
  const medTags = (res1B.match(/\[MEDIUM\]/gi) || []).length;
  const lowTags = (res1B.match(/\[LOW\]/gi) || []).length;
  console.log(`  Confidence tags: ${highTags} HIGH, ${medTags} MEDIUM, ${lowTags} LOW`);

  // Step 1E — Generate article (abbreviated)
  console.log('\n--- Step 1E: Article Generation (abbreviated) ---');
  const sys1E = 'You are an expert SEO/GEO writer. Generate articles with genuine factual grounding and 7th-grade readability. You NEVER fabricate statistics or URLs.';
  const user1E = `Write a 500-word article excerpt (intro + 2 sections) about "${keyword}".

Research Data:
${res1B}

RULES:
1. ONLY cite specific numbers that appear in the Research Data AND are tagged [HIGH] confidence.
2. For [MEDIUM] findings, describe the trend without exact numbers.
3. NEVER invent statistics.
4. NO URLs in article body. Cite by institution/study name only.
5. Use associative language for observational studies.`;

  const res1E = await queryAI('pesat-flash', sys1E, user1E, 0.7, 2000);

  // Check URLs in article
  const urlsIn1E = [...res1E.matchAll(/https?:\/\/[^\s\)\"]+/g)];
  console.log(`  URLs in 1E output: ${urlsIn1E.length} ${urlsIn1E.length === 0 ? '✅' : '❌ LEAKED URLs!'}`);

  // Step 2H — Citations
  console.log('\n--- Step 2H: Citation Embedding ---');
  const sys2H = `You are an expert editorial researcher who strengthens E-E-A-T with real, verifiable citations.
- VERBATIM QUOTE: Use ONLY for landmark studies whose abstract text you genuinely know.
- PARAPHRASE CITATION (default): Describe findings without quotation marks.
For URLs, use ONLY: Wikipedia canonical pages, or institutional root domains. NEVER invent deep paths, PDF links, or DOIs.`;

  const user2H = `Add 2-3 verifiable citations to this article about '${keyword}'.

Article:
${res1E}

Research Context:
${res1B}

CITATION FORMAT — TWO TYPES:
TYPE A (verbatim, rare): > "[Exact abstract text]" — [Author, Journal, Year]
TYPE B (paraphrase, default): > According to [Institution (Year)], [finding without quotes].

URL RULES:
- SAFE: Wikipedia (https://en.wikipedia.org/wiki/...), institutional roots (cdc.gov, nih.gov)
- FORBIDDEN: PDF links, DOIs from memory, deep institutional paths
- If unsure about a URL, cite institution name WITHOUT a link.

Return the FULL article with citations embedded.`;

  const res2H = await queryAI('pesat-flash', sys2H, user2H, 0.2, 3000);

  // Extract all URLs from final output
  const allUrls = [...res2H.matchAll(/https?:\/\/[^\s\)\"\']+/g)].map(m => m[0]);
  const uniqueUrls = [...new Set(allUrls)];
  console.log(`  Total URLs in 2H output: ${uniqueUrls.length}`);

  // Verify each URL
  let liveCount = 0;
  for (const url of uniqueUrls) {
    const check = await checkUrl(url);
    const status = check.ok ? '✅' : '❌';
    if (check.ok) liveCount++;
    console.log(`    ${status} ${check.status} ${url}`);
  }

  // Check for fabricated PDF/DOI links
  const pdfLinks = uniqueUrls.filter(u => u.includes('.pdf'));
  const doiLinks = uniqueUrls.filter(u => u.includes('doi.org'));
  const deepPaths = uniqueUrls.filter(u => {
    try { return new URL(u).pathname.split('/').length > 4; } catch { return false; }
  });

  console.log(`\n  SUMMARY for "${keyword}":`);
  console.log(`    URLs: ${uniqueUrls.length} total, ${liveCount} live (${uniqueUrls.length > 0 ? Math.round(liveCount/uniqueUrls.length*100) : 100}%)`);
  console.log(`    PDF links: ${pdfLinks.length} ${pdfLinks.length === 0 ? '✅' : '⚠️'}`);
  console.log(`    DOI links: ${doiLinks.length}`);
  console.log(`    Deep paths (>4 segments): ${deepPaths.length} ${deepPaths.length === 0 ? '✅' : '⚠️'}`);

  return { keyword, totalUrls: uniqueUrls.length, liveUrls: liveCount, pdfLinks: pdfLinks.length, deadUrls: uniqueUrls.length - liveCount };
}

async function run() {
  const results = [];
  for (const kw of KEYWORDS) {
    const r = await testKeyword(kw);
    results.push(r);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(70));
  const totalUrls = results.reduce((s, r) => s + r.totalUrls, 0);
  const liveUrls = results.reduce((s, r) => s + r.liveUrls, 0);
  const deadUrls = results.reduce((s, r) => s + r.deadUrls, 0);
  const pdfs = results.reduce((s, r) => s + r.pdfLinks, 0);
  console.log(`Total URLs: ${totalUrls}, Live: ${liveUrls}, Dead: ${deadUrls}`);
  console.log(`Live rate: ${totalUrls > 0 ? Math.round(liveUrls/totalUrls*100) : 100}%`);
  console.log(`PDF links (should be 0): ${pdfs}`);
  console.log(`Hallucination assessment: ${deadUrls === 0 ? '✅ ZERO HALLUCINATED URLS' : `❌ ${deadUrls} HALLUCINATED URLS`}`);
}

run().catch(console.error);
