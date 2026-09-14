const fs = require('fs');
const path = require('path');

const baseDir = path.dirname(__dirname);
const outFile = path.join(baseDir, 'n8n-templates', 'generic-llm-step.json');

const template = {
  name: 'JDP Generic LLM Step — Template',
  nodes: [
    {
      id: 'trigger',
      type: 'n8n-nodes-base.executeWorkflowTrigger',
      position: [100, 300],
      parameters: {}
    },
    {
      id: 'read_prompts',
      type: 'n8n-nodes-base.googleSheets',
      position: [300, 300],
      parameters: {
        operation: 'read',
        sheetName: 'PROMPTS',
        range: 'A2:Z100',
        options: {}
      },
      credentials: { googleSheetsOAuth2Api: 'google-sheets-jdp' }
    },
    {
      id: 'find_config',
      type: 'n8n-nodes-base.code',
      position: [500, 300],
      parameters: {
        jsCode: `const items = $input.all();
const sheetItem = items.find(i => i.json && Array.isArray(i.json.data));
const inputItem = items.find(i => i.json && !Array.isArray(i.json.data));
if (!sheetItem) throw new Error('Prompt data not found');
const rows = sheetItem.json.data;
const stepId = (inputItem && inputItem.json.step_id) ? inputItem.json.step_id : 'STEP_ID';
const step = rows.find(r => r[0] === stepId);
if (!step) throw new Error('Step ' + stepId + ' not found');
const cfg = {
  step_id: step[0],
  step_name: step[1],
  model: step[2],
  temperature: parseFloat(step[3]) || 0.7,
  max_tokens: parseInt(step[4]) || 2000,
  output_format: step[5],
  system_prompt: step[6],
  user_prompt: step[7],
  enabled: step[8] === 'TRUE' || step[8] === true,
  llm_url: step[2].includes('deepseek') ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions',
  credential: step[2].includes('deepseek') ? 'deepseek-api-key' : 'openai-api-key',
  output_variable: 'OUTPUT_VARIABLE'
};
const input = (inputItem && inputItem.json) || {};
return [{
  json: {
    ...input,
    ...cfg
  }
}];`
      }
    },
    {
      id: 'prepare_vars',
      type: 'n8n-nodes-base.code',
      position: [700, 300],
      parameters: {
        jsCode: `const cfg = $input.first().json;
const input = $input.first().json;

const flat = {};
const configKeys = ['step_id','step_name','model','temperature','max_tokens','output_format','system_prompt','user_prompt','llm_url','credential','output_variable','enabled'];
function flatten(prefix, value) {
  if (value === undefined || value === null) {
    flat[prefix] = '';
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    flat[prefix] = JSON.stringify(value);
    for (const [k, v] of Object.entries(value)) {
      flatten(prefix + '.' + k, v);
    }
  } else {
    flat[prefix] = String(value);
  }
}

Object.entries(input).forEach(([k, v]) => {
  if (!configKeys.includes(k)) {
    flatten(k, v);
  }
});

let user = cfg.user_prompt;
const keys = Object.keys(flat).sort((a, b) => b.length - a.length);
for (const k of keys) {
  const escaped = k.replace(/[.*+?^\${}()|[\\\]\\\\]/g, '\\\\$&');
  user = user.replace(new RegExp('{{' + escaped + '}}', 'g'), flat[k]);
}

return [{
  json: {
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.max_tokens,
    system_prompt: cfg.system_prompt,
    user_prompt: user,
    llm_url: cfg.llm_url,
    credential: cfg.credential,
    output_variable: cfg.output_variable,
    output_format: cfg.output_format,
    keyword: input.keyword,
    step_id: cfg.step_id,
    ...input
  }
}];`
      }
    },
    {
      id: 'call_llm',
      type: 'n8n-nodes-base.httpRequest',
      position: [900, 300],
      parameters: {
        method: 'POST',
        url: '={{ $json.llm_url }}',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: "={{ JSON.stringify({ model: $json.model, temperature: $json.temperature, max_tokens: $json.max_tokens, messages: [{role: 'system', content: $json.system_prompt}, {role: 'user', content: $json.user_prompt}] }) }}"
      },
      credentials: { httpHeaderAuth: '={{ $json.credential }}' }
    },
    {
      id: 'parse_result',
      type: 'n8n-nodes-base.code',
      position: [1100, 300],
      parameters: {
        jsCode: `const resp = $input.first().json;
const content = resp.choices?.[0]?.message?.content || resp.content || '';
const outputFormat = resp.output_format || 'json';
const outputVariable = resp.output_variable || 'output_json';
let parsed = { raw_output: content };
try {
  parsed = JSON.parse(content);
} catch (e) {
  const m = content.match(/\`\`\`json\\n?([\\s\\S]*?)\\n?\`\`\`/);
  if (m) {
    try { parsed = JSON.parse(m[1]); } catch (e2) {}
  }
}
const outputValue = (outputFormat === 'json' || outputFormat === 'json_schema') ? JSON.stringify(parsed) : content;
return [{
  json: {
    output_json: JSON.stringify(parsed),
    output_raw: content,
    [outputVariable]: outputValue,
    keyword: resp.keyword,
    step_id: resp.step_id,
    input_tokens: resp.usage?.prompt_tokens || resp.input_tokens || 0,
    output_tokens: resp.usage?.completion_tokens || resp.output_tokens || 0,
    model: resp.model || resp.model_name
  }
}];`
      }
    },
    {
      id: 'save_tracking',
      type: 'n8n-nodes-base.googleSheets',
      position: [1300, 300],
      parameters: {
        operation: 'append',
        sheetName: 'TRACKING',
        range: 'A:Z',
        values: {
          mappingMode: 'autoMapInputData',
          value: "={{ JSON.stringify({ step_id: $json.step_id, keyword: $json.keyword, status: 'done', output_json: $json.output_json, input_tokens: $json.input_tokens, output_tokens: $json.output_tokens, model: $json.model, timestamp: new Date().toISOString() }) }}"
        }
      },
      credentials: { googleSheetsOAuth2Api: 'google-sheets-jdp' }
    },
    {
      id: 'return',
      type: 'n8n-nodes-base.code',
      position: [1500, 300],
      parameters: {
        jsCode: `return [{
  json: {
    ...$input.first().json,
    status: 'done'
  }
}];`
      }
    }
  ],
  connections: {
    trigger: {
      main: [
        [
          { node: 'read_prompts', type: 'main', index: 0 },
          { node: 'find_config', type: 'main', index: 0 }
        ]
      ]
    },
    read_prompts: {
      main: [[{ node: 'find_config', type: 'main', index: 0 }]]
    },
    find_config: {
      main: [[{ node: 'prepare_vars', type: 'main', index: 0 }]]
    },
    prepare_vars: {
      main: [[{ node: 'call_llm', type: 'main', index: 0 }]]
    },
    call_llm: {
      main: [[{ node: 'parse_result', type: 'main', index: 0 }]]
    },
    parse_result: {
      main: [[{ node: 'save_tracking', type: 'main', index: 0 }]]
    },
    save_tracking: {
      main: [[{ node: 'return', type: 'main', index: 0 }]]
    }
  }
};

fs.writeFileSync(outFile, JSON.stringify(template, null, 2), 'utf8');
console.log('Updated generic template:', outFile);
