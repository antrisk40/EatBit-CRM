-- ============================================
-- EATBIT CRM - COMPLETE MASTER SCHEMA
-- Combined Schema, Security, and Business Logic
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TRIGGER FUNCTIONS (CORE)
-- ============================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. TABLES
-- ============================================

-- 2.1 PROFILES (users, roles, salary, activity)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'intern')),
  status TEXT NOT NULL CHECK (status IN ('active', 'banned', 'suspended')) DEFAULT 'active',
  salary NUMERIC,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL,
  logout_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 LEADS (PRE-SALE)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  location TEXT,
  source TEXT,
  
  status TEXT NOT NULL CHECK (
    status IN (
      'new',
      'contacted',
      'qualified',
      'proposal_sent',
      'closed_won',
      'closed_lost'
    )
  ) DEFAULT 'new',
  
  proposed_status TEXT CHECK (
    proposed_status IN (
      'contacted',
      'qualified',
      'proposal_sent',
      'closed_won',
      'closed_lost'
    )
  ),
  
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  next_followup_at DATE,
  followup_note TEXT,
  estimated_value NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 LEAD FOLLOWUPS
CREATE TABLE IF NOT EXISTS lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  followup_date DATE NOT NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5 LEAD DOCUMENTS
CREATE TABLE IF NOT EXISTS lead_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image', 'contract', 'invoice', 'asset', 'report', 'other')),
  review_status TEXT NOT NULL CHECK (
    review_status IN ('pending', 'approved', 'rejected')
  ) DEFAULT 'pending',
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.6 REVIEWS QUEUE
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead_status', 'document', 'raw_data_conversion')),
  entity_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id),
  proposed_data JSONB NOT NULL,
  submitted_by UUID REFERENCES profiles(id),
  review_status TEXT NOT NULL CHECK (
    review_status IN ('pending', 'approved', 'rejected')
  ) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.7 INCENTIVES / PAYOUTS
CREATE TABLE IF NOT EXISTS incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  intern_id UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 2.8 CLIENTS (POST-SALE)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE RESTRICT,
  
  company_name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_phone TEXT,
  primary_contact_email TEXT,
  location TEXT,
  
  status TEXT NOT NULL CHECK (
    status IN ('active', 'paused', 'completed', 'churned')
  ) DEFAULT 'active',
  
  managed_by UUID REFERENCES profiles(id),
  contract_value NUMERIC,
  onboarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.8.1 CLIENT DOCUMENTS
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image', 'contract', 'invoice', 'asset', 'report', 'other')),
  review_status TEXT NOT NULL CHECK (
    review_status IN ('pending', 'approved', 'rejected')
  ) DEFAULT 'pending',
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.9 RAW DATA (PIPELINE)
CREATE TABLE IF NOT EXISTS raw_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  location TEXT,
  industry TEXT,
  source TEXT,
  notes TEXT,
  estimated_value NUMERIC(12, 2),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('new', 'verified', 'converted_to_lead', 'rejected')) DEFAULT 'new',
  converted_to_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.10 DATA ACCESS CONTROL
CREATE TABLE IF NOT EXISTS data_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('lead', 'client', 'project', 'raw_data')),
  resource_id UUID NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'edit', 'full')) DEFAULT 'view',
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.11 CLIENT APPOINTMENTS (BASE)
CREATE TABLE IF NOT EXISTS client_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  appointment_type TEXT NOT NULL CHECK (
    appointment_type IN (
      'onboarding',
      'training',
      'demo',
      'review',
      'support',
      'meeting',
      'call',
      'site_visit',
      'planning',
      'other'
    )
  ),
  
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  
  status TEXT NOT NULL CHECK (
    status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')
  ) DEFAULT 'scheduled',
  note TEXT,
  
  location TEXT,
  meeting_link TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_all_day BOOLEAN DEFAULT FALSE,
  
  created_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.12 APPOINTMENT REQUESTS
CREATE TABLE IF NOT EXISTS appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  appointment_type TEXT NOT NULL, -- Reuses appointment types
  requested_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_with UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  related_to_type TEXT CHECK (related_to_type IN ('lead', 'client', 'external')),
  related_to_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  external_contact_name TEXT,
  external_contact_phone TEXT,
  external_contact_email TEXT,
  external_contact_company TEXT,
  attendees JSONB DEFAULT '[]'::JSONB,
  location TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  appointment_id UUID REFERENCES client_appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.13 APPOINTMENT ATTENDEES
CREATE TABLE IF NOT EXISTS appointment_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES client_appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'accepted', 'declined', 'tentative')) DEFAULT 'invited',
  response_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, user_id)
);

-- 2.14 APPOINTMENT DOCUMENTS
CREATE TABLE IF NOT EXISTS appointment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES client_appointments(id) ON DELETE CASCADE,
  request_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.15 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'appointment_request',
      'appointment_approved',
      'appointment_rejected',
      'appointment_reminder',
      'appointment_cancelled',
      'appointment_updated'
    )
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_type TEXT CHECK (related_type IN ('appointment_request', 'appointment')),
  related_id UUID,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.16 PROJECTS & TASKS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')) DEFAULT 'planning',
  budget NUMERIC(12, 2),
  actual_cost NUMERIC(12, 2),
  start_date DATE,
  end_date DATE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.17 ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  meta JSONB,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.18 PIPELINE HISTORY
CREATE TABLE IF NOT EXISTS pipeline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('raw_data', 'lead', 'client')),
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_clients_managed_by ON clients(managed_by);
CREATE INDEX IF NOT EXISTS idx_raw_data_status ON raw_data(status);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON client_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON client_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_status ON appointment_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Auto-update updated_at for all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON client_appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointment_requests_updated_at BEFORE UPDATE ON appointment_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_raw_data_updated_at BEFORE UPDATE ON raw_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update last_activity_at on profiles
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_activity_at = NOW() WHERE id = NEW.performed_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_activity AFTER INSERT ON activity_logs FOR EACH ROW EXECUTE FUNCTION update_last_activity();

-- Appointment Time Change Handler
CREATE OR REPLACE FUNCTION handle_appointment_time_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at THEN
    IF NEW.status NOT IN ('cancelled', 'completed') THEN
      NEW.status := 'rescheduled';
    END IF;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_time_change_trigger
  BEFORE UPDATE ON client_appointments
  FOR EACH ROW
  WHEN (OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at)
  EXECUTE FUNCTION handle_appointment_time_change();

-- Lead to Client Auto-Conversion
CREATE OR REPLACE FUNCTION create_client_on_win()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed_won' AND (OLD.status IS NULL OR OLD.status != 'closed_won')
     AND NOT EXISTS (SELECT 1 FROM clients WHERE lead_id = NEW.id)
  THEN
    INSERT INTO clients (lead_id, company_name, primary_contact_name, primary_contact_phone, primary_contact_email, location, managed_by, contract_value, notes)
    VALUES (NEW.id, NEW.business_name, NEW.contact_name, NEW.contact_phone, NEW.contact_email, NEW.location, NEW.assigned_to, NEW.estimated_value, 'Automatically created from lead #' || NEW.id);
    
    INSERT INTO activity_logs (entity_type, entity_id, action, meta, performed_by)
    VALUES ('client', (SELECT id FROM clients WHERE lead_id = NEW.id), 'created_from_lead', jsonb_build_object('lead_id', NEW.id, 'company_name', NEW.business_name, 'converted_at', NOW()), NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_client_on_win AFTER UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION create_client_on_win();

-- ============================================
-- 5. HELPER FUNCTIONS & SECURITY
-- ============================================

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_sales() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sales');
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_intern() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'intern');
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;

-- 6.1 PROFILES
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "users_read_other_profiles" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('sales', 'intern')));

-- 6.2 LEADS
CREATE POLICY "admin_full_access_leads" ON leads FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "sales_view_assigned_leads" ON leads FOR SELECT TO authenticated USING (assigned_to = auth.uid() AND is_sales());
CREATE POLICY "sales_update_assigned_leads" ON leads FOR UPDATE TO authenticated USING (assigned_to = auth.uid() AND is_sales()) WITH CHECK (assigned_to = auth.uid());
CREATE POLICY "intern_create_leads" ON leads FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND is_intern());
CREATE POLICY "intern_view_own_leads" ON leads FOR SELECT TO authenticated USING (created_by = auth.uid() AND is_intern());

-- 6.3 CLIENT DOCUMENTS
CREATE POLICY "admin_all_client_documents" ON client_documents FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "users_view_client_documents" ON client_documents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_documents.client_id AND (clients.managed_by = auth.uid() OR is_admin()))
);
CREATE POLICY "users_upload_client_documents" ON client_documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

-- 6.4 APPOINTMENTS & REQUESTS
CREATE POLICY "admin_all_appointment_requests" ON appointment_requests FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "users_create_appointment_requests" ON appointment_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "users_view_own_appointment_requests" ON appointment_requests FOR SELECT TO authenticated USING (auth.uid() = requested_by OR auth.uid() = requested_with OR is_admin());

CREATE POLICY "admin_full_access_appointments" ON client_appointments FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "users_view_own_appointments" ON client_appointments FOR SELECT TO authenticated USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM appointment_attendees WHERE appointment_id = client_appointments.id AND user_id = auth.uid()) OR is_admin());
CREATE POLICY "users_update_own_appointments" ON client_appointments FOR UPDATE TO authenticated USING (created_by = auth.uid() OR is_admin()) WITH CHECK (created_by = auth.uid() OR is_admin());
CREATE POLICY "users_update_attended_appointments" ON client_appointments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM appointment_attendees WHERE appointment_id = client_appointments.id AND user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM appointment_attendees WHERE appointment_id = client_appointments.id AND user_id = auth.uid())
);

-- 6.4 NOTIFICATIONS
CREATE POLICY "users_view_own_notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "system_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- 7. BUSINESS LOGIC FUNCTIONS
-- ============================================

-- Function to approve appointment request (Robust Version)
CREATE OR REPLACE FUNCTION approve_appointment_request(request_id UUID, client_id_param UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  request_record RECORD;
  new_appointment_id UUID;
  determined_client_id UUID;
  attendee_id_text TEXT;
  clean_uuid UUID;
BEGIN
  SELECT * INTO request_record FROM appointment_requests WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  
  determined_client_id := COALESCE(client_id_param, CASE WHEN request_record.related_to_type = 'client' THEN request_record.related_to_client_id END);
  
  INSERT INTO client_appointments (client_id, title, appointment_type, scheduled_at, duration_minutes, note, status, created_by, location, meeting_link, color)
  VALUES (determined_client_id, request_record.title, request_record.appointment_type, request_record.requested_date, request_record.duration_minutes, request_record.description, 'scheduled', request_record.requested_by, request_record.location, request_record.meeting_link, '#10b981')
  RETURNING id INTO new_appointment_id;
  
  INSERT INTO appointment_attendees (appointment_id, user_id, status) VALUES (new_appointment_id, request_record.requested_by, 'accepted'), (new_appointment_id, request_record.requested_with, 'accepted');
  
  IF request_record.attendees IS NOT NULL AND jsonb_array_length(request_record.attendees) > 0 THEN
    FOR attendee_id_text IN SELECT jsonb_array_elements_text(request_record.attendees) LOOP
      BEGIN
        attendee_id_text := REPLACE(REPLACE(TRIM(attendee_id_text), '"', ''), '''', '');
        clean_uuid := attendee_id_text::uuid;
        INSERT INTO appointment_attendees (appointment_id, user_id, status) VALUES (new_appointment_id, clean_uuid, 'invited') ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Invalid attendee UUID skipped: %', attendee_id_text; END;
    END LOOP;
  END IF;
  
  UPDATE appointment_requests SET status = 'approved', appointment_id = new_appointment_id, reviewed_by = auth.uid(), reviewed_at = NOW() WHERE id = request_id;
  UPDATE appointment_documents SET appointment_id = new_appointment_id WHERE request_id = request_id;
  RETURN new_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert raw data to lead
CREATE OR REPLACE FUNCTION convert_raw_data_to_lead(raw_data_id UUID, assigned_to_user UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_lead_id UUID;
  raw_record RECORD;
BEGIN
  SELECT * INTO raw_record FROM raw_data WHERE id = raw_data_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Raw data not found'; END IF;
  
  INSERT INTO leads (business_name, contact_name, contact_phone, contact_email, location, source, status, estimated_value, assigned_to, created_by)
  VALUES (raw_record.business_name, raw_record.contact_name, raw_record.contact_phone, raw_record.contact_email, raw_record.location, raw_record.source, 'new', raw_record.estimated_value, assigned_to_user, raw_record.created_by)
  RETURNING id INTO new_lead_id;
  
  UPDATE raw_data SET status = 'converted_to_lead', converted_to_lead_id = new_lead_id, converted_at = NOW() WHERE id = raw_data_id;
  RETURN new_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
