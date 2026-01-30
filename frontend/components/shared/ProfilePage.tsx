'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { User, Mail, Briefcase, Calendar, Save, Edit, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ProfilePage ({ allowedRole }: { allowedRole: 'admin' | 'sales' | 'intern' }) {
  const { profile, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    role: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setEditedProfile({
        full_name: profile.full_name,
        role: profile.role,
      });
      setLoading(false);
    }
  }, [profile]);

  const handleSave = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editedProfile.full_name,
      })
      .eq('id', profile!.id);

    if (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } else {
      toast.success('Profile updated successfully');
      setEditing(false);
      window.location.reload(); // Refresh to get updated profile
    }
  };

  if (loading || !profile) {
    return (
      <DashboardLayout allowedRoles={[allowedRole]}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={[allowedRole]}>
      <Toaster position="top-right" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account information</p>
        </div>

        <div className="max-w-3xl">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditedProfile({
                        full_name: profile.full_name,
                        role: profile.role,
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Avatar Placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{profile.full_name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{profile.role}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedProfile.full_name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-900">
                      <User className="w-4 h-4 text-gray-400" />
                      {profile.full_name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {user?.email}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="capitalize text-gray-900">{profile.role}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Status
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      profile.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {profile.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                </div>

                {profile.last_activity_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Activity
                    </label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(profile.last_activity_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">User ID</span>
                <span className="text-gray-900 font-mono text-sm">{profile.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Role</span>
                <span className="text-gray-900 capitalize font-semibold">{profile.role}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Status</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  profile.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profile.status}
                </span>
              </div>
              {profile.salary && allowedRole === 'admin' && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Salary</span>
                  <span className="text-gray-900 font-semibold">${profile.salary.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
