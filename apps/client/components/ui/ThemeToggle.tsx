'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ className = '', size = 'sm' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizes = {
    sm: { button: 'w-7 h-7', icon: 13 },
    md: { button: 'w-8 h-8', icon: 15 },
    lg: { button: 'w-9 h-9', icon: 17 },
  };

  const { button, icon } = sizes[size];

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${button}
        flex items-center justify-center
        transition-colors
        text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]
        ${className}
      `}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {theme === 'dark' ? (
        <Sun size={icon} />
      ) : (
        <Moon size={icon} />
      )}
    </button>
  );
}
