const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let loginHandler = null;
try {
  loginHandler = require('./api/login.js');
} catch (e) {
  console.warn('API login não encontrada:', e.message);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Helper response functions
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
    return res;
  };

  // API Routes
  if (pathname === '/api/login' && loginHandler) {
    return loginHandler(req, res);
  }

  // Rewrites / Clean URLs
  if (pathname === '/') {
    pathname = '/index.html';
  } else if (!path.extname(pathname)) {
    if (fs.existsSync(path.join(__dirname, pathname + '.html'))) {
      pathname = pathname + '.html';
    } else if (fs.existsSync(path.join(__dirname, pathname, 'index.html'))) {
      pathname = path.join(pathname, 'index.html');
    }
  }

  const filePath = path.join(__dirname, pathname);

  // Security check: ensure path is within root
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const notFoundPath = path.join(__dirname, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(notFoundPath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🍰 Sublime Sonhos Server Rodando!`);
  console.log(`👉 Acesse: http://localhost:${PORT}`);
  console.log(`👉 Painel Admin: http://localhost:${PORT}/admin`);
  console.log(`🔑 Senha Admin Local: ${process.env.ADMIN_PASSWORD}`);
  console.log(`========================================\n`);
});
