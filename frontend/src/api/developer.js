import api from "./axios";

export const getDeveloperTelemetry = () => api.get("/developer/telemetry");
export const listDeveloperUsers = (params) => api.get("/developer/users", { params });
export const grantHodAccess = (email) => api.post("/developer/users/grant-hod", { email });
export const setUserRole = (userId, role) => api.post(`/developer/users/${userId}/set-role`, { role });
export const deleteDeveloperUser = (userId) => api.delete(`/developer/users/${userId}`);
export const getDeveloperAllData = () => api.get("/developer/all-data");
