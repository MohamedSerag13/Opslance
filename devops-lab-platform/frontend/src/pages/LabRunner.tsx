import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import Terminal from '../components/Terminal';
import { Badge, Button, Modal, ProgressBar, ProgressRing, Skeleton, useToast } from '../components/ui';
import confetti from 'canvas-confetti';

/**
 * Question-by-question lab runner (lab.yaml schema v2).
 * Left: current question + hints + per-question Check. Right: live terminal.
 * Practice mode: hints allowed, no timer. Exam mode: server-side timer, no
 * hints, auto-finishes at expiry. All state lives on the server (resumes on
 * refresh). The classic LabView was removed — the runner is the only lab UI.
 */

type Attempt = {
  id: string;
  mode: 'practice' | 'exam';
  status: 'active' | 'completed';
  current_index: number;
  remaining_seconds: number | null;
  duration_seconds: number | null;
  pass_mark: number;
  lab_title: string | null;
  questions_total: number;
  score_earned: number;
  score_total: number;
  passed: boolean | null;
  questions: RunnerQuestion[];
  domain_breakdown: { domain: string; earned: number; total: number; questions: number }[];
};

type RunnerQuestion = {
  id: string;
  order: number;
  domain: string;
  weight: number;
  prompt: string;
  description?: string | null;
  context: string | null;
  time_target_minutes: number | null;
  hints_total: number;
  hints_revealed: number;
  hints: { number: number; title: string | null; content: string }[];
  flagged: boolean;
  status: 'unanswered' | 'passed' | 'failed';
  checks_run: number;
  last_output: string | null;
  solution?: string | null;
  explanation?: string | null;
};

type LabBrief = {
  id: string;
  title: string;
  module: string;
  difficulty: string;
  estimated_minutes: number;
  points: number;
  scenario: string;
  symptoms: string[];
  mission: string;
};

const fmtClock = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const statusChip = (status: RunnerQuestion['status'], flagged: boolean) => {
  if (status === 'passed') return 'bg-success/20 text-success border-success/40';
  if (status === 'failed') return 'bg-danger/20 text-danger border-danger/40';
  if (flagged) return 'bg-warn/15 text-warn border-warn/40';
  return 'bg-surface-2 text-muted border-border';
};

export default function LabRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lab, setLab] = useState<LabBrief | null>(null);
  const [session, setSession] = useState<{ id: string; status: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [attemptLoading, setAttemptLoading] = useState(true);
  const [showModePicker, setShowModePicker] = useState(false);
  const [pickingMode, setPickingMode] = useState<'practice' | 'exam' | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ passed: boolean } | null>(null);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);

  // ---- boot: lab + active session ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const labRes = await api.get(`/labs/${id}`);
        if (!alive) return;
        setLab(labRes.data);
      } catch {
        navigate('/dashboard');
        return;
      }
      try {
        const activeRes = await api.get(`/sessions/active/${id}`);
        if (!alive) return;
        setSession(activeRes.data);
        if (activeRes.data.status === 'starting') pollSession(activeRes.data.id);
      } catch {
        /* no active session — show Start screen */
      } finally {
        if (alive) setAttemptLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pollSession = (sessionId: string) => {
    let polls = 0;
    const iv = setInterval(async () => {
      polls += 1;
      try {
        const res = await api.get(`/sessions/${sessionId}`);
        if (res.data.status !== 'starting') {
          clearInterval(iv);
          setStarting(false);
          setSession(res.data);
        } else if (polls > 150) {
          clearInterval(iv);
          setStarting(false);
          setStartError('Still starting after 5 minutes — the lab worker may be stuck. Cancel and retry.');
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  const startSession = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await api.post('/sessions/', { lab_id: id });
      setSession({ id: res.data.session_id, status: 'starting' });
      pollSession(res.data.session_id);
    } catch (err: any) {
      setStarting(false);
      setStartError(err?.response?.data?.detail || 'Could not start the lab — the backend rejected the request.');
    }
  };

  // ---- attempts ----
  const loadAttempt = useCallback(async (silent = false) => {
    if (!session) return;
    if (!silent) setAttemptLoading(true);
    try {
      const res = await api.get(`/sessions/${session.id}/attempts/active`);
      setAttempt(res.data);
      setShowModePicker(false);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setAttempt(null);
        setShowModePicker(true);
      }
    } finally {
      setAttemptLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session && session.status === 'running') loadAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status]);

  const startAttempt = async (mode: 'practice' | 'exam') => {
    if (!session) return;
    setPickingMode(mode);
    try {
      const res = await api.post(`/sessions/${session.id}/attempts`, { mode });
      setAttempt(res.data);
      setShowModePicker(false);
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'Could not start the attempt.', 'error');
    } finally {
      setPickingMode(null);
    }
  };

  // local clock tick (timer chip); server re-syncs on every action
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const [timerBase, setTimerBase] = useState<{ at: number; remaining: number } | null>(null);
  useEffect(() => {
    if (attempt?.status === 'active' && attempt.remaining_seconds !== null) {
      setTimerBase({ at: Date.now(), remaining: attempt.remaining_seconds });
    } else {
      setTimerBase(null);
    }
  }, [attempt?.id, attempt?.status, attempt?.remaining_seconds]);

  const remainingSecs = timerBase
    ? Math.max(0, timerBase.remaining - Math.floor((now - timerBase.at) / 1000))
    : null;

  // exam expiry → the server auto-finishes on read
  useEffect(() => {
    if (remainingSecs === 0 && attempt?.status === 'active' && !finishedRef.current) {
      finishedRef.current = true;
      toast("Time's up — your attempt is being graded.", 'info');
      loadAttempt(true).then(() => { finishedRef.current = false; });
    }
  }, [remainingSecs, attempt?.status, loadAttempt, toast]);

  const current = attempt?.questions[Math.min(attempt.current_index, attempt.questions.length - 1)] ?? null;

  const goTo = (index: number) => {
    if (!attempt || !session) return;
    const q = attempt.questions[index];
    if (!q) return;
    setCheckResult(null);
    setAttempt({ ...attempt, current_index: index });
    api.patch(`/sessions/${session.id}/attempts/${attempt.id}/questions/${q.id}`, { current: true })
      .catch(() => {});
  };

  const toggleFlag = async () => {
    if (!attempt || !session || !current) return;
    const next = !current.flagged;
    setAttempt({
      ...attempt,
      questions: attempt.questions.map((q) => (q.id === current.id ? { ...q, flagged: next } : q)),
    });
    try {
      await api.patch(`/sessions/${session.id}/attempts/${attempt.id}/questions/${current.id}`, { flagged: next });
    } catch {
      toast('Could not save the flag — check your connection.', 'error');
    }
  };

  const checkCurrent = async () => {
    if (!attempt || !session || !current) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await api.post(
        `/sessions/${session.id}/attempts/${attempt.id}/questions/${current.id}/check`);
      if (res.data.mapped === false || typeof res.data.passed !== 'boolean') {
        toast(res.data.message || 'Checker output could not be mapped to this question.', 'info');
      } else {
        setCheckResult({ passed: res.data.passed });
        toast(res.data.message || (res.data.passed ? 'Question passed' : 'Not yet — keep debugging'),
          res.data.passed ? 'success' : 'error');
      }
      await loadAttempt(true);
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'Check failed — the lab container may have expired.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const revealHint = async () => {
    if (!attempt || !session || !current) return;
    try {
      const res = await api.post(
        `/sessions/${session.id}/attempts/${attempt.id}/questions/${current.id}/hint`);
      setAttempt({
        ...attempt,
        questions: attempt.questions.map((q) => q.id === current.id ? {
          ...q,
          hints_revealed: res.data.hints_revealed,
          hints: [...q.hints, { number: res.data.number, title: res.data.title, content: res.data.content }],
        } : q),
      });
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'No more hints.', 'info');
    }
  };

  const finishAttempt = async () => {
    if (!attempt || !session) return;
    setFinishing(true);
    try {
      const res = await api.post(`/sessions/${session.id}/attempts/${attempt.id}/finish`);
      setAttempt(res.data);
      setShowFinishConfirm(false);
      if (res.data.passed) {
        confetti({ particleCount: 160, spread: 75, origin: { y: 0.6 } });
        toast(`Passed with ${res.data.score_earned}/${res.data.score_total}!`, 'success');
      } else {
        toast(`Attempt scored ${res.data.score_earned}/${res.data.score_total} — below the ${res.data.pass_mark}% pass mark.`, 'info');
      }
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'Could not finish the attempt.', 'error');
    } finally {
      setFinishing(false);
    }
  };

  const retryFailed = async () => {
    if (!attempt || !session) return;
    setRetrying(true);
    try {
      const res = await api.post(`/sessions/${session.id}/attempts/${attempt.id}/retry-failed`);
      setAttempt(res.data);
      setCheckResult(null);
      toast(`New attempt with ${res.data.questions_total} question(s).`, 'info');
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'Nothing to retry — every question passed.', 'info');
    } finally {
      setRetrying(false);
    }
  };

  const exitRunner = async () => {
    const sid = session?.id;
    setShowExitConfirm(false);
    if (sid) {
      try { await api.delete(`/sessions/${sid}`); } catch { /* container may be gone */ }
    }
    navigate('/dashboard');
  };

  const answeredCount = attempt
    ? attempt.questions.filter((q) => q.status !== 'unanswered').length
    : 0;
  const pctScore = attempt && attempt.score_total > 0
    ? Math.round((attempt.score_earned / attempt.score_total) * 100)
    : 0;
  const timerCritical = remainingSecs !== null && remainingSecs <= 300;

  const navigatorGrid = useMemo(() => (
    <div className="grid grid-cols-8 gap-2">
      {attempt?.questions.map((q, i) => (
        <button
          key={q.id}
          onClick={() => { goTo(i); setShowNavigator(false); }}
          aria-label={`Question ${q.order}${q.flagged ? ', flagged' : ''}${q.status !== 'unanswered' ? `, ${q.status}` : ''}`}
          className={`relative h-10 rounded-lg border text-sm font-semibold transition
            ${i === attempt.current_index ? 'ring-2 ring-primary' : ''}
            ${statusChip(q.status, q.flagged)} hover:border-primary/60`}
        >
          {q.order}
          {q.flagged && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-warn" aria-hidden="true" />}
        </button>
      ))}
    </div>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [attempt?.questions, attempt?.current_index]);

  if (!lab) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ---------- results screen ----------
  if (attempt && attempt.status === 'completed') {
    return (
      <div className="min-h-screen bg-bg text-content">
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted">{lab.module}</p>
              <h1 className="text-lg font-bold truncate">{lab.title} — Results</h1>
            </div>
            <Badge variant={attempt.mode === 'exam' ? 'accent' : 'default'} dot>
              {attempt.mode === 'exam' ? 'Exam mode' : 'Practice mode'}
            </Badge>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          <section className={`rounded-2xl border p-8 flex flex-col md:flex-row items-center gap-8
            ${attempt.passed ? 'border-success/40 bg-success/5' : 'border-danger/40 bg-danger/5'}`}>
            <ProgressRing value={pctScore} size={140} label="Score" />
            <div className="flex-1 text-center md:text-left">
              <h2 className={`text-2xl font-bold ${attempt.passed ? 'text-success' : 'text-danger'}`}>
                {attempt.passed ? '🎉 Attempt passed' : 'Below the pass mark'}
              </h2>
              <p className="mt-2 text-muted">
                {attempt.score_earned}/{attempt.score_total} points · pass mark {attempt.pass_mark}% ·
                {' '}{attempt.questions.filter((q) => q.status === 'passed').length}/{attempt.questions_total} questions passed
              </p>
              <div className="mt-5 flex flex-wrap gap-3 justify-center md:justify-start">
                <Button onClick={retryFailed} disabled={retrying || pctScore === 100}>
                  {retrying ? 'Preparing…' : 'Retry failed questions'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to dashboard
                </Button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">Domain breakdown</h3>
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
              {attempt.domain_breakdown.map((d) => (
                <div key={d.domain} className="px-5 py-4 flex items-center gap-4">
                  <span className="w-40 shrink-0 font-semibold truncate">{d.domain}</span>
                  <ProgressBar value={d.earned} max={d.total} className="flex-1" label={d.domain} />
                  <span className="text-sm text-muted tabular-nums shrink-0">{d.earned}/{d.total}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">Question review</h3>
            <div className="space-y-3">
              {attempt.questions.map((q) => (
                <details key={q.id} className="rounded-xl border border-border bg-surface overflow-hidden">
                  <summary className="px-5 py-3.5 flex items-center gap-3 cursor-pointer list-none">
                    <span className={`h-6 w-6 min-w-[24px] rounded-full flex items-center justify-center text-xs font-bold
                      ${q.status === 'passed' ? 'bg-success text-white' : q.status === 'failed' ? 'bg-danger text-white' : 'bg-surface-2 text-muted'}`}>
                      {q.status === 'passed' ? '✓' : q.status === 'failed' ? '✕' : '·'}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">{q.prompt}</span>
                    <span className="text-xs text-muted tabular-nums">{q.weight} pts</span>
                  </summary>
                  <div className="px-5 pb-4 pt-1 space-y-3 text-sm">
                    <p className="text-muted whitespace-pre-wrap">{q.prompt}</p>
                    {q.last_output && (
                      <pre className="bg-bg border border-border rounded-lg p-3 font-mono text-xs whitespace-pre-wrap">{q.last_output}</pre>
                    )}
                    {q.explanation && <p className="text-muted">{q.explanation}</p>}
                    {q.solution && (
                      <pre className="bg-surface-2 border border-border rounded-lg p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto">{q.solution}</pre>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ---------- no running session: start screen ----------
  if (!session || session.status !== 'running') {
    return (
      <div className="min-h-screen bg-bg text-content flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-xs uppercase tracking-wider text-muted">{lab.module}</p>
          <h1 className="text-2xl font-bold mt-1">{lab.title}</h1>
          <p className="text-muted mt-3">
            The question runner grades each task against your live environment.
            Start your isolated lab container to begin.
          </p>
          {startError && <p className="mt-4 text-sm text-danger">{startError}</p>}
          <div className="mt-6">
            {!starting ? (
              <Button size="lg" className="w-full" onClick={startSession}>Start lab environment</Button>
            ) : (
              <div className="space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-muted">Spawning your environment… first boot can take 1–3 minutes (k3s labs longer).</p>
              </div>
            )}
          </div>
          <Link to="/dashboard" className="inline-block mt-4 text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ---------- active runner ----------
  return (
    <div className="h-screen flex flex-col bg-bg text-content overflow-hidden">
      {/* top bar */}
      <header className="shrink-0 border-b border-border bg-surface/90 backdrop-blur z-30">
        <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link to="/dashboard" className="text-sm text-muted hover:text-content transition whitespace-nowrap">
            ← Dashboard
          </Link>
          <div className="hidden md:block h-5 w-px bg-border" />
          <div className="min-w-0 flex-1 basis-40">
            <p className="text-xs text-muted uppercase tracking-wider truncate">{lab.module}</p>
            <h1 className="text-sm font-bold truncate">{lab.title}</h1>
          </div>
          {attempt && (
            <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
              {Math.min(attempt.current_index + 1, attempt.questions_total)}/{attempt.questions_total}
              <span className="hidden sm:inline text-muted font-normal"> · {answeredCount} checked</span>
            </span>
          )}
          {attempt && (
            <Badge variant={attempt.mode === 'exam' ? 'accent' : 'default'} dot className="hidden sm:inline-flex">
              {attempt.mode === 'exam' ? 'Exam' : 'Practice'}
            </Badge>
          )}
          {remainingSecs !== null && (
            <span className={`tabular-nums font-bold rounded-lg px-3 py-1.5 border text-sm
              ${timerCritical ? 'text-danger border-danger/50 bg-danger/10 animate-pulse' : 'text-content border-border bg-surface-2'}`}>
              ⏱ {fmtClock(remainingSecs)}
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowNavigator(true)}>Navigator</Button>
          <Button size="sm" variant="ghost" className="hidden md:inline-flex" onClick={() => setShowDocs((s) => !s)}>Brief</Button>
          {attempt?.status === 'active' && (
            <Button size="sm" variant="accent" onClick={() => setShowFinishConfirm(true)}>Finish</Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* left: question panel */}
        <aside className="md:w-[440px] shrink-0 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-border bg-surface">
          {attemptLoading ? (
            /* startup skeleton mirrors the real panel: meta row, prompt, actions */
            <div className="flex-1 space-y-4 p-6" aria-label="Loading lab">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            </div>
          ) : showModePicker ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h2 className="text-lg font-bold">Choose how you want to run this lab</h2>
              <button
                onClick={() => startAttempt('practice')}
                disabled={pickingMode !== null}
                className="w-full text-left rounded-xl border border-border bg-surface-2 hover:border-primary/60 p-5 transition disabled:opacity-60"
              >
                <p className="font-bold">Practice mode</p>
                <p className="text-sm text-muted mt-1">
                  Hints available, no timer, free navigation. Check each question against your live environment as often as you like.
                </p>
              </button>
              <button
                onClick={() => startAttempt('exam')}
                disabled={pickingMode !== null}
                className="w-full text-left rounded-xl border border-border bg-surface-2 hover:border-accent/60 p-5 transition disabled:opacity-60"
              >
                <p className="font-bold">Exam mode {lab && <span className="text-xs text-muted font-normal">(CKA-style)</span>}</p>
                <p className="text-sm text-muted mt-1">
                  One question at a time, no hints, server-side timer{attempt?.duration_seconds ? ' from the lab' : ' if the lab defines one'}. Auto-submits at expiry — like the real exam.
                </p>
              </button>
            </div>
          ) : current ? (
            <>
              <div className="p-5 border-b border-border space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="primary">{current.domain}</Badge>
                  <Badge variant="default">{current.weight} {attempt!.score_total === 100 ? '%' : 'pts'}</Badge>
                  {current.time_target_minutes && (
                    <span className="text-xs text-muted">target ~{current.time_target_minutes}m</span>
                  )}
                  <span className="flex-1" />
                  <button
                    onClick={toggleFlag}
                    aria-pressed={current.flagged}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition
                      ${current.flagged ? 'bg-warn/15 text-warn border-warn/40' : 'border-border text-muted hover:text-content hover:border-warn/40'}`}
                  >
                    {current.flagged ? '★ Flagged' : '☆ Flag for review'}
                  </button>
                </div>
                <p className="text-sm text-muted">Question {current.order} of {attempt!.questions_total}</p>
                <h2 className="text-lg font-semibold leading-snug whitespace-pre-wrap">{current.prompt}</h2>
                {current.description && (
                  <p className="text-sm text-content/90 whitespace-pre-wrap border-l-2 border-primary/40 pl-3">
                    {current.description}
                  </p>
                )}
                {current.context && <p className="text-sm text-muted whitespace-pre-wrap">{current.context}</p>}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
                {current.hints.map((h) => (
                  <div key={h.number} className="rounded-lg border border-border bg-surface-2 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Hint {h.number}{h.title ? ` — ${h.title}` : ''}</p>
                    <p className="text-sm mt-1.5 text-content whitespace-pre-wrap">{h.content}</p>
                  </div>
                ))}
                {attempt!.mode === 'practice' && current.hints_revealed < current.hints_total && (
                  <Button variant="outline" size="sm" onClick={revealHint}>
                    Reveal hint ({current.hints_revealed + 1}/{current.hints_total})
                  </Button>
                )}

                {checkResult && (
                  <div className={`rounded-lg border p-3.5 ${checkResult.passed ? 'border-success/40 bg-success/10' : 'border-danger/40 bg-danger/10'}`}>
                    <p className={`text-sm font-bold ${checkResult.passed ? 'text-success' : 'text-danger'}`}>
                      {checkResult.passed
                        ? '✓ This question passes on your live environment'
                        : '✕ Not passing yet'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {checkResult.passed
                        ? 'Points recorded for this question — move on with Next →'
                        : 'Fix your cluster state in the terminal, then check this question again.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border space-y-3 bg-surface">
                <Button className="w-full" onClick={checkCurrent} disabled={checking || attempt!.status !== 'active'}>
                  {checking ? 'Checking live state…' : `Check question ${current.order}`}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" disabled={attempt!.current_index === 0}
                    onClick={() => goTo(attempt!.current_index - 1)}>← Prev</Button>
                  <Button variant="outline" className="flex-1"
                    disabled={attempt!.current_index >= attempt!.questions_total - 1}
                    onClick={() => goTo(attempt!.current_index + 1)}>Next →</Button>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Checking validates only this question against your live environment — a single
                  targeted check, instant verdict. Finish runs one final check of every question.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-muted text-sm">Loading attempt…</p>
            </div>
          )}
        </aside>

        {/* right: terminal (+ optional brief panel) */}
        <main className="flex-1 flex min-h-0">
          {showDocs && (
            <aside className="w-[320px] shrink-0 border-r border-border bg-surface overflow-y-auto p-5 space-y-5 scrollbar-thin">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Scenario</h3>
                <p className="text-sm whitespace-pre-wrap">{lab.scenario}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Symptoms</h3>
                <ul className="list-disc pl-4 text-sm space-y-1">
                  {Array.isArray(lab.symptoms) && lab.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Mission</h3>
                <p className="text-sm whitespace-pre-wrap">{lab.mission}</p>
              </div>
            </aside>
          )}
          <div className="flex-1 min-w-0 flex flex-col bg-[#0d1117]">
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono text-white/50">
                {session.status === 'running' ? '● live session — graded against real state' : '○ session starting…'}
              </span>
              <Button size="sm" variant="ghost" className="!text-white/60" onClick={() => setShowExitConfirm(true)}>Exit</Button>
            </div>
            <div className="flex-1 min-h-0">
              <Terminal sessionId={session.id} />
            </div>
          </div>
        </main>
      </div>

      {/* navigator */}
      <Modal open={showNavigator} onClose={() => setShowNavigator(false)} title="Question navigator" className="max-w-xl">
        {navigatorGrid}
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success/30 border border-success/50" /> passed</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger/30 border border-danger/50" /> failed</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warn/20 border border-warn/50" /> flagged</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-surface-2 border border-border" /> untouched</span>
        </div>
      </Modal>

      {/* finish confirm */}
      <Modal open={showFinishConfirm} onClose={() => setShowFinishConfirm(false)} title="Finish attempt?">
        <p className="text-sm text-muted">
          One final check runs against your live environment and every question is graded at once.
          You'll see your score, the domain breakdown and a per-question review.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowFinishConfirm(false)}>Keep working</Button>
          <Button variant="accent" onClick={finishAttempt} disabled={finishing}>
            {finishing ? 'Grading…' : 'Finish and grade'}
          </Button>
        </div>
      </Modal>

      {/* exit confirm */}
      <Modal open={showExitConfirm} onClose={() => setShowExitConfirm(false)} title="Exit the lab?">
        <p className="text-sm text-muted">
          This terminates your container and ends the session. Any attempt state stays on the server,
          but the live environment will be destroyed.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowExitConfirm(false)}>Stay</Button>
          <Button variant="danger" onClick={exitRunner}>Exit and terminate</Button>
        </div>
      </Modal>
    </div>
  );
}
