// Patch #2: Fix quote fabrication + stat hallucination across Step 1E, 2G, 2H, 2J
const fs = require('fs');

let html = fs.readFileSync('admin-ui.html', 'utf8');
let changes = 0;

// ============================================================================
// 1. STEP 2H — The #1 source of fabricated quotes
//    Problem: LLM invents "verbatim" quotes that don't exist in papers.
//    Even with "NO FABRICATION" rule, it still fabricates because the
//    instruction says "use official consensus definition" as fallback,
//    but LLM still wraps fabricated text in quotation marks with fake attribution.
//    Fix: Explicitly ban quotation-mark-wrapped text unless from abstract/conclusion.
//    Add "SAFE CITATION" format as the DEFAULT, verbatim quotes as exception.
// ============================================================================
const old2HSys = `systemPrompt:'You are an expert editorial researcher and citation specialist. You add genuine, verifiable excerpts and authoritative quotes to strengthen E-E-A-T. You NEVER fabricate quotes or invent URLs. You NEVER insert off-topic links.',`;

const new2HSys = `systemPrompt:'You are an expert editorial researcher and citation specialist who strengthens E-E-A-T with real, verifiable citations. CARDINAL RULE: You can ONLY quote text that appears verbatim in a published paper\\'s abstract or conclusion. If you are not 100% certain of the exact wording, you MUST use a PARAPHRASE CITATION instead (no quotation marks). You NEVER fabricate quotes, invent URLs, or insert off-topic links.',`;

if (html.includes(old2HSys)) {
  html = html.replace(old2HSys, new2HSys);
  changes++;
  console.log('✓ Patched 2H systemPrompt');
}

// Now patch the 2H userPrompt
const old2HUserStart = `userPrompt:'Add 2-3 genuine, verifiable quotes or authoritative institutional citations to this article about \\'{{keyword}}\\'.`;
const old2HUserEnd = `8. Return the FULL revised article in Markdown. Standard text, blockquotes, tables, and lists only. No ASCII diagrams, flowchart arrows, or numbered headings.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

// Find and replace the entire 2H userPrompt
const idx2Hstart = html.indexOf(old2HUserStart);
const idx2Hend = html.indexOf(old2HUserEnd);
if (idx2Hstart !== -1 && idx2Hend !== -1) {
  const before = html.substring(0, idx2Hstart);
  const after = html.substring(idx2Hend + old2HUserEnd.length);

  const new2HUser = `userPrompt:'Add 2-3 verifiable citations to this article about \\'{{keyword}}\\'.\\n\\nArticle:\\n{{article}}\\n\\nResearch Context (Verified Sources & Data):\\n{{info_gain}}\\n{{serp_data}}\\n\\nCITATION FORMAT — TWO ALLOWED TYPES:\\n\\nTYPE A — VERBATIM QUOTE (use ONLY when you are 100% certain of exact wording from a published abstract or conclusion):\\n> \"[Exact text copied from paper abstract or conclusion]\" — [Author et al., Journal Name, Year](https://doi.org/...)\\n\\nTYPE B — PARAPHRASE CITATION (DEFAULT — use this when you know the finding but not the exact words):\\n> According to [Author et al. (Year)](https://doi.org/...), [paraphrased finding in your own words without quotation marks].\\n\\nSTRICT ANTI-FABRICATION RULES:\\n1. NEVER put quotation marks around text you composed yourself. Quotation marks mean you copied the exact words from a source document. If you are paraphrasing, do NOT use quotation marks.\\n2. TOPICAL RELEVANCE: Every citation MUST directly relate to \\'{{keyword}}\\'. Never insert off-topic sources.\\n3. VERIFIABLE GROUNDING: Every cited finding must come from a real, named, published study or official institutional statement. Include the journal/organization name and year.\\n4. DOI PREFERRED: Link to https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/... when citing research papers. For official statements, link to the institutional page.\\n5. PERMANENT CANONICAL OPEN URLS:\\n   - Wikipedia disambiguation: percent-encode parens (%28 %29).\\n   - NEVER invent commercial newsroom slugs or deep file paths.\\n6. BRAND INTEGRITY: \\'JetDigitalPro\\' (PascalCase).\\n7. Integrate naturally after relevant claims throughout the article.\\n8. Return the FULL revised article in Markdown. Standard text, blockquotes, tables, and lists only. No ASCII diagrams, flowchart arrows, or numbered headings.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

  html = before + new2HUser + after;
  changes++;
  console.log('✓ Patched 2H userPrompt');
}

// ============================================================================
// 2. STEP 1E — Article generation invents precise statistics
//    Problem: "Include a verified statistic" leads to fabricated numbers like
//    "54% NAFLD risk" or "3.2 hours REM loss" that don't match any real paper.
//    Fix: Add rule that precise statistics must come from research context,
//    and if a specific number isn't in the provided data, use ranges or
//    general findings instead of inventing precise figures.
// ============================================================================
const stat1E_old = `3. Introduction (~100 words): First sentence <=40 words directly answers search intent. Include a verified statistic and context.`;
const stat1E_new = `3. Introduction (~100 words): First sentence <=40 words directly answers search intent. Include a statistic from the Research Data context below. STATISTICS INTEGRITY: Only cite specific numbers (percentages, fold-risks, exact figures) that appear in the Research Data provided. If no exact number is available for a claim, write the general finding without inventing a precise figure. NEVER fabricate statistics. If uncertain about a number, use hedging language (e.g. "research suggests" or "studies indicate") without a specific percentage.`;

if (html.includes(stat1E_old)) {
  html = html.replace(stat1E_old, stat1E_new);
  changes++;
  console.log('✓ Patched 1E intro stat rule');
}

// Add stats integrity rule to 1E point 7 (Expert Citations)
const cite1E_old = `7. Expert Citations: Include 2-3 cited expert statements formatted as > "Quote." — [Author/Institution, Year](URL). CITATION & URL INTEGRITY: Excerpts may be taken from any authoritative source (official docs, industry bodies, .gov, .edu, Wikipedia). URLs must be real, permanent open links. NEVER invent newsroom or commercial PR slugs (e.g. gartner.com/newsroom/...) that fail or 404.`;
const cite1E_new = `7. Expert Citations: Include 2-3 cited statements. Use TWO formats: (A) VERBATIM QUOTE with quotation marks ONLY if you are 100% certain of exact wording from a published abstract — > "Exact text from abstract." — [Author, Journal, Year](DOI URL). (B) PARAPHRASE CITATION (DEFAULT) without quotation marks — > According to [Author (Year)](DOI), [paraphrased finding]. NEVER put quotation marks around text you composed yourself. URLs must be real DOI or permanent open links. NEVER invent newsroom slugs.`;

if (html.includes(cite1E_old)) {
  html = html.replace(cite1E_old, cite1E_new);
  changes++;
  console.log('✓ Patched 1E citation format rule');
}

// Add causation vs correlation rule to 1E
const tone1E_old = `10. Tone: Grounded, authoritative, engaging human voice. Active voice, sentence variety, no AI clichés.`;
const tone1E_new = `10. Tone: Grounded, authoritative, engaging human voice. Active voice, sentence variety, no AI clichés.\\n11. CAUSATION VS CORRELATION: When citing observational studies (cohort, cross-sectional, UK Biobank, Nurses Health Study), use associative language ("is associated with", "is linked to", "correlates with"). Reserve causal language ("causes", "leads to", "raises risk") ONLY for RCTs or Mendelian randomization studies. When citing a risk ratio, specify if it is adjusted or unadjusted.`;

if (html.includes(tone1E_old)) {
  html = html.replace(tone1E_old, tone1E_new);
  changes++;
  console.log('✓ Patched 1E causation/correlation rule');
}

// Renumber remaining points (11->12, 12->13, 13->14)
html = html.replace(
  `11. Conclusion: Actionable next steps ending with CTA`,
  `12. Conclusion: Actionable next steps ending with CTA`
);
html = html.replace(
  `12. BRAND INTEGRITY RULE:`,
  `13. BRAND INTEGRITY RULE:`
);
html = html.replace(
  `13. STRICT CONTENT FORMATTING RULE:`,
  `14. STRICT CONTENT FORMATTING RULE:`
);

// ============================================================================
// 3. STEP 2G — Table generation invents precise statistics
//    Problem: "Every claim/number must have specific-page hyperlink" leads to
//    fabricated numbers with [GEO NOTE: missing URL] or fake URLs.
//    Fix: Add explicit rule about not inventing statistics for table cells.
// ============================================================================
const table2G_old = `Table: 3-5 columns, ≥3 data rows, relevant to keyword (comparison, data, timeline, ranking). Every claim/number must have specific-page hyperlink: [Claim](url). If missing URL: [GEO NOTE: missing specific URL].`;
const table2G_new = `Table: 3-5 columns, ≥3 data rows, relevant to keyword (comparison, data, timeline, ranking). Every claim/number must have specific-page hyperlink: [Claim](url). If missing URL: [GEO NOTE: missing specific URL].\\nSTATISTICS INTEGRITY: Only include specific numbers that appear in the article text or research context. NEVER invent precise percentages, fold-risks, or exact figures to fill table cells. If a precise number is not available, describe the finding qualitatively (e.g. "Higher risk" instead of "54% higher risk").`;

if (html.includes(table2G_old)) {
  html = html.replace(table2G_old, table2G_new);
  changes++;
  console.log('✓ Patched 2G table stats integrity rule');
}

// ============================================================================
// 4. STEP 2J — Fact-checker doesn't catch fabricated quotes or wrong stats
//    Problem: 2J says "verify quotes are genuine" but LLM just says "verified: 3"
//    without actually checking. It also doesn't flag unadjusted vs adjusted stats.
//    Fix: Add explicit check instructions for quote fabrication patterns and
//    statistical precision.
// ============================================================================
const factcheck2J_old = `- Audit all quotes: verify that quotes are genuine statements from real experts/institutions and not fabricated.`;
const factcheck2J_new = `- Audit all quotes using these SPECIFIC CHECKS:\\n  a) VERBATIM TEST: Does the text inside quotation marks read like authentic published academic prose (formal, precise, cautious)? Or does it read like AI-generated paraphrase (casual, definitive, promotional)? Flag any quote that uses casual language, makes absolute claims, or contains phrases like "directly influences", "is essential for" — real papers use hedged language.\\n  b) ATTRIBUTION TEST: Is the attributed author a real, named researcher who published in the cited journal and year? Flag any vague attribution (e.g. "European Heart Journal, 2021" without a specific author name that can be verified).\\n  c) PARAPHRASE DETECTION: If quotation marks wrap text that looks like a summary rather than exact copied text, flag it as LIKELY FABRICATED and recommend converting to paraphrase citation format (no quotation marks).\\n  d) ADJUSTED vs UNADJUSTED: For any cited risk ratio or hazard ratio, check whether the article specifies if it is the adjusted or unadjusted figure. Flag any unadjusted risk presented without context as misleading.`;

if (html.includes(factcheck2J_old)) {
  html = html.replace(factcheck2J_old, factcheck2J_new);
  changes++;
  console.log('✓ Patched 2J quote verification rules');
}

// Add statistical precision check to 2J
const claims2J_old = `- Extract all factual claims with confidence scores (high/medium/low). Flag any unsupported assertions or weasel words without dates or citations.`;
const claims2J_new = `- Extract all factual claims with confidence scores (high/medium/low). Flag any unsupported assertions or weasel words without dates or citations.\\n- STATISTICAL PRECISION AUDIT: For every specific number (percentage, fold-risk, exact count), verify it appears in the Research Context data. Flag any precise statistic not traceable to provided research data as UNVERIFIABLE. Check whether risk ratios are adjusted or unadjusted — flag unadjusted ratios presented as definitive causal claims.\\n- CAUSATION LANGUAGE AUDIT: Flag any sentence that uses causal language ("causes", "raises risk", "leads to") for findings from observational/cohort studies. These should use associative language ("is associated with", "is linked to").`;

if (html.includes(claims2J_old)) {
  html = html.replace(claims2J_old, claims2J_new);
  changes++;
  console.log('✓ Patched 2J statistical precision audit');
}

// ============================================================================
// WRITE & VERIFY
// ============================================================================
fs.writeFileSync('admin-ui.html', html, 'utf8');
console.log(`\n✅ Applied ${changes} patches to admin-ui.html`);

// Verify
const patched = fs.readFileSync('admin-ui.html', 'utf8');
console.log('\nVerification:');
console.log('  2H has CARDINAL RULE:', patched.includes('CARDINAL RULE'));
console.log('  2H has TYPE A/TYPE B:', patched.includes('TYPE A') && patched.includes('TYPE B'));
console.log('  2H has PARAPHRASE CITATION:', patched.includes('PARAPHRASE CITATION'));
console.log('  1E has STATISTICS INTEGRITY:', patched.includes('STATISTICS INTEGRITY'));
console.log('  1E has CAUSATION VS CORRELATION:', patched.includes('CAUSATION VS CORRELATION'));
console.log('  2G has table STATISTICS INTEGRITY:', patched.includes('NEVER invent precise percentages'));
console.log('  2J has VERBATIM TEST:', patched.includes('VERBATIM TEST'));
console.log('  2J has ADJUSTED vs UNADJUSTED:', patched.includes('ADJUSTED vs UNADJUSTED'));
console.log('  2J has STATISTICAL PRECISION AUDIT:', patched.includes('STATISTICAL PRECISION AUDIT'));
console.log('  2J has CAUSATION LANGUAGE AUDIT:', patched.includes('CAUSATION LANGUAGE AUDIT'));
