import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { toggleTheme, getStoredTheme } from '../lib/theme';

export interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: 'Labs' | 'Go to' | 'Actions';
  keywords?: string;
  run: () => void;
}

interface CatalogLab {
  id: string;
  title: string;
  module_number: number;
  module_title: string;
  points: number;
  status: string;
}

let catalogCache: CatalogLab[] | null = null;

/** ⌘K / Ctrl+K command palette: jump to labs, pages, and quick actions. */
export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [query, setQuery] = useState('');
  const [labs, setLabs] = useState<CatalogLab[]>(catalogCache ?? []);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || catalogCache) return;
    api.get('/labs').then((r) => {
      catalogCache = r.data;
      setLabs(r.data);
    }).catch(() => {/* palette still usable without catalog */});
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const go = (to: string) => () => { navigate(to); onClose(); };
    const nav: PaletteItem[] = [
      { id: 'nav-dashboard', label: 'Dashboard', group: 'Go to', hint: '/', run: go('/dashboard') },
      { id: 'nav-courses', label: 'Courses', group: 'Go to', hint: 'c', run: go('/courses') },
      { id: 'nav-progress', label: 'Progress', group: 'Go to', run: go('/progress') },
      { id: 'nav-achievements', label: 'Achievements', group: 'Go to', run: go('/achievements') },
      { id: 'nav-leaderboard', label: 'Leaderboard', group: 'Go to', run: go('/leaderboard') },
      { id: 'nav-billing', label: 'Billing & plan', group: 'Go to', run: go('/billing') },
    ];
    const labItems: PaletteItem[] = labs.map((l) => ({
      id: `lab-${l.id}`,
      label: l.title,
      hint: `Module ${String(l.module_number).padStart(2, '0')} · ${l.points} pts${l.status === 'done' ? ' · passed' : ''}`,
      group: 'Labs',
      keywords: `${l.module_title} ${l.id}`,
      run: go(`/labs/${l.id}`),
    }));
    const actions: PaletteItem[] = [
      {
        id: 'act-theme',
        label: getStoredTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Actions',
        run: () => { toggleTheme(); onClose(); },
      },
      {
        id: 'act-logout',
        label: 'Log out',
        group: 'Actions',
        run: () => { logout(); navigate('/login'); },
      },
    ];
    const all = [...nav, ...labItems, ...actions];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    return all
      .filter((i) => `${i.label} ${i.keywords ?? ''} ${i.hint ?? ''}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [labs, query, navigate, onClose, logout]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }, [items, active, onClose]);

  if (!open) return null;

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search labs and commands…"
          aria-label="Search labs and commands"
          className="w-full border-b border-border bg-transparent px-5 py-4 text-sm font-medium text-content outline-none placeholder:text-muted"
        />
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm font-medium text-muted">No matches for “{query}”</p>
        ) : (
          <ul ref={listRef} role="listbox" aria-label="Results" className="max-h-[46vh] overflow-y-auto p-2">
            {items.map((item, i) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <li key={item.id} role="option" aria-selected={i === active}>
                  {showGroup && (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-widest text-muted">{item.group}</p>
                  )}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={item.run}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors
                      ${i === active ? 'bg-primary/15 text-content' : 'text-muted hover:text-content'}`}
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-content">{item.label}</span>
                    {item.hint && <span className="shrink-0 text-xs font-medium text-muted">{item.hint}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center gap-4 border-t border-border bg-surface-2/50 px-5 py-2.5 text-[11px] font-semibold text-muted">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="ml-auto">{labs.length ? `${labs.length} labs indexed` : 'loading catalog…'}</span>
        </div>
      </div>
    </div>
  );
};

/** Global keyboard shortcut hook: ⌘K / Ctrl+K toggles the palette. */
export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { open, setOpen };
};

export default CommandPalette;
