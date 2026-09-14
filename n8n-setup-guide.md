# JDP Pipeline v2.1 — n8n Setup Guide

> Complete guide for building n8n sub-workflows and orchestrator for the 23-step v2.1 pipeline.
> Last updated: 2026-07-10

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1: Credential Setup](#step-1-credential-setup)
- [Step 2: Sub-Workflow Template](#step-2-sub-workflow-template)
- [Step 3: Phase 1 Sub-Workflows (1A–1E)](#step-3-phase-1-sub-workflows-1a1e)
- [Step 4: Phase 2 Sub-Workflows (2A–2K)](#step-4-phase-2-sub-workflows-2a2k)
- [Step 5: Phase 3 Sub-Workflows (3A–3C)](#step-5-phase-3-sub-workflows-3a3c)
- [Step 6: Phase 4–6 Sub-Workflows](#step-6-phase-46-sub-workflows)
- [Step 7: Update Orchestrator](#step-7-update-orchestrator)
- [Step 8: Variable Passing Reference](#step-8-variable-passing-reference)
- [Step 9: Testing & Debugging](#step-9-testing--debugging)
- [Import Templates](#import-templates)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  GOOGLE SHEETS (Config + Prompts + Tracking)                 │
│  ├── PROMPTS tab: 23 rows (1 per step)                       │
│  ├── INPUT tab: article queue                                │
│  ├── TRACKING tab: execution log                             │
│  └── CONFIG tab: API keys + pipeline settings                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  n8n ORCHESTRATOR (Main Workflow)                            │
│  ├── Trigger: HTTP Webhook (from Google Sheets / manual)    │
│  ├── Read INPUT row → get keyword + internal_links + CTA   │
│  ├── Loop through 23 steps in sequence                      │
│  │   ├── If step enabled → call sub-workflow via "Execute  │
│  │   │   Workflow" node                                     │
│  │   ├── Pass all accumulated variables                     │
│  │   └── Store named output for next step                   │
│  ├── Phase 2K Evaluator Gate → if score < 70, retry loop   │
│  └── WordPress Publish + Google Indexing                   │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ Step 1A │  │ Step 1B │  │  ...   │  ← 23 sub-workflows
        │ (SERP)  │  │(Info   │  │        │
        │         │  │ Gain)  │  │        │
        └─────────┘  └─────────┘  └─────────┘
```

---

## Prerequisites

| Requirement | How to Check |
|---|---|
| n8n running on Render.com | https://n8n-jdp-pipeline.onrender.com |
| Google Sheets OAuth connected | n8n credentials → Google Sheets |
| API keys stored in n8n | OpenAI, DeepSeek (currently all LLM steps use DeepSeek) |
| n8n API key for Apps Script | n8n → Settings → API → Generate Key |

---

## Step 1: Credential Setup

### 1.1 Google Sheets OAuth
1. Go to n8n → Settings → Credentials
2. Click "New" → Search "Google Sheets"
3. Choose "OAuth2 API"
4. Use the same Google Cloud project as Apps Script
5. Scopes needed: `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive.readonly`
6. Name it: **`google-sheets-jdp`**

### 1.2 API Keys (HTTP Header Auth)

All LLM-driven steps in the v2.1 Admin UI are currently configured to use **`deepseek-chat`**. Create an HTTP Header Auth credential for it:

**DeepSeek**
- Name: **`deepseek-api-key`**
- Header Name: `Authorization`
- Value: `Bearer sk-...`

You can keep `openai-api-key` and `anthropic-gas-proxy` credentials if you want to switch models later, but the current deployment does not use them.

---

## Step 2: Sub-Workflow Template

Every LLM sub-workflow follows the same pattern. The generic template is in `n8n-templates/generic-llm-step.json`. A generator script (`scripts/generate-n8n-templates.js`) creates all 21 Phase 1–4 templates from this base.

### Node Structure

```
[Execute Workflow Trigger] → [Read PROMPTS from Sheets]
    ↘ [Find Step Config] → [Prepare Prompt] → [Call LLM API]
                              → [Parse Output] → [Save to TRACKING] → [Return Output]
```

The trigger node receives the **accumulated pipeline payload**; `Find Step Config` merges it with the matching row from the `PROMPTS` sheet so every downstream variable is available for substitution.

### Input payload from orchestrator

```json
{
  "keyword": "how to sleep fast",
  "internal_links": "https://jetdigitalpro.com/sleep-tips",
  "external_links": "",
  "cta": "Download our free sleep guide",
  "serp_data": "{...}",
  "info_gain": "{...}",
  "lsi_keywords": "{...}",
  "outline": "# Outline...",
  "article": "# Article...",
  "prev_output": "...",
  "eeat_hcu_eav_analysis": "{...}",
  "quality_fact_check": "{...}",
  "seo_geo_evaluator": "{...}",
  "image_prompts": "{...}",
  "infographic_prompt": "...",
  "alt_texts": "{...}",
  "title": "...",
  "meta_description": "...",
  "slug": "...",
  "post_url": "..."
}
```

### PROMPTS sheet columns

A: `step_id`, B: `step_name`, C: `model`, D: `temperature`, E: `max_tokens`, F: `output_format`, G: `system_prompt`, H: `user_prompt`, I: `enabled`, J: `n8n_workflow_id`

### Output naming

Each step writes its primary output to a named field so the orchestrator can merge it into the accumulator:

| Step | Output field |
|---|---|
| 1A | `serp_data` |
| 1B | `info_gain` |
| 1C | `lsi_keywords` |
| 1D | `outline` |
| 1E | `article` |
| 2A | `title_meta` |
| 2B–2D, 2F–2H, 4A, 4B | `article` |
| 2E | `faq` |
| 2I | `eeat_hcu_eav_analysis` |
| 2J | `quality_fact_check` |
| 2K | `seo_geo_evaluator` |
| 3A | `image_prompts` |
| 3B | `infographic_prompt` |
| 3C | `alt_texts` |
| 5A | `post_url`, `post_id` |
| 6A | `index_status` |

---

## Step 3: Phase 1 Sub-Workflows (1A–1E)

All Phase 1 LLM steps are configured to use **`deepseek-chat`** in the Admin UI.

| Step | Input variables | Output | Template file |
|---|---|---|---|
| 1A — AI SERP Research | `{{keyword}}` | `serp_data` | `step-1a-serp.json` |
| 1B — Information Gain | `{{keyword}}`, `{{serp_data}}` | `info_gain` | `step-1b-info-gain.json` |
| 1C — LSI Keywords | `{{keyword}}`, `{{prev_output}}` | `lsi_keywords` | `step-1c-lsi-keywords.json` |
| 1D — Outline Creation | `{{keyword}}`, `{{serp_data}}`, `{{info_gain}}`, `{{lsi_keywords}}`, `{{internal_links}}`, `{{cta}}` | `outline` | `step-1d-outline.json` |
| 1E — Generate Article | `{{keyword}}`, `{{outline}}`, `{{serp_data}}`, `{{info_gain}}`, `{{lsi_keywords}}`, `{{internal_links}}`, `{{cta}}` | `article` | `step-1e-article.json` |

---

## Step 4: Phase 2 Sub-Workflows (2A–2K)

Phase 2 was expanded from the old single evaluator to three granular steps plus the final 2K gate.

| Step | Input variables | Output | Template file |
|---|---|---|---|
| 2A — Title & Meta | `{{keyword}}`, `{{article}}`, `{{outline}}` | `title_meta` | `step-2a-title-meta.json` |
| 2B — Intro Rewrite | `{{keyword}}`, `{{article}}` | `article` | `step-2b-intro-rewrite.json` |
| 2C — Originality Rewrite | `{{article}}` | `article` | `step-2c-originality-rewrite.json` |
| 2D — Fluff Check | `{{article}}` | `article` | `step-2d-fluff-check.json` |
| 2E — FAQ Generation | `{{keyword}}`, `{{article}}` | `faq` | `step-2e-faq-generation.json` |
| 2F — Conclusion Optimizer | `{{keyword}}`, `{{article}}`, `{{cta}}` | `article` | `step-2f-conclusion-optimizer.json` |
| 2G — Add Table | `{{keyword}}`, `{{article}}` | `article` | `step-2g-add-table.json` |
| 2H — Find & Embed Quotes | `{{keyword}}`, `{{article}}` | `article` | `step-2h-find-embed-quotes.json` |
| 2I — EEAT+HCU+EAV Analysis | `{{keyword}}`, `{{article}}`, `{{serp_data}}` | `eeat_hcu_eav_analysis` | `step-2i-eeat-hcu-eav.json` |
| 2J — Quality + Fact Check | `{{keyword}}`, `{{article}}`, `{{eeat_hcu_eav_analysis}}` | `quality_fact_check` | `step-2j-quality-fact-check.json` |
| 2K — SEO/GEO Evaluator | `{{keyword}}`, `{{article}}`, `{{eeat_hcu_eav_analysis}}`, `{{quality_fact_check}}` | `seo_geo_evaluator` | `step-2k-seo-geo-evaluator.json` |

### 2K Gate Logic

```javascript
const evaluator = $input.first().json.seo_geo_evaluator;
const overallScore = evaluator.overall_score || 0;
const criticalBlockers = evaluator.critical_blockers || [];
const retryCount = $input.first().json.retry_count || 0;
const maxRetries = 2;

if (criticalBlockers.length > 0) {
  return [{ json: { action: 'flag_human_review', evaluator } }];
}

if (overallScore >= 70) {
  return [{ json: { action: 'proceed' } }];
}

if (retryCount < maxRetries) {
  return [{
    json: {
      action: 'retry',
      retry_count: retryCount + 1,
      retry_prompt: evaluator.retry_prompt,
      top_3_seo_fixes: evaluator.top_3_seo_fixes,
      top_3_geo_fixes: evaluator.top_3_geo_fixes
    }
  }];
}

return [{ json: { action: 'flag_human_review', evaluator } }];
```

---

## Step 5: Phase 3 Sub-Workflows (3A–3C)

Phase 3 was consolidated from four separate image prompts into one plus infographic and alt text.

| Step | Input variables | Output | Template file |
|---|---|---|---|
| 3A — Image Prompts (Consolidated) | `{{article}}` | `image_prompts` | `step-3a-image-prompts.json` |
| 3B — Infographic Image Prompt | `{{keyword}}`, `{{article}}`, `{{image_prompts}}` | `infographic_prompt` | `step-3b-infographic-prompt.json` |
| 3C — Alt Text Generation | `{{keyword}}`, `{{image_prompts}}`, `{{infographic_prompt}}` | `alt_texts` | `step-3c-alt-texts.json` |

Image generation itself is on hold pending the owner’s strategy decision.

---

## Step 6: Phase 4–6 Sub-Workflows

### Phase 4 — Linking

| Step | Input variables | Output | Template file |
|---|---|---|---|
| 4A — Internal Linking | `{{article}}`, `{{internal_links}}` | `article` | `step-4a-internal-linking.json` |
| 4B — External Linking | `{{article}}`, `{{external_links}}` | `article` | `step-4b-external-linking.json` |

### Phase 5 — WordPress Publish

- **Type:** System (no LLM)
- **Action:** HTTP Request to WordPress REST API
- **Input:** `{{article}}`, `{{title}}`, `{{meta_description}}`, `{{slug}}`, `{{alt_texts}}`
- **Required:** WordPress URL, username, application password
- **Output:** `post_url`, `post_id`
- **Template:** `step-5a-wordpress.json`

### Phase 6 — Request Indexing

- **Type:** System (no LLM)
- **Action:** HTTP Request to Google Search Console Indexing API
- **Input:** `{{post_url}}`
- **Output:** `index_status`
- **Template:** `step-6a-indexing.json`

---

## Step 7: Update Orchestrator

Use a loop-based orchestrator instead of 23 separate nodes.

```
[HTTP Trigger] → [Read INPUT row] → [Initialize accumulator]
    → [Loop: For each enabled step]
    │   → [Execute Sub-Workflow] → [Store named output in accumulator]
    │   → [If step == 2K] → [Pass/fail/retry logic]
    │   → [Continue loop]
    → [After loop] → [WordPress Publish] → [Google Indexing]
    → [Update INPUT status = "done"]
```

### Loop step list (Code Node)

```javascript
const steps = [
  { id: '1A', var: 'serp_data', input: ['keyword'] },
  { id: '1B', var: 'info_gain', input: ['keyword', 'serp_data'] },
  { id: '1C', var: 'lsi_keywords', input: ['keyword', 'prev_output'] },
  { id: '1D', var: 'outline', input: ['keyword', 'serp_data', 'info_gain', 'lsi_keywords', 'internal_links', 'cta'] },
  { id: '1E', var: 'article', input: ['keyword', 'outline', 'serp_data', 'info_gain', 'lsi_keywords', 'internal_links', 'cta'] },
  { id: '2A', var: 'title_meta', input: ['keyword', 'article', 'outline'] },
  { id: '2B', var: 'article', input: ['keyword', 'article'] },
  { id: '2C', var: 'article', input: ['article'] },
  { id: '2D', var: 'article', input: ['article'] },
  { id: '2E', var: 'faq', input: ['keyword', 'article'] },
  { id: '2F', var: 'article', input: ['keyword', 'article', 'cta'] },
  { id: '2G', var: 'article', input: ['keyword', 'article'] },
  { id: '2H', var: 'article', input: ['keyword', 'article'] },
  { id: '2I', var: 'eeat_hcu_eav_analysis', input: ['keyword', 'article', 'serp_data'] },
  { id: '2J', var: 'quality_fact_check', input: ['keyword', 'article', 'eeat_hcu_eav_analysis'] },
  { id: '2K', var: 'seo_geo_evaluator', input: ['keyword', 'article', 'eeat_hcu_eav_analysis', 'quality_fact_check'] },
  { id: '3A', var: 'image_prompts', input: ['article'] },
  { id: '3B', var: 'infographic_prompt', input: ['keyword', 'article', 'image_prompts'] },
  { id: '3C', var: 'alt_texts', input: ['keyword', 'image_prompts', 'infographic_prompt'] },
  { id: '4A', var: 'article', input: ['article', 'internal_links'] },
  { id: '4B', var: 'article', input: ['article', 'external_links'] },
  { id: '5A', var: 'post_url', input: ['article', 'title_meta', 'alt_texts'] },
  { id: '6A', var: 'index_status', input: ['post_url'] }
];

return steps.map(s => ({ json: s }));
```

After each sub-workflow, merge the returned output field into the accumulator using the step's `var` name.

---

## Step 8: Variable Passing Reference

| Step | Receives | Produces | Used By |
|---|---|---|---|
| 1A | `keyword` | `serp_data` | 1B, 1D, 1E, 2I |
| 1B | `keyword`, `serp_data` | `info_gain` | 1D, 1E |
| 1C | `keyword`, `prev_output` | `lsi_keywords` | 1D, 1E |
| 1D | `keyword`, `serp_data`, `info_gain`, `lsi_keywords`, `internal_links`, `cta` | `outline` | 1E, 2A |
| 1E | `keyword`, `outline`, `serp_data`, `info_gain`, `lsi_keywords`, `internal_links`, `cta` | `article` | 2A–2K, 3A–3B, 4A–4B |
| 2A | `keyword`, `article`, `outline` | `title_meta` | 5A |
| 2B | `keyword`, `article` | `article` | 2C |
| 2C | `article` | `article` | 2D |
| 2D | `article` | `article` | 2E, 2F, 2G, 2H |
| 2E | `keyword`, `article` | `faq` | (append to article) |
| 2F | `keyword`, `article`, `cta` | `article` | 2G |
| 2G | `keyword`, `article` | `article` | 2H |
| 2H | `keyword`, `article` | `article` | 2I, 2J, 2K, 3A, 3B |
| 2I | `keyword`, `article`, `serp_data` | `eeat_hcu_eav_analysis` | 2J, 2K |
| 2J | `keyword`, `article`, `eeat_hcu_eav_analysis` | `quality_fact_check` | 2K |
| 2K | `keyword`, `article`, `eeat_hcu_eav_analysis`, `quality_fact_check` | `seo_geo_evaluator` | Gate decision |
| 3A | `article` | `image_prompts` | 3B, 3C |
| 3B | `keyword`, `article`, `image_prompts` | `infographic_prompt` | 3C |
| 3C | `keyword`, `image_prompts`, `infographic_prompt` | `alt_texts` | 5A |
| 4A | `article`, `internal_links` | `article` | 4B, 5A |
| 4B | `article`, `external_links` | `article` | 5A |
| 5A | `article`, `title_meta`, `alt_texts` | `post_url`, `post_id` | 6A |
| 6A | `post_url` | `index_status` | Done |

---

## Step 9: Testing & Debugging

### 9.1 Test Individual Sub-Workflow

1. Open the sub-workflow in n8n
2. Click "Execute Workflow" (manually)
3. Paste test JSON in trigger:

```json
{
  "keyword": "how to sleep fast",
  "internal_links": "https://jetdigitalpro.com/sleep-tips",
  "external_links": "",
  "cta": "Download our free sleep guide",
  "serp_data": "{}",
  "info_gain": "{}",
  "lsi_keywords": "{}",
  "outline": "# Test Outline",
  "article": "# Test Article",
  "prev_output": "",
  "eeat_hcu_eav_analysis": "{}",
  "quality_fact_check": "{}",
  "seo_geo_evaluator": "{}",
  "image_prompts": "{}",
  "infographic_prompt": "",
  "alt_texts": "{}",
  "title": "Test Title",
  "meta_description": "Test meta",
  "slug": "test-slug",
  "post_url": ""
}
```

4. Check output and Google Sheets `TRACKING` tab

### 9.2 Test Orchestrator

Trigger via HTTP webhook:

```bash
curl -X POST https://n8n-jdp-pipeline.onrender.com/webhook/pipeline-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"keyword":"how to sleep fast","internal_links":"https://example.com","cta":"Download now"}'
```

Check `INPUT` and `TRACKING` tabs in Google Sheets.

### 9.3 Common Issues

| Issue | Cause | Fix |
|---|---|---|
| LLM returns invalid JSON | Model hallucinated | Add JSON validation code node, retry with fallback |
| Variable not substituted | `{{var}}` not in input payload | Check orchestrator passes all required variables |
| Sheets timeout | Too many API calls | Add "Wait" node (1–2s) between operations |
| WordPress 401 | Wrong credentials | Use Application Password, not login password |
| Indexing API 403 | Service account missing | Add site owner in GSC, verify service account email |
| Old evaluator template still used | `step-2i-evaluator.json` was archived | Use `step-2i-eeat-hcu-eav.json` for 2I and `step-2k-seo-geo-evaluator.json` for 2K |

---

## Import Templates

### How to Import a JSON Template into n8n
1. Open n8n → Workflows
2. Click "Add Workflow"
3. In the workflow editor, click the menu (☰) → Import from File
4. Select the `.json` file from `n8n-templates/` folder
5. Connect credentials
6. Save and test

### Sync Workflow IDs to Admin UI

After importing each template into n8n, copy the workflow ID into the `PROMPTS` sheet’s `n8n_workflow_id` column (column J) and into the Admin UI Advanced tab. The Admin UI reads this ID from the sheet when saving, so the easiest workflow is:

1. Import the 21 Phase 1–4 templates into n8n.
2. For each imported workflow, note its ID from the n8n URL (e.g., `djacQwE4vLuW3rHE`).
3. Paste the IDs into the `PROMPTS` sheet column J, starting at row 2.
4. Refresh the Admin UI. The IDs will be saved/loaded with each step.

You can also update `admin-ui.html` directly if you prefer to keep the IDs in code:

```javascript
const STEPS = [
  { id:'1A', name:'AI SERP Research', ..., n8nId:'YOUR_1A_ID_HERE', ... },
  // ...
];
```

### Available Templates

| Template | File | Description |
|---|---|---|
| Step 1A — SERP | `step-1a-serp.json` | DeepSeek, JSON output |
| Step 1B — Information Gain | `step-1b-info-gain.json` | DeepSeek, JSON output |
| Step 1C — LSI Keywords | `step-1c-lsi-keywords.json` | DeepSeek, JSON output |
| Step 1D — Outline | `step-1d-outline.json` | DeepSeek, markdown output |
| Step 1E — Article | `step-1e-article.json` | DeepSeek, markdown output |
| Step 2A — Title & Meta | `step-2a-title-meta.json` | DeepSeek, JSON output |
| Step 2B — Intro Rewrite | `step-2b-intro-rewrite.json` | DeepSeek, markdown output |
| Step 2C — Originality | `step-2c-originality-rewrite.json` | DeepSeek, markdown output |
| Step 2D — Fluff Check | `step-2d-fluff-check.json` | DeepSeek, markdown output |
| Step 2E — FAQ | `step-2e-faq-generation.json` | DeepSeek, JSON output |
| Step 2F — Conclusion | `step-2f-conclusion-optimizer.json` | DeepSeek, markdown output |
| Step 2G — Table | `step-2g-add-table.json` | DeepSeek, markdown output |
| Step 2H — Quotes | `step-2h-find-embed-quotes.json` | DeepSeek, markdown output |
| Step 2I — EEAT/HCU/EAV | `step-2i-eeat-hcu-eav.json` | DeepSeek, JSON output |
| Step 2J — Quality/Fact | `step-2j-quality-fact-check.json` | DeepSeek, JSON output |
| Step 2K — SEO/GEO Evaluator | `step-2k-seo-geo-evaluator.json` | DeepSeek, JSON output, gate |
| Step 3A — Image Prompts | `step-3a-image-prompts.json` | DeepSeek, JSON output |
| Step 3B — Infographic | `step-3b-infographic-prompt.json` | DeepSeek, plain text output |
| Step 3C — Alt Text | `step-3c-alt-texts.json` | DeepSeek, JSON output |
| Step 4A — Internal Links | `step-4a-internal-linking.json` | DeepSeek, markdown output |
| Step 4B — External Links | `step-4b-external-linking.json` | DeepSeek, markdown output |
| Step 5A — WordPress | `step-5a-wordpress.json` | System: WordPress REST API |
| Step 6A — Indexing | `step-6a-indexing.json` | System: Google Search Console |
| Generic LLM Template | `generic-llm-step.json` | Base template for all LLM steps |

---

## Next Steps

1. Import the new v2.1 templates into n8n (especially 2I, 2J, 2K, 3A, 3B, 3C)
2. Connect the `deepseek-api-key` and `google-sheets-jdp` credentials
3. Copy the prompt templates from `pipeline-prompts-v2.1.md` into the Google Sheets `PROMPTS` tab (or keep the pre-filled defaults from the Admin UI)
4. Test each new sub-workflow individually
5. Build the orchestrator loop with 23 steps and the 2K retry gate
6. Test end-to-end with one keyword
7. Add error notifications (Slack/Telegram)

---

*End of n8n Setup Guide v2.1*
