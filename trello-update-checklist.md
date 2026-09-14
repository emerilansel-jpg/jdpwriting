# Trello Card Update Checklist — JDP Pipeline v2.0

> Copy-paste ini ke Trello card satu per satu.
> Last updated: 18 June 2026

---

## Card Lama yang Perlu DIUPDATE (Edit Judul + Deskripsi)

---

### Card 1: Build Step 1A sub-workflow (Generate Article)

**Judul Baru:**
```
Phase 1: Research & Generation (1A–1E)
```

**Deskripsi Baru (replace seluruh deskripsi):**
```markdown
## Phase 1: Research & Generation — 5 Steps

### 1A — AI SERP Research
- **Model:** gpt-4o-mini (OpenAI)
- **Input:** keyword
- **Output:** JSON (heading_patterns, content_gaps, paa_questions, dominant_intent, etc.)
- **Note:** AI-driven simulation, no external SERP API needed

### 1B — Information Gain
- **Model:** deepseek-chat (DeepSeek)
- **Input:** keyword, serp_data
- **Output:** JSON (information gaps, unique angles, depth opportunities, expertise signals)

### 1C — LSI Keywords
- **Model:** gpt-4o-mini (OpenAI)
- **Input:** keyword, prev_output (serp_data or info_gain)
- **Output:** JSON (primary LSI 20, secondary 15, entities 10, clusters 5, questions 10, long-tail 10, related 10)

### 1D — Outline Creation
- **Model:** deepseek-chat (DeepSeek)
- **Input:** keyword, serp_data, info_gain, lsi_keywords, internal_links, cta
- **Output:** Markdown outline (H2, H3, bullet points with word count per section)

### 1E — Generate Article
- **Model:** deepseek-chat (DeepSeek)
- **Input:** keyword, outline, serp_data, info_gain, lsi_keywords, internal_links, cta
- **Output:** ~2000-word Markdown article
- **Rules:** Anti-detection, GEO guidelines, banned phrases, SPO structure, 2 external .gov/.edu links, table with hyperlinked claims, adaptive key insights heading
- **n8n Workflow ID:** djacQwE4vLuW3rHE (reused from v1.0 Step 1A)

---
**Status:** Templates ready — `n8n-templates/generic-llm-step.json` + `step-1a-serp.json`
```

---

### Card 2: Build Step 2A-2J sub-workflows (Optimization)

**Judul Baru:**
```
Phase 2: Optimization (2A–2I)
```

**Deskripsi Baru (replace seluruh deskripsi):**
```markdown
## Phase 2: Optimization — 9 Steps

### 2A — Title & Meta
- **Model:** gpt-4o (OpenAI)
- **Input:** keyword, article (or outline)
- **Output:** JSON {title, meta_description, slug}

### 2B — Intro Rewrite
- **Model:** gpt-4o-mini (OpenAI)
- **Input:** keyword, article
- **Output:** Rewritten intro (~150 words, first sentence ≤40 words, answers intent)

### 2C — Originality Rewrite
- **Model:** deepseek-chat (DeepSeek)
- **Input:** article
- **Output:** Full article, human-style, passes AI detectors
- **Rules:** 30% sentence starters (And/But/So/Or/Yet), fragments, no parallel triples, contractions, opinions

### 2D — Fluff Check
- **Model:** gpt-4o (OpenAI)
- **Input:** article
- **Output:** Cleaned article, no filler words

### 2E — FAQ Generation
- **Model:** gpt-4o (OpenAI)
- **Input:** keyword, article (context only)
- **Output:** JSON array of 5 Q&A pairs (not from article, general knowledge + LSI keywords)

### 2F — Conclusion Optimizer
- **Model:** gpt-4o (OpenAI)
- **Input:** article, cta
- **Output:** Task 1 (rewritten conclusion ≤120 words) + Task 2 (comparison table)

### 2G — Add Table
- **Model:** gpt-4o (OpenAI)
- **Input:** keyword, article
- **Output:** Article with markdown table inserted after first H2

### 2H — Find & Embed Quotes
- **Model:** deepseek-chat (DeepSeek)
- **Input:** keyword, article
- **Output:** Article with 2-3 expert quotes (blockquote format with specific-page URLs)

### 2I — Evaluator (NEW — replaces 2I+2J)
- **Model:** claude-sonnet-4-6 (Anthropic via GAS proxy)
- **Input:** keyword, article
- **Output:** JSON {eeat, hcu, eav, overall_score, pass}
- **Gate:** overall_score ≥ 70 = proceed; < 70 = retry (max 2) or flag human review
- **Scoring:** EEAT 7 params × 10 = 70, HCU 8 params × 10 = 80, EAV 5 params × 10 = 50
- **Weighted:** EEAT 35% + HCU 40% + EAV 25%
- **Template:** `n8n-templates/step-2i-evaluator.json`

---
**⚠️ v2.0 Change:** Step 2I (EEAT) + Step 2J (Quality Metrics) digabung jadi **2I Evaluator** saja.
**Template:** `n8n-templates/generic-llm-step.json` (duplicate per step, swap model/prompt)
```

---

### Card 3: Build Step 3A-3B sub-workflows (Images)

**Judul Baru:**
```
Phase 3: Images (3A–3D)
```

**Deskripsi Baru (replace seluruh deskripsi):**
```markdown
## Phase 3: Images — 4 Steps (v2.0 Change)

### 3A — Featured Image Prompt
- **Model:** gpt-4o-mini (OpenAI)
- **Input:** keyword, article
- **Output:** 1 detailed image generation prompt
- **Spec:** 1200×630, click-worthy, social-share ready, encapsulates core article theme

### 3B — Supporting Image 1 Prompt
- **Model:** gpt-4o-mini (OpenAI)
- **Input:** keyword, article
- **Output:** Prompt for first supporting image (800×600)
- **Spec:** Illustrates first key concept/data point from article

### 3C — Supporting Image 2 Prompt
- **Model:** gpt-4o-mini (OpenAI)
- **Input:** keyword, article
- **Output:** Prompt for second supporting image (800×600)
- **Spec:** Different section than Image 1, varied setting/subject

### 3D — Supporting Image 3 Prompt
- **Model:** gpt-4o-mini (OpenAI)
- **Input:** keyword, article
- **Output:** Prompt for third supporting image (800×600)
- **Spec:** Third distinct concept, varied from Images 1-2

---
**Style Rules (Jenni SOP):**
- Determine style: Photorealistic OR Vector/2D Flat Illustration
- ALL 4 images must use SAME style (strictly enforced)
- 16:9 aspect ratio for all
- Harmonious, friendly, relevant color palette
- Clean, minimal, balanced composition
- Only directly relevant elements
- Friendly, professional, academic tone

---
**⚠️ v2.0 Change:** Replaced 1 infographic + alt text → 1 Featured + 3 Supporting images.
**Template:** `n8n-templates/generic-llm-step.json` (output format = plain text)
```

---

### Card 4: Build Step 4A-4B sub-workflows (Linking)

**Deskripsi Update (tambah di bawah deskripsi existing):**
```markdown

---

## v2.0 Notes
- **Step 4A — Internal Linking:** gpt-4o-mini, exactly 3 links, extract keywords from URL slugs, no "read more"
- **Step 4B — External Linking:** gpt-4o, exactly 2-3 .gov/.edu/reputable links, contextual anchor, no fabricated URLs
- **Template:** `n8n-templates/generic-llm-step.json`
```

---

### Card 5: Build Step 5A sub-workflow (WordPress Publish)

**Deskripsi Update (tambah di bawah):**
```markdown

---

## v2.0 Template
- **Template file:** `n8n-templates/step-5a-wordpress.json`
- **Config required:** wordpress_url, wordpress_username, wordpress_app_password (in Google Sheets CONFIG tab)
- **Payload:** title, content, excerpt, slug, status, featured_media, categories, tags
```

---

### Card 6: Build Step 6A sub-workflow (Google Indexing)

**Deskripsi Update (tambah di bawah):**
```markdown

---

## v2.0 Template
- **Template file:** `n8n-templates/step-6a-indexing.json`
- **Config required:** gsc_site_url, gsc_service_account_email, gsc_service_account_key (in Google Sheets CONFIG tab)
- **API:** Google Search Console Indexing API v3
- **Payload:** {url, type: "URL_UPDATED"}
- **Rate limit:** 200 requests/day per site
```

---

### Card 7: Build all n8n workflow internals (11 workflows)

**Judul Baru:**
```
Build all n8n sub-workflows (22 steps)
```

**Deskripsi Baru:**
```markdown
## n8n Sub-Workflows — v2.0 (22 Steps)

### Phase 1: Research & Generation (5)
- 1A: AI SERP Research (OpenAI)
- 1B: Information Gain (DeepSeek)
- 1C: LSI Keywords (OpenAI)
- 1D: Outline Creation (DeepSeek)
- 1E: Generate Article (DeepSeek)

### Phase 2: Optimization (9)
- 2A: Title & Meta (OpenAI)
- 2B: Intro Rewrite (OpenAI)
- 2C: Originality Rewrite (DeepSeek)
- 2D: Fluff Check (OpenAI)
- 2E: FAQ Generation (OpenAI)
- 2F: Conclusion Optimizer (OpenAI)
- 2G: Add Table (OpenAI)
- 2H: Find & Embed Quotes (DeepSeek)
- 2I: Evaluator (Anthropic via GAS) — GATEKEEPER

### Phase 3: Images (4)
- 3A: Featured Image Prompt (OpenAI)
- 3B: Image 1 Prompt (OpenAI)
- 3C: Image 2 Prompt (OpenAI)
- 3D: Image 3 Prompt (OpenAI)

### Phase 4: Linking (2)
- 4A: Internal Linking (OpenAI)
- 4B: External Linking (OpenAI)

### Phase 5: Publish (1)
- 5A: WordPress Publish (System)

### Phase 6: Index (1)
- 6A: Request Indexing (System)

---
**Total: 22 sub-workflows (was 17)**
**Templates:** `n8n-templates/` folder
```

---

## Card BARU yang Perlu DIBUAT

### Buat di List "Done" (atau "Documentation")

| # | Judul Card | Deskripsi |
|---|---|---|
| 1 | **Pipeline Prompts v2.0 Updated** | `22 steps, AI-driven SERP, GEO/anti-detection rules, banned phrases, SPO structure, 2 external links rule, adaptive headings, human-style guidelines. File: pipeline-prompts-v2.md` |
| 2 | **n8n Templates Created** | `generic-llm-step.json, step-1a-serp.json, step-2i-evaluator.json, step-5a-wordpress.json, step-6a-indexing.json. Location: n8n-templates/` |
| 3 | **AI SERP Research (No API Key)** | `Step 1A uses AI knowledge to simulate SERP analysis. No DataForSEO, SerpAPI, or external API needed. Output: structured JSON with heading patterns, content gaps, PAA questions, intent, competitor weaknesses.` |
| 4 | **Admin UI v2.0 Rebuilt** | `22 steps, 6 phases, new research variables (serp_data, info_gain, lsi_keywords, outline), AI-driven SERP, 4 image prompts, combined Evaluator. File: admin-ui.html` |
| 5 | **n8n Setup Guide Created** | `Complete documentation: orchestrator loop, 22-step variable passing, retry logic for Evaluator, credential setup, testing guide. File: n8n-setup-guide.md` |

---

## Ringkasan Perubahan v2.0

| Aspek | v1.0 | v2.0 |
|---|---|---|
| **Total Steps** | 17 | **22** |
| **Phase 1** | 1 step (Generate Article) | **5 steps** (Research + Generation) |
| **Phase 2** | 10 steps (2A-2J) | **9 steps** (2I+2J digabung) |
| **Phase 3** | 2 steps (Infographic + Alt Text) | **4 steps** (1 Featured + 3 Supporting) |
| **SERP Research** | API key (DataForSEO) | **AI-driven (no API key)** |
| **Evaluator** | 2I (EEAT) + 2J (Quality) | **2I (EEAT+HCU+EAV gabung)** |
| **User Input** | keyword + internal_links + CTA | **keyword + internal_links** (CTA optional) |

---

*End of Checklist — Ready to copy-paste to Trello*
