const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

const payload = JSON.stringify({
  model: 'pesat-flash',
  temperature: 0.2,
  messages: [
    {
      role: 'system',
      content: 'You are a hybrid SEO and GEO expert. Evaluate content for both traditional Google ranking and AI search engine citation-worthiness (ChatGPT, Perplexity, Gemini, Copilot). Provide pass/fail gate.'
    },
    {
      role: 'user',
      content: `FINAL EVALUATION for article about 'how to sleep fast'.

Target Keyword: how to sleep fast
Title Tag: How to Sleep Fast
Meta Description: Learn how to sleep fast.
URL Slug: how-to-sleep-fast
Planned Internal Links: https://jetdigitalpro.com/how-to-sleep-fast
Planned External Links: https://nih.gov

Article:
# How to Sleep Fast: Proven Methods
Falling asleep within 10 to 20 minutes is the clinical standard for healthy sleep latency.

Previous Analysis Context:
EEAT: {"eeat":{"total":15,"percentage":21},"gaps":[{"issue":"Article not provided in analysis","severity":"high"}]}
Quality+FactCheck: {"quality_score":30,"critical_flags":["Article text missing during fact-check"],"overall_verdict":{"quality":"poor","fact_risk":"high"}}

Evaluation Scope Note: Title, meta description, and slug are provided above. Internal/external link planning is provided above. Image prompts and alt texts will be generated in Phase 3 upon gate approval. Verify that content strictly uses clean text, lists, and tables only (no broken ASCII art or diagram code blocks). Evaluate content depth, snippet direct answers, table structuring, entity salience, and citation readiness objectively. Pass threshold is overall_score >= 70.

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
    'Authorization': 'Bearer ' + PESAT_API_KEY
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const json = JSON.parse(b);
    const content = json.choices[0].message.content;
    const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    console.log('Score with flawed 2I/2J upstream:', parsed.overall_score, '(SEO:', parsed.seo_score, 'GEO:', parsed.geo_score, ') Pass:', parsed.pass);
  });
});
req.write(payload);
req.end();
