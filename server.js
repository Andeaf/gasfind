// Server local: `node server.js` -> http://localhost:3000
// Servește aplicația din public/ și API-ul din lib/handler.js (același cod ca pe Vercel).
// Opțional, fișierul .env poate conține TANKERKOENIG_API_KEY=... (cheia pentru Germania).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { route } from './lib/handler.js';

const ROOT = fileURLToPath(new URL('./public/', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// .env simplu (KEY=valoare pe fiecare rând)
const envFile = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const out = await route(url.pathname, url.searchParams, process.env);
      if (!out) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(out.status, out.headers);
      res.end(out.body);
      return;
    }
    let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (url.pathname.endsWith('/')) path = join(path, 'index.html');
    const info = await stat(path).catch(() => null);
    if (!info || !info.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const headers = { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' };
    if (url.pathname === '/sw.js') headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    res.end(await readFile(path));
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('Server error');
  }
});

server.listen(PORT, () => {
  console.log(`GasFind rulează pe http://localhost:${PORT}${process.env.GASFIND_MOCK === '1' ? ' (date de test)' : ''}`);
});
