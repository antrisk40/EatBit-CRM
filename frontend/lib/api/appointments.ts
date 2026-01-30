// ============================================
// APPOINTMENT API - Supabase Functions
// Client appointment management
// ============================================

import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import type {
  ClientAppointment,
  AppointmentWithClient,
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentFilters,
  AppointmentStats,
} from '@/lib/types/client';

// ============================================
// APPOINTMENT CRUD OPERATIONS
// ============================================

/**
 * Get all appointments with optional filters
 */
export async function getAppointments(filters?: AppointmentFilters) {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('client_appointments')
    .select(`
      *,
      client:clients!client_appointments_client_id_fkey(id, company_name, primary_contact_name),
      creator:profiles!client_appointments_created_by_fkey(id, full_name)
    `)
    .order('scheduled_at', { ascending: true });

  // Apply filters
  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.appointment_type) {
    query = query.eq('appointment_type', filters.appointment_type);
  }
  if (filters?.scheduled_after) {
    query = query.gte('scheduled_at', filters.scheduled_after);
  }
  if (filters?.scheduled_before) {
    query = query.lte('scheduled_at', filters.scheduled_before);
  }
  if (filters?.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as AppointmentWithClient[];
}

/**
 * Get upcoming appointments (next 7 days)
 */
export async function getUpcomingAppointments() {
  const today = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return getAppointments({
    status: 'scheduled',
    scheduled_after: today,
    scheduled_before: nextWeek,
  });
}

/**
 * Get appointments for a specific client
 */
export async function getClientAppointments(clientId: string) {
  return getAppointments({ client_id: clientId });
}

/**
 * Get a single appointment by ID
 */
export async function getAppointment(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('client_appointments')
    .select(`
      *,
      client:clients!client_appointments_client_id_fkey(id, company_name, primary_contact_name, primary_contact_email, primary_contact_phone),
      creator:profiles!client_appointments_created_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as AppointmentWithClient;
}

/**
 * Create a new appointment
 */
export async function createAppointment(appointmentData: CreateAppointmentData) {
  const supabase = createSupabaseClient();
  const {data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('client_appointments')
    .insert({
      ...appointmentData,
      created_by: user?.id,
    })
    .select(`
      *,
      client:clients!client_appointments_client_id_fkey(id, company_name, primary_contact_name),
      creator:profiles!client_appointments_created_by_fkey(id, full_name)
    `)
    .single();

  if (error) throw error;

  // Log activity
  await logActivity('appointment', data.id, 'created', {
    client_id: data.client_id,
    title: data.title,
    scheduled_at: data.scheduled_at,
  });

  return data as AppointmentWithClient;
}

/**
 * Update an appointment
 */
export async function updateAppointment(id: string, updates: UpdateAppointmentData) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('client_appointments')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      client:clients!client_appointments_client_id_fkey(id, company_name, primary_contact_name),
      creator:profiles!client_appointments_created_by_fkey(id, full_name)
    `)
    .single();

  if (error) throw error;

  // Log activity
  await logActivity('appointment', id, 'updated', updates);

  return data as AppointmentWithClient;
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(id: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('client_appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log activity
  await logActivity('appointment', id, 'deleted', {});
}

/**
 * Complete an appointment
 */
export async function completeAppointment(id: string, note?: string) {
  return updateAppointment(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    note,
  });
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(id: string, reason?: string) {
  return updateAppointment(id, {
    status: 'cancelled',
    note: reason,
  });
}

/**
 * Reschedule an appointment
 */
export async function rescheduleAppointment(id: string, newTime: string) {
  return updateAppointment(id, {
    status: 'rescheduled',
    scheduled_at: newTime,
  });
}

// ============================================
// APPOINTMENT STATISTICS
// ============================================

/**
 * Get appointment statistics
 */
export async function getAppointmentStats(): Promise<AppointmentStats> {
  const supabase = createSupabaseClient();
  const { data: appointments, error } = await supabase
    .from('client_appointments')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (error) throw error;

  const now = new Date().toISOString();
  const upcoming = appointments.filter(
    (a: any) => a.status === 'scheduled' && a.scheduled_at >= now
  );

  return {
    total_appointments: appointments.length,
    scheduled_appointments: appointments.filter((a: any) => a.status === 'scheduled').length,
    completed_appointments: appointments.filter((a: any) => a.status === 'completed').length,
    cancelled_appointments: appointments.filter((a: any) => a.status === 'cancelled').length,
    upcoming_appointments: upcoming.slice(0, 5) as ClientAppointment[],
  };
}

/**
 * Get today's appointments
 */
export async function getTodayAppointments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getAppointments({
    status: 'scheduled',
    scheduled_after: today.toISOString(),
    scheduled_before: tomorrow.toISOString(),
  });
}

/**
 * Get this week's appointments
 */
export async function getWeekAppointments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return getAppointments({
    status: 'scheduled',
    scheduled_after: today.toISOString(),
    scheduled_before: nextWeek.toISOString(),
  });
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
 * Check if appointment time conflicts with existing appointments
 */
export async function checkAppointmentConflict(
  scheduledAt: string,
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<boolean> {
  const supabase = createSupabaseClient();
  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  let query = supabase
    .from('client_appointments')
    .select('id, scheduled_at, duration_minutes')
    .eq('status', 'scheduled')
    .gte('scheduled_at', startTime.toISOString())
    .lte('scheduled_at', endTime.toISOString());

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  const { data, error } = await query;

  if (error) return false;

  // Check if any appointments overlap
  return data.some((apt: any) => {
    const aptStart = new Date(apt.scheduled_at);
    const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60 * 1000);

    return (
      (startTime >= aptStart && startTime < aptEnd) ||
      (endTime > aptStart && endTime <= aptEnd) ||
      (startTime <= aptStart && endTime >= aptEnd)
    );
  });
}
