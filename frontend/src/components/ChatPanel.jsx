import React, { useState, useRef, useEffect } from 'react';
import { Send, Link, Loader2 } from 'lucide-react';

export function ChatPanel({
  messages,
  isProcessing,
  streamingText,
  statusMessage,
  onSendMessage,
  user,
}) {
  const [input, setInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input, documentUrl || undefined);
    setInput('');
    setDocumentUrl('');
    setShowUrlInput(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0 border-r border-surface-3">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-surface-2 shrink-0">
        <h2 className="text-sm font-semibold text-dark-0">Chat</h2>
        <p className="text-[11px] text-dark-3 mt-0.5">
          Describe your financial model or analysis
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && !streamingText && (
          <EmptyState />
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} user={user} />
        ))}

        {/* Streaming text */}
        {streamingText && (
          <div className="message-appear">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0">
                <span className="text-[10px] text-white font-bold">AI</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-dark-3 mb-1">FinModel AI</div>
                <div className="text-sm text-dark-0 whitespace-pre-wrap streaming-cursor break-words">
                  {streamingText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && !streamingText && (
          <div className="flex items-center gap-2 text-xs text-dark-3 message-appear">
            <Loader2 size={14} className="animate-spin" />
            {statusMessage || 'Processing...'}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-surface-2 p-3 shrink-0">
        {/* URL input */}
        {showUrlInput && (
          <div className="mb-2 flex gap-2">
            <input
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="Paste Google Sheets URL..."
              className="flex-1 text-xs px-3 py-2 rounded-md border border-surface-3 bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
            />
            <button
              onClick={() => { setShowUrlInput(false); setDocumentUrl(''); }}
              className="text-xs text-dark-3 hover:text-dark-0 px-2"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`p-2.5 rounded-md transition-colors shrink-0 ${
              showUrlInput
                ? 'bg-brand-50 text-brand-600'
                : 'text-dark-3 hover:text-dark-2 hover:bg-surface-1'
            }`}
            title="Attach document URL"
          >
            <Link size={16} />
          </button>

          <div className="flex-1 min-w-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                user
                  ? 'Describe your financial model...'
                  : 'Sign in to start building models...'
              }
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              disabled={!user || isProcessing}
              rows={1}
              className="w-full resize-none text-sm px-3 py-2.5 rounded-md border border-surface-3 bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '42px', maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || !user || isProcessing}
            className="p-2.5 rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>

        <div className="mt-2 hidden sm:flex items-center gap-2 text-[10px] text-dark-3">
          <kbd className="px-1 py-0.5 bg-surface-2 rounded text-[10px]">Enter</kbd>
          <span>to send ·</span>
          <kbd className="px-1 py-0.5 bg-surface-2 rounded text-[10px]">Shift+Enter</kbd>
          <span>new line</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, user }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isError = message.type === 'error';
  const isSuccess = message.type === 'success';

  if (isSystem) {
    return (
      <div className="message-appear">
        <div
          className={`text-xs px-3 py-2 rounded-lg ${
            isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : isSuccess
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="message-appear">
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isUser ? 'bg-dark-0' : 'bg-gradient-to-br from-brand-400 to-brand-600'
          }`}
        >
          <span className="text-[10px] text-white font-bold">
            {isUser ? user?.name?.[0] || 'U' : 'AI'}
          </span>
        </div>

        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
          <div className="text-xs text-dark-3 mb-1">
            {isUser ? user?.name || 'You' : 'FinModel AI'}
          </div>

          <div
            className={`text-sm whitespace-pre-wrap break-words ${
              isUser
                ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 inline-block text-left max-w-[85%]'
                : 'text-dark-0'
            }`}
          >
            {message.content}
          </div>

          {/* Operations preview */}
          {message.operations && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.operations.map((op, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-surface-1 rounded px-2 py-1 text-dark-3"
                >
                  {getOperationIcon(op.type)} {op.type}
                  {op.sheet && ` → ${op.sheet}`}
                </span>
              ))}
            </div>
          )}

          {message.isPlan && (
            <div className="mt-2 text-[11px] text-brand-600 bg-brand-50 rounded-md px-3 py-2 text-left">
              🔗 Connect Google account to execute this plan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const suggestions = [
    'Create a revenue projection for a SaaS startup',
    'Build a P&L statement with YoY comparison',
    'Design a unit economics model (CAC, LTV)',
    'Make a DCF valuation with 5-year projections',
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center mb-4">
        <span className="text-2xl">📊</span>
      </div>
      <h3 className="text-sm font-semibold text-dark-0 mb-1">
        Financial Modeling AI
      </h3>
      <p className="text-xs text-dark-3 mb-6 max-w-[280px]">
        Describe what you need and I'll build it directly in Google Sheets —
        formulas, charts, formatting and all.
      </p>

      <div className="space-y-2 w-full">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="text-xs text-left text-dark-2 bg-surface-1 rounded-lg px-3 py-2.5 border border-surface-2 hover:border-brand-200 hover:bg-brand-50 transition-colors cursor-default"
          >
            💡 {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function getOperationIcon(type) {
  const icons = {
    create_spreadsheet: '📄',
    write_data: '✏️',
    append_data: '➕',
    format: '🎨',
    chart: '📈',
    clear_range: '🧹',
    import_url: '🔗',
  };
  return icons[type] || '⚙️';
}
