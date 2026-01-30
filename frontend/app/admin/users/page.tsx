'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, DollarSign, Activity, Plus, Edit2, Ban, CheckCircle, 
  XCircle, Save, X, Mail, Briefcase, Shield, Search, Filter, GraduationCap
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Select from '@/components/ui/Select';

interface User {
  id: string;
  full_name: string;
  role: string;
  status: string;
  salary: number | null;
  created_at: string;
  last_activity_at: string | null;
  auto_logout_minutes: number | null;
  email?: string;
  password?: string; // For password reset
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'intern',
    salary: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    const supabase = createClient();
    
    // Get users with their emails from profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AdminUsers] Error fetching users:', error);
      toast.error('Failed to load users');
      setLoading(false);
      return;
    }

    setUsers(profiles || []);
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    const supabase = createClient();
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Create profile with email
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: newUser.full_name,
          email: newUser.email, // Store email in profiles table
          role: newUser.role,
          status: 'active',
          salary: newUser.salary ? parseFloat(newUser.salary) : null,
          auto_logout_minutes: 30, // Default to 30 minutes
        });

      if (profileError) throw profileError;

      toast.success('User created successfully!');
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'intern', salary: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const supabase = createClient();
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editingUser.full_name,
          role: editingUser.role,
          status: editingUser.status,
          salary: editingUser.salary,
          auto_logout_minutes: editingUser.auto_logout_minutes,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (editingUser.password && editingUser.password.length >= 6) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          editingUser.id,
          { password: editingUser.password }
        );

        if (passwordError) throw passwordError;
      }

      toast.success(editingUser.password ? 'User and password updated successfully!' : 'User updated successfully!');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
      console.error(error);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    const supabase = createClient();
    
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`User ${newStatus === 'banned' ? 'banned' : 'activated'} successfully!`);
      fetchUsers();
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 border-red-300',
      sales: 'bg-blue-100 text-blue-800 border-blue-300',
      intern: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 border-green-300',
      suspended: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      banned: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <Toaster position="top-right" />
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all users, roles, and permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
            <p className="text-sm text-red-700 mb-1">Admins</p>
            <p className="text-2xl font-bold text-red-900">
              {users.filter(u => u.role === 'admin').length}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
            <p className="text-sm text-blue-700 mb-1">Sales</p>
            <p className="text-2xl font-bold text-blue-900">
              {users.filter(u => u.role === 'sales').length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
            <p className="text-sm text-green-700 mb-1">Interns</p>
            <p className="text-2xl font-bold text-green-900">
              {users.filter(u => u.role === 'intern').length}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-200">
            <p className="text-sm text-purple-700 mb-1">Active</p>
            <p className="text-2xl font-bold text-purple-900">
              {users.filter(u => u.status === 'active').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Roles' },
                { 
                  value: 'admin', 
                  label: 'Admin',
                  icon: <Shield className="w-4 h-4" />
                },
                { 
                  value: 'sales', 
                  label: 'Sales',
                  icon: <Briefcase className="w-4 h-4" />
                },
                { 
                  value: 'intern', 
                  label: 'Intern',
                  icon: <GraduationCap className="w-4 h-4" />
                },
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="Filter by role"
            />
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { 
                  value: 'active', 
                  label: 'Active',
                  icon: <CheckCircle className="w-4 h-4" />
                },
                { 
                  value: 'suspended', 
                  label: 'Suspended',
                  icon: <XCircle className="w-4 h-4" />
                },
                { 
                  value: 'banned', 
                  label: 'Banned',
                  icon: <Ban className="w-4 h-4" />
                },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter by status"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Salary
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Last Activity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(user.status)}`}>
                      {user.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.salary ? (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-gray-900">
                          {user.salary.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.last_activity_at ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span>{new Date(user.last_activity_at).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-2 rounded-lg ${
                          user.status === 'active'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={user.status === 'active' ? 'Ban user' : 'Activate user'}
                      >
                        {user.status === 'active' ? (
                          <Ban className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="intern">Intern</option>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary (optional)
                </label>
                <input
                  type="number"
                  value={newUser.salary}
                  onChange={(e) => setNewUser({ ...newUser, salary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Create User
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="intern">Intern</option>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary
                </label>
                <input
                  type="number"
                  value={editingUser.salary || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, salary: parseFloat(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto Logout (Minutes)
                </label>
                <input
                  type="number"
                  value={editingUser.auto_logout_minutes || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, auto_logout_minutes: parseInt(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minutes of inactivity before logging out.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reset Password (optional)
                </label>
                <input
                  type="password"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty to keep current password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter new password (min. 6 characters) or leave empty to keep current
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
