'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LeadWithRelations } from '@/lib/types/database';
import { formatDate, formatCurrency } from '@/lib/utils/helpers';
import { Search, Calendar, TrendingUp } from 'lucide-react';

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<LeadWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          created_by_profile:profiles!leads_created_by_fkey(full_name, role)
        `)
        .eq('assigned_to', user.id)
        .order('next_followup_at', { ascending: true, nullsFirst: false });

      if (error) throw error;

      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) =>
    lead.business_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingFollowups = leads.filter(
    (l) => l.next_followup_at && new Date(l.next_followup_at) >= new Date()
  ).length;

  const totalValue = leads
    .filter((l) => ['qualified', 'proposal_sent'].includes(l.status))
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['sales']}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['sales']}>
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">My Leads</h2>
          <p className="text-gray-600 mt-1">Manage your assigned leads</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-md">
            <p className="text-sm text-gray-600 mb-1">Total Assigned</p>
            <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl shadow-md border border-green-200">
            <p className="text-sm text-green-700 mb-1">Won Deals</p>
            <p className="text-2xl font-bold text-green-900">
              {leads.filter((l) => l.status === 'closed_won').length}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl shadow-md border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-700">Upcoming Follow-ups</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{upcomingFollowups}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl shadow-md border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-purple-700">Pipeline Value</p>
            </div>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Leads Table */}
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No assigned leads found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                    Next Follow-up
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
                    onClick={() => window.location.href = `/sales/leads/${lead.id}`}
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
                        {lead.contact_name && <p className="text-gray-900">{lead.contact_name}</p>}
                        {lead.contact_phone && (
                          <p className="text-gray-600">{lead.contact_phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4">
                      {lead.next_followup_at ? (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {formatDate(lead.next_followup_at)}
                          </p>
                          {lead.followup_note && (
                            <p className="text-gray-600 truncate max-w-xs">
                              {lead.followup_note}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(lead.estimated_value)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>
    </DashboardLayout>
  );
}
