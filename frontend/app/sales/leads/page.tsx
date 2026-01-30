'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Phone, Mail, MapPin, DollarSign,
  Calendar, User, TrendingUp, Edit2, Trash2, Eye, X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location: string | null;
  status: string;
  source: string | null;
  estimated_value: number | null;
  next_followup_at: string | null;
  assigned_to: string | null;
  created_at: string;
  created_by: string | null;
}

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newLead, setNewLead] = useState({
    business_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    location: '',
    source: '',
    estimated_value: '',
    notes: '',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter]);

  const fetchLeads = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Sales can see leads assigned to them
    const { data, error } = await supabase
      .from('leads')
      .select('id, business_name, contact_name, contact_phone, contact_email, location, status, source, estimated_value, next_followup_at, assigned_to, created_at, created_by')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      toast.error('Failed to load leads');
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  };

  const handleCreateLead = async () => {
    if (!newLead.business_name) {
      toast.error('Business name is required');
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('leads')
      .insert({
        ...newLead,
        estimated_value: newLead.estimated_value ? parseFloat(newLead.estimated_value) : null,
        assigned_to: user?.id,
        created_by: user?.id,
        status: 'new',
      });

    if (error) {
      toast.error('Failed to create lead');
      console.error(error);
    } else {
      toast.success('Lead created successfully!');
      setShowCreateModal(false);
      setNewLead({
        business_name: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        location: '',
        source: '',
        estimated_value: '',
        notes: '',
      });
      fetchLeads();
    }
  };

  const handleDeleteLead = async (id: string, businessName: string) => {
    if (!confirm(`Are you sure you want to delete lead "${businessName}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete lead');
      console.error(error);
    } else {
      toast.success('Lead deleted successfully!');
      fetchLeads();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 border-blue-300',
      contacted: 'bg-purple-100 text-purple-800 border-purple-300',
      qualified: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      proposal_sent: 'bg-orange-100 text-orange-800 border-orange-300',
      closed_won: 'bg-green-100 text-green-800 border-green-300',
      closed_lost: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['sales', 'admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-16 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-[400px] bg-gray-200 rounded-lg w-full"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['sales', 'admin']}>
      <Toaster position="top-right" />
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Leads</h1>
            <p className="text-gray-600 mt-1">Manage your assigned leads</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Lead
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
            <p className="text-sm text-blue-700 mb-1">New</p>
            <p className="text-2xl font-bold text-blue-900">
              {leads.filter(l => l.status === 'new').length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
            <p className="text-sm text-yellow-700 mb-1">Qualified</p>
            <p className="text-2xl font-bold text-yellow-900">
              {leads.filter(l => l.status === 'qualified').length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
            <p className="text-sm text-green-700 mb-1">Won</p>
            <p className="text-2xl font-bold text-green-900">
              {leads.filter(l => l.status === 'closed_won').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>
        </div>

        {/* Leads Grid */}
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first lead to get started'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Lead
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{lead.business_name}</h3>
                    {lead.contact_name && (
                      <p className="text-sm text-gray-600">{lead.contact_name}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(lead.status)}`}>
                    {lead.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {lead.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {lead.contact_phone}
                    </div>
                  )}
                  {lead.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {lead.contact_email}
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {lead.location}
                    </div>
                  )}
                  {lead.estimated_value && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Est. ${lead.estimated_value.toLocaleString()}
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      Source: {lead.source}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Link
                      href={`/sales/leads/${lead.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {/* Only admins can delete leads */}
                    {false && (
                      <button
                        onClick={() => handleDeleteLead(lead.id, lead.business_name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create New Lead</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={newLead.business_name}
                  onChange={(e) => setNewLead({ ...newLead, business_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC Company"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={newLead.contact_name}
                  onChange={(e) => setNewLead({ ...newLead, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newLead.contact_phone}
                  onChange={(e) => setNewLead({ ...newLead, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newLead.contact_email}
                  onChange={(e) => setNewLead({ ...newLead, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="contact@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newLead.location}
                  onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="New York, USA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select source...</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="email">Email</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
                <input
                  type="number"
                  value={newLead.estimated_value}
                  onChange={(e) => setNewLead({ ...newLead, estimated_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="5000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateLead}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Lead
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
    </DashboardLayout>
  );
}
