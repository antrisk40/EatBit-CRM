'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Briefcase, Phone, Mail, MapPin, DollarSign, Calendar, Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  location: string | null;
  status: string;
  contract_value: number | null;
  onboarded_at: string;
  managed_by: string | null;
  manager?: {
    full_name: string;
  };
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const supabase = createClient();
      
      // Check session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('No valid session:', sessionError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          manager:profiles!clients_managed_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        // Check if it's an auth error
        if (error.message?.includes('JWT') || error.message?.includes('token') || error.message?.includes('expired') || error.status === 401) {
          // Try to refresh session
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            // If refresh fails, sign out
            await supabase.auth.signOut();
            window.location.href = '/login';
            return;
          }
          // Retry once after refresh
          const { data: retryData, error: retryError } = await supabase
            .from('clients')
            .select(`
              *,
              manager:profiles!clients_managed_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false });
          if (retryError) {
            console.error('Error fetching clients after refresh:', retryError);
          } else {
            setClients(retryData || []);
          }
        }
      } else {
        setClients(data || []);
      }
    } catch (error: any) {
      console.error('Unexpected error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.primary_contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'churned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clients</h1>
          <p className="text-gray-600">Manage all your clients</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {clients.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {clients.filter(c => c.status === 'completed').length}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${clients.reduce((sum, c) => sum + (c.contract_value || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by company name, contact, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Clients will appear here when leads are won'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Onboarded
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4">
                        <Link href={`/admin/clients/${client.id}`}>
                          <div>
                            <div className="font-semibold text-gray-900">{client.company_name}</div>
                            {client.location && (
                              <div className="text-sm text-gray-500 flex items-center mt-1">
                                <MapPin className="w-3 h-3 mr-1" />
                                {client.location}
                              </div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {client.primary_contact_name && (
                            <div className="font-medium text-gray-900">{client.primary_contact_name}</div>
                          )}
                          {client.primary_contact_email && (
                            <div className="text-gray-500 flex items-center mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              {client.primary_contact_email}
                            </div>
                          )}
                          {client.primary_contact_phone && (
                            <div className="text-gray-500 flex items-center mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              {client.primary_contact_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {client.manager?.full_name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {client.contract_value ? `$${client.contract_value.toLocaleString()}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(client.onboarded_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
