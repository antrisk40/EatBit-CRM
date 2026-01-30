'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  Database, Plus, Edit2, ArrowRight, Trash2, X, Save,
  Phone, Mail, MapPin, DollarSign, TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface RawData {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location: string | null;
  industry: string | null;
  source: string | null;
  notes: string | null;
  estimated_value: number | null;
  priority: string;
  status: string;
  converted_to_lead_id: string | null;
  created_at: string;
  pending_review?: boolean;
}

export default function InternRawDataPage() {
  const [rawData, setRawData] = useState<RawData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingData, setEditingData] = useState<RawData | null>(null);
  
  const [newData, setNewData] = useState({
    business_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    location: '',
    industry: '',
    source: '',
    notes: '',
    estimated_value: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchRawData();
  }, []);

  const fetchRawData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch raw data
    const { data, error } = await supabase
      .from('raw_data')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } else {
      // Fetch pending reviews to mark items
      const { data: reviews } = await supabase
        .from('reviews')
        .select('entity_id')
        .eq('entity_type', 'raw_data_conversion')
        .eq('review_status', 'pending');

      const pendingIds = new Set(reviews?.map(r => r.entity_id) || []);
      
      setRawData((data || []).map(item => ({
        ...item,
        pending_review: pendingIds.has(item.id)
      })));
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newData.business_name) {
      toast.error('Business name is required');
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('raw_data')
      .insert({
        ...newData,
        estimated_value: newData.estimated_value ? parseFloat(newData.estimated_value) : null,
        created_by: user?.id,
      });

    if (error) {
      toast.error('Failed to create raw data');
      console.error(error);
    } else {
      toast.success('Raw data created successfully!');
      setShowCreateModal(false);
      setNewData({
        business_name: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        location: '',
        industry: '',
        source: '',
        notes: '',
        estimated_value: '',
        priority: 'medium',
      });
      fetchRawData();
    }
  };

  const handleUpdate = async () => {
    if (!editingData) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('raw_data')
      .update({
        business_name: editingData.business_name,
        contact_name: editingData.contact_name,
        contact_phone: editingData.contact_phone,
        contact_email: editingData.contact_email,
        location: editingData.location,
        industry: editingData.industry,
        source: editingData.source,
        notes: editingData.notes,
        estimated_value: editingData.estimated_value,
        priority: editingData.priority,
      })
      .eq('id', editingData.id);

    if (error) {
      toast.error('Failed to update');
      console.error(error);
    } else {
      toast.success('Updated successfully!');
      setShowEditModal(false);
      setEditingData(null);
      fetchRawData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this raw data?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('raw_data')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Deleted successfully!');
      fetchRawData();
    }
  };

  const handleConvertToLead = async (id: string, businessName: string, item: RawData) => {
    if (item.pending_review) {
      toast.error('Already pending review');
      return;
    }

    if (!confirm(`Submit "${businessName}" for conversion review? An admin will need to approve this before it becomes a Lead.`)) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          entity_type: 'raw_data_conversion',
          entity_id: id,
          proposed_data: {
            ...item,
            conversion_source: 'raw_data_page'
          },
          submitted_by: user?.id,
          review_status: 'pending'
        });

      if (reviewError) throw reviewError;
      
      toast.success('Submitted for conversion review!');
      fetchRawData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to submit review');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      converted_to_lead: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Group raw data by date
  const groupedData = rawData.reduce((acc: any, item) => {
    const date = new Date(item.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  // Sort dates: Today at top, Old at bottom
  const sortedDates = Object.keys(groupedData).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['intern', 'admin']}>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-48 bg-gray-200 rounded-xl"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['intern', 'admin']}>
      <Toaster position="top-right" />
      
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Raw Data Pipeline</h1>
            <p className="text-gray-600 mt-1">Sectioned by date • Old data at bottom</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 font-bold"
          >
            <Plus className="w-5 h-5" />
            Add Entry
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Vault</p>
            <p className="text-3xl font-black text-gray-900 leading-none">{rawData.length}</p>
          </div>
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Incoming</p>
            <p className="text-3xl font-black text-blue-900 leading-none">{rawData.filter(d => d.status === 'new').length}</p>
          </div>
          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
             <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">In Review</p>
             <p className="text-3xl font-black text-orange-900 leading-none">{rawData.filter(d => d.pending_review).length}</p>
          </div>
          <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
             <p className="text-xs font-black text-green-400 uppercase tracking-widest mb-1">Success</p>
             <p className="text-3xl font-black text-green-900 leading-none">{rawData.filter(d => d.status === 'converted_to_lead').length}</p>
          </div>
        </div>

        {/* Data Sections */}
        {rawData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <Database className="w-20 h-20 text-gray-200 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No data collected yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8">Your pipeline is empty! Start by adding raw business data to convert them into leads.</p>
            <button onClick={() => setShowCreateModal(true)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Add First Entry</button>
          </div>
        ) : (
          <div className="space-y-12">
            {sortedDates.map(date => (
              <div key={date}>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{date}</h2>
                  <div className="h-[1px] w-full bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedData[date].map((data: RawData) => (
                    <div key={data.id} className={`bg-white rounded-2xl shadow-sm border p-6 transition-all hover:shadow-xl hover:-translate-y-1 ${data.pending_review ? 'border-orange-200 bg-orange-50/10' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{data.business_name}</h3>
                          {data.industry && <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">{data.industry}</p>}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                           {data.pending_review ? (
                             <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-orange-500 text-white flex items-center gap-1 shadow-sm">
                               <Clock className="w-3 h-3" /> In Review
                             </span>
                           ) : (
                             <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(data.status)}`}>
                               {data.status.replace('_', ' ')}
                             </span>
                           )}
                           <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${getPriorityColor(data.priority)}`}>
                             {data.priority}
                           </span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        {data.contact_name && <p className="text-sm text-gray-900 font-semibold"><span className="text-gray-400 font-normal">Contact:</span> {data.contact_name}</p>}
                        <div className="flex flex-col gap-2">
                           {data.contact_phone && <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-100"><Phone className="w-4 h-4 text-gray-400" /> {data.contact_phone}</div>}
                           {data.contact_email && <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-100"><Mail className="w-4 h-4 text-gray-400" /> {data.contact_email}</div>}
                           {data.location && <div className="flex items-center gap-3 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" /> {data.location}</div>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex gap-1">
                          {data.status !== 'converted_to_lead' && !data.pending_review && (
                            <>
                              <button onClick={() => { setEditingData(data); setShowEditModal(true); }} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleConvertToLead(data.id, data.business_name, data)} className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition-colors" title="Submit for Conversion"><ArrowRight className="w-4 h-4" /></button>
                              {typeof window !== 'undefined' && window.location.pathname.includes('/admin') && (
                                <button onClick={() => handleDelete(data.id)} className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                          {data.pending_review && (
                            <span className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-lg">
                              Awaiting Approval
                            </span>
                          )}
                          {data.status === 'converted_to_lead' && (
                            <span className="text-[10px] font-black text-green-600 uppercase flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-lg">
                              <CheckCircle className="w-3 h-3" /> Transferred to Leads
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-300">
                          {new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-none mb-2">New Pipeline Entry</h2>
                <p className="text-gray-500 text-sm">Fill in the details for the new business lead prospect.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto px-1">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Business Name *</label>
                <input type="text" value={newData.business_name} onChange={(e) => setNewData({ ...newData, business_name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold placeholder:text-gray-300" placeholder="e.g. Acme Innovations" />
              </div>
              <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Contact Name</label><input type="text" value={newData.contact_name} onChange={(e) => setNewData({ ...newData, contact_name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold" /></div>
              <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Phone</label><input type="tel" value={newData.contact_phone} onChange={(e) => setNewData({ ...newData, contact_phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold" /></div>
              <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email</label><input type="email" value={newData.contact_email} onChange={(e) => setNewData({ ...newData, contact_email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold" /></div>
              <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location</label><input type="text" value={newData.location} onChange={(e) => setNewData({ ...newData, location: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold" /></div>
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Priority</label>
                <select value={newData.priority} onChange={(e) => setNewData({ ...newData, priority: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div><label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Est. Value ($)</label><input type="number" value={newData.estimated_value} onChange={(e) => setNewData({ ...newData, estimated_value: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold" /></div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={handleCreate} className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">Save Entry</button>
              <button onClick={() => setShowCreateModal(false)} className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Condensed version) */}
      {showEditModal && editingData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl">
             <h2 className="text-2xl font-black text-gray-900 mb-8">Refine Data</h2>
             {/* Edit fields same as create, but mapping to editingData */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="md:col-span-2"><label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Business Name</label><input value={editingData.business_name} onChange={e => setEditingData({...editingData, business_name: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" /></div>
                <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Value</label><input type="number" value={editingData.estimated_value || ''} onChange={e => setEditingData({...editingData, estimated_value: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold" /></div>
                <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Priority</label><select value={editingData.priority} onChange={e => setEditingData({...editingData, priority: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-black uppercase text-[10px]"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
             </div>
             <div className="flex gap-4">
                <button onClick={handleUpdate} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-green-100">Update Entry</button>
                <button onClick={() => { setShowEditModal(false); setEditingData(null); }} className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs">Dismiss</button>
             </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
