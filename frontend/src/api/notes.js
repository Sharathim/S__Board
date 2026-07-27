import api from "./axios";

// ─── All Notes (role-aware) ───────────────────────────────────────────────
/**
 * Fetch all notes organized by class → subject → unit → files.
 * Backend returns data based on the user's role:
 * - Faculty: subjects they created across their handled classes
 * - HOD: everything across all classes
 * - Student: all subjects for their class
 */
export const getAllNotes = () => api.get("/classes/notes/all");

// ─── Faculty Notes Hub ────────────────────────────────────────────────────
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
