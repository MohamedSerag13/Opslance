import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Logo, ThemeToggle } from '../components/ui';
import { BlurFade, ShineBorder } from '../components/fx';

const PERKS = [
  ['🧪', 'Graded on live state', 'Every task verified against your real machine or cluster — not multiple choice.'],
  ['🔐', 'Your own environment', 'An isolated Docker lab with a fresh k3s cluster, per session, in your browser.'],
  ['🎯', 'CKA-style exam drills', 'One task at a time, 66% pass mark, timer and navigator — like the real exam.'],
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setTokens, setUser, setMustResetPassword } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setTokens(res.data.access_token, res.data.refresh_token);

      // If the backend signals a required password reset, redirect immediately
      // before resolving the user profile so other routes can't be reached.
      if (res.data.must_reset_password) {
        setMustResetPassword(true);
        navigate('/reset-password', { replace: true });
        return;
      }

      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.access_token}` }
      });
      setUser(meRes.data);

      if (meRes.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(', '));
      } else {
        setError(detail || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-bg absolute inset-0" aria-hidden="true" />
        <div className="glow-orb -left-24 top-1/4 h-96 w-96 bg-primary/25" aria-hidden="true" />
        <div className="glow-orb -right-20 bottom-0 h-72 w-72 bg-accent/15" aria-hidden="true" />
        <Link to="/" className="relative w-fit" aria-label="Back to home"><Logo /></Link>
        <div className="relative">
          <h1 className="max-w-md font-display text-display-md font-bold text-content">
            Learn DevOps by <span className="text-gradient">doing it for real.</span>
          </h1>
          <ul className="mt-10 space-y-5">
            {PERKS.map(([icon, title, body]) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg" aria-hidden="true">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-content">{title}</p>
                  <p className="mt-0.5 text-sm text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative font-mono text-xs text-muted">
          <span className="text-success">✓</span> 72 labs · real k3s clusters · live-state grading
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="absolute left-4 top-4 lg:hidden"><Link to="/" aria-label="Back to home"><Logo /></Link></div>
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="w-full max-w-md">
          <BlurFade>
            <div className="relative rounded-3xl border border-border bg-surface/70 p-8 shadow-card backdrop-blur sm:p-10">
              <ShineBorder duration={13} className="rounded-3xl" />
              <h2 className="font-display text-3xl font-bold text-content">Welcome back</h2>
              <p className="mt-2 text-sm text-muted">Sign in to continue your labs.</p>

              <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
                {error && (
                  <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                )}
                <Input
                  label="Email address"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Password"
                  password
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" fullWidth size="lg" loading={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-muted">
                First time here? Your admin creates your account — sign in above.{' '}
                <Link to="/" className="font-semibold text-primary hover:underline">Back to home</Link>
              </p>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  );
}
