'use server';

import { supabase } from '@/lib/supabase';

export async function incrementLike(
  postId: string,
  expectedVersion: number,
): Promise<{ success: boolean; newCount?: number; newVersion?: number; error?: string }> {
  const newVersion = expectedVersion + 1;

  // Single atomic UPDATE: bumps version only if current version matches (OCC check).
  // Returning the current like_count so we can compute the incremented value.
  const { data, error } = await supabase
    .from('posts')
    .update({ version: newVersion })
    .eq('id', postId)
    .eq('version', expectedVersion)
    .select('like_count, version');

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'version-conflict' };
  }

  const row = data[0] as { like_count: number; version: number };

  // Version lock is now held (others' OCC updates will fail with conflict).
  // Increment like_count atomically under that lock.
  const { data: updated, error: likeError } = await supabase
    .from('posts')
    .update({ like_count: row.like_count + 1 })
    .eq('id', postId)
    .eq('version', newVersion)
    .select('like_count, version')
    .single();

  if (likeError) {
    return { success: false, error: likeError.message };
  }

  const result = updated as { like_count: number; version: number };

  return {
    success: true,
    newCount: result.like_count,
    newVersion: result.version,
  };
}
