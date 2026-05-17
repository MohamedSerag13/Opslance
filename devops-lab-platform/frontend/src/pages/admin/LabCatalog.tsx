import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';

export default function LabCatalog() {
  const [labs, setLabs] = useState<any[]>([]);

  const fetchLabs = async () => {
    try {
      const res = await api.get('/admin/labs');
      setLabs(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleSync = async () => {
    try {
      const res = await api.post('/admin/labs/sync');
      alert(`Sync Complete: ${res.data.added} added, ${res.data.updated} updated.`);
      fetchLabs();
    } catch (err) {
      alert('Sync failed. Make sure labs-repo/ is populated and mounted.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-blue-600 mb-4 inline-block">← Dashboard</Link>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lab Catalog</h1>
        <button onClick={handleSync} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
          Sync Labs from Filesystem
        </button>
      </div>

      <div className="bg-white shadow rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time (m)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {labs.map(l => (
              <tr key={l.id}>
                <td className="px-6 py-4">{l.module_number}</td>
                <td className="px-6 py-4 font-medium">{l.title}</td>
                <td className="px-6 py-4 capitalize">{l.difficulty}</td>
                <td className="px-6 py-4">{l.points}</td>
                <td className="px-6 py-4">{l.estimated_minutes}</td>
              </tr>
            ))}
            {labs.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center">No labs found. Try syncing.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
