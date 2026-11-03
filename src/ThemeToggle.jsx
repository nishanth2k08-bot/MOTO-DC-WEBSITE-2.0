import React, { useState, useEffect } from 'react';

export default function ThemeToggle({ className = '', style = {} }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('motodc-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    try {
      localStorage.setItem('motodc-theme', theme);
    } catch (_) {}
  }, [theme]);

  // Sync across tabs/windows or multiple toggle buttons
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'motodc-theme' && e.newValue) {
        setTheme(e.newValue);
      }
    };
    const handleCustom = (e) => {
      if (e.detail && e.detail !== theme) {
        setTheme(e.detail);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('motodc:theme-change', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('motodc:theme-change', handleCustom);
    };
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.dispatchEvent(new CustomEvent('motodc:theme-change', { detail: next }));
  };

  return (
    <button
      type="button"
      className={`themeToggle themeToggleBtn ${className}`.trim()}
      onClick={toggle}
      style={style}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="themeIcon" aria-hidden="true">
        {theme === 'dark' ? '🌞' : '🌙'}
      </span>
    </button>
  );
}
