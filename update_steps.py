import re
import json

def main(ctx):
    file_path = r'D:\Library\Kusuma\Documents\OneDrive [Emeril]\OneDrive\jdpwriting\admin-ui.html'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def js_escape(text):
        """Escape text for JavaScript single-quoted string."""
        text = text.replace('\\', '\\\\')
        text = text.replace("'", "\\'")
        text = text.replace('\n', '\\n')
        text = text.replace('\r', '')
        return text
    
    def build_step(id, name, phase, model, desc, system, user, temp, maxTokens, outputFormat='markdown'):
        provider = 'openai' if model.startswith('gpt') or model.startswith('o1') or model.startswith('o3') else 'deepseek' if model.startswith('deepseek') else 'anthropic' if model.startswith('claude') else 'system'
        n8nId = 'djacQwE4vLuW3rHE' if id == '1E' else ''
        return f"  {{ id:'{id}', name:'{name}', phase:{phase}, model:'{model}', provider:'{provider}', desc:'{desc}', n8nId:'{n8nId}', enabled:true,\n    systemPrompt:'{js_escape(system)}',\n    userPrompt:'{js_escape(user)}', temp:{temp}, maxTokens:{maxTokens}, outputFormat:'{outputFormat}' }},"
    
    # Define all steps
    steps = []
    
    # Phase 1: Research & Generation
    steps.append(build_step('1A', 'AI SERP Research', 0, 'gpt-4o-mini', 'Phase 1 — AI simulates SERP analysis for keyword',
        "You are an expert SEO research analyst with deep knowledge of Google Search results patterns. You simulate SERP analysis by drawing on your knowledge of what typically ranks for any given keyword, including heading structures, content patterns, gaps, and competitive landscape.",
        """Perform a comprehensive SERP analysis for the keyword "{{keyword}}". Use your knowledge of search engine results to simulate what the top 10 results would look like.

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
- common_format: how top results structure their content (listicle, guide, comparison, etc.)""",
        0.3, 2000, 'json'))
    
    steps.append(build_step('1B', 'Information Gain', 0, 'deepseek-chat', 'Phase 1 — Find what content is missing from SERP',
        "You are an expert content strategist specializing in information gain — finding what valuable content is missing from existing search results that users actually need.",
        """Based on this SERP analysis for "{{keyword}}":

{{serp_data}}

Identify information gaps and unique angles:

1. Information gaps — what do users need but no current result covers well?
2. Unique angles — how can our content be genuinely different and better?
3. Depth opportunities — where can we go significantly deeper than competitors?
4. Expertise signals — what first-hand experience, data, or case studies can we add?
5. Freshness gaps — what outdated information can we update with current data?
6. Multimedia gaps — are competitors missing visuals, tables, or comparisons?
7. Audience segments — are there underserved reader personas?

Return JSON with actionable insights for each category.""",
        0.5, 2000, 'json'))
    
    steps.append(build_step('1C', 'LSI Keywords', 0, 'gpt-4o-mini', 'Phase 1 — Discover semantic keywords & entities',
        "You are a semantic SEO expert who discovers latent semantic indexing keywords, related concepts, and named entities that help content rank for topic clusters, not just single keywords.",
        """For the topic "{{keyword}}", based on this research context:

{{prev_output}}

Generate comprehensive semantic keyword data:

1. Primary LSI keywords (20 terms) — closely related to main topic
2. Secondary LSI keywords (15 terms) — supporting concepts
3. Semantic entities (10 named entities) — people, organizations, places, brands
4. Topical clusters (5 sub-topics) — content clusters to cover
5. Question-based keywords (10) — questions users ask
6. Long-tail variations (10) — specific search phrases
7. Related concepts (10) — broader topic associations

Return JSON with all categories as arrays.""",
        0.3, 1500, 'json'))
    
    steps.append(build_step('1D', 'Outline Creation', 0, 'deepseek-chat', 'Phase 1 — Create article outline from research',
        "You are a senior content strategist who creates comprehensive, search-intent-matched article outlines based on SERP research, information gaps, and semantic keyword data.",
        """Create a detailed article outline for "{{keyword}}" using this research data:

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

Return a complete outline with H2, H3, and bullet points describing each section.""",
        0.4, 2000, 'markdown'))
    
    # Step 1E with user's full prompt
    steps.append(build_step('1E', 'Generate Article', 0, 'deepseek-chat', 'Phase 1 — Write full article from outline',
        "You are an expert SEO/GEO long-form article generator. Produce a ~2000-word article in American English, using anti-detection techniques and a professional human voice.",
        """You are an expert SEO/GEO long-form article generator. Produce a ~2000-word article in American English, using anti-detection techniques and a professional human voice.

## Outline rule (if provided)
If the user supplies an outline (headings, subheadings, key points), follow it exactly for sections and headings. The outline overrides the default structure below.

## Default structure (when no outline is given)

1. **Title (H1)** – ≤60 characters, keyword first, benefit-driven.
2. **Meta description** – ≤20 words, labeled `Meta description:`, no "discover".
3. **Introduction** (~100 words)
- First sentence ≤40 words, answers intent directly.
- Include a fact or named entity with a hyperlink to a **specific page** (not the entity name, but the fact/source).
- End with a call-to-action (CTA).
4. **Key insights (H2)** – Adaptive heading (e.g., "What You'll Learn", "Key Benefits", "Quick Summary"). Then 3 bullet points.
5. **Main body** (H2/H3 per section)
- Open each section with a direct answer ≤40 words.
- Per section: ≥1 statistic + 1 named entity + 1 source reference.
- Statistics & source references MUST have a hyperlink to a **specific page** (not homepage): `[Source Name](specific-url)`.
- Named entities (people, institutions, studies) – no URL.
- If a specific URL is missing, insert `[GEO NOTE: missing specific URL]`.
- **Bold** key entities and numbers.
- Paragraph rhythm: rotate
- **Var1**: three ~30-word paragraphs + short bullet list
- **Var2**: five ~30-word paragraphs
- **Var3**: two ~20-word paragraphs + bullet list + one ~30-word paragraph
- Lists: 1-sentence intro, use hyphens, never end a section with a list.
- Before any H3, include a short transition paragraph.
6. **Table** – At least one markdown table. Every claim or number in the table must be hyperlinked to a specific page.
7. **External links** – Exactly two deep links from `.gov` / `.edu` / reputable sources (no homepages). Cite as `[Organization Name](specific-url)`.
8. **Final section (H2)** – Title includes the keyword. Ends with a branded CTA inside brackets, using the user-supplied `{{cta}}` variable.

## Variables to insert
- `{{keyword}}` – use as the primary topic.
- `{{internal_links}}` – insert naturally where relevant (as markdown hyperlinks).
- `{{cta}}` – place in the final section inside brackets, e.g., `[{{cta}}]`.
- `{{outline}}` (optional) – if provided, follow it instead of the default structure.

## Professional writing guidelines (anti-detection, mandatory)
- **Sentence length**: mix short (5-10 words), medium (12-18), long (20-30) per paragraph. Avoid three+ sentences with the same opening.
- **Transition words**: replace "furthermore/moreover" with "Also…", "Beyond that…", "That said…", "Importantly…"
- **Active voice** preferred; passive allowed when natural.
- **Contractions**: okay in casual business contexts; avoid in formal reports.
- **Hedging**: use "tends to", "often", "appears", "suggests", "one could argue".
- **Human markers** (per 300 words): add a qualified opinion ("From our experience…"), a concrete work example, or a mild concession ("Of course… That said…").
- **Paragraph length variety**: include at least one 1-sentence paragraph and one 7-sentence paragraph.
- **Restructuring AI drafts**: start a paragraph with a conclusion/example, combine/split sentences, add nuance ("approximately", "slight"), remove phrases like "It is important to note that".
- **Subheadings**: make them sound human (e.g., "Why this actually worked" instead of "Benefits of Implementation").
- **Self-check**: read aloud; remove "realm"; fix identical sentence openings; ensure an opinion or nuance every 500 words.
- **Ethical disclosure** (if required): state "Draft generated with AI, substantially edited by human author."

## Banned phrases (zero tolerance)
tends to, simply, just, actually, gorgeous, flawless, perfectly, beautifully, Let's be honest, Here's the thing, The truth is, A little preparation changes the outcome, These small adjustments make a big difference, Absolutely, Not at all, When it comes to, Here is how, That's where, We believe, ensures, intentional, maintaining, easiest way, This flexibility, listen to what our skin needs, A realistic schedule, feels like a chore, The best routine is the one that fits, works beautifully, manageable pieces, second nature, quietly drive, keeps skin healthy, crucial, reflects that peace, comes from, sustainable lifestyle choice, naturally lit-from-within, We control, honor our bodies, We invite our community, deserves the best care, joyful practice, maintain beautiful warmth, mimics the tones, gives us control, works well, provides enough, quick and balanced, must wear, just as vulnerable, non-negotiable, keep things soft and realistic, prevents, Start with, requires little extra time, grow comfortable, To make the most of, The good news?, Think of your skin like a canvas, The timing sweet spot, When you're ready to apply, That's where things usually go wrong, It's a simple step, lets your skin breathe, set yourself up for success, waking up with that perfect, your best glow yet, Here is what makes it different, serves a purpose, vital for maintaining, no highlighter can replicate, aim to make, feel effortless, starts to look, For optimal, Here's the thing, The good news is, That's when, figure out which, figuring out which, perfectly, dramatically, seamless, robust, leverage, Let's dive in, make all the difference, Everything fits in one small bag, simple habits, The goal isn't to stop the process, it's to slow it down, That's the reality, tends to stick around

## GEO / SEO requirements
- Answer-first. **Bold** key numbers and entities.
- SPO sentence structure (Subject-Predicate-Object). Place primary entities early.
- Expert quote format: `“Quote.” — [Name, Title](specific-url)` – URL only for the source of the quote.

## Self-check (must pass all)
☐ Every statistic and source reference has a specific-page hyperlink (no homepage).
☐ Key insights heading is adaptive (not a fixed label like "Key Takeaways").
☐ Exactly two external deep links (.gov/.edu/.org) are present.
☐ All table claims are hyperlinked to specific pages.
☐ Named entities have no URLs.
☐ Professional guidelines are applied (sentence variety, hedging, human markers, paragraph length variation, no AI hallmarks).
☐ No banned phrases appear.

## Operational rules
- Produce the full article always. No clarifications, no images, no prompt leakage.
- Factually correct. If a specific URL is missing, insert `[GEO NOTE: missing specific URL]`.
- Use markdown formatting throughout.

Now generate the article for `{{keyword}}` using the internal links `{{internal_links}}`, CTA `{{cta}}`, and optional outline `{{outline}}` (if provided).""",
        0.7, 5000, 'markdown'))
    
    # Phase 2: Optimization
    steps.append(build_step('2A', 'Title & Meta', 1, 'gpt-4o', 'Phase 2 — SEO title, meta, slug',
        "You are an expert SEO/GEO content generator. Your task has two steps.",
        """## Step 1 – Metadata generation (always required)

**Input variables:**
- `{{keyword}}` – primary topic (always provided)
- `{{article}}` – if non-empty, this is an existing article from which you will extract metadata
- `{{outline}}` (optional) – may influence title/slug if no article is given

**Rules for metadata:**

### If `{{article}}` is provided and not empty:
- Read the article.
- Extract an **SEO title** (50–60 characters, keyword near the front, benefit-driven).
- Extract a **meta description** (150–160 characters, includes a call-to-action, no "discover").
- Generate a **URL slug** (lowercase, hyphens, keyword-focused, no special chars).
- Return **only** JSON in the exact format below. Do not add any other text before or after the JSON.

### If `{{article}}` is empty or missing:
- Create an SEO title (50–60 chars, keyword first, benefit-driven) based on `{{keyword}}` and optional `{{outline}}`.
- Create a meta description (150–160 chars + CTA, no "discover").
- Create a URL slug (keyword-focused, hyphens, lowercase).
- Return **only** JSON in the exact format below.

**JSON format:**
```json
{"title":"Your SEO title here","meta_description":"Your meta description here","slug":"your-url-slug-here"}
```""",
        0.5, 600, 'json'))
    
    steps.append(build_step('2B', 'Intro Rewrite', 1, 'gpt-4o-mini', 'Phase 2 — Hook rewrite for engagement',
        "You are an SEO/GEO content editor. Rewrite the introduction of the provided article.",
        """**Input:**
- `{{keyword}}` – the primary topic/search intent
- `{{article}}` – the full existing article

**Task:**
Rewrite the introduction so that:
1. The **first sentence** directly answers the search intent behind `{{keyword}}` (≤40 words if possible, but the full intro ≤150 words).
2. The introduction stays factual, includes at least one named entity or statistic (with a hyperlink to a specific page if a statistic is used), and ends with a soft CTA (no brackets needed unless specified).
3. Follow all professional writing rules below.

**Output:** Return **only** the rewritten introduction as plain text / markdown. No extra commentary, no labels like "Here is your introduction".

---

## Professional writing rules (from basis prompt, mandatory)

- **Sentence length variety**: mix short (5-10 words), medium (12-18), long (20-30) within the intro.
- **Active voice** preferred; passive allowed only when natural.
- **Contractions** okay in casual business contexts.
- **Hedging** where appropriate: "often", "appears", "suggests", "one could argue".
- **No banned phrases** (see full list below). Zero tolerance.
- **Paragraph rhythm**: The intro is short (~150 words). Use either:
- 3–5 sentences of varied length, or
- 2 short sentences + 1 bullet point (if listing key points) + 1 longer sentence.
- **First sentence** must answer intent directly – no fluff, no "when it comes to".
- **Named entity or statistic** requirement:
- If you include a statistic, hyperlink the source to a specific page: `[Source Name](specific-url)`.
- If you include a named entity (person, institution, study), no URL needed.
- If no specific URL available, insert `[GEO NOTE: missing specific URL]`.
- **Bold** key numbers or entities where impactful.
- **Ending**: naturally lead into the rest of the article (e.g., "Here's what you need to know." or similar – but avoid banned phrases).

## Banned phrases (exactly as from basis prompt)

tends to, simply, just, actually, gorgeous, flawless, perfectly, beautifully, Let's be honest, Here's the thing, The truth is, A little preparation changes the outcome, These small adjustments make a big difference, Absolutely, Not at all, When it comes to, Here is how, That's where, We believe, ensures, intentional, maintaining, easiest way, This flexibility, listen to what our skin needs, A realistic schedule, feels like a chore, The best routine is the one that fits, works beautifully, manageable pieces, second nature, quietly drive, keeps skin healthy, crucial, reflects that peace, comes from, sustainable lifestyle choice, naturally lit-from-within, We control, honor our bodies, We invite our community, deserves the best care, joyful practice, maintain beautiful warmth, mimics the tones, gives us control, works well, provides enough, quick and balanced, must wear, just as vulnerable, non-negotiable, keep things soft and realistic, prevents, Start with, requires little extra time, grow comfortable, To make the most of, The good news?, Think of your skin like a canvas, The timing sweet spot, When you're ready to apply, That's where things usually go wrong, It's a simple step, lets your skin breathe, set yourself up for success, waking up with that perfect, your best glow yet, Here is what makes it different, serves a purpose, vital for maintaining, no highlighter can replicate, aim to make, feel effortless, starts to look, For optimal, Here's the thing, The good news is, That's when, figure out which, figuring out which, perfectly, dramatically, seamless, robust, leverage, Let's dive in, make all the difference, Everything fits in one small bag, simple habits, The goal isn't to stop the process, it's to slow it down, That's the reality, tends to stick around

## Self-check (must pass)

☐ First sentence ≤40 words and answers intent directly.
☐ Total intro ≤150 words.
☐ Contains ≥1 named entity or statistic with hyperlinked source (or GEO NOTE).
☐ No banned phrases.
☐ Sentence length varies.
☐ Ends with a natural transition (not a hard stop).

Now rewrite the introduction for `{{keyword}}` using the article below.""",
        0.6, 300, 'markdown'))
    
    # ... and so on for all remaining steps
    
    return {"status": "building steps", "count": len(steps)}

main(None)
