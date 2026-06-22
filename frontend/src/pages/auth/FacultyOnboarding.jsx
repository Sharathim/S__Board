import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { onboardFaculty } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";

const ALL_CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];

export default function FacultyOnboarding() {
  const { onboardingData, setUser } = useAuth();
  const navigate = useNavigate();
  const [name,        setName]        = useState(onboardingData?.prefill?.name || "");
  const [designation, setDesignation] = useState("Professor");
  const [classes,     setClasses]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

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
        uid:               onboardingData.prefill.uid,
        email:             onboardingData.prefill.email,
        name:              name.trim(),
        profile_picture:   onboardingData.prefill.profile_picture,
        designation,
        classes_handling:  classes,
      });
      setUser(res.data.user);
      sessionStorage.removeItem("loginRole");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-lg">

        {/* ── Brand header ── */}
        <div className="text-center mb-8">
          <img
            src="/logo-full.png"
            alt="DPMS — Department Project Management System"
            className="h-14 w-auto object-contain mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">
            Faculty onboarding — just a few details to get started
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-5"
        >
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          <Input label="Email" value={onboardingData?.prefill?.email || ""} disabled />
          <Input label="Designation" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Professor" />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Classes Handling
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_CLASSES.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => toggleClass(cls)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    classes.includes(cls)
                      ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                      : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  }`}
                >
                  {cls.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Complete Registration
          </Button>
        </form>
      </div>
    </div>
  );
}
