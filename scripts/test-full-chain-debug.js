const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, systemPrompt, userPrompt, temperature = 0.2, maxTokens = 3000) {
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
            reject(new Error(json.error?.message || b.slice(0, 100)));
          }
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

async function testFullChain() {
  const keyword = 'sleep fast or late';
  console.log('Testing full evaluation chain on keyword:', keyword);

  // 1. Generate 1E
  const prompt1E = `Write a comprehensive ~2500-word article about "${keyword}".
Requirements:
1. Title: H1 "Sleep Fast or Late: What Science Says on Ideal Rest"
2. Meta description: Learn whether you should sleep fast or late.
3. First paragraph answers intent.
4. H2 with 3 key takeaways.
5. Minimum 6 H2 sections with direct answer <=40 words under each H2.
6. Markdown comparison table.
7. 2-3 quotes formatted as > "Quote." — [Author, Source, Year](URL).
8. FAQ with 4 Q&As.
9. No numbered headings.
10. Brand is JetDigitalPro.
11. Text, tables, and lists only.`;

  console.log('Generating 1E...');
  const article = await queryAI('pesat-flash', 'You are an SEO/GEO writer.', prompt1E, 0.7, 4500);
  console.log('1E words:', article.split(/\s+/).length);

  // 2. Step 2I EEAT
  console.log('Running 2I EEAT...');
  const prompt2I = `Analyze this article about '${keyword}' for EEAT+HCU+EAV.
Article:
${article}
Return JSON: eeat, hcu, eav, gaps, strengths, weaknesses.`;
  const res2I = await queryAI('pesat-flash', 'Google Search Quality Evaluator', prompt2I, 0.2, 2000);
  console.log('2I length:', res2I.length);

  // 3. Step 2J Quality
  console.log('Running 2J Quality...');
  const prompt2J = `Analyze this article about '${keyword}' for writing quality and factual accuracy.
Article:
${article}
EEAT Context:
${res2I}
Return JSON: quality_score, readability, claims, critical_flags, overall_verdict.`;
  const res2J = await queryAI('pesat-flash', 'Senior copy editor and fact-checker', prompt2J, 0.2, 2000);
  console.log('2J length:', res2J.length);

  // 4. Step 2K Evaluator
  console.log('Running 2K Evaluator...');
  const prompt2K = `FINAL EVALUATION for article about '${keyword}'.

Target Keyword: ${keyword}
Title Tag: Sleep Fast or Late: What Science Says on Ideal Rest
Meta Description: Learn whether you should sleep fast or late.
URL Slug: sleep-fast-or-late
Planned Internal Links: https://jetdigitalpro.com/sleep-fast-or-late
Planned External Links: https://www.sleepfoundation.org, https://www.nih.gov

Article:
${article}

Previous Analysis Context:
EEAT: ${res2I}
Quality+FactCheck: ${res2J}

Evaluation Scope Note: Title, meta description, and slug are provided above. Internal/external link planning is provided above. Image prompts and alt texts will be generated in Phase 3 upon gate approval. Verify that content strictly uses clean text, lists, and tables only. Evaluate the actual content depth, snippet direct answers, table structuring, entity salience, and citation readiness objectively. Note on previous analysis: treat EEAT/Quality reports as diagnostic context for future polish; do not double-penalize for Phase 3/5 assets. Pass threshold is overall_score >= 70.

SEO DIMENSION (score 0-100): On-Page (25%), Technical (25%), Content (25%), UX (25%).
GEO DIMENSION (score 0-100): Citation-Worthiness (40%), ChatGPT (15%), Perplexity (15%), Gemini (15%), Copilot (15%).

YOU MUST RETURN VALID RAW JSON ONLY. NO MARKDOWN CODE BLOCKS. NO CONVERSATIONAL PROSE.
{"seo_score": 85, "geo_score": 85, "overall_score": 85, "pass": true, "critical_blockers": []}
`;

  const res2K = await queryAI('pesat-flash', 'You are a hybrid SEO and GEO expert. Return JSON only.', prompt2K, 0.2, 2000);
  console.log('2K Output:\n', res2K);
}

testFullChain().catch(console.error);
