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
          // `loginRole` is only present during a fresh sign-in (used to route
          // new users to onboarding). On a restored/persistent session it's
          // absent — that's fine: the backend identifies an existing user by
          // their Firebase UID and logs them straight in without a role.
          const role = sessionStorage.getItem("loginRole");
          const res = await api.post("/auth/verify", role ? { idToken, role } : { idToken });
          if (res.data.onboarding_required) {
            setOnboardingData(res.data);
            setUser(null);
          } else {
            sessionStorage.removeItem("loginRole");
            setUser(res.data.user);
            setOnboardingData(null);
            const fcmToken = await requestFCMToken();
            if (fcmToken) {
              api.post("/auth/fcm-token", { fcm_token: fcmToken }).catch(() => {});
            }
          }
        } catch (err) {
          const msg = err?.response?.data?.error || "Sign-in failed. Please try again.";
          sessionStorage.removeItem("loginRole");
          setUser(null);
          setAuthError(msg);
          try { await logOut(); } catch { /* ignore */ }
        }
      } else {
        setUser(null);
        setOnboardingData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async (role = null) => {
    setAuthError(null);
    if (role) {
      sessionStorage.setItem("loginRole", role);
    } else {
      sessionStorage.removeItem("loginRole");
    }
    try {
      await signInWithGooglePopup();
    } catch (err) {
      if (err.code === "auth/popup-blocked") {
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
    <AuthContext.Provider value={{ user, firebaseUser, loading, onboardingData, setOnboardingData, authError, setAuthError, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
