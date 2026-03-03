import { useAuth } from "../context/AuthContext";
import { coderDisplayName } from "../lib/displayName";

export default function CoderDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <main className="container">
      <h1>Coder Dashboard</h1>
      <p>Welcome, {coderDisplayName(profile)}.</p>
      <ul>
        <li>View assigned assessments</li>
        <li>Open Google Form links</li>
        <li>Track marks and completion status</li>
      </ul>
      <button onClick={logout}>Log Out</button>
    </main>
  );
}
