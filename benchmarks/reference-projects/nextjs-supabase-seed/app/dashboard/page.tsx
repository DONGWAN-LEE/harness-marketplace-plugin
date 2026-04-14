export default function DashboardPage() {
  const user = { name: 'Jane Doe', email: 'jane@example.com', role: 'member' };
  return (
    <main>
      <h1>Dashboard</h1>
      {/* inline user badge block — candidate for extraction */}
      <div className="user-badge">
        <div className="user-badge-name">{user.name}</div>
        <div className="user-badge-email">{user.email}</div>
        <div className="user-badge-role">{user.role}</div>
      </div>
      <section>
        <h2>Recent activity</h2>
        <p>No recent activity.</p>
      </section>
    </main>
  );
}
