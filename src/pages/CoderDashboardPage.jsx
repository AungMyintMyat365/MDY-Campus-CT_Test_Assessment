import { useAuth } from "../context/AuthContext";

export default function CoderDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <main className="container">
      <h1>Coder Dashboard</h1>
      <p>Welcome, {profile?.full_name ?? profile?.coder_id ?? "Coder"}.</p>
      <ul>
        <li>View assigned assessments</li>
        <li>Open Google Form links</li>
        <li>Track marks and completion status</li>
      </ul>
      <button onClick={logout}>Log Out</button>
    </main>
  );
}
