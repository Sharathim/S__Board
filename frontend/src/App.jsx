import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { SessionLoader } from "./components/ui/SessionLoader";
import PageLayout from "./components/layout/PageLayout";
import PublicLayout from "./components/layout/PublicLayout";
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import FacultyOnboarding from "./pages/auth/FacultyOnboarding";
import StudentOnboarding from "./pages/auth/StudentOnboarding";
import DashboardPage from "./pages/dashboard/DashboardPage";
import FacultyPage from "./pages/faculty/FacultyPage";
import ClassesPage from "./pages/classes/ClassesPage";
import ClassDetailPage from "./pages/classes/ClassDetailPage";
import ForumPage from "./pages/forum/ForumPage";
import ForumPostDetailPage from "./pages/forum/ForumPostDetailPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import UpdatesPage from "./pages/updates/UpdatesPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import NotFoundPage from "./pages/public/NotFoundPage";

function PublicRoute({ children }) {
  const { user, loading, onboardingData } = useAuth();
  if (loading) return <SessionLoader />;
  if (onboardingData) {
    if (onboardingData.invite_type === "faculty") return <Navigate to="/onboard/faculty" replace />;
    if (onboardingData.invite_type === "student") return <Navigate to="/onboard/student" replace />;
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function ProtectedRoute({ children }) {
  const { user, loading, onboardingData } = useAuth();
  if (loading) return <SessionLoader />;
  if (onboardingData) {
    if (onboardingData.invite_type === "faculty") return <Navigate to="/onboard/faculty" />;
    if (onboardingData.invite_type === "student") return <Navigate to="/onboard/student" />;
  }
  if (!user) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public single-page landing ── */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <PublicLayout />
            </PublicRoute>
          }
        >
          <Route index element={<LandingPage />} />
        </Route>

        {/* ── Login page (separate, no navbar) ── */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* ── Onboarding ── */}
        <Route path="/onboard/faculty" element={<FacultyOnboarding />} />
        <Route path="/onboard/student" element={<StudentOnboarding />} />

        {/* ── Protected app routes ── */}
        <Route
          element={
            <ProtectedRoute>
              <PageLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/:className" element={<ClassDetailPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/post/:id" element={<ForumPostDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
