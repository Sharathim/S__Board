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

// ─── Student Forms & Data Endpoints ─────────────────────────────────────
export const getStudentDetails = (className, studentId) =>
  api.get(`/classes/${className}/students/${studentId}/details`);
export const saveStudentDetails = (className, studentId, details) =>
  api.post(`/classes/${className}/students/${studentId}/details`, { details });
export const saveStudentDetailsAdmin = (className, studentId, details, extraDetails) =>
  api.post(`/classes/${className}/students/${studentId}/details/admin`, { details, extra_details: extraDetails });

export const getStudentsData = (className) =>
  api.get(`/classes/${className}/students-data`);
export const getClassStats = (className) =>
  api.get(`/classes/${className}/stats`);

export const createForm = (className, data) =>
  api.post(`/classes/${className}/forms`, data);
export const listForms = (className) =>
  api.get(`/classes/${className}/forms`);
export const getForm = (className, formId) =>
  api.get(`/classes/${className}/forms/${formId}`);
export const deleteForm = (className, formId) =>
  api.delete(`/classes/${className}/forms/${formId}`);
export const submitFormResponse = (className, formId, formDataOrJson, isMultipart = false) => {
  if (isMultipart) {
    return api.post(`/classes/${className}/forms/${formId}/responses`, formDataOrJson, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
  return api.post(`/classes/${className}/forms/${formId}/responses`, formDataOrJson);
};
export const getFormResponses = (className, formId) =>
  api.get(`/classes/${className}/forms/${formId}/responses`);

// ─── Accomplishments & Resume Endpoints ─────────────────────────────────
export const listAccomplishments = (className, studentId) =>
  api.get(`/classes/${className}/accomplishments`, { params: studentId ? { student_id: studentId } : {} });

export const createAccomplishment = (className, formDataOrJson, isMultipart = false) => {
  if (isMultipart) {
    return api.post(`/classes/${className}/accomplishments`, formDataOrJson, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
  return api.post(`/classes/${className}/accomplishments`, formDataOrJson);
};

export const updateAccomplishment = (accId, formDataOrJson, isMultipart = false) => {
  if (isMultipart) {
    return api.put(`/classes/accomplishments/${accId}`, formDataOrJson, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
  return api.put(`/classes/accomplishments/${accId}`, formDataOrJson);
};

export const deleteAccomplishment = (accId) =>
  api.delete(`/classes/accomplishments/${accId}`);

export const getResumeData = (studentId) =>
  api.get(`/classes/students/${studentId}/resume-data`);


