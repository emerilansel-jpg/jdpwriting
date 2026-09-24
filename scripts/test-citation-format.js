const https = require('https');
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

function queryAI(model, sys, user) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ model, temperature: 0.2, max_tokens: 4500,
      messages: [...(sys ? [{ role: 'system', content: sys }] : []), { role: 'user', content: user }] });
    const req = https.request({ hostname: 'api.pesatrouter.com', path: '/v1/chat/completions',
      method: 'POST', family: 4, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PESAT_API_KEY}` }
    }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => {
      try { resolve(JSON.parse(b).choices[0].message.content); } catch (e) { reject(e); }
    }); }); req.on('error', reject); req.write(data); req.end();
  });
}

const SYSTEM = `You are an expert editorial researcher and citation specialist who strengthens E-E-A-T with real, verifiable citations. CARDINAL RULE: You can ONLY quote text that appears verbatim in a published paper's abstract or conclusion. If you are not 100% certain of the exact wording, you MUST use a PARAPHRASE CITATION instead (no quotation marks). You NEVER fabricate quotes, invent URLs, or insert off-topic links.`;

const USER = `Add 2-3 verifiable citations to this article about 'should you sleep early or late'.

Article:
# Sleep Early or Late? Evidence-Based Bedtime Health Guide

Sleeping early beats sleeping late for most people. A bedtime between 10:00 PM and 11:00 PM works best for human biology. Research from the UK Biobank shows bedtime at midnight or later is associated with 25% higher heart disease risk.

## What Is the Healthiest Bedtime Window?
The healthiest bedtime falls between 10:00 PM and 10:59 PM. A European Heart Journal study tracked over 88,000 adults and found a direct link between late sleep and heart trouble.

## Can Going to Bed Earlier Reduce Depression?
Researchers at the Broad Institute of MIT and Harvard studied records from over 840,000 people. Their report in JAMA Psychiatry showed earlier sleep is associated with lower risk of mood disorders.

CITATION FORMAT — TWO ALLOWED TYPES:

TYPE A — VERBATIM QUOTE (use ONLY when you are 100% certain of exact wording from a published abstract or conclusion):
> "[Exact text copied from paper abstract or conclusion]" — [Author et al., Journal Name, Year](https://doi.org/...)

TYPE B — PARAPHRASE CITATION (DEFAULT — use this when you know the finding but not the exact words):
> According to [Author et al. (Year)](https://doi.org/...), [paraphrased finding in your own words without quotation marks].

STRICT ANTI-FABRICATION RULES:
1. NEVER put quotation marks around text you composed yourself. Quotation marks mean you copied the exact words from a source document. If you are paraphrasing, do NOT use quotation marks.
2. TOPICAL RELEVANCE: Every citation MUST directly relate to 'should you sleep early or late'.
3. VERIFIABLE GROUNDING: Every cited finding must come from a real, named, published study.
4. DOI PREFERRED: Link to https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/...
5. Return the FULL revised article in Markdown.`;

async function run() {
  console.log('Testing new 2H prompt with TYPE A/TYPE B citation format...\n');
  const result = await queryAI('pesat-flash', SYSTEM, USER);

  // Analyze output
  const verbatimQuotes = [...result.matchAll(/>\s*"([^"]+)"/g)];
  const paraphraseCites = [...result.matchAll(/>\s*According to/g)];
  const allBlockquotes = [...result.matchAll(/^>\s*.+$/gm)];

  console.log('--- OUTPUT ---\n');
  // Print just the blockquotes
  for (const bq of allBlockquotes) {
    console.log(bq[0]);
    console.log();
  }

  console.log('\n--- ANALYSIS ---');
  console.log(`Total blockquotes: ${allBlockquotes.length}`);
  console.log(`Verbatim quotes (with ""): ${verbatimQuotes.length}`);
  console.log(`Paraphrase citations (According to...): ${paraphraseCites.length}`);

  if (verbatimQuotes.length > 0) {
    console.log('\n⚠️  VERBATIM QUOTES DETECTED — check if they look like real abstract text:');
    for (const vq of verbatimQuotes) {
      const text = vq[1];
      // Heuristic: real abstract quotes use hedged language
      const hasHedging = /suggest|associated|may|could|findings|observed|reported|indicate/i.test(text);
      const hasCausal = /directly|essential|is crucial|is important|is key/i.test(text);
      console.log(`  "${text.slice(0, 80)}..."`);
      console.log(`    Hedged language: ${hasHedging ? '✅ YES' : '❌ NO'}`);
      console.log(`    Causal/promotional: ${hasCausal ? '⚠️ SUSPICIOUS' : '✅ OK'}`);
    }
  }

  if (paraphraseCites.length > 0) {
    console.log('\n✅ PARAPHRASE CITATIONS DETECTED — this is the desired behavior');
  }

  // Check for DOI links
  const doiLinks = [...result.matchAll(/https:\/\/doi\.org\/[^\s\)]+/g)];
  const pubmedLinks = [...result.matchAll(/https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/[^\s\)]+/g)];
  console.log(`\nDOI links: ${doiLinks.length}`);
  console.log(`PubMed links: ${pubmedLinks.length}`);
  for (const d of doiLinks) console.log(`  ${d[0]}`);
  for (const p of pubmedLinks) console.log(`  ${p[0]}`);
}

run().catch(console.error);
