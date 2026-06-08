import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

interface SummaryData {
  total_labs_completed: number;
  total_points: number;
  current_streak: number;
  completion_percentage: number;
  subscription_tier: 'free' | 'pro';
}

interface ModuleData {
  module_number: number;
  module_title: string;
  total_labs: number;
  completed_labs: number;
  labs: Array<{
    id: string;
    title: string;
    difficulty: string;
    estimated_minutes: number;
    points: number;
    status: 'not_started' | 'in_progress' | 'completed';
    best_score: number;
  }>;
}

interface ActivityData {
  date: string;
  labs_completed: number;
}

export default function StudentDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [optOutCompletion, setOptOutCompletion] = useState(false);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [summaryRes, modulesRes, activityRes, meRes] = await Promise.all([
        api.get('/progress/summary'),
        api.get('/progress/modules'),
        api.get('/progress/activity?days=30'),
        api.get('/auth/me'),
      ]);
      setSummary(summaryRes.data);
      setModules(modulesRes.data);
      setActivity(activityRes.data);
      setOptOutCompletion(meRes.data.opt_out_completion || false);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePreferenceToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setOptOutCompletion(newVal);
    setUpdatingPrefs(true);
    try {
      await api.put('/auth/preferences', { opt_out_completion: newVal });
    } catch (err) {
      console.error("Failed to update preferences", err);
      setOptOutCompletion(!newVal); // revert
    } finally {
      setUpdatingPrefs(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-semibold">Loading Opslance Dashboard...</p>
      </div>
    );
  }

  // Get color code for heatmap completion cell
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 border-gray-200';
    if (count === 1) return 'bg-emerald-200 border-emerald-300 text-emerald-800';
    return 'bg-emerald-600 border-emerald-700 text-white';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-indigo-900 to-slate-900 p-8 rounded-3xl shadow-lg border border-indigo-500/20 text-white gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Welcome, {user?.full_name}! 👋</h1>
          <p className="text-indigo-200 mt-1.5 font-medium">Ready to break some servers and level up your DevOps skills?</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Link to="/billing" className="bg-indigo-600/80 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow transition flex items-center gap-1.5">
            💳 Tier: <span className="uppercase text-yellow-300 font-black">{summary?.subscription_tier}</span>
          </Link>
          <Link to="/leaderboard" className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow transition border border-slate-700">
            🏆 Leaderboard
          </Link>
          <button onClick={logout} className="bg-red-950/80 hover:bg-red-900 text-red-200 px-5 py-2.5 rounded-2xl text-sm font-bold transition">
            Log Out
          </button>
        </div>
      </div>

      {/* Top Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Subscription</p>
          <div className="flex items-center justify-between mt-4">
            <span className={`text-2xl font-black uppercase ${summary?.subscription_tier === 'pro' ? 'text-indigo-600' : 'text-slate-500'}`}>
              {summary?.subscription_tier} Tier
            </span>
            <Link to="/billing" className="text-xs text-indigo-600 font-extrabold hover:underline">
              {summary?.subscription_tier === 'pro' ? 'Manage' : 'Upgrade ⚡'}
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Labs Completed</p>
          <div className="flex items-baseline justify-between mt-4">
            <span className="text-3xl font-black text-gray-900">{summary?.total_labs_completed}</span>
            <span className="text-sm text-gray-400 font-semibold">Total</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Points</p>
          <div className="flex items-baseline justify-between mt-4">
            <span className="text-3xl font-black text-emerald-500">{summary?.total_points}</span>
            <span className="text-sm text-gray-400 font-semibold">XP</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Consecutive Days</p>
          <div className="flex items-baseline justify-between mt-4">
            <span className="text-3xl font-black text-orange-500">🔥 {summary?.current_streak}</span>
            <span className="text-sm text-gray-400 font-semibold">Day Streak</span>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module Progress list */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-gray-900">Your Learning Paths</h2>

          {modules.map((mod) => {
            // Find next incomplete lab inside this module
            const nextIncomplete = mod.labs.find((l) => l.status !== 'completed');

            return (
              <div key={mod.module_number} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 space-y-6 transition hover:shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      Module {mod.module_number.toString().padStart(2, '0')}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-2">{mod.module_title}</h3>
                  </div>
                  {nextIncomplete ? (
                    <button
                      onClick={() => navigate(`/labs/${nextIncomplete.id}`)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-2xl shadow transition"
                    >
                      Continue Lab
                    </button>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 font-extrabold text-sm px-4 py-2 rounded-2xl flex items-center gap-1.5 border border-emerald-100">
                      ✓ Module Completed!
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm font-semibold text-gray-500 mb-2">
                    <span>Progress</span>
                    <span>{mod.completed_labs} / {mod.total_labs} Labs Completed</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${mod.total_labs ? (mod.completed_labs / mod.total_labs) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Individual labs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {mod.labs.map((lab) => (
                    <div key={lab.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-32">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm text-slate-800 line-clamp-1">{lab.title}</p>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            lab.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : lab.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {lab.status === 'completed' ? 'Done' : lab.status === 'in_progress' ? 'Running' : 'Not Started'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <span className="text-xs text-gray-400 font-semibold">
                          ⏱ {lab.estimated_minutes} min | ⭐ {lab.points} pts
                        </span>
                        {lab.status === 'completed' ? (
                          <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                            Score: {lab.best_score}
                          </span>
                        ) : (
                          <button
                            onClick={() => navigate(`/labs/${lab.id}`)}
                            className="text-xs text-indigo-600 font-black hover:underline"
                          >
                            Start Lab →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar activity list and preferences */}
        <div className="space-y-8">
          {/* Activity Heatmap Grid */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Activity Heatmap</h2>
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs text-gray-400 font-bold mb-4 uppercase tracking-wider">Past 30 Days Contributions</p>
              
              <div className="grid grid-cols-7 gap-2.5">
                {activity.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.labs_completed} labs completed on ${new Date(day.date).toLocaleDateString()}`}
                    className={`h-10 w-full rounded-lg border flex items-center justify-center text-xs font-bold transition hover:scale-105 cursor-pointer ${getHeatmapColor(
                      day.labs_completed
                    )}`}
                  >
                    {day.labs_completed > 0 ? day.labs_completed : ''}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6 text-xs text-gray-400 font-bold">
                <span>Older</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 bg-gray-100 border rounded-sm inline-block"></span>
                  <span>0</span>
                  <span className="h-3 w-3 bg-emerald-200 border rounded-sm inline-block"></span>
                  <span>1</span>
                  <span className="h-3 w-3 bg-emerald-600 border rounded-sm inline-block"></span>
                  <span>2+</span>
                </div>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Email Preferences Toggle Panel */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">User Settings</h2>
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-500 font-medium">
                Customize which transactional onboarding or grading messages you receive in your inbox.
              </p>
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-700 font-semibold">Opt out of lab completion emails</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optOutCompletion}
                    onChange={handlePreferenceToggle}
                    disabled={updatingPrefs}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {updatingPrefs && <p className="text-xs text-indigo-500 font-bold animate-pulse">Saving settings...</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
