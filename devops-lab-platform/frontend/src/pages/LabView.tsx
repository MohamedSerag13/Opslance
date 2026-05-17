import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Terminal from '../components/Terminal';
import HintPanel from '../components/HintPanel';
import DifficultyBadge from '../components/DifficultyBadge';

export default function LabView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchLab = async () => {
      try {
        const res = await api.get(`/labs/${id}`);
        setLab(res.data);
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
      
      // Poll until container is ready
      const poll = setInterval(async () => {
        try {
          const sRes = await api.get(`/sessions/${sessionId}`);
          if (sRes.data.status === 'running') {
            clearInterval(poll);
            setSession(sRes.data);
            setLoading(false);
          }
        } catch (e) {}
      }, 2000);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/sessions/${session.id}/submit`);
      alert(res.data.message);
      // Let student check progress
    } catch (err) {
      alert("Submission failed");
    }
    setSubmitting(false);
  };

  const handleReset = async () => {
    if (!window.confirm("This will destroy your environment and start fresh. Continue?")) return;
    try {
      await api.delete(`/sessions/${session.id}`);
      setSession(null);
      startSession();
    } catch (e) {}
  };

  if (!lab) return <div className="p-8">Loading...</div>;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      {/* Left Pane - Brief */}
      <div className="w-full md:w-1/3 flex flex-col h-full bg-white border-r shadow-sm z-10">
        <div className="p-6 overflow-y-auto flex-1">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1">
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
              <p className="text-gray-700">{lab.symptoms}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 border-b pb-1 mb-2">Mission</h3>
              <p className="text-gray-700">{lab.mission}</p>
            </div>
          </div>

          {session && <HintPanel sessionId={session.id} />}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50">
          {!session ? (
            <button 
              onClick={startSession} disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition"
            >
              {loading ? 'Starting Environment...' : 'Start Lab'}
            </button>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition"
              >
                {submitting ? 'Verifying...' : 'Submit Output'}
              </button>
              <button 
                onClick={handleReset}
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
        {!session ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Click "Start Lab" to spawn your isolated environment.
          </div>
        ) : (
          <Terminal sessionId={session.id} />
        )}
      </div>
    </div>
  );
}
