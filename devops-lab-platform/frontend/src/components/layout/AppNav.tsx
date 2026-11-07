import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Logo, ThemeToggle } from '../ui';
import { CommandPalette, useCommandPalette } from '../CommandPalette';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/progress', label: 'Progress' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/billing', label: 'Billing' },
];

/** Shared top navigation for student app pages. */
export const AppNav: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const palette = useCommandPalette();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" aria-label="Opslance dashboard"><Logo size={30} /></Link>
        <nav aria-label="App" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={location.pathname.startsWith(l.to) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-content ${location.pathname.startsWith(l.to) ? 'bg-surface-2 text-content' : 'text-muted'}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => palette.setOpen(true)}
            aria-label="Open command palette (Cmd+K)"
            title="Search (⌘K)"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-content"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="hidden sm:block">Search</span>
            <kbd className="hidden rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold sm:block">⌘K</kbd>
          </button>
          <span className="hidden text-sm font-medium text-muted sm:block">
            {user?.full_name?.split(' ')[0]}
          </span>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-danger/50 hover:text-danger"
          >
            Log out
          </button>
        </div>
      </div>
      {/* mobile links */}
      <nav aria-label="App sections" className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            aria-current={location.pathname.startsWith(l.to) ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-content ${location.pathname.startsWith(l.to) ? 'bg-surface-2 text-content' : 'text-muted'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </header>
  );
};

export default AppNav;
