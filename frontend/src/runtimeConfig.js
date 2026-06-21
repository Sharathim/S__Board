const runtimeConfig = window.__APP_CONFIG__ ?? {};

function getConfigValue(key, fallback = "") {
  const runtimeValue = runtimeConfig[key];
  if (typeof runtimeValue === "string" && runtimeValue.trim() !== "") {
    return runtimeValue.trim();
  }

  const buildValue = import.meta.env[key];
  if (typeof buildValue === "string" && buildValue.trim() !== "") {
    return buildValue.trim();
  }

  return fallback;
}

function normalizeApiBaseUrl(value) {
  if (!value) {
    return "/api";
  }

  const normalized = value.replace(/\/+$/, "");
  if (normalized.endsWith("/api")) {
    return normalized;
  }

  return `${normalized}/api`;
}

export const appConfig = {
  firebaseApiKey: getConfigValue("VITE_FIREBASE_API_KEY"),
  firebaseAuthDomain: getConfigValue("VITE_FIREBASE_AUTH_DOMAIN"),
  firebaseProjectId: getConfigValue("VITE_FIREBASE_PROJECT_ID"),
  firebaseStorageBucket: getConfigValue("VITE_FIREBASE_STORAGE_BUCKET"),
  firebaseMessagingSenderId: getConfigValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  firebaseAppId: getConfigValue("VITE_FIREBASE_APP_ID"),
  firebaseVapidKey: getConfigValue("VITE_FIREBASE_VAPID_KEY"),
  apiBaseUrl: normalizeApiBaseUrl(getConfigValue("VITE_API_BASE_URL")),
};
