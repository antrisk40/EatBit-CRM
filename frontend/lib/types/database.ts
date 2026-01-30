export type UserRole = 'admin' | 'sales' | 'intern';
export type UserStatus = 'active' | 'banned' | 'suspended';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type FileType = 'pdf' | 'image';
export type EntityType = 'lead_status' | 'document';
export type IncentiveStatus = 'pending' | 'paid';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  salary?: number;
  auto_logout_minutes?: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  business_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  location?: string;
  source?: string;
  status: LeadStatus;
  proposed_status?: LeadStatus;
  assigned_to?: string;
  created_by?: string;
  next_followup_at?: string;
  followup_note?: string;
  notes?: string;
  estimated_value?: number;
  created_at: string;
  updated_at: string;
}

export interface LeadWithRelations extends Lead {
  assigned_to_profile?: Profile;
  created_by_profile?: Profile;
}

export interface LeadFollowup {
  id: string;
  lead_id: string;
  followup_date: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface LeadFollowupWithUser extends LeadFollowup {
  created_by_profile?: Profile;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  login_time: string;
  logout_time?: string;
  created_at: string;
}

export interface AttendanceLogWithUser extends AttendanceLog {
  user_profile?: Profile;
}

export interface LeadDocument {
  id: string;
  lead_id: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  file_type: FileType;
  review_status: ReviewStatus;
  uploaded_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  description?: string;
  created_at: string;
}

export interface LeadDocumentWithUser extends LeadDocument {
  uploaded_by_profile?: Profile;
}

export interface Client {
  id: string;
  lead_id: string;
  company_name: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  location?: string;
  status: 'active' | 'paused' | 'completed' | 'churned';
  managed_by?: string;
  contract_value?: number;
  onboarded_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientWithRelations extends Client {
  managed_by_profile?: Profile;
  lead?: Lead;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  file_type: string;
  review_status?: ReviewStatus;
  uploaded_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  description?: string;
  created_at: string;
}

export interface ClientDocumentWithRelations extends ClientDocument {
  uploaded_by_profile?: Profile;
  client?: Client;
}

export interface ClientAppointment {
  id: string;
  client_id: string;
  title: string;
  appointment_type: 'onboarding' | 'training' | 'demo' | 'review' | 'support' | 'meeting' | 'other';
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  note?: string;
  created_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientAppointmentWithRelations extends ClientAppointment {
  client?: Client;
  creator?: Profile;
}

export interface Review {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  lead_id?: string;
  proposed_data: any;
  submitted_by: string;
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ReviewWithRelations extends Review {
  lead?: Lead;
  submitted_by_profile?: Profile;
  reviewed_by_profile?: Profile;
}

export interface Incentive {
  id: string;
  lead_id: string;
  intern_id: string;
  amount: number;
  status: IncentiveStatus;
  triggered_at: string;
  paid_at?: string;
}

export interface IncentiveWithRelations extends Incentive {
  lead?: Lead;
  intern_profile?: Profile;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  meta?: any;
  performed_by: string;
  created_at: string;
}

export interface ActivityLogWithUser extends ActivityLog {
  performed_by_profile?: Profile;
}
