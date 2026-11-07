import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useSearchParams } from 'react-router-dom';

export default function Billing() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/billing/status');
      setStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch billing status", err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check query params for Stripe checkout results
    if (searchParams.get('success') === 'true') {
      setAlert({
        type: 'success',
        message: '🎉 Congratulations! Your upgrade to Pro was successful. Enjoy full lab access!',
      });
    } else if (searchParams.get('canceled') === 'true') {
      setAlert({
        type: 'error',
        message: '⚠️ Stripe checkout was canceled. Feel free to upgrade whenever you are ready.',
      });
    }
  }, [searchParams]);

  const handleUpgrade = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await api.post('/billing/create-checkout-session');
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to start Stripe checkout session.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-content tracking-tight">SaaS Billing & Subscriptions</h1>
        <p className="text-lg text-muted mt-3 max-w-2xl mx-auto">
          Manage your subscription tier, view invoices, or upgrade to Pro to unlock advanced modules.
        </p>
      </div>

      {alert && (
        <div
          className={`mb-8 p-4 rounded-xl shadow-sm border ${
            alert.type === 'success'
              ? 'bg-success/10 border-success/40 text-success'
              : 'bg-danger/10 border-danger/40 text-danger'
          }`}
        >
          <div className="flex items-center gap-3 font-semibold">
            <span>{alert.type === 'success' ? '🚀' : '⚠️'}</span>
            <p>{alert.message}</p>
          </div>
        </div>
      )}

      {/* Pricing Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Free Tier */}
        <div className="bg-surface rounded-3xl border border-border p-8 shadow-sm flex flex-col justify-between transition hover:shadow-md">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-content">Free Plan</h2>
              {status?.tier === 'free' && (
                <span className="bg-primary/15 text-primary-strong text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Current Tier
                </span>
              )}
            </div>
            <p className="text-5xl font-black text-content mb-6">$0<span className="text-lg text-muted font-normal"> / month</span></p>
            <p className="text-muted mb-8 font-medium">Perfect for starters looking to learn the basic CLI utilities.</p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-sm text-content">
                <span className="text-success font-bold">✓</span>
                <span>Access to <strong>Module 01 (Linux Fundamentals)</strong> only</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-content">
                <span className="text-success font-bold">✓</span>
                <span>Max <strong>1 concurrent lab</strong> session</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-content">
                <span className="text-success font-bold">✓</span>
                <span>Auto-stop containers after <strong>30 minutes</strong></span>
              </li>
            </ul>
          </div>

          <button
            disabled
            className="w-full py-4 px-6 rounded-2xl font-bold bg-surface-2 text-muted cursor-not-allowed text-center transition"
          >
            Included in Signup
          </button>
        </div>

        {/* Pro Tier */}
        <div className="bg-slate-900 rounded-3xl border border-primary/40 p-8 shadow-lg flex flex-col justify-between relative transition hover:shadow-xl">
          <div className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2 bg-primary text-white font-extrabold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow">
            RECOMMENDED
          </div>
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Pro Plan</h2>
              {status?.tier === 'pro' && (
                <span className="bg-success/15 text-success text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Active
                </span>
              )}
            </div>
            <p className="text-5xl font-black text-white mb-6">$19<span className="text-lg text-muted font-normal"> / month</span></p>
            <p className="text-slate-300 mb-8 font-medium">Complete access for serious systems engineering students.</p>
            
            <ul className="space-y-4 mb-8 text-slate-200">
              <li className="flex items-start gap-3 text-sm">
                <span className="text-indigo-400 font-bold">✓</span>
                <span><strong>Full Access</strong> to all modules & labs (Docker, Terraform, etc.)</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-indigo-400 font-bold">✓</span>
                <span>Max <strong>3 concurrent active labs</strong> simultaneously</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-indigo-400 font-bold">✓</span>
                <span>Labs auto-stop after <strong>2 hours</strong> (120 mins)</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="text-indigo-400 font-bold">✓</span>
                <span><strong>Extend Session (+30 min)</strong> button in Terminal UI</span>
              </li>
            </ul>
          </div>

          {status?.tier === 'pro' ? (
            status?.portal_url ? (
              <a
                href={status.portal_url}
                className="w-full py-4 px-6 rounded-2xl font-bold bg-primary hover:bg-primary text-white text-center transition shadow-md hover:shadow-lg"
              >
                Manage Subscription Portal
              </a>
            ) : (
              <button
                disabled
                className="w-full py-4 px-6 rounded-2xl font-bold bg-primary text-white opacity-80 cursor-not-allowed text-center transition"
              >
                Subscription Active (Portal Loading)
              </button>
            )
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl font-bold bg-primary hover:bg-primary text-white text-center transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Loading checkout...</span>
              ) : (
                <>
                  <span>Upgrade to Pro Now</span>
                  <span className="text-lg">⚡</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Subscription Details Portal Box */}
      {status?.tier === 'pro' && (
        <div className="bg-primary/10 border border-primary/30 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-bold text-content">Subscription Status</h3>
            <div className="mt-2 space-y-1.5 text-sm text-muted font-medium">
              <p>Plan Name: <strong className="text-primary-strong">{status?.plan}</strong></p>
              <p>Next Renewal Date: <strong className="text-primary-strong">{status?.next_billing_date}</strong></p>
              <p>Billing Status: <strong className="text-primary-strong">{status?.cancellation_status}</strong></p>
            </div>
          </div>
          {status?.portal_url && (
            <a
              href={status.portal_url}
              className="px-8 py-3 rounded-2xl border border-primary/40 text-primary-strong font-bold bg-surface hover:bg-primary/15 transition shadow-sm"
            >
              Billing Portal & Invoices
            </a>
          )}
        </div>
      )}
    </div>
  );
}
