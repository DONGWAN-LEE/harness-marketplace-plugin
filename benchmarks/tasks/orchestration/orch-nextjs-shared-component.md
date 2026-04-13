---
id: orch-nextjs-shared-component
category: orchestration
stack: nextjs-supabase
---

# Task: Extract Shared UserBadge Component

Three of our pages render nearly-identical user badge blocks. Refactor by extracting a shared component.

## Requirements

1. Create `components/UserBadge.tsx` — a client component that takes `{name: string, email: string, role?: string}` props and renders them in a consistent layout
2. Update the following three pages to use the new component:
   - `app/dashboard/page.tsx`
   - `app/profile/page.tsx`
   - `app/settings/page.tsx`
3. The existing inline badge JSX in those three files should be replaced with `<UserBadge ... />`

## Important scope boundaries

- Do NOT modify any other page. In particular, `app/admin/page.tsx` has a similar-looking block but it's intentionally different (it shows extra admin-only fields and must remain custom). Leave it alone.
- Do NOT rename existing props on the three target pages
- Do NOT add new dependencies

## Notes
- All four existing pages are TSX server components by default; you'll need `'use client'` on UserBadge if it needs interactivity, but for this task a pure presentational component is fine (no `'use client'` needed)
- Use inline Tailwind-ish class names or regular CSS — either is fine
