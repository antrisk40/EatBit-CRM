'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  Briefcase, Phone, Mail, MapPin, DollarSign, Calendar, 
  Edit, Save, X, Plus, FileText, Users, Clock 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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
  manager?: {
    full_name: string;
  };
}

interface Appointment {
  id: string;
  title: string;
  appointment_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  note: string | null;
}

export default function AdminClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});

  useEffect(() => {
    fetchClientData();
  }, [params.id]);

  const fetchClientData = async () => {
    const supabase = createClient();
    
    // Fetch client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        *,
        manager:profiles!clients_managed_by_fkey(full_name)
      `)
      .eq('id', params.id as string)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      toast.error('Failed to load client');
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
        managed_by: editedClient.managed_by,
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
      <DashboardLayout allowedRoles={['admin']}>
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
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Client not found</h2>
            <button
              onClick={() => router.push('/admin/clients')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Clients
            </button>
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/clients')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center text-sm"
            >
              ← Back to Clients
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
                      <option value="churned">Churned</option>
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
                <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
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
                          <p className="text-sm text-gray-500 mt-1">{apt.appointment_type}</p>
                          <p className="text-sm text-gray-600 mt-2 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(apt.scheduled_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <Clock className="w-4 h-4 mr-2" />
                            {apt.duration_minutes} minutes
                          </p>
                          {apt.note && (
                            <p className="text-sm text-gray-600 mt-2">{apt.note}</p>
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
                  <p className="text-sm text-gray-600">Account Manager</p>
                  <p className="text-lg font-semibold text-gray-900 flex items-center mt-1">
                    <Users className="w-4 h-4 mr-2" />
                    {client.manager?.full_name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Onboarded</p>
                  <p className="text-lg font-semibold text-gray-900 flex items-center mt-1">
                    <Calendar className="w-4 h-4 mr-2" />
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
                <button className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
                  <Calendar className="w-4 h-4" />
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
    </DashboardLayout>
  );
}
