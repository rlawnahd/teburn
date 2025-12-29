'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizes = {
    sm: { button: 'w-8 h-8', icon: 14 },
    md: { button: 'w-10 h-10', icon: 18 },
    lg: { button: 'w-12 h-12', icon: 22 },
  };

  const { button, icon } = sizes[size];

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${button}
        flex items-center justify-center
        rounded-xl
        transition-all duration-200
        hover:scale-105 active:scale-95
        ${theme === 'dark'
          ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)]'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)]'
        }
        ${className}
      `}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {theme === 'dark' ? (
        <Sun size={icon} className="transition-transform duration-300" />
      ) : (
        <Moon size={icon} className="transition-transform duration-300" />
      )}
    </button>
  );
}
