# EatBit CRM - Database Setup

Complete database schema for the EatBit CRM system.

## 📁 Files

| File | Description | Required |
|------|-------------|----------|
| `01-schema.sql` | Complete database schema (tables, indexes, triggers, functions) | ✅ **Required** |
| `02-security.sql` | Row Level Security (RLS) policies for role-based access | ✅ **Required** |
| `03-sample-data.sql` | Sample test data (commented out - for reference) | ⚪ Optional |

## 🚀 Quick Setup

### Run in Supabase SQL Editor (in order):

```sql
-- Step 1: Create all tables and functions
-- Copy and paste: 01-schema.sql

-- Step 2: Apply security policies
-- Copy and paste: 02-security.sql

-- Done! Your database is ready.
```

### Create Storage Buckets

In Supabase Dashboard → Storage:
1. Create bucket: `lead-documents` (Private)
2. Create bucket: `client-documents` (Private)

Storage policies are already included in `02-security.sql`.

## 📊 Database Structure

### Core Tables
- **profiles** - User accounts (admin, sales, intern)
- **leads** - Pre-sale pipeline with approval workflow
- **clients** - Post-sale (auto-created from won leads)
- **client_appointments** - Client meetings and tasks
- **lead_followups** - Follow-up history
- **lead_documents** / **client_documents** - File uploads
- **reviews** - Approval queue
- **incentives** - Payout tracking
- **attendance_logs** - Login/logout tracking
- **activity_logs** - Audit trail

## 🔐 Security Model

### Role Permissions

**👤 Intern**
- ✅ Create leads, upload documents, view own leads
- ❌ Cannot directly change status (needs admin approval)

**💼 Sales**
- ✅ View assigned leads, manage assigned clients
- ✅ View all clients (read-only)
- ❌ Cannot approve status changes

**👑 Admin**
- ✅ Full access to everything
- ✅ Approve/reject status changes
- ✅ Manage users and incentives

## 🔧 Key Features

- ✅ Auto-update timestamps
- ✅ Auto-convert leads to clients when status = `closed_won`
- ✅ Activity tracking
- ✅ Role-based access control (RLS)

## 📈 Common Queries

### Get upcoming follow-ups
```sql
SELECT l.*, p.full_name as assigned_to_name
FROM leads l
LEFT JOIN profiles p ON p.id = l.assigned_to
WHERE l.next_followup_at <= current_date + interval '7 days'
ORDER BY l.next_followup_at ASC;
```

### Get pending reviews (admin)
```sql
SELECT r.*, l.business_name, p.full_name as submitted_by_name
FROM reviews r
JOIN leads l ON l.id = r.lead_id
JOIN profiles p ON p.id = r.submitted_by
WHERE r.review_status = 'pending'
ORDER BY r.created_at ASC;
```

## 🧪 Testing

After setup:
- [ ] Create test users (admin, sales, intern)
- [ ] Test intern can create leads
- [ ] Test sales can view assigned leads
- [ ] Test admin can see all data
- [ ] Test lead → client auto-conversion

---

**Database Version:** 2.0 (Consolidated)  
**Supabase Compatible:** ✅
