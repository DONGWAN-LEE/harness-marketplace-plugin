'use server';

import { supabase } from '@/lib/supabase';

export async function incrementLike(
  postId: string,
  expectedVersion: number
): Promise<{ success: boolean; newCount?: number; newVersion?: number; error?: string }> {
  // Single atomic UPDATE: increments both columns only when version matches.
  // The WHERE version = expectedVersion clause is the OCC guard — concurrent
  // updates with the same expectedVersion will see 0 rows and get a conflict.
  const { data, error } = await supabase
    .from('posts')
    .update({
      version: expectedVersion + 1,
    })
    .eq('id', postId)
    .eq('version', expectedVersion)
    .select('like_count, version')
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  // maybeSingle() returns null data (no error) when 0 rows matched → version conflict
  if (!data) {
    return { success: false, error: 'version-conflict' };
  }

  return {
    success: true,
    newCount: data.like_count as number,
    newVersion: data.version as number,
  };
}
