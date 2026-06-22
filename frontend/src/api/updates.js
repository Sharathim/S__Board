import api from "./axios";

export const listUpdates = (params) => api.get("/updates/", { params });
export const createUpdate = (data) => api.post("/updates/", data);
export const editUpdate = (id, data) => api.patch(`/updates/${id}`, data);
export const deleteUpdate = (id) => api.delete(`/updates/${id}`);
export const toggleUpdateLike = (id) => api.post(`/updates/${id}/like`);

export const listCoordinators = () => api.get("/updates/coordinators");
export const listEligibleCoordinators = (search) =>
  api.get("/updates/coordinators/eligible", { params: { search } });
export const assignCoordinator = (kind, refId) =>
  api.post("/updates/coordinators", { kind, ref_id: refId });
export const removeCoordinator = (kind, refId) =>
  api.delete("/updates/coordinators", { data: { kind, ref_id: refId } });
