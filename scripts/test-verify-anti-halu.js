const https = require('https');

const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, systemPrompt, userPrompt, temperature = 0.2, maxTokens = 4500) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model, temperature, max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ]
    });
    const req = https.request({
      hostname: 'api.pesatrouter.com', path: '/v1/chat/completions',
      method: 'POST', family: 4,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PESAT_API_KEY}` }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          resolve(json.choices?.[0]?.message?.content || '');
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function checkUrl(urlStr) {
  return new Promise(resolve => {
    try {
      const u = new URL(urlStr);
      const req = https.request({
        hostname: u.hostname, path: u.pathname + u.search,
        method: 'HEAD', family: 4, timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, res => resolve({ url: urlStr, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 }));
      req.on('timeout', () => { req.destroy(); resolve({ url: urlStr, status: 'TIMEOUT', ok: false }); });
      req.on('error', e => resolve({ url: urlStr, status: 'ERR_' + e.code, ok: false }));
      req.end();
    } catch { resolve({ url: urlStr, status: 'INVALID', ok: false }); }
  });
}

// The NEW improved prompts (matching admin-ui.html)
const SYSTEM_2H = 'You are an expert editorial researcher and citation specialist. You add genuine, verifiable excerpts and authoritative quotes to strengthen E-E-A-T. You NEVER fabricate quotes or invent URLs. You NEVER insert off-topic links.';

function build2HPrompt(keyword, article) {
  return `Add 2-3 genuine, verifiable quotes or authoritative institutional citations to this article about '${keyword}'.

Article:
${article}

STRICT ANTI-HALLUCINATION & CITATION RULES:
1. TOPICAL RELEVANCE MANDATE: Every quote and external link MUST directly relate to '${keyword}' and its specific subject domain. Never insert medical links into gardening articles, or unrelated technology links into health articles. Match the domain expertise to the article topic.
2. VERIFIABLE GROUNDING: Every quote must be a real, documented statement from an actual recognized authority in this field. If you cannot recall the exact verbatim wording with 100% certainty, use an official consensus definition or published guideline from a governing body instead.
3. NO FABRICATION: If an exact verbatim quote from a named person is not 100% historically documented in public literature, DO NOT invent it. Use an official institutional definition, standard, or guideline statement instead.
4. PERMANENT CANONICAL OPEN URLS — STRICT FORMAT:
   - Wikipedia disambiguation pages: MUST percent-encode parentheses. Write https://en.wikipedia.org/wiki/Jira_%28software%29 NOT Jira_(software). This prevents Markdown link syntax from breaking.
   - Official docs: https://developers.google.com/..., https://support.atlassian.com/...
   - Academic: https://doi.org/..., https://arxiv.org/abs/..., https://pubmed.ncbi.nlm.nih.gov/...
   - Gov/Edu: .gov, .edu root or well-known paths only. Do NOT invent deep file paths.
   - STRICTLY FORBIDDEN: NEVER invent commercial newsroom/PR slugs (gartner.com/newsroom/..., forbes.com/sites/..., bloomberg.com/...).
5. BRAND INTEGRITY: Always format company brand as 'JetDigitalPro' (one word, PascalCase).
6. Format quotes strictly as Markdown blockquotes:
   > "Verbatim documented statement or official consensus definition." — [Author / Organization, Source Name, Year](Verified Canonical URL)
7. Integrate naturally after relevant claims throughout the article.
8. Return the FULL revised article in Markdown. Standard text, blockquotes, tables, and lists only.`;
}

const SYSTEM_4B = 'You are an expert Fact-Checker and SEO Citation Strategist. Add 2-3 high-quality external links to verified, live, topically relevant sources. You NEVER hallucinate fake URLs or insert off-topic links.';

function build4BPrompt(keyword, article) {
  return `Add 2-3 high-quality external links to authoritative open-web sources supporting key factual claims in this article about '${keyword}'.

Article:
${article}

STRICT TOPICAL RELEVANCE & URL INTEGRITY RULES:
1. STRICT TOPICAL RELEVANCE: Every external link MUST be directly related to '${keyword}' and its subject domain. NEVER use unrelated links.
2. PERMANENT CANONICAL OPEN URLS:
   - Canonical Wikipedia topic pages: https://en.wikipedia.org/wiki/<Entity_Name>. For disambiguation pages, percent-encode parentheses: write %28 and %29 instead of ( and ).
   - Official docs, Gov/Edu roots only. NEVER fabricate deep paths.
   - NEVER fabricate commercial newsroom URLs (forbes.com, gartner.com, bloomberg.com).
3. BRAND INTEGRITY: Ensure company brand is strictly 'JetDigitalPro'.
4. Integrate via contextual anchor text. Link the descriptive phrase only.
5. Do NOT rewrite the narrative. Insert where natural.
6. Return ONLY the full revised article in Markdown starting directly with the H1 title.`;
}

const TEST_CASES = [
  {
    keyword: 'how to fertilize jade plant',
    article: '# How to Fertilize Jade Plant\n\nJade plants (Crassula ovata) are resilient succulents needing balanced, low-nitrogen nutrition during spring and summer.\n\n## Understanding Succulent Nutrient Requirements\nSucculents store water in fleshy leaves and have specialized nutrient uptake. Over-fertilization causes root burn and leggy growth.\n\n## Optimal N-P-K Ratios\nA balanced 10-10-10 or 5-10-5 water-soluble blend diluted to quarter-strength provides steady macro-nutrients.'
  },
  {
    keyword: 'best trello alternatives',
    article: '# Best Trello Alternatives for Agile Teams\n\nTrello pioneered simple Kanban boards, but growing teams need sprint planning, dependency tracking, and automation.\n\n## Why Teams Outgrow Kanban Boards\nSimple columns lack native Gantt timelines, time tracking, and multi-board reporting for complex roadmaps.\n\n## Top Agile Project Management Platforms\nClickUp, Asana, Monday.com, and Jira offer automation, custom hierarchies, and analytics.'
  },
  {
    keyword: 'how to sleep fast',
    article: '# How to Sleep Fast: Evidence-Based Techniques\n\nFalling asleep quickly depends on homeostatic sleep pressure and autonomic nervous system tone.\n\n## The Military Relaxation Routine\nDeveloped for naval pilots to fall asleep in under two minutes through sequential facial, shoulder, and breath relaxation.\n\n## 4-7-8 Respiratory Regulation\nProlonged exhalation stimulates the vagus nerve, triggering parasympathetic activation and lowering heart rate.'
  }
];

async function run() {
  let totalQuotes = 0, totalLinks = 0, liveQuoteUrls = 0, liveExtUrls = 0;
  let topicMismatches = 0;

  for (const tc of TEST_CASES) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TOPIC: "${tc.keyword}"`);
    console.log('='.repeat(70));

    // Step 2H
    const result2H = await queryAI('pesat-flash', SYSTEM_2H, build2HPrompt(tc.keyword, tc.article), 0.2);
    const quotes = [...result2H.matchAll(/>\s*"([^"]+)"\s*—\s*\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g)];
    console.log(`\n  Step 2H: ${quotes.length} quotes`);
    for (const [, text, attr, url] of quotes) {
      totalQuotes++;
      const check = await checkUrl(url);
      const isTopical = isRelevantToTopic(tc.keyword, url, attr);
      if (check.ok) liveQuoteUrls++;
      if (!isTopical) topicMismatches++;
      console.log(`    ${check.ok ? '✅' : '❌'} ${isTopical ? '🎯' : '⚠️OFF-TOPIC'} "${text.slice(0, 60)}..." -> ${url} (${check.status})`);
    }

    // Step 4B
    const result4B = await queryAI('pesat-flash', SYSTEM_4B, build4BPrompt(tc.keyword, result2H), 0.2);
    const extLinks = [...result4B.matchAll(/\[([^\]]+)\]\((https?:\/\/(?!jetdigitalpro)[^\s\)]+)\)/g)];
    console.log(`\n  Step 4B: ${extLinks.length} external links`);
    for (const [, anchor, url] of extLinks) {
      totalLinks++;
      const check = await checkUrl(url);
      const isTopical = isRelevantToTopic(tc.keyword, url, anchor);
      if (check.ok) liveExtUrls++;
      if (!isTopical) topicMismatches++;
      console.log(`    ${check.ok ? '✅' : '❌'} ${isTopical ? '🎯' : '⚠️OFF-TOPIC'} [${anchor.slice(0, 40)}] -> ${url} (${check.status})`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Quotes: ${totalQuotes} total, ${liveQuoteUrls}/${totalQuotes} live URLs (${Math.round(liveQuoteUrls/totalQuotes*100)}%)`);
  console.log(`External Links: ${totalLinks} total, ${liveExtUrls}/${totalLinks} live URLs (${Math.round(liveExtUrls/totalLinks*100)}%)`);
  console.log(`Topic Mismatches: ${topicMismatches}`);
  console.log(`Overall URL Live Rate: ${liveQuoteUrls + liveExtUrls}/${totalQuotes + totalLinks} (${Math.round((liveQuoteUrls + liveExtUrls)/(totalQuotes + totalLinks)*100)}%)`);
}

function isRelevantToTopic(keyword, url, anchorOrAttr) {
  const kw = keyword.toLowerCase();
  const u = url.toLowerCase();
  const a = (anchorOrAttr || '').toLowerCase();

  // Gardening topics
  if (kw.includes('plant') || kw.includes('fertiliz') || kw.includes('garden') || kw.includes('jade')) {
    if (u.includes('sleep') || u.includes('medical') || u.includes('disease') || u.includes('ncbi') || u.includes('nih.gov') || u.includes('cdc.gov')) return false;
  }
  // Sleep topics
  if (kw.includes('sleep')) {
    if (u.includes('plant') || u.includes('garden') || u.includes('trello') || u.includes('software') || u.includes('kanban')) return false;
  }
  // Software topics
  if (kw.includes('trello') || kw.includes('alternative') || kw.includes('software') || kw.includes('agile')) {
    if (u.includes('sleep') || u.includes('plant') || u.includes('garden') || u.includes('medical')) return false;
  }
  return true;
}

run().catch(console.error);
