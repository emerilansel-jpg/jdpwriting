# JDP Writing Pipeline v2.1 — Pipeline Redesign Proposal

> Proposal untuk perubahan Phase 2 (Optimization) dan Phase 3 (Images) berdasarkan permintaan owner.
> Dibuat: Juni 2026 | Base: v2.0 Cold Start

---

## 📊 Current vs New Pipeline Comparison

| Aspek | v2.0 (Current) | v2.1 (Proposed) | Δ |
|---|---|---|---|
| **Total Steps** | 22 | 23 | +1 |
| **Phase 1: Research** | 5 steps (1A–1E) | 5 steps (1A–1E) | — |
| **Phase 2: Optimization** | 9 steps (2A–2I) | 11 steps (2A–2K) | **+2** |
| **Phase 3: Images** | 4 steps (3A–3D) | 3 steps (3A–3C) | **−1** |
| **Phase 4: Linking** | 2 steps (4A–4B) | 2 steps (4A–4B) | — |
| **Phase 5: Publish** | 1 step (5A) | 1 step (5A) | — |
| **Phase 6: Indexing** | 1 step (6A) | 1 step (6A) | — |

---

## 🔧 Phase 2: Optimization — New Structure (11 Steps)

| Step | Name | What It Does | Output | Model | Provider |
|---|---|---|---|---|---|
| 2A | Title & Meta | SEO title, meta description, slug, OG tags | JSON | gpt-4o | OpenAI |
| 2B | Intro Rewrite | Rewrite hook to reduce bounce rate | Markdown | gpt-4o-mini | OpenAI |
| 2C | Originality Rewrite | Rephrase for uniqueness, pass AI detection | Markdown | deepseek-chat | DeepSeek |
| 2D | Fluff Check | Remove filler words, tighten writing | Markdown | gpt-4o | OpenAI |
| 2E | FAQ Generation | PAA-optimized FAQ schema | JSON | gpt-4o | OpenAI |
| 2F | Conclusion Optimizer | Strengthen conclusion + CTA | Markdown | gpt-4o | OpenAI |
| 2G | Add Table | Insert comparison/data table | Markdown | gpt-4o | OpenAI |
| 2H | Find & Embed Quotes | Add expert quotes with citations | Markdown | deepseek-chat | DeepSeek |
| **2I** | **EEAT+HCU+EAV Analysis** | **Deep-dive analysis: Experience, Expertise, Authority, Trust + Helpful Content Update signals + Entity-Attribute-Value structure** | **JSON** | **claude-sonnet-4-6** | **Anthropic** |
| **2J** | **Quality + Fact Check Analysis** | **Grammar, readability, factual accuracy check, source verification, claim validation** | **JSON** | **gpt-4o** | **OpenAI** |
| **2K** | **SEO/GEO Evaluator** | **Combined scoring: SEO (on-page, technical) + GEO (Generative Engine Optimization: ChatGPT/Perplexity/Gemini citation targeting) + Pass/Fail gate** | **JSON** | **claude-sonnet-4-6** | **Anthropic** |

### Perubahan Detail Phase 2

#### Step 2I — EEAT+HCU+EAV Analysis (NEW)
- **Posisi**: Setelah 2H (Find & Embed Quotes), sebelum Quality Analysis
- **Fungsi**: Menganalisis artikel dari 3 lensa sekaligus:
  1. **EEAT** (7 parameter): Experience, Expertise, Authority, Trust signals, Author bio, Citations, First-hand evidence
  2. **HCU** (8 parameter): Helpful Content Update — original value, depth, satisfaction, no clickbait, no regurgitation, etc.
  3. **EAV** (Entity-Attribute-Value): Semantic structure, entity salience, attribute coverage, value completeness
- **Output**: JSON dengan skor per-parameter, gaps, dan specific improvement recommendations
- **Why Anthropic**: Claude terbaik untuk structured analysis dan reasoning depth

#### Step 2J — Quality + Fact Check Analysis (NEW)
- **Posisi**: Setelah 2I, sebelum SEO/GEO Evaluator
- **Fungsi**: Dual analysis:
  1. **Quality**: Grammar, spelling, punctuation, readability score, tone consistency, passive voice, sentence length variation
  2. **Fact Check**: Extract all claims → verify against sources (web search or knowledge base) → flag unverified claims, contradictions, outdated stats
- **Output**: JSON dengan:
  - `quality_score` (0-100)
  - `readability_grade` (Flesch-Kincaid)
  - `claims[]` array dengan `{claim, verified, confidence, source, suggestion}`
  - `recommended_fixes[]`
- **Why GPT-4o**: Fast, precise untuk fact extraction + grammar

#### Step 2K — SEO/GEO Evaluator (renamed dari 2I)
- **Posisi**: Final gate sebelum Phase 3
- **Fungsi**: Combined evaluator dengan fokus baru:
  - **SEO**: On-page (title, meta, headings, internal links, schema), technical (Core Web Vitals recommendations, mobile friendliness)
  - **GEO**: Generative Engine Optimization — optimasi agar artikel dicite/direferensikan oleh AI search engines (ChatGPT, Perplexity, Gemini, Copilot)
    - Citation phrase optimization
    - Source-worthiness scoring
    - Direct answer formatting
  - **Pass/Fail Gate**: Overall score < 70 → trigger retry loop
- **Output**: JSON dengan:
  - `seo_score` (0-100)
  - `geo_score` (0-100)
  - `overall_score` (0-100)
  - `pass` (boolean)
  - `retry_prompt` (enhanced instructions if fail)
  - `geo_citation_phrases[]` (optimized phrases for AI engines)

### Retry Logic untuk Phase 2

```
If 2K Evaluator overall_score < 70:
  → Log to Google Sheets (HISTORY tab)
  → Inject retry_prompt ke article
  → Loop back ke Step 2A (Title & Meta) with enhanced context
  → Max retry: 2 attempts
  → After 2 retries, mark as "needs_manual_review" and proceed with warning
```

---

## 🖼️ Phase 3: Images — New Structure (3 Steps)

| Step | Name | What It Does | Output | Model | Provider |
|---|---|---|---|---|---|
| **3A** | **Image Prompts** | **Generate prompts for: Featured Image + 3 Supporting Images (gabung jadi 1 step)** | **JSON** | **gpt-4o-mini** | **OpenAI** |
| **3B** | **Infographic Image Prompt** | **Prompt untuk infographic/data visualization** | **Plain** | **gpt-4o-mini** | **OpenAI** |
| **3C** | **Alt Text Generation** | **Generate SEO-optimized alt text untuk setiap image, keyword-targeted** | **JSON** | **gpt-4o-mini** | **OpenAI** |

### Perubahan Detail Phase 3

#### Step 3A — Image Prompts (Gabungan)
- **Before**: 4 steps terpisah (3A Featured, 3B Image 1, 3C Image 2, 3D Image 3)
- **After**: 1 step yang generate 4 prompt sekaligus:
  - `featured_image_prompt` (1200×630, hero/banner style)
  - `supporting_image_1_prompt` (in-article illustration)
  - `supporting_image_2_prompt` (in-article illustration)
  - `supporting_image_3_prompt` (in-article illustration)
- **Output**: JSON dengan key per image + style guide (consistent color palette, tone)
- **Why digabung**: Mengurangi step count + 1 LLM call bisa handle 4 prompt sekaligus (cheaper, faster)
- **Token estimate**: ~500 tokens input, ~800 tokens output = ~$0.003 per run

#### Step 3B — Infographic Image Prompt (NEW)
- **Fungsi**: Generate prompt untuk infographic yang merangkum data/insight dari artikel
- **Output**: Plain text prompt dengan:
  - Data points yang harus divisualisasikan
  - Layout recommendation (vertical/horizontal, sections)
  - Style guide (sesuai brand JDP/SF Academy)
- **Why**: Infographic lebih shareable dan bisa dapat backlinks — asset SEO yang kuat

#### Step 3C — Alt Text Generation (NEW)
- **Fungsi**: Generate alt text untuk semua 5 images:
  - `featured_image_alt` (optimized untuk keyword utama + accessibility)
  - `supporting_image_1_alt`
  - `supporting_image_2_alt`
  - `supporting_image_3_alt`
  - `infographic_image_alt`
- **Rules per alt text**:
  - Max 125 characters (screen reader friendly)
  - Include keyword atau variasi LSI keyword secara natural
  - Describe image content, jangan keyword stuffing
  - Format: "[Description of image] — [relevance to article topic]"
- **Output**: JSON object dengan alt text per image
- **Why**: Alt text adalah on-page SEO signal yang sering diabaikan + accessibility requirement

### Images Summary (v2.1)

| Image | Type | Dimensions | Alt Text | Generated By |
|---|---|---|---|---|
| Featured Image | Hero/banner | 1200×630 | ✅ Yes | Step 3A → Generation |
| Supporting Image 1 | In-article | 800×600 | ✅ Yes | Step 3A → Generation |
| Supporting Image 2 | In-article | 800×600 | ✅ Yes | Step 3A → Generation |
| Supporting Image 3 | In-article | 800×600 | ✅ Yes | Step 3A → Generation |
| Infographic | Data viz | 1200×1600 (vertical) | ✅ Yes | Step 3B → Generation |
| **Total** | **5 images** | | **5 alt texts** | |

---

## 🎨 Image Generation: Direct Generation Strategy

### Option A: Pollinations.ai (RECOMMENDED — Free, No API Key)

**Pros:**
- 100% free, no signup
- Supports FLUX.1, Stable Diffusion, Kandinsky
- Direct image URL generation: `https://image.pollinations.ai/prompt/{encoded_prompt}?width=1200&height=630&nologo=true`
- No rate limit yang strict untuk moderate usage
- CORS-friendly (bisa dipakai langsung dari browser/Worker)

**Cons:**
- Less control over style consistency
- No inpainting/outpainting
- Public prompts (no privacy)
- Uptime ~95% (bukan enterprise-grade)

**Implementation in n8n:**
```
Step 3A/3B → Output prompts
  → n8n HTTP Request node: GET https://image.pollinations.ai/prompt/{prompt}?width=1200&height=630&nologo=true&seed=123
  → Save image to WordPress media library via REST API
  → Get WordPress attachment URL
  → Pass to Step 5A (WordPress Publish)
```

**Suitable for:** MVP, internal tool, testing pipeline

---

### Option B: DALL-E 3 via OpenAI API (Recommended for Production)

**Pros:**
- Excellent text rendering in images
- Consistent style via seed + prompt engineering
- Enterprise SLA via OpenAI
- n8n has native OpenAI node with DALL-E support
- Image quality tinggi untuk featured images

**Cons:**
- $0.04–$0.08 per image (1024×1024 = $0.04, 1024×1792 = $0.08)
- 5 images × $0.06 avg = **$0.30 per article** (menambah cost ~90%)
- Rate limit per API key

**Implementation in n8n:**
```
Step 3A/3B → Output prompts
  → n8n OpenAI node: Create Image (DALL-E 3)
    - model: dall-e-3
    - size: 1024x1024 (featured) atau 1024x1536 (infographic vertical)
    - quality: standard (hd untuk featured)
    - style: vivid atau natural
  → Save image ke temporary storage (WordPress media / R2 / S3)
  → Pass attachment URLs ke WordPress Publish step
```

**Cost estimate per article:**
- 5 images × $0.06 = $0.30
- Current pipeline cost: ~$0.33 (LLM calls only)
- **New total cost: ~$0.63 per article** (masih acceptable untuk SaaS internal)

**Suitable for:** Production, brand consistency, when image quality critical

---

### Option C: Replicate (FLUX.1 / Stable Diffusion) — Best Value

**Pros:**
- FLUX.1 quality ~DALL-E 3 level
- Harga: ~$0.025–$0.035 per image (cheaper than DALL-E 3)
- Open-source models, customizable
- Bisa self-host FLUX untuk unlimited generation (butuh GPU)

**Cons:**
- Need Replicate API key
- Text rendering inferior to DALL-E 3
- n8n requires HTTP Request node (no native Replicate node)

**Cost estimate per article:**
- 5 images × $0.03 = $0.15
- **New total cost: ~$0.48 per article**

**Suitable for:** Scale, balance cost vs quality

---

### Option D: Cloudflare Workers AI (Image Generation)

**Pros:**
- Bisa pakai model Stable Diffusion XL / FLUX via Cloudflare Workers AI
- Harga: ~$0.011 per 512×512 image, ~$0.043 per 1024×1024
- Sudah di infrastructure Cloudflare yang sama dengan Admin UI
- No extra vendor (consolidated billing)

**Cons:**
- Image quality bervariasi per model
- Workers AI masih beta untuk image generation
- Rate limits apply

**Suitable for:** Cloudflare-native stack, cost-conscious

---

### 🏆 Final Recommendation: Hybrid Approach

| Image Type | Generator | Why |
|---|---|---|
| **Featured Image** | DALL-E 3 (OpenAI) | Highest quality, text rendering OK, face of article |
| **Infographic** | DALL-E 3 (OpenAI) | Text in image = DALL-E 3 terbaik |
| **Supporting Images 1–3** | Pollinations.ai (FLUX.1) | Good enough, free, offset DALL-E 3 cost |

**Cost per article:**
- 2 images × DALL-E 3 @ $0.06 = $0.12
- 3 images × Pollinations @ $0.00 = $0.00
- **Image cost: $0.12** (vs $0.30 all-DALL-E)
- **New total pipeline cost: ~$0.45 per article**

**Implementation n8n flow:**
```
After Step 3C (Alt Text):
  ├─→ IF image_type == "featured" OR "infographic":
  │     → n8n OpenAI node: DALL-E 3 generation
  │     → Upload to WordPress media library
  │     → Return attachment URL + alt_text
  │
  └─→ IF image_type == "supporting":
        → n8n HTTP Request: Pollinations.ai URL
        → Upload to WordPress media library
        → Return attachment URL + alt_text

All 5 image URLs + alt texts → dikirim ke Step 5A (WordPress Publish)
  → WordPress REST API: create post with featured_media + inline images
```

---

## 📝 Updated LLM Mapping (v2.1)

| Step | Name | Model | Provider | Why |
|---|---|---|---|---|
| 1A | AI SERP Research | gpt-4o-mini | OpenAI | Fast, cheap SERP simulation |
| 1B | Information Gain | deepseek-chat | DeepSeek | Reasoning depth |
| 1C | LSI Keywords | gpt-4o-mini | OpenAI | Fast semantic extraction |
| 1D | Outline Creation | deepseek-chat | DeepSeek | Structural reasoning |
| 1E | Generate Article | deepseek-chat | DeepSeek | Best long-form writing |
| 2A | Title & Meta | gpt-4o | OpenAI | CTR optimization |
| 2B | Intro Rewrite | gpt-4o-mini | OpenAI | Fast hook rewriting |
| 2C | Originality Rewrite | deepseek-chat | DeepSeek | Paraphrasing |
| 2D | Fluff Check | gpt-4o | OpenAI | Precise editing |
| 2E | FAQ Generation | gpt-4o | OpenAI | PAA matching |
| 2F | Conclusion Optimizer | gpt-4o | OpenAI | CRO expertise |
| 2G | Add Table | gpt-4o | OpenAI | Structured data |
| 2H | Find & Embed Quotes | deepseek-chat | DeepSeek | Research depth |
| **2I** | **EEAT+HCU+EAV Analysis** | **claude-sonnet-4-6** | **Anthropic** | **Deep analysis & reasoning** |
| **2J** | **Quality + Fact Check** | **gpt-4o** | **OpenAI** | **Fact extraction + grammar** |
| **2K** | **SEO/GEO Evaluator** | **claude-sonnet-4-6** | **Anthropic** | **Quality evaluation + GEO** |
| 3A | Image Prompts | gpt-4o-mini | OpenAI | Fast creative briefs |
| 3B | Infographic Prompt | gpt-4o-mini | OpenAI | Data viz brief |
| 3C | Alt Text Generation | gpt-4o-mini | OpenAI | Fast, keyword-targeted |
| 4A | Internal Linking | gpt-4o-mini | OpenAI | Contextual links |
| 4B | External Linking | gpt-4o | OpenAI | Authority judgment |
| 5A | WordPress Publish | system | WordPress API | — |
| 6A | Request Indexing | system | Google API | — |

**API Usage Summary:**
- OpenAI: 14 steps (was 12) + 2 image generations (DALL-E 3)
- DeepSeek: 5 steps (unchanged)
- Anthropic: 2 steps (was 1 — EEAT+HCU+EAV + Evaluator)
- System: 2 steps (unchanged)
- Image Gen: DALL-E 3 (2 images) + Pollinations (3 images) = 5 images total

**Estimated Cost per Article (v2.1):**
- LLM calls: ~$0.35 (was ~$0.33 — slight increase dari 2I, 2J, 2K)
- Image generation: ~$0.12 (2 DALL-E 3 + 3 Pollinations)
- **Total: ~$0.47 per article**

---

## 🔄 New Pipeline Flow (23 Steps)

```
PHASE 1: RESEARCH & GENERATION (5 steps)
├─ 1A AI SERP Research → JSON
├─ 1B Information Gain → JSON
├─ 1C LSI Keywords → JSON
├─ 1D Outline Creation → Markdown
└─ 1E Generate Article → Markdown

PHASE 2: OPTIMIZATION (11 steps)
├─ 2A Title & Meta → JSON
├─ 2B Intro Rewrite → Markdown
├─ 2C Originality Rewrite → Markdown
├─ 2D Fluff Check → Markdown
├─ 2E FAQ Generation → JSON
├─ 2F Conclusion Optimizer → Markdown
├─ 2G Add Table → Markdown
├─ 2H Find & Embed Quotes → Markdown
├─ 2I EEAT+HCU+EAV Analysis → JSON  ← NEW
├─ 2J Quality + Fact Check Analysis → JSON  ← NEW
└─ 2K SEO/GEO Evaluator → JSON (Pass/Fail)  ← RENAMED
    └─ If < 70: Retry loop (max 2x) → back to 2A

PHASE 3: IMAGES (3 steps)
├─ 3A Image Prompts (Featured + 3 Supporting) → JSON  ← CONSOLIDATED
├─ 3B Infographic Image Prompt → Plain  ← NEW
└─ 3C Alt Text Generation (5 images) → JSON  ← NEW
    └─ Image Generation (hybrid: DALL-E 3 + Pollinations) → 5 image URLs

PHASE 4: LINKING (2 steps)
├─ 4A Internal Linking → Markdown
└─ 4B External Linking → Markdown

PHASE 5: PUBLISH (1 step)
└─ 5A WordPress Publish (with 5 images + alt texts) → System

PHASE 6: INDEXING (1 step)
└─ 6A Request Indexing → System
```

---

## 🗂️ Google Sheet Tabs Update (v2.1)

| Tab | Changes |
|---|---|
| **INPUT** | Unchanged — article queue |
| **HISTORY** | Add `retry_count` column, `image_generation_method` column |
| **PROMPTS** | Add 2 rows (2I, 2J) + update row 2K (was 2I) + update 3A (consolidated) + add 3B, 3C |
| **TRACKING** | 23 rows instead of 22 |
| **CONFIG** | Add `image_generation_provider` (pollinations/dalle/replicate/hybrid), `image_generation_budget` |

---

## 📝 Admin UI Update (v2.1)

### STEPS Array Update
```javascript
// Before: 22 steps
// After: 23 steps
const STEPS = [
  // Phase 1: 1A-1E (unchanged)
  // Phase 2: 2A-2H (unchanged), 2I (NEW), 2J (NEW), 2K (was 2I, renamed)
  // Phase 3: 3A (consolidated), 3B (NEW), 3C (NEW)
  // Phase 4-6: unchanged
];
```

### New Template Variables
- `{{eeat_hcu_eav_analysis}}` — untuk Step 2J input
- `{{quality_fact_check}}` — untuk Step 2K input
- `{{image_prompts}}` — untuk Step 3A output (JSON array)
- `{{infographic_prompt}}` — untuk Step 3B output
- `{{alt_texts}}` — untuk Step 3C output (JSON object)
- `{{image_urls}}` — untuk Step 5A input (array of uploaded image URLs)

### SEO/GEO Tab Enhancement (Admin UI)
Tambah field baru:
- `geo_target_engines[]`: ChatGPT, Perplexity, Gemini, Copilot (checkboxes)
- `geo_citation_style`: Direct answer / Comparison / How-to / Listicle
- `geo_source_type`: Primary / Secondary / Tertiary (untuk E-E-A-T signals)

---

## 🎯 Next Steps untuk Implementasi

### 1. Prompt Templates (Priority: HIGH)
- [ ] Buat prompt untuk Step 2I: EEAT+HCU+EAV Analysis
- [ ] Buat prompt untuk Step 2J: Quality + Fact Check Analysis
- [ ] Update prompt untuk Step 2K: SEO/GEO Evaluator (tambah GEO dimension)
- [ ] Update prompt untuk Step 3A: Image Prompts (consolidated 4-in-1)
- [ ] Buat prompt untuk Step 3B: Infographic Image Prompt
- [ ] Buat prompt untuk Step 3C: Alt Text Generation

### 2. n8n Templates (Priority: HIGH)
- [ ] Update `generic-llm-step.json` untuk support 2I, 2J, 2K
- [ ] Update `step-3a-image-prompts.json` (consolidated)
- [ ] Buat `step-3b-infographic.json`
- [ ] Buat `step-3c-alt-text.json`
- [ ] Buat n8n template untuk image generation (DALL-E 3 + Pollinations hybrid)
- [ ] Update orchestrator untuk 23 steps + retry logic yang baru

### 3. Admin UI (Priority: MEDIUM)
- [ ] Update STEPS array dari 22 → 23
- [ ] Tambah template variables baru
- [ ] Update SEO/GEO tab dengan GEO fields
- [ ] Update cost estimator (~$0.47/run)

### 4. Apps Script (Priority: MEDIUM)
- [ ] Update `WebApp.gs` untuk handle new template variables
- [ ] Update `N8nSetup.gs` untuk create new sub-workflows

### 5. Testing (Priority: HIGH)
- [ ] Test Step 2I standalone
- [ ] Test Step 2J standalone
- [ ] Test Step 2K dengan retry logic
- [ ] Test image generation (DALL-E 3 + Pollinations)
- [ ] Test end-to-end dengan 1 keyword

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Pipeline steps bertambah 23 → runtime lebih lama | Medium | 2I, 2J, 2K bisa parallel jika tidak dependent (2I & 2J independent, 2K dependent on both) |
| Cost naik ~40% ($0.33 → $0.47) | Medium | Image generation optional (toggle di CONFIG) — bisa disable untuk testing |
| Pollinations downtime | Low | Fallback ke DALL-E 3 untuk semua images jika Pollinations fail |
| Fact check accuracy | High | 2J fact check uses web search — add disclaimer: "AI-generated fact check, verify manually for critical claims" |
| GEO optimization masih experimental | Medium | Monitor AI search citation rates via analytics; iterate GEO prompts |

---

## 📎 File Referensi Update

| File | Action |
|---|---|
| `pipeline-prompts-v2.md` | Update → `pipeline-prompts-v2.1.md` |
| `n8n-setup-guide.md` | Update untuk 23 steps + image generation |
| `n8n-templates/generic-llm-step.json` | Update untuk new steps |
| `n8n-templates/step-3a-image-prompts.json` | NEW (consolidated) |
| `n8n-templates/step-3b-infographic.json` | NEW |
| `n8n-templates/step-3c-alt-text.json` | NEW |
| `n8n-templates/step-image-generation.json` | NEW (hybrid DALL-E + Pollinations) |
| `admin-ui.html` | Update STEPS array + SEO/GEO tab |
| `coldstart.md` | Update → `coldstart.md` (this proposal becomes reference) |

---

> **Keputusan Owner Needed:**
> 1. Approve struktur 23 steps?
> 2. Pilih image generation strategy: Hybrid (DALL-E 3 + Pollinations), all DALL-E 3, atau all Pollinations?
> 3. Apakah Fact Check Analysis di 2J perlu web search integration (n8n HTTP node ke Google/Bing) atau cukup AI knowledge-based?
> 4. GEO optimization — target AI engine mana dulu? (ChatGPT, Perplexity, Gemini, Copilot)
