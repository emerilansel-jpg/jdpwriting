const fs = require('fs');

const N8N_URL = 'https://n8n.jetdigitalpro.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MmM0YmMyYS03YmUxLTQwYzktODRjMi1lOGNmYzEyMTliNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODViYzFiODQtMThmZC00MDM2LWE5ODQtMDNhNGYyYTE0NTA5IiwiaWF0IjoxNzg4OTQ0OTgyfQ.AfeoBd9QiZ6xI6XPL_prAjc9X4mktwqbzEqJuOOqjJY';

const new1EPrompt = `Write a comprehensive, professional, search-optimized ~2000-word article in American English based on the provided topic, outline, and research context.

Target Keyword: {{keyword}}
Call to Action (CTA): {{cta}}
Internal Links: {{internal_links}}

Content Outline:
{{outline}}

Research Data & Context:
{{info_gain}}
{{lsi_keywords}}

Requirements:
1. Title: H1 (50-60 chars, keyword-first, benefit-driven).
2. Meta Description: 150-160 chars labeled "Meta description:".
3. Introduction (~100 words): First sentence <=40 words directly answers search intent. Include a verified statistic and context.
4. Key Takeaways: H2 with 3 bullet insights.
5. Main Body: Follow the H2/H3 outline thoroughly. Each section direct answer <=40 words, at least one bold statistic or entity, and natural paragraph rhythm.
6. Comparison Table: Include at least one structured Markdown comparison table.
7. Tone: Grounded, authoritative, engaging human voice. Active voice, sentence variety, no AI clichés.
8. Conclusion: Actionable next steps ending with CTA [{{cta}}].

Write the COMPLETE full-length article in Markdown. Begin directly with the H1 title. Do not ask questions or request more input.`;

async function update1EPrompt() {
  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };
  
  // 1. Update on n8n VPS
  const wf = await fetch(`${N8N_URL}/api/v1/workflows/iC210o6qoXTO8muA`, { headers }).then(r => r.json());
  const fc = wf.nodes.find(n => n.id === 'find_config');
  if (fc) {
    fc.typeVersion = 1;
    fc.parameters.jsCode = `
const items = $input.all();
const inputItem = items.find(i => i.json && !Array.isArray(i.json.data)) || items[0] || {};
const input = inputItem.json || {};

const cfg = {
  step_id: '1E',
  step_name: 'Generate Article',
  model: 'pesat-flash',
  temperature: 0.7,
  max_tokens: 5000,
  output_format: 'markdown',
  system_prompt: 'You are an expert SEO/GEO writer. Generate ~2000-word articles in American English with anti-detection techniques and professional human voice.',
  user_prompt: ${JSON.stringify(new1EPrompt)},
  enabled: true,
  llm_url: 'https://api.pesatrouter.com/v1/chat/completions',
  credential: 'pesatrouter-api-key',
  output_variable: 'article'
};

return [{
  json: {
    ...input,
    ...cfg
  }
}];
`;
  }

  await fetch(`${N8N_URL}/api/v1/workflows/iC210o6qoXTO8muA`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    })
  });

  await fetch(`${N8N_URL}/api/v1/workflows/iC210o6qoXTO8muA/activate`, { method: 'POST', headers });
  console.log('✅ Step 1E workflow prompt updated on n8n VPS!');
}

update1EPrompt().catch(console.error);
