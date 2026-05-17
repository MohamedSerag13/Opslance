import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import LabCard from '../components/LabCard';
import { useNavigate, Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, logout } = useAuthStore();
  const [labs, setLabs] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const res = await api.get('/labs');
        setLabs(res.data);
      } catch (err) {}
    };
    fetchLabs();
  }, []);

  const completed = labs.filter(l => l.status === 'done').length;
  const totalScore = labs.reduce((acc, curr) => acc + (curr.score || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.full_name}</h1>
          <p className="text-gray-600 mt-1">Your Dashboard</p>
        </div>
        <div className="flex gap-4">
          <Link to="/progress" className="text-blue-600 hover:underline">My Progress</Link>
          <Link to="/leaderboard" className="text-blue-600 hover:underline">Leaderboard</Link>
          <button onClick={logout} className="text-red-600 hover:underline">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Labs Completed</p>
          <p className="text-3xl font-bold text-gray-900">{completed} / {labs.length}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${labs.length ? (completed/labs.length)*100 : 0}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total Score</p>
          <p className="text-3xl font-bold text-blue-600">{totalScore}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Your Labs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {labs.map(lab => (
          <LabCard 
            key={lab.id} 
            lab={lab} 
            onClick={() => navigate(`/labs/${lab.id}`)} 
          />
        ))}
        {labs.length === 0 && <p className="text-gray-500 col-span-3">No labs assigned to your group yet.</p>}
      </div>
    </div>
  );
}
