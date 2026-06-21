import axios from "axios";
import { auth } from "../firebase";
import { appConfig } from "../runtimeConfig";

const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || "Something went wrong";
    window.dispatchEvent(new CustomEvent("api-error", { detail: message }));
    return Promise.reject(err);
  }
);

export default api;
