import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";
import { LogIn } from "lucide-react";

export function HODLoginButton() {
  const { loginWithGoogle, loading } = useAuth();

  return (
    <Button
      size="lg"
      onClick={() => loginWithGoogle()}
      loading={loading}
      className="gap-2 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow"
    >
      <LogIn className="w-5 h-5" />
      HOD Login
    </Button>
  );
}
