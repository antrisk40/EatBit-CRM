// ============================================
// CLIENT API - Supabase Functions
// Client management API calls
// ============================================

import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import type {
  Client,
  ClientWithManager,
  ClientWithLead,
  CreateClientData,
  UpdateClientData,
  ClientFilters,
  ClientStats,
} from '@/lib/types/client';

// ============================================
// CLIENT CRUD OPERATIONS
// ============================================

/**
 * Get all clients with optional filters
 */
export async function getClients(filters?: ClientFilters) {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('clients')
    .select(`
      *,
      manager:profiles!clients_managed_by_fkey(id, full_name, role),
      lead:leads!clients_lead_id_fkey(id, business_name, source, created_at)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.managed_by) {
    query = query.eq('managed_by', filters.managed_by);
  }
  if (filters?.search) {
    query = query.or(`company_name.ilike.%${filters.search}%,primary_contact_name.ilike.%${filters.search}%`);
  }
  if (filters?.min_contract_value) {
    query = query.gte('contract_value', filters.min_contract_value);
  }
  if (filters?.max_contract_value) {
    query = query.lte('contract_value', filters.max_contract_value);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ClientWithManager[];
}

/**
 * Get a single client by ID
 */
export async function getClient(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      manager:profiles!clients_managed_by_fkey(id, full_name, role),
      lead:leads!clients_lead_id_fkey(id, business_name, source, created_at, estimated_value)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ClientWithLead;
}

/**
 * Get client by lead ID
 */
export async function getClientByLeadId(leadId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      manager:profiles!clients_managed_by_fkey(id, full_name, role)
    `)
    .eq('lead_id', leadId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as ClientWithManager;
}

/**
 * Create a new client
 */
export async function createClient(clientData: CreateClientData) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .insert(clientData)
    .select(`
      *,
      manager:profiles!clients_managed_by_fkey(id, full_name, role)
    `)
    .single();

  if (error) throw error;

  // Log activity
  await logActivity('client', data.id, 'created', {
    company_name: data.company_name,
  });

  return data as ClientWithManager;
}

/**
 * Update a client
 */
export async function updateClient(id: string, updates: UpdateClientData) {
  const supabase = createSupabaseClient();
  const { data, error} = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      manager:profiles!clients_managed_by_fkey(id, full_name, role)
    `)
    .single();

  if (error) throw error;

  // Log activity
  await logActivity('client', id, 'updated', updates);

  return data as ClientWithManager;
}

/**
 * Delete a client
 */
export async function deleteClient(id: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log activity
  await logActivity('client', id, 'deleted', {});
}

/**
 * Change client status
 */
export async function updateClientStatus(id: string, status: Client['status']) {
  return updateClient(id, { status });
}

/**
 * Reassign client to different manager
 */
export async function reassignClient(id: string, managerId: string) {
  return updateClient(id, { managed_by: managerId });
}

// ============================================
// CLIENT STATISTICS
// ============================================

/**
 * Get client statistics
 */
export async function getClientStats(): Promise<ClientStats> {
  const supabase = createSupabaseClient();
  // Get all clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('status, contract_value, managed_by, manager:profiles!clients_managed_by_fkey(id, full_name)');

  if (error) throw error;
  if (!clients) return getEmptyStats();

  const stats: ClientStats = {
    total_clients: clients.length,
    active_clients: clients.filter((c: any) => c.status === 'active').length,
    paused_clients: clients.filter((c: any) => c.status === 'paused').length,
    completed_clients: clients.filter((c: any) => c.status === 'completed').length,
    churned_clients: clients.filter((c: any) => c.status === 'churned').length,
    total_contract_value: clients.reduce((sum: number, c: any) => sum + (c.contract_value || 0), 0),
    avg_contract_value: 0,
    clients_by_manager: [],
  };

  stats.avg_contract_value = stats.total_clients > 0
    ? stats.total_contract_value / stats.total_clients
    : 0;

  // Group by manager
  const managerMap = new Map<string, { name: string; count: number }>();
  clients.forEach((client: any) => {
    if (client.managed_by && client.manager) {
      const existing = managerMap.get(client.managed_by) || {
        name: client.manager.full_name,
        count: 0,
      };
      existing.count++;
      managerMap.set(client.managed_by, existing);
    }
  });

  stats.clients_by_manager = Array.from(managerMap.entries()).map(([id, data]) => ({
    manager_id: id,
    manager_name: data.name,
    client_count: data.count,
  }));

  return stats;
}

function getEmptyStats(): ClientStats {
  return {
    total_clients: 0,
    active_clients: 0,
    paused_clients: 0,
    completed_clients: 0,
    churned_clients: 0,
    total_contract_value: 0,
    avg_contract_value: 0,
    clients_by_manager: [],
  };
}

/**
 * Get clients managed by a specific user
 */
export async function getClientsByManager(managerId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      manager:profiles!clients_managed_by_fkey(id, full_name, role)
    `)
    .eq('managed_by', managerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ClientWithManager[];
}

/**
 * Check if a lead has been converted to a client
 */
export async function isLeadConverted(leadId: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  const { data } = await supabase
    .rpc('is_lead_converted', { lead_uuid: leadId });

  return data || false;
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
 * Get total clients count
 */
export async function getClientsCount(filters?: ClientFilters): Promise<number> {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('clients')
    .select('id', { count: 'exact', head: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.managed_by) {
    query = query.eq('managed_by', filters.managed_by);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}
