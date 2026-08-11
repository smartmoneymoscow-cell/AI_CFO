import React from 'react';
import {
  LogIn,
  LogOut,
  Plus,
  Globe,
  Trash2,
  Table2,
  ChevronDown,
} from 'lucide-react';

export function Header({
  user,
  onLogin,
  onLogout,
  onNewModel,
  onPublish,
  onClear,
  hasSpreadsheet,
}) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <header className="h-14 border-b border-surface-3 bg-surface-0 flex items-center justify-between px-4 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <Table2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-dark-0 leading-tight">FinModel</h1>
            <p className="text-[10px] text-dark-3 leading-tight hidden sm:block">AI Financial Modeling</p>
          </div>
        </div>

        <div className="h-6 w-px bg-surface-3 mx-1 sm:mx-2 hidden sm:block" />

        <button
          onClick={onNewModel}
          className="flex items-center gap-1.5 text-xs font-medium text-dark-2 hover:text-brand-600 transition-colors px-2 py-1.5 rounded-md hover:bg-surface-1"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Model</span>
        </button>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-2">
        {hasSpreadsheet && (
          <button
            onClick={onPublish}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors px-2.5 sm:px-3 py-1.5 rounded-md"
          >
            <Globe size={14} />
            <span className="hidden sm:inline">Publish</span>
          </button>
        )}

        <button
          onClick={onClear}
          className="p-1.5 text-dark-3 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
          title="Clear chat"
        >
          <Trash2 size={16} />
        </button>

        <div className="h-6 w-px bg-surface-3 mx-1" />

        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-1 transition-colors"
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-brand-700">
                    {user.name?.[0] || '?'}
                  </span>
                </div>
              )}
              <span className="text-xs font-medium text-dark-2 max-w-[120px] truncate">
                {user.name || user.email}
              </span>
              <ChevronDown size={12} className="text-dark-3" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 bg-surface-0 rounded-lg shadow-lg border border-surface-3 z-50 py-1">
                  <div className="px-3 py-2 border-b border-surface-2">
                    <p className="text-xs text-dark-3">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-dark-2 hover:bg-surface-1 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-dark-0 hover:bg-dark-1 transition-colors px-3 py-1.5 rounded-md"
          >
            <LogIn size={14} />
            Sign in with Google
          </button>
        )}
      </div>
    </header>
  );
}
