-- ============================================
-- EATBIT CRM - SECURITY & RLS POLICIES
-- Row Level Security for role-based access
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

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_sales()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'sales'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_intern()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'intern'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- PROFILES POLICIES
-- ============================================

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
CREATE POLICY "admin_all_profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "users_read_other_profiles" ON profiles;
CREATE POLICY "users_read_other_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales', 'intern')
    )
  );

-- ============================================
-- ATTENDANCE LOGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_all_attendance" ON attendance_logs;
CREATE POLICY "admin_all_attendance"
  ON attendance_logs FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "users_insert_own_attendance" ON attendance_logs;
CREATE POLICY "users_insert_own_attendance"
  ON attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_attendance" ON attendance_logs;
CREATE POLICY "users_update_own_attendance"
  ON attendance_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_select_own_attendance" ON attendance_logs;
CREATE POLICY "users_select_own_attendance"
  ON attendance_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- LEADS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_full_access_leads" ON leads;
CREATE POLICY "admin_full_access_leads"
  ON leads FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "sales_view_assigned_leads" ON leads;
CREATE POLICY "sales_view_assigned_leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    AND is_sales()
  );

DROP POLICY IF EXISTS "sales_update_assigned_leads" ON leads;
CREATE POLICY "sales_update_assigned_leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    AND is_sales()
  )
  WITH CHECK (assigned_to = auth.uid());

DROP POLICY IF EXISTS "intern_create_leads" ON leads;
CREATE POLICY "intern_create_leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_intern()
  );

DROP POLICY IF EXISTS "intern_view_own_leads" ON leads;
CREATE POLICY "intern_view_own_leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND is_intern()
  );

DROP POLICY IF EXISTS "intern_update_own_leads" ON leads;
CREATE POLICY "intern_update_own_leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND is_intern()
  )
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- LEAD FOLLOWUPS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_lead_followups" ON lead_followups;
CREATE POLICY "admin_lead_followups"
  ON lead_followups FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "users_view_lead_followups" ON lead_followups;
CREATE POLICY "users_view_lead_followups"
  ON lead_followups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_followups.lead_id
      AND (leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "users_create_lead_followups" ON lead_followups;
CREATE POLICY "users_create_lead_followups"
  ON lead_followups FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_followups.lead_id
      AND (leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
    )
  );

-- ============================================
-- LEAD DOCUMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_lead_documents" ON lead_documents;
CREATE POLICY "admin_lead_documents"
  ON lead_documents FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "users_view_lead_documents" ON lead_documents;
CREATE POLICY "users_view_lead_documents"
  ON lead_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_documents.lead_id
      AND (leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "users_upload_lead_documents" ON lead_documents;
CREATE POLICY "users_upload_lead_documents"
  ON lead_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_documents.lead_id
      AND (leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
    )
  );

-- ============================================
-- REVIEWS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_reviews" ON reviews;
CREATE POLICY "admin_reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "users_view_own_reviews" ON reviews;
CREATE POLICY "users_view_own_reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales', 'intern')
    )
  );

DROP POLICY IF EXISTS "users_create_reviews" ON reviews;
CREATE POLICY "users_create_reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- ============================================
-- INCENTIVES POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_incentives" ON incentives;
CREATE POLICY "admin_incentives"
  ON incentives FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "intern_view_own_incentives" ON incentives;
CREATE POLICY "intern_view_own_incentives"
  ON incentives FOR SELECT
  TO authenticated
  USING (
    intern_id = auth.uid()
    AND is_intern()
  );

-- ============================================
-- CLIENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_full_access_clients" ON clients;
CREATE POLICY "admin_full_access_clients"
  ON clients FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "sales_assigned_clients" ON clients;
CREATE POLICY "sales_assigned_clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    is_sales()
    AND managed_by = auth.uid()
  );

DROP POLICY IF EXISTS "sales_view_all_clients" ON clients;
CREATE POLICY "sales_view_all_clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_sales());

-- ============================================
-- CLIENT APPOINTMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_full_access_appointments" ON client_appointments;
CREATE POLICY "admin_full_access_appointments"
  ON client_appointments FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "sales_client_appointments" ON client_appointments;
CREATE POLICY "sales_client_appointments"
  ON client_appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      JOIN profiles ON profiles.id = auth.uid()
      WHERE clients.id = client_appointments.client_id
      AND profiles.role = 'sales'
      AND clients.managed_by = profiles.id
    )
  );

DROP POLICY IF EXISTS "sales_view_all_appointments" ON client_appointments;
CREATE POLICY "sales_view_all_appointments"
  ON client_appointments FOR SELECT
  TO authenticated
  USING (is_sales());

-- ============================================
-- CLIENT DOCUMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_full_access_client_docs" ON client_documents;
CREATE POLICY "admin_full_access_client_docs"
  ON client_documents FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "sales_client_documents" ON client_documents;
CREATE POLICY "sales_client_documents"
  ON client_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      JOIN profiles ON profiles.id = auth.uid()
      WHERE clients.id = client_documents.client_id
      AND profiles.role = 'sales'
      AND clients.managed_by = profiles.id
    )
  );

DROP POLICY IF EXISTS "sales_view_all_client_docs" ON client_documents;
CREATE POLICY "sales_view_all_client_docs"
  ON client_documents FOR SELECT
  TO authenticated
  USING (is_sales());

-- ============================================
-- ACTIVITY LOGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "admin_activity_logs" ON activity_logs;
CREATE POLICY "admin_activity_logs"
  ON activity_logs FOR ALL
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "users_view_own_activity" ON activity_logs;
CREATE POLICY "users_view_own_activity"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (performed_by = auth.uid());

DROP POLICY IF EXISTS "users_create_activity" ON activity_logs;
CREATE POLICY "users_create_activity"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Storage bucket: lead-documents
DROP POLICY IF EXISTS "admin_lead_storage" ON storage.objects;
CREATE POLICY "admin_lead_storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'lead-documents'
    AND is_admin()
  );

DROP POLICY IF EXISTS "users_lead_storage_upload" ON storage.objects;
CREATE POLICY "users_lead_storage_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lead-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales', 'intern')
    )
  );

DROP POLICY IF EXISTS "users_lead_storage_read" ON storage.objects;
CREATE POLICY "users_lead_storage_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lead-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales', 'intern')
    )
  );

-- Storage bucket: client-documents
DROP POLICY IF EXISTS "admin_client_storage" ON storage.objects;
CREATE POLICY "admin_client_storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND is_admin()
  );

DROP POLICY IF EXISTS "sales_client_storage_upload" ON storage.objects;
CREATE POLICY "sales_client_storage_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND is_sales()
  );

DROP POLICY IF EXISTS "sales_client_storage_read" ON storage.objects;
CREATE POLICY "sales_client_storage_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND is_sales()
  );

DROP POLICY IF EXISTS "sales_client_storage_delete" ON storage.objects;
CREATE POLICY "sales_client_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND is_sales()
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
