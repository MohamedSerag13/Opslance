import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', email: '', group_id: '', is_active: true });

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/admin/students/${id}`);
        setStudent(res.data);
      } catch (e) {}
    };
    
    const fetchGroups = async () => {
      try {
        const res = await api.get('/admin/groups');
        setGroups(res.data);
      } catch (e) {}
    };

    fetchStudent();
    fetchGroups();
  }, [id]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...editData };
      if (payload.group_id === '') payload.group_id = null;
      await api.put(`/admin/students/${id}`, payload);
      setStudent({ ...student, ...payload });
      setIsEditing(false);
    } catch (e: any) {
      alert("Failed to update student: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleResetPass = async () => {
    const newPass = prompt("Enter new password:");
    if (!newPass) return;
    try {
      await api.post(`/admin/students/${id}/reset-password`, { password: newPass });
      alert("Password reset successful");
    } catch (e) {
      alert("Reset failed");
    }
  };

  if (!student) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin/students" className="text-blue-600 mb-4 inline-block">← Students List</Link>
      
      <div className="bg-white p-6 rounded-lg shadow border mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{student.full_name}</h1>
          <p className="text-gray-600">{student.email}</p>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="bg-gray-100 px-2 py-1 rounded">Joined: {new Date(student.created_at).toLocaleDateString()}</span>
            <span className={student.is_active ? 'bg-green-100 text-green-800 px-2 py-1 rounded' : 'bg-red-100 text-red-800 px-2 py-1 rounded'}>
              {student.is_active ? 'Active' : 'Inactive'}
            </span>
            {student.group_id && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Group ID: {student.group_id}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => {
              setEditData({ full_name: student.full_name, email: student.email, group_id: student.group_id || '', is_active: student.is_active });
              setIsEditing(true);
            }} 
            className="px-4 py-2 border text-gray-700 hover:bg-gray-50 rounded font-medium"
          >
            Edit Profile
          </button>
          <button onClick={handleResetPass} className="px-4 py-2 border text-red-600 border-red-200 hover:bg-red-50 rounded font-medium">
            Reset Password
          </button>
        </div>
      </div>
      
      {/* Progress and History sections would go here */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-bold mb-4">Activity History</h2>
        <p className="text-gray-500 italic">Detailed progress and command history API implementation pending in this view.</p>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full">
            <h2 className="text-xl font-bold mb-4">Edit Student</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input className="w-full border p-2 rounded" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full border p-2 rounded" type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Group</label>
                <select className="w-full border p-2 rounded bg-white" value={editData.group_id} onChange={e => setEditData({...editData, group_id: e.target.value})}>
                  <option value="">No Group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={editData.is_active} onChange={e => setEditData({...editData, is_active: e.target.checked})} />
                <label htmlFor="isActive" className="text-sm font-medium">Account is Active</label>
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
