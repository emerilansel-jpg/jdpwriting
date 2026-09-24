const https = require('https');
const http = require('http');

const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, systemPrompt, userPrompt, temperature = 0.2, maxTokens = 3500) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ]
    });

    const req = https.request({
      hostname: 'api.pesatrouter.com',
      path: '/v1/chat/completions',
      method: 'POST',
      family: 4,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PESAT_API_KEY}`
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error(json.error?.message || 'Empty AI response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function checkUrlStatus(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const mod = parsed.protocol === 'https:' ? https : http;
      const req = mod.request({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
        family: 4,
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, res => {
        resolve({
          url: urlStr,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400
        });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ url: urlStr, status: 'TIMEOUT', ok: false });
      });
      req.on('error', (e) => {
        resolve({ url: urlStr, status: 'ERR_' + e.code, ok: false });
      });
      req.end();
    } catch (e) {
      resolve({ url: urlStr, status: 'INVALID_URL', ok: false });
    }
  });
}

// Smart URL Normalizer & Anti-Hallucination Fallback
function normalizeToCanonicalUrl(url, anchorText, keyword) {
  try {
    const u = new URL(url);
    // If commercial bot-blocked/paywalled domain
    if (/gartner\.com|forbes\.com|bloomberg\.com|wsj\.com|nytimes\.com|businessinsider\.com/i.test(u.hostname)) {
      const entity = (anchorText || keyword || 'Technology')
        .replace(/^(?:According to|Source:|Dr\.|Mr\.|Ms\.)\s+/i, '')
        .split(/[,—\-\(\)]/)[0].trim();
      const slug = entity.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
    }
    // If Wikipedia URL, ensure proper formatting
    if (u.hostname.includes('wikipedia.org')) {
      return url;
    }
    // If academic / DOI / arXiv
    if (u.hostname.includes('doi.org') || u.hostname.includes('arxiv.org')) {
      return url;
    }
    return url;
  } catch {
    const slug = (keyword || 'Article').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
  }
}

async function testSmartPrompting() {
  const testCases = [
    {
      keyword: 'how to fertilize jade plant',
      draft: `# How to Fertilize Jade Plant: Complete Feeding Guide\n\nJade plants (Crassula ovata) are resilient succulents that require balanced, low-nitrogen nutrition during their active spring and summer growing cycles.\n\n## Understanding Succulent Nutrient Requirements\nSucculents store water in fleshy leaves and have specialized nutrient uptake mechanisms. Over-fertilization leads to root burn and weak, leggy growth.\n\n## Optimal N-P-K Ratios for Crassula Ovata\nA balanced 10-10-10 or 5-10-5 water-soluble blend diluted to quarter-strength provides steady macro-nutrients.`
    },
    {
      keyword: 'best trello alternatives',
      draft: `# Best Trello Alternatives for Agile Project Management\n\nWhile Trello pioneered simple Kanban boards, growing cross-functional teams often require advanced sprint planning, dependency tracking, and automated custom workflows.\n\n## Why Teams Outgrow Basic Kanban Boards\nSimple card columns lack native Gantt timelines, native time tracking, and multi-board reporting needed for complex product roadmaps.\n\n## Leading Kanban and Agile Platforms\nSolutions like ClickUp, Asana, and Jira offer built-in automation, custom task hierarchies, and comprehensive analytics.`
    },
    {
      keyword: 'how to sleep fast',
      draft: `# How to Sleep Fast: Evidence-Based Techniques\n\nFalling asleep quickly is regulated by homeostatic sleep pressure and autonomic nervous system tone.\n\n## The Military Relaxation Routine\nDeveloped to help naval pilots nod off in under two minutes, this protocol focuses on sequential facial, shoulder, and breath relaxation.\n\n## 4-7-8 Respiratory Regulation\nProlonged exhalation increases vagal nerve stimulation, triggering parasympathetic activation and lowering heart rate.`
    }
  ];

  const system2H = `You are a senior research editor and citation verifier. You add genuine, verifiable excerpts and authoritative citations to strengthen E-E-A-T without hallucinating quotes or dead links.`;

  for (const tc of testCases) {
    console.log(`\n=============================================================================`);
    console.log(`Testing Topic: "${tc.keyword}"`);
    console.log(`=============================================================================`);

    const user2H = `Add 2-3 genuine, verifiable quotes or authoritative institutional citations to this article about '${tc.keyword}'.

Article:
${tc.draft}

STRICT ANTI-HALLUCINATION & CITATION RULES:
1. TOPICAL RELEVANCE MANDATE: Every quote and external link MUST directly relate to '${tc.keyword}' and the specific subject matter. Never insert medical or unrelated links into gardening or software topics.
2. VERIFIABLE GROUNDING: Every quote must be a real, documented statement from an actual recognized authority, official organization, published book, or academic institution in this field.
3. NO FABRICATION: If an exact verbatim quote from a named person is not 100% historically documented in public literature, DO NOT invent a fictional person or fake quote. Instead, use an **official consensus definition / published standard guideline** from a recognized governing body, university extension, or official documentation (e.g. > "..." — [Royal Horticultural Society / University Extension / Atlassian Documentation, Year](URL)).
4. PERMANENT CANONICAL OPEN URLS:
   - Canonical Wikipedia topic pages: https://en.wikipedia.org/wiki/<Exact_Entity_Name> (e.g. https://en.wikipedia.org/wiki/Crassula_ovata for jade plant, https://en.wikipedia.org/wiki/Trello for Trello).
   - Official documentation roots: e.g. https://support.atlassian.com, https://extension.colostate.edu.
   - Academic DOI / arXiv: https://doi.org/..., https://arxiv.org/abs/...
   - STRICTLY FORBIDDEN: NEVER invent commercial newsroom/PR slugs (gartner.com, forbes.com, etc.) or deep hallucinated file/article paths that return 404 or 403.
5. Format quotes strictly as Markdown blockquotes:
   > "Verbatim documented statement or official consensus definition." — [Author / Organization, Source Name, Year](Verified Canonical URL)
6. Return the FULL revised article in Markdown. Standard text, blockquotes, tables, and lists only. No numbered headings.`;

    console.log('Generating Step 2H with anti-hallucination prompt...');
    const result2H = await queryAI('pesat-pro', system2H, user2H, 0.2);

    const quoteMatches = [...result2H.matchAll(/>\s*"([^"]+)"\s*—\s*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g)];
    console.log(`✓ Embedded ${quoteMatches.length} Quotes in Article:`);

    for (let i = 0; i < quoteMatches.length; i++) {
      const [full, quoteText, authorMeta, url] = quoteMatches[i];
      console.log(`\n  Quote ${i+1}:`);
      console.log(`    Text: "${quoteText.slice(0, 90)}..."`);
      console.log(`    Attribution: ${authorMeta}`);
      console.log(`    URL: ${url}`);

      const check = await checkUrlStatus(url);
      console.log(`    Live HTTP Check: ${check.status} ${check.ok ? '✅ (LIVE URL)' : '❌ (DEAD / BLOCKED)'}`);
      if (!check.ok) {
        const fallback = normalizeToCanonicalUrl(url, authorMeta, tc.keyword);
        console.log(`    -> Normalized Fallback: ${fallback}`);
        const checkFallback = await checkUrlStatus(fallback);
        console.log(`    -> Fallback HTTP Check: ${checkFallback.status} ${checkFallback.ok ? '✅ (LIVE URL)' : '❌'}`);
      }
    }

    // Now test Step 4B External Links on this article
    console.log('\nTesting Step 4B External Linking...');
    const system4B = `You are an expert Fact-Checker and SEO Citation Strategist. Add 2-3 high-quality external links to verified, live sources without hallucinating fake or dead links.`;
    const user4B = `Add 2-3 high-quality external links to authoritative open-web sources supporting key factual claims in this article about '${tc.keyword}'.

Article:
${result2H}

STRICT TOPIC RELEVANCE & URL INTEGRITY RULES:
1. STRICT TOPICAL RELEVANCE: Every external link MUST be directly related to '${tc.keyword}'. For gardening/plants, link to university botanical extensions or botanical databases. For software/tech, link to official documentation or technical encyclopedias. For sleep/health, link to health institutes or sleep consensus. NEVER use unrelated medical links in non-medical articles.
2. PERMANENT CANONICAL OPEN URLS:
   - Use canonical Wikipedia topic pages: https://en.wikipedia.org/wiki/<Entity_Name> (e.g. https://en.wikipedia.org/wiki/Crassula_ovata).
   - Use official documentation or organizational portals: e.g. https://support.atlassian.com, https://www.rhs.org.uk.
   - Use verified DOIs: https://doi.org/...
   - NEVER fabricate commercial newsroom URLs (e.g. forbes.com, gartner.com) or deep paths that 404.
3. BRAND INTEGRITY: Ensure company brand is strictly 'JetDigitalPro'.
4. Integrate via contextual anchor text (e.g. "...according to [University of California Agriculture and Natural Resources](URL)..."). Link the descriptive phrase only.
5. Return ONLY the full revised article in Markdown starting directly with the H1 title. No commentary.`;

    const result4B = await queryAI('pesat-pro', system4B, user4B, 0.2);
    // Find all external links in result4B (excluding internal links)
    const extLinks = [...result4B.matchAll(/\[([^\]]+)\]\((https?:\/\/(?!jetdigitalpro)[^\)]+)\)/g)];
    console.log(`\n✓ Found ${extLinks.length} External Links in Step 4B:`);
    for (const [full, anchor, u] of extLinks) {
      console.log(`  Anchor: "${anchor}" -> ${u}`);
      const check = await checkUrlStatus(u);
      console.log(`    Live HTTP Check: ${check.status} ${check.ok ? '✅ (LIVE URL)' : '❌ (DEAD / BLOCKED)'}`);
      if (!check.ok) {
        const fallback = normalizeToCanonicalUrl(u, anchor, tc.keyword);
        console.log(`    -> Normalized Fallback: ${fallback}`);
        const checkFallback = await checkUrlStatus(fallback);
        console.log(`    -> Fallback HTTP Check: ${checkFallback.status} ${checkFallback.ok ? '✅ (LIVE URL)' : '❌'}`);
      }
    }
  }
}

testSmartPrompting().catch(console.error);
