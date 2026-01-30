-- ============================================
-- EATBIT CRM - SAMPLE DATA (OPTIONAL)
-- Test data for development and testing
-- ============================================

-- NOTE: This file is OPTIONAL and for testing purposes only
-- Run this AFTER setting up auth users in Supabase

-- ============================================
-- INSTRUCTIONS
-- ============================================
/*
1. Go to Supabase Dashboard → Authentication → Users
2. Create test users:
   - admin@eatbit.com (password: admin123)
   - sales@eatbit.com (password: sales123)
   - intern@eatbit.com (password: intern123)

3. Copy their UUIDs from auth.users table

4. Replace the placeholder UUIDs below with actual UUIDs

5. Run this script
*/

-- ============================================
-- SAMPLE PROFILES
-- ============================================
-- Replace these UUIDs with actual ones from auth.users
/*
INSERT INTO profiles (id, full_name, role, status, salary, last_activity_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin', 'active', 80000, now()),
  ('00000000-0000-0000-0000-000000000002', 'Sales Representative', 'sales', 'active', 50000, now()),
  ('00000000-0000-0000-0000-000000000003', 'Intern John', 'intern', 'active', 20000, now());
*/

-- ============================================
-- SAMPLE LEADS
-- ============================================
/*
INSERT INTO leads (
  business_name,
  contact_name,
  contact_phone,
  contact_email,
  location,
  source,
  status,
  assigned_to,
  created_by,
  next_followup_at,
  estimated_value
) VALUES
  (
    'Cafe Mumbai',
    'Rajesh Kumar',
    '+91 98765 43210',
    'rajesh@cafemumbai.com',
    'Mumbai, Maharashtra',
    'Cold Call',
    'contacted',
    '00000000-0000-0000-0000-000000000002', -- sales user
    '00000000-0000-0000-0000-000000000003', -- intern user
    current_date + interval '5 days',
    50000
  ),
  (
    'Delhi Diner',
    'Priya Sharma',
    '+91 98765 43211',
    'priya@delhidiner.com',
    'Delhi, NCR',
    'Referral',
    'qualified',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    current_date + interval '3 days',
    75000
  ),
  (
    'Bangalore Bistro',
    'Amit Patel',
    '+91 98765 43212',
    'amit@bangalorebistro.com',
    'Bangalore, Karnataka',
    'Website',
    'new',
    null,
    '00000000-0000-0000-0000-000000000003',
    current_date + interval '2 days',
    30000
  );
*/

-- ============================================
-- SAMPLE ATTENDANCE
-- ============================================
/*
INSERT INTO attendance_logs (user_id, login_time)
VALUES
  ('00000000-0000-0000-0000-000000000001', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000002', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000003', now() - interval '1 hour');
*/

-- ============================================
-- SAMPLE FOLLOWUPS
-- ============================================
/*
INSERT INTO lead_followups (lead_id, followup_date, note, created_by)
SELECT 
  l.id,
  current_date - interval '5 days',
  'Initial contact made. Expressed interest in our services.',
  '00000000-0000-0000-0000-000000000003'
FROM leads l
WHERE l.business_name = 'Cafe Mumbai';

INSERT INTO lead_followups (lead_id, followup_date, note, created_by)
SELECT 
  l.id,
  current_date,
  'Follow-up call completed. Sending proposal tomorrow.',
  '00000000-0000-0000-0000-000000000002'
FROM leads l
WHERE l.business_name = 'Delhi Diner';
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check profiles
-- SELECT id, full_name, role, status, salary FROM profiles;

-- Check leads
-- SELECT id, business_name, status, next_followup_at FROM leads;

-- Check followups
-- SELECT l.business_name, f.followup_date, f.note 
-- FROM lead_followups f
-- JOIN leads l ON l.id = f.lead_id;

-- Check attendance
-- SELECT p.full_name, a.login_time, a.logout_time
-- FROM attendance_logs a
-- JOIN profiles p ON p.id = a.user_id;
