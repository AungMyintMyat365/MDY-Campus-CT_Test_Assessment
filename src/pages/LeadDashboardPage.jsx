import { useAuth } from "../context/AuthContext";

export default function LeadDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <main className="container">
      <h1>Center Lead Dashboard</h1>
      <p>Welcome, {profile?.full_name ?? "Center Lead"}.</p>
      <ul>
        <li>Create coach accounts</li>
        <li>Manage all classes and coders</li>
        <li>Monitor assessment completion</li>
      </ul>
      <button onClick={logout}>Log Out</button>
    </main>
  );
}
