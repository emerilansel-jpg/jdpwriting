const https = require('https');

const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

const testArticle = `# What Is the Difference Between Traditional SEO and GEO?

Traditional SEO targets ranking positions on static results pages. GEO targets conversational answer inclusion through factual density and quotation integration.

Legacy optimization emphasizes domain authority and keyword density. Yet habits changed. Modern visibility requires a comprehensive jet digital pro approach to ensure brand entities stay indexable across both formats. BrightEdge Research reveals that AI overviews now appear for 84% of queries, completely changing how users interact with the top organic blue links.

> "Generative AI solutions are becoming substitute answer engines, replacing user queries that previously may have been executed in traditional search engines. This will force companies to rethink their marketing channels strategy as GenAI becomes more embedded across all aspects of the enterprise." — [Alan Antin, Vice President Analyst, Gartner, 2024](https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots)

## Core Differences Between SEO and GEO
| Optimization Factor | Traditional SEO | Generative Engine Optimization (GEO) |
|---|---|---|
| Primary Objective | Rank in top organic blue links | Earn attribution in generative answer boxes |
| Core Metric | Click-through rate and impressions | AI citation frequency and brand share |
| Content Structure | Keyword-targeted long-form | High factual density with direct answers |
`;

async function testEval2K() {
  const payload = JSON.stringify({
    model: 'pesat-flash',
    temperature: 0.2,
    max_tokens: 2500,
    messages: [
      {
        role: 'system',
        content: 'You are a hybrid SEO and GEO expert. Evaluate content for both traditional Google ranking and AI search engine citation-worthiness (ChatGPT, Perplexity, Gemini, Copilot). Provide pass/fail gate.'
      },
      {
        role: 'user',
        content: `FINAL EVALUATION for article about 'what is generative engine optimization'.

Target Keyword: what is generative engine optimization
Title Tag: What Is the Difference Between Traditional SEO and GEO?
Meta Description: Learn the key differences between traditional SEO and GEO.
URL Slug: what-is-generative-engine-optimization
Planned Internal Links: https://jetdigitalpro.com/what-is-generative-engine-optimization
Planned External Links: https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots

Article:
${testArticle}

Previous Analysis Context:
EEAT: {"eeat":{"percentage":88},"hcu":{"percentage":90},"eav":{"percentage":86}}
Quality+FactCheck: {"quality_score":92,"readability":{"grade_level":9.4}}

Evaluation Scope Note: Title, meta description, and slug are provided above. Internal/external link planning is provided above. Image prompts and alt texts will be generated in Phase 3 upon gate approval. Verify that content strictly uses clean text, lists, and tables only (no broken ASCII art or diagram code blocks). Evaluate the actual content depth, snippet direct answers, table structuring, entity salience, and citation readiness objectively. Note on previous analysis: treat EEAT/Quality reports as diagnostic context for future polish; do not double-penalize for Phase 3/5 assets. Pass threshold is overall_score >= 70.

SEO DIMENSION (score 0-100): On-Page (25%) — title, meta, heading hierarchy, link readiness, schema markup. Technical (25%) — URL structure, mobile readability, scannability, freshness. Content (25%) — semantic keyword coverage, featured snippet direct answers, comparison tables, entity depth, FAQ coverage. UX (25%) — dwell time hooks, bounce rate reduction, scannability, CTA clarity.

GEO DIMENSION (score 0-100): Citation-Worthiness (40%) — direct answer density (<=40w under H2s), source-worthiness, citation phrases, statistical anchoring, unique insight. ChatGPT (15%) — conversational query match, step-by-step clarity, comparison framing. Perplexity (15%) — source diversity, inline citation format, recency. Gemini (15%) — multimodal readiness (tables, lists), KG alignment, contextual depth. Copilot (15%) — actionable guidance, technical precision.

Return JSON: seo_score, seo_breakdown:{on_page,technical,content,user_experience}, geo_score, geo_breakdown:{citation_worthiness,chatgpt,perplexity,gemini,copilot}, overall_score, pass (boolean, threshold 70), geo_citation_phrases:[], ai_engine_readiness:{chatgpt:{score,note},perplexity:{score,note},gemini:{score,note},copilot:{score,note}}, top_3_seo_fixes:[], top_3_geo_fixes:[], retry_prompt (string if <70), critical_blockers:[].`
      }
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
      console.log('Result:\n', b);
    });
  });
  req.write(payload);
  req.end();
}

testEval2K().catch(console.error);
