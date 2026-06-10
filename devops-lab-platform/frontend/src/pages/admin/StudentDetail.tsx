import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', email: '', group_id: '', is_active: true });

  // Reset password state
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Edit points state
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [editPointsXP, setEditPointsXP] = useState<number>(0);
  const [editPointsReason, setEditPointsReason] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // Edit plan state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(false);

  // Success Banner State
  const [successBanner, setSuccessBanner] = useState('');

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

  const handleResetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setSuccessBanner('');
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    setResetLoading(true);
    try {
      await api.post(`/admin/students/${id}/reset-password`, { password: newPassword });
      setShowResetModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setSuccessBanner('Password reset successful');
      setTimeout(() => setSuccessBanner(''), 5000);
    } catch (e) {
      setResetError('Reset failed. Try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleEditPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editPointsXP < 0) {
      alert("XP cannot be negative");
      return;
    }
    setPointsLoading(true);
    try {
      const res = await api.patch(`/admin/students/${id}/points`, { xp: editPointsXP, reason: editPointsReason });
      setStudent({ ...student, xp: res.data.xp, level: res.data.level });
      setShowPointsModal(false);
      setEditPointsReason('');
      setSuccessBanner('Points updated successfully');
      setTimeout(() => setSuccessBanner(''), 5000);
    } catch (err: any) {
      alert('Failed to update points: ' + (err.response?.data?.detail || err.message));
    } finally {
      setPointsLoading(false);
    }
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanLoading(true);
    try {
      const res = await api.patch(`/admin/students/${id}/plan`, { plan: selectedPlan });
      setStudent({ ...student, subscription_tier: res.data.plan });
      setShowPlanModal(false);
      setSuccessBanner('Plan updated successfully');
      setTimeout(() => setSuccessBanner(''), 5000);
    } catch (err: any) {
      alert('Failed to update plan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setPlanLoading(false);
    }
  };

  if (!student) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/admin/students" className="text-blue-600 mb-4 inline-block">← Students List</Link>
      
      {successBanner && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{successBanner}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow border mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{student.full_name}</h1>
          <p className="text-gray-600">{student.email}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="bg-gray-100 px-2 py-1 rounded">Joined: {new Date(student.created_at).toLocaleDateString()}</span>
            <span className={student.is_active ? 'bg-green-100 text-green-800 px-2 py-1 rounded font-medium' : 'bg-red-100 text-red-800 px-2 py-1 rounded font-medium'}>
              {student.is_active ? 'Active' : 'Inactive'}
            </span>
            {student.group_id && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">Group ID: {student.group_id}</span>}
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">XP: {student.xp || 0}</span>
            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium">Level: {student.level || 1}</span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Plan:</span>
            {student.subscription_tier === 'enterprise' ? (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold uppercase">Enterprise</span>
            ) : student.subscription_tier === 'pro' ? (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold uppercase">Pro</span>
            ) : (
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold uppercase">Free</span>
            )}
            <button 
              onClick={() => {
                setSelectedPlan(student.subscription_tier || 'free');
                setShowPlanModal(true);
              }}
              className="ml-2 text-sm text-blue-600 hover:underline font-medium"
            >
              Change Plan
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => {
              setEditData({ full_name: student.full_name, email: student.email, group_id: student.group_id || '', is_active: student.is_active });
              setIsEditing(true);
            }} 
            className="px-4 py-2 border text-gray-700 hover:bg-gray-50 rounded font-medium animate-transition"
          >
            Edit Profile
          </button>
          <button 
            onClick={() => {
              setEditPointsXP(student.xp || 0);
              setEditPointsReason('');
              setShowPointsModal(true);
            }}
            className="px-4 py-2 border text-yellow-700 border-yellow-200 hover:bg-yellow-50 rounded font-medium"
          >
            Edit Points
          </button>
          <button 
            onClick={() => {
              setNewPassword('');
              setConfirmPassword('');
              setResetError('');
              setShowResetModal(true);
            }} 
            className="px-4 py-2 border text-red-600 border-red-200 hover:bg-red-50 rounded font-medium"
          >
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

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full">
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            <form onSubmit={handleResetPass} className="space-y-4">
              {resetError && <p className="text-red-600 text-sm font-medium">{resetError}</p>}
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input 
                  className="w-full border p-2 rounded" 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input 
                  className="w-full border p-2 rounded" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  minLength={8}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-gray-600 border rounded" disabled={resetLoading}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50" disabled={resetLoading}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPointsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full">
            <h2 className="text-xl font-bold mb-4">Edit Points</h2>
            <p className="text-sm text-gray-500 mb-4">Current XP: <span className="font-bold text-gray-800">{student.xp || 0}</span></p>
            <form onSubmit={handleEditPoints} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New XP Value</label>
                <input 
                  className="w-full border p-2 rounded" 
                  type="number" 
                  min={0}
                  value={editPointsXP} 
                  onChange={e => setEditPointsXP(parseInt(e.target.value) || 0)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                <input 
                  className="w-full border p-2 rounded" 
                  placeholder="e.g. Extra credit, challenge reward"
                  value={editPointsReason} 
                  onChange={e => setEditPointsReason(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPointsModal(false)} className="px-4 py-2 text-gray-600 border rounded" disabled={pointsLoading}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded disabled:opacity-50" disabled={pointsLoading}>
                  {pointsLoading ? 'Saving...' : 'Save XP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full">
            <h2 className="text-xl font-bold mb-4">Change Plan</h2>
            <form onSubmit={handleEditPlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Subscription Plan</label>
                <select 
                  className="w-full border p-2 rounded bg-white" 
                  value={selectedPlan} 
                  onChange={e => setSelectedPlan(e.target.value)}
                  required
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-gray-600 border rounded" disabled={planLoading}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={planLoading}>
                  {planLoading ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
