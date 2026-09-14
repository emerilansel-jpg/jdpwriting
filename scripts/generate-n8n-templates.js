const fs = require('fs');
const path = require('path');

const baseDir = path.dirname(__dirname);
const templateFile = path.join(baseDir, 'n8n-templates', 'generic-llm-step.json');
const outDir = path.join(baseDir, 'n8n-templates');

const steps = [
  { id: '1A', name: 'AI SERP Research', outputVar: 'serp_data', file: 'step-1a-serp.json' },
  { id: '1B', name: 'Information Gain', outputVar: 'info_gain', file: 'step-1b-info-gain.json' },
  { id: '1C', name: 'LSI Keywords', outputVar: 'lsi_keywords', file: 'step-1c-lsi-keywords.json' },
  { id: '1D', name: 'Outline Creation', outputVar: 'outline', file: 'step-1d-outline.json' },
  { id: '1E', name: 'Generate Article', outputVar: 'article', file: 'step-1e-article.json' },
  { id: '2A', name: 'Title & Meta', outputVar: 'title_meta', file: 'step-2a-title-meta.json' },
  { id: '2B', name: 'Intro Rewrite', outputVar: 'article', file: 'step-2b-intro-rewrite.json' },
  { id: '2C', name: 'Originality Rewrite', outputVar: 'article', file: 'step-2c-originality-rewrite.json' },
  { id: '2D', name: 'Fluff Check', outputVar: 'article', file: 'step-2d-fluff-check.json' },
  { id: '2E', name: 'FAQ Generation', outputVar: 'faq', file: 'step-2e-faq-generation.json' },
  { id: '2F', name: 'Conclusion Optimizer', outputVar: 'article', file: 'step-2f-conclusion-optimizer.json' },
  { id: '2G', name: 'Add Table', outputVar: 'article', file: 'step-2g-add-table.json' },
  { id: '2H', name: 'Find & Embed Quotes', outputVar: 'article', file: 'step-2h-find-embed-quotes.json' },
  { id: '2I', name: 'EEAT+HCU+EAV Analysis', outputVar: 'eeat_hcu_eav_analysis', file: 'step-2i-eeat-hcu-eav.json' },
  { id: '2J', name: 'Quality + Fact Check', outputVar: 'quality_fact_check', file: 'step-2j-quality-fact-check.json' },
  { id: '2K', name: 'SEO/GEO Evaluator', outputVar: 'seo_geo_evaluator', file: 'step-2k-seo-geo-evaluator.json' },
  { id: '3A', name: 'Image Prompts (Consolidated)', outputVar: 'image_prompts', file: 'step-3a-image-prompts.json' },
  { id: '3B', name: 'Infographic Image Prompt', outputVar: 'infographic_prompt', file: 'step-3b-infographic-prompt.json' },
  { id: '3C', name: 'Alt Text Generation', outputVar: 'alt_texts', file: 'step-3c-alt-texts.json' },
  { id: '4A', name: 'Internal Linking', outputVar: 'article', file: 'step-4a-internal-linking.json' },
  { id: '4B', name: 'External Linking', outputVar: 'article', file: 'step-4b-external-linking.json' }
];

const rawTemplate = fs.readFileSync(templateFile, 'utf8');

// Rename old v2.0 evaluator to avoid confusion
const oldEvaluator = path.join(outDir, 'step-2i-evaluator.json');
const archivedEvaluator = path.join(outDir, 'step-2i-evaluator-v2.0.json');
if (fs.existsSync(oldEvaluator)) {
  fs.renameSync(oldEvaluator, archivedEvaluator);
  console.log('Archived old evaluator:', oldEvaluator, '->', archivedEvaluator);
}

for (const step of steps) {
  let json = rawTemplate;
  json = json.replace(/JDP Generic LLM Step — Template/g, `JDP Step ${step.id} — ${step.name}`);
  // Replace STEP_ID fallback with the specific step ID (keep the || guard for orchestrator override)
  json = json.replace(/'STEP_ID'/g, `'${step.id}'`);
  json = json.replace(/'OUTPUT_VARIABLE'/g, `'${step.outputVar}'`);

  const outPath = path.join(outDir, step.file);
  fs.writeFileSync(outPath, json, 'utf8');
  console.log('Generated:', outPath, '->', step.id, step.outputVar);
}

console.log('Done. Generated', steps.length, 'templates in', outDir);
