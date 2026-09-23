# JDP Pipeline v2.1 — Prompt Templates Reference

> Complete reference for all 23 steps in the autonomous research-to-publish pipeline.
> Last updated: June 2026
> **Version 2.1** — Granular Phase 2 (EEAT/HCU/EAV + Quality/Fact Check + SEO/GEO Evaluator) + Consolidated Phase 3 (Image Prompts + Infographic + Alt Text)

---

## Table of Contents

- [Phase 1: Research & Generation](#phase-1-research--generation)
  - [1A AI SERP Research](#1a-ai-serp-research)
  - [1B Information Gain](#1b-information-gain)
  - [1C LSI Keywords](#1c-lsi-keywords)
  - [1D Outline Creation](#1d-outline-creation)
  - [1E Generate Article](#1e-generate-article)
- [Phase 2: Optimization](#phase-2-optimization)
  - [2A Title & Meta](#2a-title--meta)
  - [2B Intro Rewrite](#2b-intro-rewrite)
  - [2C Originality Rewrite](#2c-originality-rewrite)
  - [2D Fluff Check](#2d-fluff-check)
  - [2E FAQ Generation](#2e-faq-generation)
  - [2F Conclusion Optimizer](#2f-conclusion-optimizer)
  - [2G Add Table](#2g-add-table)
  - [2H Find & Embed Quotes](#2h-find--embed-quotes)
  - [2I EEAT+HCU+EAV Analysis](#2i-eeathcueav-analysis)
  - [2J Quality + Fact Check Analysis](#2j-quality--fact-check-analysis)
  - [2K SEO/GEO Evaluator](#2k-seogeo-evaluator)
- [Phase 3: Images](#phase-3-images)
  - [3A Image Prompts (Consolidated)](#3a-image-prompts-consolidated)
  - [3B Infographic Image Prompt](#3b-infographic-image-prompt)
  - [3C Alt Text Generation](#3c-alt-text-generation)
- [Phase 4: Linking](#phase-4-linking)
  - [4A Internal Linking](#4a-internal-linking)
  - [4B External Linking](#4b-external-linking)
- [Phase 5: Publish](#phase-5-publish)
  - [5A WordPress Publish](#5a-wordpress-publish)
- [Phase 6: Index](#phase-6-index)
  - [6A Request Indexing](#6a-request-indexing)

---

## Phase 1: Research & Generation

### 1A AI SERP Research

**Model:** `gpt-4o-mini` | **Output:** JSON | **Temp:** 0.3 | **Max Tokens:** 2000

**System Prompt:**
```
You are an expert SEO research analyst with deep knowledge of Google Search results patterns. You simulate SERP analysis by drawing on your knowledge of what typically ranks for any given keyword, including heading structures, content patterns, gaps, and competitive landscape.
```

**User Prompt Template:**
```
Perform a comprehensive SERP analysis for the keyword "{{keyword}}". Use your knowledge of search engine results to simulate what the top 10 results would look like.

Return JSON with:
- heading_patterns: array of common H2/H3 structures from typical top-ranking results
- avg_word_count: estimated average word count for top results
- content_gaps: array of topics/angles that are typically missing or undercovered
- snippet_type: paragraph/list/table (most likely featured snippet format for this query)
- paa_questions: array of 5-7 People Also Ask questions typically associated with this keyword
- dominant_intent: informational/commercial/transactional/navigational
- competitor_weaknesses: array of opportunities to outrank typical competitors
- freshness_signals: whether content in this space tends to be outdated or recent
- key_sources: array of authoritative domains that typically rank for this topic
- common_format: how top results structure their content (listicle, guide, comparison, etc.)
```

**n8n Implementation Notes:**
- No external SERP API needed. The AI itself generates the analysis based on its training data.
- Simply call the LLM with the keyword and the system prompt handles the rest.
- Store output as `serp_data` for downstream steps (1B, 1D, 1E).
- This is a simulation, not real-time data, but it captures typical patterns well enough for content strategy.

---

### 1B Information Gain

**Model:** `deepseek-chat` | **Output:** JSON | **Temp:** 0.5 | **Max Tokens:** 2000

**System Prompt:**
```
You are an expert content strategist specializing in information gain — finding what valuable content is missing from existing search results that users actually need.
```

**User Prompt Template:**
```
Based on this SERP analysis for "{{keyword}}":

{{serp_data}}

Identify information gaps and unique angles:

1. Information gaps — what do users need but no current result covers well?
2. Unique angles — how can our content be genuinely different and better?
3. Depth opportunities — where can we go significantly deeper than competitors?
4. Expertise signals — what first-hand experience, data, or case studies can we add?
5. Freshness gaps — what outdated information can we update with current data?
6. Multimedia gaps — are competitors missing visuals, tables, or comparisons?
7. Audience segments — are there underserved reader personas?

Return JSON with actionable insights for each category.
```

**n8n Implementation Notes:**
- Receives `serp_data` from step 1A
- Store output as `info_gain` for downstream steps
- Focus on actionable, specific insights — not generic advice

---

### 1C LSI Keywords

**Model:** `gpt-4o-mini` | **Output:** JSON | **Temp:** 0.3 | **Max Tokens:** 1500

**System Prompt:**
```
You are a semantic SEO expert who discovers latent semantic indexing keywords, related concepts, and named entities that help content rank for topic clusters, not just single keywords.
```

**User Prompt Template:**
```
For the topic "{{keyword}}", based on this research context:

{{prev_output}}

Generate comprehensive semantic keyword data:

1. Primary LSI keywords (20 terms) — closely related to main topic
2. Secondary LSI keywords (15 terms) — supporting concepts
3. Semantic entities (10 named entities) — people, organizations, places, brands
4. Topical clusters (5 sub-topics) — content clusters to cover
5. Question-based keywords (10) — questions users ask
6. Long-tail variations (10) — specific search phrases
7. Related concepts (10) — broader topic associations

Return JSON with all categories as arrays.
```

**n8n Implementation Notes:**
- Can receive either `serp_data` or `info_gain` as `{{prev_output}}` depending on pipeline flow
- Store output as `lsi_keywords` for downstream steps
- These keywords will be used in outline headings and article body

---

### 1D Outline Creation

**Model:** `deepseek-chat` | **Output:** Markdown | **Temp:** 0.4 | **Max Tokens:** 2000

**System Prompt:**
```
You are a senior content strategist who creates comprehensive, search-intent-matched article outlines based on SERP research, information gaps, and semantic keyword data.
```

**User Prompt Template:**
```
Create a detailed article outline for "{{keyword}}" using this research data:

**SERP Analysis:**
{{serp_data}}

**Information Gain Insights:**
{{info_gain}}

**LSI Keywords & Entities:**
{{lsi_keywords}}

Requirements:
- Match the dominant search intent perfectly
- Cover all information gaps identified
- Use LSI keywords naturally in H2 and H3 headings
- Structure for featured snippets (list, table, paragraph where appropriate)
- Include a dedicated FAQ section plan
- Plan for internal links: {{internal_links}}
- Plan for CTA placement: {{cta}}
- Target 1500-2500 words total
- Each section should have a clear purpose and estimated word count
- CRITICAL HEADING RULE: Do NOT number any headings or section titles (never write "1.", "2.", "Section 1:", etc. in headings). All headings (H2, H3) must be unnumbered topical titles or questions.
- Strict format rule: Outline and article must strictly use ONLY standard prose paragraphs, structured Markdown tables, and Markdown lists (ordered/bulleted). STRICTLY FORBIDDEN: ASCII art, text flowcharts, arrow diagrams, box flows ([ A ] ↓ [ B ]), or code blocks (```) used for formatting. Any process or workflow must be outlined strictly as numbered steps or comparison tables.

Return a complete outline with H2, H3, and bullet points describing each section.
```

**n8n Implementation Notes:**
- Requires all three research inputs: `serp_data`, `info_gain`, `lsi_keywords`
- Store output as `outline` for step 1E
- The outline is the single most important artifact — it determines article quality

---

### 1E Generate Article

**Model:** `deepseek-chat` | **Output:** Markdown | **Temp:** 0.7 | **Max Tokens:** 5000

**System Prompt:**
```
You are an expert SEO content writer who writes comprehensive, factual, engaging articles optimized for both human readers and AI search engines. You write from detailed outlines and incorporate research context seamlessly.
```

**User Prompt Template:**
```
Write a comprehensive article based on this outline for "{{keyword}}":

**Outline:**
{{outline}}

**Research Context:**
SERP Analysis: {{serp_data}}
Information Gain: {{info_gain}}
LSI Keywords: {{lsi_keywords}}

Requirements:
- Target ~2000 words in American English
- Follow the outline structure exactly
- Title: H1 (50-60 chars, keyword-first, benefit-driven)
- Meta Description: 150-160 chars labeled "Meta description:"
- First paragraph under H1 directly answers main search intent (<=40 words)
- First paragraph under each H2 must provide a concise direct answer (<=40 words) for AI snippet & GEO citation
- CRITICAL HEADING RULE: Do NOT number any headings or section titles (never write "## 1. Title", "## 2. ...", or "## Section 1:"). All headings (H2, H3) must be unnumbered topical titles or questions.
- Include at least 1 structured Markdown comparison table (3-5 columns, >=3 rows)
- Include at least 3 statistics from authoritative sources with citations
- Include 2-3 cited expert statements formatted as > "Quote." — [Author/Institution, Year](URL)
- Use LSI keywords naturally throughout (not stuffed)
- Include 3-5 FAQ Q&As matching common user query patterns
- READABILITY MANDATE: Write in clear, active, engaging American English at an accessible 7th-grade to 8th-grade reading level (Flesch-Kincaid 7.0–8.0, Flesch Reading Ease 65–75). Keep sentences clear, punchy, and direct (average 12–16 words). Avoid dense academic jargon.
- Tone: authoritative yet engaging human voice, active voice, sentence variety, no AI clichés
- Brand integrity: Always format company brand strictly as 'JetDigitalPro' (one word, PascalCase).
- Internal links to incorporate (may be multiple): {{internal_links}}
- End with a strong conclusion + CTA: {{cta}}
- STRICT CONTENT FORMATTING RULE: The article must consist ONLY of: 1) Standard prose paragraphs with H1, H2, H3 headings, bold text, and blockquotes (>); 2) Structured Markdown comparison tables (| Col 1 | Col 2 |); 3) Numbered or bulleted Markdown lists.
  STRICTLY FORBIDDEN:
  - NO ASCII art, text boxes, flowcharts, or process maps.
  - NO bracketed box chains or arrows (NEVER write [ Step 1 ] ↓ [ Step 2 ] or [ Action ] → [ Outcome ]).
  - NO code blocks (```) used for formatting, diagrams, or workflows.
  Any multi-step protocol, transition, mechanism, or routine MUST be presented exclusively as a standard numbered list (1., 2., 3.) or a Markdown table.
```

**n8n Implementation Notes:**
- This is the main article generation step — receives the full research context
- Store output as `article` for Phase 2 optimization steps
- All downstream optimization steps use `{{article}}` variable

---

## Phase 2: Optimization

### 2A Title & Meta

**Model:** `gpt-4o` | **Output:** JSON | **Temp:** 0.5 | **Max Tokens:** 600

**System Prompt:**
```
You are an SEO copywriter specializing in CTR optimization and meta tag engineering.
```

**User Prompt Template:**
```
Generate SEO metadata for this article about "{{keyword}}":
1. SEO title (50-60 chars, click-worthy, include keyword)
2. Meta description (150-160 chars + CTA hook)
3. URL slug (short, keyword-rich, no stop words)
4. Social share title (Open Graph, 60-90 chars)
5. Social share description (Open Graph, 150-200 chars)

Article:
{{article}}

Return JSON: {"title":"","meta_description":"","slug":"","og_title":"","og_description":""}
```

---

### 2B Intro Rewrite

**Model:** `gpt-4o-mini` | **Output:** Markdown | **Temp:** 0.6 | **Max Tokens:** 300

**System Prompt:**
```
You are a content editor specializing in opening hooks that reduce bounce rate and increase dwell time.
```

**User Prompt Template:**
```
Rewrite the introduction of this article about "{{keyword}}" so the first sentence directly answers the search intent in a compelling way. Max 150 words. Use a hook pattern (statistic, question, or bold statement).

Article:
{{article}}
```

---

### 2C Originality Rewrite

**Model:** `pesat-flash` | **Output:** Markdown | **Temp:** 0.7 | **Max Tokens:** 5000

**System Prompt:**
```
You are a content originality expert. Rephrase content to be unique, natural, and pass AI detection tools while preserving all factual information and structure at an accessible 7th-grade reading level.
```

**User Prompt Template:**
```
Rephrase this article to be highly unique, natural-sounding, and pass AI detection tools. Keep all facts, headings, and structure intact.
READABILITY MANDATE: Rewrite the text to achieve a clear, highly accessible 7th-grade reading level (Flesch-Kincaid Grade Level 7.0–8.0, Flesch Reading Ease score 65–75). Use clear, direct sentences (average 12–15 words). Break dense academic clauses into everyday plain English that any high school reader grasps instantly.
FORMAT ENFORCEMENT: Content must strictly consist ONLY of standard paragraphs, markdown tables, blockquotes, and lists. If any ASCII diagrams, bracketed box flows ([ A ] ↓ [ B ]), or arrow chains exist, convert them immediately into clean numbered lists or prose text. Never output code blocks for diagrams or arrows. Never number headings. Brand is JetDigitalPro.

Article:
{{article}}
```

---

### 2D Fluff Check

**Model:** `pesat-flash` | **Output:** Markdown | **Temp:** 0.3 | **Max Tokens:** 4000

**System Prompt:**
```
You are a ruthless editor who eliminates all filler words, redundant phrases, and padding while preserving every substantive fact and data point at an accessible 7th-grade reading level.
```

**User Prompt Template:**
```
Remove all filler words, redundant phrases, and empty sentences from this article. Keep all facts, statistics, and substantive content. Tighten every sentence. Remove phrases like "it is important to note," "in conclusion," "as mentioned earlier," etc. unless they serve a structural purpose. Break up long sentences to maintain an accessible 7th-grade reading level (average 12–15 words per sentence).
FORMAT ENFORCEMENT: Ensure content consists exclusively of clean prose, markdown tables, blockquotes, and lists. Completely remove or convert any ASCII diagrams, box chains, arrows (↓, →), or faux diagram code blocks into clean numbered lists or standard paragraphs. Brand is JetDigitalPro.

Article:
{{article}}
```

---

### 2E FAQ Generation

**Model:** `gpt-4o` | **Output:** JSON | **Temp:** 0.4 | **Max Tokens:** 1200

**System Prompt:**
```
You are an SEO expert specializing in FAQ schema and People Also Ask optimization.
```

**User Prompt Template:**
```
Generate 5-7 FAQ Q&As for "{{keyword}}". Match real People Also Ask query patterns. Answers must be 40-60 words, direct, factual. Include schema-ready HTML if needed.

Article context:
{{article}}

Return JSON: [{"question":"","answer":"","schema_type":"FAQPage"}]
```

---

### 2F Conclusion Optimizer

**Model:** `gpt-4o` | **Output:** Markdown | **Temp:** 0.6 | **Max Tokens:** 400

**System Prompt:**
```
You are a conversion rate optimization expert who crafts conclusions that drive action.
```

**User Prompt Template:**
```
Rewrite the conclusion: 3 key takeaways + CTA: {{cta}} + one actionable next step. Max 200 words. Make it feel personal and urgent.

Article:
{{article}}
```

---

### 2G Add Table

**Model:** `gpt-4o` | **Output:** Markdown | **Temp:** 0.4 | **Max Tokens:** 4500

**System Prompt:**
```
You are an information design expert who creates scannable, SEO-friendly data tables.
```

**User Prompt Template:**
```
Create a comparison or data table for "{{keyword}}" (3-5 columns, Markdown format). Insert it after the first H2 where it fits naturally. Return the FULL article with the table integrated.
Strict format rule: Standard Markdown table only (| Col 1 | Col 2 |). Never use ASCII box art, unicode arrows, or code block diagrams.

Article:
{{article}}
```

---

### 2H Find & Embed Quotes

**Model:** `pesat-flash` | **Output:** Markdown | **Temp:** 0.3 | **Max Tokens:** 4500

**System Prompt:**
```
You are an expert editorial researcher and citation specialist. You add genuine, verifiable excerpts and authoritative quotes to strengthen E-E-A-T without hallucinating quotes or dead links.
```

**User Prompt Template:**
```
Add 2-3 genuine, verbatim excerpts or authoritative quotes to this article about '{{keyword}}'.

Article:
{{article}}

Research Context (Verified Sources & Data):
{{info_gain}}
{{serp_data}}

STRICT VERBATIM QUOTE & PERMANENT CANONICAL URL RULES:
1. You may take an exact verbatim excerpt from ANY authoritative content: official documentation (Google Search Central, Microsoft, Atlassian, OpenAI, Anthropic), recognized industry standards/publications, university extensions, government portals (.gov), or canonical Wikipedia topic articles. It does NOT have to be strictly an academic study.
2. The excerpt inside quotation marks MUST be the exact, verbatim phrasing from that source.
3. The URL MUST be a real, permanent canonical URL on the open web (e.g. canonical Wikipedia topic pages https://en.wikipedia.org/wiki/..., official documentation https://developers.google.com/..., .gov, .edu, arXiv). NEVER invent newsroom or commercial PR wire slugs (e.g. gartner.com/newsroom/..., forbes.com/...) that result in dead links or bot-blocks (403/404).
4. BRAND INTEGRITY: Always format company brand as 'JetDigitalPro' (one word, PascalCase). Never write 'jet digital pro'.
5. Format quotes strictly as Markdown blockquotes:
   > "Verbatim or accurate landmark quote." — [Author / Organization, Source Name, Year](Verified Canonical URL)
6. Integrate naturally after relevant claims throughout the article.
7. Return the FULL revised article in Markdown. Standard text, blockquotes, tables, and lists only. No ASCII diagrams, flowchart arrows, or numbered headings.
```

---

### 2I EEAT+HCU+EAV Analysis

**Model:** `claude-sonnet-4-6` | **Output:** JSON | **Temp:** 0.2 | **Max Tokens:** 2500

**System Prompt:**
```
You are a Google Search Quality Evaluator with deep expertise in E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness), Helpful Content Updates (HCU), and Entity-Awareness Validation (EAV). You perform deep-dive analysis on content to identify structural and signal-level gaps. Your analysis is methodical, specific, and actionable.
```

**User Prompt Template:**
```
Perform a comprehensive EEAT+HCU+EAV analysis on this article about "{{keyword}}". Analyze every dimension and provide specific, actionable improvement recommendations.

**Article:**
{{article}}

**SERP Context:**
{{serp_data}}

**E-E-A-T Analysis (7 parameters, score 0-10 each):**
1. Experience signals — first-hand evidence, case studies, personal testing data, "I tried this" moments
2. Expertise markers — credentials, depth, technical accuracy, nuanced understanding, domain knowledge
3. Authority building — citations, expert quotes, authoritative source linking, domain reputation signals
4. Trustworthiness — factual accuracy, transparency, bias disclosure, about/author page signals
5. YMYL compliance — medical/financial/legal safety warnings, disclaimers, expert review (if applicable)
6. Content freshness — dated information, currency of statistics, update timestamps
7. Original research — unique data, primary analysis, surveys, proprietary insights

**HCU Analysis (8 parameters, score 0-10 each):**
1. Search intent match — does it perfectly answer the query? (informational, commercial, transactional, navigational)
2. Comprehensive coverage — depth vs. breadth balance, no critical gaps
3. First-hand experience — real expertise, not regurgitation, "lived experience" signals
4. Depth vs. surface-level — avoids shallow explanations, goes beyond obvious
5. No AI-fluff or filler — every sentence adds value, no generic padding
6. Practical applicability — actionable advice, step-by-steps, not just theory
7. Clear authorship/ownership — byline, about section, author bio signals
8. No misleading claims — all claims supported by evidence, no overpromising

**EAV Analysis (5 parameters, score 0-10 each):**
1. Entity salience — named entities present and relevant to topic, entity density
2. Semantic triples (SPO) — subject-predicate-object structure visible in content
3. Knowledge graph alignment — topics match known Google Knowledge Graph entities
4. Contextual relevance — entities support the main topic strongly, not random
5. Cross-entity relationships — meaningful connections between entities (e.g., "Microsoft" → "OpenAI" → "ChatGPT")

**Output Requirements:**
Return JSON with:
- eeat: { scores: {param: score}, total: sum, percentage: "X/70" }
- hcu: { scores: {param: score}, total: sum, percentage: "X/80" }
- eav: { scores: {param: score}, total: sum, percentage: "X/50" }
- gaps: array of { category, parameter, issue, severity: "high/medium/low", fix_suggestion }
- strengths: array of top 3 strong areas with evidence
- weaknesses: array of top 3 weak areas with evidence
- priority_fixes: array of 3-5 highest-impact fixes ordered by impact
- entity_report: { main_entities: [], entity_coverage: "score", missing_kg_entities: [] }
```

**n8n Implementation Notes:**
- This is a **deep analysis step**, not the final gate. Output feeds into 2J (Quality + Fact Check) and 2K (SEO/GEO Evaluator).
- Store output as `eeat_hcu_eav_analysis` for downstream steps.
- Claude's reasoning depth is ideal for structured multi-dimensional analysis.

---

### 2J Quality + Fact Check Analysis

**Model:** `pesat-flash` | **Output:** JSON | **Temp:** 0.2 | **Max Tokens:** 3000

**System Prompt:**
```
You are a senior copy editor, fact-checker, and citation verifier. You evaluate writing quality AND rigorously audit every factual claim, quote, and external link for accuracy and live web existence.
```

**User Prompt Template:**
```
Analyze this article about '{{keyword}}' for writing quality, factual accuracy, and citation/link validity.

Article:
{{article}}

Research Context & Verified Data:
{{info_gain}}

EEAT Analysis Context:
{{eeat_hcu_eav_analysis}}

PART 1 — Quality: grammar & mechanics, readability (Flesch-Kincaid grade level, sentence length variation, paragraph structure), tone consistency, passive voice percentage, transition quality, redundancy score, formatting consistency.

PART 2 — Fact & Quote Verification:
- Audit all quotes: verify that quotes are genuine statements from real experts/institutions and not fabricated.
- Audit all external URLs: verify that every URL follows valid web standards (.gov, .edu, doi.org, pubmed, wikipedia, official domains) and is not a hallucinated fake slug.
- Extract all factual claims with confidence scores (high/medium/low). Flag any unsupported assertions or weasel words without dates or citations.

PART 3 — Web Search Verification Needs:
For each medium/low confidence claim or unverified link, provide: suggested_search_query, expected_authoritative_source, verification_priority (critical/important/nice-to-have).

Return JSON: quality_score (0-100), readability:{grade_level,flesch_score,sentence_avg_length,sentence_variation_score}, tone_assessment:{consistent,issues:[]}, passive_voice_pct, redundancy_score (0-100), quotes_validity:{verified_count,issues:[]}, links_validity:{verified_count,issues:[]}, claims:[{claim_text,category,confidence,needs_verification,suggested_search_query,expected_authoritative_source,verification_priority}], critical_flags:[], improvement_recommendations:[], overall_verdict:{quality,fact_risk}.
```

**n8n Implementation Notes:**
- This step **extracts** claims for verification. Actual web search verification is done in n8n via HTTP Request nodes (see below).
- Store output as `quality_fact_check` for downstream steps.
- Claims marked `verification_priority: "critical"` should trigger an n8n branch for web search verification.
- Optional: After this step, n8n can run parallel HTTP requests to verify critical claims via Google/Bing search.

**Web Search Verification (n8n Add-On):**
```
If quality_fact_check.critical_flags.length > 0:
  For each critical flag:
    → n8n HTTP Request: GET https://www.googleapis.com/customsearch/v1?q={suggested_search_query}&key={API_KEY}&cx={SEARCH_ENGINE_ID}
    → Parse results for authoritative source matches
    → Update claim verification status
    → If unverified after search: mark article for human review
```
*Note: Requires Google Custom Search API key in CONFIG tab. Alternatively, use Bing Web Search API or SerpAPI.*

---

### 2K SEO/GEO Evaluator

**Model:** `claude-sonnet-4-6` | **Output:** JSON | **Temp:** 0.2 | **Max Tokens:** 2500

**System Prompt:**
```
You are a hybrid SEO and GEO (Generative Engine Optimization) expert. You evaluate content for both traditional search engine ranking (Google) and AI search engine citation-worthiness (ChatGPT, Perplexity, Gemini, Copilot). You understand how AI search engines select, summarize, and cite sources. You provide a pass/fail gate with actionable remediation.
```

**User Prompt Template:**
```
Evaluate this article about "{{keyword}}" as a combined SEO/GEO assessment. This is the FINAL GATE before the article proceeds to image generation and publishing.

**Target Keyword:** {{keyword}}
**Title Tag:** {{title}}
**Meta Description:** {{meta_description}}
**URL Slug:** {{slug}}
**Planned Internal Links:** {{internal_links}}
**Planned External Links:** {{external_links}}

**Article:**
{{article}}

**Previous Analysis:**
EEAT+HCU+EAV: {{eeat_hcu_eav_analysis}}
Quality+Fact Check: {{quality_fact_check}}

**Evaluation Scope Note:**
Title tag, meta description, and slug are provided above. Internal/external link planning is provided above. Image prompts and alt texts will be generated in Phase 3 upon gate approval. Verify that content strictly uses clean text, lists, and tables only (no broken ASCII art, flowcharts, or diagram code blocks). Evaluate the actual content depth, snippet direct answers, table structuring, entity salience, and citation readiness objectively. Note on previous analysis: treat EEAT/Quality reports as diagnostic context for future polish; do not double-penalize for Phase 3/5 assets. Baseline scoring: any complete draft (>1800 words) with direct answers under H2s, structured Markdown tables, verifiable expert citations, high readability (7th-8th grade level), and FAQ coverage qualifies for baseline score 80–95. Pass threshold is overall_score >= 70.

**SEO DIMENSION (score 0-100):**
On-Page SEO (25 points):
- Title tag optimization (keyword placement, length, CTR potential)
- Meta description (length, CTA, keyword inclusion)
- Heading hierarchy (H1 unique, H2 logical, H3 granular, keyword distribution)
- Internal link density and anchor text variety
- External link authority and relevance
- Keyword cannibalization check
- Schema markup potential (Article, FAQ, HowTo, Breadcrumb)

Technical SEO (25 points):
- URL structure (slug quality, length, readability)
- Image alt text completeness and keyword optimization
- Mobile content structure (short paragraphs, scannable)
- Core Web Vitals recommendations (content-level: avoid large unoptimized tables, massive images)
- Content freshness signals (update dates, current data)

Content SEO (25 points):
- Semantic keyword coverage (LSI density in headings and body)
- Featured snippet optimization (list, table, paragraph format)
- Content depth vs. top-ranking competitors
- Topic cluster coverage (related sub-topics addressed)
- Entity coverage and semantic relationships
- FAQ schema readiness (Q&A format, conciseness)

User Experience Signals (25 points):
- Dwell time optimization (engagement hooks, progressive disclosure)
- Bounce rate reduction (clear value proposition in first 100 words)
- Scroll depth encouragement (visual breaks, subheadings)
- CTA clarity and placement

**GEO DIMENSION (score 0-100):**
AI Citation-Worthiness (40 points):
- Direct answer potential: does the article provide clear, concise answers to common queries?
- Source-worthiness: is the article structured like a source AI engines would cite? (authoritative, well-cited, specific)
- Citation phrase optimization: phrases that trigger AI citation ("According to [source]," "Research from [institution] shows," "A study published in [journal] found")
- Information density: high factual density per paragraph (AI engines prefer information-rich sources)
- Unique insight presence: does the article contain original analysis AI cannot easily replicate?
- Statistical anchoring: specific numbers, percentages, dates that AI engines extract and cite

ChatGPT Optimization (15 points):
- Conversational query match: does content answer "how do I...", "what is the best...", "explain..." queries?
- Step-by-step clarity: numbered, actionable instructions where applicable
- Comparison framing: clear pros/cons, A vs. B structures

Perplexity Optimization (15 points):
- Source diversity: multiple authoritative sources cited
- Inline citation format: clear attribution that Perplexity can extract and display
- Recency bias: recent data and sources (Perplexity prioritizes freshness)

Gemini Optimization (15 points):
- Multimodal readiness: references to tables, comparisons, structured data
- Knowledge Graph alignment: entities that Google KG recognizes
- Contextual depth: comprehensive coverage that satisfies follow-up questions

Copilot Optimization (15 points):
- Action-oriented content: clear next steps, tool recommendations, implementation guides
- Code/technical accuracy (if applicable): precise syntax, correct terminology
- Integration potential: content that pairs well with other tools (spreadsheets, docs, etc.)

**OVERALL SCORING:**
- seo_score: 0-100 (weighted: On-Page 25% + Technical 25% + Content 25% + UX 25%)
- geo_score: 0-100 (weighted: Citation 40% + ChatGPT 15% + Perplexity 15% + Gemini 15% + Copilot 15%)
- overall_score: 0-100 (weighted: SEO 50% + GEO 50%)
- pass: boolean (overall_score >= 70)

**Output Requirements:**
Return JSON with:
- seo_score: number
- seo_breakdown: { on_page, technical, content, user_experience }
- geo_score: number
- geo_breakdown: { citation_worthiness, chatgpt, perplexity, gemini, copilot }
- overall_score: number
- pass: boolean
- geo_citation_phrases: array of 3-5 optimized phrases for AI citation
- ai_engine_readiness: {
    chatgpt: { score, note },
    perplexity: { score, note },
    gemini: { score, note },
    copilot: { score, note }
  }
- top_3_seo_fixes: []
- top_3_geo_fixes: []
- retry_prompt: string (enhanced instructions if overall_score < 70, specific to weaknesses)
- critical_blockers: [] (any issues that must be fixed before proceeding, e.g., factual errors, missing schema)
```

**n8n Implementation Notes:**
- This is the **FINAL GATEKEEPER** for Phase 2.
- If `pass: false` (overall_score < 70), trigger retry loop.
- `retry_prompt` is injected into the enhanced generation prompt for the next attempt.
- `geo_citation_phrases` are passed to Phase 3 (optional: can be used to tweak article before publishing).
- `critical_blockers` — if any present, ALWAYS require human review regardless of score.
- Max retries: 2 (configurable in Quality Gates tab).
- Store output as `seo_geo_evaluator` for HISTORY tab logging.

**Retry Logic:**
```
IF overall_score >= 70 AND critical_blockers.length == 0:
  → Proceed to Phase 3 (Images)

IF overall_score < 70 AND retries < max_retries AND critical_blockers.length == 0:
  → Inject retry_prompt into enhanced article generation prompt
  → Re-run article generation (1E) with fixes
  → Re-run optimization (2A–2H)
  → Re-run analysis (2I, 2J, 2K)
  → Increment retry count

IF (overall_score < 70 AND retries >= max_retries) OR critical_blockers.length > 0:
  → Flag for human review
  → Log to HISTORY tab with full evaluator JSON
  → Send notification (Slack/Telegram) if configured
  → STOP pipeline (do not proceed to publish)
```

---

## Phase 3: Images

### 3A Image Prompts (Consolidated)

**Model:** `gpt-4o-mini` | **Output:** JSON | **Temp:** 0.7 | **Max Tokens:** 1500

**System Prompt:**
```
You are an expert visual content strategist who creates detailed, consistent, high-quality image generation prompts for articles. You ensure all prompts share a unified visual style, color palette, and tone so the article's images look cohesive.
```

**User Prompt Template:**
```
Generate 4 image generation prompts for the article about "{{keyword}}". All prompts must share a consistent visual style.

**Article:**
{{article}}

**Style Guidelines (apply to ALL 4 prompts):**
- Color palette: [warm and inviting / cool and professional / vibrant and energetic — auto-detect based on topic]
- Art style: clean, modern, flat illustration with subtle depth
- No text or logos in images (image generators struggle with text)
- Professional, high-quality, suitable for blog/Social Media
- Aspect ratio: 16:9 for featured, 4:3 for supporting

**Prompt 1 — Featured Image (Hero):**
- Dimensions: 1200x630 (landscape, 16:9)
- Purpose: social share, Open Graph, hero banner
- Must be eye-catching, click-worthy, clearly represent the topic
- Include a central visual metaphor for the article's main concept

**Prompt 2 — Supporting Image 1:**
- Dimensions: 800x600 (landscape, 4:3)
- Purpose: illustrate first major section of the article
- Educational, scannable, informative
- Match the article's first key concept after the intro

**Prompt 3 — Supporting Image 2:**
- Dimensions: 800x600 (landscape, 4:3)
- Purpose: illustrate second major section
- Different concept from Image 1, complementary
- Match the article's middle key concept

**Prompt 4 — Supporting Image 3:**
- Dimensions: 800x600 (landscape, 4:3)
- Purpose: illustrate third major section or conclusion
- Different concept from Images 1 and 2
- Match the article's final key concept or takeaway

Return JSON:
{
  "featured_image": { "prompt": "", "dimensions": "1200x630", "style_notes": "" },
  "supporting_image_1": { "prompt": "", "dimensions": "800x600", "section_target": "" },
  "supporting_image_2": { "prompt": "", "dimensions": "800x600", "section_target": "" },
  "supporting_image_3": { "prompt": "", "dimensions": "800x600", "section_target": "" },
  "style_guide": { "palette": "", "art_direction": "", "mood": "" }
}
```

**n8n Implementation Notes:**
- This is a **consolidated step** replacing the old 3A–3D (4 separate steps).
- One LLM call generates all 4 prompts with consistent style.
- Store output as `image_prompts` (JSON object with 4 keys).
- Image generation is currently ON HOLD — prompts are generated but not sent to image APIs yet.
- When image generation is enabled, these prompts will be fed to DALL-E 3 / Pollinations / Replicate.

---

### 3B Infographic Image Prompt

**Model:** `gpt-4o-mini` | **Output:** Plain | **Temp:** 0.6 | **Max Tokens:** 800

**System Prompt:**
```
You are an infographic designer who translates article data and insights into visual prompt briefs. You understand data visualization, information hierarchy, and scannable design. You create prompts that produce clear, shareable infographic-style images.
```

**User Prompt Template:**
```
Create an infographic image generation prompt for the article about "{{keyword}}".

**Article:**
{{article}}

**Requirements:**
- Identify 3-5 key data points, statistics, or insights from the article that should be visualized
- Recommend a layout: vertical scroll (1200x1600) or horizontal (1600x1200)
- Specify visual hierarchy: headline, sub-points, supporting icons, data callouts
- Style: match the article's visual style guide (from 3A): {{image_prompts.style_guide}}
- Must be scannable in 3-5 seconds
- Include numbers/stats prominently (AI image generators can handle large numbers better than text)
- No small text paragraphs — use icons, bars, charts, or callout boxes
- Include a subtle call-to-action or key takeaway at the bottom

Return the prompt as a single detailed paragraph optimized for AI image generation (DALL-E 3, Midjourney, or FLUX.1).
```

**n8n Implementation Notes:**
- Store output as `infographic_prompt`.
- This prompt will later be used for image generation when Phase 3 image generation is enabled.
- Infographic images are highly shareable and can generate backlinks — strong SEO asset.
- Output is plain text (single paragraph prompt), not JSON.

---

### 3C Alt Text Generation

**Model:** `gpt-4o-mini` | **Output:** JSON | **Temp:** 0.3 | **Max Tokens:** 800

**System Prompt:**
```
You are an SEO accessibility expert who writes alt text that is both screen-reader friendly and keyword-optimized for search engines. You balance accessibility requirements with SEO best practices.
```

**User Prompt Template:**
```
Generate alt text for all 5 images in the article about "{{keyword}}".

**Image Prompts:**
{{image_prompts}}

**Infographic Prompt:**
{{infographic_prompt}}

**Alt Text Rules (MUST follow):**
1. Max 125 characters per alt text (screen reader friendly)
2. Describe the image content accurately — what is visually depicted
3. Include the keyword "{{keyword}}" or a natural LSI variation ONCE per alt text (not stuffed)
4. Format: "[Visual description] — [relevance to article topic]"
5. Do NOT use "image of" or "picture of" — screen readers already announce it as an image
6. For data/charts: describe the data trend or key insight, not just "a chart"
7. For infographics: summarize the main takeaway, not list every element

**Image List:**
1. Featured Image — hero banner, main topic representation
2. Supporting Image 1 — first key concept illustration
3. Supporting Image 2 — second key concept illustration
4. Supporting Image 3 — third key concept illustration
5. Infographic — data visualization with key statistics/takeaways

Return JSON:
{
  "featured_image_alt": "",
  "supporting_image_1_alt": "",
  "supporting_image_2_alt": "",
  "supporting_image_3_alt": "",
  "infographic_alt": ""
}
```

**n8n Implementation Notes:**
- Store output as `alt_texts` (JSON object with 5 keys).
- Alt texts are passed to WordPress Publish step (5A) for image accessibility and SEO.
- Alt text is an on-page SEO signal that also improves accessibility compliance (WCAG).
- When image generation is enabled, alt texts are uploaded alongside images to WordPress.

---

## Phase 4: Linking

### 4A Internal Linking

**Model:** `pesat-lite` | **Output:** Markdown | **Temp:** 0.3 | **Max Tokens:** 4500

**System Prompt:**
```
You are an expert Content Editor and SEO Strategist. Insert provided internal links contextually across the article.
```

**User Prompt Template:**
```
Insert internal links into article: {{article}}.

Provided internal links (may be multiple, separated by newlines or commas):
{{internal_links}}

Rules:
1) Extract meaningful target anchor keywords or phrases from the URL slugs or path names. If linking to homepage or company brand, anchor text MUST be strictly 'JetDigitalPro' (one word, PascalCase). NEVER write 'jet digital pro'.
2) Insert ALL provided internal links (or 2-5 distinct links) across separate, contextually relevant sections of the article.
3) Natural integration — integrate into the natural flow of sentences. Do not use generic anchors like 'click here', 'read more', or raw naked URLs.
4) Return ONLY the full revised article in Markdown starting directly with the H1 title. No commentary, no Before/After preamble. Maintain strict formatting: text, tables, and lists only. No numbered headings.
5) Contextual relevance: ensure every link is placed where it adds natural value for the reader.
```

---

### 4B External Linking

**Model:** `pesat-flash` | **Output:** Markdown | **Temp:** 0.3 | **Max Tokens:** 4500

**System Prompt:**
```
You are an expert Fact-Checker and SEO Citation Strategist. Add 2-3 high-quality external links to verified, live sources without hallucinating fake or dead links.
```

**User Prompt Template:**
```
Add 2-3 high-quality external links to authoritative sources supporting key factual claims in this article about '{{keyword}}'.

Article:
{{article}}

Research Data & Verified Sources:
{{info_gain}}
{{external_links}}

STRICT URL & CITATION INTEGRITY RULES:
1. Every link MUST point to a real, permanent, publicly accessible open domain (DOI https://doi.org/..., arXiv https://arxiv.org/..., PubMed, .gov, .edu, or Wikipedia).
2. NEVER invent commercial newsroom slugs (e.g. gartner.com/en/newsroom/..., forbes.com/...) that trigger 404 or 403 bot challenges.
3. BRAND INTEGRITY: Ensure company brand is strictly 'JetDigitalPro' (never 'jet digital pro').
4. Integrate via contextual anchor text (e.g., "According to [American Academy of Sleep Medicine](URL)..." or "...linked to [increased parasympathetic activity](URL)..."). Link the descriptive phrase only.
5. Do NOT rewrite the narrative. Insert where natural.
6. Return ONLY the full revised article in Markdown starting directly with the H1 title. No commentary, no Before/After preamble. Strict formatting: text, tables, and lists only. No numbered headings.
```

---

## Phase 5: Publish

### 5A WordPress Publish

**Model:** `system:wordpress` | **Output:** System

**n8n Implementation Notes:**
- Uses WordPress REST API to create a post
- Requires: WordPress URL, username, application password
- Payload should include:
  - `title` (from 2A)
  - `content` (final article from 4B)
  - `excerpt` (from 2A meta_description)
  - `slug` (from 2A)
  - `status`: `publish` or `draft`
  - `featured_media`: `featured_image_url` (from 3A when image generation enabled)
  - `categories` and `tags` (from 1C LSI keywords)
- When image generation is ON, upload images to WordPress media library first, then attach IDs to post
- Set `meta` fields for SEO plugin (Yoast / RankMath) if configured:
  - `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `_yoast_wpseo_focuskw`
  - Or RankMath equivalents
- Alt texts are set during image upload via `alt_text` field in media API
- Return: `post_url`, `post_id`

**Image Upload Flow (when image generation enabled):**
```
For each image:
  1. Generate image from prompt (DALL-E 3 / Pollinations / Replicate)
  2. Download image to n8n binary data
  3. POST /wp-json/wp/v2/media with:
     - file: binary image data
     - alt_text: from alt_texts object
     - title: descriptive filename
  4. Capture returned media_id
  5. For featured image: set as post.featured_media
  6. For inline images: insert <img src="media_url" alt="..."> into article HTML
```

**Example n8n HTTP Request (Create Post):**
```
POST /wp-json/wp/v2/posts
Authorization: Basic <base64(username:app_password)>
Content-Type: application/json

{
  "title": "{{title}}",
  "content": "{{article_html}}",
  "excerpt": "{{meta_description}}",
  "slug": "{{slug}}",
  "status": "publish",
  "featured_media": {{featured_media_id}},
  "categories": [{{category_id}}],
  "tags": [{{tag_ids}}]
}
```

---

## Phase 6: Index

### 6A Request Indexing

**Model:** `system:google-index` | **Output:** System

**n8n Implementation Notes:**
- Uses Google Search Console Indexing API
- Requires: Service account JSON key, site URL
- API endpoint: `https://indexing.googleapis.com/v3/urlNotifications:publish`
- Payload:
  ```json
  {
    "url": "{{post_url}}",
    "type": "URL_UPDATED"
  }
  ```
- Return: `notification_url`, `status`
- Rate limit: 200 requests per day per site

---

## Variable Mapping Between Steps (v2.1)

| Variable | Created By | Used By |
|---|---|---|
| `{{keyword}}` | User input | All steps |
| `{{internal_links}}` | User input | 1D, 1E, 4A |
| `{{cta}}` | User input | 1D, 1E, 2F |
| `{{serp_data}}` | 1A | 1B, 1D, 1E, 2I |
| `{{info_gain}}` | 1B | 1D, 1E |
| `{{lsi_keywords}}` | 1C | 1D, 1E, 3C, 5A |
| `{{outline}}` | 1D | 1E |
| `{{article}}` | 1E | 2A–2K, 3A–3C, 4A–4B |
| `{{prev_output}}` | Previous step | Next step (generic) |
| `{{title}}` | 2A | 5A |
| `{{meta_description}}` | 2A | 5A |
| `{{slug}}` | 2A | 5A |
| `{{eeat_hcu_eav_analysis}}` | 2I | 2J, 2K |
| `{{quality_fact_check}}` | 2J | 2K |
| `{{seo_geo_evaluator}}` | 2K | HISTORY, Retry logic |
| `{{image_prompts}}` | 3A | 3B, 3C |
| `{{infographic_prompt}}` | 3B | 3C |
| `{{alt_texts}}` | 3C | 5A (when image gen enabled) |
| `{{post_url}}` | 5A | 6A |

---

## Retry Logic for Evaluator (2K)

```
IF overall_score >= 70 AND critical_blockers.length == 0:
  → Proceed to Phase 3 (Images)

IF overall_score < 70 AND retries < max_retries AND critical_blockers.length == 0:
  → Inject evaluator feedback into enhanced prompt
  → Re-run article generation (1E) with fixes
  → Re-run optimization (2A–2H)
  → Re-run analysis (2I, 2J, 2K)
  → Increment retry count

IF (overall_score < 70 AND retries >= max_retries) OR critical_blockers.length > 0:
  → Flag for human review
  → OR proceed with warning (configurable in Quality Gates)
  → Log to HISTORY tab with evaluator JSON
  → Send notification if configured (Slack/Telegram)
```

**Enhanced Retry Prompt Addendum:**
```
The previous article scored {overall_score}/100 on SEO/GEO evaluation. Fix these issues:
{top_3_seo_fixes}
{top_3_geo_fixes}

Specifically address:
{retry_prompt}

Critical: Ensure all factual claims are verified and all critical blockers are resolved.
```

---

## Cost Estimate (per run — v2.1)

| Step | Model | Est. Input | Est. Output | Est. Cost |
|---|---|---|---|---|
| 1A | gpt-4o-mini | 2K | 1K | $0.00045 |
| 1B | deepseek-chat | 2K | 1.5K | $0.0022 |
| 1C | gpt-4o-mini | 2K | 1K | $0.00045 |
| 1D | deepseek-chat | 3K | 1.5K | $0.0027 |
| 1E | deepseek-chat | 4K | 3K | $0.0044 |
| 2A | gpt-4o | 3K | 0.5K | $0.0225 |
| 2B | gpt-4o-mini | 3K | 0.3K | $0.0006 |
| 2C | deepseek-chat | 4K | 4K | $0.0055 |
| 2D | gpt-4o | 4K | 3.5K | $0.0725 |
| 2E | gpt-4o | 3K | 0.8K | $0.027 |
| 2F | gpt-4o | 3K | 0.3K | $0.0195 |
| 2G | gpt-4o | 4K | 3.5K | $0.0725 |
| 2H | deepseek-chat | 4K | 3.5K | $0.0058 |
| **2I** | **claude-sonnet-4-6** | **4K** | **2K** | **$0.042** |
| **2J** | **gpt-4o** | **4K** | **2K** | **$0.060** |
| **2K** | **claude-sonnet-4-6** | **5K** | **2K** | **$0.0525** |
| 3A | gpt-4o-mini | 4K | 1.5K | $0.0008 |
| 3B | gpt-4o-mini | 4K | 0.8K | $0.0006 |
| 3C | gpt-4o-mini | 5K | 0.5K | $0.0007 |
| 4A | gpt-4o-mini | 4K | 3.5K | $0.0022 |
| 4B | gpt-4o | 4K | 3.5K | $0.0725 |
| **TOTAL** | | | | **~$0.35/run** |

*Note: v2.1 cost increase from v2.0 (~$0.33) is due to the added 2I (EEAT+HCU+EAV) and 2J (Quality+Fact Check) steps. 2K replaces the old 2I with similar cost. If evaluator triggers retries, add ~$0.20 per retry (1E + 2A-2K). Image generation costs are NOT included (on hold). When enabled, add ~$0.12 for hybrid image generation (2 DALL-E 3 + 3 Pollinations).* |

---

## Prompt Customization Guide

### How to Customize a Step

1. Open Admin UI → select step from left sidebar
2. Edit System Prompt (sets the AI persona)
3. Edit User Prompt Template (the actual task)
4. Use variable inserter buttons to inject `{{variables}}`
5. Adjust Temperature (0.0 = deterministic, 1.0 = creative)
6. Adjust Max Tokens based on expected output size
7. Click **Save to Sheets**

### New Template Variables (v2.1)

| Variable | Available From | Description |
|---|---|---|
| `{{eeat_hcu_eav_analysis}}` | Step 2J onward | JSON output from 2I analysis |
| `{{quality_fact_check}}` | Step 2K onward | JSON output from 2J analysis |
| `{{seo_geo_evaluator}}` | Step 3A onward | JSON output from 2K evaluator |
| `{{image_prompts}}` | Step 3B, 3C | JSON object with 4 image prompts |
| `{{infographic_prompt}}` | Step 3C | Plain text infographic prompt |
| `{{alt_texts}}` | Step 5A | JSON object with 5 alt texts |

### Common Customization Patterns

**Brand Voice:**
Add to System Prompt: `You write in a [professional/friendly/technical] tone for [brand name].`

**Local SEO:**
Add to User Prompt: `Target location: [City, Country]. Include local references and geo-modifiers.`

**Industry Specific:**
Add to System Prompt: `You are an expert in [industry] with 10+ years of experience.`

**Language:**
The pipeline supports any language. Set the System Prompt to: `You write in [language]. All output must be in [language].`

**GEO Targeting:**
In Admin UI SEO/GEO tab, select which AI engines to optimize for: ChatGPT, Perplexity, Gemini, Copilot. The 2K Evaluator will adjust scoring weights accordingly.

---

*End of Prompt Templates Reference v2.1*
