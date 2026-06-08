import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Leaderboard() {
  const [board, setBoard] = useState<any[]>([]);
  const [scope, setScope] = useState<'session' | 'all_time'>('session');
  const { user } = useAuthStore();

  const fetchBoard = async () => {
    try {
      const res = await api.get(`/gamification/leaderboard/${scope}`);
      setBoard(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchBoard();
  }, [scope]);

  useEffect(() => {
    // Setup WebSocket for live updates
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let wsUrl = '';
    if (window.location.protocol === 'https:') {
      wsUrl = `wss://${window.location.host}/api/ws/events?token=${token}`;
    } else {
      wsUrl = `ws://${window.location.hostname}:8000/api/ws/events?token=${token}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'leaderboard_update') {
          fetchBoard(); // Re-fetch on update
        } else if (data.type === 'challenge_mode') {
          // If revealed or active, fetch again to reflect changes
          fetchBoard();
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [scope]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">← Back to Dashboard</Link>
      
      <div className="bg-white rounded-xl shadow p-6 mb-8 border flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Leaderboard 🏆</h1>
          <p className="text-gray-500">Real-time rankings based on score</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setScope('session')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${scope === 'session' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Session
          </button>
          <button 
            onClick={() => setScope('all_time')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${scope === 'all_time' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All-Time
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {board.map((row) => (
              <tr key={row.student_id} className={user?.id === row.student_id ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                    row.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                    row.rank === 2 ? 'bg-gray-300 text-gray-800' :
                    row.rank === 3 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {row.rank}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {row.name} {user?.id === row.student_id && '(You)'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-600">{row.score}</td>
              </tr>
            ))}
            {board.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
