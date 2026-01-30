// ============================================
// CLIENT MANAGEMENT - TYPE DEFINITIONS
// TypeScript types for client system
// ============================================

export type ClientStatus = 'active' | 'paused' | 'completed' | 'churned';

export type AppointmentType = 
  | 'onboarding'
  | 'training'
  | 'demo'
  | 'review'
  | 'support'
  | 'meeting'
  | 'other';

export type AppointmentStatus = 
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type ClientDocumentType = 
  | 'contract'
  | 'invoice'
  | 'asset'
  | 'report'
  | 'other';

export type DocumentReviewStatus = 'pending' | 'approved' | 'rejected';

// ============================================
// CLIENT
// ============================================
export interface Client {
  id: string;
  lead_id: string | null;
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  location: string | null;
  status: ClientStatus;
  managed_by: string | null;
  contract_value: number | null;
  notes: string | null;
  onboarded_at: string;
  created_at: string;
  updated_at: string;
}

// Client with manager info
export interface ClientWithManager extends Client {
  manager?: {
    id: string;
    full_name: string;
    role: string;
  };
}

// Client with lead info
export interface ClientWithLead extends Client {
  lead?: {
    id: string;
    business_name: string;
    source: string | null;
    created_at: string;
  };
}

// ============================================
// CLIENT APPOINTMENT
// ============================================
export interface ClientAppointment {
  id: string;
  client_id: string;
  title: string;
  appointment_type: AppointmentType;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  note: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Appointment with client info
export interface AppointmentWithClient extends ClientAppointment {
  client?: {
    id: string;
    company_name: string;
    primary_contact_name: string | null;
  };
  creator?: {
    id: string;
    full_name: string;
  };
}

// ============================================
// CLIENT DOCUMENT
// ============================================
export interface ClientDocument {
  id: string;
  client_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: ClientDocumentType;
  review_status: DocumentReviewStatus | null;
  description: string | null;
  uploaded_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Document with uploader info
export interface DocumentWithUploader extends ClientDocument {
  uploader?: {
    id: string;
    full_name: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
  };
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface CreateClientData {
  lead_id?: string;
  company_name: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  location?: string;
  managed_by?: string;
  contract_value?: number;
  notes?: string;
}

export interface UpdateClientData {
  company_name?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  location?: string;
  status?: ClientStatus;
  managed_by?: string;
  contract_value?: number;
  notes?: string;
}

export interface CreateAppointmentData {
  client_id: string;
  title: string;
  appointment_type: AppointmentType;
  scheduled_at: string;
  duration_minutes?: number;
  note?: string;
}

export interface UpdateAppointmentData {
  title?: string;
  appointment_type?: AppointmentType;
  scheduled_at?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  note?: string;
  completed_at?: string;
}

export interface UploadClientDocumentData {
  client_id: string;
  file: File;
  file_type: ClientDocumentType;
  description?: string;
}

// ============================================
// STATISTICS & ANALYTICS
// ============================================

export interface ClientStats {
  total_clients: number;
  active_clients: number;
  paused_clients: number;
  completed_clients: number;
  churned_clients: number;
  total_contract_value: number;
  avg_contract_value: number;
  clients_by_manager: {
    manager_id: string;
    manager_name: string;
    client_count: number;
  }[];
}

export interface AppointmentStats {
  total_appointments: number;
  scheduled_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  upcoming_appointments: ClientAppointment[];
}

export interface ConversionStats {
  total_leads: number;
  total_clients: number;
  conversion_rate: number;
  avg_time_to_conversion_days: number;
  conversions_by_month: {
    month: string;
    count: number;
  }[];
}

// ============================================
// FILTERS
// ============================================

export interface ClientFilters {
  status?: ClientStatus;
  managed_by?: string;
  search?: string; // Search by company name or contact
  min_contract_value?: number;
  max_contract_value?: number;
  onboarded_after?: string;
  onboarded_before?: string;
}

export interface AppointmentFilters {
  client_id?: string;
  status?: AppointmentStatus;
  appointment_type?: AppointmentType;
  scheduled_after?: string;
  scheduled_before?: string;
  created_by?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ClientListResponse {
  clients: ClientWithManager[];
  total: number;
  page: number;
  per_page: number;
}

export interface AppointmentListResponse {
  appointments: AppointmentWithClient[];
  total: number;
  page: number;
  per_page: number;
}

export interface DocumentListResponse {
  documents: DocumentWithUploader[];
  total: number;
}
