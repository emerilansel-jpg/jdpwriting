// Patch v3: Fix root cause — Step 1B fabricates research, all downstream hallucinates
const fs = require('fs');

let html = fs.readFileSync('admin-ui.html', 'utf8');
let changes = 0;

// ============================================================================
// 1. STEP 1B — COMPLETE REWRITE
//    ROOT CAUSE: Prompt asks LLM to "search using filetype operators" and
//    "find 20 statistics with URLs" but LLM CANNOT search the web.
//    It fabricates the entire research output: fake PDFs, fake DOIs, fake stats.
//    
//    FIX: Knowledge-only mode. LLM outputs what it genuinely knows from training
//    data. Each stat gets a confidence tag. NO URLs allowed in 1B output —
//    URLs are added later by 2H/4B using only canonical patterns (Wikipedia, DOI).
// ============================================================================
const old1BSys = `systemPrompt:'You are an Information Gain Researcher specializing in deep-web file retrieval for blog content. Given a topic, search using filetype operators (pdf, ppt, docx, xlsx) and prioritize .gov/.edu/NGO sources. Find verifiable statistics with source attribution.',`;

const new1BSys = `systemPrompt:'You are a Knowledge-Based Research Analyst. You synthesize what you genuinely know from your training data about a topic. You NEVER fabricate statistics, URLs, or source documents. You clearly mark your confidence level for each finding. You DO NOT pretend to search the web or access files — you report knowledge you actually have.',`;

if (html.includes(old1BSys)) {
  html = html.replace(old1BSys, new1BSys);
  changes++;
  console.log('✓ Patched 1B systemPrompt');
} else {
  console.log('✗ FAILED 1B systemPrompt');
}

const old1BUser = `userPrompt:'Search for \\'{{keyword}}\\' using operators: filetype:pdf \"{{keyword}}\", site:edu filetype:ppt \"{{keyword}}\", filetype:docx \"{{keyword}}\", filetype:xlsx \"{{keyword}}\", etc. Prioritize .gov/.edu/NGO sources. Find at least 20 verifiable statistics. For each: bold key number(s), source name and year, full plain-text URL (plus clickable hyperlink), file type, suggested blog use (e.g., pull quote, embed chart, cite in intro). Flag outdated or unreliable sources. No paywalls. Output: Markdown report with: 1. Bulleted stats with details. 2. Summary table: Statistic | Source | Year | URL | File Type | Suggested Use. No in-line citations. No footnotes. Return only the report.', temp:0.5, maxTokens:2000, outputFormat:'json' },`;

const new1BUser = `userPrompt:'Provide a research briefing on \\'{{keyword}}\\' using ONLY knowledge you genuinely have from your training data.\\n\\nSTRICT ANTI-HALLUCINATION RULES:\\n1. ONLY report facts, statistics, and findings you are confident are real. Do NOT invent numbers.\\n2. For each finding, tag confidence: [HIGH] = you are very confident this is a real, well-documented finding from a named study. [MEDIUM] = you believe this is real but are not 100% certain of the exact number. [LOW] = general knowledge without a specific source.\\n3. DO NOT OUTPUT ANY URLs. No links, no DOIs, no PDF paths. URLs will be added by a separate verification step.\\n4. DO NOT pretend to search the web or access files. You are reporting from memory.\\n5. For each statistic, provide: the finding, the source name (journal/institution), approximate year, and your confidence tag.\\n\\nOutput format — JSON with these fields:\\n- topic: the keyword\\n- key_findings: array of {finding, source_name, year, confidence, suggested_use}\\n- expert_consensus: 2-3 sentences summarizing what experts broadly agree on\\n- content_gaps: topics competitors likely miss\\n- landmark_studies: array of {study_name, authors, journal, year, key_finding, confidence} — ONLY include studies you are genuinely confident exist\\n\\nAim for 10-15 findings. Quality over quantity. A finding tagged [HIGH] with no URL is infinitely better than a fabricated statistic with a fake URL.', temp:0.3, maxTokens:2000, outputFormat:'json' },`;

if (html.includes(old1BUser)) {
  html = html.replace(old1BUser, new1BUser);
  changes++;
  console.log('✓ Patched 1B userPrompt');
} else {
  console.log('✗ FAILED 1B userPrompt');
}

// ============================================================================
// 2. STEP 1E — Reinforce: stats ONLY from 1B HIGH confidence findings
//    Add explicit rule about URLs
// ============================================================================
const old1EStat = `3. Introduction (~100 words): First sentence <=40 words directly answers search intent. Include a statistic from the Research Data context below. STATISTICS INTEGRITY: Only cite specific numbers (percentages, fold-risks, exact figures) that appear in the Research Data provided. If no exact number is available for a claim, write the general finding without inventing a precise figure. NEVER fabricate statistics. If uncertain about a number, use hedging language (e.g. "research suggests" or "studies indicate") without a specific percentage.`;

const new1EStat = `3. Introduction (~100 words): First sentence <=40 words directly answers search intent. Include a statistic ONLY if it appears in the Research Data with [HIGH] confidence. STATISTICS INTEGRITY RULES: a) ONLY cite specific numbers that appear in the Research Data below AND are tagged [HIGH] confidence. b) For [MEDIUM] confidence findings, describe the general trend without citing the exact number (e.g. "research links late bedtimes to higher heart risk" instead of "25% higher risk"). c) NEVER invent a statistic. If the Research Data has no relevant number, write the claim qualitatively. d) NO URLs in article body except Wikipedia canonical pages (https://en.wikipedia.org/wiki/...). All other citations use institution name only — URLs are added in Phase 4.`;

if (html.includes(old1EStat)) {
  html = html.replace(old1EStat, new1EStat);
  changes++;
  console.log('✓ Patched 1E statistics integrity');
} else {
  console.log('✗ FAILED 1E statistics integrity');
}

// Fix 1E citation format to ban URL invention
const old1ECite = `7. Expert Citations: Include 2-3 cited statements. Use TWO formats: (A) VERBATIM QUOTE with quotation marks ONLY if you are 100% certain of exact wording from a published abstract — > "Exact text from abstract." — [Author, Journal, Year](DOI URL). (B) PARAPHRASE CITATION (DEFAULT) without quotation marks — > According to [Author (Year)](DOI), [paraphrased finding]. NEVER put quotation marks around text you composed yourself. URLs must be real DOI or permanent open links. NEVER invent newsroom slugs.`;

const new1ECite = `7. Expert Citations: Include 2-3 cited statements from the Research Data. Use TWO formats:\\n   (A) VERBATIM QUOTE — ONLY if the Research Data contains a [HIGH] confidence landmark study AND you are 100% certain of the exact abstract wording: > \"[Exact text]\" — [Author et al., Journal, Year]\\n   (B) PARAPHRASE CITATION (DEFAULT) — no quotation marks: > According to [Institution/Author (Year)], [finding in your own words].\\n   CRITICAL URL RULE: Do NOT include any URLs in citations during article generation. URLs are injected in Phase 4 (Steps 4A/4B). Write citations with author/institution names only. NEVER invent DOIs, PDF links, or institutional deep paths.`;

if (html.includes(old1ECite)) {
  html = html.replace(old1ECite, new1ECite);
  changes++;
  console.log('✓ Patched 1E citation URL ban');
} else {
  console.log('✗ FAILED 1E citation URL ban');
}

// ============================================================================
// 3. STEP 2H — Restore verbatim quotes for well-known studies, ban URL invention
// ============================================================================
const old2HSys = `systemPrompt:'You are an expert editorial researcher and citation specialist who strengthens E-E-A-T with real, verifiable citations. CARDINAL RULE: You can ONLY quote text that appears verbatim in a published paper\\'s abstract or conclusion. If you are not 100% certain of the exact wording, you MUST use a PARAPHRASE CITATION instead (no quotation marks). You NEVER fabricate quotes, invent URLs, or insert off-topic links.',`;

const new2HSys = `systemPrompt:'You are an expert editorial researcher who strengthens E-E-A-T with real, verifiable citations. You have TWO citation modes:\\n- VERBATIM QUOTE: Use ONLY for landmark studies whose abstract text you genuinely know from training data (e.g. major WHO/CDC/NIH policy statements, seminal papers with >1000 citations). You must be 100% certain of the exact wording.\\n- PARAPHRASE CITATION (default): Describe the finding in your own words without quotation marks. This is always safe.\\nYou NEVER fabricate quotes or invent URLs. For URLs, use ONLY: Wikipedia canonical pages, or institutional root domains (cdc.gov, who.int, nih.gov). NEVER invent deep paths, PDF links, or DOIs unless you are 100% certain they exist.',`;

if (html.includes(old2HSys)) {
  html = html.replace(old2HSys, new2HSys);
  changes++;
  console.log('✓ Patched 2H systemPrompt');
} else {
  console.log('✗ FAILED 2H systemPrompt');
}

// Patch 2H userPrompt — fix URL rules
const old2HUrlRule = `4. DOI PREFERRED: Link to https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/... when citing research papers. For official statements, link to the institutional page.\\n5. PERMANENT CANONICAL OPEN URLS:\\n   - Wikipedia disambiguation: percent-encode parens (%28 %29).\\n   - NEVER invent commercial newsroom slugs or deep file paths.`;

const new2HUrlRule = `4. URL RULES — CRITICAL ANTI-HALLUCINATION:\\n   - SAFE URLs (use these): Wikipedia canonical pages (https://en.wikipedia.org/wiki/...), institutional ROOT domains (https://www.cdc.gov, https://www.who.int, https://www.nih.gov).\\n   - RISKY URLs (NEVER use unless 100% certain): DOIs, PubMed IDs, PDF links, deep institutional paths. These are the #1 source of hallucinated links.\\n   - If you are not 100% certain a URL exists, cite the institution name WITHOUT a URL. Write: [Institution Name] instead of [Institution Name](maybe-fake-url).\\n   - Wikipedia disambiguation: percent-encode parens (%28 %29).\\n   - NEVER invent newsroom slugs, PDF paths, or DOIs from memory.`;

if (html.includes(old2HUrlRule)) {
  html = html.replace(old2HUrlRule, new2HUrlRule);
  changes++;
  console.log('✓ Patched 2H URL rules');
} else {
  console.log('✗ FAILED 2H URL rules');
}

// ============================================================================
// 4. STEP 2G — Ban URL invention in tables
// ============================================================================
const old2GLink = `Every claim/number must have specific-page hyperlink: [Claim](url). If missing URL: [GEO NOTE: missing specific URL].`;

const new2GLink = `Every claim/number should reference the source institution or study by name. Do NOT invent hyperlinks — write [Source Name, Year] as plain text. URLs will be added in Phase 4.`;

if (html.includes(old2GLink)) {
  html = html.replace(old2GLink, new2GLink);
  changes++;
  console.log('✓ Patched 2G table URL ban');
} else {
  console.log('✗ FAILED 2G table URL ban');
}

// ============================================================================
// 5. STEP 4B — External linking: only add URLs to existing citations, verify
// ============================================================================
const old4BSys = `systemPrompt:'You are an expert Fact-Checker and SEO Citation Strategist. Add 2-3 high-quality external links to verified, live, topically relevant sources. You NEVER hallucinate fake URLs or insert off-topic links.',`;

const new4BSys = `systemPrompt:'You are an expert Citation URL Resolver. Your job is to add verified URLs to existing citations in the article. You match institution/study names already in the text to their real canonical URLs. You ONLY use URLs you are 100% certain exist: Wikipedia pages, institutional homepages (.gov, .edu, .org), and well-known DOIs. You NEVER invent deep paths, PDF links, or DOIs from memory. If you cannot find a verified URL for a citation, leave it as plain text.',`;

if (html.includes(old4BSys)) {
  html = html.replace(old4BSys, new4BSys);
  changes++;
  console.log('✓ Patched 4B systemPrompt');
} else {
  console.log('✗ FAILED 4B systemPrompt');
}

// Patch 4B user prompt
const old4BUserStart = `userPrompt:'Add 2-3 high-quality external links to authoritative open-web sources supporting key factual claims in this article about \\'{{keyword}}\\'.`;
const old4BUserEnd = `6. Return ONLY the full revised article in Markdown starting directly with the H1 title. No commentary. Strict formatting: text, tables, and lists only. No numbered headings.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

const idx4Bstart = html.indexOf(old4BUserStart);
const idx4Bend = html.indexOf(old4BUserEnd);

if (idx4Bstart !== -1 && idx4Bend !== -1) {
  const before = html.substring(0, idx4Bstart);
  const after = html.substring(idx4Bend + old4BUserEnd.length);

  const new4BUser = `userPrompt:'Add verified external links to existing citations and key claims in this article about \\'{{keyword}}\\'.\\n\\nArticle:\\n{{article}}\\n\\nResearch Data:\\n{{info_gain}}\\n{{external_links}}\\n\\nYour task: Find institution/study names already mentioned in the article text and add real URLs to them.\\n\\nSTRICT URL VERIFICATION RULES:\\n1. SAFE URLs (use freely):\\n   - Wikipedia canonical: https://en.wikipedia.org/wiki/<Topic> (percent-encode parens for disambiguation)\\n   - Institutional homepages: https://www.cdc.gov, https://www.who.int, https://www.nih.gov, https://www.aap.org, https://www.heart.org\\n   - Well-known section pages: https://www.cdc.gov/sleep, https://www.nhlbi.nih.gov/health/sleep\\n2. RISKY URLs (ONLY if 100% certain they exist):\\n   - DOIs: https://doi.org/10.xxxx/... — only use if you genuinely know the DOI\\n   - PubMed: https://pubmed.ncbi.nlm.nih.gov/PMID/ — only if you know the PMID\\n3. FORBIDDEN URLs (NEVER use):\\n   - PDF direct links (almost always hallucinated)\\n   - Deep institutional paths with specific filenames\\n   - Commercial newsroom slugs (gartner, forbes, bloomberg)\\n   - Any URL you are constructing from memory rather than genuinely recalling\\n4. If a citation mentions an institution but you cannot verify the exact URL, link to the institutional ROOT domain or leave as plain text.\\n5. BRAND INTEGRITY: \\'JetDigitalPro\\'.\\n6. Return ONLY the full revised article in Markdown starting with H1. No commentary.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

  html = before + new4BUser + after;
  changes++;
  console.log('✓ Patched 4B userPrompt');
} else {
  console.log('✗ FAILED 4B userPrompt — start:', idx4Bstart, 'end:', idx4Bend);
}

// ============================================================================
// WRITE & VERIFY
// ============================================================================
fs.writeFileSync('admin-ui.html', html, 'utf8');
console.log(`\n✅ Applied ${changes} patches to admin-ui.html`);

// Verify
const p = fs.readFileSync('admin-ui.html', 'utf8');
console.log('\nVerification:');
console.log('  1B has Knowledge-Based:', p.includes('Knowledge-Based Research Analyst'));
console.log('  1B has NO URLs rule:', p.includes('DO NOT OUTPUT ANY URLs'));
console.log('  1B has confidence tags:', p.includes('[HIGH]'));
console.log('  1E has HIGH confidence only:', p.includes('ONLY if it appears in the Research Data with [HIGH] confidence'));
console.log('  1E has URL ban in body:', p.includes('NO URLs in article body except Wikipedia'));
console.log('  1E has Phase 4 URL delegation:', p.includes('URLs are injected in Phase 4'));
console.log('  2H has verbatim for landmarks:', p.includes('landmark studies whose abstract text'));
console.log('  2H has safe URL tiers:', p.includes('SAFE URLs'));
console.log('  2G has URL ban in tables:', p.includes('Do NOT invent hyperlinks'));
console.log('  4B has Citation URL Resolver:', p.includes('Citation URL Resolver'));
console.log('  4B has SAFE/RISKY/FORBIDDEN:', p.includes('FORBIDDEN URLs'));
