import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Table2,
  Copy,
  Check,
} from 'lucide-react';

export function PreviewPanel({ spreadsheetId, spreadsheetUrl, user, onLogin }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSheet, setActiveSheet] = useState(0);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (spreadsheetId && user) loadSheetData();
  }, [spreadsheetId]);

  async function loadSheetData() {
    if (!spreadsheetId) return;
    setLoading(true);
    try {
      const data = await api.readAllSheets(spreadsheetId);
      setSheetData(data.data);
    } catch (e) {
      console.error('Failed to load sheet data:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyLink = () => {
    if (spreadsheetUrl) {
      navigator.clipboard.writeText(spreadsheetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1 px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <Table2 size={32} className="text-dark-3" />
          </div>
          <h2 className="text-lg font-semibold text-dark-0 mb-2">
            Connect Google Account
          </h2>
          <p className="text-sm text-dark-3 mb-6">
            Sign in with Google to create and edit spreadsheets directly from
            the chat. Your models will be saved to your Google Drive.
          </p>
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white rounded-lg shadow-sm border border-surface-3 hover:shadow-md transition-shadow text-sm font-medium text-dark-0"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // No spreadsheet yet
  if (!spreadsheetId) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-1 px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✨</span>
          </div>
          <h2 className="text-lg font-semibold text-dark-0 mb-2">
            Ready to Build
          </h2>
          <p className="text-sm text-dark-3 mb-4">
            Describe your financial model in the chat and it will appear here
            as a live Google Sheet.
          </p>
          <div className="text-xs text-dark-3 bg-surface-0 rounded-lg px-4 py-3 border border-surface-2 text-left">
            <p className="font-medium text-dark-2 mb-1">Try asking:</p>
            <p>
              "Create a SaaS revenue model with MRR projections, churn rates,
              and a dashboard chart"
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Spreadsheet exists
  const embedUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?widget=true`;

  return (
    <div
      className={`h-full flex flex-col bg-white ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="h-10 border-b border-surface-2 flex items-center justify-between px-3 shrink-0 bg-surface-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={loadSheetData}
            disabled={loading}
            className="p-1 text-dark-3 hover:text-dark-0 rounded transition-colors shrink-0"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Sheet tabs */}
          {sheetData && Object.keys(sheetData).length > 1 && (
            <div className="flex items-center gap-1 ml-2 overflow-x-auto">
              {Object.keys(sheetData).map((name, i) => (
                <button
                  key={name}
                  onClick={() => setActiveSheet(i)}
                  className={`text-[11px] px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                    activeSheet === i
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-dark-3 hover:text-dark-0 hover:bg-surface-1'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-[11px] text-dark-3 hover:text-dark-0 px-2 py-1 rounded hover:bg-surface-1 transition-colors"
            title="Copy link"
          >
            {copied ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <Copy size={12} />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy link'}</span>
          </button>

          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-dark-3 hover:text-dark-0 px-2 py-1 rounded hover:bg-surface-1 transition-colors"
            title="Open in Google Sheets"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Open</span>
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 text-dark-3 hover:text-dark-0 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Google Sheets iframe */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="text-center">
              <RefreshCw size={24} className="animate-spin text-brand-500 mx-auto mb-2" />
              <p className="text-xs text-dark-3">Loading spreadsheet...</p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full border-0"
          title="Google Sheets Preview"
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-surface-2 flex items-center justify-between px-3 bg-surface-0 shrink-0">
        <span className="text-[10px] text-dark-3 truncate">
          {sheetData ? `${Object.keys(sheetData).length} sheet(s) loaded` : 'Loading...'}
        </span>
        <span className="text-[10px] text-dark-3 shrink-0">Saved to Google Drive</span>
      </div>
    </div>
  );
}
