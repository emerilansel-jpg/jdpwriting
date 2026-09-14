# JDP Pipeline v2.0 — Prompt Templates Reference

> Complete reference for all 22 steps in the autonomous research-to-publish pipeline.
> Last updated: June 2026

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
  - [2I Evaluator](#2i-evaluator)
- [Phase 3: Images](#phase-3-images)
  - [3A Featured Image Prompt](#3a-featured-image-prompt)
  - [3B Image 1 Prompt](#3b-image-1-prompt)
  - [3C Image 2 Prompt](#3c-image-2-prompt)
  - [3D Image 3 Prompt](#3d-image-3-prompt)
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
- Minimum 1500 words, target 2000 words
- Follow the outline structure exactly
- Include at least 3 statistics from authoritative sources with citations
- Include 2 expert quotes or references where relevant
- Use LSI keywords naturally throughout (not stuffed)
- Internal links to place: {{internal_links}}
- CTA to include: {{cta}}
- Write in Markdown format with proper H2, H3 headings
- First paragraph must directly answer the main search intent
- Include a comparison table where appropriate
- End with a strong conclusion + CTA
- Tone: authoritative yet accessible
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

**Model:** `deepseek-chat` | **Output:** Markdown | **Temp:** 0.8 | **Max Tokens:** 5000

**System Prompt:**
```
You are a content originality expert. Rephrase content to be unique, natural, and pass AI detection tools while preserving all factual information and structure.
```

**User Prompt Template:**
```
Rephrase this article to be highly unique, natural-sounding, and pass AI detection tools. Keep all facts, headings, and structure intact. Vary sentence length between 8-25 words. Use natural transitions. Avoid repetitive phrasing patterns.

Article:
{{article}}
```

---

### 2D Fluff Check

**Model:** `gpt-4o` | **Output:** Markdown | **Temp:** 0.3 | **Max Tokens:** 4000

**System Prompt:**
```
You are a ruthless editor who eliminates all filler words, redundant phrases, and padding while preserving every substantive fact and data point.
```

**User Prompt Template:**
```
Remove all filler words, redundant phrases, and empty sentences from this article. Keep all facts, statistics, and substantive content. Tighten every sentence. Remove phrases like "it is important to note," "in conclusion," "as mentioned earlier," etc. unless they serve a structural purpose.

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

Article:
{{article}}
```

---

### 2H Find & Embed Quotes

**Model:** `deepseek-chat` | **Output:** Markdown | **Temp:** 0.5 | **Max Tokens:** 4500

**System Prompt:**
```
You are a researcher who adds authoritative expert quotes and verifiable citations to content to boost E-E-A-T signals.
```

**User Prompt Template:**
```
Add 2-3 expert quotes or citations from real, verifiable sources to this article about "{{keyword}}". Format as Markdown blockquotes with attribution. Insert where they strengthen claims. Return the FULL article.

Article:
{{article}}
```

---

### 2I Evaluator (v2.0 — Combined EEAT+HCU+EAV+Quality)

**Model:** `claude-sonnet-4-6` | **Output:** JSON | **Temp:** 0.2 | **Max Tokens:** 2500

**System Prompt:**
```
You are a Google Search Quality Evaluator with deep expertise in E-E-A-T, Helpful Content Updates (HCU), Entity-Awareness Validation (EAV), and overall content quality scoring. You evaluate holistically and provide actionable, prioritized improvements.
```

**User Prompt Template:**
```
Evaluate this article about "{{keyword}}" comprehensively. Score each category and provide actionable fixes.

**Article:**
{{article}}

**E-E-A-T (10 points each, 70 total):**
1. Experience signals — first-hand evidence, case studies, testing data
2. Expertise markers — credentials, depth, technical accuracy, nuance
3. Authority building — citations, expert quotes, authoritative sources
4. Trustworthiness — factual accuracy, transparency, bias check, citations
5. YMYL compliance (if applicable) — medical/financial safety warnings
6. Content freshness — dated information, currency of sources
7. Original research — unique data, insights, primary analysis

**HCU (8 parameters, 10 points each, 80 total):**
1. Search intent match — does it perfectly answer the query?
2. Comprehensive coverage — depth vs. breadth balance
3. First-hand experience — real expertise, not just regurgitation
4. Depth vs. surface-level — avoids shallow explanations
5. No AI-fluff or filler — every sentence adds value
6. Practical applicability — actionable advice, not just theory
7. Clear authorship/ownership — byline, about section signals
8. No misleading claims — all claims supported by evidence

**EAV (10 points each, 50 total):**
1. Entity salience — named entities present and relevant to topic
2. Semantic triples (SPO) — subject-predicate-object structure in content
3. Knowledge graph alignment — topics match known KG entities
4. Contextual relevance — entities support the main topic strongly
5. Cross-entity relationships — meaningful connections between entities

**Quality Summary:**
- Overall score (0-100, weighted: EEAT 35% + HCU 40% + EAV 25%)
- Pass/Fail threshold: 70/100
- Top 3 strengths
- Top 3 weaknesses
- Priority fixes ordered by impact (highest first)
- Suggested rewrites for weak sections (if any score < 7)

Return detailed JSON with all scores, issues, and recommendations.
```

**n8n Implementation Notes:**
- This is the **gatekeeper step** for the pipeline
- If `overall_score < 70`, the pipeline should trigger a retry loop with enhanced prompt
- The retry should pass the evaluator feedback as `{{prev_output}}` to the enhanced generation step
- Max retries: 2 (configurable in Quality Gates tab)
- On max retries reached, flag for human review or proceed with warning

**Scoring Logic:**
```javascript
// Weighted overall score calculation
overall_score = (eeat_total / 70 * 35) + (hcu_total / 80 * 40) + (eav_total / 50 * 25)
pass = overall_score >= 70
```

---

## Phase 3: Images

### 3A Featured Image Prompt

**Model:** `gpt-4o-mini` | **Output:** Plain | **Temp:** 0.7 | **Max Tokens:** 500

**System Prompt:**
```
You are an expert visual content strategist who creates detailed, high-quality image generation prompts for featured images that are click-worthy and social-share ready.
```

**User Prompt Template:**
```
Create a detailed featured image prompt for the article about "{{keyword}}".

Article context:
{{article}}

Requirements:
- Professional, engaging, click-worthy
- Highly relevant to the article topic
- Optimized for social sharing (Open Graph)
- Dimensions: 1200x630 (landscape)
- Style: clean, modern, professional
- Must include visual elements that represent the topic clearly
- Suitable for AI image generation (DALL-E, Midjourney, or Stable Diffusion)

Return the image generation prompt in a single detailed paragraph.
```

**n8n Implementation Notes:**
- n8n can use this prompt to call DALL-E API, Midjourney API, or Stable Diffusion API
- Store the generated image URL as `featured_image_url`
- Pass this URL to the WordPress publish step

---

### 3B Image 1 Prompt

**Model:** `gpt-4o-mini` | **Output:** Plain | **Temp:** 0.7 | **Max Tokens:** 500

**System Prompt:**
```
You are an expert visual content strategist who creates detailed image generation prompts for article illustrations and supporting visuals.
```

**User Prompt Template:**
```
Create an image generation prompt for the first supporting image in the article about "{{keyword}}". This image should illustrate a key concept or data point from the article.

Article:
{{article}}

Requirements:
- Educational or explanatory visual
- Relevant to a key section of the article
- Clean, professional style
- Dimensions: 800x600
- Informative and scannable
- Suitable for AI image generation

Return the image generation prompt in a single detailed paragraph.
```

---

### 3C Image 2 Prompt

**Model:** `gpt-4o-mini` | **Output:** Plain | **Temp:** 0.7 | **Max Tokens:** 500

**System Prompt:**
```
You are an expert visual content strategist who creates detailed image generation prompts for article illustrations and supporting visuals.
```

**User Prompt Template:**
```
Create an image generation prompt for the second supporting image in the article about "{{keyword}}". This image should complement a different section than Image 1.

Article:
{{article}}

Requirements:
- Educational or explanatory visual
- Relevant to a different key section
- Clean, professional style
- Dimensions: 800x600
- Informative and scannable
- Suitable for AI image generation

Return the image generation prompt in a single detailed paragraph.
```

---

### 3D Image 3 Prompt

**Model:** `gpt-4o-mini` | **Output:** Plain | **Temp:** 0.7 | **Max Tokens:** 500

**System Prompt:**
```
You are an expert visual content strategist who creates detailed image generation prompts for article illustrations and supporting visuals.
```

**User Prompt Template:**
```
Create an image generation prompt for the third supporting image in the article about "{{keyword}}". This image should illustrate a third distinct concept from the article.

Article:
{{article}}

Requirements:
- Educational or explanatory visual
- Relevant to a third distinct section
- Clean, professional style
- Dimensions: 800x600
- Informative and scannable
- Suitable for AI image generation

Return the image generation prompt in a single detailed paragraph.
```

---

## Phase 4: Linking

### 4A Internal Linking

**Model:** `gpt-4o-mini` | **Output:** Markdown | **Temp:** 0.3 | **Max Tokens:** 4500

**System Prompt:**
```
You are an internal linking strategist who places links contextually and naturally.
```

**User Prompt Template:**
```
Add internal links using these URLs: {{internal_links}}
Max 5 links, contextually relevant, natural anchor text. Do not force links where they do not fit. Return the FULL article.

Article:
{{article}}
```

---

### 4B External Linking

**Model:** `gpt-4o` | **Output:** Markdown | **Temp:** 0.4 | **Max Tokens:** 4500

**System Prompt:**
```
You are an SEO expert in strategic external link placement to authoritative sources.
```

**User Prompt Template:**
```
Add 2-3 external links to authoritative sources supporting factual claims in the article. Use real, verifiable URLs. Prefer .edu, .gov, and established publications. Return the FULL article in Markdown.

Article:
{{article}}
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
  - `featured_media`: `featured_image_url` (from 3A)
  - `categories` and `tags` (from 1C LSI keywords)
- Set `meta` fields for SEO plugin (Yoast / RankMath) if configured
- Return: `post_url`, `post_id`

**Example n8n HTTP Request:**
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

## Variable Mapping Between Steps

| Variable | Created By | Used By |
|---|---|---|
| `{{keyword}}` | User input | All steps |
| `{{internal_links}}` | User input | 1D, 1E, 4A |
| `{{cta}}` | User input | 1D, 1E, 2F |
| `{{serp_data}}` | 1A | 1B, 1D, 1E |
| `{{info_gain}}` | 1B | 1D, 1E |
| `{{lsi_keywords}}` | 1C | 1D, 1E, 5A |
| `{{outline}}` | 1D | 1E |
| `{{article}}` | 1E | 2A–2I, 3A–3D, 4A–4B |
| `{{prev_output}}` | Previous step | Next step (generic) |
| `{{title}}` | 2A | 5A |
| `{{meta_description}}` | 2A | 5A |
| `{{slug}}` | 2A | 5A |
| `{{featured_image_prompt}}` | 3A | Image generation API |
| `{{image_1_prompt}}` | 3B | Image generation API |
| `{{image_2_prompt}}` | 3C | Image generation API |
| `{{image_3_prompt}}` | 3D | Image generation API |
| `{{post_url}}` | 5A | 6A |

---

## Retry Logic for Evaluator (2I)

```
IF overall_score >= 70:
  → Proceed to Phase 3 (Images)

IF overall_score < 70 AND retries < max_retries:
  → Inject evaluator feedback into enhanced prompt
  → Re-run article generation (1E) with fixes
  → Re-run optimization (2A–2H)
  → Re-run evaluator (2I)
  → Increment retry count

IF overall_score < 70 AND retries >= max_retries:
  → Flag for human review
  → OR proceed with warning (configurable in Quality Gates)
  → Log to HISTORY tab with evaluator JSON
```

**Enhanced Retry Prompt Addendum:**
```
The previous article scored {overall_score}/100. Fix these issues:
{priority_fixes}

Specifically address:
{weak_section_rewrites}
```

---

## Cost Estimate (per run)

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
| 2I | claude-sonnet-4-6 | 4K | 2K | $0.042 |
| 3A–3D | gpt-4o-mini | 4K total | 1K total | $0.0012 |
| 4A | gpt-4o-mini | 4K | 3.5K | $0.0022 |
| 4B | gpt-4o | 4K | 3.5K | $0.0725 |
| **TOTAL** | | | | **~$0.33/run** |

*Note: This is a conservative estimate. Actual costs vary by article length and token usage. Costs are lower for shorter articles. If evaluator triggers retries, add ~$0.15 per retry.*

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

### Common Customization Patterns

**Brand Voice:**
Add to System Prompt: `You write in a [professional/friendly/technical] tone for [brand name].`

**Local SEO:**
Add to User Prompt: `Target location: [City, Country]. Include local references and geo-modifiers.`

**Industry Specific:**
Add to System Prompt: `You are an expert in [industry] with 10+ years of experience.`

**Language:**
The pipeline supports any language. Set the System Prompt to: `You write in [language]. All output must be in [language].`

---

*End of Prompt Templates Reference v2.0*