'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatDateTime, getStatusLabel, getStatusColor } from '@/lib/utils/helpers';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Briefcase, 
  Download,
  Eye,
  Database,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { logActivity } from '@/lib/utils/activity';

type ReviewTab = 'leads' | 'lead_docs' | 'client_docs' | 'raw_data';

interface PendingStatusChange {
  id: string;
  business_name: string;
  current_status: string;
  proposed_status: string;
  submitted_by_name: string;
  created_at: string;
  lead_id: string;
  followup_note?: string;
}

interface PendingDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  description?: string;
  uploaded_by_name: string;
  created_at: string;
  parent_name: string; 
  parent_id: string;
}

interface PendingRawDataReview {
  id: string; // review id
  raw_data_id: string;
  business_name: string;
  submitted_by_name: string;
  created_at: string;
  proposed_data: any;
}

export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState<ReviewTab>('leads');
  const [pendingLeads, setPendingLeads] = useState<PendingStatusChange[]>([]);
  const [pendingLeadDocs, setPendingLeadDocs] = useState<PendingDocument[]>([]);
  const [pendingClientDocs, setPendingClientDocs] = useState<PendingDocument[]>([]);
  const [pendingRawData, setPendingRawData] = useState<PendingRawDataReview[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchAllReviews();
  }, []);

  const fetchAllReviews = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch Lead Status Reviews
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          business_name,
          status,
          proposed_status,
          followup_note,
          created_at,
          submitter:profiles!leads_created_by_fkey(full_name)
        `)
        .not('proposed_status', 'is', null)
        .order('updated_at', { ascending: true });

      if (leadsError) throw leadsError;

      // 2. Fetch Lead Document Reviews
      const { data: leadDocs, error: leadDocsError } = await supabase
        .from('lead_documents')
        .select(`
          id,
          file_name,
          file_path,
          file_type,
          description,
          review_status,
          created_at,
          lead_id,
          leads(business_name),
          uploader:profiles!lead_documents_uploaded_by_fkey(full_name)
        `)
        .eq('review_status', 'pending')
        .order('created_at', { ascending: true });

      if (leadDocsError) throw leadDocsError;

      // 3. Fetch Client Document Reviews
      const { data: clientDocs, error: clientDocsError } = await supabase
        .from('client_documents')
        .select(`
          id,
          file_name,
          file_path,
          file_type,
          description,
          review_status,
          created_at,
          client_id,
          clients(company_name),
          uploader:profiles!client_documents_uploaded_by_fkey(full_name)
        `)
        .eq('review_status', 'pending')
        .order('created_at', { ascending: true });

      if (clientDocsError) throw clientDocsError;

      // 4. Fetch Raw Data Conversion Reviews
      const { data: rawReviews, error: rawError } = await supabase
        .from('reviews')
        .select(`
          id,
          entity_id,
          proposed_data,
          created_at,
          profiles!submitted_by(full_name)
        `)
        .eq('entity_type', 'raw_data_conversion')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: true });

      if (rawError) throw rawError;

      setPendingLeads(leads.map(item => ({
        id: item.id,
        lead_id: item.id,
        business_name: item.business_name,
        current_status: item.status,
        proposed_status: item.proposed_status!,
        submitted_by_name: (item.submitter as any)?.full_name || 'Unknown',
        created_at: item.created_at,
        followup_note: item.followup_note || undefined,
      })));

      setPendingLeadDocs(leadDocs.map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        file_type: doc.file_type,
        description: doc.description,
        uploaded_by_name: (doc.uploader as any)?.full_name || 'Unknown',
        created_at: doc.created_at,
        parent_name: (doc.leads as any)?.business_name || 'Lead',
        parent_id: doc.lead_id
      })));

      setPendingClientDocs(clientDocs.map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        file_type: doc.file_type,
        description: doc.description,
        uploaded_by_name: (doc.uploader as any)?.full_name || 'Unknown',
        created_at: doc.created_at,
        parent_name: (doc.clients as any)?.company_name || 'Client',
        parent_id: doc.client_id
      })));

      setPendingRawData(rawReviews.map(r => ({
        id: r.id,
        raw_data_id: r.entity_id,
        business_name: r.proposed_data.business_name,
        submitted_by_name: (r.profiles as any)?.full_name || 'Unknown',
        created_at: r.created_at,
        proposed_data: r.proposed_data
      })));

    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to fetch pending reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStatus = async (leadId: string, proposedStatus: string, businessName: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('leads')
      .update({
        status: proposedStatus,
        proposed_status: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;

    await logActivity('status_approved', 'lead', leadId, {
      business_name: businessName,
      new_status: proposedStatus,
    });
  };

  const handleRejectStatus = async (leadId: string, businessName: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('leads')
      .update({ proposed_status: null })
      .eq('id', leadId);

    if (error) throw error;

    await logActivity('status_rejected', 'lead', leadId, {
      business_name: businessName,
    });
  };

  const handleDocAction = async (docId: string, action: 'approved' | 'rejected', type: 'lead' | 'client') => {
    const tableName = type === 'lead' ? 'lead_documents' : 'client_documents';
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from(tableName)
      .update({
        review_status: action,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', docId);

    if (error) throw error;

    await logActivity(`doc_${action}`, type === 'lead' ? 'lead' : 'client', docId, {
      document_id: docId,
      action: action
    });
  };

  const handleRawAction = async (reviewId: string, rawDataId: string, action: 'approved' | 'rejected') => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (action === 'approved') {
      const { error: rpcError } = await supabase.rpc('convert_raw_data_to_lead', {
        raw_data_id: rawDataId
      });
      if (rpcError) throw rpcError;
    } else {
      // Mark raw data as rejected
       await supabase.from('raw_data').update({ status: 'rejected' }).eq('id', rawDataId);
    }

    const { error: reviewError } = await supabase
      .from('reviews')
      .update({
        review_status: action,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (reviewError) throw reviewError;
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBatchAction = async (action: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return;
    setProcessing('batch');
    
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        if (activeTab === 'leads') {
          const lead = pendingLeads.find(l => l.id === id);
          if (lead) await (action === 'approved' ? handleApproveStatus(lead.lead_id, lead.proposed_status, lead.business_name) : handleRejectStatus(lead.lead_id, lead.business_name));
        } else if (activeTab === 'lead_docs' || activeTab === 'client_docs') {
          await handleDocAction(id, action, activeTab === 'lead_docs' ? 'lead' : 'client');
        } else if (activeTab === 'raw_data') {
          const item = pendingRawData.find(r => r.id === id);
          if (item) await handleRawAction(item.id, item.raw_data_id, action);
        }
      }
      setSelectedIds(new Set());
      toast.success(`Batch ${action} completed successfully`);
      fetchAllReviews();
    } catch (error: any) {
      toast.error(`Batch ${action} failed: ` + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDownload = async (path: string, name: string, bucket: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) {
      toast.error('Download failed');
    } else {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentList = activeTab === 'leads' ? pendingLeads 
                  : activeTab === 'lead_docs' ? pendingLeadDocs
                  : activeTab === 'client_docs' ? pendingClientDocs
                  : pendingRawData;

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <Toaster position="top-right" />
      <div className="p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
            <p className="text-gray-600 mt-1">Manage pending approvals for leads, data, and documents</p>
          </div>
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-blue-600 px-6 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 text-white">
              <span className="text-sm font-black uppercase tracking-wider">{selectedIds.size} Selected</span>
              <div className="h-4 w-[1px] bg-white/30 mx-2"></div>
              <button
                onClick={() => handleBatchAction('approved')}
                disabled={!!processing}
                className="px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                Approve All
              </button>
              <button
                onClick={() => handleBatchAction('rejected')}
                disabled={!!processing}
                className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-400 transition-colors disabled:opacity-50"
              >
                Reject All
              </button>
            </div>
          )}
        </div>

        {/* Tab Group */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-8 w-fit overflow-x-auto">
          <button
            onClick={() => { setActiveTab('leads'); setSelectedIds(new Set()); }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'leads' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Lead Status ({pendingLeads.length})
          </button>
          <button
            onClick={() => { setActiveTab('raw_data'); setSelectedIds(new Set()); }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'raw_data' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Raw Data ({pendingRawData.length})
          </button>
          <button
            onClick={() => { setActiveTab('lead_docs'); setSelectedIds(new Set()); }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'lead_docs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Lead Docs ({pendingLeadDocs.length})
          </button>
          <button
            onClick={() => { setActiveTab('client_docs'); setSelectedIds(new Set()); }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'client_docs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Client Docs ({pendingClientDocs.length})
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-4">
          {currentList.length > 0 && (
            <div className="flex items-center gap-4 mb-2 ml-2">
               <button
                  onClick={() => {
                    if (selectedIds.size === currentList.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(currentList.map(item => item.id)));
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
               >
                 {selectedIds.size === currentList.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 {selectedIds.size === currentList.length ? 'Deselect All' : 'Select All Items'}
               </button>
            </div>
          )}

          {currentList.length === 0 ? (
            <EmptyState message={`No pending ${activeTab.replace('_', ' ')} requests`} />
          ) : (
            currentList.map((item: any) => (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl shadow-sm border p-6 transition-all hover:shadow-md cursor-pointer relative overflow-hidden ${
                  selectedIds.has(item.id) ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200'
                }`}
                onClick={() => toggleSelect(item.id)}
              >
                {selectedIds.has(item.id) && (
                  <div className="absolute top-0 right-0 p-2 text-blue-600">
                    <CheckCircle className="w-6 h-6 fill-current" />
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Lead Status View */}
                  {activeTab === 'leads' && (
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">{item.business_name}</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">From</p>
                          <span className={`text-sm font-bold ${getStatusColor(item.current_status)}`}>
                            {getStatusLabel(item.current_status)}
                          </span>
                        </div>
                        <div className="text-gray-400">→</div>
                        <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                          <p className="text-[10px] text-blue-500 uppercase font-bold">Proposed To</p>
                          <span className={`text-sm font-bold ${getStatusColor(item.proposed_status)}`}>
                            {getStatusLabel(item.proposed_status)}
                          </span>
                        </div>
                      </div>
                      <MetaInfo submittedBy={item.submitted_by_name} createdAt={item.created_at} />
                    </div>
                  )}

                  {/* Raw Data View */}
                  {activeTab === 'raw_data' && (
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{item.business_name}</h3>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-black uppercase">Lead Conversion</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
                        <div><p className="font-bold text-gray-400 uppercase">Contact</p><p>{item.proposed_data.contact_name || '-'}</p></div>
                        <div><p className="font-bold text-gray-400 uppercase">Phone</p><p>{item.proposed_data.contact_phone || '-'}</p></div>
                        <div><p className="font-bold text-gray-400 uppercase">Location</p><p>{item.proposed_data.location || '-'}</p></div>
                        <div><p className="font-bold text-gray-400 uppercase">Value</p><p>${item.proposed_data.estimated_value?.toLocaleString() || '0'}</p></div>
                      </div>
                      <MetaInfo submittedBy={item.submitted_by_name} createdAt={item.created_at} />
                    </div>
                  )}

                  {/* Document View */}
                  {(activeTab === 'lead_docs' || activeTab === 'client_docs') && (
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-xl">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 truncate" title={item.file_name}>{item.file_name}</h3>
                          <p className="text-xs text-blue-600 font-bold flex items-center gap-1">
                             {activeTab === 'lead_docs' ? <AlertCircle className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                             {item.parent_name}
                          </p>
                        </div>
                      </div>
                      <MetaInfo submittedBy={item.uploaded_by_name} createdAt={item.created_at} />
                    </div>
                  )}

                  {/* Single Actions (Desktop only, hidden when mass selecting) */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (activeTab === 'leads') handleApproveStatus(item.lead_id, item.proposed_status, item.business_name).then(() => fetchAllReviews()); else if (activeTab === 'raw_data') handleRawAction(item.id, item.raw_data_id, 'approved').then(() => fetchAllReviews()); else handleDocAction(item.id, 'approved', activeTab === 'lead_docs' ? 'lead' : 'client').then(() => fetchAllReviews()); }}
                      disabled={!!processing}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (activeTab === 'leads') handleRejectStatus(item.lead_id, item.business_name).then(() => fetchAllReviews()); else if (activeTab === 'raw_data') handleRawAction(item.id, item.raw_data_id, 'rejected').then(() => fetchAllReviews()); else handleDocAction(item.id, 'rejected', activeTab === 'lead_docs' ? 'lead' : 'client').then(() => fetchAllReviews()); }}
                      disabled={!!processing}
                      className="flex items-center gap-2 px-6 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-bold disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetaInfo({ submittedBy, createdAt }: { submittedBy: string, createdAt: string }) {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span>By: <b>{submittedBy}</b></span>
      <span>•</span>
      <span>{formatDateTime(createdAt)}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <CheckCircle className="w-16 h-16 text-green-200 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-1">Queue Clear!</h3>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
  );
}
