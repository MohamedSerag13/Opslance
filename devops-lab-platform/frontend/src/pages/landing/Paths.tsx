import React from 'react';
import { Reveal, SectionHead } from './Reveal';
import { Badge, ProgressRing } from '../../components/ui';
import ExamDemo from './ExamDemo';

/** Learning-path cards. Lab counts come from the real catalog:
 *  15 Linux modules (64 labs) + 8 CKA-style weeks (8 mock exams). */
export const Paths: React.FC = () => (
  <section id="paths" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
    <SectionHead
      eyebrow="Learning paths"
      title={<>Structured tracks, from <span className="text-gradient">first shell prompt</span> to certified</>}
      sub="Each path is a sequence of graded labs with lockable ordering, per-group visibility and progress tracking built in."
    />
    <div className="mt-14 grid gap-6 lg:grid-cols-3">
      <Reveal>
        <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-card">
          <div className="glow-orb -right-20 -top-20 h-48 w-48 bg-primary/20" aria-hidden="true" />
          <div className="relative">
            <Badge variant="primary" dot>15 modules · 64 labs</Badge>
            <h3 className="mt-4 font-display text-xl font-bold text-content">Linux Foundations → Power User</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Filesystem to systemd, permissions to networking, bash scripting to incident
              debugging. Every task verified on a real machine you own for the session.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted">
              <li>▸ Navigation, permissions, text processing</li>
              <li>▸ Users, services, cron, journald</li>
              <li>▸ Debugging labs with real broken systems</li>
            </ul>
            <div className="mt-6"><ProgressRing value={0} label="Not started"><span className="text-muted">GO</span></ProgressRing></div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="relative h-full overflow-hidden rounded-2xl border border-accent/40 bg-surface p-7 shadow-glow-accent">
          <div className="glow-orb -right-20 -top-20 h-48 w-48 bg-accent/25" aria-hidden="true" />
          <div className="relative">
            <Badge variant="accent" dot>8 weeks · k3s clusters</Badge>
            <h3 className="mt-4 font-display text-xl font-bold text-content">CKA Exam Track</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Week-by-week CKA domains ending in a full mock exam: cluster architecture,
              workloads &amp; scheduling, services, storage, security, troubleshooting.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted">
              <li>▸ Own k3s control plane per lab session</li>
              <li>▸ 40-task speed drills, 66% pass mark</li>
              <li>▸ etcd, RBAC, networking, Helm &amp; Kustomize</li>
            </ul>
            <div className="mt-6"><ProgressRing value={0} label="Not started"><span className="text-muted">GO</span></ProgressRing></div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.16}>
        <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-card">
          <div className="glow-orb -right-20 -top-20 h-48 w-48 bg-success/15" aria-hidden="true" />
          <div className="relative">
            <Badge variant="success" dot>For cohorts</Badge>
            <h3 className="mt-4 font-display text-xl font-bold text-content">Team &amp; Classroom Tracks</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Admins publish labs to groups in a chosen unlock order, watch progress from a
              live dashboard and keep everyone moving with leaderboards and streaks.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted">
              <li>▸ Per-group visibility &amp; unlock ordering</li>
              <li>▸ Bulk student import with forced password reset</li>
              <li>▸ Live view of every running lab environment</li>
            </ul>
            <div className="mt-6"><ProgressRing value={0} label="Not started"><span className="text-muted">GO</span></ProgressRing></div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/** Static, in-design-system preview of the question-by-question exam runner. */
export const ExamShowcase: React.FC = () => (
  <section id="exam" className="relative border-y border-border bg-surface/40 py-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHead
        center
        eyebrow="Exam simulator"
        title={<>One task at a time, <span className="text-gradient">just like the PSI exam</span></>}
        sub="The lab runner mirrors the real CKA testing experience — a focused task panel, a live terminal, a timer you can see, and a navigator for every question."
      />

      <Reveal className="mt-14">
        <ExamDemo />
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          ['🧭', 'Question navigator', 'Grid of numbered tasks — answered, flagged, verified at a glance.'],
          ['⏳', 'Exam & practice modes', 'Countdown + final report in exam mode; hints and unlimited checks in practice.'],
          ['📊', 'Domain scoring', 'Results broken down by CKA curriculum domain with retry-failed-only drills.'],
        ].map(([icon, t, b], i) => (
          <Reveal key={t} delay={i * 0.07}>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <span className="text-xl" aria-hidden="true">{icon}</span>
              <h4 className="mt-2 font-display text-sm font-bold text-content">{t}</h4>
              <p className="mt-1 text-sm text-muted">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
