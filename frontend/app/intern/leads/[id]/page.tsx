'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Edit2, Save, X, Plus, Calendar, User, FileText, Clock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DocumentsSection from '@/components/shared/DocumentsSection';

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
  proposed_status: string | null;
  followup_note: string | null;
  notes: string | null;
  created_at: string;
}

interface Followup {
  id: string;
  followup_date: string;
  notes: string;
  created_at: string;
  created_by: string;
}

export default function InternLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [newFollowup, setNewFollowup] = useState({
    date: '',
    notes: '',
  });

  useEffect(() => {
    if (leadId) {
      fetchLead();
      fetchFollowups();
    }
  }, [leadId]);

  const fetchLead = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) {
      console.error('Error:', error);
      toast.error('Failed to load lead');
      router.push('/intern/leads');
    } else {
      setLead(data);
      setEditedLead(data);
    }
    setLoading(false);
  };

  const fetchFollowups = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('lead_followups')
      .select('*')
      .eq('lead_id', leadId)
      .order('followup_date', { ascending: false });

    if (!error && data) {
      setFollowups(data);
    }
  };

  const handleSave = async () => {
    const supabase = createClient();
    
    // If status is changed, propose it instead of updating directly
    const updateData: any = { ...editedLead };
    if (editedLead.status !== lead?.status) {
      updateData.proposed_status = editedLead.status;
      updateData.status = lead?.status; // Keep original status
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      toast.error('Failed to update lead');
      console.error(error);
    } else {
      toast.success(updateData.proposed_status ? 'Status change submitted for review!' : 'Lead updated successfully!');
      setEditing(false);
      fetchLead();
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
        lead_id: leadId,
        followup_date: newFollowup.date,
        notes: newFollowup.notes,
        created_by: user?.id,
      });

    if (error) {
      toast.error('Failed to add followup');
      console.error(error);
    } else {
      toast.success('Followup added!');
      setShowFollowupModal(false);
      setNewFollowup({ date: '', notes: '' });
      fetchFollowups();
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['intern', 'admin']}>
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-purple-100 text-purple-800',
      qualified: 'bg-yellow-100 text-yellow-800',
      proposal_sent: 'bg-orange-100 text-orange-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout allowedRoles={['intern', 'admin']}>
      <Toaster position="top-right" />
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/intern/leads')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{lead.business_name}</h1>
              <p className="text-gray-600 mt-1">Lead Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
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
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Details */}
          <div className="lg:col-span-2 space-y-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
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
                    <p className="text-gray-900">{lead.contact_phone || '-'}</p>
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
                    <p className="text-gray-900">{lead.contact_email || '-'}</p>
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
                    <p className="text-gray-900">{lead.location || '-'}</p>
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
                    <div className="space-y-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(lead.status)}`}>
                        {lead.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {lead.proposed_status && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                          <Clock className="w-3 h-3" />
                          <span>Pending review for: <b>{lead.proposed_status.replace('_', ' ').toUpperCase()}</b></span>
                        </div>
                      )}
                    </div>
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
                    />
                  ) : (
                    <p className="text-gray-900">{lead.source || '-'}</p>
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
                    />
                  ) : (
                    <p className="text-gray-900">
                      {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  {editing ? (
                    <textarea
                      value={editedLead.notes || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">{lead.notes || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Followups */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Follow-ups</h2>
                <button
                  onClick={() => setShowFollowupModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Follow-up
                </button>
              </div>

              {followups.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No follow-ups yet</p>
              ) : (
                <div className="space-y-4">
                  {followups.map((followup) => (
                    <div key={followup.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(followup.followup_date).toLocaleDateString()}
                      </div>
                      <p className="text-gray-900">{followup.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <DocumentsSection 
              entityId={leadId} 
              entityType="lead" 
              bucket="lead-documents" 
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-semibold">{new Date(lead.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Follow-ups</p>
                  <p className="font-semibold">{followups.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Followup Modal */}
      {showFollowupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Follow-up</h2>
              <button onClick={() => setShowFollowupModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newFollowup.date}
                  onChange={(e) => setNewFollowup({ ...newFollowup, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newFollowup.notes}
                  onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What happened in this follow-up?"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddFollowup}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Follow-up
              </button>
              <button
                onClick={() => setShowFollowupModal(false)}
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
