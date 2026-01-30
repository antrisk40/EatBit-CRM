'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatDate, formatDateTime, getStatusLabel, getStatusColor } from '@/lib/utils/helpers';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  AlertCircle,
  Briefcase,
  History
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface UserReviewProps {
  role: 'sales' | 'intern';
}

export default function UserReviewsPage({ role }: UserReviewProps) {
  const { profile } = useAuth();
  const [leadProposals, setLeadProposals] = useState<any[]>([]);
  const [documentReviews, setDocumentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchUserReviews();
    }
  }, [profile]);

  const fetchUserReviews = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch Lead Proposals submitted by this user
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, business_name, status, proposed_status, updated_at')
        .eq('created_by', profile!.id) // For interns
        .not('proposed_status', 'is', null);

      // If sales, they might be tracking assigned leads they proposed a change for
      // But currently the system assumes 'created_by' for proposals?
      // Let's check both for safety if role is sales
      let finalLeads = leads || [];
      if (role === 'sales') {
        const { data: salesLeads, error: salesError } = await supabase
          .from('leads')
          .select('id, business_name, status, proposed_status, updated_at')
          .eq('assigned_to', profile!.id)
          .not('proposed_status', 'is', null);
        
        if (!salesError && salesLeads) {
          // Merge and deduplicate
          const seen = new Set(finalLeads.map(l => l.id));
          salesLeads.forEach(l => {
            if (!seen.has(l.id)) finalLeads.push(l);
          });
        }
      }

      // 2. Fetch Lead Document Reviews
      const { data: leadDocs, error: leadDocsError } = await supabase
        .from('lead_documents')
        .select('*, leads(business_name)')
        .eq('uploaded_by', profile!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // 3. Fetch Client Document Reviews
      const { data: clientDocs, error: clientDocsError } = await supabase
        .from('client_documents')
        .select('*, clients(company_name)')
        .eq('uploaded_by', profile!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setLeadProposals(finalLeads);
      
      const allDocs = [
        ...(leadDocs || []).map(d => ({ ...d, parent_name: d.leads?.business_name, type: 'Lead' })),
        ...(clientDocs || []).map(d => ({ ...d, parent_name: d.clients?.company_name, type: 'Client' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setDocumentReviews(allDocs);

    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load your reviews');
    } finally {
      setLoading(false);
    }
  };

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getDocStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={[role]}>
        <div className="p-6">
          <div className="animate-pulse space-y-8">
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded-xl w-64"></div>
              <div className="h-5 bg-gray-200 rounded-lg w-96"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48"></div>
                <div className="h-64 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48"></div>
                <div className="h-64 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={[role]}>
      <Toaster position="top-right" />
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-600 mt-1">Track the status of your submitted changes and documents</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Proposals */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Pending Status Changes
            </h2>
            {leadProposals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No pending status changes at the moment.
              </div>
            ) : (
              <div className="space-y-4">
                {leadProposals.map((lead) => (
                  <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">{lead.business_name}</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-medium text-gray-500 line-through">
                        {getStatusLabel(lead.status)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(lead.proposed_status)}`}>
                        {getStatusLabel(lead.proposed_status)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Clock className="w-3 h-3" /> Pending Admin Approval
                      </span>
                      <span className="text-gray-400">{formatDateTime(lead.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Document Reviews */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Recent Document Reviews
            </h2>
            {documentReviews.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No documents submitted for review yet.
              </div>
            ) : (
              <div className="space-y-4">
                {documentReviews.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="bg-gray-50 p-3 rounded-lg flex-shrink-0 text-gray-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-gray-900 truncate text-sm" title={doc.file_name}>
                          {doc.file_name}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          {doc.type}: {doc.parent_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getDocStatusColor(doc.review_status)} flex items-center gap-1`}>
                        {getDocStatusIcon(doc.review_status)}
                        {doc.review_status}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-center text-gray-400 flex items-center justify-center gap-1">
              <History className="w-3 h-3" /> Only showing recent 20 reviews
            </p>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
