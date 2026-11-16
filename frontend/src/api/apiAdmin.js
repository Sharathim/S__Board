import api from "./axios";

export const checkApiAdminStatus = () => api.get("/api-admin/status");
export const listApiKeys = () => api.get("/api-admin/keys");
export const createApiKey = (data) => api.post("/api-admin/keys", data);
export const deleteApiKey = (keyId) => api.delete(`/api-admin/keys/${keyId}`);
export const toggleApiKey = (keyId) => api.patch(`/api-admin/keys/${keyId}/toggle`);
