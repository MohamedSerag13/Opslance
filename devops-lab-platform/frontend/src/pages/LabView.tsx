import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import Terminal from '../components/Terminal';
import HintPanel from '../components/HintPanel';
import DifficultyBadge from '../components/DifficultyBadge';
import confetti from 'canvas-confetti';

export default function LabView() {
  const { id } = useParams();
  const navigate = useNavigate();
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
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchLab();
  }, [id, navigate]);

  const startSession = async () => {
    setLoading(true);
    try {
      const res = await api.post('/sessions', { lab_id: id });
      const sessionId = res.data.session_id;
      setPendingSessionId(sessionId);
      
      // Poll until container is ready
      const poll = setInterval(async () => {
        try {
          const sRes = await api.get(`/sessions/${sessionId}`);
          if (sRes.data.status !== 'starting') {
            clearInterval(poll);
            setSession(sRes.data);
            setPendingSessionId(null);
            setLoading(false);
          }
        } catch (e) {}
      }, 2000);
    } catch (err) {
      setLoading(false);
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
    navigate('/');
  };

  // Track the active ID in a ref so the unmount cleanup can access the latest value without causing re-runs
  // Removed unmount session deletion to persist session state
  const activeSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeSessionIdRef.current = session?.id || pendingSessionId;
  }, [session?.id, pendingSessionId]);

  if (!lab) return <div className="p-8">Loading...</div>;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      {/* Left Pane - Brief */}
      <div className="w-full md:w-1/3 flex flex-col h-full bg-white border-r shadow-sm z-10">
        <div className="p-6 overflow-y-auto flex-1">
          <button onClick={handleBackToDashboard} className="text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          
          <div className="mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{lab.module}</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-2">{lab.title}</h1>
            <div className="flex gap-2 items-center text-sm text-gray-600">
              <DifficultyBadge difficulty={lab.difficulty} />
              <span>⏱️ {lab.estimated_minutes}m</span>
              <span>⭐ {lab.points} pts</span>
            </div>
          </div>

          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 border-b pb-1 mb-2">Scenario</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{lab.scenario}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 border-b pb-1 mb-2">Symptoms</h3>
              {Array.isArray(lab.symptoms) ? (
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  {lab.symptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-gray-700">{lab.symptoms}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 border-b pb-1 mb-2">Mission</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{lab.mission}</p>
            </div>
            
            {lab.acceptance_criteria && lab.acceptance_criteria.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 border-b pb-1 mb-2 mt-4">Progress Map</h3>
                <div className="space-y-2">
                  {lab.acceptance_criteria.map((criteria: any, idx: number) => {
                    const desc = typeof criteria === 'string' ? criteria : criteria.description;
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        <div className={`mt-0.5 w-5 h-5 min-w-[20px] rounded flex items-center justify-center border ${feedback?.passed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                          ✓
                        </div>
                        <span className={`text-sm ${feedback?.passed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
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
        <div className="p-4 border-t bg-gray-50">
          {!session && !loading ? (
            <button 
              onClick={startSession}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition"
            >
              Start Lab
            </button>
          ) : loading && !session ? (
            <button 
              onClick={handleCancelPending}
              className="w-full py-3 bg-red-500 text-white rounded-lg font-bold shadow-md hover:bg-red-600 transition flex items-center justify-center gap-2"
            >
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Cancel Starting...
            </button>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={handleCheck} 
                disabled={checking || submitting || session?.status === 'submitted'}
                className={`w-full py-3 text-white rounded-lg font-bold shadow-md transition ${
                  checking || submitting || session?.status === 'submitted'
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {checking ? 'Checking...' : 'Check'}
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={checking || submitting || session?.status === 'submitted'}
                className={`w-full py-3 text-white rounded-lg font-bold shadow-md transition ${
                  session?.status === 'submitted'
                    ? 'bg-green-500 cursor-not-allowed' 
                    : checking || submitting
                    ? 'bg-green-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {submitting ? 'Submitting...' : session?.status === 'submitted' ? '✓ Submitted' : 'Submit'}
              </button>
              <button 
                onClick={handleRequestHelp}
                className="w-full py-2 bg-yellow-100 text-yellow-800 rounded-lg font-bold shadow-sm hover:bg-yellow-200 transition"
              >
                ✋ Request Help
              </button>
              {solution && (
                <button 
                  onClick={() => setShowSolution(true)}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition"
                >
                  View Solution Walkthrough
                </button>
              )}
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
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
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Click "Start Lab" to spawn your isolated environment.
          </div>
        ) : loading && !session ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-semibold text-gray-300">Spawning Isolated Environment...</p>
            <p className="text-sm mt-2 transition-opacity duration-500 ease-in-out">{loadingMessages[msgIdx]}</p>
          </div>
        ) : (
          <>
            {session && timeLeft !== null && timeLeft <= 300 && (
              <div className="bg-red-950/95 border-b border-red-800 text-red-100 px-6 py-3 flex justify-between items-center z-20 font-sans shadow-lg animate-pulse">
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition"
                  >
                    {extending ? "Extending..." : "Extend Session (+30m)"}
                  </button>
                ) : (
                  <Link
                    to="/billing"
                    className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl transition"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Solution Walkthrough</h2>
              <button onClick={() => setShowSolution(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap font-mono text-sm bg-gray-50 flex-1">
              {solution}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className={`p-4 border-b flex justify-between items-center text-white rounded-t-xl ${feedback.passed ? 'bg-green-600' : 'bg-red-600'}`}>
              <h2 className="text-xl font-bold">
                {feedback.passed ? '🎉 Task Complete!' : '❌ Checks Failed'}
              </h2>
              <button onClick={() => setFeedback(null)} className="text-white hover:text-gray-200 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="font-semibold text-lg mb-4">{feedback.message}</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {feedback.output || "No output provided."}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button 
                onClick={() => setFeedback(null)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition"
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all duration-300">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-2xl mb-4 border border-red-100">
              ⚠️
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">Reset Environment?</h4>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              This will destroy your current running container and start fresh. Any unsubmitted progress will be lost.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition text-sm font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleReset}
                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition text-sm"
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all duration-300">
            <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 text-2xl mb-4 border border-indigo-100">
              ℹ️
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">Notification</h4>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {customAlert.message}
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => setCustomAlert(null)}
                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition text-sm w-full"
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
