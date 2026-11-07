import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, ProgressBar, ProgressRing,
  Skeleton, Tabs, ThemeToggle, ToastProvider, useToast, Tooltip,
} from '../components/ui';
import { AnimatedGradientText, BlurFade, Marquee, ShineBorder } from '../components/fx';

const TOKENS = [
  { name: 'bg', cls: 'bg-bg', hex: 'Background' },
  { name: 'surface', cls: 'bg-surface', hex: 'Cards' },
  { name: 'surface-2', cls: 'bg-surface-2', hex: 'Insets' },
  { name: 'primary', cls: 'bg-primary', hex: 'Indigo' },
  { name: 'accent', cls: 'bg-accent', hex: 'Orange' },
  { name: 'success', cls: 'bg-success', hex: 'Emerald' },
  { name: 'warn', cls: 'bg-warn', hex: 'Amber' },
  { name: 'danger', cls: 'bg-danger', hex: 'Rose' },
  { name: 'border', cls: 'bg-border', hex: 'Borders' },
  { name: 'muted', cls: 'bg-muted', hex: 'Secondary text' },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="font-display text-xl font-bold text-content">{title}</h2>
    {children}
  </section>
);

const Showcase: React.FC = () => {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState('practice');

  return (
    <div className="min-h-screen bg-bg">
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <h1 className="font-display text-lg font-bold text-content">Opslance Design System</h1>
          <span className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">← Dashboard</Link>
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Single source of truth for Opslance UI. Every color is a CSS custom property (themeable via
          <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-content">data-theme</code>),
          and every component below is built only from these tokens — no hardcoded hex values in app code.
        </p>

        <Section title="Color tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TOKENS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-surface p-3">
                <div className={`h-12 w-full rounded-xl border border-border ${t.cls}`} />
                <p className="mt-2 text-xs font-bold text-content">{t.name}</p>
                <p className="text-[11px] text-muted">{t.hex}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-2 rounded-2xl border border-border bg-surface p-6">
            <p className="font-display text-4xl font-bold text-content">Display / Space Grotesk</p>
            <p className="text-lg font-semibold text-content">Heading / Inter semibold</p>
            <p className="text-sm font-medium text-content">Body / Inter medium — the quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted">Muted / Inter — used for secondary copy and captions.</p>
            <p className="font-mono text-sm text-success">Monospace / JetBrains Mono — kubectl get pods -A</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-6">
            <Button variant="primary">Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-6">
            <Badge>Default</Badge>
            <Badge variant="primary" dot>Primary</Badge>
            <Badge variant="success" dot>Success</Badge>
            <Badge variant="accent" dot>Accent</Badge>
            <Badge variant="warn" dot>Warn</Badge>
            <Badge variant="danger" dot>Danger</Badge>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-md gap-4 rounded-2xl border border-border bg-surface p-6">
            <Input placeholder="you@team.dev" aria-label="Email input" />
            <Input type="password" defaultValue="hunter2" aria-label="Password input" />
            <Input disabled placeholder="Disabled input" />
          </div>
        </Section>

        <Section title="Cards & progress">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-6"><CardHeader title="Plain card" sub="bg-surface, border-border" /></Card>
            <Card glow className="p-6"><CardHeader title="Glow card" sub="primary halo" /></Card>
            <Card interactive className="p-6"><CardHeader title="Interactive" sub="hover lift" /></Card>
          </div>
          <div className="grid items-center gap-6 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-3">
            <div><ProgressBar value={62} label="bar" /><p className="mt-2 text-xs text-muted">ProgressBar 62%</p></div>
            <div className="flex justify-center"><ProgressRing value={75} label="ring"><span className="text-sm font-black">75%</span></ProgressRing></div>
            <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div>
          </div>
        </Section>

        <Section title="Tabs, tooltip, modal, toast">
          <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
            <Tabs
              items={[{ id: 'practice', label: 'Practice' }, { id: 'exam', label: 'Exam' }]}
              active={tab}
              onChange={setTab}
              ariaLabel="Component demo tabs"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Tooltip label="Keyboard: ⌘K"><Button variant="secondary" size="sm">Hover me</Button></Tooltip>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>Open modal</Button>
              <Button variant="accent" size="sm" onClick={() => toast('Graded live against your container ✅', 'success')}>Show toast</Button>
            </div>
            <EmptyState
              icon={<span className="text-2xl">🧭</span>}
              title="Empty state"
              description="Used when a student has no labs, attempts or activity yet."
            />
          </div>
        </Section>

        <Section title="Motion & effects (21st.dev)">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <AnimatedGradientText>Animated gradient text</AnimatedGradientText>
              <BlurFade>
                <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">Blur fade entrance</span>
              </BlurFade>
            </div>
            <div className="relative rounded-2xl border border-border bg-surface p-4">
              <ShineBorder duration={7} className="rounded-2xl" />
              <p className="font-mono text-xs text-muted">ShineBorder — masked gradient border, token-driven colors</p>
            </div>
            <Marquee repeat={2} duration="24s" pauseOnHover className="rounded-xl border border-border bg-surface-2 py-3 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
              {['marquee', 'shine-border', 'blur-fade', 'gradient-text'].map((c) => (
                <span key={c} className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">{c}</span>
              ))}
            </Marquee>
          </div>
        </Section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example modal">
        <p className="text-sm text-muted">Modals trap focus, close on Escape / backdrop click, and use surface + border tokens.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { setModalOpen(false); toast('Saved', 'success'); }}>Save</Button>
        </div>
      </Modal>
    </div>
  );
};

/** /design — component showcase (public route, used while building pages). */
const DesignSystem: React.FC = () => (
  <ToastProvider>
    <Showcase />
  </ToastProvider>
);

export default DesignSystem;
