// Submission service — handles proof uploads and submission CRUD

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Submission       = Database['public']['Tables']['submissions']['Row'];
type SubmissionInsert = Database['public']['Tables']['submissions']['Insert'];

// ── Upload image to Supabase Storage ──────────────────────────────────

export async function uploadProofImage(file: File, userId: string): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('task-proofs')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('task-proofs').getPublicUrl(path);
  return data.publicUrl;
}

// ── Create submission ─────────────────────────────────────────────────

export async function createSubmission(payload: SubmissionInsert): Promise<Submission> {
  const { data, error } = await supabase
    .from('submissions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Fetch submissions ─────────────────────────────────────────────────

export async function fetchSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSubmissionsByTask(taskId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkerSubmissions(userId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Review submission ─────────────────────────────────────────────────

export async function reviewSubmission(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
): Promise<Submission> {
  const { data, error } = await supabase
    .from('submissions')
    .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
