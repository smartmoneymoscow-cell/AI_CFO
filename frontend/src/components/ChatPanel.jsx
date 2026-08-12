import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

export function ChatPanel({
  messages,
  isProcessing,
  streamingText,
  statusMessage,
  onSendMessage,
  user,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-0 border-r border-surface-3 overflow-hidden">
      {/* Header — fixed */}
      <div className="px-4 py-3 border-b border-surface-2 shrink-0">
        <h2 className="text-sm font-semibold text-dark-0">Chat</h2>
        <p className="text-[11px] text-dark-3 mt-0.5">
          Describe your financial model or analysis
        </p>
      </div>

      {/* Messages — scrollable, takes remaining space */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && !streamingText && <EmptyState />}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} user={user} />
        ))}

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

        {isProcessing && !streamingText && (
          <div className="flex items-center gap-2 text-xs text-dark-3 message-appear">
            <Loader2 size={14} className="animate-spin" />
            {statusMessage || 'Processing...'}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — fixed at bottom, NEVER hidden */}
      <div className="shrink-0 border-t border-surface-2 bg-surface-0 p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={user ? 'Describe your financial model...' : 'Sign in to start...'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            disabled={!user || isProcessing}
            rows={1}
            className="flex-1 min-w-0 resize-none text-sm px-3 py-2.5 rounded-md border border-surface-3 bg-surface-1
                       focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400
                       disabled:opacity-50 disabled:cursor-not-allowed
                       max-h-[120px] overflow-y-auto"
          />

          <button
            type="submit"
            disabled={!input.trim() || !user || isProcessing}
            className="p-2.5 rounded-md bg-brand-500 text-white hover:bg-brand-600
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 self-end"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, user }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="message-appear">
        <div className={`text-xs px-3 py-2 rounded-lg ${
          message.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="message-appear">
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-dark-0' : 'bg-gradient-to-br from-brand-400 to-brand-600'
        }`}>
          <span className="text-[10px] text-white font-bold">
            {isUser ? (user?.name?.[0] || 'U') : 'AI'}
          </span>
        </div>

        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
          <div className="text-xs text-dark-3 mb-1">
            {isUser ? (user?.name || 'You') : 'FinModel AI'}
          </div>
          <div className={`text-sm whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 inline-block text-left max-w-[85%]'
              : 'text-dark-0'
          }`}>
            {message.content}
          </div>

          {message.operations && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.operations.map((op, i) => (
                <span key={i} className="text-[11px] bg-surface-1 rounded px-2 py-1 text-dark-3">
                  {getOpIcon(op.type)} {op.type}{op.sheet ? ` → ${op.sheet}` : ''}
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
  const tips = [
    'Create a revenue projection for a SaaS startup',
    'Build a P&L statement with YoY comparison',
    'Design a unit economics model (CAC, LTV)',
    'Make a DCF valuation with 5-year projections',
  ];
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center mb-3">
        <span className="text-2xl">📊</span>
      </div>
      <h3 className="text-sm font-semibold text-dark-0 mb-1">Financial Modeling AI</h3>
      <p className="text-xs text-dark-3 mb-5 max-w-[260px]">
        Describe what you need — I'll build it in Google Sheets with formulas, charts, and formatting.
      </p>
      <div className="space-y-2 w-full">
        {tips.map((s, i) => (
          <div key={i} className="text-xs text-left text-dark-2 bg-surface-1 rounded-lg px-3 py-2 border border-surface-2">
            💡 {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function getOpIcon(type) {
  return { create_spreadsheet:'📄', write_data:'✏️', append_data:'➕', format:'🎨', chart:'📈', clear_range:'🧹', import_url:'🔗' }[type] || '⚙️';
}
