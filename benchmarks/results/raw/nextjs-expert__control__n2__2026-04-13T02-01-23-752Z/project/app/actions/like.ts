'use server';

import { supabase } from '@/lib/supabase';

export async function incrementLike(
  postId: string,
  expectedVersion: number
): Promise<{ success: boolean; newCount?: number; newVersion?: number; error?: string }> {
  // Single atomic UPDATE with optimistic concurrency control.
  // The WHERE version = expectedVersion clause ensures we only write if no
  // concurrent update has already incremented the version — preventing lost updates.
  const { data, error, count } = await supabase
    .from('posts')
    .update({ version: expectedVersion + 1 }, { count: 'exact' })
    .eq('id', postId)
    .eq('version', expectedVersion)
    .select('like_count, version');

  if (error) {
    return { success: false, error: error.message };
  }

  if (count === 0 || !data || data.length === 0) {
    return { success: false, error: 'version-conflict' };
  }

  const row = data[0] as unknown as { like_count: number; version: number };
  return {
    success: true,
    newCount: row.like_count,
    newVersion: row.version,
  };
}
