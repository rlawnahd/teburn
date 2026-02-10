'use client';

import { createContext, useContext, useEffect, useSyncExternalStore, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// --- 테마 external store ---
let themeListeners: (() => void)[] = [];

function emitThemeChange() {
  themeListeners.forEach((l) => l());
}

function subscribeTheme(listener: () => void) {
  themeListeners.push(listener);
  return () => {
    themeListeners = themeListeners.filter((l) => l !== listener);
  };
}

function getThemeSnapshot(): Theme {
  return (localStorage.getItem('teburn-theme') as Theme) || 'light';
}

function getThemeServerSnapshot(): Theme {
  return 'light';
}

// --- mounted store ---
const subscribeMounted = () => () => {};
function useMounted() {
  return useSyncExternalStore(subscribeMounted, () => true, () => false);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const mounted = useMounted();
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  // 테마 변경 시 DOM 업데이트
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('teburn-theme', next);
    emitThemeChange();
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem('teburn-theme', newTheme);
    emitThemeChange();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {!mounted ? (
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}
