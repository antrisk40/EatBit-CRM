'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  Shield, 
  User, 
  FileText, 
  Briefcase, 
  Folder, 
  Database, 
  Plus, 
  Trash2, 
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface DataAccess {
  id: string;
  user_id: string;
  resource_type: 'lead' | 'client' | 'project' | 'raw_data';
  resource_id: string;
  access_level: 'view' | 'edit' | 'full';
  granted_at: string;
  profiles: {
    full_name: string;
  };
}

export default function AdminAccessPage() {
  const [accessList, setAccessList] = useState<DataAccess[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newAccess, setNewAccess] = useState({
    user_id: '',
    resource_type: 'lead' as any,
    resource_id: '',
    access_level: 'view' as any
  });

  const [resources, setResources] = useState<any[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (showAddModal && newAccess.resource_type) {
      fetchResources();
    }
  }, [showAddModal, newAccess.resource_type]);

  const fetchInitialData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      // Fetch all access rules
      const { data: accessData, error: accessError } = await supabase
        .from('data_access')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .order('granted_at', { ascending: false });

      // Fetch all users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');

      if (accessError) {
        console.error('[Access Control] Error fetching access data:', accessError);
        // Check if table doesn't exist
        if (accessError.message?.includes('relation') || accessError.message?.includes('does not exist')) {
          toast.error('Data access table not found. This feature requires the complete-pipeline-system.sql to be run.');
        } else {
          toast.error('Failed to load access data');
        }
        setAccessList([]);
      } else {
        setAccessList(accessData || []);
      }

      if (userError) {
        console.error('[Access Control] Error fetching users:', userError);
        toast.error('Failed to load users');
        setUsers([]);
      } else {
        setUsers(userData || []);
      }
    } catch (error) {
      console.error('[Access Control] Exception in fetchInitialData:', error);
      toast.error('An error occurred while loading data');
      setAccessList([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    setResourceLoading(true);
    const supabase = createClient();
    
    try {
      let query;

      switch (newAccess.resource_type) {
        case 'lead':
          query = supabase.from('leads').select('id, business_name').order('business_name');
          break;
        case 'client':
          query = supabase.from('clients').select('id, company_name').order('company_name');
          break;
        case 'raw_data':
          query = supabase.from('raw_data').select('id, business_name').order('business_name');
          break;
        default:
          setResources([]);
          setResourceLoading(false);
          return;
      }

      const { data, error } = await query;
      
      if (error) {
        console.error(`[Access Control] Error loading ${newAccess.resource_type}:`, error);
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          toast.error(`${newAccess.resource_type} table not found. This feature requires additional database setup.`);
        } else {
          toast.error(`Failed to load ${newAccess.resource_type} resources`);
        }
        setResources([]);
      } else {
        setResources(data || []);
      }
    } catch (error) {
      console.error('[Access Control] Exception in fetchResources:', error);
      toast.error('An error occurred while loading resources');
      setResources([]);
    } finally {
      setResourceLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!newAccess.user_id || !newAccess.resource_id) {
      toast.error('User and Resource are required');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('data_access')
      .insert({
        user_id: newAccess.user_id,
        resource_type: newAccess.resource_type,
        resource_id: newAccess.resource_id,
        access_level: newAccess.access_level
      });

    if (error) {
      toast.error('Failed to grant access');
    } else {
      toast.success('Access granted successfully');
      setShowAddModal(false);
      fetchInitialData();
    }
  };

  const handleRevokeAccess = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this access?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('data_access')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to revoke access');
    } else {
      toast.success('Access revoked');
      fetchInitialData();
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'lead': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'client': return <Briefcase className="w-4 h-4 text-green-600" />;
      case 'raw_data': return <Database className="w-4 h-4 text-purple-600" />;
      case 'project': return <Folder className="w-4 h-4 text-orange-600" />;
      default: return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredAccess = accessList.filter(item => 
    item.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Data Access Control
            </h1>
            <p className="text-gray-600">Manage resource sharing and permissions across the CRM</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Grant New Access
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by user or resource type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Access List Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource ID / Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Access Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Granted At</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAccess.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No access rules found. Click "Grant New Access" to start sharing resources.
                  </td>
                </tr>
              ) : (
                filteredAccess.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        <User className="w-4 h-4 text-gray-400" />
                        {item.profiles.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getResourceIcon(item.resource_type)}
                        <span className="capitalize text-gray-700">{item.resource_type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 truncate max-w-[150px]">
                      {item.resource_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        item.access_level === 'full' ? 'bg-purple-100 text-purple-700' :
                        item.access_level === 'edit' ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.access_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.granted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRevokeAccess(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Access Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-600" />
              Grant Resource Access
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select User</label>
                <select
                  value={newAccess.user_id}
                  onChange={(e) => setNewAccess({ ...newAccess, user_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Choose a user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type</label>
                  <select
                    value={newAccess.resource_type}
                    onChange={(e) => setNewAccess({ ...newAccess, resource_type: e.target.value as any, resource_id: '' })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="lead">Lead</option>
                    <option value="client">Client</option>
                    <option value="raw_data">Raw Data</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Access Level</label>
                  <select
                    value={newAccess.access_level}
                    onChange={(e) => setNewAccess({ ...newAccess, access_level: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="view">View Only</option>
                    <option value="edit">Edit Access</option>
                    <option value="full">Full Control</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select {newAccess.resource_type.replace('_', ' ')}
                </label>
                <div className="relative">
                  {resourceLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  <select
                    value={newAccess.resource_id}
                    onChange={(e) => setNewAccess({ ...newAccess, resource_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    <option value="">Select a resource...</option>
                    {resources.map(res => (
                      <option key={res.id} value={res.id}>
                        {res?.business_name || res?.company_name || 'Unnamed Resource'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={handleGrantAccess}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                Grant Access
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
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
