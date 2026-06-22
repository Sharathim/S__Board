import api from "./axios";

export const listProjects = (params) => api.get("/projects/", { params });
export const getProjectStats = () => api.get("/projects/stats");
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post("/projects/", data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const updateProjectStatus = (id, status) =>
  api.patch(`/projects/${id}/status`, { status });
export const getMessages = (projectId, params) =>
  api.get(`/projects/${projectId}/messages`, { params });
export const postMessage = (projectId, data) =>
  api.post(`/projects/${projectId}/messages`, data);
export const editMessage = (projectId, messageId, data) =>
  api.patch(`/projects/${projectId}/messages/${messageId}`, data);
export const deleteMessage = (projectId, messageId) =>
  api.delete(`/projects/${projectId}/messages/${messageId}`);
