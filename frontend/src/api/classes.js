import api from "./axios";

export const listClasses = () => api.get("/classes/");
export const listStudents = (className) => api.get(`/classes/${className}/students`);
export const grantAccess = (className, facultyId) =>
  api.post(`/classes/${className}/grant-access`, { faculty_id: facultyId });
export const removeStudent = (className, studentId) =>
  api.delete(`/classes/${className}/students/${studentId}`);
export const assignIncharge = (className, facultyId) =>
  api.post(`/classes/${className}/assign-incharge`, { faculty_id: facultyId });

export const getStudentRegistration = () => api.get("/classes/student-registration");
export const toggleStudentRegistration = () => api.post("/classes/student-registration/toggle");
