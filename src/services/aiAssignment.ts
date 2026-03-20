// AI Task Assignment Service
// Implements scoring-based assignment: Score = (0.5 × performance_score) − (0.3 × distance_km)

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Task    = Database['public']['Tables']['tasks']['Row'];

export interface WorkerScore {
  worker: Profile;
  score: number;
  distanceKm: number;
  rank: number;
}

/**
 * Compute the Haversine distance between two coordinates (in km)
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Score a worker for a given task location
 * Score = (0.5 × performance_score) − (0.3 × distance_km)
 */
export function scoreWorker(worker: Profile, taskLat: number, taskLon: number): WorkerScore {
  // Default to task location if worker has no coords (score won't be penalised by distance)
  const wLat = worker.latitude ?? taskLat;
  const wLon = worker.longitude ?? taskLon;
  const distanceKm = haversineDistance(wLat, wLon, taskLat, taskLon);
  const score = 0.5 * (worker.performance_score ?? 7.5) - 0.3 * Math.min(distanceKm, 50);
  return { worker, score, distanceKm, rank: 0 };
}

/**
 * Rank all active workers for a task and return sorted results
 */
export function rankWorkersForTask(workers: Profile[], task: Pick<Task, 'latitude' | 'longitude'>): WorkerScore[] {
  const scored = workers
    .filter(w => w.is_active && w.role === 'worker')
    .map(w => scoreWorker(w, task.latitude, task.longitude))
    .sort((a, b) => b.score - a.score);

  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * Fetch all active workers from the database
 */
export async function fetchWorkers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'worker')
    .eq('is_active', true)
    .order('performance_score', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Auto-assign the best-scoring worker to a task
 */
export async function autoAssignTask(taskId: string, taskLat: number, taskLon: number): Promise<WorkerScore | null> {
  const workers = await fetchWorkers();
  if (!workers.length) return null;

  const ranked = rankWorkersForTask(workers, { latitude: taskLat, longitude: taskLon });
  const best   = ranked[0];

  const { error } = await supabase
    .from('tasks')
    .update({
      assigned_to: best.worker.id,
      ai_assigned: true,
      ai_score: parseFloat(best.score.toFixed(2)),
      status: 'assigned',
    })
    .eq('id', taskId);

  if (error) throw error;
  return best;
}
