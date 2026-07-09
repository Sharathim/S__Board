import api from "./axios";

export const listClasses = () => api.get("/classes/");
export const listAllStudents = () => api.get("/classes/students");
export const listStudents = (className) => api.get(`/classes/${className}/students`);
export const removeStudent = (className, studentId) =>
  api.delete(`/classes/${className}/students/${studentId}`);
export const assignIncharge = (className, facultyId) =>
  api.post(`/classes/${className}/assign-incharge`, { faculty_id: facultyId });

export const getStudentRegistration = () => api.get("/classes/student-registration");
export const toggleStudentRegistration = () => api.post("/classes/student-registration/toggle");

// ─── Notes & Docs Endpoints ─────────────────────────────────────────────
// Subjects
export const listSubjects = (className, archived = false) =>
  api.get(`/classes/${className}/notes/subjects`, { params: { archived } });
export const createSubject = (className, data) =>
  api.post(`/classes/${className}/notes/subjects`, data);
export const editSubject = (className, subjectId, data) =>
  api.patch(`/classes/${className}/notes/subjects/${subjectId}`, data);
export const deleteSubject = (className, subjectId) =>
  api.delete(`/classes/${className}/notes/subjects/${subjectId}`);
export const archiveSubject = (className, subjectId) =>
  api.post(`/classes/${className}/notes/subjects/${subjectId}/archive`);
export const unarchiveSubject = (className, subjectId) =>
  api.post(`/classes/${className}/notes/subjects/${subjectId}/unarchive`);

// Units
export const listUnits = (className, subjectId) =>
  api.get(`/classes/${className}/notes/subjects/${subjectId}/units`);
export const createUnit = (className, subjectId, data) =>
  api.post(`/classes/${className}/notes/subjects/${subjectId}/units`, data);
export const editUnit = (className, subjectId, unitId, data) =>
  api.patch(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}`, data);
export const deleteUnit = (className, subjectId, unitId) =>
  api.delete(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}`);

// Files
export const uploadFiles = (className, subjectId, unitId, formData) =>
  api.post(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}/files`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
export const deleteFile = (className, subjectId, unitId, fileId) =>
  api.delete(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}/files/${fileId}`);

// Logs
export const getNotesLogs = (className, page = 1) =>
  api.get(`/classes/${className}/notes/logs`, { params: { page } });

