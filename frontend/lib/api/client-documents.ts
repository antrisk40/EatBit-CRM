// ============================================
// CLIENT DOCUMENTS API - Supabase Functions
// Client document management and storage
// ============================================

import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import type {
  ClientDocument,
  DocumentWithUploader,
  UploadClientDocumentData,
  ClientDocumentType,
  DocumentReviewStatus,
} from '@/lib/types/client';

const BUCKET_NAME = 'client-documents';

// ============================================
// DOCUMENT CRUD OPERATIONS
// ============================================

/**
 * Get all documents for a client
 */
export async function getClientDocuments(clientId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('client_documents')
    .select(`
      *,
      uploader:profiles!client_documents_uploaded_by_fkey(id, full_name),
      reviewer:profiles!client_documents_reviewed_by_fkey(id, full_name)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DocumentWithUploader[];
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('client_documents')
    .select(`
      *,
      uploader:profiles!client_documents_uploaded_by_fkey(id, full_name),
      reviewer:profiles!client_documents_reviewed_by_fkey(id, full_name),
      client:clients!client_documents_client_id_fkey(id, company_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upload a document for a client
 */
export async function uploadClientDocument(uploadData: UploadClientDocumentData) {
  const supabase = createSupabaseClient();
  const { client_id, file, file_type, description } = uploadData;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  // Generate file path: client-id/timestamp-filename
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${client_id}/${timestamp}-${sanitizedFileName}`;

  // Upload file to storage
  const { data: uploadResult, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Create document record
  const { data, error } = await supabase
    .from('client_documents')
    .insert({
      client_id,
      file_path: uploadResult.path,
      file_name: file.name,
      file_size: file.size,
      file_type,
      description,
      uploaded_by: user.id,
    })
    .select(`
      *,
      uploader:profiles!client_documents_uploaded_by_fkey(id, full_name)
    `)
    .single();

  if (error) {
    // Rollback: delete uploaded file
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    throw error;
  }

  // Log activity
  await logActivity('client_document', data.id, 'uploaded', {
    client_id,
    file_name: file.name,
    file_type,
  });

  return data as DocumentWithUploader;
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string) {
  const supabase = createSupabaseClient();
  // Get document to get file path
  const { data: doc, error: fetchError } = await supabase
    .from('client_documents')
    .select('file_path, client_id, file_name')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([doc.file_path]);

  if (storageError) console.error('Storage deletion error:', storageError);

  // Delete database record
  const { error } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log activity
  await logActivity('client_document', id, 'deleted', {
    client_id: doc.client_id,
    file_name: doc.file_name,
  });
}

/**
 * Update document review status
 */
export async function updateDocumentReviewStatus(
  id: string,
  status: DocumentReviewStatus
) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('client_documents')
    .update({
      review_status: status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      uploader:profiles!client_documents_uploaded_by_fkey(id, full_name),
      reviewer:profiles!client_documents_reviewed_by_fkey(id, full_name)
    `)
    .single();

  if (error) throw error;

  // Log activity
  await logActivity('client_document', id, 'review_status_updated', {
    status,
  });

  return data as DocumentWithUploader;
}

/**
 * Get document download URL
 */
export async function getDocumentUrl(filePath: string): Promise<string> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Download a document
 */
export async function downloadDocument(id: string) {
  const doc = await getDocument(id);
  const url = await getDocumentUrl(doc.file_path);

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.file_name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Log activity
  await logActivity('client_document', id, 'downloaded', {
    file_name: doc.file_name,
  });
}

// ============================================
// DOCUMENT QUERIES
// ============================================

/**
 * Get documents by type
 */
export async function getDocumentsByType(
  clientId: string,
  fileType: ClientDocumentType
) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('client_documents')
    .select(`
      *,
      uploader:profiles!client_documents_uploaded_by_fkey(id, full_name)
    `)
    .eq('client_id', clientId)
    .eq('file_type', fileType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DocumentWithUploader[];
}

/**
 * Get pending documents for review
 */
export async function getPendingDocuments() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('client_documents')
    .select(`
      *,
      uploader:profiles!client_documents_uploaded_by_fkey(id, full_name),
      client:clients!client_documents_client_id_fkey(id, company_name)
    `)
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get contracts for a client
 */
export async function getClientContracts(clientId: string) {
  return getDocumentsByType(clientId, 'contract');
}

/**
 * Get invoices for a client
 */
export async function getClientInvoices(clientId: string) {
  return getDocumentsByType(clientId, 'invoice');
}

/**
 * Get document statistics for a client
 */
export async function getClientDocumentStats(clientId: string) {
  const documents = await getClientDocuments(clientId);

  return {
    total: documents.length,
    contracts: documents.filter(d => d.file_type === 'contract').length,
    invoices: documents.filter(d => d.file_type === 'invoice').length,
    assets: documents.filter(d => d.file_type === 'asset').length,
    reports: documents.filter(d => d.file_type === 'report').length,
    pending_review: documents.filter(d => d.review_status === 'pending').length,
    approved: documents.filter(d => d.review_status === 'approved').length,
    rejected: documents.filter(d => d.review_status === 'rejected').length,
  };
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Upload multiple documents
 */
export async function uploadMultipleDocuments(
  clientId: string,
  files: File[],
  fileType: ClientDocumentType
) {
  const results = await Promise.allSettled(
    files.map(file =>
      uploadClientDocument({
        client_id: clientId,
        file,
        file_type: fileType,
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return { successful, failed, results };
}

/**
 * Delete multiple documents
 */
export async function deleteMultipleDocuments(documentIds: string[]) {
  const results = await Promise.allSettled(
    documentIds.map(id => deleteDocument(id))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return { successful, failed, results };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log activity for audit trail
 */
async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  meta: Record<string, any>
) {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from('activity_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    meta,
    performed_by: user.id,
  });
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: ClientDocumentType): string {
  const icons: Record<ClientDocumentType, string> = {
    contract: '📄',
    invoice: '🧾',
    asset: '🖼️',
    report: '📊',
    other: '📎',
  };
  return icons[fileType] || '📎';
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
