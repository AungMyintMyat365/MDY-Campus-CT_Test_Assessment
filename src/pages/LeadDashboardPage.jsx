import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileDisplayName } from "../lib/displayName";

export default function LeadDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <main className="container">
      <h1>Center Lead Dashboard</h1>
      <p>Welcome, {profileDisplayName(profile)}.</p>
      <ul>
        <li>Create coach accounts</li>
        <li>Manage all classes and coders</li>
        <li>Monitor assessment completion</li>
      </ul>
      <div className="row gap">
        <Link to="/lead/coaches">Manage Coaches</Link>
        <Link to="/lead/classes">Manage Classes</Link>
      </div>
      <button onClick={logout}>Log Out</button>
    </main>
  );
}
