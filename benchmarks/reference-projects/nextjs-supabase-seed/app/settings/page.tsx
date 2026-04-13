export default function SettingsPage() {
  const user = { name: 'Jane Doe', email: 'jane@example.com', role: 'member' };
  return (
    <main>
      <h1>Settings</h1>
      {/* inline user badge block — candidate for extraction */}
      <div className="user-badge">
        <div className="user-badge-name">{user.name}</div>
        <div className="user-badge-email">{user.email}</div>
        <div className="user-badge-role">{user.role}</div>
      </div>
      <section>
        <h2>Preferences</h2>
        <p>Configure your account.</p>
      </section>
    </main>
  );
}
