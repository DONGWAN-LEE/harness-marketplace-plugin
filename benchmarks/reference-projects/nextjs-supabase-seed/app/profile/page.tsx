export default function ProfilePage() {
  const user = { name: 'Jane Doe', email: 'jane@example.com', role: 'member' };
  return (
    <main>
      <h1>Your profile</h1>
      {/* inline user badge block — candidate for extraction */}
      <div className="user-badge">
        <div className="user-badge-name">{user.name}</div>
        <div className="user-badge-email">{user.email}</div>
        <div className="user-badge-role">{user.role}</div>
      </div>
      <section>
        <h2>About</h2>
        <p>Profile information.</p>
      </section>
    </main>
  );
}
