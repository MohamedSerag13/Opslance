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
          <Link to="/admin/analytics" className="font-semibold text-primary-strong hover:text-primary-strong">Analytics</Link>
          <Link to="/admin/groups" className="text-muted hover:text-black">Groups</Link>
          <Link to="/admin/students" className="text-muted hover:text-black">Students</Link>
          <Link to="/admin/leaderboard" className="text-muted hover:text-black">Leaderboard</Link>
          <Link to="/admin/labs" className="text-muted hover:text-black">Labs</Link>
          <Link to="/admin/environments" className="text-muted hover:text-black">Environments</Link>
          <button onClick={logout} className="text-danger font-medium ml-4">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface p-6 rounded-xl shadow border">
          <p className="text-sm text-muted font-medium">Total Students</p>
          <p className="text-3xl font-bold">{stats.students}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl shadow border">
          <p className="text-sm text-muted font-medium">Total Groups</p>
          <p className="text-3xl font-bold">{stats.groups}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl shadow border text-primary-strong">
          <p className="text-sm text-muted font-medium">Live Labs</p>
          <p className="text-3xl font-bold">{stats.running}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl shadow border flex flex-col justify-between">
          <div>
            <p className="text-sm text-muted font-medium">Top Scorer</p>
            <p className="text-3xl font-bold truncate">{topScorer.name}</p>
            <p className="text-sm text-muted mt-1">{topScorer.score} points</p>
          </div>
          <div className="mt-2">
            <Link to="/admin/leaderboard" className="text-sm text-primary-strong hover:underline">View Leaderboard →</Link>
          </div>
        </div>
      </div>

      <div className="mb-8 p-4 bg-surface-2 rounded-lg border flex gap-4">
        <button onClick={() => navigate('/admin/groups')} className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-strong">
          + New Group
        </button>
        <button onClick={() => navigate('/admin/students')} className="bg-success text-white px-4 py-2 rounded shadow hover:bg-success">
          + New Student
        </button>
        <button onClick={handleSync} className="bg-content text-bg px-4 py-2 rounded shadow hover:bg-content/85">
          Sync Labs
        </button>
      </div>

      <h2 className="text-xl font-bold mb-4">Groups Overview</h2>
      <div className="bg-surface shadow rounded-lg overflow-hidden border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Group Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Students</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Avg Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.map(g => (
              <tr key={g.id}>
                <td className="px-6 py-4 font-medium">{g.name}</td>
                <td className="px-6 py-4">{g.student_count}</td>
                <td className="px-6 py-4">{g.avg_score}</td>
                <td className="px-6 py-4">
                  <Link to={`/admin/groups/${g.id}`} className="text-primary-strong hover:underline">Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
