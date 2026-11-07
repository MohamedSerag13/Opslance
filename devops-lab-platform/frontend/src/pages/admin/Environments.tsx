import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';

export default function Environments() {
  const [envs, setEnvs] = useState<any[]>([]);

  const fetchEnvs = async () => {
    try {
      const res = await api.get('/admin/environments');
      setEnvs(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchEnvs();
    const interval = setInterval(fetchEnvs, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (containerName: string) => {
    if (!window.confirm(`Force kill container ${containerName}?`)) return;
    try {
      await api.delete(`/admin/environments/${containerName}`);
      fetchEnvs();
    } catch (e) {
      alert('Failed to kill environment');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-primary-strong mb-4 inline-block">← Dashboard</Link>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-content">Live Environments</h1>
          <p className="text-muted mt-1">Currently running lab containers (auto-refreshes every 10s)</p>
        </div>
        <div className="text-primary-strong font-bold bg-primary/10 px-4 py-2 rounded border border-primary/40">
          Running: {envs.length}
        </div>
      </div>

      <div className="bg-surface shadow rounded-lg border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Lab</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Container</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Started</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {envs.map(e => (
              <tr key={e.session_id}>
                <td className="px-6 py-4 font-medium">{e.student_name}</td>
                <td className="px-6 py-4">{e.lab_title}</td>
                <td className="px-6 py-4 text-sm font-mono text-muted">{e.container_name}</td>
                <td className="px-6 py-4">{new Date(e.started_at).toLocaleTimeString()}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleKill(e.container_name)} className="text-danger hover:text-white hover:bg-danger px-3 py-1 rounded transition border border-danger/40 text-sm font-medium">
                    Kill
                  </button>
                </td>
              </tr>
            ))}
            {envs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-muted italic">No live environments right now.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
