import api from "./axios";

// ─── Notes Hub ────────────────────────────────────────────────────────────
/**
 * Fetch all subjects grouped by class → academic_year → semester.
 * Works for FACULTY, HOD, and STUDENT roles.
 */
export const getNotesHub = (params = {}) =>
  api.get("/notes/my-classes-subjects", { params });

export const getFacultyNotesHub = (params = {}) =>
  api.get("/notes/my-classes-subjects", { params });

/**
 * Fetch distinct subject names existing in a given class for upload dropdown.
 */
export const getSubjectNames = (className) =>
  api.get(`/notes/classes/${className}/subject-names`);

/**
 * Batch upload notes (class_name, subject_name, unit_name, files).
 */
export const uploadNotesBatch = (formData, onProgress) =>
  api.post("/notes/upload-notes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
    timeout: 120000,
  });

// ─── Legacy Subjects / Units / Files Endpoints ────────────────────────────
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
      timeout: 120000,
    }
  );

export const deleteFile = (className, subjectId, unitId, fileId) =>
  api.delete(`/classes/${className}/notes/subjects/${subjectId}/units/${unitId}/files/${fileId}`);

// ─── Logs ─────────────────────────────────────────────────────────────────
export const getNotesLogs = (className, page = 1) =>
  api.get(`/classes/${className}/notes/logs`, { params: { page } });
