// Admin page — intentionally uses a DIFFERENT layout from the other user pages.
// Do not replace this block with the shared UserBadge — it shows admin-only fields.

export default function AdminPage() {
  const user = {
    name: 'Admin Smith',
    email: 'admin@example.com',
    role: 'admin',
    last_login: '2026-04-10T12:00:00Z',
    permissions: ['users.read', 'users.write', 'audit.read'],
  };
  return (
    <main>
      <h1>Admin Control Panel</h1>
      <div className="admin-badge">
        <div className="admin-badge-header">
          <strong>{user.name}</strong>
          <span className="admin-role-tag">ADMIN</span>
        </div>
        <dl>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Last login</dt>
          <dd>{user.last_login}</dd>
          <dt>Permissions</dt>
          <dd>{user.permissions.join(', ')}</dd>
        </dl>
      </div>
    </main>
  );
}
