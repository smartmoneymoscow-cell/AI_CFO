import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { authRouter } from './routes/auth.js';
import { sheetsRouter } from './routes/sheets.js';
import { chatRouter } from './routes/chat.js';

const app = express();
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

// Store connected clients per session
const wsClients = new Map();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'finmodel-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
}));

// Make WebSocket broadcast available to routes
app.use((req, res, next) => {
  req.wsClients = wsClients;
  next();
});

// Routes
app.use('/auth', authRouter);
app.use('/api/sheets', sheetsRouter);
app.use('/api/chat', chatRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId');

  if (!sessionId) {
    ws.close(4001, 'Missing sessionId');
    return;
  }

  if (!wsClients.has(sessionId)) {
    wsClients.set(sessionId, new Set());
  }
  wsClients.get(sessionId).add(ws);

  ws.on('close', () => {
    const clients = wsClients.get(sessionId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) wsClients.delete(sessionId);
    }
  });

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    } catch (e) { /* ignore */ }
  });

  ws.send(JSON.stringify({ type: 'connected', sessionId }));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 FinModel backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket on ws://localhost:${PORT}/ws`);
});
