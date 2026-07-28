import api from "./axios";

// ── Lab Configuration ─────────────────────────────────────────────────────
export const getLabConfig = (className) =>
  api.get(`/timetable/lab-config/${className}`);

export const saveLabConfig = (className, data) =>
  api.post(`/timetable/lab-config/${className}`, data);

export const getAllLabConfigs = () =>
  api.get(`/timetable/lab-config/all`);

// ── Subject-Faculty Mappings ──────────────────────────────────────────────
export const listMappings = (className) =>
  api.get(`/timetable/subject-mappings/${className}`);

export const createMapping = (className, data) =>
  api.post(`/timetable/subject-mappings/${className}`, data);

export const updateMapping = (mappingId, data) =>
  api.patch(`/timetable/subject-mappings/${mappingId}`, data);

export const deleteMapping = (mappingId) =>
  api.delete(`/timetable/subject-mappings/${mappingId}`);

// ── Timetable Grid ────────────────────────────────────────────────────────
export const getTimetable = (className) =>
  api.get(`/timetable/${className}`);

export const clearTimetable = (className) =>
  api.delete(`/timetable/${className}`);

export const generateTimetable = (className) =>
  api.post(`/timetable/${className}/generate`);

export const updateEntry = (className, entryId, data) =>
  api.patch(`/timetable/${className}/entry/${entryId}`, data);

export const cancelEntry = (className, entryId, reason) =>
  api.post(`/timetable/${className}/entry/${entryId}/cancel`, { reason });

export const restoreEntry = (className, entryId) =>
  api.post(`/timetable/${className}/entry/${entryId}/restore`);

// ── Faculty Leave ─────────────────────────────────────────────────────────
export const cancelFacultyDay = (className, facultyId, day, reason) =>
  api.post(`/timetable/${className}/cancel-faculty-day`, {
    faculty_id: facultyId,
    day,
    reason,
  });

export const restoreFacultyDay = (className, facultyId, day) =>
  api.post(`/timetable/${className}/restore-faculty-day`, {
    faculty_id: facultyId,
    day,
  });

// ── Substitutes ───────────────────────────────────────────────────────────
export const findSubstitutes = (day, period) =>
  api.get(`/timetable/substitutes`, { params: { day, period } });

// ── Faculty personal schedule ─────────────────────────────────────────────
export const getFacultyTimetable = (facultyId) =>
  api.get(`/timetable/faculty/${facultyId}`);
