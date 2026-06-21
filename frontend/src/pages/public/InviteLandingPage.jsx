import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";

export default function InviteLandingPage() {
  const { token } = useParams();
  const { loginWithGoogle, user, loading, onboardingData } = useAuth();
  const [clicked, setClicked] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      return;
    }
    sessionStorage.setItem("inviteToken", token);
  }, [token]);

  const handleLogin = async () => {
    setClicked(true);
    try {
      await loginWithGoogle(token);
    } catch {
      setError("Authentication failed. Please try again.");
      setClicked(false);
    }
  };

  if (loading) return <Spinner fullScreen />;

  if (user) return <Navigate to="/dashboard" />;

  if (onboardingData) {
    if (onboardingData.invite_type === "faculty") return <Navigate to="/onboard/faculty" />;
    if (onboardingData.invite_type === "student") return <Navigate to="/onboard/student" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-900 via-primary-700 to-indigo-900">
      <div className="text-center max-w-md w-full">

        {/* ── Brand block — white card holds both logos comfortably on the dark bg ── */}
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20 mb-8 shadow-lg">
          <img
            src="/logo-icon.png"
            alt="DPMS"
            className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-sm"
          />
          <div className="text-left">
            <div className="text-white font-bold text-xl tracking-tight leading-tight">DPMS</div>
            <div className="text-white/60 text-[11px] tracking-wide mt-0.5 leading-tight">
              Department Project Management System
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">You've been invited!</h1>
        <p className="text-white/70 mb-8 leading-relaxed text-[15px]">
          Sign in with your Google account to join the Department Project Management System.
        </p>

        {error && (
          <p className="text-red-300 bg-red-500/10 rounded-lg px-4 py-2 mb-5 text-sm border border-red-400/20">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={clicked}
          className="w-full px-6 py-3.5 rounded-xl bg-white text-primary-700 font-semibold
            hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-lg
            active:translate-y-0 active:shadow-md
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
            flex items-center justify-center gap-3"
        >
          {clicked ? (
            <svg className="animate-spin h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}
