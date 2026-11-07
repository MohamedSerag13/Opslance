import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button, ThemeToggle, Logo } from '../../components/ui';
import { AnimatedGradientText, BlurFade, Marquee, ShineBorder } from '../../components/fx';
import Cluster3D from './Cluster3D';
import { Reveal, SectionHead } from './Reveal';
import { Paths, ExamShowcase } from './Paths';
import { Pricing, FAQ } from './Pricing';
import { LandingFooter } from './Footer';

/* The terminal is below the fold on small screens and pulls in xterm —
 * load it as its own chunk after first paint. */
const TerminalDemo = lazy(() => import('./TerminalDemo'));

const LandingNav: React.FC = () => {
  const { token } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#how', label: 'How it works' },
    { href: '#paths', label: 'Learning paths' },
    { href: '#exam', label: 'Exam simulator' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || menuOpen ? 'glass border-b border-border' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Opslance home"><Logo /></Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-content">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {token ? (
            <Link to="/dashboard"><Button size="sm">Open dashboard</Button></Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/login"><Button variant="accent" size="sm">Get started</Button></Link>
            </>
          )}
          {/* mobile: the lg nav is hidden below 1024px — section links live here */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-content lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav aria-label="Mobile" className="border-t border-border bg-surface/95 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-content transition-colors hover:bg-surface-2"
              >
                {l.label}
              </a>
            ))}
            {!token && (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary sm:hidden">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

const Hero: React.FC = () => (
  <section className="relative overflow-hidden pb-20 pt-32 sm:pt-36">
    <div className="grid-bg absolute inset-0" aria-hidden="true" />
    <div className="glow-orb left-1/2 top-[-220px] h-[480px] w-[720px] -translate-x-1/2 bg-primary/25" aria-hidden="true" />
    <div className="glow-orb right-[-160px] top-[220px] h-[380px] w-[380px] bg-accent/15" aria-hidden="true" />

    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <BlurFade>
            <AnimatedGradientText>
              <span className="mr-2 inline-flex items-center gap-2 text-muted">
                <span className="h-2 w-2 animate-pulse-glow rounded-full bg-success" aria-hidden="true" />
              </span>
              Real clusters. Real exams. No multiple choice.
            </AnimatedGradientText>
          </BlurFade>
          <BlurFade delay={0.08}>
            <h1 className="mt-6 font-display text-display-lg font-bold text-content">
              Master DevOps by <span className="text-gradient">doing it for real.</span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.16}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Spin up your own isolated Linux and Kubernetes lab in seconds, work through
              CKA-style tasks in a live terminal, and get graded on the actual state of
              your cluster — exactly like the certification exam.
            </p>
          </BlurFade>
          <BlurFade delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/login"><Button variant="accent" size="lg">Start learning free →</Button></Link>
              <a href="#exam"><Button variant="secondary" size="lg">See the exam simulator</Button></a>
            </div>
          </BlurFade>
          <BlurFade delay={0.32}>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ['72', 'hands-on labs'],
                ['15', 'Linux modules'],
                ['8', 'CKA mock weeks'],
                ['100%', 'live-state graded'],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-3xl font-bold text-content">{n}</dd>
                  <dd className="text-sm text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </BlurFade>
        </div>

        <BlurFade delay={0.2} className="relative">
          {/* ambient 3D cluster: centers on the visible band above the terminal,
              keeps spinning behind it for depth — non-interactive backdrop */}
          <Cluster3D
            interactive={false}
            className="pointer-events-none absolute -top-[200px] right-0 z-0 hidden h-[300px] w-[420px] opacity-60 xl:block"
          />
          <div className="relative z-10 rounded-2xl">
            <ShineBorder duration={9} className="rounded-2xl" />
            <Suspense fallback={<div className="h-[320px] rounded-2xl border border-border bg-surface animate-pulse" aria-hidden />}>
              <TerminalDemo />
            </Suspense>
          </div>
        </BlurFade>
      </div>
    </div>
  </section>
);

const TECH = [
  'Docker', 'Kubernetes', 'k3s', 'kubectl', 'Linux', 'Bash', 'systemd', 'Git',
  'Terraform', 'Ansible', 'Helm', 'Prometheus', 'Nginx', 'Vim', 'jq', 'curl',
];

const TechMarquee: React.FC = () => (
  <section aria-label="Technologies you will use" className="border-y border-border bg-surface/40 py-5">
    <Marquee
      repeat={2}
      duration="46s"
      pauseOnHover
      className="[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      {TECH.map((t, i) => (
        <span
          key={t}
          className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-1.5 font-mono text-xs text-muted"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${['bg-primary/70', 'bg-accent/70', 'bg-success/70'][i % 3]}`}
            aria-hidden="true"
          />
          {t}
        </span>
      ))}
    </Marquee>
  </section>
);

const StatsStrip: React.FC = () => (
  <section aria-label="Platform facts" className="border-y border-border bg-surface/40">
    <div className="mx-auto grid max-w-7xl grid-cols-2 divide-border px-4 py-10 sm:px-6 md:grid-cols-4 md:divide-x lg:px-8">
      {[
        ['⚡', 'Environments in seconds', 'Your own compose stack per lab — isolated network, one student per namespace'],
        ['🧪', 'Graded on live state', 'Checks inspect files, processes and real Kubernetes objects — not screenshots'],
        ['🎯', 'CKA-style experience', '66% pass mark, timer, question navigator, flag-for-review — like the real thing'],
        ['📈', 'Progress that sticks', 'XP, streaks, achievements and leaderboards keep cohorts coming back'],
      ].map(([icon, title, body]) => (
        <div key={title} className="px-6 py-4 text-center md:text-left">
          <div className="mb-2 text-2xl" aria-hidden="true">{icon}</div>
          <h3 className="font-display text-sm font-bold text-content">{title}</h3>
          <p className="mt-1 text-sm text-muted">{body}</p>
        </div>
      ))}
    </div>
  </section>
);

const HowItWorks: React.FC = () => (
  <section id="how" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
    <SectionHead
      center
      eyebrow="How it works"
      title={<>From signup to a passing score in <span className="text-gradient">three steps</span></>}
    />
    <div className="mt-14 grid gap-6 md:grid-cols-3">
      {[
        {
          n: '01',
          title: 'Pick a lab from your path',
          body: 'Follow a structured track — Linux fundamentals through Kubernetes troubleshooting — or jump straight to a CKA mock week. Admins assign labs per group.',
          art: (
            <div className="flex gap-2" aria-hidden="true">
              {['01', '02', '03', '04'].map((m, i) => (
                <span key={m} className={`flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-xs ${i === 0 ? 'border-accent/50 bg-accent/15 text-accent-soft' : 'border-border bg-surface-2 text-muted'}`}>{m}</span>
              ))}
            </div>
          ),
        },
        {
          n: '02',
          title: 'Your environment spawns instantly',
          body: 'A dedicated Docker environment boots for you alone — isolated network, fresh state, real tools. For CKA labs you get your own k3s control plane with kubectl preinstalled.',
          art: (
            <div className="rounded-xl border border-border bg-[#0B1120] px-4 py-3 font-mono text-xs text-success" aria-hidden="true">
              $ starting lab environment…<br />
              ✓ container ready · terminal connected
            </div>
          ),
        },
        {
          n: '03',
          title: 'Solve, check, get graded',
          body: 'Type real commands in the browser terminal. Run checks anytime: every task is verified against the live state of your machine or cluster, with per-task scoring and explanations.',
          art: (
            <div className="font-mono text-xs" aria-hidden="true">
              <p className="text-success">✅ PASS [35%]: user service is running</p>
              <p className="text-success">✅ PASS [35%]: /etc/cron.d exists</p>
              <p className="text-danger">❌ FAIL [30%]: log rotation not configured</p>
              <p className="mt-1 text-muted">SCORE: 70/100</p>
            </div>
          ),
        },
      ].map((s, i) => (
        <Reveal key={s.n} delay={i * 0.08}>
          <div className="relative h-full rounded-2xl border border-border bg-surface p-7 shadow-card">
            <span className="absolute right-6 top-5 font-display text-4xl font-bold text-border" aria-hidden="true">{s.n}</span>
            {s.art}
            <h3 className="mt-5 font-display text-lg font-bold text-content">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

const Features: React.FC = () => (
  <section className="relative border-y border-border bg-surface/40 py-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHead
        center
        eyebrow="Everything included"
        title={<>A lab platform built like a <span className="text-gradient">product</span></>}
        sub="Not a bash sandbox glued to a checklist — a complete training environment for students and the admins who run cohorts."
      />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['🖥️', 'Browser terminal', 'A full PTY over WebSocket — xterm.js in the browser, connected straight to your container. Nothing to install.'],
          ['🔐', 'Isolated per student', 'Unique compose project and network per session. Students can never see or break each other\'s environments.'],
          ['⏱️', 'Idle-aware sessions', 'Sessions heartbeat, auto-stop when idle, and hand back resources — safe to run for a whole cohort at once.'],
          ['💡', 'Three-level hints', 'Stuck? Hints escalate in stages and use them in the scoring — just like losing points for help on the real exam.'],
          ['🏆', 'XP, streaks & badges', 'Points, levels, daily challenges and achievements. Leaderboards per group and platform-wide.'],
          ['🛠️', 'Admin control room', 'Groups, per-group lab visibility and ordering, bulk student import, live environment overview, plan management.'],
        ].map(([icon, title, body], i) => (
          <Reveal key={title} delay={(i % 3) * 0.07}>
            <div className="group h-full rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-glow-primary">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-xl" aria-hidden="true">{icon}</div>
              <h3 className="font-display text-base font-bold text-content">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const FinalCTA: React.FC = () => {
  const { token } = useAuthStore();
  return (
    <section className="relative overflow-hidden py-24">
      <div className="glow-orb left-1/2 top-1/2 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/2 bg-primary/20" aria-hidden="true" />
      <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-display-md font-bold text-content">
          The fastest way to learn DevOps is to <span className="text-gradient">do DevOps.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Create an account, pick your first lab, and be typing kubectl commands against a
          real cluster in under a minute.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          {!token && <Link to="/login"><Button variant="accent" size="lg">Create your account →</Button></Link>}
          {token && <Link to="/dashboard"><Button variant="accent" size="lg">Open dashboard →</Button></Link>}
          <a href="#paths"><Button variant="secondary" size="lg">Browse the paths</Button></a>
        </div>
      </Reveal>
    </section>
  );
};

const Landing: React.FC = () => (
  <div className="bg-bg text-content">
    <LandingNav />
    <main>
      <Hero />
      <TechMarquee />
      <StatsStrip />
      <HowItWorks />
      <Paths />
      <ExamShowcase />
      <Features />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </main>
    <LandingFooter />
  </div>
);

export default Landing;
