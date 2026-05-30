import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
const app = express();
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const uploadPath = path.join(__dirname, '..', uploadDir);
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api', routes);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
export default app;
