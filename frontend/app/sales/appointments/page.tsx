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
  FileText,
  Download,
  Edit,
  AlertCircle,
  CheckCircle,
  XCircle,
  Paperclip,
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

interface Appointment {
  id: string;
  client_id: string | null;
  title: string;
  appointment_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  note: string | null;
  location: string | null;
  meeting_link: string | null;
  color: string | null;
  clients?: {
    company_name: string;
  } | null;
  leads?: {
    company_name: string;
    contact_name: string | null;
  } | null;
  appointment_request?: {
    related_to_type: 'lead' | 'client' | 'external' | null;
    related_to_lead_id: string | null;
    related_to_client_id: string | null;
  } | null;
}

export default function SalesAppointmentsPage() {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list' | 'requests'>('calendar');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);


  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchRequests();
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    
    setLoading(true);
    const supabase = createClient();
    
    const { data: appointmentsData, error } = await supabase
      .from('client_appointments')
      .select(`
        *,
        clients (
          company_name
        )
      `)
      .or(`created_by.eq.${user.id}`)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
      setLoading(false);
      return;
    }

    // Fetch appointment_requests for each appointment
    const appointmentIds = (appointmentsData || []).map(apt => apt.id);
    let requestsMap = new Map();
    
    if (appointmentIds.length > 0) {
      const { data: requestsData } = await supabase
        .from('appointment_requests')
        .select('appointment_id, related_to_type, related_to_lead_id, related_to_client_id')
        .in('appointment_id', appointmentIds);
      
      if (requestsData) {
        requestsMap = new Map(requestsData.map(req => [req.appointment_id, req]));
      }
    }

    // Fetch lead info
    const leadIds = Array.from(requestsMap.values())
      .map((req: any) => req.related_to_lead_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let leadsMap = new Map();
    if (leadIds.length > 0) {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, company_name, contact_name')
        .in('id', leadIds);
      
      if (leadsData) {
        leadsMap = new Map(leadsData.map(lead => [lead.id, lead]));
      }
    }

    // Combine data
    const data = (appointmentsData || []).map(apt => ({
      ...apt,
      appointment_request: requestsMap.get(apt.id) || null,
      leads: requestsMap.get(apt.id)?.related_to_lead_id 
        ? leadsMap.get(requestsMap.get(apt.id).related_to_lead_id) || null
        : null
    }));

    setAppointments(data);
    
    const events: CalendarEvent[] = data.map(apt => ({
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
    setLoading(false);
  };

  const handleTimeUpdate = async (id: string, newTime: string) => {
    const supabase = createClient();
    const appointment = appointments.find(a => a.id === id);
    
    if (!appointment) return;

    const oldTime = new Date(appointment.scheduled_at).toISOString();
    const newTimeISO = new Date(newTime).toISOString();
    
    if (oldTime === newTimeISO) return;

    const { error } = await supabase
      .from('client_appointments')
      .update({ 
        scheduled_at: newTimeISO,
        status: 'rescheduled'
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update appointment time');
    } else {
      toast.success('Appointment rescheduled');
      fetchAppointments();
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('appointment_requests')
      .select('*, documents:appointment_documents(*)')
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false });
    
    setRequests(data || []);
  };

  const handleEditRequest = (request: any) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };


  const handleEventClick = (event: CalendarEvent) => {
    const appointment = appointments.find(a => a.id === event.id);
    if (appointment) {
      toast.success(`${event.title} - ${format(new Date(event.start_time), 'PPp')}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedAppointments = appointments.reduce((groups, apt) => {
    const date = new Date(apt.scheduled_at).toLocaleDateString(undefined, { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(apt);
    return groups;
  }, {} as Record<string, Appointment[]>);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['sales']}>
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
    <DashboardLayout allowedRoles={['sales']}>
      <Toaster position="top-right" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              My Appointments
            </h1>
            <p className="text-gray-600">View and manage your scheduled appointments</p>
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
            Calendar View
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              view === 'list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setView('requests')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              view === 'requests'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            My Requests
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>


        {/* Calendar View */}
        {view === 'calendar' && (
          <Calendar
            events={calendarEvents}
            onEventClick={handleEventClick}
            onCreateEvent={() => setShowRequestModal(true)}
            loading={loading}
          />
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {Object.keys(groupedAppointments).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <CalendarIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No appointments scheduled</h3>
                <p className="text-gray-500 mt-1">Request an appointment to get started</p>
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(groupedAppointments).map(([date, items]) => (
                  <div key={date}>
                    <h2 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                      {date}
                    </h2>
                    <div className="grid gap-4">
                      {items.map((apt) => (
                        <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                          <div className="flex gap-5">
                            <div 
                              className="flex flex-col items-center justify-center min-w-[100px] h-[70px] rounded-2xl border"
                              style={{ 
                                backgroundColor: apt.color ? `${apt.color}15` : '#eff6ff',
                                borderColor: apt.color ? `${apt.color}40` : '#bfdbfe'
                              }}
                            >
                              <span 
                                className="font-black text-lg"
                                style={{ color: apt.color || '#1d4ed8' }}
                              >
                                {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span 
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: apt.color ? `${apt.color}cc` : '#60a5fa' }}
                              >
                                {apt.duration_minutes} MIN
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-gray-900 text-lg">{apt.title}</h3>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                                  {apt.appointment_type.toUpperCase()}
                                </span>
                                <span className={`px-3 py-0.5 rounded-full text-xs font-black ${getStatusColor(apt.status)}`}>
                                  {apt.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <User className="w-4 h-4" />
                                <span className="font-semibold text-gray-900">
                                  {apt.appointment_request?.related_to_type === 'lead' && apt.leads?.company_name
                                    ? apt.leads.company_name
                                    : apt.appointment_request?.related_to_type === 'client' && apt.clients?.company_name
                                    ? apt.clients.company_name
                                    : apt.appointment_request?.related_to_type === 'external'
                                    ? 'External Contact'
                                    : apt.clients?.company_name || 'No Client'}
                                </span>
                                {apt.appointment_request?.related_to_type === 'client' && apt.client_id && (
                                  <Link 
                                    href={`/sales/clients/${apt.client_id}`}
                                    className="ml-2 text-blue-600 hover:underline text-xs"
                                  >
                                    View Client
                                  </Link>
                                )}
                                {apt.appointment_request?.related_to_type === 'lead' && apt.appointment_request?.related_to_lead_id && (
                                  <Link 
                                    href={`/sales/leads/${apt.appointment_request.related_to_lead_id}`}
                                    className="ml-2 text-blue-600 hover:underline text-xs"
                                  >
                                    View Lead
                                  </Link>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <input
                                  type="datetime-local"
                                  value={new Date(apt.scheduled_at).toISOString().slice(0, 16)}
                                  onChange={(e) => handleTimeUpdate(apt.id, e.target.value)}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                  title="Change time (will set status to rescheduled)"
                                />
                              </div>
                              {apt.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{apt.location}</span>
                                </div>
                              )}
                              {apt.meeting_link && (
                                <div className="flex items-center gap-2 text-sm mb-1">
                                  <Video className="w-4 h-4 text-blue-600" />
                                  <a 
                                    href={apt.meeting_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Join Meeting
                                  </a>
                                </div>
                              )}
                              {apt.note && (
                                <p className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg italic">
                                  "{apt.note}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Requests View */}
        {view === 'requests' && (

          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No requests sent</h3>
                <p className="text-gray-500 mt-1">Your appointment requests will appear here</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{request.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          request.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                          request.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                          request.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Requested for {format(new Date(request.requested_date), 'PPpp')}</p>
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

                  {request.description && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                      {request.description}
                    </p>
                  )}

                  {request.rejection_reason && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                       <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                       <div className="text-xs">
                          <p className="font-bold text-red-900">Admin Note:</p>
                          <p className="text-red-700">{request.rejection_reason}</p>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">{request.duration_minutes} Minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600">{request.location || 'No location set'}</span>
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
                            <span className="text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{doc.file_name}</span>
                            <Maximize2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-blue-500" />
                          </div>
                        ))}
                      </div>

                    </div>
                  )}
                </div>
              ))
            )}
          </div>
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
            fetchAppointments();
            fetchRequests();
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
