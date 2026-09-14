# Graph Report - .  (2026-08-07)

## Corpus Check
- 36 files · ~60,277 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 55 nodes · 89 edges · 8 communities
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Pipeline Prompt Templates
- Admin UI & n8n Setup
- Template Generator Scripts
- Optimization Analysis Steps
- Task Tracking & Article Gen
- Generic Template Updater

## God Nodes (most connected - your core abstractions)
1. `Pipeline Prompt Templates v2.1` - 15 edges
2. `JDP Writing Pipeline Cold Start Guide` - 9 edges
3. `Step 2I: EEAT+HCU+EAV Analysis Prompt` - 8 edges
4. `Step 2K: SEO/GEO Evaluator Prompt` - 8 edges
5. `JDP Pipeline Admin UI` - 6 edges
6. `n8n Setup Guide` - 6 edges
7. `Pipeline Redesign v2.1 Proposal` - 5 edges
8. `Trello Card Update Checklist v2.0` - 5 edges
9. `Step 2J: Quality + Fact Check Prompt` - 5 edges
10. `Step 3A: Consolidated Image Prompts` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Variable Mapping Between Steps (v2.0)` --semantically_similar_to--> `Variable Mapping Between Steps (v2.1)`  [INFERRED] [semantically similar]
  pipeline-prompts-v2.md → pipeline-prompts-v2.1.md
- `Step 2I: Combined Evaluator (v2.0)` --semantically_similar_to--> `Step 2I: EEAT+HCU+EAV Analysis Prompt`  [INFERRED] [semantically similar]
  pipeline-prompts-v2.md → pipeline-prompts-v2.1.md
- `Step 2I: Combined Evaluator (v2.0)` --semantically_similar_to--> `Step 2K: SEO/GEO Evaluator Prompt`  [INFERRED] [semantically similar]
  pipeline-prompts-v2.md → pipeline-prompts-v2.1.md
- `Trello Card: n8n Sub-Workflows` --references--> `n8n Setup Guide`  [EXTRACTED]
  trello-update-checklist.md → n8n-setup-guide.md
- `STEPS Array (23 Pipeline Steps)` --shares_data_with--> `Pipeline Prompt Templates v2.1`  [INFERRED]
  admin-ui.html → pipeline-prompts-v2.1.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **JDP Pipeline 3-Layer Architecture** — admin_ui_html, coldstart_md, n8n_setup_guide_md, n8n_setup_guide_md_orchestrator_loop, n8n_setup_guide_md_variable_passing, pipeline_prompts_v2_1_md_variable_mapping, admin_ui_html_upstream_map [INFERRED 0.85]
- **Phase 1: Research & Generation Pipeline Steps** — pipeline_prompts_v2_1_md_step_1a, pipeline_prompts_v2_1_md_step_1e, pipeline_prompts_v2_md_variable_mapping, trello_update_checklist_md_phase_1_card, pipeline_prompts_v2_1_md_variable_mapping [EXTRACTED 1.00]
- **Phase 2: Optimization Analysis Pipeline (2I-2K)** — pipeline_prompts_v2_1_md_step_2i, pipeline_prompts_v2_1_md_step_2j, pipeline_prompts_v2_1_md_step_2k, pipeline_prompts_v2_1_md_step_2i_rationale, pipeline_prompts_v2_1_md_retry_logic [EXTRACTED 1.00]

## Communities (8 total, 0 thin omitted)

### Community 0 - "Pipeline Prompt Templates"
Cohesion: 0.36
Nodes (11): Pipeline Prompt Templates v2.1, Step 1A: AI SERP Research Prompt, Step 3A: Consolidated Image Prompts, Step 3B: Infographic Image Prompt, Step 3C: Alt Text Generation Prompt, Variable Mapping Between Steps (v2.1), Pipeline Prompt Templates v2.0, Variable Mapping Between Steps (v2.0) (+3 more)

### Community 1 - "Admin UI & n8n Setup"
Cohesion: 0.33
Nodes (10): JDP Pipeline Admin UI, callLLM (Multi-provider LLM Dispatcher), runAllSteps (Pipeline Execution), STEPS Array (23 Pipeline Steps), Upstream Map (Step Dependencies), Web App URL (GAS proxy), n8n Setup Guide, Orchestrator Loop Pattern (+2 more)

### Community 2 - "Template Generator Scripts"
Cohesion: 0.20
Nodes (9): archivedEvaluator, baseDir, fs, oldEvaluator, outDir, path, rawTemplate, steps (+1 more)

### Community 3 - "Optimization Analysis Steps"
Cohesion: 0.46
Nodes (8): JDP Writing Pipeline Cold Start Guide, Retry Logic for 2K Evaluator, Step 2I: EEAT+HCU+EAV Analysis Prompt, EEAT+HCU+EAV Analysis Rationale, Step 2J: Quality + Fact Check Prompt, Step 2K: SEO/GEO Evaluator Prompt, Step 2I: Combined Evaluator (v2.0), Phase 2 Redesign Proposal (2I/2J/2K)

### Community 4 - "Task Tracking & Article Gen"
Cohesion: 0.33
Nodes (6): Step 1E: Generate Article Prompt, Trello Card Update Checklist v2.0, Trello Card: n8n Sub-Workflows, Trello Card: Phase 1 (1A-1E), Trello Card: Phase 2 (2A-2I), Trello Card: Phase 3 (3A-3D)

### Community 5 - "Generic Template Updater"
Cohesion: 0.33
Nodes (5): baseDir, fs, outFile, path, template

## Knowledge Gaps
- **15 isolated node(s):** `fs`, `path`, `baseDir`, `templateFile`, `outDir` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Pipeline Prompt Templates v2.1` connect `Pipeline Prompt Templates` to `Admin UI & n8n Setup`, `Optimization Analysis Steps`, `Task Tracking & Article Gen`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `JDP Writing Pipeline Cold Start Guide` connect `Optimization Analysis Steps` to `Pipeline Prompt Templates`, `Admin UI & n8n Setup`, `Task Tracking & Article Gen`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `n8n Setup Guide` connect `Admin UI & n8n Setup` to `Pipeline Prompt Templates`, `Optimization Analysis Steps`, `Task Tracking & Article Gen`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `baseDir` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._