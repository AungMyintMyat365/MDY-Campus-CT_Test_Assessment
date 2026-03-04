import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileDisplayName } from "../lib/displayName";

export default function CoachDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <main className="container">
      <h1>Coach Dashboard</h1>
      <p>Welcome, {profileDisplayName(profile)}.</p>
      <ul>
        <li>Manage your classes and coders</li>
        <li>Assign assessment links</li>
        <li>Move coders between classes</li>
      </ul>
      <div className="row gap">
        <Link to="/coach/coders">Manage Coders</Link>
        <Link to="/assessments">Assessments</Link>
        <Link to="/results">Results</Link>
      </div>
      <button onClick={logout}>Log Out</button>
    </main>
  );
}
