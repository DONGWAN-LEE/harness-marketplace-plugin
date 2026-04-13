# Task: Optimistic Concurrency Control for Counter

Implement a server action that increments a counter with optimistic concurrency control to prevent lost updates.

## Background

You're adding a "like count" feature. Multiple users may click the like button simultaneously. A naive `SELECT count; UPDATE count = count+1` has a race condition where two concurrent updates may both read the same initial count and both write count+1, losing one increment.

## Requirements

1. Create a Server Action at `app/actions/like.ts` that exports an async function `incrementLike(postId: string, expectedVersion: number): Promise<{ success: boolean; newCount?: number; newVersion?: number; error?: string }>`.
2. The action should:
   - Update the `posts` table setting `like_count = like_count + 1, version = version + 1` **only if** the current `version` equals `expectedVersion`
   - Use a single atomic UPDATE statement (not separate SELECT+UPDATE) — use Supabase's `.update()` with `.eq('version', expectedVersion)`
   - If the update affected 0 rows (version mismatch): return `{ success: false, error: 'version-conflict' }`
   - If the update succeeded: return `{ success: true, newCount, newVersion }`
3. Handle Supabase errors — return `{ success: false, error: <message> }` on failure
4. Use the shared Supabase client from `@/lib/supabase`
5. Add `'use server'` directive at the top of the file

## Acceptance Criteria

- File `app/actions/like.ts` exists
- Starts with `'use server'` directive
- Exports `incrementLike` function with correct signature
- Uses `.update(...)` with `.eq('version', expectedVersion)` pattern
- Does NOT use separate SELECT + UPDATE (race condition)
- Returns `{ success: false, error: 'version-conflict' }` on 0-row update
- `npm run typecheck` passes
- No hardcoded credentials

## Scope Boundaries

- Do NOT create migration files
- Assume `posts` table already has `like_count: number` and `version: number` columns
- Do NOT implement the UI button
- Do NOT modify `lib/supabase.ts`