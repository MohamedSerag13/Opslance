import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** 404 — broken links land here instead of silently bouncing to /. */
export default function NotFound() {
  const { token } = useAuthStore();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-4 text-center">
      <div className="glow-orb left-1/2 top-1/3 h-72 w-[560px] -translate-x-1/2 bg-primary/20" aria-hidden="true" />
      <div className="relative">
        <p className="font-mono text-sm font-bold text-accent" aria-hidden="true">$ kubectl get page not-found</p>
        <h1 className="mt-4 font-display text-display-lg font-bold text-content">
          Error from server (NotFound)
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-muted">
          This page doesn't exist — the route 404'd. Use the links below to get
          back to somewhere real.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={token ? '/dashboard' : '/'}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-glow-primary transition hover:bg-primary-strong"
          >
            {token ? 'Back to dashboard' : 'Back to home'}
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-content transition hover:border-primary/50"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
