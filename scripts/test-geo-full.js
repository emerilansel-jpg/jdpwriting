const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, systemPrompt, userPrompt, temperature = 0.5, maxTokens = 4500) {
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
          resolve(json.choices[0].message.content);
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

async function testGeoGen() {
  const keyword = 'what is generative engine optimization';
  const cta = 'Get our full GEO implementation framework';
  console.log('Testing generation for:', keyword);

  const prompt1E = `Write a comprehensive, professional, search-optimized ~2000-word article in American English based on the provided topic.

Target Keyword: ${keyword}
Call to Action (CTA): ${cta}
Internal Links: https://jetdigitalpro.com/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}

Requirements:
1. Title: H1 (50-60 chars, keyword-first, benefit-driven). MUST directly address target keyword "${keyword}".
2. Meta Description: 150-160 chars labeled "Meta description:".
3. Introduction (~100 words): First sentence <=40 words directly answers search intent. Include a verified statistic and context.
4. Key Takeaways: H2 with 3 bullet insights.
5. Main Body: Minimum 6 comprehensive H2 sections. First paragraph under each H2 must provide a concise direct answer (<=40 words) for featured snippet and AI citation capture. Bold key statistics and named entities. CRITICAL HEADING RULE: Do NOT number any headings or section titles.
6. Comparison Table: Include at least one structured Markdown comparison table (3-5 columns, >=3 rows).
7. Expert Citations: Include 2-3 cited expert statements formatted as > "Quote." — [Author/Institution, Year](URL). CITATION ACCURACY: All quotes must be genuine documented findings from real experts or research bodies. URLs must be real, live links (DOI https://doi.org/..., PubMed, .gov, .edu, Wikipedia, or official hubs); NEVER invent non-existent sub-slugs.
8. FAQ Section: Include 3-5 high-intent Q&A pairs directly addressing related queries.
9. Tone: Grounded, authoritative, engaging human voice. Active voice, sentence variety, no AI clichés.
10. Conclusion: Actionable next steps ending with CTA [${cta}].
11. BRAND INTEGRITY RULE: The company/brand name is strictly 'JetDigitalPro' (one word, PascalCase: JetDigitalPro). NEVER write 'jet digital pro', 'jet digitalpro', or 'Jet Digital Pro'. Always format as 'JetDigitalPro'.
12. STRICT CONTENT FORMATTING RULE: The article must consist ONLY of: a) Standard prose paragraphs with H1, H2, H3 headings, bold text, and blockquotes (>); b) Structured Markdown comparison tables; c) Numbered or bulleted Markdown lists. NO ASCII art, box flows, or code blocks.

Write the COMPLETE full-length article in Markdown. Begin directly with the H1 title.`;

  const article = await queryAI('pesat-flash', 'You are an expert SEO/GEO writer.', prompt1E, 0.7, 5000);
  console.log('Article generated. Words:', article.split(/\s+/).filter(Boolean).length);
  console.log('--- FIRST 500 CHARS ---\n', article.slice(0, 500));

  // Now evaluate with 2K
  const titleMatch = article.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : keyword;
  const metaMatch = article.match(/Meta description:\s*(.+)$/m);
  const metaDesc = metaMatch ? metaMatch[1].trim() : `Comprehensive guide to ${keyword}.`;
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const evalPrompt = `FINAL EVALUATION for article about '${keyword}'.

Target Keyword: ${keyword}
Title Tag: ${title}
Meta Description: ${metaDesc}
URL Slug: ${slug}
Planned Internal Links: https://jetdigitalpro.com/${slug}
Planned External Links: https://en.wikipedia.org, https://arxiv.org

Article:
${article}

Previous Analysis Context:
EEAT: {"eeat":{"percentage":88},"hcu":{"percentage":90},"eav":{"percentage":86}}
Quality+FactCheck: {"quality_score":92,"readability":{"grade_level":9.4}}

Evaluation Scope Note: Title, meta description, and slug are provided above. Internal/external link planning is provided above. Image prompts and alt texts will be generated in Phase 3 upon gate approval. Verify that content strictly uses clean text, lists, and tables only (no broken ASCII art or diagram code blocks). Evaluate the actual content depth, snippet direct answers, table structuring, entity salience, and citation readiness objectively. Pass threshold is overall_score >= 70.

SEO DIMENSION (score 0-100): On-Page (25%), Technical (25%), Content (25%), UX (25%).
GEO DIMENSION (score 0-100): Citation-Worthiness (40%), ChatGPT (15%), Perplexity (15%), Gemini (15%), Copilot (15%).

Return JSON: seo_score, seo_breakdown, geo_score, geo_breakdown, overall_score, pass, geo_citation_phrases:[], ai_engine_readiness:{chatgpt:{score,note},perplexity:{score,note},gemini:{score,note},copilot:{score,note}}, top_3_seo_fixes:[], top_3_geo_fixes:[], retry_prompt, critical_blockers:[].`;

  const evalRes = await queryAI('pesat-flash', 'You are a hybrid SEO and GEO expert.', evalPrompt, 0.2, 2500);
  console.log('\n--- 2K RESULT ---\n', evalRes);
}

testGeoGen().catch(console.error);
