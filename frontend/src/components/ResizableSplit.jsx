import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Resizable split pane — like Lovable/Cursor.
 * Left panel is chat, right panel is preview.
 * Drag the divider to resize. Double-click to reset.
 */
export function ResizableSplit({ left, right, defaultRatio = 0.35, minRatio = 0.2, maxRatio = 0.6 }) {
  const containerRef = useRef(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileShowPreview, setMobileShowPreview] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newRatio = Math.min(maxRatio, Math.max(minRatio, x / rect.width));
    setRatio(newRatio);
  }, [isDragging, minRatio, maxRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setRatio(defaultRatio);
  }, [defaultRatio]);

  // Global mouse events while dragging
  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = useCallback((e) => {
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const newRatio = Math.min(maxRatio, Math.max(minRatio, x / rect.width));
    setRatio(newRatio);
  }, [isDragging, minRatio, maxRatio]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mobile: overlay mode
  if (isMobile) {
    return (
      <div className="flex-1 relative overflow-hidden">
        {/* Chat always rendered */}
        <div className="absolute inset-0">
          {left}
        </div>

        {/* Preview slides in from right */}
        <div
          className={`absolute inset-0 z-30 bg-white transition-transform duration-300 ease-out ${
            mobileShowPreview ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {right}
        </div>

        {/* Toggle button — always visible, floats on edge */}
        <button
          onClick={() => setMobileShowPreview(!mobileShowPreview)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 w-8 h-20 bg-white/95 backdrop-blur border border-r-0 border-surface-3 rounded-l-lg shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <div className="flex flex-col gap-1">
            <div className="w-1 h-1 rounded-full bg-dark-3" />
            <div className="w-1 h-1 rounded-full bg-dark-3" />
            <div className="w-1 h-1 rounded-full bg-dark-3" />
          </div>
        </button>
      </div>
    );
  }

  // Desktop: resizable split
  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
      {/* Left panel */}
      <div style={{ width: `${ratio * 100}%` }} className="shrink-0 overflow-hidden">
        {left}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        className={`
          w-[6px] shrink-0 cursor-col-resize relative group
          hover:bg-brand-100 active:bg-brand-200
          transition-colors duration-150
          ${isDragging ? 'bg-brand-200' : 'bg-transparent'}
        `}
      >
        {/* Visual handle */}
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[3px] h-10 rounded-full
          transition-all duration-150
          ${isDragging ? 'bg-brand-400 h-14' : 'bg-surface-3 group-hover:bg-brand-300'}
        `} />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden min-w-0">
        {right}
      </div>
    </div>
  );
}
