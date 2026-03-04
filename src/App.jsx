import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import LeadDashboardPage from "./pages/LeadDashboardPage";
import LeadCoachesPage from "./pages/LeadCoachesPage";
import LeadClassesPage from "./pages/LeadClassesPage";
import LeadMonitoringPage from "./pages/LeadMonitoringPage";
import CoachDashboardPage from "./pages/CoachDashboardPage";
import CoachCodersPage from "./pages/CoachCodersPage";
import CoderDashboardPage from "./pages/CoderDashboardPage";
import AssessmentsPage from "./pages/AssessmentsPage";
import ResultsPage from "./pages/ResultsPage";
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
        path="/lead/coaches"
        element={
          <ProtectedRoute allowedRoles={["center_lead"]}>
            <LeadCoachesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead/classes"
        element={
          <ProtectedRoute allowedRoles={["center_lead"]}>
            <LeadClassesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead/monitoring"
        element={
          <ProtectedRoute allowedRoles={["center_lead"]}>
            <LeadMonitoringPage />
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
        path="/coach/coders"
        element={
          <ProtectedRoute allowedRoles={["coach"]}>
            <CoachCodersPage />
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
      <Route
        path="/assessments"
        element={
          <ProtectedRoute allowedRoles={["center_lead", "coach"]}>
            <AssessmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute allowedRoles={["center_lead", "coach", "coder"]}>
            <ResultsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
