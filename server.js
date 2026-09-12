const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'content-type':'application/json'});
    return res.end(JSON.stringify({ok:true,app:'BeatVision-rec'}));
  }

  const file = req.url === '/' ? 'index.html' : req.url.replace(/^\/+/, '');
  const safe = path.normalize(file).replace(/^\.\.(\/|\\|$)/, '');
  const target = path.join(root, safe);
  if (!target.startsWith(root)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(target);
    const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
    res.writeHead(200, {'content-type':types[ext] || 'application/octet-stream'});
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => console.log(`BeatVision-rec listening on http://0.0.0.0:${port}`));
