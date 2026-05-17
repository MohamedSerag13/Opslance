import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export default function Progress() {
  const [data, setData] = useState<{history: any[], total_score: number} | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get('/progress');
        setData(res.data);
      } catch (err) {}
    };
    fetchProgress();
  }, []);

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">← Back to Dashboard</Link>
      
      <div className="bg-white rounded-xl shadow p-6 mb-8 flex justify-between items-center border">
        <div>
          <h1 className="text-2xl font-bold">My Progress</h1>
          <p className="text-gray-500">Your lab submission history</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 uppercase font-bold">Total Score</p>
          <p className="text-4xl font-bold text-blue-600">{data.total_score}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hints</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.history.map((h, i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{h.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {h.passed ? (
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Passed</span>
                  ) : (
                    <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">Failed</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.score}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.hints_used}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(h.submitted_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {data.history.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No submissions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
