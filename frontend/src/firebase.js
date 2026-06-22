import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { appConfig } from "./runtimeConfig";

const firebaseConfig = {
  apiKey: appConfig.firebaseApiKey,
  authDomain: appConfig.firebaseAuthDomain,
  projectId: appConfig.firebaseProjectId,
  storageBucket: appConfig.firebaseStorageBucket,
  messagingSenderId: appConfig.firebaseMessagingSenderId,
  appId: appConfig.firebaseAppId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persist the auth session in localStorage so users stay signed in across
// page reloads and browser restarts (no OAuth popup again until logout).
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set Firebase auth persistence:", err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Prevent Firebase Messaging crash on insecure HTTP origin or unsupported browser
let messagingInstance = null;
try {
  messagingInstance = getMessaging(app);
} catch (err) {
  console.warn("Firebase Messaging is not supported or not in a secure context (HTTPS):", err);
}

export const messaging = messagingInstance;

export const signInWithGoogle = () => signInWithRedirect(auth, googleProvider);
export const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);
export { getRedirectResult };
export const logOut = () => signOut(auth);

export const requestFCMToken = async () => {
  if (!messaging) return null;
  try {
    const token = await getToken(messaging, {
      vapidKey: appConfig.firebaseVapidKey,
    });
    return token;
  } catch {
    return null;
  }
};

export const onFCMMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};
