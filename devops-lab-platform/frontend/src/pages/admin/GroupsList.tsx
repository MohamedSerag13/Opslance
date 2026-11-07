import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';

export default function GroupsList() {
  const [groups, setGroups] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const fetchGroups = async () => {
    const res = await api.get('/admin/groups');
    setGroups(res.data);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/groups', { name, description: desc });
      setShowModal(false);
      setName(''); setDesc('');
      fetchGroups();
    } catch (err) {
      alert('Failed to create group');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? Students will be unassigned.')) return;
    try {
      await api.delete(`/admin/groups/${id}`);
      fetchGroups();
    } catch (err) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-primary-strong mb-4 inline-block">← Dashboard</Link>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Groups</h1>
        <button onClick={() => setShowModal(true)} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-strong">
          + New Group
        </button>
      </div>

      <div className="bg-surface shadow rounded-lg border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Students</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.map(g => (
              <tr key={g.id}>
                <td className="px-6 py-4 font-medium">{g.name}</td>
                <td className="px-6 py-4">{g.student_count}</td>
                <td className="px-6 py-4">{new Date(g.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 flex gap-4">
                  <Link to={`/admin/groups/${g.id}`} className="text-primary-strong">View/Edit</Link>
                  <button onClick={() => handleDelete(g.id)} className="text-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-surface p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">New Group</h2>
            <form onSubmit={handleCreate}>
              <input 
                className="w-full border p-2 mb-4 rounded" 
                placeholder="Group Name" 
                value={name} onChange={e => setName(e.target.value)} required 
              />
              <textarea 
                className="w-full border p-2 mb-4 rounded" 
                placeholder="Description" 
                value={desc} onChange={e => setDesc(e.target.value)} 
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-muted border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
