'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  Briefcase, Phone, Mail, MapPin, DollarSign, Calendar as CalendarIcon, 
  Edit, Save, X, Plus, FileText, Clock 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DocumentsSection from '@/components/shared/DocumentsSection';

interface Client {
  id: string;
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  location: string | null;
  status: string;
  contract_value: number | null;
  onboarded_at: string;
  notes: string | null;
  managed_by: string | null;
}

interface Appointment {
  id: string;
  title: string;
  appointment_type:string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  note: string | null;
}

export default function SalesClientDetailPage() {
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});

  useEffect(() => {
    if (profile?.id) {
      fetchClientData();
    }
  }, [params.id, profile]);

  const fetchClientData = async () => {
    const supabase = createClient();
    
    // Fetch client (only if managed by this sales person)
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', params.id as string)
      .eq('managed_by', profile!.id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      toast.error('Client not found or access denied');
      router.push('/sales/clients');
      return;
    } else {
      setClient(clientData);
      setEditedClient(clientData);
    }

    // Fetch appointments
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('client_appointments')
      .select('*')
      .eq('client_id', params.id as string)
      .order('scheduled_at', { ascending: false });

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
    } else {
      setAppointments(appointmentsData || []);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    // Sales can't change status to churned (admin only)
    if (editedClient.status === 'churned' && client?.status !== 'churned') {
      toast.error('Only admin can mark clients as churned');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('clients')
      .update({
        company_name: editedClient.company_name,
        primary_contact_name: editedClient.primary_contact_name,
        primary_contact_phone: editedClient.primary_contact_phone,
        primary_contact_email: editedClient.primary_contact_email,
        location: editedClient.location,
        status: editedClient.status,
        contract_value: editedClient.contract_value,
        notes: editedClient.notes,
      })
      .eq('id', params.id as string);

    if (error) {
      toast.error('Failed to update client');
      console.error(error);
    } else {
      toast.success('Client updated successfully');
      setEditing(false);
      fetchClientData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'churned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['sales']}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout allowedRoles={['sales']}>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Client not found</h2>
            <p className="text-gray-600 mt-2">This client may not be assigned to you</p>
            <button
              onClick={() => router.push('/sales/clients')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to My Clients
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    appointment_type: 'meeting',
    scheduled_at: '',
    duration_minutes: 60,
    note: '',
  });

  const handleCreateAppointment = async () => {
    if (!newAppointment.title || !newAppointment.scheduled_at) {
      toast.error('Title and Date/Time are required');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('client_appointments')
      .insert({
        client_id: params.id as string,
        title: newAppointment.title,
        appointment_type: newAppointment.appointment_type,
        scheduled_at: new Date(newAppointment.scheduled_at).toISOString(),
        duration_minutes: newAppointment.duration_minutes,
        note: newAppointment.note,
        created_by: profile!.id,
        status: 'scheduled'
      });

    if (error) {
      toast.error('Failed to create appointment');
      console.error(error);
    } else {
      toast.success('Appointment scheduled successfully');
      setShowAppointmentModal(false);
      setNewAppointment({
        title: '',
        appointment_type: 'meeting',
        scheduled_at: '',
        duration_minutes: 60,
        note: '',
      });
      fetchClientData();
    }
  };

  return (
    <DashboardLayout allowedRoles={['sales']}>
      <Toaster position="top-right" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/sales/clients')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center text-sm"
            >
              ← Back to My Clients
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{client.company_name}</h1>
            <span className={`inline-block mt-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(client.status)}`}>
              {client.status}
            </span>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              Edit Client
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
                  setEditedClient(client);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedClient.company_name || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{client.company_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedClient.primary_contact_name || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, primary_contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{client.primary_contact_name || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      value={editedClient.primary_contact_email || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, primary_contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      {client.primary_contact_email ? (
                        <>
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {client.primary_contact_email}
                        </>
                      ) : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editedClient.primary_contact_phone || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, primary_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      {client.primary_contact_phone ? (
                        <>
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {client.primary_contact_phone}
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
                      value={editedClient.location || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      {client.location ? (
                        <>
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {client.location}
                        </>
                      ) : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {editing ? (
                    <select
                      value={editedClient.status || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      {/* Only show churned if already churned (can't change to churned) */}
                      {client.status === 'churned' && <option value="churned">Churned</option>}
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
              {editing ? (
                <textarea
                  value={editedClient.notes || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes about this client..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{client.notes || 'No notes added yet.'}</p>
              )}
            </div>

            {/* Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Appointments</h2>
                <button 
                  onClick={() => setShowAppointmentModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Appointment
                </button>
              </div>
              {appointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{apt.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{apt.appointment_type.toUpperCase()}</p>
                          <p className="text-sm text-gray-600 mt-2 flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {new Date(apt.scheduled_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <Clock className="w-4 h-4 mr-2" />
                            {apt.duration_minutes} minutes
                          </p>
                          {apt.note && (
                            <p className="text-sm text-gray-600 mt-2 italic">"{apt.note}"</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAppointmentStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <DocumentsSection 
              entityId={params.id as string} 
              entityType="client" 
              bucket="client-documents" 
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Contract Value</p>
                  {editing ? (
                    <input
                      type="number"
                      value={editedClient.contract_value || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, contract_value: parseFloat(e.target.value) || null })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 flex items-center">
                      <DollarSign className="w-5 h-5 mr-1" />
                      {client.contract_value ? client.contract_value.toLocaleString() : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Onboarded</p>
                  <p className="text-lg font-semibold text-gray-900 flex items-center mt-1">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {new Date(client.onboarded_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
                  <FileText className="w-4 h-4" />
                  View Documents
                </button>
                <button 
                  onClick={() => setShowAppointmentModal(true)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Schedule Meeting
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Schedule New Appointment</h2>
              <button 
                onClick={() => setShowAppointmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                  placeholder="e.g. Onboarding Session"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                <select
                  value={newAppointment.appointment_type}
                  onChange={(e) => setNewAppointment({ ...newAppointment, appointment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="training">Training</option>
                  <option value="demo">Demo</option>
                  <option value="review">Review</option>
                  <option value="support">Support</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={newAppointment.scheduled_at}
                    onChange={(e) => setNewAppointment({ ...newAppointment, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={newAppointment.duration_minutes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, duration_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newAppointment.note}
                  onChange={(e) => setNewAppointment({ ...newAppointment, note: e.target.value })}
                  rows={3}
                  placeholder="Add any additional context..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={handleCreateAppointment}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Schedule
              </button>
              <button 
                onClick={() => setShowAppointmentModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors"
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
