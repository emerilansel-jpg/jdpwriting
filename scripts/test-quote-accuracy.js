const https = require('https');

const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryLLM(model, messages, temp = 0.3) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model,
      temperature: temp,
      messages
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
      res.on('data', chunk => b += chunk);
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
    req.write(data);
    req.end();
  });
}

async function testQuoteAccuracy() {
  const keyword = 'how to sleep fast';
  const systemPrompt = `You are a rigorous research editor and citation verifier.
CRITICAL ANTI-HALLUCINATION RULES FOR QUOTES & EXTERNAL LINKS:
1. Every quote MUST be a REAL, VERIFIABLE statement from a real expert, research paper, or official institution.
2. DO NOT invent or fabricate quotes. If quoting verbatim, use only well-known, documented statements or landmark published findings.
3. Every external link URL MUST be a real, live, accessible URL:
   - Use verified official domains or DOI links (e.g., https://doi.org/..., https://pubmed.ncbi.nlm.nih.gov/..., https://www.cdc.gov/..., https://www.sleepfoundation.org/..., https://en.wikipedia.org/...).
   - NEVER hallucinate non-existent sub-slugs or imaginary articles.
   - If an exact deep page is not known with 100% certainty, link to the authoritative institutional topic portal or DOI.
4. Format quotes strictly as:
   > "Verbatim or precise landmark statement." — [Author / Expert Name, Institution or Journal, Year](Verified URL)
5. Format: Standard Markdown text, blockquotes (>), tables, and lists only. No ASCII diagrams or arrow chains.`;

  const userPrompt = `Add 2-3 verified expert quotes to this article about "${keyword}".
Ensure that every quote is genuinely attributable and that every linked URL exists on the real web.

Article:
# How to Sleep Fast: Evidence-Based Techniques

Falling asleep quickly is a biological process influenced by autonomic arousal and circadian rhythms.

## The Military Method for Fast Sleep
The military method relaxes facial muscles, drops shoulders, and clears mental chatter to induce sleep within minutes.

## 4-7-8 Breathing Technique
Inhale for 4 seconds, hold for 7 seconds, and exhale for 8 seconds to stimulate the vagus nerve.

Return the full article with the quotes embedded.`;

  console.log('Testing pesat-pro with strict quote verification...');
  const res = await queryLLM('pesat-pro', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  console.log('\n--- Output from pesat-pro ---\n', res);
}

testQuoteAccuracy().catch(console.error);
