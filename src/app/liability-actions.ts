// src/app/liability-actions.ts
"use server";

import { createClient } from '../utils/supabase-server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const VALID_LIABILITY_TYPES = [
  'Mortgage', 'Car Loan', 'Credit Card', 'Student Loan', 'Personal Loan', 'Other'
] as const;

const AddLiabilitySchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  liabilityType: z.enum(VALID_LIABILITY_TYPES, { message: 'Invalid liability type' }),
  balance: z.number().min(0).max(100_000_000_000),
  interestRate: z.number().min(0).max(100),
  monthlyPayment: z.number().min(0).max(10_000_000),
});

const DeleteSchema = z.object({
  id: z.string().uuid('Invalid liability ID'),
});

const UpdateSchema = z.object({
  id: z.string().uuid('Invalid liability ID'),
  balance: z.number().min(0).max(100_000_000_000).optional(),
  monthlyPayment: z.number().min(0).max(10_000_000).optional(),
});

// --- ADD LIABILITY ---
export async function addLiability(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const parsed = AddLiabilitySchema.safeParse({
    name: (formData.get('name') as string || '').trim(),
    liabilityType: formData.get('liabilityType') as string,
    balance: Number(formData.get('balance')) || 0,
    interestRate: Number(formData.get('interestRate')) || 0,
    monthlyPayment: Number(formData.get('monthlyPayment')) || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'validation_failed' };
  }

  const { name, liabilityType, balance, interestRate, monthlyPayment } = parsed.data;

  const { error } = await supabase.from('liabilities').insert([{
    user_id: user.id,
    name,
    liability_type: liabilityType,
    balance,
    interest_rate: interestRate,
    monthly_payment: monthlyPayment,
  }]);

  if (error) return { error: 'insert_failed' };
  revalidatePath('/');
  return { success: true };
}

// --- DELETE LIABILITY ---
export async function deleteLiability(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const parsed = DeleteSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: 'invalid_id' };

  const { error } = await supabase.from('liabilities').delete().eq('id', parsed.data.id).eq('user_id', user.id);
  if (error) return { error: 'delete_failed' };
  revalidatePath('/');
  return { success: true };
}

// --- UPDATE LIABILITY ---
export async function updateLiability(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const parsed = UpdateSchema.safeParse({
    id: formData.get('id') as string,
    balance: formData.get('balance') ? Number(formData.get('balance')) : undefined,
    monthlyPayment: formData.get('monthlyPayment') ? Number(formData.get('monthlyPayment')) : undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'validation_failed' };

  const { id, balance, monthlyPayment } = parsed.data;
  const updateData: Record<string, number> = {};
  if (balance !== undefined) updateData.balance = balance;
  if (monthlyPayment !== undefined) updateData.monthly_payment = monthlyPayment;

  const { error } = await supabase.from('liabilities').update(updateData).eq('id', id).eq('user_id', user.id);
  if (error) return { error: 'update_failed' };
  revalidatePath('/');
  return { success: true };
}
