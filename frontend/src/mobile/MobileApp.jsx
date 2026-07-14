import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SessionLoader } from "../components/ui/SessionLoader";

// Layouts
import MobileShell from "./layout/MobileShell";
import MobilePublicShell from "./layout/MobilePublicShell";

// Public Pages
import MobileHomePage from "./pages/public/MobileHomePage";
import MobileAboutPage from "./pages/public/MobileAboutPage";
import MobileFeaturesPage from "./pages/public/MobileFeaturesPage";
import MobileContactPage from "./pages/public/MobileContactPage";

// Onboarding Pages
import MobileFacultyOnboarding from "./pages/onboarding/MobileFacultyOnboarding";
import MobileStudentOnboarding from "./pages/onboarding/MobileStudentOnboarding";

// Authenticated Pages
import MobileDashboardPage from "./pages/dashboard/MobileDashboardPage";
import MobileFacultyPage from "./pages/faculty/MobileFacultyPage";
import MobileClassesPage from "./pages/classes/MobileClassesPage";
import MobileClassDetailPage from "./pages/classes/MobileClassDetailPage";
import MobileForumPage from "./pages/forum/MobileForumPage";
import MobileProjectsPage from "./pages/projects/MobileProjectsPage";
import MobileProjectDetailPage from "./pages/projects/MobileProjectDetailPage";
import MobileViewAllProgressPage from "./pages/projects/MobileViewAllProgressPage";
import MobileUpdatesPage from "./pages/updates/MobileUpdatesPage";
import MobileNotificationsPage from "./pages/notifications/MobileNotificationsPage";
import MobileSettingsPage from "./pages/settings/MobileSettingsPage";

// Stylesheet
import "./mobile.css";

function MobilePublicRoute() {
  const { user, loading, onboardingData } = useAuth();
  if (loading) return <SessionLoader />;
  if (onboardingData) {
    if (onboardingData.invite_type === "faculty") return <Navigate to="/onboard/faculty" replace />;
    if (onboardingData.invite_type === "student") return <Navigate to="/onboard/student" replace />;
  }
  if (user) {
    const dest = user.role === "HOD" ? "/dashboard" : user.role === "FACULTY" ? "/faculty" : "/classes";
    return <Navigate to={dest} replace />;
  }
  return <MobilePublicShell />;
}

function MobileProtectedRoute({ children }) {
  const { user, loading, onboardingData } = useAuth();
  if (loading) return <SessionLoader />;
  if (onboardingData) {
    if (onboardingData.invite_type === "faculty") return <Navigate to="/onboard/faculty" />;
    if (onboardingData.invite_type === "student") return <Navigate to="/onboard/student" />;
  }
  if (!user) return <Navigate to="/" />;
  return children;
}

export default function MobileApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MobilePublicRoute />}>
          <Route path="/" element={<MobileHomePage />} />
        </Route>
        
        {/* Public pages, no auth redirect */}
        <Route element={<MobilePublicShell />}>
          <Route path="/about" element={<MobileAboutPage />} />
          <Route path="/features" element={<MobileFeaturesPage />} />
          <Route path="/contact" element={<MobileContactPage />} />
        </Route>

        <Route path="/onboard/faculty" element={<MobileFacultyOnboarding />} />
        <Route path="/onboard/student" element={<MobileStudentOnboarding />} />

        <Route element={<MobileProtectedRoute><MobileShell /></MobileProtectedRoute>}>
          <Route path="/dashboard" element={<MobileDashboardPage />} />
          <Route path="/faculty" element={<MobileFacultyPage />} />
          <Route path="/classes" element={<MobileClassesPage />} />
          <Route path="/classes/:className" element={<MobileClassDetailPage />} />
          <Route path="/forum" element={<Navigate to="/" replace />} />
          <Route path="/projects" element={<MobileProjectsPage />} />
          <Route path="/projects/:id" element={<MobileProjectDetailPage />} />
          <Route path="/projects/:id/progress" element={<MobileViewAllProgressPage />} />
          <Route path="/updates" element={<Navigate to="/" replace />} />
          <Route path="/notifications" element={<MobileNotificationsPage />} />
          <Route path="/settings" element={<MobileSettingsPage />} />
        </Route>

        {/* Catch-all redirects to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
