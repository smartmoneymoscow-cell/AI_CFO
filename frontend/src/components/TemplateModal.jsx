import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, ArrowRight } from 'lucide-react';

export function TemplateModal({ onSelect, onClose }) {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTemplates().then((data) => {
      setTemplates(data.templates || {});
      setLoading(false);
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-0 rounded-2xl shadow-2xl w-[95vw] sm:w-[520px] max-h-[85vh] sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="text-base font-semibold text-dark-0">
              New Financial Model
            </h2>
            <p className="text-xs text-dark-3 mt-0.5">
              Choose a template or describe what you need in chat
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-dark-3 hover:text-dark-0 rounded-md hover:bg-surface-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8 text-sm text-dark-3">
              Loading templates...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => onSelect(key)}
                  className="text-left p-4 rounded-xl border border-surface-2 hover:border-brand-300 hover:bg-brand-50/50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-dark-0 group-hover:text-brand-700">
                        {template.name}
                      </h3>
                      <p className="text-xs text-dark-3 mt-1 leading-relaxed">
                        {template.description}
                      </p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-dark-3 group-hover:text-brand-500 mt-0.5 shrink-0 transition-colors"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.sheets.map((sheet) => (
                      <span
                        key={sheet}
                        className="text-[10px] px-1.5 py-0.5 bg-surface-1 rounded text-dark-3"
                      >
                        {sheet}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-2 bg-surface-1">
          <p className="text-[11px] text-dark-3 text-center">
            Or describe a custom model in the chat — AI will build it from
            scratch
          </p>
        </div>
      </div>
    </div>
  );
}
