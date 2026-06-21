import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { onboardStudent } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";

export default function StudentOnboarding() {
  const { onboardingData, setUser } = useAuth();
  const navigate = useNavigate();
  const [name,           setName]           = useState(onboardingData?.prefill?.name || "");
  const [rollNumber,     setRollNumber]     = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);

  if (!onboardingData || onboardingData.invite_type !== "student") {
    return <Spinner fullScreen />;
  }

  const className = onboardingData.class_name;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())           { setError("Name is required");            return; }
    if (!rollNumber.trim())     { setError("Roll number is required");     return; }
    if (!registerNumber.trim()) { setError("Register number is required"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await onboardStudent({
        uid:             onboardingData.prefill.uid,
        email:           onboardingData.prefill.email,
        name:            name.trim(),
        profile_picture: onboardingData.prefill.profile_picture,
        roll_number:     rollNumber.trim(),
        register_number: registerNumber.trim(),
        class_name:      className,
        invite_token:    sessionStorage.getItem("inviteToken") || "",
      });
      setUser(res.data.user);
      sessionStorage.removeItem("inviteToken");
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
            Student onboarding — just a few details to get started
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-5"
        >
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          <Input label="Email" value={onboardingData?.prefill?.email || ""} disabled />
          <Input label="Roll Number" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g. 2021CS001" />
          <Input label="Register Number" value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} placeholder="e.g. REG2021001" />
          <Input label="Class" value={className?.replace("_", " ") || ""} disabled />

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
