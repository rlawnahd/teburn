'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, TrendingUp } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/', label: '테마 현황', icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        w-64 hidden lg:flex flex-col fixed h-full z-20
        bg-[var(--bg-primary)] border-r border-[var(--border-color)]
        transition-colors duration-200
      "
    >
      {/* 로고 */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="
              w-9 h-9 rounded-xl flex items-center justify-center
              bg-gradient-to-br from-orange-500 to-red-600
              shadow-lg shadow-orange-500/25
              group-hover:shadow-red-500/40 group-hover:scale-105
              transition-all duration-200
            "
          >
            <Flame size={20} className="text-white" fill="currentColor" />
          </div>
          <span
            className="
              text-lg font-bold tracking-tight
              bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent
            "
          >
            TEBURN
          </span>
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-5">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-[var(--accent-blue)] text-white shadow-lg shadow-[var(--accent-blue)]/25'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 하단 영역 */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-[var(--text-tertiary)]">테마 변경</span>
          <ThemeToggle size="sm" />
        </div>
      </div>
    </aside>
  );
}
