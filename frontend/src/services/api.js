// API base: in dev proxied by Vite, in production point to backend server
const API_BASE = import.meta.env.DEV ? '' : 'http://47.236.80.116:3001';

class ApiService {
  constructor() {
    this.ws = null;
    this.wsListeners = new Map();
    this.sessionId = null;
  }

  async getAuthUrl() {
    const res = await fetch(`${API_BASE}/auth/google?sessionId=${this.sessionId || ''}`, { credentials: 'include' });
    const data = await res.json();
    return data.url;
  }

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  }

  async sendMessage({ message, spreadsheetId, documentUrl, onEvent }) {
    const res = await fetch(`${API_BASE}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, spreadsheetId, documentUrl }),
    });
    if (!res.ok) throw new Error(`Chat error: ${res.status}`);

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
          const d = line.slice(6);
          if (d === '[DONE]') return;
          try { onEvent(JSON.parse(d)); } catch {}
        }
      }
    }
  }

  async getTemplates() {
    const res = await fetch(`${API_BASE}/api/chat/templates`, { credentials: 'include' });
    return res.json();
  }

  async getHistory() {
    const res = await fetch(`${API_BASE}/api/chat/history`, { credentials: 'include' });
    return res.json();
  }

  async clearHistory() {
    await fetch(`${API_BASE}/api/chat/clear`, { method: 'POST', credentials: 'include' });
  }

  async createSpreadsheet(title, sheets) {
    const res = await fetch(`${API_BASE}/api/sheets/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ title, sheets }),
    });
    return res.json();
  }

  async readAllSheets(spreadsheetId) {
    const res = await fetch(`${API_BASE}/api/sheets/${spreadsheetId}/read-all`, { credentials: 'include' });
    return res.json();
  }

  async publishSpreadsheet(spreadsheetId) {
    const res = await fetch(`${API_BASE}/api/sheets/${spreadsheetId}/publish`, { method: 'POST', credentials: 'include' });
    return res.json();
  }

  async shareSpreadsheet(spreadsheetId, emails, role) {
    const res = await fetch(`${API_BASE}/api/sheets/${spreadsheetId}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ emails, role }),
    });
    return res.json();
  }

  connectWebSocket(sessionId) {
    this.sessionId = sessionId;
    const wsBase = import.meta.env.DEV
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      : 'ws://47.236.80.116:3001';
    try {
      this.ws = new WebSocket(`${wsBase}/ws?sessionId=${sessionId}`);
      this.ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          (this.wsListeners.get(d.type) || []).forEach(fn => fn(d));
          (this.wsListeners.get('all') || []).forEach(fn => fn(d));
        } catch {}
      };
      this.ws.onclose = () => setTimeout(() => this.connectWebSocket(sessionId), 3000);
      this._keepalive = setInterval(() => { if (this.ws?.readyState === 1) this.ws.send('{"type":"ping"}'); }, 30000);
    } catch {}
  }

  onWsEvent(type, callback) {
    if (!this.wsListeners.has(type)) this.wsListeners.set(type, []);
    this.wsListeners.get(type).push(callback);
    return () => { const l = this.wsListeners.get(type); const i = l.indexOf(callback); if (i !== -1) l.splice(i, 1); };
  }

  disconnectWebSocket() { clearInterval(this._keepalive); this.ws?.close(); }
}

export const api = new ApiService();
