// Task service — CRUD operations for tasks

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Task       = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

// ── Fetch ──────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function fetchWorkerTasks(workerId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', workerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Mutate ─────────────────────────────────────────────────────────────

export async function createTask(payload: TaskInsert): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, payload: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ── Stats ──────────────────────────────────────────────────────────────

export interface TaskStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  completedToday: number;
}

export async function fetchTaskStats(): Promise<TaskStats> {
  const { data, error } = await supabase.from('tasks').select('status, created_at');
  if (error) throw error;

  const today = new Date().toDateString();
  const rows  = data ?? [];

  return {
    total:        rows.length,
    pending:      rows.filter(r => r.status === 'pending').length,
    assigned:     rows.filter(r => r.status === 'assigned').length,
    inProgress:   rows.filter(r => r.status === 'in_progress').length,
    completed:    rows.filter(r => r.status === 'completed').length,
    completedToday: rows.filter(r =>
      r.status === 'completed' && new Date(r.created_at).toDateString() === today
    ).length,
  };
}
