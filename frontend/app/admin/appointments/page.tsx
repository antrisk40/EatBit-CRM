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
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Plus,
  List,
  CalendarDays
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  client_id: string | null;
  title: string;
  appointment_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  note: string | null;
  color?: string;
  location?: string;
  meeting_link?: string;
  clients?: {
    company_name: string;
    primary_contact_name: string | null;
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
  creator: {
    full_name: string;
  };
}

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

export default function AdminAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Fetch all appointments with client and creator info
    const { data: appointmentsData, error } = await supabase
      .from('client_appointments')
      .select(`
        *,
        clients (
          company_name,
          primary_contact_name
        ),
        creator:profiles!client_appointments_created_by_fkey (
          full_name
        )
      `)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
      setLoading(false);
      return;
    }

    // Fetch appointment_requests for each appointment to get lead/client info
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

    // Fetch lead info for appointments that have related_to_lead_id
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

    // Combine appointments with request and lead data
    const data = (appointmentsData || []).map(apt => ({
      ...apt,
      appointment_request: requestsMap.get(apt.id) || null,
      leads: requestsMap.get(apt.id)?.related_to_lead_id 
        ? leadsMap.get(requestsMap.get(apt.id).related_to_lead_id) || null
        : null
    }));

    setAppointments(data);
    
    // Convert to calendar events
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

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('client_appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated');
      fetchAppointments();
    }
  };

  const handleTimeUpdate = async (id: string, newTime: string) => {
    const supabase = createClient();
    const appointment = appointments.find(a => a.id === id);
    
    if (!appointment) return;

    // Check if time actually changed
    const oldTime = new Date(appointment.scheduled_at).toISOString();
    const newTimeISO = new Date(newTime).toISOString();
    
    if (oldTime === newTimeISO) {
      return; // No change
    }

    // Update time and set status to rescheduled
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

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    const appointment = appointments.find(a => a.id === event.id);
    if (appointment) {
      // Show appointment details
      toast.success(`${event.title} - ${format(new Date(event.start_time), 'PPp')}`);
    }
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    // Could open a modal to create appointment for this date
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.creator?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedAppointments = filteredAppointments.reduce((groups, apt) => {
    const date = new Date(apt.scheduled_at).toLocaleDateString(undefined, { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(apt);
    return groups;
  }, {} as Record<string, Appointment[]>);

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <Toaster position="top-right" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              Appointments
            </h1>
            <p className="text-gray-600">Manage all appointments and schedule meetings</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/admin/appointment-requests"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold flex items-center gap-2 shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              View Requests
            </Link>
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </div>
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
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <Calendar
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onCreateEvent={() => setShowRequestModal(true)}
            loading={loading}
          />
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search appointments, clients, or team members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {Object.keys(groupedAppointments).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <CalendarIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No appointments scheduled</h3>
                <p className="text-gray-500 mt-1">Try adjusting your filters or search terms</p>
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
                        <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow group">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-5">
                              <div className="bg-blue-50 flex flex-col items-center justify-center min-w-[100px] h-[70px] rounded-2xl border border-blue-100">
                                <span className="text-blue-700 font-black text-lg">
                                  {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                                  {apt.duration_minutes} MIN
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-gray-900 text-lg">{apt.title}</h3>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                                    {apt.appointment_type.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span className="font-semibold text-gray-900">
                                      {apt.appointment_request?.related_to_type === 'lead' && apt.leads?.company_name
                                        ? apt.leads.company_name
                                        : apt.appointment_request?.related_to_type === 'client' && apt.clients?.company_name
                                        ? apt.clients.company_name
                                        : apt.appointment_request?.related_to_type === 'external'
                                        ? 'External Contact'
                                        : apt.clients?.company_name || 'No Client'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-400">• Created by:</span>
                                    <span className="text-gray-900">{apt.creator?.full_name || 'System'}</span>
                                  </div>
                                </div>
                                {apt.note && (
                                  <p className="mt-3 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg italic">
                                    "{apt.note}"
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex md:flex-col items-center md:items-end justify-between gap-3">
                              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-tight ${getStatusColor(apt.status)}`}>
                                {apt.status.toUpperCase()}
                              </span>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {apt.appointment_request?.related_to_type === 'client' && apt.client_id && (
                                  <Link 
                                    href={`/admin/clients/${apt.client_id}`}
                                    className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    title="View Client"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Link>
                                )}
                                {apt.appointment_request?.related_to_type === 'lead' && apt.appointment_request?.related_to_lead_id && (
                                  <Link 
                                    href={`/admin/leads/${apt.appointment_request.related_to_lead_id}`}
                                    className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    title="View Lead"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Link>
                                )}
                                <input
                                  type="datetime-local"
                                  value={new Date(apt.scheduled_at).toISOString().slice(0, 16)}
                                  onChange={(e) => handleTimeUpdate(apt.id, e.target.value)}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                  title="Change time (will set status to rescheduled)"
                                />
                                <select
                                  value={apt.status}
                                  onChange={(e) => handleStatusUpdate(apt.id, e.target.value)}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="scheduled">Scheduled</option>
                                  <option value="completed">Completed</option>
                                  <option value="rescheduled">Rescheduled</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
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
      </div>

      {/* Appointment Request Modal */}
      {user && (
        <AppointmentRequestModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            fetchAppointments();
            toast.success('Appointment request sent!');
          }}
          currentUserId={user.id}
        />
      )}
    </DashboardLayout>
  );
}
