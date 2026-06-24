import api from "./axios";

export const listForumMembers = () => api.get("/forum/members");
export const listEligibleStudents = (search) =>
  api.get("/forum/eligible-students", { params: { search } });
export const assignForumMember = (studentId, role) =>
  api.post("/forum/members", { student_id: studentId, role });
export const removeForumMember = (id) => api.delete(`/forum/members/${id}`);
export const toggleForumCoordinator = (id) =>
  api.post(`/forum/members/${id}/coordinator`);
export const listForumPosts = (params) => api.get("/forum/posts", { params });
export const createForumPost = (data) => api.post("/forum/posts", data);
export const editForumPost = (id, data) => api.patch(`/forum/posts/${id}`, data);
export const toggleForumPostLike = (id) => api.post(`/forum/posts/${id}/like`);
export const deleteForumPost = (id) => api.delete(`/forum/posts/${id}`);

