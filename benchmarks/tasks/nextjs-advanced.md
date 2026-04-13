---
id: nextjs-advanced
difficulty: advanced
stack: nextjs-supabase
seed_dir: nextjs-supabase-seed
harness_dir: nextjs-supabase-harness
---

# Task: Authenticated Posts API Route

Add a protected API route that lists posts belonging to the current user.

## Requirements

1. Create `app/api/posts/route.ts` implementing:
   - `GET` handler that returns posts for the authenticated user
   - Reads an `Authorization: Bearer <token>` header
   - Validates the token by calling `supabase.auth.getUser(token)` from the shared client in `lib/supabase.ts`
   - If no token or invalid token: return 401 with `{ error: 'unauthorized' }`
   - If authenticated: query the `posts` table via Supabase client and return `{ posts: [...] }`
   - Assume the `posts` table has columns: `id`, `user_id`, `title`, `created_at`
   - Filter posts WHERE `user_id = <authenticated user id>`
2. Handle errors gracefully — any Supabase error should return 500 with `{ error: string }`
3. Use the shared Supabase client from `@/lib/supabase` — do not instantiate a new client

## Acceptance Criteria

- File `app/api/posts/route.ts` exists
- Exports a `GET` function
- References `supabase.auth.getUser`
- Uses `from('posts')` and `.select(` for the query
- Has `.eq('user_id', ...)` filter
- Returns `Response.json(...)` or `NextResponse.json(...)`
- Returns 401 when token is missing
- `npm run typecheck` passes
- No hardcoded tokens or credentials

## Scope Boundaries

- Do NOT create new tables or schemas
- Do NOT modify `lib/supabase.ts`
- Do NOT add new dependencies
- Do NOT add a PATCH/POST/DELETE handler — GET only
