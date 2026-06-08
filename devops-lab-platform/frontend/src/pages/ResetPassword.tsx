import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { mustResetPassword, setMustResetPassword, setUser, token } = useAuthStore();
  const navigate = useNavigate();

  // Guard: if the user landed here without the flag set, send them away
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    if (!mustResetPassword) {
      navigate('/', { replace: true });
    }
  }, [mustResetPassword, token, navigate]);

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
      navigate('/', { replace: true });
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
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Lock icon */}
        <div style={styles.iconWrap}>
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 style={styles.heading}>Set Your Password</h1>
        <p style={styles.subheading}>
          This is your first login. Please create a secure password before continuing.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* New Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="new-password">New Password</label>
            <div style={styles.inputWrap}>
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={styles.input}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div style={styles.strengthBar}>
                <div style={{ ...styles.strengthFill, ...getStrengthStyle(newPassword) }} />
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="confirm-password">Confirm Password</label>
            <div style={styles.inputWrap}>
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                style={{
                  ...styles.input,
                  borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : undefined,
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            id="reset-password-submit"
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>

        <p style={styles.hint}>
          You will only need to do this once. All future logins will use your new password.
        </p>
      </div>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────── */

function getStrengthStyle(pw: string): React.CSSProperties {
  const len = pw.length;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const score = [len >= 8, hasUpper, hasNum, hasSymbol].filter(Boolean).length;

  if (score <= 1) return { width: '25%', background: '#ef4444' };
  if (score === 2) return { width: '50%', background: '#f97316' };
  if (score === 3) return { width: '75%', background: '#eab308' };
  return { width: '100%', background: '#22c55e' };
}

/* ── styles ──────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
    padding: '24px',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '40px 36px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    color: '#f1f5f9',
  },
  iconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    boxShadow: '0 0 24px rgba(99,102,241,0.4)',
  },
  icon: {
    width: '28px',
    height: '28px',
    color: '#ffffff',
  },
  heading: {
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 8px',
    color: '#f8fafc',
  },
  subheading: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 28px',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#cbd5e1',
    letterSpacing: '0.02em',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '11px 44px 11px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  strengthBar: {
    height: '4px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease, background 0.3s ease',
  },
  errorBox: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  submitBtn: {
    padding: '13px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
    marginTop: '4px',
  },
  hint: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 1.6,
  },
};
