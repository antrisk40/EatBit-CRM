'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import Calendar from '@/components/shared/Calendar';
import AppointmentRequestModal from '@/components/shared/AppointmentRequestModal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus,
  List,
  CalendarDays,
  MapPin,
  Video,
  AlertCircle,
  Edit,
  FileText,
  Paperclip,
  Download,
  Maximize2
} from 'lucide-react';

import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import FilePreviewModal from '@/components/shared/FilePreviewModal';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: string;
  color: string;
  status: string;
  attendee_count: number;
}

interface AppointmentRequest {
  id: string;
  title: string;
  appointment_type: string;
  requested_date: string;
  duration_minutes: number;
  status: string;
  description: string | null;
  rejection_reason: string | null;
  location: string | null;
  meeting_link: string | null;
  requested_with: string;
  attendees: string[];
  requested_with_user: {
    full_name: string;
  };
  documents?: any[];
}

export default function InternAppointmentsPage() {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'requests'>('calendar');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);



  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    const supabase = createClient();
    
    // Fetch appointments where user is attendee
    const { data: appointments, error: aptError } = await supabase
      .from('client_appointments')
      .select('*')
      .or(`created_by.eq.${user.id}`)
      .order('scheduled_at', { ascending: true });

    if (!aptError && appointments) {
      const events: CalendarEvent[] = appointments.map(apt => ({
        id: apt.id,
        title: apt.title,
        start_time: apt.scheduled_at,
        end_time: new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000).toISOString(),
        type: apt.appointment_type,
        color: apt.color || '#3b82f6',
        status: apt.status,
        attendee_count: 0
      }));
      setCalendarEvents(events);
    }

    // Fetch appointment requests
    const { data: requestsData, error: reqError } = await supabase
      .from('appointment_requests')
      .select(`
        *,
        requested_with_user:requested_with(full_name),
        documents:appointment_documents(*)
      `)
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false });

    if (!reqError && requestsData) {
      setRequests(requestsData);
    }

    setLoading(false);
  };

  const handleEditRequest = (request: AppointmentRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };


  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['intern']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['intern']}>
      <Toaster position="top-right" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              My Appointments
            </h1>
            <p className="text-gray-600">Request meetings with admins and team members</p>
          </div>
          
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            Request Appointment
          </button>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              view === 'calendar'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Calendar
          </button>
          <button
            onClick={() => setView('requests')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              view === 'requests'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <List className="w-4 h-4" />
            My Requests
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <Calendar
            events={calendarEvents}
            onCreateEvent={() => setShowRequestModal(true)}
            loading={loading}
          />
        )}

        {/* Requests View */}
        {view === 'requests' && (
          <>
            {requests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No appointment requests</h3>
                <p className="text-gray-500 mt-1">Request an appointment to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(request => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{request.title}</h3>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium capitalize">
                            {request.appointment_type}
                          </span>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        {request.description && (
                          <p className="text-gray-600 mb-3">{request.description}</p>
                        )}

                        {request.rejection_reason && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                             <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                             <div className="text-xs">
                                <p className="font-bold text-red-900">Admin Note:</p>
                                <p className="text-red-700">{request.rejection_reason}</p>
                             </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">With:</span>
                            <span>{request.requested_with_user.full_name}</span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-700">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Date:</span>
                            <span>{format(new Date(request.requested_date), 'PPP')}</span>
                          </div>
                        </div>

                        {request.documents && request.documents.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              Attached Documents
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {request.documents.map((doc: any) => (
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
                                  className="flex items-center gap-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-[11px] cursor-pointer hover:border-blue-300 transition-all"
                                >
                                  <FileText className="w-3 h-3 text-blue-500" />
                                  <span className="text-gray-700">{doc.file_name}</span>
                                  <Maximize2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-blue-500" />
                                </div>
                              ))}
                            </div>

                          </div>
                        )}
                      </div>

                      {(request.status === 'pending' || request.status === 'rejected') && (
                        <button
                          onClick={() => handleEditRequest(request)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                          title="Edit Request"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </>
        )}
      </div>

      {/* Appointment Request Modal */}
      {user && (
        <AppointmentRequestModal
          isOpen={showRequestModal}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
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
