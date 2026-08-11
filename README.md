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

Paste a Google Sheets URL in the link field to have AI work with existing data:
```
Analyze the data in this spreadsheet and create trend charts
```

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

*At least one AI provider key required

## Cost Estimation

- **Google Sheets API**: Free (300 requests/min)
- **OpenAI GPT-4o**: ~$0.01-0.05 per model generation
- **Anthropic Claude**: ~$0.01-0.05 per model generation

## License

MIT
