'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function adminCreateUser(userData: any) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role
      }
    });

    if (authError) {
      console.error('[AdminActions] Auth Error:', authError);
      return { error: authError.message };
    }

    // 2. Auth trigger handle_new_user should have created the profile automatically,
    // but we can update it with extra fields like salary here if needed.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        salary: userData.salary ? parseFloat(userData.salary) : null,
        auto_logout_minutes: 30
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('[AdminActions] Profile Update Error:', profileError);
      // We don't return error here because the user was created successfully
    }

    revalidatePath('/admin/users');
    return { success: true, user: authData.user };
  } catch (err: any) {
    console.error('[AdminActions] Unexpected Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function adminUpdateUser(userId: string, updates: any) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Update Auth (Password if provided)
    if (updates.password && updates.password.length >= 6) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: updates.password
      });
      if (authError) return { error: authError.message };
    }

    // 2. Update Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: updates.full_name,
        role: updates.role,
        status: updates.status,
        salary: updates.salary,
        auto_logout_minutes: updates.auto_logout_minutes
      })
      .eq('id', userId);

    if (profileError) return { error: profileError.message };

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
