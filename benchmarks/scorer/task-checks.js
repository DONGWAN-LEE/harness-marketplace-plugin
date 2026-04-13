/**
 * Registry of per-task acceptance checks.
 *
 * Each check has:
 *   - id: short identifier
 *   - description: human-readable
 *   - type: one of 'file_exists', 'file_contains', 'file_not_contains', 'any_of'
 *   - args: type-specific
 *
 * Keep the check registry close to the task specs — when a spec changes, update the corresponding entry here.
 */

export const TASK_CHECKS = {
  // ─── Next.js ─────────────────────────────────────────────────────────
  'nextjs-basic': {
    seed_dir: 'nextjs-supabase-seed',
    checks: [
      { id: 'page-exists', type: 'file_exists', path: 'app/profile/edit/page.tsx' },
      { id: 'has-default-export', type: 'file_contains', path: 'app/profile/edit/page.tsx', pattern: /export\s+default\s+/ },
      { id: 'has-name-field', type: 'file_contains', path: 'app/profile/edit/page.tsx', pattern: /name=["']name["']|htmlFor=["']name["']|"name"/ },
      { id: 'has-email-field', type: 'file_contains', path: 'app/profile/edit/page.tsx', pattern: /name=["']email["']|htmlFor=["']email["']|"email"/ },
      { id: 'has-email-validation', type: 'file_contains', path: 'app/profile/edit/page.tsx', pattern: /@.+\..+|emailRegex|validateEmail|\\S+@\\S+/ },
      { id: 'no-new-deps', type: 'file_not_contains', path: 'package.json', pattern: /formik|react-hook-form|zod|yup|joi/ },
    ],
    runtime_checks: [
      { id: 'typecheck', cmd: 'npm run typecheck', requires: 'node_modules' },
    ],
  },

  'nextjs-advanced': {
    seed_dir: 'nextjs-supabase-seed',
    checks: [
      { id: 'route-exists', type: 'file_exists', path: 'app/api/posts/route.ts' },
      { id: 'has-GET-export', type: 'file_contains', path: 'app/api/posts/route.ts', pattern: /export\s+(async\s+)?function\s+GET/ },
      { id: 'uses-shared-client', type: 'file_contains', path: 'app/api/posts/route.ts', pattern: /from\s+["']@\/lib\/supabase["']|from\s+["'].*lib\/supabase["']/ },
      { id: 'calls-auth-getUser', type: 'file_contains', path: 'app/api/posts/route.ts', pattern: /auth\.getUser/ },
      { id: 'queries-posts-table', type: 'file_contains', path: 'app/api/posts/route.ts', pattern: /from\s*\(\s*['"]posts['"]/ },
      { id: 'filters-by-user', type: 'file_contains', path: 'app/api/posts/route.ts', pattern: /\.eq\(\s*['"]user_id['"]/ },
      { id: 'returns-401', type: 'file_contains', path: 'app/api/posts/route.ts', pattern: /401|unauthorized/i },
      { id: 'no-hardcoded-tokens', type: 'file_not_contains', path: 'app/api/posts/route.ts', pattern: /sk-[a-zA-Z0-9]{20,}|sbp_[a-zA-Z0-9]{20,}|ey[a-zA-Z0-9]{50,}/ },
    ],
    runtime_checks: [
      { id: 'typecheck', cmd: 'npm run typecheck', requires: 'node_modules' },
    ],
  },

  'nextjs-expert': {
    seed_dir: 'nextjs-supabase-seed',
    checks: [
      { id: 'action-file-exists', type: 'file_exists', path: 'app/actions/like.ts' },
      { id: 'use-server-directive', type: 'file_contains', path: 'app/actions/like.ts', pattern: /^['"]use server['"]/m },
      { id: 'exports-incrementLike', type: 'file_contains', path: 'app/actions/like.ts', pattern: /export\s+(async\s+)?function\s+incrementLike|export\s+const\s+incrementLike/ },
      { id: 'atomic-update', type: 'file_contains', path: 'app/actions/like.ts', pattern: /\.update\s*\(/ },
      { id: 'version-check', type: 'file_contains', path: 'app/actions/like.ts', pattern: /\.eq\s*\(\s*['"]version['"]/ },
      { id: 'no-separate-select', type: 'file_not_contains', path: 'app/actions/like.ts', pattern: /\.select\([^)]*\)[\s\S]*?\.update\(/ },
      { id: 'handles-version-conflict', type: 'file_contains', path: 'app/actions/like.ts', pattern: /version-conflict|version_conflict/ },
    ],
    runtime_checks: [
      { id: 'typecheck', cmd: 'npm run typecheck', requires: 'node_modules' },
    ],
  },

  // ─── FastAPI ─────────────────────────────────────────────────────────
  'fastapi-basic': {
    seed_dir: 'fastapi-postgres-seed',
    checks: [
      { id: 'schema-exists', type: 'file_exists', path: 'app/schemas/user.py' },
      { id: 'UserResponse-defined', type: 'file_contains', path: 'app/schemas/user.py', pattern: /class\s+UserResponse/ },
      { id: 'routes-file-exists', type: 'file_exists', path: 'app/routes/users.py' },
      { id: 'has-router-var', type: 'file_contains', path: 'app/routes/users.py', pattern: /router\s*=\s*APIRouter/ },
      { id: 'uses-get-db', type: 'file_contains', path: 'app/routes/users.py', pattern: /get_db|Depends\(get_db\)/ },
      { id: 'queries-user-model', type: 'file_contains', path: 'app/routes/users.py', pattern: /from\s+app\.models\.user\s+import\s+User|import\s+User/ },
      { id: 'returns-404', type: 'file_contains', path: 'app/routes/users.py', pattern: /404|HTTPException/ },
      { id: 'main-includes-router', type: 'file_contains', path: 'app/main.py', pattern: /include_router\s*\(\s*users/ },
      { id: 'test-file-exists', type: 'file_exists', path: 'tests/test_users.py' },
    ],
    runtime_checks: [
      { id: 'pytest-collect', cmd: 'python -m pytest tests/test_users.py --collect-only -q', requires: '.venv' },
    ],
  },

  'fastapi-advanced': {
    seed_dir: 'fastapi-postgres-seed',
    checks: [
      { id: 'auth-file-exists', type: 'file_exists', path: 'app/auth.py' },
      { id: 'create-token-defined', type: 'file_contains', path: 'app/auth.py', pattern: /def\s+create_access_token/ },
      { id: 'verify-token-defined', type: 'file_contains', path: 'app/auth.py', pattern: /def\s+verify_token/ },
      { id: 'get-current-user-defined', type: 'file_contains', path: 'app/auth.py', pattern: /get_current_user_id/ },
      { id: 'uses-stdlib-only', type: 'file_not_contains', path: 'app/auth.py', pattern: /import\s+(jose|pyjwt|jwt)/ },
      { id: 'uses-hmac', type: 'file_contains', path: 'app/auth.py', pattern: /import\s+hmac|from\s+hmac/ },
      { id: 'uses-hashlib', type: 'file_contains', path: 'app/auth.py', pattern: /import\s+hashlib|from\s+hashlib/ },
      { id: 'reads-settings', type: 'file_contains', path: 'app/auth.py', pattern: /settings\.jwt_secret/ },
      { id: 'me-route-exists', type: 'file_exists', path: 'app/routes/me.py' },
      { id: 'me-uses-depends', type: 'file_contains', path: 'app/routes/me.py', pattern: /Depends\s*\(\s*get_current_user_id/ },
      { id: 'main-includes-me', type: 'file_contains', path: 'app/main.py', pattern: /include_router\s*\(\s*me/ },
      { id: 'test-file-exists', type: 'file_exists', path: 'tests/test_auth.py' },
    ],
    runtime_checks: [
      { id: 'pytest-collect', cmd: 'python -m pytest tests/test_auth.py --collect-only -q', requires: '.venv' },
    ],
  },

  'fastapi-expert': {
    seed_dir: 'fastapi-postgres-seed',
    checks: [
      { id: 'post-model-exists', type: 'file_exists', path: 'app/models/post.py' },
      { id: 'post-has-user_id', type: 'file_contains', path: 'app/models/post.py', pattern: /user_id/ },
      { id: 'post-has-relationship', type: 'file_contains', path: 'app/models/post.py', pattern: /relationship/ },
      { id: 'post-uses-mapped', type: 'file_contains', path: 'app/models/post.py', pattern: /Mapped\[/ },
      { id: 'route-exists', type: 'file_exists', path: 'app/routes/users_with_posts.py' },
      { id: 'uses-selectinload-or-joinedload', type: 'any_of', checks: [
        { type: 'file_contains', path: 'app/routes/users_with_posts.py', pattern: /selectinload/ },
        { type: 'file_contains', path: 'app/routes/users_with_posts.py', pattern: /joinedload/ },
      ]},
      { id: 'main-includes-router', type: 'file_contains', path: 'app/main.py', pattern: /include_router\s*\(\s*users_with_posts/ },
      { id: 'test-file-exists', type: 'file_exists', path: 'tests/test_users_with_posts.py' },
    ],
    runtime_checks: [
      { id: 'pytest-collect', cmd: 'python -m pytest tests/test_users_with_posts.py --collect-only -q', requires: '.venv' },
    ],
  },
};
