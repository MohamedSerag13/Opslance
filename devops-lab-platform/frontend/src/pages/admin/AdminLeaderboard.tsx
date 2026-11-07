import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface StudentListOut {
  id: string;
  full_name: string;
  email: string;
  group_name?: string | null;
  total_score?: number;
  xp?: number;
  level?: number;
  subscription_tier?: string;
  is_active?: boolean;
}

export default function AdminLeaderboard() {
  const [students, setStudents] = useState<StudentListOut[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Points Modal State
  const [showPointsModal, setShowPointsModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<StudentListOut | null>(null);
  const [newXP, setNewXP] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [pointsLoading, setPointsLoading] = useState<boolean>(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data);
    } catch (err) {
      alert('Failed to fetch students data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Sort by score and assign overall ranks
  const sortedStudents = [...students].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  const rankedStudents = sortedStudents.map((s, index) => ({ ...s, rank: index + 1 }));

  // Collect unique group names
  const uniqueGroups = Array.from(
    new Set(students.map(s => s.group_name || 'Ungrouped'))
  ).filter(Boolean);

  // Filter based on selected group dropdown
  const filteredStudents = selectedGroup === 'All'
    ? rankedStudents
    : rankedStudents.filter(s => (s.group_name || 'Ungrouped') === selectedGroup);

  // Compute stat metrics
  const totalStudents = filteredStudents.length;
  const highestScore = filteredStudents.reduce((max, s) => Math.max(max, s.total_score || 0), 0);
  const averageScore = totalStudents > 0
    ? Math.round((filteredStudents.reduce((sum, s) => sum + (s.total_score || 0), 0) / totalStudents) * 10) / 10
    : 0;

  const handleExport = () => {
    const data = filteredStudents.map(s => ({
      'Full Name': s.full_name,
      'Email': s.email,
      'Group': s.group_name || 'Ungrouped',
      'Score': s.total_score || 0,
      'XP': s.xp || 0,
      'Status': s.is_active ? 'Active' : 'Inactive',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `leaderboard-export-${dateStr}.xlsx`);
  };

  const handleSavePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (newXP < 0) {
      alert('XP value must be greater than or equal to 0');
      return;
    }
    setPointsLoading(true);
    try {
      const res = await api.patch(`/admin/students/${editingStudent.id}/points`, { xp: newXP, reason });
      setStudents(students.map(s => s.id === editingStudent.id ? { ...s, xp: res.data.xp, level: res.data.level } : s));
      setShowPointsModal(false);
      setEditingStudent(null);
      setReason('');
    } catch (err: any) {
      alert('Failed to update points: ' + (err.response?.data?.detail || err.message));
    } finally {
      setPointsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-primary-strong mb-4 inline-block">← Dashboard</Link>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Leaderboard 🏆</h1>
        <div className="flex gap-2">
          <button 
            onClick={fetchStudents} 
            disabled={loading}
            className="bg-surface-2 hover:bg-surface-2 text-content px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={handleExport} 
            className="bg-success hover:bg-success text-white px-4 py-2 rounded font-medium"
          >
            Export View
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface p-6 rounded-xl shadow border">
          <p className="text-sm text-muted font-medium">Total Students</p>
          <p className="text-3xl font-bold">{totalStudents}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl shadow border">
          <p className="text-sm text-muted font-medium">Highest Score</p>
          <p className="text-3xl font-bold">{highestScore} pts</p>
        </div>
        <div className="bg-surface p-6 rounded-xl shadow border">
          <p className="text-sm text-muted font-medium">Average Score</p>
          <p className="text-3xl font-bold">{averageScore} pts</p>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-surface shadow rounded-lg border">
        <div className="p-4 border-b flex justify-between items-center bg-surface-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-content">Filter by Group:</span>
            <select 
              value={selectedGroup} 
              onChange={e => setSelectedGroup(e.target.value)} 
              className="border p-1.5 rounded text-sm bg-surface"
            >
              <option value="All">All Groups</option>
              {uniqueGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-2">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider w-20">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">XP (Level)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {filteredStudents.map(s => (
              <tr key={s.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                    s.rank === 1 ? 'bg-warn text-warn' :
                    s.rank === 2 ? 'bg-border text-content' :
                    s.rank === 3 ? 'bg-orange-300 text-orange-900' : 'bg-surface-2 text-muted'
                  }`}>
                    {s.rank}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-content">
                  {s.full_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-muted">
                  {s.group_name || 'Ungrouped'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-primary-strong">
                  {s.total_score || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-muted">
                  {s.xp || 0} (Lvl {s.level || 1})
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => {
                      setEditingStudent(s);
                      setNewXP(s.xp || 0);
                      setShowPointsModal(true);
                    }}
                    className="text-primary-strong hover:text-primary-strong mr-4"
                  >
                    Edit Points
                  </button>
                  <Link to={`/admin/students/${s.id}`} className="text-muted hover:text-content hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Points Modal */}
      {showPointsModal && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface p-6 rounded-lg w-96 max-w-full">
            <h2 className="text-xl font-bold mb-4 font-sans text-content">Edit Points</h2>
            <p className="text-sm text-muted mb-4">Editing points for <span className="font-semibold">{editingStudent.full_name}</span></p>
            <form onSubmit={handleSavePoints} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-content">New XP Value</label>
                <input 
                  type="number" 
                  min={0}
                  className="w-full border p-2 rounded focus:ring-1 focus:ring-primary focus:outline-none" 
                  value={newXP}
                  onChange={e => setNewXP(parseInt(e.target.value) || 0)}
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-content">Reason (Optional)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded focus:ring-1 focus:ring-primary focus:outline-none" 
                  placeholder="e.g. Activity bonus"
                  value={reason}
                  onChange={e => setReason(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPointsModal(false);
                    setEditingStudent(null);
                  }} 
                  className="px-4 py-2 border rounded text-muted hover:bg-surface-2"
                  disabled={pointsLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-strong disabled:opacity-50 font-medium"
                  disabled={pointsLoading}
                >
                  {pointsLoading ? 'Saving...' : 'Save XP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
