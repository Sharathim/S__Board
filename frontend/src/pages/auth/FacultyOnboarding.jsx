import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { onboardFaculty } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { Logo } from "../../components/ui/Logo";

const ALL_CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];

export default function FacultyOnboarding() {
  const { user, firebaseUser, setOnboardingData, setUser } = useAuth();
  const navigate = useNavigate();

  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role && user.role !== "STUDENT" && user.role !== "FACULTY") {
      // Role already resolved — redirect
    }
  }, [user]);

  const toggleClass = (cls) => {
    setAssignedClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!department) { setError("Please specify your department."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = await onboardFaculty({ department, designation, assignedClasses });
      setOnboardingData(null);
      if (data.user) setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F3F3F5] transition-colors duration-300">
      <div className="w-full max-w-lg">

        {/* ── Brand header ── */}
        <div className="text-center mb-8">
          <Logo
            variant="full"
            alt="DPMS — Department Project Management System"
            className="h-14 w-auto object-contain mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            Faculty onboarding — just a few details to get started
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-5"
        >
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          <Input label="Email" value={onboardingData?.prefill?.email || ""} disabled />
          <Input label="Designation" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Professor" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classes Handling
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_CLASSES.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => toggleClass(cls)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${classes.includes(cls)
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      :"bg-gray-50 text-gray-700 border-gray-200 hover:border-primary-400 hover:bg-primary-50"
                    }`}                >
                  {cls.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
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
