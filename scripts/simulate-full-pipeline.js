const https = require('https');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('admin-ui.html', 'utf8');
const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/g)];
const mainScript = scripts[scripts.length - 1][1];

const context = {
  console,
  setTimeout: () => {},
  clearTimeout: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: {
    getElementById: () => ({ value: '', textContent: '', classList: { add: ()=>{}, remove: ()=>{} }, style: { setProperty: ()=>{} } }),
    querySelectorAll: () => [],
    querySelector: () => null
  }
};
vm.createContext(context);
vm.runInContext(mainScript + '\n;globalThis.__STEPS = STEPS; globalThis.__upstreamMap = upstreamMap; globalThis.__inputFieldMap = inputFieldMap;', context);

const STEPS = context.__STEPS;
const upstreamMap = context.__upstreamMap;
const PESAT_API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';

async function callLLM(model, systemPrompt, userPrompt, temp, maxTokens) {
  let targetModel = model;
  if (model.includes('deepseek') || model.includes('gpt-4o') || model.includes('claude') || model.includes('gemini')) {
    if (model.includes('mini') || model.includes('haiku') || model.includes('lite')) {
      targetModel = 'pesat-lite';
    } else {
      targetModel = 'pesat-flash';
    }
  } else if (!targetModel.startsWith('pesat-')) {
    targetModel = 'pesat-flash';
  } else if (targetModel === 'pesat-pro') {
    targetModel = 'pesat-flash';
  }

  const payload = JSON.stringify({
    model: targetModel,
    temperature: temp,
    max_tokens: maxTokens,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: userPrompt }
    ]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.pesatrouter.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + PESAT_API_KEY,
        'Content-Type': 'application/json'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices[0]) {
            resolve({
              output: json.choices[0].message.content,
              inputTokens: json.usage?.prompt_tokens || 0,
              outputTokens: json.usage?.completion_tokens || 0
            });
          } else {
            reject(new Error(json.error?.message || 'Empty response: ' + body.slice(0, 100)));
          }
        } catch (e) {
          reject(new Error(e.message + ': ' + body.slice(0, 100)));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function sanitizeArticleContent(text) {
  if (!text || typeof text !== 'string') return text;
  text = text.replace(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/g, (match, code) => {
    if ((code.includes('↓') || code.includes('->') || code.includes('-->') || code.includes('→')) && code.includes('[')) {
      const items = code.split(/[↓→\n]+|-->|->/).map(s => s.trim().replace(/^\[\s*|\s*\]$/g, '').trim()).filter(Boolean);
      if (items.length > 1) {
        return '\n\n' + items.map((item, idx) => `${idx + 1}. ${item.replace(/^([^:]+):/, '**$1:**')}`).join('\n') + '\n\n';
      }
    }
    return match;
  });
  text = text.replace(/\[\s*([^\]]+?)\s*\](?:\s*(?:↓|->|-->|→)\s*\[\s*([^\]]+?)\s*\])+/g, (match) => {
    const parts = match.split(/\s*(?:↓|->|-->|→)\s*/).map(p => p.trim().replace(/^\[\s*|\s*\]$/g, '').trim()).filter(Boolean);
    if (parts.length > 1) {
      return '\n\n' + parts.map((part, idx) => `${idx + 1}. ${part}`).join('\n') + '\n\n';
    }
    return match;
  });
  text = text.replace(/^\s*↓\s*$/gm, '');
  return text;
}

async function simulatePipeline(keyword, cta) {
  console.log(`\nSimulating pipeline for: "${keyword}"...`);
  const stepOutputs = {};
  const inputs = {
    keyword,
    cta,
    internal_links: `https://jetdigitalpro.com/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    external_links: 'https://en.wikipedia.org, https://www.cdc.gov, https://www.nih.gov',
    article: '',
    prev_output: '',
    serp_data: '',
    info_gain: '',
    lsi_keywords: '',
    outline: '',
    eeat_hcu_eav_analysis: '',
    quality_fact_check: '',
    seo_geo_evaluator: '',
    title: '',
    meta_description: '',
    slug: ''
  };

  const stepsToTest = STEPS.filter(s => ['1A','1B','1C','1D','1E','2A','2B','2C','2D','2E','2F','2G','2H','2I','2J','2K'].includes(s.id));

  for (const s of stepsToTest) {
    console.log(`\n--- Step ${s.id} (${s.name}) [Model: ${s.model}] ---`);

    // Prepare inputs from upstreamMap
    const map = upstreamMap[s.id] || {};
    for (const [variable, sourceId] of Object.entries(map)) {
      let resolvedSourceId = sourceId;
      if (variable === 'article' && s.id === '2K') {
        if (stepOutputs['4B']) resolvedSourceId = '4B';
        else if (stepOutputs['4A']) resolvedSourceId = '4A';
        else if (stepOutputs['2H']) resolvedSourceId = '2H';
      }
      if (variable === 'article' && !stepOutputs[resolvedSourceId]) {
        const candidates = ['4B', '4A', '2H', '2G', '2D', '2C', '1E'];
        for (const cid of candidates) {
          if (stepOutputs[cid]) {
            resolvedSourceId = cid;
            break;
          }
        }
      }
      if (stepOutputs[resolvedSourceId]) {
        let val = stepOutputs[resolvedSourceId];
        if (typeof val === 'string' && (val.trim().startsWith('{') || val.includes('```json'))) {
          try {
            const cleaned = val.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            if (parsed && parsed[variable] !== undefined) {
              val = typeof parsed[variable] === 'object' ? JSON.stringify(parsed[variable]) : String(parsed[variable]);
            }
          } catch {}
        }
        inputs[variable] = val;
      }
    }

    // Special alias
    if (s.id === '1B') inputs.prev_output = stepOutputs['1A'] || '';
    if (s.id === '1C') inputs.prev_output = stepOutputs['1B'] || '';

    // Robust fallbacks
    if (!inputs.title && inputs.article) {
      const m = inputs.article.match(/^#\s+(.+)$/m);
      if (m) inputs.title = m[1].trim();
      else if (inputs.keyword) inputs.title = inputs.keyword.charAt(0).toUpperCase() + inputs.keyword.slice(1);
    }
    if (!inputs.meta_description && inputs.article) {
      const m = inputs.article.match(/Meta description:\s*(.+)$/m);
      if (m) inputs.meta_description = m[1].trim();
      else if (inputs.keyword) inputs.meta_description = `Comprehensive guide to ${inputs.keyword} with expert strategies and actionable insights.`;
    }
    if (!inputs.slug && inputs.keyword) {
      inputs.slug = inputs.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    let userPrompt = s.userPrompt;
    for (const [k, v] of Object.entries(inputs)) {
      userPrompt = userPrompt.split('{{' + k + '}}').join(v || '');
    }

    console.log(`Prompt length: ${userPrompt.length} chars. Calling LLM...`);
    const t0 = Date.now();
    const res = await callLLM(s.model, s.systemPrompt, userPrompt, s.temp, s.maxTokens);
    const duration = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`✓ Returned in ${duration}s (${res.output.length} chars)`);

    let output = res.output;
    if (['1E','2C','2D','2G','2H','4A','4B'].includes(s.id)) {
      output = sanitizeArticleContent(output);
    }

    stepOutputs[s.id] = output;

    if (s.id === '1E') {
      const words = output.split(/\s+/).filter(Boolean).length;
      console.log(`  1E Article Words: ${words}`);
    }
    if (s.id === '2C') {
      const words = output.split(/\s+/).filter(Boolean).length;
      console.log(`  2C Output Words: ${words}`);
    }
    if (s.id === '2D') {
      const words = output.split(/\s+/).filter(Boolean).length;
      console.log(`  2D Output Words: ${words}`);
    }
    if (s.id === '2G') {
      const words = output.split(/\s+/).filter(Boolean).length;
      console.log(`  2G Output Words: ${words}`);
    }
    if (s.id === '2H') {
      const words = output.split(/\s+/).filter(Boolean).length;
      console.log(`  2H Output Words: ${words}`);
    }
    if (s.id === '2K') {
      console.log('\n=== STEP 2K RESULT ===\n', output);
      try {
        const cleaned = output.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        console.log('Evaluator Scores:', {
          seo: parsed.seo_score,
          geo: parsed.geo_score,
          overall: parsed.overall_score,
          pass: parsed.pass,
          blockers: parsed.critical_blockers,
          fixes_seo: parsed.top_3_seo_fixes,
          fixes_geo: parsed.top_3_geo_fixes
        });
      } catch (e) {
        console.error('Failed to parse 2K JSON:', e.message);
      }
    }
  }
}

simulatePipeline('how to sleep fast', 'Download our free sleep guide').catch(console.error);
