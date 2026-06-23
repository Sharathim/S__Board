import api from "./axios";

export const listFaculty = () => api.get("/faculty/");
export const updateFaculty = (id, data) => api.patch(`/faculty/${id}`, data);
export const assignIncharge = (id, className) =>
  api.post(`/faculty/${id}/assign-incharge`, { class_name: className });
export const toggleCoordinator = (id) =>
  api.post(`/faculty/${id}/coordinator`);
export const getFacultyInvite = () => api.get("/faculty/invite");
export const toggleFacultyInvite = () => api.post("/faculty/invite/toggle");
export const deleteFaculty = (id) => api.delete(`/faculty/${id}`);

