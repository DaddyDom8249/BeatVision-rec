const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const appRoot = path.join(root, 'app');
const buildRoot = path.join(appRoot, 'frontend', 'build');
const port = Number(process.env.PORT || 8080);

function inside(base, target) {
  const relative = path.relative(base, target);
  return relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function contentType(file) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

function serveFile(res, file) {
  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, 'Not found');
    res.writeHead(200, { 'content-type': contentType(file) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/health') {
    return send(res, 200, JSON.stringify({ ok: true, app: 'BeatVision-rec', assembled: fs.existsSync(appRoot) }), 'application/json; charset=utf-8');
  }

  // Prefer the real assembled React production build. The old root landing
  // page remains available automatically when no build has been produced yet.
  if (fs.existsSync(buildRoot)) {
    const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    const requested = path.resolve(buildRoot, relative || 'index.html');
    if (inside(buildRoot, requested) && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
      return serveFile(res, requested);
    }
    const spa = path.join(buildRoot, 'index.html');
    if (inside(buildRoot, spa) && fs.existsSync(spa)) return serveFile(res, spa);
  }

  const requested = path.resolve(root, decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html');
  if (!inside(root, requested) || !fs.existsSync(requested) || !fs.statSync(requested).isFile()) {
    return send(res, 404, 'Not found');
  }
  serveFile(res, requested);
});

server.listen(port, '0.0.0.0', () => console.log(`BeatVision-rec listening on http://0.0.0.0:${port}`));
