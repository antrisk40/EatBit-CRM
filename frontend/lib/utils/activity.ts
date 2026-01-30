import { createClient } from '@/lib/supabase/client';
import { ActivityLog } from '@/lib/types/database';

export async function logActivity(
  action: string,
  entityType: string,
  entityId: string,
  meta?: any
): Promise<void> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase.from('activity_logs').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    meta,
    performed_by: user.id,
  });
}
