import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Users, GraduationCap, FlaskConical,
  MonitorSmartphone, Trophy, Settings, PanelLeftClose, PanelLeftOpen, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ThemeToggle } from '../ui';
import { cn } from '../fx';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; placeholder?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/groups', label: 'Groups', icon: Users },
  { to: '/admin/students', label: 'Students', icon: GraduationCap },
  { to: '/admin/labs', label: 'Labs', icon: FlaskConical },
  { to: '/admin/environments', label: 'Environments', icon: MonitorSmartphone },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

/**
 * Shared admin console shell: 64px top bar + 220px collapsible sidebar
 * (icon-only mode persisted in localStorage) + <Outlet /> content.
 */
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('admin-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('admin-sidebar-collapsed', collapsed ? '1' : '0');
    } catch { /* private mode */ }
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (to: string) =>
    to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-bg" id="main">
      {/* top bar */}
      <header className="glass sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
        <Link to="/admin" className="flex items-center gap-2" aria-label="Opslance admin console">
          <span className="font-display text-xl font-black tracking-tight text-content">Opslance</span>
          <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted">Admin Console</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <span className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-content sm:flex">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-black text-white">
              {(user?.full_name ?? 'A').charAt(0).toUpperCase()}
            </span>
            {user?.full_name ?? 'Admin'}
          </span>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-danger/40 hover:text-danger"
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* sidebar */}
        <aside
          className={cn(
            'sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col justify-between border-r border-border bg-surface/60 backdrop-blur transition-all duration-200 md:flex',
            collapsed ? 'w-[68px]' : 'w-[220px]',
          )}
          aria-label="Admin sections"
        >
          <nav className="space-y-1 p-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon, placeholder }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active && !placeholder ? 'page' : undefined}
                  title={label}
                  onClick={placeholder ? (e) => e.preventDefault() : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                    collapsed && 'justify-center border-l-transparent px-2',
                    placeholder
                      ? 'cursor-not-allowed border-l-transparent text-muted/60'
                      : active
                        ? 'border-primary bg-primary/15 text-primary-strong'
                        : 'border-l-transparent text-muted hover:bg-surface-2 hover:text-content',
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {!collapsed && <span>{label}{placeholder ? ' (soon)' : ''}</span>}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center gap-2 border-t border-border py-3 text-xs font-bold text-muted transition-colors hover:text-content"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <><PanelLeftClose size={16} aria-hidden /> Collapse</>}
          </button>
        </aside>

        {/* mobile section nav */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden">
          <nav aria-label="Admin sections" className="flex overflow-x-auto px-2 py-2">
            {NAV_ITEMS.filter((i) => !i.placeholder).map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} aria-current={isActive(to) ? 'page' : undefined}
                    className={cn('flex min-w-[72px] flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-bold',
                      isActive(to) ? 'bg-primary/15 text-primary-strong' : 'text-muted')}>
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* content */}
        <main className="min-w-0 flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
