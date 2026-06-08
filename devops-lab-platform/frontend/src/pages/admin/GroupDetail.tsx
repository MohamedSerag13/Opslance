import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState<any>(null);
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [challengeMode, setChallengeMode] = useState(false);
  const [helpQueue, setHelpQueue] = useState<any[]>([]);

  useEffect(() => {
    fetchGroup();
  }, [id]);

  const fetchGroup = async () => {
    try {
      const gRes = await api.get(`/admin/groups/${id}`);
      setGroup(gRes.data);
      const sRes = await api.get(`/admin/students?group_id=${id}`);
      setStudents(sRes.data);
      const lRes = await api.get(`/admin/groups/${id}/labs`);
      setLabs(lRes.data);
      const cRes = await api.get(`/gamification/challenge_mode/${id}`);
      setChallengeMode(cRes.data.active);
      const hRes = await api.get(`/sessions/group/${id}/help`);
      setHelpQueue(hRes.data);
    } catch (e) {}
  };

  const resolveHelp = async (studentId: string) => {
    try {
      await api.delete(`/sessions/group/${id}/help/${studentId}`);
      setHelpQueue(helpQueue.filter(h => h.student_id !== studentId));
    } catch (e) {}
  };

  const toggleChallengeMode = async () => {
    const newState = !challengeMode;
    try {
      await api.post(`/gamification/challenge_mode?active=${newState}&group_id=${id}`);
      setChallengeMode(newState);
      if (newState) {
        alert("Challenge Mode Activated! Leaderboard is now frozen.");
      } else {
        alert("Challenge Mode Deactivated! Leaderboard revealed.");
      }
    } catch (e) {
      alert("Failed to toggle challenge mode");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/groups/${id}`, editData);
      setGroup({ ...group, ...editData });
      setIsEditing(false);
    } catch (err: any) {
      alert("Failed to update group: " + (err.response?.data?.detail || err.message));
    }
  };

  const toggleLab = async (labId: string, currentVal: boolean, currentOrder: number) => {
    try {
      await api.put(`/admin/groups/${id}/labs/${labId}`, { is_visible: !currentVal, unlock_order: currentOrder });
      setLabs(labs.map(l => l.lab_id === labId ? { ...l, is_visible: !currentVal } : l));
    } catch (e) {}
  };

  const showAll = async () => {
    await api.post(`/admin/groups/${id}/labs/show-all`);
    fetchGroup();
  };
  
  const hideAll = async () => {
    await api.post(`/admin/groups/${id}/labs/hide-all`);
    fetchGroup();
  };

  if (!group) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin/groups" className="text-blue-600 mb-4 inline-block">← Groups List</Link>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="text-gray-600 mt-1">{group.description}</p>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={toggleChallengeMode}
            className={`px-4 py-2 border rounded font-medium flex items-center gap-2 ${challengeMode ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'}`}
          >
            {challengeMode ? '🛑 End Challenge Mode' : '⚡ Start Challenge Mode'}
          </button>
          <button 
            onClick={() => {
              setEditData({ name: group.name, description: group.description || '' });
              setIsEditing(true);
            }} 
            className="px-4 py-2 border text-gray-700 hover:bg-gray-50 rounded font-medium"
          >
            Edit Group
          </button>
        </div>
      </div>

      <div className="flex border-b mb-6">
        <button onClick={() => setTab('students')} className={`px-4 py-2 font-medium border-b-2 ${tab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
          Students ({students.length})
        </button>
        <button onClick={() => setTab('labs')} className={`px-4 py-2 font-medium border-b-2 ${tab === 'labs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
          Labs Configuration
        </button>
        <button onClick={() => setTab('help')} className={`px-4 py-2 font-medium border-b-2 ${tab === 'help' ? 'border-yellow-600 text-yellow-600' : 'border-transparent text-gray-500'}`}>
          Help Queue {helpQueue.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{helpQueue.length}</span>}
        </button>
      </div>

      {tab === 'students' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link to="/admin/students" className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Student</Link>
          </div>
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-4">{s.full_name}</td>
                    <td className="px-6 py-4">{s.email}</td>
                    <td className="px-6 py-4"><Link to={`/admin/students/${s.id}`} className="text-blue-600">View</Link></td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={3} className="px-6 py-4 text-center">No students in group</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'labs' && (
        <div>
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <p className="text-gray-600 text-sm">Toggle visibility to show/hide labs for this group.</p>
            <div className="gap-2 flex">
              <button onClick={showAll} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">Show All</button>
              <button onClick={hideAll} className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">Hide All</button>
            </div>
          </div>
          <div className="bg-white border rounded-lg shadow-sm">
            {labs.map((l, idx) => (
              <div key={l.lab_id} className="flex justify-between items-center p-4 border-b last:border-0 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 w-6 cursor-move text-center">↕</span>
                  <div>
                    <div className="text-sm text-gray-500">Module {l.module_number} • <span className="capitalize">{l.difficulty}</span></div>
                    <div className="font-bold">{l.title}</div>
                  </div>
                </div>
                <div>
                  <button 
                    onClick={() => toggleLab(l.lab_id, l.is_visible, l.unlock_order)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${l.is_visible ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${l.is_visible ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'help' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Live Help Queue</h2>
          {helpQueue.length === 0 ? (
            <div className="bg-white border rounded-lg shadow-sm p-8 text-center text-gray-500">
              No students currently requesting help.
            </div>
          ) : (
            <div className="space-y-4">
              {helpQueue.map(h => (
                <div key={h.student_id} className="bg-white border rounded-lg shadow-sm p-4 flex justify-between items-center border-l-4 border-l-yellow-400">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{h.student_name}</h3>
                    <p className="text-sm text-gray-600">Lab: {h.lab_title}</p>
                    <p className="text-xs text-gray-400 mt-1">Requested at {new Date(h.requested_at * 1000).toLocaleTimeString()}</p>
                  </div>
                  <button onClick={() => resolveHelp(h.student_id)} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded font-bold hover:bg-green-100">
                    Mark Resolved
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full">
            <h2 className="text-xl font-bold mb-4">Edit Group</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Group Name</label>
                <input className="w-full border p-2 rounded" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full border p-2 rounded" rows={3} value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
