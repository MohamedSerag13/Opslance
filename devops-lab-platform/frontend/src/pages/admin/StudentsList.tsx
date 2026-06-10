import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function StudentsList() {
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', group_id: '' });
  
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchStudents = async () => {
    const res = await api.get('/admin/students');
    setStudents(res.data);
  };
  const fetchGroups = async () => {
    const res = await api.get('/admin/groups');
    setGroups(res.data);
  };

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.group_id) {
        (payload as any).group_id = null;
      }
      await api.post('/admin/students', payload);
      setShowModal(false);
      setFormData({ full_name: '', email: '', password: '', group_id: '' });
      fetchStudents();
    } catch (err: any) {
      alert('Failed to create student: ' + (err.response?.data?.detail || err.message));
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['full_name', 'email', 'password', 'group_name'],
      ['Ahmed Ali', 'ahmed@example.com', 'changeme123', 'Group A'],
      ['Sara Hassan', 'sara@example.com', 'changeme123', 'Group B'],
    ]);
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students-import-template.xlsx');
  };

  const exportStudents = async () => {
    setExportLoading(true);
    try {
      const res = await api.get('/admin/students');
      const data = res.data.map((s: any) => ({
        'Full Name': s.full_name,
        'Email': s.email,
        'Group': s.group_name || 'Ungrouped',
        'Score': s.total_score || 0,
        'XP': s.xp || 0,
        'Status': s.is_active ? 'Active' : 'Inactive',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `students-export-${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Export failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return;
    setImportLoading(true);
    const form = new FormData();
    form.append('file', bulkFile);
    try {
      const res = await api.post('/admin/students/bulk', form);
      alert(`Created ${res.data.created} students`);
      setShowBulkModal(false);
      setBulkFile(null);
      fetchStudents();
    } catch (e) {
      alert('Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.delete(`/admin/students/${id}`);
      fetchStudents();
    } catch (err) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-blue-600 mb-4 inline-block">← Dashboard</Link>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Students</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkModal(true)} className="bg-gray-800 text-white px-4 py-2 rounded">Bulk Import</button>
          <button onClick={exportStudents} disabled={exportLoading} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {exportLoading ? 'Exporting...' : 'Export Students'}
          </button>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ New Student</button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map(s => (
              <tr key={s.id}>
                <td className="px-6 py-4 font-medium">{s.full_name}</td>
                <td className="px-6 py-4">{s.email}</td>
                <td className="px-6 py-4">{s.group_name || 'Ungrouped'}</td>
                <td className="px-6 py-4">
                  {s.subscription_tier === 'enterprise' ? (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold uppercase">Enterprise</span>
                  ) : s.subscription_tier === 'pro' ? (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold uppercase">Pro</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold uppercase">Free</span>
                  )}
                </td>
                <td className="px-6 py-4 flex gap-4">
                  <Link to={`/admin/students/${s.id}`} className="text-blue-600 hover:underline">View/Edit</Link>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">New Student</h2>
            <form onSubmit={handleCreate}>
              <input className="w-full border p-2 mb-2 rounded" placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
              <input className="w-full border p-2 mb-2 rounded" type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              <input className="w-full border p-2 mb-2 rounded" type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
              <select className="w-full border p-2 mb-4 rounded" value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})}>
                <option value="">No Group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Bulk Import Excel</h2>
            <button type="button" onClick={downloadTemplate} className="w-full mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 py-2 rounded text-sm hover:bg-indigo-100 font-medium">
              Download Template
            </button>
            <form onSubmit={handleBulkImport}>
              <input type="file" accept=".xlsx,.xls" onChange={e => setBulkFile(e.target.files?.[0] || null)} className="mb-2 w-full border p-2 rounded" required />
              <p className="text-xs text-gray-500 mb-4">Columns required: full_name, email, password, group_name (optional)</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 border rounded" disabled={importLoading}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50" disabled={importLoading}>
                  {importLoading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
