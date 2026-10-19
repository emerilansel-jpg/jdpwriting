// Deploy worker.js to Cloudflare Worker API
const fs = require('fs');

function getCloudflareToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/CLOUDFLARE_API_TOKEN=([^\s\r\n]+)/);
    if (match) return match[1].trim();
  } catch {}
  return '';
}

async function deploy() {
  const accountId = 'd5cb3e4213b6aa69dbc2feb1499af77a';
  const scriptName = 'jdp-pipeline-admin';
  const apiToken = getCloudflareToken();

  if (!apiToken) {
    console.error('Missing CLOUDFLARE_API_TOKEN in environment or .env file');
    process.exit(1);
  }

  const workerCode = fs.readFileSync('worker-deploy/worker.js', 'utf8');

  console.log(`Deploying ${scriptName} to Cloudflare (size: ${workerCode.length} bytes)...`);

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify({
    main_module: 'worker.js',
    compatibility_date: '2024-01-01'
  })], { type: 'application/json' }));

  formData.append('worker.js', new Blob([workerCode], {
    type: 'application/javascript+module'
  }), 'worker.js');

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiToken}`
    },
    body: formData
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    console.error('Cloudflare deploy failed:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('✅ Cloudflare Worker deployed successfully!');
  console.log('Script:', data.result?.id || scriptName);
  console.log('Modified:', data.result?.modified_on || new Date().toISOString());
}

deploy().catch(err => {
  console.error('Deploy error:', err);
  process.exit(1);
});
