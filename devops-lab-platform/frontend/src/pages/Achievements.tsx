import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import AppNav from '../components/layout/AppNav';
import { Card, Badge, Button, Skeleton, EmptyState, ProgressBar } from '../components/ui';

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

export default function Achievements() {
  const [profile, setProfile] = useState<profilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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

        {/* earned */}
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
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {earned.map((c) => (
                <Card key={c.id} className="relative overflow-hidden p-6" interactive>
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
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {locked.map((c) => {
                const pct = c.progress && c.progress.target > 0
                  ? Math.min(100, Math.round((c.progress.current / c.progress.target) * 100))
                  : 0;
                return (
                  <Card key={c.id} className="p-6 opacity-90">
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
    </div>
  );
}
