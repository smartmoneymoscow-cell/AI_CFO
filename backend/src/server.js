import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import { authRouter } from './routes/auth.js';
import { sheetsRouter } from './routes/sheets.js';
import { chatRouter } from './routes/chat.js';

const app = express();

// HTTPS support for production (required when frontend is on GitHub Pages/HTTPS)
let server;
if (process.env.NODE_ENV === 'production' && process.env.SSL_CERT && process.env.SSL_KEY) {
  const cert = readFileSync(process.env.SSL_CERT);
  const key = readFileSync(process.env.SSL_KEY);
  server = createHttpsServer({ cert, key }, app);
  console.log('🔒 HTTPS enabled');
} else {
  server = createServer(app);
}

const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map();

app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3001',
      'https://smartmoneymoscow-cell.github.io',
    ].filter(Boolean);
    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in dev — tighten in production
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'finmodel-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    // In production, cookie must be set for the backend domain so cross-origin requests work
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  },
}));

app.use((req, res, next) => { req.wsClients = wsClients; next(); });

app.use('/auth', authRouter);
app.use('/api/sheets', sheetsRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

wss.on('connection', (ws, req) => {
  const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId');
  if (!sessionId) { ws.close(4001, 'Missing sessionId'); return; }
  if (!wsClients.has(sessionId)) wsClients.set(sessionId, new Set());
  wsClients.get(sessionId).add(ws);
  ws.on('close', () => { const c = wsClients.get(sessionId); if (c) { c.delete(ws); if (!c.size) wsClients.delete(sessionId); } });
  ws.on('message', (msg) => { try { const d = JSON.parse(msg); if (d.type === 'ping') ws.send('{"type":"pong"}'); } catch {} });
  ws.send(JSON.stringify({ type: 'connected', sessionId }));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Backend on http://0.0.0.0:${PORT}`));
