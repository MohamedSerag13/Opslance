import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import Terminal from '../components/Terminal';
import HintPanel from '../components/HintPanel';
import DifficultyBadge from '../components/DifficultyBadge';
import confetti from 'canvas-confetti';

export default function LabView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lab, setLab] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [solution, setSolution] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState<{ passed: boolean, output: string, message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [extending, setExtending] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ show: boolean, message: string } | null>(null);

  useEffect(() => {
    const checkTier = async () => {
      try {
        const res = await api.get('/progress/summary');
        setIsPro(res.data.subscription_tier === 'pro');
      } catch (e) {}
    };
    checkTier();
  }, []);

  useEffect(() => {
    if (!session || !session.expires_at) {
      setTimeLeft(null);
      return;
    }
    const updateCountdown = () => {
      const expires = new Date(session.expires_at).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session?.expires_at]);

  const handleExtendSession = async () => {
    if (!session) return;
    setExtending(true);
    try {
      const res = await api.post(`/sessions/${session.id}/extend`);
      setSession((prev: any) => ({ ...prev, expires_at: res.data.expires_at }));
      setCustomAlert({ show: true, message: "Session extended successfully by 30 minutes!" });
    } catch (err: any) {
      setCustomAlert({ show: true, message: err.response?.data?.detail || "Failed to extend session." });
    } finally {
      setExtending(false);
    }
  };

  const loadingMessages = [
    "Preparing your secure Linux container...",
    "Injecting lab scenarios and configurations...",
    "Establishing isolated networking...",
    "Running initialization scripts...",
    "Almost ready..."
  ];

  useEffect(() => {
    let interval: any;
    if (loading && !session) {
      interval = setInterval(() => setMsgIdx(i => (i + 1) % loadingMessages.length), 3000);
    }
    return () => clearInterval(interval);
  }, [loading, session]);

  useEffect(() => {
    const fetchLab = async () => {
      try {
        const res = await api.get(`/labs/${id}`);
        setLab(res.data);
        
        // Check for active session
        try {
            const activeRes = await api.get(`/sessions/active/${id}`);
            if (activeRes.data) {
                setSession(activeRes.data);
                if (activeRes.data.status === 'starting') {
                    setPendingSessionId(activeRes.data.id);
                }
            }
        } catch (e) {
            // No active session, ignore
        }

        // If the lab has already been passed/submitted, pre-fetch solution and set passed feedback
        if (res.data.passed) {
            try {
                const solRes = await api.get(`/labs/${id}/solution`);
                setSolution(solRes.data.solution);
            } catch (solErr) {}

            setFeedback({
                passed: true,
                output: "",
                message: "🎉 Lab completed! You have already successfully passed this lab."
            });
        }
      } catch (err) {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLab();
  }, [id, navigate]);

  const startSession = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.post('/sessions/', { lab_id: id });
      const sessionId = res.data.session_id;
      setPendingSessionId(sessionId);

      // Poll until the worker assigns a container or fails — a lab that stays
      // 'starting' forever means the worker hit an error (see its logs).
      let polls = 0;
      const poll = setInterval(async () => {
        polls += 1;
        try {
          const sRes = await api.get(`/sessions/${sessionId}`);
          if (sRes.data.status !== 'starting') {
            clearInterval(poll);
            setPendingSessionId(null);
            setLoading(false);
            if (sRes.data.status === 'expired') {
              setFeedback({
                passed: false,
                output: "",
                message: "The lab environment failed to start. Check `docker compose logs lab-manager` on the host for the exact error, then press Start Lab again."
              });
            } else {
              setSession(sRes.data);
            }
          } else if (polls > 150) {
            clearInterval(poll);
            setPendingSessionId(null);
            setLoading(false);
            setFeedback({
              passed: false,
              output: "",
              message: "Still starting after 5 minutes — the lab worker may be stuck. Check `docker compose logs lab-manager` on the host, then cancel and retry."
            });
          }
        } catch (e) {}
      }, 2000);
    } catch (err: any) {
      setLoading(false);
      const detail = err?.response?.data?.detail;
      setFeedback({
        passed: false,
        output: "",
        message: detail || "Could not start the lab — the backend rejected the request. Pro-only modules need the student's plan set to Pro (admin → Students → Plan)."
      });
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await api.post(`/sessions/${session.id}/check`);
      setFeedback({
        passed: res.data.passed,
        output: res.data.verification_output,
        message: res.data.message || (res.data.passed ? "All checks passed! You are ready to submit." : "Some checks failed. Read the output below to debug.")
      });
    } catch (err: any) {
      setCustomAlert({ show: true, message: "Check failed: " + (err.response?.data?.detail || err.message) });
    }
    setChecking(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/sessions/${session.id}/submit`);
      if (res.data.passed) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        // Fetch solution walkthrough on pass
        try {
          const solRes = await api.get(`/labs/${id}/solution`);
          setSolution(solRes.data.solution);
        } catch (e) {}

        // Instantly update session status to submitted in frontend state
        setSession((prev: any) => ({ ...prev, status: 'submitted' }));
      }
      
      setFeedback({
        passed: res.data.passed,
        output: res.data.verification_output,
        message: res.data.message
      });
      // Let student check progress
    } catch (err: any) {
      setCustomAlert({ show: true, message: "Submission failed: " + (err.response?.data?.detail || err.message) });
    }
    setSubmitting(false);
  };

  const handleRequestHelp = async () => {
    try {
      const res = await api.post(`/sessions/${session.id}/help`);
      setCustomAlert({ show: true, message: res.data.message });
    } catch (err) {
      setCustomAlert({ show: true, message: "Failed to request help. Make sure your session is active." });
    }
  };

  const handleReset = async () => {
    setShowResetConfirm(false);
    try {
      await api.delete(`/sessions/${session.id}`);
      setSession(null);
      startSession();
    } catch (e) {}
  };

  const handleCancelPending = async () => {
    if (!pendingSessionId) return;
    try {
      await api.delete(`/sessions/${pendingSessionId}`);
      setPendingSessionId(null);
      setLoading(false);
      window.location.reload();
    } catch (e) {}
  };

  const handleBackToDashboard = async () => {
    const targetSessionId = session?.id || pendingSessionId;
    if (targetSessionId) {
      try {
        await api.delete(`/sessions/${targetSessionId}`);
      } catch (e) {
        console.error("Failed to terminate container on exit:", e);
      }
    }
    navigate('/dashboard');
  };

  // Track the active ID in a ref so the unmount cleanup can access the latest value without causing re-runs
  // Removed unmount session deletion to persist session state
  const activeSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeSessionIdRef.current = session?.id || pendingSessionId;
  }, [session?.id, pendingSessionId]);

  if (!lab) return <div className="p-8">Loading...</div>;

  // CKA/k8s labs default to the question-by-question runner. Add ?classic=1
  // to reach the full task-list brief (the runner's links pass it through).
  const wantsClassic = searchParams.get('classic') === '1';
  if (lab.category === 'kubernetes' && !wantsClassic) {
    return <Navigate to={`/labs/${id}/run`} replace />;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-surface-2 overflow-hidden">
      {/* Left Pane - Brief */}
      <div className="w-full md:w-1/3 flex flex-col h-full bg-surface border-r shadow-sm z-10">
        <div className="p-6 overflow-y-auto flex-1">
          <button onClick={handleBackToDashboard} className="text-muted hover:text-content mb-4 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          
          <div className="mb-6">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">{lab.module}</span>
            <h1 className="text-2xl font-bold text-content mt-1 mb-2">{lab.title}</h1>
            <div className="flex gap-2 items-center text-sm text-muted">
              <DifficultyBadge difficulty={lab.difficulty} />
              <span>⏱️ {lab.estimated_minutes}m</span>
              <span>⭐ {lab.points} pts</span>
            </div>
            <Link
              to={`/labs/${id}/run`}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-orange-500 shadow-md hover:brightness-110 transition"
            >
              ⚡ Open Question Runner — task by task, graded live
            </Link>
          </div>

          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-semibold text-content border-b pb-1 mb-2">Scenario</h3>
              <p className="text-content whitespace-pre-wrap">{lab.scenario}</p>
            </div>
            <div>
              <h3 className="font-semibold text-content border-b pb-1 mb-2">Symptoms</h3>
              {Array.isArray(lab.symptoms) ? (
                <ul className="list-disc pl-5 text-content space-y-1">
                  {lab.symptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-content">{lab.symptoms}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-content border-b pb-1 mb-2">Mission</h3>
              <p className="text-content whitespace-pre-wrap">{lab.mission}</p>
            </div>
            
            {lab.acceptance_criteria && lab.acceptance_criteria.length > 0 && (
              <div>
                <h3 className="font-semibold text-content border-b pb-1 mb-2 mt-4">Progress Map</h3>
                <div className="space-y-2">
                  {lab.acceptance_criteria.map((criteria: any, idx: number) => {
                    const desc = typeof criteria === 'string' ? criteria : criteria.description;
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        <div className={`mt-0.5 w-5 h-5 min-w-[20px] rounded flex items-center justify-center border ${feedback?.passed ? 'bg-success border-success/40 text-white' : 'border-border bg-surface text-transparent'}`}>
                          ✓
                        </div>
                        <span className={`text-sm ${feedback?.passed ? 'text-muted line-through' : 'text-content'}`}>
                          {desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {session && <HintPanel sessionId={session.id} />}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t bg-surface-2">
          {!session && !loading ? (
            <button 
              onClick={startSession}
              className="w-full py-3 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary-strong transition"
            >
              Start Lab
            </button>
          ) : loading && !session ? (
            <div className="space-y-2">
              <p className="text-xs text-muted text-center">
                Starting the lab environment… first boot pulls images and can take 1–3 minutes (k3s labs a bit longer).
              </p>
              <button
                onClick={handleCancelPending}
                className="w-full py-3 bg-danger text-white rounded-lg font-bold shadow-md hover:bg-danger transition flex items-center justify-center gap-2"
              >
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Cancel Starting...
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={handleCheck} 
                disabled={checking || submitting || session?.status === 'submitted'}
                className={`w-full py-3 text-white rounded-lg font-bold shadow-md transition ${
                  checking || submitting || session?.status === 'submitted'
                    ? 'bg-primary-strong cursor-not-allowed' 
                    : 'bg-primary hover:bg-primary-strong'
                }`}
              >
                {checking ? 'Checking...' : 'Check'}
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={checking || submitting || session?.status === 'submitted'}
                className={`w-full py-3 text-white rounded-lg font-bold shadow-md transition ${
                  session?.status === 'submitted'
                    ? 'bg-success cursor-not-allowed' 
                    : checking || submitting
                    ? 'bg-success cursor-not-allowed'
                    : 'bg-success hover:bg-success'
                }`}
              >
                {submitting ? 'Submitting...' : session?.status === 'submitted' ? '✓ Submitted' : 'Submit'}
              </button>
              <button 
                onClick={handleRequestHelp}
                className="w-full py-2 bg-warn/15 text-warn rounded-lg font-bold shadow-sm hover:bg-warn transition"
              >
                ✋ Request Help
              </button>
              {solution && (
                <button 
                  onClick={() => setShowSolution(true)}
                  className="w-full py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary transition"
                >
                  View Solution Walkthrough
                </button>
              )}
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2 text-danger hover:bg-danger/15 rounded-lg font-medium transition"
              >
                Reset Environment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Terminal */}
      <div className="w-full md:w-2/3 h-full bg-[#1e1e1e] flex flex-col relative">
        {!session && !loading ? (
          <div className="flex-1 flex items-center justify-center text-muted">
            Click "Start Lab" to spawn your isolated environment.
          </div>
        ) : loading && !session ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted">
            <div className="w-10 h-10 border-4 border-primary/40 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-semibold text-muted">Spawning Isolated Environment...</p>
            <p className="text-sm mt-2 transition-opacity duration-500 ease-in-out">{loadingMessages[msgIdx]}</p>
          </div>
        ) : (
          <>
            {session && timeLeft !== null && timeLeft <= 300 && (
              <div className="bg-red-950/95 border-b border-danger/40 text-red-100 px-6 py-3 flex justify-between items-center z-20 font-sans shadow-lg animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏰</span>
                  <p className="font-bold text-sm">
                    Warning: Container auto-stops in {Math.floor(timeLeft / 60)}m {timeLeft % 60}s!
                  </p>
                </div>
                {isPro ? (
                  <button
                    onClick={handleExtendSession}
                    disabled={extending}
                    className="bg-primary hover:bg-primary text-white font-extrabold text-xs px-4 py-2 rounded-xl transition"
                  >
                    {extending ? "Extending..." : "Extend Session (+30m)"}
                  </button>
                ) : (
                  <Link
                    to="/billing"
                    className="bg-warn hover:bg-warn text-content font-extrabold text-xs px-4 py-2 rounded-xl transition"
                  >
                    Upgrade to Pro to Extend
                  </Link>
                )}
              </div>
            )}
            <Terminal sessionId={session.id} />
          </>
        )}
      </div>

      {/* Solution Modal */}
      {showSolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Solution Walkthrough</h2>
              <button onClick={() => setShowSolution(false)} className="text-muted hover:text-content text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap font-mono text-sm bg-surface-2 flex-1">
              {solution}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className={`p-4 border-b flex justify-between items-center text-white rounded-t-xl ${feedback.passed ? 'bg-success' : 'bg-danger'}`}>
              <h2 className="text-xl font-bold">
                {feedback.passed ? '🎉 Task Complete!' : '❌ Checks Failed'}
              </h2>
              <button onClick={() => setFeedback(null)} className="text-white hover:text-gray-200 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="font-semibold text-lg mb-4">{feedback.message}</p>
              <div className="bg-gray-900 text-success p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {feedback.output || "No output provided."}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button 
                onClick={() => setFeedback(null)}
                className="px-6 py-2 bg-surface-2 hover:bg-surface-2 text-content font-bold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all duration-300">
            <div className="mx-auto w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center text-danger text-2xl mb-4 border border-danger/40">
              ⚠️
            </div>
            <h4 className="text-lg font-bold text-content mb-2">Reset Environment?</h4>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              This will destroy your current running container and start fresh. Any unsubmitted progress will be lost.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2.5 border border-border text-content bg-surface rounded-xl hover:bg-surface-2 transition text-sm font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleReset}
                className="px-5 py-2.5 bg-danger text-white font-bold rounded-xl hover:bg-danger shadow-md shadow-red-200 transition text-sm"
              >
                Reset Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert?.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all duration-300">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary-strong text-2xl mb-4 border border-primary/30">
              ℹ️
            </div>
            <h4 className="text-lg font-bold text-content mb-2">Notification</h4>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              {customAlert.message}
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => setCustomAlert(null)}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary shadow-md shadow-indigo-200 transition text-sm w-full"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
