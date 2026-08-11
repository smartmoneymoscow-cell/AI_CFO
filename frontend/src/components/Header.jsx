import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, Plus, Globe, Trash2, Table2, ChevronDown, User, ExternalLink } from 'lucide-react';

export function Header({ user, onLogin, onLogout, onNewModel, onPublish, onClear, hasSpreadsheet }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <header className="h-14 border-b border-surface-3 bg-surface-0 flex items-center justify-between px-3 sm:px-4 shrink-0 z-20">
      {/* Left: Logo + New */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <Table2 size={18} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-dark-0 leading-tight">FinModel</h1>
            <p className="text-[10px] text-dark-3 leading-tight">AI Financial Modeling</p>
          </div>
        </div>

        <div className="h-6 w-px bg-surface-3 mx-1 hidden sm:block" />

        <button
          onClick={onNewModel}
          className="flex items-center gap-1 text-xs font-medium text-dark-2 hover:text-brand-600 transition-colors px-2 py-1.5 rounded-md hover:bg-surface-1"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Model</span>
        </button>
      </div>

      {/* Right: Actions + Account */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {hasSpreadsheet && (
          <button
            onClick={onPublish}
            className="flex items-center gap-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors px-2.5 py-1.5 rounded-md"
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
          <Trash2 size={15} />
        </button>

        <div className="h-6 w-px bg-surface-3 mx-0.5" />

        {/* ── Account button ── */}
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-surface-1 transition-colors border border-transparent hover:border-surface-3"
            >
              {/* Avatar — Google photo or initial */}
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border-2 border-surface-3 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 items-center justify-center ${user.picture ? 'hidden' : 'flex'}`}
              >
                <span className="text-xs font-bold text-white">{user.name?.[0] || 'U'}</span>
              </div>

              <ChevronDown size={12} className={`text-dark-3 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface-0 rounded-xl shadow-xl border border-surface-3 z-50 overflow-hidden">
                {/* User info card */}
                <div className="px-4 py-3 bg-surface-1 border-b border-surface-2">
                  <div className="flex items-center gap-3">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{user.name?.[0] || 'U'}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark-0 truncate">{user.name}</p>
                      <p className="text-[11px] text-dark-3 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Google account link */}
                <div className="px-2 py-1.5">
                  <a
                    href="https://myaccount.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-2 text-xs text-dark-2 hover:bg-surface-1 rounded-md transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <User size={14} />
                    Google Account
                    <ExternalLink size={10} className="ml-auto text-dark-3" />
                  </a>
                </div>

                {/* Sign out */}
                <div className="px-2 pb-2 border-t border-surface-2 pt-1">
                  <button
                    onClick={() => { onLogout(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-2 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-dark-0 hover:bg-dark-1 transition-colors px-3 py-2 rounded-lg"
          >
            <LogIn size={14} />
            <span className="hidden sm:inline">Sign in</span>
            <span className="sm:hidden">Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
