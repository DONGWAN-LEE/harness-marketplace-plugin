# Next.js + Supabase Seed

Minimal reference project used by the harness-marketplace Phase 0 A/B pilot.

## Stack
- Next.js 14 (App Router)
- TypeScript (strict)
- Supabase JS client
- ESLint

## Running
```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
npm run typecheck  # tsc --noEmit
```

## Notes
This is a bare-bones seed — no auth, no DB schema, no UI library. Tasks in the benchmark suite will add features to this baseline.

Used by both control and treatment conditions. Treatment additionally overlays `nextjs-supabase-harness/` on top to install the harness skills and hooks.
