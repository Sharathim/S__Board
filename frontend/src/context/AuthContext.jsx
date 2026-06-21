import { createContext, useContext, useEffect, useState } from "react";
import { auth, signInWithGoogle, signInWithGooglePopup, getRedirectResult, logOut, requestFCMToken } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Handle the redirect result that comes back after Google sign-in
    getRedirectResult(auth).catch((err) => {
      console.error("Redirect sign-in error:", err?.code, err?.message);
    });

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken(true);
          const inviteToken = sessionStorage.getItem("inviteToken");
          const res = await api.post("/auth/verify", { idToken, inviteToken });
          sessionStorage.removeItem("inviteToken");
          if (res.data.onboarding_required) {
            setOnboardingData(res.data);
            setUser(null);
          } else {
            setUser(res.data.user);
            setOnboardingData(null);
            const fcmToken = await requestFCMToken();
            if (fcmToken) {
              api.post("/auth/fcm-token", { fcm_token: fcmToken }).catch(() => {});
            }
          }
        } catch {
          sessionStorage.removeItem("inviteToken");
          setUser(null);
        }
      } else {
        setUser(null);
        setOnboardingData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async (inviteToken = null) => {
    setAuthError(null);
    if (typeof inviteToken === "string" && inviteToken.trim()) {
      sessionStorage.setItem("inviteToken", inviteToken.trim());
    } else {
      sessionStorage.removeItem("inviteToken");
    }
    try {
      await signInWithGooglePopup();
    } catch (err) {
      if (err.code === "auth/popup-blocked") {
        // Popup was blocked by browser — fall back to redirect flow
        await signInWithGoogle();
      } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setAuthError(err.message || "Sign-in failed. Please try again.");
      }
    }
  };

  const logout = async () => {
    await logOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, onboardingData, authError, setAuthError, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
