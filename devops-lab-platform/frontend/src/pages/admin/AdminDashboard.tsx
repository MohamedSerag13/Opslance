import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, groups: 0, running: 0 });
  const [groups, setGroups] = useState<any[]>([]);
  const [topScorer, setTopScorer] = useState({ name: '—', score: 0 });
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsRes, studentsRes, envsRes, leaderboardRes] = await Promise.all([
          api.get('/admin/groups'),
          api.get('/admin/students'),
          api.get('/admin/environments'),
          api.get('/gamification/admin/leaderboard').catch(() => ({ data: [] }))
        ]);
        setGroups(groupsRes.data);
        setStats({
          students: studentsRes.data.length,
          groups: groupsRes.data.length,
          running: envsRes.data.length
        });
        if (leaderboardRes.data && leaderboardRes.data.length > 0) {
          setTopScorer({
            name: leaderboardRes.data[0].name || '—',
            score: leaderboardRes.data[0].total_score || 0
          });
        }
      } catch (err) {}
    };
    fetchData();
  }, []);

  const handleSync = async () => {
    try {
      const res = await api.post('/admin/labs/sync');
      alert(`Sync Complete: ${res.data.added} added, ${res.data.updated} updated.`);
    } catch (err) {
      alert('Sync failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-4 items-center">
          <Link to="/admin/groups" className="text-gray-600 hover:text-black">Groups</Link>
          <Link to="/admin/students" className="text-gray-600 hover:text-black">Students</Link>
          <Link to="/admin/leaderboard" className="text-gray-600 hover:text-black">Leaderboard</Link>
          <Link to="/admin/labs" className="text-gray-600 hover:text-black">Labs</Link>
          <Link to="/admin/environments" className="text-gray-600 hover:text-black">Environments</Link>
          <button onClick={logout} className="text-red-600 font-medium ml-4">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border">
          <p className="text-sm text-gray-500 font-medium">Total Students</p>
          <p className="text-3xl font-bold">{stats.students}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border">
          <p className="text-sm text-gray-500 font-medium">Total Groups</p>
          <p className="text-3xl font-bold">{stats.groups}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border text-blue-600">
          <p className="text-sm text-gray-500 font-medium">Live Labs</p>
          <p className="text-3xl font-bold">{stats.running}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border flex flex-col justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Top Scorer</p>
            <p className="text-3xl font-bold truncate">{topScorer.name}</p>
            <p className="text-sm text-gray-500 mt-1">{topScorer.score} points</p>
          </div>
          <div className="mt-2">
            <Link to="/admin/leaderboard" className="text-sm text-blue-600 hover:underline">View Leaderboard →</Link>
          </div>
        </div>
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded-lg border flex gap-4">
        <button onClick={() => navigate('/admin/groups')} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
          + New Group
        </button>
        <button onClick={() => navigate('/admin/students')} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
          + New Student
        </button>
        <button onClick={handleSync} className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-900">
          Sync Labs
        </button>
      </div>

      <h2 className="text-xl font-bold mb-4">Groups Overview</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groups.map(g => (
              <tr key={g.id}>
                <td className="px-6 py-4 font-medium">{g.name}</td>
                <td className="px-6 py-4">{g.student_count}</td>
                <td className="px-6 py-4">{g.avg_score}</td>
                <td className="px-6 py-4">
                  <Link to={`/admin/groups/${g.id}`} className="text-blue-600 hover:underline">Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
