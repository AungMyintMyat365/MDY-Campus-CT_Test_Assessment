import { useAuth } from "../context/AuthContext";

export default function CoachDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <main className="container">
      <h1>Coach Dashboard</h1>
      <p>Welcome, {profile?.full_name ?? "Coach"}.</p>
      <ul>
        <li>Manage your classes and coders</li>
        <li>Assign assessment links</li>
        <li>Move coders between classes</li>
      </ul>
      <button onClick={logout}>Log Out</button>
    </main>
  );
}
