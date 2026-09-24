// Script to patch admin-ui.html with improved anti-hallucination prompts and URL sanitizer
const fs = require('fs');

let html = fs.readFileSync('admin-ui.html', 'utf8');

// ============================================================================
// 1. PATCH Step 2H systemPrompt
// ============================================================================
html = html.replace(
  `systemPrompt:'You are an expert editorial researcher and citation specialist. You add genuine, verifiable excerpts and authoritative quotes to strengthen E-E-A-T without hallucinating quotes or dead links.',`,
  `systemPrompt:'You are an expert editorial researcher and citation specialist. You add genuine, verifiable excerpts and authoritative quotes to strengthen E-E-A-T. You NEVER fabricate quotes or invent URLs. You NEVER insert off-topic links.',`
);

// ============================================================================
// 2. PATCH Step 2H userPrompt
// ============================================================================
const old2HUser = `userPrompt:'Add 2-3 genuine, verbatim excerpts or authoritative quotes to this article about \\'{{keyword}}\\'.\\n\\nArticle:\\n{{article}}\\n\\nResearch Context (Verified Sources & Data):\\n{{info_gain}}\\n{{serp_data}}\\n\\nSTRICT VERBATIM QUOTE & PERMANENT CANONICAL URL RULES:\\n1. You may take an exact verbatim excerpt from ANY authoritative content: official documentation (Google Search Central, Microsoft, Atlassian, OpenAI, Anthropic), recognized industry standards/publications, university extensions, government portals (.gov), or canonical Wikipedia topic articles. It does NOT have to be strictly an academic study.\\n2. The excerpt inside quotation marks MUST be the exact, verbatim phrasing from that source.\\n3. The URL MUST be a real, permanent canonical URL on the open web (e.g. canonical Wikipedia topic pages https://en.wikipedia.org/wiki/..., official documentation https://developers.google.com/..., .gov, .edu, arXiv). NEVER invent newsroom or commercial PR wire slugs (e.g. gartner.com/newsroom/..., forbes.com/...) that result in dead links or bot-blocks (403/404).\\n4. BRAND INTEGRITY: Always format company brand as \\'JetDigitalPro\\' (one word, PascalCase). Never write \\'jet digital pro\\'.\\n5. Format quotes strictly as Markdown blockquotes:\\n   > "Verbatim or accurate landmark quote." — [Author / Organization, Source Name, Year](Verified Canonical URL)\\n6. Integrate naturally after relevant claims throughout the article.\\n7. Return the FULL revised article in Markdown. Standard text, blockquotes, tables, and lists only. No ASCII diagrams, flowchart arrows, or numbered headings.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

const new2HUser = `userPrompt:'Add 2-3 genuine, verifiable quotes or authoritative institutional citations to this article about \\'{{keyword}}\\'.\\n\\nArticle:\\n{{article}}\\n\\nResearch Context (Verified Sources & Data):\\n{{info_gain}}\\n{{serp_data}}\\n\\nSTRICT ANTI-HALLUCINATION & CITATION RULES:\\n1. TOPICAL RELEVANCE MANDATE: Every quote and external link MUST directly relate to \\'{{keyword}}\\' and its specific subject domain. Never insert medical links into gardening articles, or unrelated technology links into health articles. Match the domain expertise to the article topic.\\n2. VERIFIABLE GROUNDING: Every quote must be a real, documented statement from an actual recognized authority in this field. If you cannot recall the exact verbatim wording with 100% certainty, use an official consensus definition or published guideline from a governing body instead.\\n3. NO FABRICATION: If an exact verbatim quote from a named person is not 100% historically documented in public literature, DO NOT invent it. Use an official institutional definition, standard, or guideline statement instead.\\n4. PERMANENT CANONICAL OPEN URLS — STRICT FORMAT:\\n   - Wikipedia disambiguation pages: MUST percent-encode parentheses. Write https://en.wikipedia.org/wiki/Jira_%28software%29 NOT Jira_(software). This prevents Markdown link syntax from breaking.\\n   - Official docs: https://developers.google.com/..., https://support.atlassian.com/...\\n   - Academic: https://doi.org/..., https://arxiv.org/abs/..., https://pubmed.ncbi.nlm.nih.gov/...\\n   - Gov/Edu: .gov, .edu root or well-known paths only. Do NOT invent deep file paths.\\n   - STRICTLY FORBIDDEN: NEVER invent commercial newsroom/PR slugs (gartner.com/newsroom/..., forbes.com/sites/..., bloomberg.com/...).\\n5. BRAND INTEGRITY: Always format company brand as \\'JetDigitalPro\\' (one word, PascalCase).\\n6. Format quotes strictly as Markdown blockquotes:\\n   > "Verbatim documented statement or official consensus definition." — [Author / Organization, Source Name, Year](Verified Canonical URL)\\n7. Integrate naturally after relevant claims throughout the article.\\n8. Return the FULL revised article in Markdown. Standard text, blockquotes, tables, and lists only. No ASCII diagrams, flowchart arrows, or numbered headings.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

if (html.includes(old2HUser)) {
  html = html.replace(old2HUser, new2HUser);
  console.log('✓ Patched Step 2H userPrompt');
} else {
  console.log('⚠ Could not find exact 2H userPrompt match, trying regex...');
  // Regex fallback for the user prompt line
  const regex2H = /userPrompt:'Add 2-3 genuine, verbatim excerpts or authoritative quotes to this article about[^']*?No ASCII diagrams, flowchart arrows, or numbered headings\.', temp:0\.3, maxTokens:4500, outputFormat:'markdown' },/;
  if (regex2H.test(html)) {
    html = html.replace(regex2H, new2HUser);
    console.log('✓ Patched Step 2H userPrompt via regex');
  } else {
    console.log('✗ FAILED to patch Step 2H userPrompt');
  }
}

// ============================================================================
// 3. PATCH Step 4B userPrompt
// ============================================================================
const old4BUser = `userPrompt:'Add 2-3 high-quality external links to authoritative sources supporting key factual claims in this article about \\'{{keyword}}\\'.\\n\\nArticle:\\n{{article}}\\n\\nResearch Data & Verified Sources:\\n{{info_gain}}\\n{{external_links}}\\n\\nSTRICT URL & CITATION INTEGRITY RULES:\\n1. Every link MUST point to a real, permanent, publicly accessible open domain (DOI https://doi.org/..., arXiv https://arxiv.org/..., PubMed, .gov, .edu, or Wikipedia).\\n2. NEVER invent commercial newsroom slugs (e.g. gartner.com/en/newsroom/..., forbes.com/...) that trigger 404 or 403 bot challenges.\\n3. BRAND INTEGRITY: Ensure company brand is strictly \\'JetDigitalPro\\' (never \\'jet digital pro\\').\\n4. Integrate via contextual anchor text (e.g., "According to [American Academy of Sleep Medicine](URL)..." or "...linked to [increased parasympathetic activity](URL)..."). Link the descriptive phrase only.\\n5. Do NOT rewrite the narrative. Insert where natural.\\n6. Return ONLY the full revised article in Markdown starting directly with the H1 title. No commentary, no Before/After preamble. Strict formatting: text, tables, and lists only. No numbered headings.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

const new4BUser = `userPrompt:'Add 2-3 high-quality external links to authoritative open-web sources supporting key factual claims in this article about \\'{{keyword}}\\'.\\n\\nArticle:\\n{{article}}\\n\\nResearch Data & Verified Sources:\\n{{info_gain}}\\n{{external_links}}\\n\\nSTRICT TOPICAL RELEVANCE & URL INTEGRITY RULES:\\n1. STRICT TOPICAL RELEVANCE: Every external link MUST be directly related to \\'{{keyword}}\\' and its subject domain. For gardening/plants, link to botanical databases or university extensions. For software/tech, link to official documentation or technical encyclopedias. For health, link to health institutes. NEVER use unrelated links.\\n2. PERMANENT CANONICAL OPEN URLS:\\n   - Canonical Wikipedia topic pages: https://en.wikipedia.org/wiki/<Entity_Name>. For disambiguation pages, percent-encode parentheses: write %28 and %29 instead of ( and ) to prevent Markdown breaking.\\n   - Official docs: https://support.atlassian.com, https://www.rhs.org.uk, etc.\\n   - Academic DOIs: https://doi.org/...\\n   - Gov/Edu: .gov, .edu root or well-known top-level paths only. Do NOT invent deep file paths that may 404.\\n   - NEVER fabricate commercial newsroom URLs (forbes.com, gartner.com, bloomberg.com) or deep paths that 404.\\n3. BRAND INTEGRITY: Ensure company brand is strictly \\'JetDigitalPro\\'.\\n4. Integrate via contextual anchor text. Link the descriptive phrase only.\\n5. Do NOT rewrite the narrative. Insert where natural.\\n6. Return ONLY the full revised article in Markdown starting directly with the H1 title. No commentary. Strict formatting: text, tables, and lists only. No numbered headings.', temp:0.3, maxTokens:4500, outputFormat:'markdown' },`;

if (html.includes(old4BUser)) {
  html = html.replace(old4BUser, new4BUser);
  console.log('✓ Patched Step 4B userPrompt');
} else {
  console.log('⚠ Could not find exact 4B userPrompt match, trying regex...');
  const regex4B = /userPrompt:'Add 2-3 high-quality external links to authoritative sources supporting key factual claims in this article about[^']*?No numbered headings\.', temp:0\.3, maxTokens:4500, outputFormat:'markdown' },/;
  if (regex4B.test(html)) {
    html = html.replace(regex4B, new4BUser);
    console.log('✓ Patched Step 4B userPrompt via regex');
  } else {
    console.log('✗ FAILED to patch Step 4B userPrompt');
  }
}

// ============================================================================
// 4. PATCH Step 4B systemPrompt
// ============================================================================
html = html.replace(
  `systemPrompt:'You are an expert Fact-Checker and SEO Citation Strategist. Add 2-3 high-quality external links to verified, live sources without hallucinating fake or dead links.',`,
  `systemPrompt:'You are an expert Fact-Checker and SEO Citation Strategist. Add 2-3 high-quality external links to verified, live, topically relevant sources. You NEVER hallucinate fake URLs or insert off-topic links.',`
);

// ============================================================================
// 5. PATCH sanitizeArticleContent — replace URL integrity section with expanded version
// ============================================================================
const oldSanitize = `  // URL integrity: replace known dead/bot-blocked commercial newsroom URLs with canonical open reference
  text = text.replace(/https?:\\/\\/(?:www\\.)?gartner\\.com\\/[^\\s\\)\\"\\'\\']+/gi, 'https://arxiv.org/abs/2311.09735');
  text = text.replace(/https?:\\/\\/(?:www\\.)?forbes\\.com\\/sites\\/[^\\s\\)\\"\\'\\']+/gi, 'https://en.wikipedia.org/wiki/Search_engine_optimization');

  return text;
}`;

const newSanitize = `  // URL integrity: replace known dead/bot-blocked commercial newsroom URLs with canonical open reference
  text = text.replace(/https?:\\/\\/(?:www\\.)?gartner\\.com\\/[^\\s\\)\\"\\'\\']+/gi, 'https://arxiv.org/abs/2311.09735');
  text = text.replace(/https?:\\/\\/(?:www\\.)?forbes\\.com\\/sites\\/[^\\s\\)\\"\\'\\']+/gi, 'https://en.wikipedia.org/wiki/Search_engine_optimization');
  text = text.replace(/https?:\\/\\/(?:www\\.)?bloomberg\\.com\\/[^\\s\\)\\"\\'\\']+/gi, 'https://en.wikipedia.org/wiki/Technology');
  text = text.replace(/https?:\\/\\/(?:www\\.)?wsj\\.com\\/[^\\s\\)\\"\\'\\']+/gi, 'https://en.wikipedia.org/wiki/Technology');
  text = text.replace(/https?:\\/\\/(?:www\\.)?businessinsider\\.com\\/[^\\s\\)\\"\\'\\']+/gi, 'https://en.wikipedia.org/wiki/Technology');

  // Fix broken Wikipedia parenthetical URLs: wiki/Foo_(bar) -> wiki/Foo_%28bar%29
  // LLM often outputs wiki/Jira_(software) which breaks Markdown [text](url) parsing
  text = text.replace(/\\](\\(https:\\/\\/en\\.wikipedia\\.org\\/wiki\\/[^)]*?)_(\\([^)]+\\))/g, (m, pre, paren) => {
    return '](' + pre + '_' + paren.replace('(', '%28').replace(')', '%29') + ')';
  });
  // Also fix already-in-URL parentheses that got truncated by Markdown parser
  text = text.replace(/https:\\/\\/en\\.wikipedia\\.org\\/wiki\\/([A-Za-z0-9_]+)\\(([^)]+)$/gm, (m, slug, inside) => {
    return 'https://en.wikipedia.org/wiki/' + slug + '%28' + inside + '%29';
  });

  return text;
}`;

if (html.includes(oldSanitize)) {
  html = html.replace(oldSanitize, newSanitize);
  console.log('✓ Patched sanitizeArticleContent with expanded URL integrity');
} else {
  console.log('⚠ Could not find exact sanitizeArticleContent match, trying regex...');
  // Try a simpler match
  const regexSanitize = /\/\/ URL integrity: replace known dead.*?return text;\n}/s;
  if (regexSanitize.test(html)) {
    html = html.replace(regexSanitize, newSanitize.replace('  // URL integrity', '// URL integrity'));
    console.log('✓ Patched sanitizeArticleContent via regex');
  } else {
    console.log('✗ FAILED to patch sanitizeArticleContent');
  }
}

// ============================================================================
// 6. PATCH Step 2J — strengthen fact-check to include topical relevance check
// ============================================================================
html = html.replace(
  `- Audit all external URLs: verify that every URL follows valid web standards (.gov, .edu, doi.org, pubmed, wikipedia, official domains) and is not a hallucinated fake slug.`,
  `- Audit all external URLs: verify that every URL follows valid web standards (.gov, .edu, doi.org, pubmed, wikipedia, official domains) and is not a hallucinated fake slug.\\n- Audit TOPICAL RELEVANCE of each external link: verify that every linked source is directly related to the article\\'s subject matter (\\'{{keyword}}\\'). Flag any off-topic link (e.g. medical link in a gardening article, or random tech link in a health article) as a critical issue.`
);

// ============================================================================
// 7. Add default external_links fallback based on keyword topic
// ============================================================================
html = html.replace(
  `if (!vars.external_links) {\n    vars.external_links = 'https://en.wikipedia.org, https://www.cdc.gov, https://www.nih.gov';\n  }`,
  `if (!vars.external_links) {\n    vars.external_links = 'https://en.wikipedia.org';\n  }`
);

fs.writeFileSync('admin-ui.html', html, 'utf8');
console.log('\n✅ All patches applied to admin-ui.html');

// Verify
const patched = fs.readFileSync('admin-ui.html', 'utf8');
console.log('File size:', patched.length);
console.log('Has new 2H systemPrompt:', patched.includes('You NEVER fabricate quotes or invent URLs'));
console.log('Has new 2H TOPICAL RELEVANCE:', patched.includes('TOPICAL RELEVANCE MANDATE'));
console.log('Has new 4B systemPrompt:', patched.includes('topically relevant sources'));
console.log('Has Wikipedia paren fix:', patched.includes('Fix broken Wikipedia parenthetical URLs'));
console.log('Has 2J topical check:', patched.includes('Audit TOPICAL RELEVANCE'));
console.log('Has simplified ext fallback:', !patched.includes('https://www.cdc.gov, https://www.nih.gov'));
