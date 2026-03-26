import { createContext, useContext, useState, useEffect } from 'react';

var ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  var [theme, setTheme] = useState(function() {
    return localStorage.getItem('mt_theme') || 'dark';
  });

  function toggleTheme() {
    var next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('mt_theme', next);
  }

  var dark = {
    // Backgrounds
    bg:          '#0a0f1e',
    bgCard:      '#0f172a',
    bgHover:     '#1e293b',
    bgInput:     '#1e293b',
    bgBorder:    '#1e293b',
    border:      '#1e293b',
    borderLight: '#334155',

    // Text
    textPrimary:   '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted:     '#64748b',
    textFaint:     '#475569',

    // Sidebar
    sidebar:       '#0f172a',
    sidebarBorder: '#1e293b',
    sidebarText:   '#94a3b8',
    sidebarActive: '#60a5fa',

    // Accents
    accent:  '#60a5fa',
    green:   '#4ade80',
    red:     '#f87171',
    yellow:  '#f59e0b',

    // Ticker
    ticker:  '#0f172a',
  };

  var light = {
    // Backgrounds
    bg:          '#f1f5f9',
    bgCard:      '#ffffff',
    bgHover:     '#f8fafc',
    bgInput:     '#ffffff',
    bgBorder:    '#e2e8f0',
    border:      '#e2e8f0',
    borderLight: '#cbd5e1',

    // Text
    textPrimary:   '#0f172a',
    textSecondary: '#475569',
    textMuted:     '#64748b',
    textFaint:     '#94a3b8',

    // Sidebar
    sidebar:       '#1e293b',
    sidebarBorder: '#334155',
    sidebarText:   '#94a3b8',
    sidebarActive: '#60a5fa',

    // Accents
    accent:  '#2563eb',
    green:   '#16a34a',
    red:     '#dc2626',
    yellow:  '#d97706',

    // Ticker
    ticker:  '#1e293b',
  };

  var colors = theme === 'dark' ? dark : light;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}