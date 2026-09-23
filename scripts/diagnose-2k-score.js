const https = require('https');

const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

async function testEvalCondition(description, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: 'pesat-flash',
      temperature: 0.2,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: 'You are a hybrid SEO and GEO expert. Evaluate content for both traditional Google ranking and AI search engine citation-worthiness (ChatGPT, Perplexity, Gemini, Copilot). Provide pass/fail gate.'
        },
        {
          role: 'user',
          content: payload
        }
      ]
    });

    const req = https.request({
      hostname: 'api.pesatrouter.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PESAT_API_KEY}`
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const content = json.choices[0].message.content;
          const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          console.log(`[${description}] -> Overall Score: ${parsed.overall_score} (SEO: ${parsed.seo_score}, GEO: ${parsed.geo_score}), Pass: ${parsed.pass}`);
          if (parsed.overall_score < 70) {
            console.log('  Top 3 SEO Fixes:', parsed.top_3_seo_fixes);
            console.log('  Top 3 GEO Fixes:', parsed.top_3_geo_fixes);
          }
          resolve(parsed);
        } catch (e) {
          console.error(`[${description}] Parse error:`, e.message);
          resolve(null);
        }
      });
    });
    req.write(data);
    req.end();
  });
}

async function runDiagnose() {
  // Case A: Missing article (empty string)
  await testEvalCondition('Case A: Empty Article', `FINAL EVALUATION for article about 'how to sleep fast'.
Target Keyword: how to sleep fast
Title Tag: How to Sleep Fast
Meta Description: Tips to sleep fast.
URL Slug: how-to-sleep-fast
Planned Internal Links: https://jetdigitalpro.com/sleep
Planned External Links: https://nih.gov
Article:

Previous Analysis Context:
EEAT: {}
Quality+FactCheck: {}
`);

  // Case B: Raw JSON title / slug (when JSON parsing failed)
  await testEvalCondition('Case B: Raw JSON in Title and Slug', `FINAL EVALUATION for article about 'how to sleep fast'.
Target Keyword: how to sleep fast
Title Tag: {"title":"How to Sleep Fast","meta_description":"Tips to sleep fast","slug":"how-to-sleep-fast"}
Meta Description: {"title":"How to Sleep Fast","meta_description":"Tips to sleep fast","slug":"how-to-sleep-fast"}
URL Slug: {"title":"How to Sleep Fast","meta_description":"Tips to sleep fast","slug":"how-to-sleep-fast"}
Planned Internal Links: 
Planned External Links: 
Article:
# How to sleep fast
Some text here.
Previous Analysis Context:
EEAT: {}
Quality+FactCheck: {}
`);

  // Case C: Real Article with Article tag included in 2I & 2J
  await testEvalCondition('Case C: Normal Valid Full Article', `FINAL EVALUATION for article about 'how to sleep fast'.
Target Keyword: how to sleep fast
Title Tag: How to Sleep Fast: Proven Methods
Meta Description: Learn how to sleep fast with science-backed techniques.
URL Slug: how-to-sleep-fast
Planned Internal Links: https://jetdigitalpro.com/sleep-tips
Planned External Links: https://www.nih.gov, https://www.sleepfoundation.org
Article:
# How to Sleep Fast: Proven Methods
Falling asleep in 10-20 minutes is optimal.
## Key Takeaways
- Method 1 works in 2 minutes.
- Circadian light anchors melatonin.
| Technique | Time | Efficacy |
|---|---|---|
| Military | 2 min | High |
| 4-7-8 | 5 min | Medium |

Previous Analysis Context:
EEAT: {"eeat":{"percentage":88},"hcu":{"percentage":90}}
Quality+FactCheck: {"quality_score":92}
`);
}

runDiagnose().catch(console.error);
