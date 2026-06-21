import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut,
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
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const messaging = getMessaging(app);

export const signInWithGoogle = () => signInWithRedirect(auth, googleProvider);
export const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);
export { getRedirectResult };
export const logOut = () => signOut(auth);

export const requestFCMToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: appConfig.firebaseVapidKey,
    });
    return token;
  } catch {
    return null;
  }
};

export const onFCMMessage = (callback) => onMessage(messaging, callback);
