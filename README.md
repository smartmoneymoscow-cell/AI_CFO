# FinModel — AI Financial Modeling SaaS

Describe financial models in natural language → AI builds them directly in Google Sheets.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │   Chat Panel     │  │   Preview Panel            │   │
│  │                  │  │                            │   │
│  │  [User message]  │  │  ┌──────────────────────┐  │   │
│  │                  │  │  │  Google Sheets        │  │   │
│  │  [AI response]   │  │  │  (live iframe)        │  │   │
│  │                  │  │  │                       │  │   │
│  │  [Operations]    │  │  │  Revenue  Costs  ...  │  │   │
│  └──────────────────┘  │  └──────────────────────┘  │   │
│                        └────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
              │                    ▲
              ▼                    │
┌─────────────────────────────────────────────────────────┐
│                   Backend (Node.js)                      │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Chat API   │  │  AI Service  │  │ Sheets API   │   │
│  │  (SSE)      │→ │  (GPT-4/Claude) │→ │ (Google)    │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
│         ↕                                     ↕         │
│  ┌─────────────┐                    ┌──────────────┐   │
│  │  WebSocket  │                    │ Google OAuth  │   │
│  │  (real-time)│                    │ 2.0           │   │
│  └─────────────┘                    └──────────────┘   │
└─────────────────────────────────────────────────────────┘
              │                    ▲
              ▼                    │
     ┌─────────────┐     ┌──────────────┐
     │  OpenAI /   │     │  Google      │
     │  Anthropic  │     │  Sheets API  │
     └─────────────┘     └──────────────┘
```

## Features

- 🗣️ **Natural Language** — Describe models in plain English/Russian
- 📊 **Direct Sheets Integration** — AI writes data, formulas, formatting directly
- 📈 **Auto-charts** — LINE, BAR, PIE, COLUMN, AREA, SCATTER
- 🎨 **Professional Formatting** — Headers, number formats, column widths
- 📐 **Financial Formulas** — SUM, NPV, IRR, growth rates, ratios
- 🔗 **Document Import** — Link existing spreadsheets for AI to work with
- 🌐 **Publish** — Make sheets public under user's Google account
- 📋 **Templates** — DCF, P&L, Budget, KPI Dashboard, Unit Economics
- ⚡ **Real-time** — WebSocket updates, streaming AI responses

## Quick Start

### Prerequisites

- Node.js 20+
- Google Cloud project with Sheets API + Drive API enabled
- OpenAI or Anthropic API key

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Sheets API** and **Google Drive API**
4. Create **OAuth 2.0 credentials** (Web application)
5. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
6. Copy Client ID and Client Secret

### 2. Install & Configure

```bash
# Clone and enter project
cd finmodel-saas

# Backend
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Run Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

### 4. Docker (Production)

```bash
# Create .env files first, then:
docker-compose up --build
```

## Usage

### Basic Workflow

1. **Sign in** with Google (one-click OAuth)
2. **Type** a request in the chat:
   ```
   Create a SaaS revenue model with:
   - Monthly recurring revenue projections for 3 years
   - Churn rate assumptions
   - Customer acquisition cost
   - LTV calculation
   - Summary dashboard with charts
   ```
3. **AI generates** spreadsheet with:
   - Multiple sheets (Assumptions, Projections, Dashboard)
   - Proper formulas (=B2*(1-C2), etc.)
   - Number formatting ($#,##0)
   - Charts (revenue trend, cost breakdown)
4. **Preview** live in the right panel
5. **Publish** to share via Google Sheets link

### Template Commands

- "Create a DCF valuation model"
- "Build a P&L statement with YoY comparison"
- "Make a unit economics model for my SaaS"
- "Design a KPI dashboard"

### Document Reference

Paste a Google Sheets URL directly in the chat message — the AI will automatically detect it and load the spreadsheet data:
```
Analyze the data in https://docs.google.com/spreadsheets/d/XXXXX/edit and create trend charts
```

The AI automatically extracts URLs from your message text. No separate link field needed.

## API Endpoints

### Auth
- `GET /auth/google` — Get OAuth URL
- `GET /auth/google/callback` — OAuth callback
- `GET /auth/me` — Current user
- `POST /auth/logout` — Sign out

### Chat
- `POST /api/chat/send` — Send message (SSE stream)
- `GET /api/chat/history` — Conversation history
- `POST /api/chat/clear` — Clear history
- `GET /api/chat/templates` — List templates
- `POST /api/chat/template/:key` — Use template (SSE stream)

### Sheets
- `POST /api/sheets/create` — Create spreadsheet
- `POST /api/sheets/:id/write` — Write data
- `GET /api/sheets/:id/read` — Read range
- `GET /api/sheets/:id/read-all` — Read all sheets
- `GET /api/sheets/:id/metadata` — Get metadata
- `POST /api/sheets/:id/format` — Apply formatting
- `POST /api/sheets/:id/chart` — Create chart
- `POST /api/sheets/:id/publish` — Publish (public link)
- `POST /api/sheets/:id/share` — Share with users
- `POST /api/sheets/:id/import` — Import from URL

### WebSocket
- `ws://localhost:3001/ws?sessionId=xxx` — Real-time events

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅* |
| `ANTHROPIC_API_KEY` | Anthropic API key | ✅* |
| `AI_PROVIDER` | `openai` or `anthropic` | ✅ |
| `SESSION_SECRET` | Session encryption key | ✅ |
| `FRONTEND_URL` | Frontend URL for CORS | |
| `PORT` | Backend port (default: 3001) | |
| `COOKIE_DOMAIN` | Cookie domain for cross-origin auth (production) | |
| `NODE_ENV` | Set to `production` for secure cookies | |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE` | Backend API URL (e.g. `http://47.236.80.116:3001`) | ✅ (production) |

*At least one AI provider key required

## Cost Estimation

- **Google Sheets API**: Free (300 requests/min)
- **OpenAI GPT-4o**: ~$0.01-0.05 per model generation
- **Anthropic Claude**: ~$0.01-0.05 per model generation

## Deployment

### GitHub Pages (Frontend)

The frontend is automatically deployed to GitHub Pages on push to `main`. The build uses `VITE_API_BASE` to point API calls to the backend server.

**Setup:**
1. Set `VITE_API_BASE` in `frontend/.env.production` (or in GitHub Actions secrets)
2. Push to `main` — GitHub Actions builds and deploys automatically
3. Frontend will be at `https://smartmoneymoscow-cell.github.io/AI_CFO/`

### Backend (VPS)

```bash
# On the server
cd backend
npm install
NODE_ENV=production node src/server.js
```

**Required `.env` values for production:**
- `GOOGLE_REDIRECT_URI` — Must match the exact URI in Google Cloud Console
- `FRONTEND_URL` — Your GitHub Pages URL (for CORS)
- `NODE_ENV=production` — Enables secure cookies
- `SESSION_SECRET` — Strong random string

**HTTPS Setup (required for production):**

GitHub Pages serves over HTTPS. Browsers block mixed content (HTTPS page → HTTP API), so the backend must also use HTTPS.

```bash
# Generate self-signed certificate (for testing)
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj '/CN=47.236.80.116'

# Add to .env
NODE_ENV=production
SSL_CERT=./cert.pem
SSL_KEY=./key.pem
```

For production, use a proper SSL certificate (Let's Encrypt / Cloudflare).

## Changelog

### 2026-08-12

**Fixed:**
- 🔧 **Google OAuth** — All API calls now route through `VITE_API_BASE` in production instead of same-origin relative paths that hit GitHub Pages
- 🔧 **Chat messaging** — `sendMessage` and `handleUseTemplate` both correctly route to the backend server
- 🔧 **CORS** — Backend accepts requests from GitHub Pages origin
- 🔧 **Session cookies** — Configured for cross-origin (`SameSite=None; Secure`) in production
- 🔧 **Mixed Content** — Added HTTPS support to backend (required when frontend is on GitHub Pages)

**Changed:**
- ✨ **URL input removed** — Paste Google Sheets links directly in chat; backend auto-detects and loads spreadsheet data
- ✨ **Smart URL parsing** — Backend extracts `docs.google.com/spreadsheets` URLs from message text and reads data automatically
- 🔒 **HTTPS backend** — Supports SSL certificates via `SSL_CERT`/`SSL_KEY` env vars
- 📝 **Environment config** — Added `VITE_API_BASE`, `COOKIE_DOMAIN`, `NODE_ENV`, `SSL_CERT`, `SSL_KEY` to environment docs

**Files changed:**
- `frontend/src/services/api.js` — `API_BASE` via `VITE_API_BASE`, WebSocket URL
- `frontend/src/App.jsx` — `handleSendMessage` simplified, `handleUseTemplate` uses `API_BASE`
- `frontend/src/components/ChatPanel.jsx` — Removed URL input field and Link button
- `frontend/.env.production` — New: `VITE_API_BASE` (HTTPS)
- `backend/src/routes/chat.js` — URL extraction from message text
- `backend/src/server.js` — HTTPS support, CORS origin function, cookie domain
- `backend/.env.example` — `COOKIE_DOMAIN`, `NODE_ENV`, `SSL_CERT`, `SSL_KEY` docs
- `.github/workflows/deploy-pages.yml` — `VITE_API_BASE` env during build

## License

MIT
