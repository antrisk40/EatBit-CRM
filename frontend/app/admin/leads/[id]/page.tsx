'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Edit, Save, X, Phone, Mail, MapPin, DollarSign, 
  Calendar, Clock, FileText, Upload, CheckCircle, XCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location: string | null;
  source: string | null;
  status: string;
  proposed_status: string | null;
  estimated_value: number | null;
  next_followup_at: string | null;
  followup_note: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  assignee?: { full_name: string };
  creator?: { full_name: string };
}

interface Followup {
  id: string;
  followup_date: string;
  notes: string;
  created_at: string;
  creator?: { full_name: string };
}

export default function AdminLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  
  // Followup form
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [newFollowup, setNewFollowup] = useState({ date: '', notes: '' });

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    const supabase = createClient();
    
    // Fetch lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        business_name,
        contact_name,
        contact_phone,
        contact_email,
        location,
        source,
        status,
        proposed_status,
        estimated_value,
        next_followup_at,
        followup_note,
        assigned_to,
        created_by,
        created_at,
        updated_at,
        notes,
        assignee:profiles!leads_assigned_to_fkey(full_name),
        creator:profiles!leads_created_by_fkey(full_name)
      `)
      .eq('id', params.id as string)
      .single();

    if (leadError) {
      console.error('Error:', leadError);
      toast.error('Lead not found');
      router.push('/admin/leads');
      return;
    }

    const mappedLead = {
      ...leadData,
      assignee: Array.isArray(leadData.assignee) ? leadData.assignee[0] : leadData.assignee,
      creator: Array.isArray(leadData.creator) ? leadData.creator[0] : leadData.creator,
    };
    
    setLead(mappedLead as any);
    setEditedLead(mappedLead as any);

    // Fetch followups
    const { data: followupsData } = await supabase
      .from('lead_followups')
      .select(`
        *,
        creator:profiles!lead_followups_created_by_fkey(full_name)
      `)
      .eq('lead_id', params.id as string)
      .order('followup_date', { ascending: false });

    const mappedFollowups = (followupsData || []).map(f => ({
      ...f,
      creator: Array.isArray(f.creator) ? f.creator[0] : f.creator
    }));
    
    setFollowups(mappedFollowups as any);

    // Fetch users for assignment
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['admin', 'sales'])
      .eq('status', 'active')
      .order('full_name');
    
    setUsers(usersData || []);
    setLoading(false);
  };

  const handleSave = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from('leads')
      .update({
        business_name: editedLead.business_name,
        contact_name: editedLead.contact_name,
        contact_phone: editedLead.contact_phone,
        contact_email: editedLead.contact_email,
        location: editedLead.location,
        source: editedLead.source,
        status: editedLead.status,
        estimated_value: editedLead.estimated_value,
        next_followup_at: editedLead.next_followup_at,
        followup_note: editedLead.followup_note,
        assigned_to: editedLead.assigned_to,
      })
      .eq('id', params.id as string);

    if (error) {
      toast.error('Failed to update lead');
      console.error(error);
    } else {
      toast.success('Lead updated successfully');
      setEditing(false);
      fetchData();
    }
  };

  const handleAddFollowup = async () => {
    if (!newFollowup.date || !newFollowup.notes) {
      toast.error('Please fill in all fields');
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('lead_followups')
      .insert({
        lead_id: params.id as string,
        followup_date: newFollowup.date,
        notes: newFollowup.notes,
        created_by: user?.id,
      });

    if (error) {
      toast.error('Failed to add followup');
      console.error(error);
    } else {
      toast.success('Followup added');
      setShowFollowupForm(false);
      setNewFollowup({ date: '', notes: '' });
      fetchData();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-purple-100 text-purple-800',
      qualified: 'bg-indigo-100 text-indigo-800',
      proposal_sent: 'bg-yellow-100 text-yellow-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  if (!lead) return null;

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <Toaster position="top-right" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/leads')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{lead.business_name}</h1>
              <span className={`inline-block mt-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                {lead.status.replace('_', ' ')}
              </span>
              {lead.proposed_status && (
                <span className="ml-2 inline-block px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-full">
                  Proposed: {lead.proposed_status.replace('_', ' ')}
                </span>
              )}
            </div>
            
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit className="w-4 h-4" />
                Edit Lead
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
                    setEditedLead(lead);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Lead Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedLead.business_name || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, business_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{lead.business_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedLead.contact_name || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{lead.contact_name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editedLead.contact_phone || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      {lead.contact_phone ? (
                        <>
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {lead.contact_phone}
                        </>
                      ) : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      value={editedLead.contact_email || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      {lead.contact_email ? (
                        <>
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {lead.contact_email}
                        </>
                      ) : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedLead.location || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      {lead.location ? (
                        <>
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {lead.location}
                        </>
                      ) : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedLead.source || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Website, Referral"
                    />
                  ) : (
                    <p className="text-gray-900">{lead.source || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {editing ? (
                    <select
                      value={editedLead.status || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal_sent">Proposal Sent</option>
                      <option value="closed_won">Closed Won</option>
                      <option value="closed_lost">Closed Lost</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                      {lead.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
                  {editing ? (
                    <input
                      type="number"
                      value={editedLead.estimated_value || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, estimated_value: parseFloat(e.target.value) || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {lead.estimated_value ? lead.estimated_value.toLocaleString() : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  {editing ? (
                    <select
                      value={editedLead.assigned_to || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, assigned_to: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{lead.assignee?.full_name || 'Unassigned'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-up</label>
                  {editing ? (
                    <input
                      type="date"
                      value={editedLead.next_followup_at || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, next_followup_at: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      {lead.next_followup_at ? (
                        <>
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(lead.next_followup_at).toLocaleDateString()}
                        </>
                      ) : '-'}
                    </p>
                  )}
                </div>
              </div>

              {editing && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Note</label>
                  <textarea
                    value={editedLead.followup_note || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, followup_note: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add follow-up notes..."
                  />
                </div>
              )}
            </div>

            {/* Followups */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Follow-up History</h2>
                <button
                  onClick={() => setShowFollowupForm(!showFollowupForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  + Add Follow-up
                </button>
              </div>

              {showFollowupForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={newFollowup.date}
                        onChange={(e) => setNewFollowup({ ...newFollowup, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={newFollowup.notes}
                      onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="What happened in this follow-up?"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddFollowup}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Save Follow-up
                    </button>
                    <button
                      onClick={() => {
                        setShowFollowupForm(false);
                        setNewFollowup({ date: '', notes: '' });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {followups.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No follow-ups recorded yet</p>
                ) : (
                  followups.map((followup) => (
                    <div key={followup.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              {new Date(followup.followup_date).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-gray-500">
                              by {followup.creator?.full_name}
                            </span>
                          </div>
                          <p className="text-gray-700">{followup.notes}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Created By</p>
                  <p className="font-semibold text-gray-900">{lead.creator?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Follow-ups</p>
                  <p className="text-2xl font-bold text-gray-900">{followups.length}</p>
                </div>
              </div>
            </div>

            {/* Status Change */}
            {lead.status === 'closed_won' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="font-bold">Won!</h3>
                </div>
                <p className="text-sm text-green-700">
                  This lead has been converted to a client.
                </p>
                <button
                  onClick={() => router.push('/admin/clients')}
                  className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  View Client
                </button>
              </div>
            )}

            {lead.status === 'closed_lost' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-bold">Lost</h3>
                </div>
                <p className="text-sm text-red-700">
                  This lead was closed as lost.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
