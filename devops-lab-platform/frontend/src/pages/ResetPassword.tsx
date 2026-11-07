import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, Input, Logo } from '../components/ui';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { mustResetPassword, setMustResetPassword, setUser, token } = useAuthStore();
  const navigate = useNavigate();

  // Guard: if the user landed here without the flag set, send them away
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    if (!mustResetPassword) {
      navigate('/dashboard', { replace: true });
    }
  }, [mustResetPassword, token, navigate]);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const strength = Math.min(4, (newPassword.length >= 8 ? 1 : 0) + (/[A-Z]/.test(newPassword) ? 1 : 0) + (/[0-9]/.test(newPassword) ? 1 : 0) + (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.put(
        '/auth/reset-password',
        { new_password: newPassword, confirm_password: confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Clear the flag and resolve the user profile, then go to dashboard
      setMustResetPassword(false);
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(meRes.data);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(', '));
      } else {
        setError(detail || 'Password reset failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" aria-label="Opslance home"><Logo /></Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-content">Set your password</h1>
          <p className="mt-2 text-sm text-muted">
            This is your first login. Create a secure password to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            {error && (
              <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            <Input
              label="New password"
              password
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint={newPassword.length > 0 ? 'Strength: ' + ['weak', 'weak', 'okay', 'good', 'strong'][strength] : undefined}
            />
            <Input
              label="Confirm password"
              password
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={mismatch ? 'Passwords do not match' : undefined}
            />
            <Button type="submit" fullWidth size="lg" loading={loading} disabled={mismatch}>
              {loading ? 'Saving…' : 'Save and continue'}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Passwords are hashed with bcrypt — nobody (including your admins) can read them.
        </p>
      </div>
    </div>
  );
}
