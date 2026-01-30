-- ============================================
-- EATBIT CRM - COMPLETE DATABASE SCHEMA
-- Supabase / PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (users, roles, salary, activity)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- 2. ATTENDANCE (login / logout tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL,
  logout_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_login ON attendance_logs(login_time);

-- ============================================
-- 3. LEADS (PRE-SALE)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_at);

-- ============================================
-- 4. FOLLOW-UP HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  followup_date DATE NOT NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_lead ON lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_date ON lead_followups(followup_date);

-- ============================================
-- 5. LEAD DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS lead_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image', 'contract', 'invoice', 'asset', 'report', 'other')),
  review_status TEXT NOT NULL CHECK (
    review_status IN ('pending', 'approved', 'rejected')
  ) DEFAULT 'pending',
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_lead ON lead_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON lead_documents(review_status);

-- ============================================
-- 6. REVIEW QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead_status', 'document')),
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

CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_reviews_lead ON reviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_reviews_entity ON reviews(entity_type, entity_id);

-- ============================================
-- 7. INCENTIVES / PAYOUTS
-- ============================================
CREATE TABLE IF NOT EXISTS incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  intern_id UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_incentives_intern ON incentives(intern_id);
CREATE INDEX IF NOT EXISTS idx_incentives_lead ON incentives(lead_id);
CREATE INDEX IF NOT EXISTS idx_incentives_status ON incentives(status);

-- ============================================
-- 8. CLIENTS (POST-SALE)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_clients_lead ON clients(lead_id);
CREATE INDEX IF NOT EXISTS idx_clients_managed_by ON clients(managed_by);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_name);

-- ============================================
-- 9. CLIENT APPOINTMENTS
-- ============================================
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
      'other'
    )
  ),
  
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  
  status TEXT NOT NULL CHECK (
    status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')
  ) DEFAULT 'scheduled',
  note TEXT,
  
  created_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_client ON client_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON client_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON client_appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON client_appointments(created_by);

-- ============================================
-- 10. CLIENT DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  
  file_type TEXT NOT NULL CHECK (
    file_type IN (
      'contract',
      'invoice',
      'asset',
      'report',
      'other'
    )
  ),
  
  review_status TEXT CHECK (
    review_status IN ('pending', 'approved', 'rejected')
  ) DEFAULT 'pending',
  
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_docs_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_docs_type ON client_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_client_docs_review ON client_documents(review_status);
CREATE INDEX IF NOT EXISTS idx_client_docs_uploaded ON client_documents(uploaded_by);

-- ============================================
-- 11. ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  meta JSONB,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON client_appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON client_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update last_activity_at on profiles
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.performed_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_activity ON activity_logs;
CREATE TRIGGER update_user_activity
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity();

-- ============================================
-- AUTO-CONVERSION: Lead → Client
-- ============================================
CREATE OR REPLACE FUNCTION create_client_on_win()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed_won' 
     AND (OLD.status IS NULL OR OLD.status != 'closed_won')
     AND NOT EXISTS (SELECT 1 FROM clients WHERE lead_id = NEW.id)
  THEN
    INSERT INTO clients (
      lead_id,
      company_name,
      primary_contact_name,
      primary_contact_phone,
      primary_contact_email,
      location,
      managed_by,
      contract_value,
      notes
    )
    VALUES (
      NEW.id,
      NEW.business_name,
      NEW.contact_name,
      NEW.contact_phone,
      NEW.contact_email,
      NEW.location,
      NEW.assigned_to,
      NEW.estimated_value,
      'Automatically created from lead #' || NEW.id
    );
    
    INSERT INTO activity_logs (
      entity_type,
      entity_id,
      action,
      meta,
      performed_by
    )
    VALUES (
      'client',
      (SELECT id FROM clients WHERE lead_id = NEW.id),
      'created_from_lead',
      jsonb_build_object(
        'lead_id', NEW.id,
        'company_name', NEW.business_name,
        'converted_at', NOW()
      ),
      NEW.assigned_to
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_client_on_win ON leads;
CREATE TRIGGER auto_create_client_on_win
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION create_client_on_win();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_client_from_lead(lead_uuid UUID)
RETURNS UUID AS $$
  SELECT id FROM clients WHERE lead_id = lead_uuid LIMIT 1;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION is_lead_converted(lead_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM clients WHERE lead_id = lead_uuid);
$$ LANGUAGE sql;
