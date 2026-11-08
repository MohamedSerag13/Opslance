import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import AppNav from '../components/layout/AppNav';
import { Card, Badge, Button, Modal, Skeleton, EmptyState, ProgressBar } from '../components/ui';
import { BlurFade } from '../components/fx';

/* The "3D" shelf renders on a 2D canvas with manual perspective projection —
 * the same approach as Cluster3D (no three.js in this project). Coins are
 * drawn as projected discs; a hover hit-test lifts a coin and shows a tooltip
 * below the canvas. Everything visual is aria-hidden; the real content is the
 * accessible badge grid further down (kept for screen readers + keyboard). */

interface CatalogEntry {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  earned: boolean;
  earned_at: string | null;
  progress: { current: number; target: number } | null;
}

interface profilePayload {
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  catalog: CatalogEntry[];
}

function earnedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Coin {
  entry: CatalogEntry;
  angle: number;      // orbit angle
  radius: number;     // orbit radius in world units
  y: number;          // row height
  lift: number;       // hover lift 0..1
}

const BADGE_SHELF_COLORS = ['99,102,241', '16,185,129', '245,158,11'];

/** Floating 3D badge shelf — 30fps, hover + click, reduced-motion aware. */
const BadgeShelf: React.FC<{
  catalog: CatalogEntry[];
  onPick: (entry: CatalogEntry) => void;
}> = ({ catalog, onPick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<CatalogEntry | null>(null);
  const coinsRef = useRef<Coin[]>([]);
  const reduce = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    coinsRef.current = catalog.map((entry, i) => ({
      entry,
      angle: (i / Math.max(1, catalog.length)) * Math.PI * 2,
      radius: 3.2,
      y: i % 2 === 0 ? -0.4 : 0.4,
      lift: 0,
    }));
  }, [catalog]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || catalog.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const tok = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
    const primaryRgb = tok('--c-primary', '99,102,241');
    const surfaceRgb = tok('--c-surface', '23,23,35');
    const borderRgb = tok('--c-border', '60,60,80');

    let raf = 0;
    let last = 0;
    let spin = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const project = (x: number, y: number, z: number) => {
      const camZ = 9;
      const scale = Math.min(w, 900) / 7;
      const f = camZ / (camZ + z);
      return {
        x: w / 2 + x * scale * f,
        y: h / 2 + y * scale * f + h * 0.08,
        f,
      };
    };

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      if (ts - last < 33) return; // 30fps cap
      last = ts;
      if (!reduce) spin += 0.004;

      ctx.clearRect(0, 0, w, h);
      const coins = coinsRef.current;

      const placed = coins.map((coin) => {
        const a = coin.angle + spin;
        const x = Math.cos(a) * coin.radius;
        const z = Math.sin(a) * coin.radius;
        const p = project(x, coin.y + coin.lift * -0.5, z);
        return { coin, p, z };
      });
      placed.sort((a, b) => b.z - a.z); // painter's algorithm

      for (const { coin, p, z } of placed) {
        const depthScale = Math.max(0.45, p.f);
        const rx = 34 * depthScale;
        const ry = 11 * depthScale;
        const cx = p.x;
        const cy = p.y;
        const earned = coin.entry.earned;
        const tint = BADGE_SHELF_COLORS[coin.entry.name.length % BADGE_SHELF_COLORS.length];

        // coin rim
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = earned ? `rgba(${tint}, 0.28)` : `rgba(${borderRgb}, 0.30)`;
        ctx.fill();
        ctx.lineWidth = earned ? 2 : 1;
        ctx.strokeStyle = earned ? `rgba(${primaryRgb}, 0.85)` : `rgba(${borderRgb}, 0.8)`;
        ctx.stroke();

        // face (offset up = thickness illusion)
        ctx.beginPath();
        ctx.ellipse(cx, cy - 9 * depthScale, rx * 0.92, ry * 0.92, 0, 0, Math.PI * 2);
        ctx.fillStyle = earned ? `rgba(${surfaceRgb}, 0.95)` : `rgba(${surfaceRgb}, 0.45)`;
        ctx.fill();
        ctx.strokeStyle = earned ? `rgba(${tint}, 0.9)` : `rgba(${borderRgb}, 0.6)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // emissive glow for earned badges
        if (earned) {
          ctx.beginPath();
          ctx.ellipse(cx, cy - 9 * depthScale, rx * 1.15, ry * 1.3, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${tint}, ${0.10 + 0.05 * Math.sin(ts / 500 + coin.angle * 3)})`;
          ctx.fill();
        }

        // emoji texture
        if (coin.entry.icon) {
          ctx.font = `${Math.round(26 * depthScale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = earned ? 1 : 0.3;
          ctx.fillText(coin.entry.icon, cx, cy - 9 * depthScale);
          ctx.globalAlpha = 1;
        }
      }
    };
    raf = requestAnimationFrame(draw);

    const hitTest = (e: MouseEvent): CatalogEntry | null => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let best: CatalogEntry | null = null;
      let bestDist = Infinity;
      for (const coin of coinsRef.current) {
        const a = coin.angle + spin;
        const p = project(Math.cos(a) * coin.radius, coin.y + coin.lift * -0.5, Math.sin(a) * coin.radius);
        const d = Math.hypot(mx - p.x, my - (p.y - 9));
        if (d < 42 * Math.max(0.45, p.f) && d < bestDist) {
          bestDist = d;
          best = coin.entry;
        }
      }
      return best;
    };

    const onMove = (e: MouseEvent) => {
      const hit = hitTest(e);
      setHovered(hit);
      for (const coin of coinsRef.current) {
        const target = hit && hit.id === coin.entry.id ? 1 : 0;
        coin.lift += (target - coin.lift) * 0.2;
      }
    };
    const onClick = (e: MouseEvent) => {
      const hit = hitTest(e);
      if (hit) onPick(hit);
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
    };
  }, [catalog, reduce, onPick]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-[300px] w-full cursor-pointer rounded-2xl border border-border bg-surface/40"
      />
      <div className="mt-3 flex min-h-[2.5rem] items-center justify-center">
        {hovered ? (
          <p className="text-sm font-bold text-content">
            <span aria-hidden>{hovered.icon}</span> {hovered.name}
            <span className="ml-2 font-semibold text-muted">+{hovered.xp_reward} XP · {hovered.earned ? 'unlocked' : 'locked'}</span>
          </p>
        ) : (
          <p className="text-xs font-semibold text-muted">Hover a badge · click one for details</p>
        )}
      </div>
    </div>
  );
};

export default function Achievements() {
  const [profile, setProfile] = useState<profilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.get('/gamification/profile');
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load achievements', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onPick = useCallback((entry: CatalogEntry) => setSelected(entry), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-12 w-72" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (failed || !profile) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <EmptyState
            icon={<span className="text-2xl">⚠️</span>}
            title="Couldn't load your achievements"
            description="The backend didn't respond. Check your connection and try again."
            action={<Button variant="primary" onClick={fetchData}>Retry</Button>}
          />
        </div>
      </div>
    );
  }

  const catalog = profile.catalog;
  const earned = catalog.filter((c) => c.earned);
  const locked = catalog.filter((c) => !c.earned);
  const earnedXp = earned.reduce((s, c) => s + (c.xp_reward || 0), 0);

  const stats = [
    { label: 'XP earned', value: String(profile.xp), sub: `Level ${profile.level}` },
    { label: 'Badges', value: `${earned.length} / ${catalog.length}`, sub: `${earnedXp} bonus XP` },
    { label: 'Current streak', value: `🔥 ${profile.current_streak}`, sub: `best ${profile.longest_streak}` },
  ];

  return (
    <div className="min-h-screen bg-bg" id="main">
      <AppNav />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* page head */}
        <div>
          <Link to="/dashboard" className="text-sm font-bold text-primary hover:underline">← Dashboard</Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-content">Achievements</h1>
          <p className="mt-1 font-medium text-muted">
            Milestones from your labs — each badge grants bonus XP on top of lab points.
          </p>
        </div>

        {/* 3D badge shelf (decorative — accessible grid below) */}
        <BlurFade>
          <BadgeShelf catalog={catalog} onPick={onPick} />
        </BlurFade>

        {/* stat strip */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((c) => (
            <Card key={c.label} className="flex flex-col justify-between p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-muted">{c.label}</p>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-display text-3xl font-bold text-primary">{c.value}</span>
                <span className="text-sm font-semibold text-muted">{c.sub}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* earned (accessible grid) */}
        <section aria-label="Earned achievements">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-content">Earned</h2>
            <Badge variant="success" dot>{earned.length} unlocked</Badge>
          </div>
          {earned.length === 0 ? (
            <Card className="mt-4 p-6">
              <EmptyState
                icon={<span className="text-2xl">🎯</span>}
                title="No badges yet — your first one is one lab away"
                description="Pass any lab to unlock First Deploy. Speed runs and perfect first attempts unlock more."
                action={<Link to="/dashboard#tracks"><Button variant="primary">Find your next lab</Button></Link>}
              />
            </Card>
          ) : (
            <div role="list" className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {earned.map((c) => (
                <Card key={c.id} role="listitem" className="relative overflow-hidden p-6" interactive
                      onClick={() => setSelected(c)}>
                  <div className="flex items-start gap-4">
                    <span className="text-4xl" role="img" aria-label={c.name}>{c.icon}</span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-content">{c.name}</h3>
                      <p className="mt-1 text-sm font-medium text-muted">{c.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      {c.earned_at ? `Earned ${earnedDate(c.earned_at)}` : 'Earned'}
                    </span>
                    <Badge variant="accent">+{c.xp_reward} XP</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* locked */}
        {locked.length > 0 && (
          <section aria-label="Locked achievements">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-content">Locked</h2>
              <span className="text-sm font-semibold text-muted">
                {locked.length} remaining
              </span>
            </div>
            <div role="list" className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {locked.map((c) => {
                const pct = c.progress && c.progress.target > 0
                  ? Math.min(100, Math.round((c.progress.current / c.progress.target) * 100))
                  : 0;
                return (
                  <Card key={c.id} role="listitem" className="p-6 opacity-90">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl grayscale" role="img" aria-label={`${c.name} (locked)`}>{c.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-bold text-content">{c.name}</h3>
                        <p className="mt-1 text-sm font-medium text-muted">{c.description}</p>
                      </div>
                    </div>
                    {c.progress && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold">
                          <span className="uppercase tracking-wider text-muted">Progress</span>
                          <span className="tabular-nums text-content">
                            {c.progress.current} / {c.progress.target}
                          </span>
                        </div>
                        <ProgressBar value={pct} label={`${c.name} progress`} />
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <Badge variant="default">🔒 Locked</Badge>
                      <span className="text-xs font-bold text-muted">+{c.xp_reward} XP on unlock</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* badge detail modal */}
      <Modal open={selected !== null} onClose={() => setSelected(null)}
             title={selected ? `${selected.icon ?? '🏅'} ${selected.name}` : ''} className="max-w-md">
        {selected && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted">{selected.description}</p>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm">
              <span className="font-bold text-content">XP reward</span>
              <Badge variant="accent">+{selected.xp_reward} XP</Badge>
            </div>
            {selected.earned && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm">
                <span className="font-bold text-content">Unlocked</span>
                <span className="font-semibold text-muted">
                  {selected.earned_at ? earnedDate(selected.earned_at) : 'yes'}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
