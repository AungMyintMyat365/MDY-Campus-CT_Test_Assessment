import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { loading, session, profile } = useAuth();

  if (loading) return <div className="centered">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile?.role) return <div className="centered">Profile not ready.</div>;

  if (!allowedRoles.includes(profile.role)) {
    if (profile.role === "center_lead") return <Navigate to="/lead/dashboard" replace />;
    if (profile.role === "coach") return <Navigate to="/coach/dashboard" replace />;
    if (profile.role === "coder") return <Navigate to="/coder/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
