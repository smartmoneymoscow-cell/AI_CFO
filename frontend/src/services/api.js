// API base: in dev proxied by Vite, in production point to your backend URL
const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiService {
  constructor() {
    this.ws = null;
    this.wsListeners = new Map();
    this.sessionId = null;
  }

  // ── Auth ──────────────────────────────────────────────

  async getAuthUrl() {
    const res = await fetch(`${API_BASE}/auth/google?sessionId=${this.sessionId || ''}`);
    const data = await res.json();
    return data.url;
  }

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  // ── Chat ─────────────────────────────────────────────

  async sendMessage({ message, spreadsheetId, documentUrl, onEvent }) {
    const res = await fetch(`${API_BASE}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, spreadsheetId, documentUrl }),
    });

    if (!res.ok) {
      throw new Error(`Chat request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const event = JSON.parse(data);
            onEvent(event);
          } catch (e) { /* skip */ }
        }
      }
    }
  }

  async getTemplates() {
    const res = await fetch(`${API_BASE}/api/chat/templates`, {
      credentials: 'include',
    });
    return res.json();
  }

  async getHistory() {
    const res = await fetch(`${API_BASE}/api/chat/history`, {
      credentials: 'include',
    });
    return res.json();
  }

  async clearHistory() {
    await fetch(`${API_BASE}/api/chat/clear`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  // ── Sheets ───────────────────────────────────────────

  async createSpreadsheet(title, sheets) {
    const res = await fetch(`${API_BASE}/api/sheets/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, sheets }),
    });
    return res.json();
  }

  async readSpreadsheet(spreadsheetId, range) {
    const res = await fetch(
      `${API_BASE}/api/sheets/${spreadsheetId}/read?range=${encodeURIComponent(range || 'Sheet1!A1:Z1000')}`,
      { credentials: 'include' }
    );
    return res.json();
  }

  async readAllSheets(spreadsheetId) {
    const res = await fetch(`${API_BASE}/api/sheets/${spreadsheetId}/read-all`, {
      credentials: 'include',
    });
    return res.json();
  }

  async publishSpreadsheet(spreadsheetId) {
    const res = await fetch(`${API_BASE}/api/sheets/${spreadsheetId}/publish`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  }

  async shareSpreadsheet(spreadsheetId, emails, role) {
    const res = await fetch(`${API_BASE}/api/sheets/${spreadsheetId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emails, role }),
    });
    return res.json();
  }

  // ── WebSocket ────────────────────────────────────────

  connectWebSocket(sessionId) {
    this.sessionId = sessionId;

    // In production, derive WS URL from API_URL or current host
    let wsBase;
    if (import.meta.env.VITE_API_URL) {
      wsBase = import.meta.env.VITE_API_URL.replace(/^http/, 'ws');
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsBase = `${protocol}//${window.location.host}`;
    }

    const wsUrl = `${wsBase}/ws?sessionId=${sessionId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const listeners = this.wsListeners.get(data.type) || [];
          listeners.forEach((fn) => fn(data));
          const allListeners = this.wsListeners.get('all') || [];
          allListeners.forEach((fn) => fn(data));
        } catch (e) { /* ignore */ }
      };

      this.ws.onclose = () => {
        setTimeout(() => this.connectWebSocket(sessionId), 3000);
      };

      this._keepalive = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
    }
  }

  onWsEvent(type, callback) {
    if (!this.wsListeners.has(type)) {
      this.wsListeners.set(type, []);
    }
    this.wsListeners.get(type).push(callback);
    return () => {
      const listeners = this.wsListeners.get(type);
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  disconnectWebSocket() {
    clearInterval(this._keepalive);
    this.ws?.close();
  }
}

export const api = new ApiService();
