// Run from any directory: every path in this file is repo-relative.
process.chdir(require('path').join(__dirname, '..'));
// Minimal Cloudflare-Pages-like static server for local checks.
//   /            -> index.html
//   /foo.html    -> 308 to /foo
//   /foo         -> foo.html (or 404.html with status 404)
//   /assets      -> served as-is
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8081);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);

    // Cloudflare Pages: /foo.html -> 308 /foo
    if (urlPath !== '/' && urlPath.endsWith('.html')) {
      res.writeHead(308, { Location: urlPath.slice(0, -5) });
      return res.end();
    }

    let filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) return send(res, 403, 'forbidden');

    if (urlPath === '/') filePath = path.join(ROOT, 'index.html');
    else if (!path.extname(urlPath)) filePath = filePath + '.html';

    fs.readFile(filePath, (err, buf) => {
      if (err) {
        const notFound = path.join(ROOT, '404.html');
        return fs.readFile(notFound, (e2, b2) =>
          e2
            ? send(res, 404, 'not found')
            : send(res, 404, b2, TYPES['.html'])
        );
      }
      send(res, 200, buf, TYPES[path.extname(filePath)] || 'application/octet-stream');
    });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log('serving ' + ROOT + ' on http://localhost:' + PORT);
  });
