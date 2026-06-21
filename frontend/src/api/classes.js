import api from "./axios";

export const listClasses = () => api.get("/classes/");
export const listStudents = (className) => api.get(`/classes/${className}/students`);
export const getClassInvite = (className) => api.get(`/classes/${className}/invite`);
export const toggleClassInvite = (className) => api.post(`/classes/${className}/invite/toggle`);
export const grantAccess = (className, facultyId) =>
  api.post(`/classes/${className}/grant-access`, { faculty_id: facultyId });
