'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Loader2, 
  Plus, 
  X,
  FileIcon,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  created_at: string;
  uploaded_by?: string;
  review_status?: string;
}

interface DocumentsSectionProps {
  entityId: string;
  entityType: 'lead' | 'client' | 'appointment';
  bucket: string;
}

export default function DocumentsSection({ entityId, entityType, bucket }: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('other');
  const [description, setDescription] = useState('');

  const tableName = entityType === 'lead' ? 'lead_documents' : 'client_documents';
  const idColumn = entityType === 'lead' ? 'lead_id' : 'client_id';

  useEffect(() => {
    fetchDocuments();
  }, [entityId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from(tableName)
      .select('id, file_name, file_path, file_type, created_at, review_status, description')
      .eq(idColumn, entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Upload to Storage
    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${entityId}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, selectedFile);

    if (uploadError) {
      toast.error('Failed to upload file to storage');
      console.error(uploadError);
      setUploading(false);
      return;
    }

    // 2. Insert into Database
    const { error: dbError } = await supabase
      .from(tableName)
      .insert({
        [idColumn]: entityId,
        file_name: selectedFile.name,
        file_path: filePath,
        file_type: docType,
        file_size: selectedFile.size,
        description: description,
        uploaded_by: user?.id,
        review_status: 'pending'
      });

    if (dbError) {
      toast.error('Failed to save document info');
      console.error(dbError);
      // Optional: cleanup storage
    } else {
      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDescription('');
      fetchDocuments();
    }
    setUploading(false);
  };

  const handleDownload = async (doc: Document) => {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(doc.file_path);

    if (error) {
      toast.error('Failed to download file');
    } else {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const supabase = createClient();
    
    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([doc.file_path]);

    if (storageError) {
      toast.error('Failed to remove from storage');
      return;
    }

    // 2. Delete from database
    const { error: dbError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', doc.id);

    if (dbError) {
      toast.error('Failed to delete from database');
    } else {
      toast.success('Document deleted');
      fetchDocuments();
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Documents
        </h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
          <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-900 truncate" title={doc.file_name}>
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-gray-500 uppercase flex items-center gap-2 mt-1">
                    {doc.file_type} • {formatSize(doc.file_size)}
                    {doc.review_status && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        doc.review_status === 'approved' ? 'bg-green-100 text-green-700' :
                        doc.review_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {doc.review_status}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-gray-900">Upload Document</h4>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {entityType === 'lead' ? (
                    <>
                      <option value="proposal">Proposal</option>
                      <option value="contract">Draft Contract</option>
                      <option value="requirement">Requirements</option>
                      <option value="other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="contract">Final Contract</option>
                      <option value="invoice">Invoice</option>
                      <option value="asset">Project Asset</option>
                      <option value="report">Report</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this document about?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Upload Now'}
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
