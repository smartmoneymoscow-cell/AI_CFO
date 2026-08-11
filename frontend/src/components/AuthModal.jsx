import React from 'react';
import { X, Shield, Table2, BarChart3 } from 'lucide-react';

export function AuthModal({ onClose, onLogin }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-0 rounded-2xl shadow-2xl w-[95vw] sm:w-[400px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <h2 className="text-base font-semibold text-dark-0">
            Connect Google Account
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-dark-3 hover:text-dark-0 rounded-md hover:bg-surface-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Table2 size={28} className="text-brand-500" />
            </div>
            <p className="text-sm text-dark-2 leading-relaxed">
              Sign in with Google to create and edit spreadsheets directly in
              your Google Drive.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Table2 size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-dark-0">
                  Create spreadsheets
                </p>
                <p className="text-[11px] text-dark-3">
                  AI builds models directly in Google Sheets
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <BarChart3 size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-dark-0">
                  Auto-format & chart
                </p>
                <p className="text-[11px] text-dark-3">
                  Professional formatting and visualizations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Shield size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-dark-0">
                  Publish & share
                </p>
                <p className="text-[11px] text-dark-3">
                  Publish under your Google account
                </p>
              </div>
            </div>
          </div>

          {/* Login button */}
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-xl shadow-sm border border-surface-3 hover:shadow-md transition-shadow text-sm font-medium text-dark-0"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Permissions note */}
          <p className="text-[10px] text-dark-3 text-center mt-4 leading-relaxed">
            We only request access to create and manage spreadsheets you create
            through FinModel. We cannot access your existing files.
          </p>
        </div>
      </div>
    </div>
  );
}
