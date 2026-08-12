import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ResizableSplit } from './components/ResizableSplit';
import { TemplateModal } from './components/TemplateModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  // ── State ───────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSpreadsheetId, setCurrentSpreadsheetId] = useState(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', '/');
    }
    checkAuth();
    api.connectWebSocket(sessionId);
    return () => api.disconnectWebSocket();
  }, []);

  // ── WebSocket listeners ─────────────────────────────
  useEffect(() => {
    const unsubs = [
      api.onWsEvent('spreadsheet_created', (data) => {
        setCurrentSpreadsheetId(data.spreadsheetId);
        setSpreadsheetUrl(data.url);
        setStatusMessage(`📊 Created: ${data.title}`);
      }),
      api.onWsEvent('status', (data) => {
        setStatusMessage(data.message);
      }),
      api.onWsEvent('complete', (data) => {
        setIsProcessing(false);
        setStatusMessage(null);
        setStreamingText('');
        if (data.spreadsheetId) {
          setCurrentSpreadsheetId(data.spreadsheetId);
        }
      }),
      api.onWsEvent('error', (data) => {
        setIsProcessing(false);
        setStatusMessage(null);
        setMessages((prev) => [
          ...prev,
          { role: 'system', content: `❌ Error: ${data.message}`, type: 'error' },
        ]);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  async function checkAuth() {
    try {
      const data = await api.getMe();
      if (data?.user) setUser(data.user);
    } catch (e) { /* not authenticated */ }
    finally { setLoading(false); }
  }

  // ── Handlers ────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (message) => {
      if (!message.trim() || isProcessing) return;
      setMessages((prev) => [...prev, { role: 'user', content: message }]);
      setIsProcessing(true);
      setStreamingText('');

      let aiResponse = '';

      try {
        await api.sendMessage({
          message,
          spreadsheetId: currentSpreadsheetId,
          onEvent: (event) => {
            switch (event.type) {
              case 'stream':
                aiResponse += event.content;
                setStreamingText(aiResponse);
                break;
              case 'operations':
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: event.operations.explanation || 'Processing...',
                    operations: event.operations.operations,
                  },
                ]);
                setStreamingText('');
                break;
              case 'spreadsheet_created':
                setCurrentSpreadsheetId(event.spreadsheetId);
                setSpreadsheetUrl(event.url);
                break;
              case 'data_written':
              case 'data_appended':
                setStatusMessage(`✅ Wrote ${event.updatedRows || 0} rows`);
                break;
              case 'formatted':
                setStatusMessage(`🎨 Formatted ${event.sheet}`);
                break;
              case 'chart_created':
                setStatusMessage(`📈 Created ${event.chartType} chart`);
                break;
              case 'complete':
                setIsProcessing(false);
                setStatusMessage(null);
                if (event.spreadsheetId) setCurrentSpreadsheetId(event.spreadsheetId);
                break;
              case 'plan_only':
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: event.message,
                    operations: event.operations,
                    isPlan: true,
                  },
                ]);
                setIsProcessing(false);
                break;
              case 'error':
                setMessages((prev) => [
                  ...prev,
                  { role: 'system', content: `❌ ${event.message}`, type: 'error' },
                ]);
                setIsProcessing(false);
                break;
            }
          },
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'system', content: `❌ ${err.message}`, type: 'error' },
        ]);
        setIsProcessing(false);
      }
    },
    [isProcessing, currentSpreadsheetId]
  );

  const handleLogin = async () => {
    try {
      const url = await api.getAuthUrl();
      window.location.href = url;
    } catch (e) {
      setShowAuth(true);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setMessages([]);
    setCurrentSpreadsheetId(null);
    setSpreadsheetUrl(null);
  };

  const handlePublish = async () => {
    if (!currentSpreadsheetId) return;
    try {
      const result = await api.publishSpreadsheet(currentSpreadsheetId);
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `🌐 Published! View link: ${result.viewLink}`, type: 'success' },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `❌ Publish failed: ${e.message}`, type: 'error' },
      ]);
    }
  };

  const handleUseTemplate = async (templateKey) => {
    setShowTemplates(false);
    setIsProcessing(true);
    setStreamingText('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `Create a ${templateKey} template` },
    ]);

    try {
      const templateBase = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE || 'http://47.236.80.116:3001');
      const response = await fetch(`${templateBase}/api/chat/template/${templateKey}`, {
        method: 'POST',
        credentials: 'include',
      });

      const reader = response.body.getReader();
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
            if (data === '[DONE]') continue;
            try {
              const event = JSON.parse(data);
              if (event.type === 'spreadsheet_created') {
                setCurrentSpreadsheetId(event.spreadsheetId);
                setSpreadsheetUrl(event.url);
              }
              if (event.type === 'stream') {
                setStreamingText((prev) => prev + event.content);
              }
              if (event.type === 'complete') {
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: event.message },
                ]);
                setStreamingText('');
              }
            } catch (e) { /* skip */ }
          }
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `❌ ${e.message}`, type: 'error' },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    api.clearHistory();
    setCurrentSpreadsheetId(null);
    setSpreadsheetUrl(null);
    setStreamingText('');
  };

  // ── Render ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-1">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-3">Loading FinModel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-surface-1 overflow-hidden">
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNewModel={() => setShowTemplates(true)}
        onPublish={handlePublish}
        onClear={handleClearChat}
        hasSpreadsheet={!!currentSpreadsheetId}
      />

      <ResizableSplit
        defaultRatio={0.35}
        minRatio={0.2}
        maxRatio={0.6}
        left={
          <ChatPanel
            messages={messages}
            isProcessing={isProcessing}
            streamingText={streamingText}
            statusMessage={statusMessage}
            onSendMessage={handleSendMessage}
            user={user}
          />
        }
        right={
          <PreviewPanel
            spreadsheetId={currentSpreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            user={user}
            onLogin={handleLogin}
          />
        }
      />

      {showTemplates && (
        <TemplateModal
          onSelect={handleUseTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}
