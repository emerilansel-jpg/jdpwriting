const https = require('https');

const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function testPromptOnModel(model, keyword, articleSnippet) {
  return new Promise((resolve, reject) => {
    const systemPrompt = `You are an expert editorial researcher and citation specialist.
You embed 2-3 genuine, verbatim excerpts or authoritative quotes into articles.
RULES FOR VERBATIM QUOTES & PERMANENT CANONICAL URLS:
1. You may quote from ANY reputable, authoritative source: official documentation, industry bodies, university portals, government agencies (.gov), recognized authoritative platforms (Wikipedia), or official documentation.
2. The quote must be an EXACT, VERBATIM sentence or statement (e.g. official definitions, published guidelines, core principles).
3. The linked URL MUST be a real, permanent canonical URL on the open web:
   - Canonical Wikipedia topic pages: https://en.wikipedia.org/wiki/... (always 200 OK)
   - Official documentation: https://developers.google.com/search, https://arxiv.org/abs/...
   - Official government or university portals: https://www.cdc.gov/..., https://www.nih.gov/...
   - NEVER invent fake deep press-release slugs (such as gartner.com/newsroom/press-releases/...) that return 404 or 403 bot blocks.
4. Format:
   > "Exact verbatim statement or definition." — [Author / Organization, Source Name, Year](Canonical URL)
5. Brand name is strictly 'JetDigitalPro' (never 'jet digital pro').
6. No numbered headings.`;

    const userPrompt = `Add 2-3 verifiable quotes/excerpts from authoritative sources to this article about "${keyword}".

Article:
${articleSnippet}

Return the complete updated article in clean Markdown.`;

    const payload = JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const t0 = Date.now();
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
          const time = ((Date.now() - t0) / 1000).toFixed(1);
          resolve({
            time,
            content: json.choices[0].message.content
          });
        } catch (e) {
          reject(new Error(b));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  const keyword = 'what is generative engine optimization';
  const articleSnippet = `# What Is Generative Engine Optimization (GEO)?
Generative Engine Optimization (GEO) is the practice of optimizing digital content for visibility in AI answer engines like ChatGPT, Gemini, and Perplexity.

## How GEO Differs from Traditional SEO
Traditional SEO optimizes for keyword rank in search engine results pages. GEO optimizes for information gain, direct answers, and citation frequency.`;

  console.log('Testing pesat-flash for 2H...');
  const resFlash = await testPromptOnModel('pesat-flash', keyword, articleSnippet);
  console.log(`pesat-flash took ${resFlash.time}s`);
  console.log(resFlash.content);
}

run().catch(console.error);
