'use server';

import { supabase } from '@/lib/supabase';

export async function incrementLike(
  postId: string,
  expectedVersion: number
): Promise<{ success: boolean; newCount?: number; newVersion?: number; error?: string }> {
  // Single atomic UPDATE — version check is the OCC guard.
  // PostgREST interprets the raw column expression for like_count.
  const { data, error } = await supabase
    .from('posts')
    .update({
      like_count: 'like_count + 1' as unknown as number,
      version: expectedVersion + 1,
    })
    .eq('id', postId)
    .eq('version', expectedVersion)
    .select('like_count, version')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: 'version-conflict' };
  }

  return { success: true, newCount: data.like_count, newVersion: data.version };
}
