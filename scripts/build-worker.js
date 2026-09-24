// Build worker.js from admin-ui.html
const fs = require('fs');
const html = fs.readFileSync('admin-ui.html', 'utf8');

// Escape for template literal embedding
let escaped = html;
escaped = escaped.replace(/\\/g, '\\\\');
escaped = escaped.replace(/`/g, '\\`');
escaped = escaped.replace(/\$/g, '\\$');

const worker = 'export default {\n' +
  '  async fetch(request, env, ctx) {\n' +
  '    const url = new URL(request.url);\n' +
  '    return new Response(`' + escaped + '`, {\n' +
  '      headers: {\n' +
  "        'content-type': 'text/html;charset=UTF-8',\n" +
  "        'cache-control': 'no-cache'\n" +
  '      }\n' +
  '    });\n' +
  '  }\n' +
  '};\n';

fs.writeFileSync('worker-deploy/worker.js', worker, 'utf8');
console.log('Worker built. Size:', fs.statSync('worker-deploy/worker.js').size);
