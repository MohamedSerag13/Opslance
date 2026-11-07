import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/ui';

export const LandingFooter: React.FC = () => (
  <footer className="border-t border-border bg-surface/40">
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Hands-on DevOps and Kubernetes training on real, isolated lab environments —
            built for self-paced learners, bootcamps and engineering teams.
          </p>
        </div>
        <nav aria-label="Product" className="text-sm">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-content">Product</h3>
          <ul className="mt-4 space-y-2.5 text-muted">
            <li><a className="transition-colors hover:text-content" href="#paths">Learning paths</a></li>
            <li><a className="transition-colors hover:text-content" href="#exam">Exam simulator</a></li>
            <li><a className="transition-colors hover:text-content" href="#pricing">Pricing</a></li>
            <li><a className="transition-colors hover:text-content" href="#faq">FAQ</a></li>
          </ul>
        </nav>
        <nav aria-label="Account" className="text-sm">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-content">Account</h3>
          <ul className="mt-4 space-y-2.5 text-muted">
            <li><Link className="transition-colors hover:text-content" to="/login">Sign in</Link></li>
            <li><Link className="transition-colors hover:text-content" to="/login">Create account</Link></li>
            <li><Link className="transition-colors hover:text-content" to="/dashboard">Dashboard</Link></li>
          </ul>
        </nav>
      </div>
      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted sm:flex-row">
        <p>© {new Date().getFullYear()} Opslance. All rights reserved.</p>
        <p className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          Self-hosted · real k3s clusters · live-state grading
        </p>
      </div>
    </div>
  </footer>
);
