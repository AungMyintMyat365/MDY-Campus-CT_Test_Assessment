import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import LeadDashboardPage from "./pages/LeadDashboardPage";
import CoachDashboardPage from "./pages/CoachDashboardPage";
import CoderDashboardPage from "./pages/CoderDashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/lead/dashboard"
        element={
          <ProtectedRoute allowedRoles={["center_lead"]}>
            <LeadDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/dashboard"
        element={
          <ProtectedRoute allowedRoles={["coach"]}>
            <CoachDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coder/dashboard"
        element={
          <ProtectedRoute allowedRoles={["coder"]}>
            <CoderDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
