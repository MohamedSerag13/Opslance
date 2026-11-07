import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, SectionHead } from './Reveal';
import { Badge, Button } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';

/** Pricing mirrors the platform's real tier gating (subscription_tier):
 *  free = module 01 labs + 1 active session; pro = full catalog + 3 sessions +
 *  session extensions; enterprise = cohorts, groups, admin tooling. No invented
 *  prices — shown as plan cards. */
export const Pricing: React.FC = () => {
  const { token } = useAuthStore();
  const cta = (label: string, to = '/login') => (
    <Link to={to}><Button fullWidth variant="secondary">{label}</Button></Link>
  );

  return (
    <section id="pricing" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHead
        center
        eyebrow="Pricing"
        title={<>Start free. <span className="text-gradient">Upgrade when you're hooked.</span></>}
        sub="Every plan runs the same real environments and live-state grading — higher tiers unlock the full catalog and cohort tooling."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        <Reveal>
          <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-7 shadow-card">
            <Badge>Free</Badge>
            <p className="mt-4 font-display text-3xl font-bold text-content">$0</p>
            <p className="mt-1 text-sm text-muted">For trying real labs</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-muted">
              <li>✓ Module 01 Linux labs — full grading</li>
              <li>✓ 1 active lab environment</li>
              <li>✓ Browser terminal + progress tracking</li>
              <li>✓ XP, streaks &amp; leaderboard</li>
            </ul>
            <div className="mt-7">{cta(token ? 'Open dashboard' : 'Start free', token ? '/dashboard' : '/login')}</div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="relative flex h-full flex-col rounded-2xl border border-accent/50 bg-surface p-7 shadow-glow-accent">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">Most popular</span>
            <Badge variant="accent" dot>Pro</Badge>
            <p className="mt-4 font-display text-3xl font-bold text-content">Pro</p>
            <p className="mt-1 text-sm text-muted">For serious exam prep</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-muted">
              <li>✓ All 72 labs — Linux + full CKA track</li>
              <li>✓ 3 concurrent lab environments</li>
              <li>✓ Session extensions &amp; priority features</li>
              <li>✓ Full CKA mock exams with domain reports</li>
            </ul>
            <div className="mt-7">
              <Link to={token ? '/billing' : '/login'}><Button fullWidth variant="accent">{token ? 'Manage plan' : 'Go Pro'}</Button></Link>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-7 shadow-card">
            <Badge variant="primary">Enterprise</Badge>
            <p className="mt-4 font-display text-3xl font-bold text-content">Enterprise</p>
            <p className="mt-1 text-sm text-muted">For teams, bootcamps &amp; classrooms</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-muted">
              <li>✓ Everything in Pro for every learner</li>
              <li>✓ Groups, per-group lab ordering &amp; visibility</li>
              <li>✓ Bulk student onboarding with auto emails</li>
              <li>✓ Live environment monitoring &amp; admin analytics</li>
            </ul>
            <div className="mt-7">{cta('Contact us', '/login')}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Do I need to install anything?',
    a: 'No. Labs run in your browser: a full terminal (xterm.js over WebSocket) is connected to your own isolated Docker environment on the server. A modern browser and an internet connection are enough.',
  },
  {
    q: 'How is my work graded?',
    a: 'Every lab ships shell-based checks that run inside your environment and inspect the live state — files, services, and for Kubernetes labs, real objects queried with kubectl and jq. Nothing is screenshot- or multiple-choice-based.',
  },
  {
    q: 'Are the CKA labs close to the real exam?',
    a: 'The CKA track mirrors the exam experience: one task at a time, a context banner telling you which cluster to use, a timer, flag-for-review, a question navigator, and a 66% pass mark — the same threshold as the CNCF CKA exam.',
  },
  {
    q: 'What is my own environment like?',
    a: 'Each session gets a dedicated compose project with an isolated network. CKA labs boot your own k3s control plane. Sessions heartbeat, auto-stop when idle, and can be extended or reset at any time.',
  },
  {
    q: 'Can admins manage a whole cohort?',
    a: 'Yes — groups with per-group lab visibility and unlock ordering, bulk student creation with forced first-login password resets, live environment monitoring, plan management, and platform/group leaderboards.',
  },
];

export const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHead center eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12 space-y-3">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 0.04}>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                  >
                    <span className="font-semibold text-content">{item.q}</span>
                    <span
                      aria-hidden="true"
                      className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    </span>
                  </button>
                  <div id={`faq-${i}`} role="region" className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
