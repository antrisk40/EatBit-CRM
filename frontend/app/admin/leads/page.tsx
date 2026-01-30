'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LeadWithRelations, LeadStatus } from '@/lib/types/database';
import { formatDate, formatCurrency, getStatusLabel } from '@/lib/utils/helpers';
import { Search, Filter, Calendar, DollarSign, Circle, Phone, CheckCircle, FileText, Trophy, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from '@/components/ui/Select';

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          business_name,
          contact_name,
          contact_phone,
          location,
          status,
          proposed_status,
          next_followup_at,
          estimated_value,
          created_at,
          updated_at,
          assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, role),
          created_by_profile:profiles!leads_created_by_fkey(id, full_name, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to ensure relationship objects are not arrays (if Supabase returns them as such)
      const mappedData = (data || []).map(lead => ({
        ...lead,
        assigned_to_profile: Array.isArray(lead.assigned_to_profile) ? lead.assigned_to_profile[0] : lead.assigned_to_profile,
        created_by_profile: Array.isArray(lead.created_by_profile) ? lead.created_by_profile[0] : lead.created_by_profile,
      }));

      setLeads(mappedData as any);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.business_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions: (LeadStatus | 'all')[] = [
    'all',
    'new',
    'contacted',
    'qualified',
    'proposal_sent',
    'closed_won',
    'closed_lost',
  ];

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">All Leads</h2>
            <p className="text-gray-600 mt-1">Manage and review all leads in the system</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-md">
            <p className="text-sm text-gray-600 mb-1">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl shadow-md border border-green-200">
            <p className="text-sm text-green-700 mb-1">Won</p>
            <p className="text-2xl font-bold text-green-900">
              {leads.filter((l) => l.status === 'closed_won').length}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl shadow-md border border-blue-200">
            <p className="text-sm text-blue-700 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-900">
              {leads.filter((l) => ['contacted', 'qualified', 'proposal_sent'].includes(l.status)).length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl shadow-md border border-yellow-200">
            <p className="text-sm text-yellow-700 mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-900">
              {leads.filter((l) => l.proposed_status !== null).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search leads by business name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <Select
            options={[
              { value: 'all', label: 'All Statuses', icon: <Filter className="w-4 h-4" /> },
              { value: 'new', label: 'New', icon: <Circle className="w-4 h-4" /> },
              { value: 'contacted', label: 'Contacted', icon: <Phone className="w-4 h-4" /> },
              { value: 'qualified', label: 'Qualified', icon: <CheckCircle className="w-4 h-4" /> },
              { value: 'proposal_sent', label: 'Proposal Sent', icon: <FileText className="w-4 h-4" /> },
              { value: 'closed_won', label: 'Closed Won', icon: <Trophy className="w-4 h-4" /> },
              { value: 'closed_lost', label: 'Closed Lost', icon: <XCircle className="w-4 h-4" /> },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as LeadStatus | 'all')}
            placeholder="Filter by status"
          />
        </div>

        {/* Leads Table */}
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No leads found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Follow-up
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/admin/leads/${lead.id}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{lead.business_name}</p>
                          {lead.location && (
                            <p className="text-sm text-gray-600">{lead.location}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {lead.contact_name && (
                            <p className="text-gray-900">{lead.contact_name}</p>
                          )}
                          {lead.contact_phone && (
                            <p className="text-gray-600">{lead.contact_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={lead.status} />
                        {lead.proposed_status && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full border border-yellow-300">
                              → {getStatusLabel(lead.proposed_status)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.assigned_to_profile ? (
                          <div className="text-sm">
                            <p className="text-gray-900">{lead.assigned_to_profile.full_name}</p>
                            <p className="text-gray-500 text-xs">{lead.assigned_to_profile.role}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.next_followup_at ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(lead.next_followup_at)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(lead.estimated_value)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>
    </DashboardLayout>
  );
}
