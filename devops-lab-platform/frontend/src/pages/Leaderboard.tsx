import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Leaderboard() {
  const [board, setBoard] = useState<any[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await api.get('/leaderboard');
        setBoard(res.data);
      } catch (err) {}
    };
    fetchBoard();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">← Back to Dashboard</Link>
      
      <div className="bg-white rounded-xl shadow p-6 mb-8 border">
        <h1 className="text-2xl font-bold text-gray-900">Group Leaderboard</h1>
        <p className="text-gray-500">Rankings based on total score</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labs Completed</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
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
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{row.labs_completed}</td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">{row.total_score}</td>
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
