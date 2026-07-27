import api from "./axios";

// ─── Faculty Notes Hub ────────────────────────────────────────────────────
/**
 * Fetch all subjects grouped by class → academic_year → semester.
 * Only for FACULTY role. Powers the standalone /notes page.
 */
export const getFacultyNotesHub = (params = {}) =>
  api.get("/notes/faculty/my-classes-subjects", { params });

// ─── Subjects ─────────────────────────────────────────────────────────────
export const listSubjects = (className, params = {}) =>
  api.get(`/classes/${className}/notes/subjects`, { params });

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

// ─── Units ────────────────────────────────────────────────────────────────
export const listUnits = (className, subjectId) =>
  api.get(`/classes/${className}/notes/subjects/${subjectId}/units`);

export const createUnit = (className, subjectId, data) =>
  api.post(`/classes/${className}/notes/subjects/${subjectId}/units`, data);

export const editUnit = (className, subjectId, unitId, data) =>
  api.patch(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}`, data);

export const deleteUnit = (className, subjectId, unitId) =>
  api.delete(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}`);

// ─── Files ────────────────────────────────────────────────────────────────
export const uploadFiles = (className, subjectId, unitId, formData, onProgress) =>
  api.post(
    `/classes/${className}/notes/subjects/${subjectId}/units/${unitId}/files`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
      timeout: 120000, // 2 min for large files
    }
  );

export const deleteFile = (className, subjectId, unitId, fileId) =>
  api.delete(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}/files/${fileId}`);

// ─── Logs ─────────────────────────────────────────────────────────────────
export const getNotesLogs = (className, page = 1) =>
  api.get(`/classes/${className}/notes/logs`, { params: { page } });

// ─── Unified Notes & Docs API Helpers ─────────────────────────────────────
export const getNotesClasses = () => api.get("/notes/classes");

export const getNotesTree = (className) => api.get(`/notes/class/${className}/tree`);

export const uploadNotesUnified = (formData, onProgress) =>
  api.post("/notes/upload-notes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
    timeout: 180000, // 3 mins timeout
  });

export const deleteSubjectDirect = (subjectId) => api.delete(`/notes/subjects/${subjectId}`);

export const deleteUnitDirect = (unitId) => api.delete(`/notes/units/${unitId}`);

export const deleteFileDirect = (fileId) => api.delete(`/notes/files/${fileId}`);

