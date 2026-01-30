'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  Calendar,
  Clock,
  User,
  Users,
  Check,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Edit,
  Download,
  Paperclip,
  Maximize2,
  Video
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import AppointmentRequestModal from '@/components/shared/AppointmentRequestModal';
import FilePreviewModal from '@/components/shared/FilePreviewModal';
import { useAuth } from '@/lib/contexts/AuthContext';


interface AppointmentDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

interface AppointmentRequest {
  id: string;
  title: string;
  description: string;
  appointment_type: string;
  requested_date: string;
  duration_minutes: number;
  status: string;
  rejection_reason: string | null;
  location: string | null;
  meeting_link: string | null;
  created_at: string;
  requested_by: string;
  requested_with: string;
  
  // Related entity
  related_to_type: string | null;
  related_to_lead: {
    business_name: string;
    contact_name: string;
  } | null;
  related_to_client: {
    company_name: string;
    primary_contact_name: string;
  } | null;
  external_contact_name: string | null;
  external_contact_phone: string | null;
  external_contact_email: string | null;
  external_contact_company: string | null;
  
  requester: {
    full_name: string;
    role: string;
  };
  requested_with_user: {
    full_name: string;
    role: string;
  };
  attendees: string[];
  documents: AppointmentDocument[];
}

export default function AppointmentRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);


  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('appointment_requests')
      .select(`
        *,
        requester:requested_by(full_name, role),
        requested_with_user:requested_with(full_name, role),
        related_to_lead:leads!appointment_requests_related_to_lead_id_fkey(business_name, contact_name),
        related_to_client:clients!appointment_requests_related_to_client_id_fkey(company_name, primary_contact_name),
        documents:appointment_documents(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load appointment requests');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (request: AppointmentRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('Approve this appointment request?')) return;

    setProcessingId(requestId);
    const supabase = createClient();

    try {
      console.log('[Approve] Starting approval for request:', requestId);
      
      const { data, error } = await supabase.rpc('approve_appointment_request', {
        request_id_param: requestId,
        client_id_param: null
      });

      if (error) {
        console.error('[Approve] Supabase error:', error);
        console.error('[Approve] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[Approve] Success! New appointment ID:', data);
      toast.success('Appointment request approved!');
      fetchRequests();
    } catch (error: any) {
      console.error('[Approve] Full error object:', error);
      const errorMessage = error.message || error.hint || error.details || 'Failed to approve request';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    setProcessingId(requestId);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.rpc('reject_appointment_request', {
        request_id_param: requestId,
        reason: reason || null
      });

      if (error) throw error;

      toast.success('Appointment request rejected');
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(req => 
    filter === 'all' ? true : req.status === filter
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    const icons = {
      pending: <AlertCircle className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      meeting: 'bg-blue-100 text-blue-700',
      training: 'bg-purple-100 text-purple-700',
      demo: 'bg-green-100 text-green-700',
      review: 'bg-orange-100 text-orange-700',
      planning: 'bg-pink-100 text-pink-700',
      other: 'bg-gray-100 text-gray-700'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${colors[type]}`}>
        {type}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin', 'sales']}>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointment requests...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin', 'sales']}>
      <Toaster position="top-right" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Appointment Requests
          </h1>
          <p className="text-gray-600">Review and manage appointment requests from your team</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-700">Filter:</span>
            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  filter === status
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-2 text-xs opacity-75">
                  ({requests.filter(r => status === 'all' ? true : r.status === status).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              {filter === 'pending' 
                ? 'No pending appointment requests at the moment'
                : `No ${filter} appointment requests`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(request => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Request Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{request.title}</h3>
                          {getTypeBadge(request.appointment_type)}
                          {getStatusBadge(request.status)}
                        </div>
                        {request.description && (
                          <p className="text-gray-600 mb-3">{request.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Requested by:</span>
                        <span>{request.requester.full_name} ({request.requester.role})</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">With:</span>
                        <span>{request.requested_with_user.full_name} ({request.requested_with_user.role})</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Date:</span>
                        <span>{format(new Date(request.requested_date), 'PPP')}</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Time:</span>
                        <span>
                          {format(new Date(request.requested_date), 'p')} ({request.duration_minutes} min)
                        </span>
                      </div>

                      {request.attendees && request.attendees.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">Additional attendees:</span>
                          <span>{request.attendees.length} person(s)</span>
                        </div>
                      )}
                      
                      {/* Related Entity */}
                      {request.related_to_type === 'lead' && request.related_to_lead && (
                        <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">Related Lead:</span>
                          <span className="font-semibold text-blue-700">
                            {request.related_to_lead.business_name}
                            {request.related_to_lead.contact_name && ` - ${request.related_to_lead.contact_name}`}
                          </span>
                        </div>
                      )}
                      
                      {request.related_to_type === 'client' && request.related_to_client && (
                        <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                          <User className="w-4 h-4 text-green-400" />
                          <span className="font-medium">Related Client:</span>
                          <span className="font-semibold text-green-700">
                            {request.related_to_client?.company_name}
                            {request.related_to_client?.primary_contact_name && ` - ${request.related_to_client.primary_contact_name}`}
                          </span>
                        </div>
                      )}
                      
                      {request.related_to_type === 'external' && request.external_contact_name && (
                        <div className="md:col-span-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 text-purple-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-bold text-purple-900 mb-1">External Contact:</p>
                              <div className="grid grid-cols-2 gap-2 text-sm text-purple-700">
                                <div><span className="font-medium">Name:</span> {request.external_contact_name}</div>
                                {request.external_contact_company && (
                                  <div><span className="font-medium">Company:</span> {request.external_contact_company}</div>
                                )}
                                {request.external_contact_phone && (
                                  <div><span className="font-medium">Phone:</span> {request.external_contact_phone}</div>
                                )}
                                {request.external_contact_email && (
                                  <div><span className="font-medium">Email:</span> {request.external_contact_email}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Location and Meeting Link */}
                      {request.location && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="font-medium">📍 Location:</span>
                          <span>{request.location}</span>
                        </div>
                      )}
                      {request.meeting_link && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="font-medium">🔗 Meeting Link:</span>
                          <a href={request.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                            {request.meeting_link}
                          </a>
                        </div>
                      )}
                    </div>

                      {/* Documents Section */}
                      {request.documents && request.documents.length > 0 && (
                        <div className="md:col-span-2 mt-2">
                          <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Paperclip className="w-4 h-4" />
                            Attached Documents:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {request.documents.map(doc => (
                              <div 
                                key={doc.id} 
                                onClick={() => {
                                  const supabase = createClient();
                                  const { data } = supabase.storage.from('docs').getPublicUrl(doc.file_path);
                                  setPreviewFile({
                                    url: data.publicUrl,
                                    name: doc.file_name,
                                    type: doc.file_type
                                  });
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm group hover:border-blue-300 transition-all cursor-pointer"
                              >
                                {doc.file_type?.startsWith('image/') ? (
                                  <FileText className="w-4 h-4 text-blue-500" />
                                ) : doc.file_type?.startsWith('video/') ? (
                                  <Video className="w-4 h-4 text-purple-500" />
                                ) : (
                                  <FileText className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-gray-700 font-medium">{doc.file_name}</span>
                                <div className="p-1 hover:bg-white rounded text-gray-400 hover:text-blue-600 transition-colors">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>


                    {request.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-red-900">Rejection Reason:</p>
                            <p className="text-sm text-red-700">{request.rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2">
                    {/* Admin Edit Button */}
                    <button
                      onClick={() => handleEdit(request)}
                      className="flex-1 lg:flex-none px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-bold flex items-center justify-center gap-2 border border-blue-200 shadow-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>

                    {request.status === 'pending' && (

                    <div className="flex lg:flex-col gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 lg:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center gap-2 shadow-md"
                      >
                        {processingId === request.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center gap-2 shadow-md"
                      >
                        {processingId === request.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user && (
        <AppointmentRequestModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRequest(null);
          }}
          onSuccess={fetchRequests}
          currentUserId={user.id}
          initialData={selectedRequest}
          editMode={!!selectedRequest}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
        />
      )}
    </DashboardLayout>
  );
}


