import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const buildPath = path.resolve(__dirname, '../../frontend/build');

app.use(express.static(buildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const port = process.env.FRONTEND_PORT || 3000;
app.listen(port, () => {
  console.log(`LiveLink Frontend Test Server running on http://localhost:${port}`);
});
