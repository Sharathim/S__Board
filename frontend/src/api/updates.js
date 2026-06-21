import api from "./axios";

export const listUpdates = (params) => api.get("/updates/", { params });
export const createUpdate = (data) => api.post("/updates/", data);
export const editUpdate = (id, data) => api.patch(`/updates/${id}`, data);
export const deleteUpdate = (id) => api.delete(`/updates/${id}`);
export const toggleUpdateLike = (id) => api.post(`/updates/${id}/like`);
