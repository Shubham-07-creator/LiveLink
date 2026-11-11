import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.resolve(__dirname, '../../frontend/build');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const fileCache = new Map();

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(buildPath, reqPath);

    // Prevent path traversal
    if (!filePath.startsWith(buildPath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Check if file exists, else fallback to index.html (SPA routing)
    let exists = false;
    try {
      exists = fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory();
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      filePath = path.join(buildPath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (fileCache.has(filePath)) {
      const cached = fileCache.get(filePath);
      res.writeHead(200, {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(cached.content);
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error('File read error:', filePath, err);
        res.writeHead(500);
        res.end('Server Error');
      } else {
        fileCache.set(filePath, { contentType, content });
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(content);
      }
    });
  } catch (err) {
    console.error('Request handling error:', req.url, err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

const port = process.env.FRONTEND_PORT || 3000;
server.listen(port, () => {
  console.log(`LiveLink Frontend Test Server running on http://localhost:${port}`);
});
