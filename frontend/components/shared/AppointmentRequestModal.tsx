'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, FileText, Send, User, Building, Phone, Mail, MapPin, Video, Maximize2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import FilePreviewModal from './FilePreviewModal';


interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface Lead {
  id: string;
  business_name: string;
  contact_name: string;
}

interface Client {
  id: string;
  company_name: string;
  primary_contact_name: string;
}

interface AppointmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentUserId: string;
  initialData?: any; // Data for editing
  editMode?: boolean;
}

export default function AppointmentRequestModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  initialData,
  editMode = false
}: AppointmentRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [formData, setFormData] = useState({

    title: '',
    description: '',
    appointment_type: 'meeting',
    requested_date: '',
    requested_time: '',
    duration_minutes: 60,
    requested_with: '',
    attendees: [] as string[],
    location: '',
    meeting_link: '',
    
    // Related entity
    related_to_type: 'none' as 'none' | 'lead' | 'client' | 'external',
    related_to_lead_id: '',
    related_to_client_id: '',
    
    // External contact
    external_contact_name: '',
    external_contact_phone: '',
    external_contact_email: '',
    external_contact_company: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (initialData) {
        // Parse date and time from ISO string
        const dateObj = new Date(initialData.requested_date);
        const date = dateObj.toISOString().split('T')[0];
        const time = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        setFormData({
          title: initialData.title || '',
          description: initialData.description || '',
          appointment_type: initialData.appointment_type || 'meeting',
          requested_date: date,
          requested_time: time,
          duration_minutes: initialData.duration_minutes || 60,
          requested_with: initialData.requested_with || '',
          attendees: initialData.attendees || [],
          location: initialData.location || '',
          meeting_link: initialData.meeting_link || '',
          related_to_type: initialData.related_to_type || 'none',
          related_to_lead_id: initialData.related_to_lead_id || '',
          related_to_client_id: initialData.related_to_client_id || '',
          external_contact_name: initialData.external_contact_name || '',
          external_contact_phone: initialData.external_contact_phone || '',
          external_contact_email: initialData.external_contact_email || '',
          external_contact_company: initialData.external_contact_company || ''
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const fetchData = async () => {
    const supabase = createClient();
    
    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .neq('id', currentUserId)
      .order('full_name');

    // Fetch leads
    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, business_name, contact_name')
      .order('business_name');

    // Fetch clients
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, company_name, primary_contact_name')
      .order('company_name');

    if (usersData) setUsers(usersData);
    if (leadsData) setLeads(leadsData);
    if (clientsData) setClients(clientsData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      
      // Combine date and time
      const requestedDateTime = new Date(`${formData.requested_date}T${formData.requested_time}`);

      // Clean attendees list
      const cleanedAttendees = formData.attendees.map(id => id.replace(/['"]+/g, '').trim());
      
      const payload: any = {
        title: formData.title,
        description: formData.description,
        appointment_type: formData.appointment_type,
        requested_date: requestedDateTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        requested_by: currentUserId,
        requested_with: formData.requested_with.replace(/['"]+/g, '').trim(),
        attendees: cleanedAttendees,
        location: formData.location || null,
        meeting_link: formData.meeting_link || null,
        status: 'pending' // Reset to pending if it was rejected
      };

      // Add related entity data
      if (formData.related_to_type !== 'none') {
        payload.related_to_type = formData.related_to_type;
        
        if (formData.related_to_type === 'lead') {
          payload.related_to_lead_id = formData.related_to_lead_id;
        } else if (formData.related_to_type === 'client') {
          payload.related_to_client_id = formData.related_to_client_id;
        } else if (formData.related_to_type === 'external') {
          payload.external_contact_name = formData.external_contact_name;
          payload.external_contact_phone = formData.external_contact_phone;
          payload.external_contact_email = formData.external_contact_email;
          payload.external_contact_company = formData.external_contact_company;
        }
      }

      let requestId = initialData?.id;

      if (editMode && requestId) {
        const { error } = await supabase
          .from('appointment_requests')
          .update(payload)
          .eq('id', requestId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('appointment_requests')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        requestId = data.id;
      }

      // Handle file uploads (Simplified: just records in DB for now)
      if (files.length > 0) {
        for (const file of files) {
          // In a real app, upload to storage first:
          // const { data: uploadData } = await supabase.storage.from('docs').upload(`appts/${requestId}/${file.name}`, file);
          
          await supabase.from('appointment_documents').insert({
            request_id: requestId,
            file_path: `uploads/${file.name}`, // Placeholder path
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: currentUserId
          });
        }
      }

      toast.success(editMode ? 'Request updated successfully!' : 'Appointment request sent successfully!');
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error saving appointment request:', error);
      toast.error(error.message || 'Failed to save appointment request');
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      appointment_type: 'meeting',
      requested_date: '',
      requested_time: '',
      duration_minutes: 60,
      requested_with: '',
      attendees: [],
      location: '',
      meeting_link: '',
      related_to_type: 'none',
      related_to_lead_id: '',
      related_to_client_id: '',
      external_contact_name: '',
      external_contact_phone: '',
      external_contact_email: '',
      external_contact_company: ''
    });
  };

  const toggleAttendee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(userId)
        ? prev.attendees.filter(id => id !== userId)
        : [...prev.attendees, userId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white">
                {editMode ? 'Edit Appointment' : 'Request Appointment'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Appointment Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g., Client Meeting, Product Demo"
            />
          </div>

          {/* Type and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={formData.appointment_type}
                onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="meeting">Meeting</option>
                <option value="call">Phone Call</option>
                <option value="demo">Demo</option>
                <option value="site_visit">Site Visit</option>
                <option value="training">Training</option>
                <option value="review">Review</option>
                <option value="planning">Planning</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Duration *
              </label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.requested_date}
                onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Time *
              </label>
              <input
                type="time"
                value={formData.requested_time}
                onChange={(e) => setFormData({ ...formData, requested_time: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Request With */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Request Appointment With *
            </label>
            <select
              value={formData.requested_with}
              onChange={(e) => setFormData({ ...formData, requested_with: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Select a person...</option>
              {users.filter(u => u.role === 'admin' || u.role === 'sales').map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {/* Related To */}
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Related To (Optional)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['none', 'lead', 'client', 'external'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, related_to_type: type as any })}
                  className={`px-4 py-2 rounded-lg font-bold text-sm capitalize transition-all ${
                    formData.related_to_type === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'none' ? 'None' : type}
                </button>
              ))}
            </div>

            {formData.related_to_type === 'lead' && (
              <select
                value={formData.related_to_lead_id}
                onChange={(e) => setFormData({ ...formData, related_to_lead_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select a lead...</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.business_name} {lead.contact_name && `- ${lead.contact_name}`}
                  </option>
                ))}
              </select>
            )}

            {formData.related_to_type === 'client' && (
              <select
                value={formData.related_to_client_id}
                onChange={(e) => setFormData({ ...formData, related_to_client_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.company_name} {client.primary_contact_name && `- ${client.primary_contact_name}`}
                  </option>
                ))}
              </select>
            )}

            {formData.related_to_type === 'external' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.external_contact_name}
                    onChange={(e) => setFormData({ ...formData, external_contact_name: e.target.value })}
                    placeholder="Contact Name *"
                    required={formData.related_to_type === 'external'}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <input
                    type="text"
                    value={formData.external_contact_company}
                    onChange={(e) => setFormData({ ...formData, external_contact_company: e.target.value })}
                    placeholder="Company Name"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="tel"
                    value={formData.external_contact_phone}
                    onChange={(e) => setFormData({ ...formData, external_contact_phone: e.target.value })}
                    placeholder="Phone Number"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <input
                    type="email"
                    value={formData.external_contact_email}
                    onChange={(e) => setFormData({ ...formData, external_contact_email: e.target.value })}
                    placeholder="Email Address"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location and Meeting Link */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location (Optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Office, Client Site"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Meeting Link (Optional)
              </label>
              <input
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="e.g., Zoom, Google Meet link"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Additional Attendees */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Additional Attendees (Optional)
            </label>
            <div className="border border-gray-300 rounded-xl p-4 max-h-48 overflow-y-auto">
              {users.filter(u => u.id !== formData.requested_with).length === 0 ? (
                <p className="text-gray-500 text-sm">No other users available</p>
              ) : (
                <div className="space-y-2">
                  {users.filter(u => u.id !== formData.requested_with).map(user => (
                    <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.attendees.includes(user.id)}
                        onChange={() => toggleAttendee(user.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {user.full_name} <span className="text-gray-500">({user.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-all cursor-pointer relative mb-3">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Click or drag files to upload documents
              </p>
            </div>

            {/* Selected Files Preview List */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {files.map((file, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setPreviewFile({
                      url: URL.createObjectURL(file),
                      name: file.name,
                      type: file.type
                    })}
                    className="flex flex-col items-center p-2 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-500 transition-all cursor-pointer group w-24"
                  >
                    <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center mb-2 overflow-hidden relative">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      ) : file.type.startsWith('video/') ? (
                        <div className="flex flex-col items-center">
                          <Video className="w-6 h-6 text-blue-600" />
                          <span className="text-[8px] font-black text-blue-600 uppercase">Video</span>
                        </div>
                      ) : (
                        <FileText className="w-6 h-6 text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-700 truncate w-full text-center font-medium">
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              placeholder="Add any additional details about this appointment..."
            />
          </div>


          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Request
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
        />
      )}
    </div>
  );
}

