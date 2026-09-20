import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.ROADMAP_PREVIEW_PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'");
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/' || url.pathname === '/roadmap') { response.writeHead(302, { Location: '/roadmap/' }); response.end(); return; }
    if (!url.pathname.startsWith('/roadmap/')) throw new Error();
    const relative = decodeURIComponent(url.pathname.slice('/roadmap/'.length)) || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep)) throw new Error();
    const bytes = await readFile(target);
    response.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    response.end(bytes);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Preview http://localhost:${port}/roadmap/`));
