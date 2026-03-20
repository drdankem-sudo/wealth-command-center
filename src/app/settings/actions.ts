// src/app/settings/actions.ts
"use server";

import { createClient } from '../../utils/supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too long'),
});

const PasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too long'),
});

// ─── INVITE NEW USER (admin only) ───
export async function inviteUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = InviteSchema.safeParse({
    email: (formData.get('email') as string || '').trim(),
    password: formData.get('password') as string,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Use service client to create user (bypasses signup restrictions)
  const serviceSupabase = createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { error } = await serviceSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true, // Auto-confirm so they can log in immediately
  });

  if (error) {
    if (error.message.includes('already been registered')) return { error: 'This email is already registered.' };
    return { error: 'Failed to create user. Try again.' };
  }

  return { success: true };
}

// ─── CHANGE OWN PASSWORD ───
export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = PasswordSchema.safeParse({
    newPassword: formData.get('newPassword') as string,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) return { error: 'Failed to update password. Try again.' };
  return { success: true };
}

// ─── LIST ALL USERS (admin view) ───
export async function listUsers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', users: [] };

  const serviceSupabase = createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await serviceSupabase.auth.admin.listUsers();
  if (error) return { error: 'Failed to list users', users: [] };

  return {
    users: data.users.map(u => ({
      id: u.id,
      email: u.email || 'No email',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
    }))
  };
}

// ─── DELETE USER (admin) ───
export async function deleteUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const targetId = formData.get('userId') as string;
  if (!targetId || !z.string().uuid().safeParse(targetId).success) return { error: 'Invalid user ID' };
  if (targetId === user.id) return { error: 'Cannot delete yourself' };

  const serviceSupabase = createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { error } = await serviceSupabase.auth.admin.deleteUser(targetId);
  if (error) return { error: 'Failed to delete user' };

  return { success: true };
}
