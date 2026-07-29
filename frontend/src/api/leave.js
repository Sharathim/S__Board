import api from "./axios";

// ── Faculty endpoints ─────────────────────────────────────────────────────

/** Faculty's own leave history. Optional status filter: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" */
export const getMyLeaves = (status) =>
  api.get("/leave/my", { params: status ? { status } : {} });

/** Faculty's own leave balances for the current academic year. */
export const getMyBalance = () => api.get("/leave/my/balance");

/**
 * Submit a new leave request as multipart/form-data (document attachment optional).
 * @param {FormData} formData
 */
export const submitLeave = (formData) =>
  api.post("/leave/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/** Faculty cancels their own leave (PENDING or APPROVED). */
export const cancelMyLeave = (leaveId) => api.post(`/leave/${leaveId}/cancel`);

// ── HOD endpoints ─────────────────────────────────────────────────────────

/** HOD: all PENDING requests, oldest-first. */
export const getPendingLeaves = () => api.get("/leave/pending");

/**
 * HOD: full filterable department leave list.
 * @param {{ faculty_id?: number, status?: string, from?: string, to?: string }} params
 */
export const getAllLeaves = (params = {}) =>
  api.get("/leave/all", { params });

/** HOD approves a leave. */
export const approveLeave = (leaveId, comment) =>
  api.post(`/leave/${leaveId}/approve`, { comment });

/** HOD rejects a leave. */
export const rejectLeave = (leaveId, comment) =>
  api.post(`/leave/${leaveId}/reject`, { comment });

/**
 * HOD manually grants leave directly (pre-approved).
 * @param {{ faculty_id, leave_type, duration, start_date, end_date, reason, period_numbers? }} data
 */
export const grantLeave = (data) => api.post("/leave/grant", data);

/** HOD: balance grid — all faculty × leave types for current academic year. */
export const getDepartmentOverview = () => api.get("/leave/department-overview");

/** HOD updates entitled limit for a balance row. */
export const updateLeaveBalance = (balanceId, entitled) =>
  api.patch(`/leave/balance/${balanceId}`, { entitled });

/** HOD sets entitled limit for a faculty and leave type. */
export const setFacultyEntitlement = (facultyId, leaveType, entitled) =>
  api.post("/leave/entitlement", { faculty_id: facultyId, leave_type: leaveType, entitled });

/** Get HOD-configured default department leave and permission settings. */
export const getLeaveSettings = () => api.get("/leave/settings");

/** HOD updates default permission hours/quota and leave limits for the department. */
export const updateLeaveSettings = (data) => api.post("/leave/settings", data);

// ── Shared endpoints ──────────────────────────────────────────────────────

/**
 * Monthly calendar of approved leaves.
 * HOD sees all faculty; faculty sees only their own.
 */
export const getLeaveCalendar = (year, month) =>
  api.get("/leave/calendar", { params: { year, month } });

/** Single leave detail — accessible by the leave owner or HOD. */
export const getLeave = (leaveId) => api.get(`/leave/${leaveId}`);
