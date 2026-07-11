import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { onboardStudent } from "../../../api/auth";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Spinner } from "../../../components/ui/Spinner";
import MobileCard from "../../components/MobileCard";

export default function MobileStudentOnboarding() {
  const { user, loading: authLoading, onboardingData, setOnboardingData, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        navigate("/classes", { replace: true });
      } else if (!onboardingData) {
        navigate("/", { replace: true });
      }
    }
  }, [user, onboardingData, authLoading, navigate]);

  const [name, setName] = useState(onboardingData?.prefill?.name || "");
  const [rollNumber, setRollNumber] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!onboardingData || onboardingData.invite_type !== "student") {
    return <Spinner fullScreen />;
  }

  const availableClasses = onboardingData.available_classes || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!rollNumber.trim()) { setError("Roll number is required"); return; }
    if (!registerNumber.trim()) { setError("Register number is required"); return; }
    if (!selectedClass) { setError("Please select your class"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await onboardStudent({
        uid: onboardingData.prefill.uid,
        email: onboardingData.prefill.email,
        name: name.trim(),
        profile_picture: onboardingData.prefill.profile_picture,
        roll_number: rollNumber.trim(),
        register_number: registerNumber.trim(),
        class_name: selectedClass,
      });
      setOnboardingData(null);
      setUser(res.data.user);
      sessionStorage.removeItem("loginRole");
      navigate("/classes");
    } catch (err) {
      setError(err.response?.data?.error || "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-8 bg-[#FFFFFF] dark:bg-[#000000] mobile-fade-in transition-colors duration-300">
      <div className="w-full max-w-md mx-auto space-y-6">

        {/* Brand header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg mx-auto mb-4">
            <img src="/logo-icon.png" alt="Hive" className="w-8 h-8 object-contain brightness-0 invert" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
            Student onboarding — just a few details to get started
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-55 dark:bg-slate-800 text-gray-555 cursor-not-allowed opacity-75"
              />
            </div>

            <Input label="Roll Number" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g. 2021CS001" />
            <Input label="Register Number" value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} placeholder="e.g. REG2021001" />

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Select Your Class
              </label>
              {/* grid-cols-2 for mobile friendliness */}
              <div className="grid grid-cols-2 gap-2">
                {availableClasses.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${selectedClass === cls
                        ? "bg-primary-650 text-white border-primary-650 shadow-sm"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-primary-400"
                      }`}
                  >
                    {cls.replace("_", " ")}
                  </button>
                ))}
              </div>
              {availableClasses.length === 0 && (
                <p className="text-[10px] text-amber-500 mt-1">No classes currently accepting new students. Contact HOD.</p>
              )}
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
