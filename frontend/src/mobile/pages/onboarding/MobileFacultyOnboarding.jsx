import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { onboardFaculty } from "../../../api/auth";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Spinner } from "../../../components/ui/Spinner";
import { Logo } from "../../../components/ui/Logo";
import MobileCard from "../../components/MobileCard";

const ALL_CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];

export default function MobileFacultyOnboarding() {
  const { user, loading: authLoading, onboardingData, setOnboardingData, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        navigate("/faculty", { replace: true });
      } else if (!onboardingData) {
        navigate("/", { replace: true });
      }
    }
  }, [user, onboardingData, authLoading, navigate]);

  const [name, setName] = useState(onboardingData?.prefill?.name || "");
  const [designation, setDesignation] = useState("Professor");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!onboardingData || onboardingData.invite_type !== "faculty") {
    return <Spinner fullScreen />;
  }

  const toggleClass = (cls) => {
    setClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await onboardFaculty({
        uid: onboardingData.prefill.uid,
        email: onboardingData.prefill.email,
        name: name.trim(),
        profile_picture: onboardingData.prefill.profile_picture,
        designation,
        classes_handling: classes,
      });
      setOnboardingData(null);
      setUser(res.data.user);
      sessionStorage.removeItem("loginRole");
      navigate("/faculty");
    } catch (err) {
      setError(err.response?.data?.error || "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-8 bg-[#F3F3F5] dark:bg-[#0B0F17] mobile-fade-in transition-colors duration-300">
      <div className="w-full max-w-md mx-auto space-y-6">

        {/* Brand header */}
        <div className="text-center">
          <Logo variant="icon" className="w-12 h-12 object-contain mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
            Faculty onboarding — just a few details to get started
          </p>
        </div>

        <MobileCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="text"
                value={onboardingData?.prefill?.email || ""}
                disabled
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-55 dark:bg-slate-800 text-gray-500 cursor-not-allowed opacity-75"
              />
            </div>

            <Input label="Designation" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Professor" />

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Classes Handling
              </label>
              {/* grid-cols-2 for mobile friendliness instead of grid-cols-4 */}
              <div className="grid grid-cols-2 gap-2">
                {ALL_CLASSES.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClass(cls)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${classes.includes(cls)
                        ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-primary-400"
                      }`}
                  >
                    {cls.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800/40">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full py-3 rounded-xl font-bold bg-primary-600 hover:bg-primary-700">
              Complete Registration
            </Button>
          </form>
        </MobileCard>
      </div>
    </div>
  );
}
