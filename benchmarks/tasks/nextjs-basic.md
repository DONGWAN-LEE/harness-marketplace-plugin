---
id: nextjs-basic
difficulty: basic
stack: nextjs-supabase
seed_dir: nextjs-supabase-seed
harness_dir: nextjs-supabase-harness
---

# Task: User Profile Edit Page

Add a user profile edit page to the existing Next.js application.

## Requirements

1. Create a new route at `/profile/edit` using the App Router (file: `app/profile/edit/page.tsx`).
2. The page should have a form with two fields:
   - `name` (required, text input, min length 2)
   - `email` (required, must be a valid email format)
3. On submit, validate both fields client-side and display inline error messages below each field if invalid.
4. On successful validation, show a success message "Profile updated" below the form (no backend call needed for this task).
5. Use only React + TypeScript. No additional UI library.

## Acceptance Criteria

- File `app/profile/edit/page.tsx` exists
- File exports a default React component
- Contains `name` input field
- Contains `email` input field
- Contains email validation logic (regex or validation function)
- `npm run typecheck` passes
- `npm run lint` passes (if runnable)

## Scope Boundaries

- Do NOT add authentication or backend API calls
- Do NOT install new npm packages
- Do NOT modify `lib/supabase.ts`, `next.config.js`, or package.json
- Keep the implementation minimal — a single file is sufficient
