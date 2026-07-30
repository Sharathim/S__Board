import api from "./axios";

export const getJobRoles = async () => {
  const response = await api.get("/placement/roles");
  return response.data;
};

export const submitResumeScan = async (formData) => {
  const response = await api.post("/placement/scan", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getScanDetail = async (scanId) => {
  const response = await api.get(`/placement/scan/${scanId}`);
  return response.data;
};

export const getLatestScan = async (roleId) => {
  const response = await api.get("/placement/scan/latest", {
    params: roleId ? { role_id: roleId } : {},
  });
  return response.data;
};

export const getStudentScans = async () => {
  const response = await api.get("/placement/scans");
  return response.data;
};

export const getFacultyClassSummary = async (className) => {
  const response = await api.get("/placement/faculty/summary", {
    params: className ? { class_name: className } : {},
  });
  return response.data;
};

export const assignLearningResource = async (data) => {
  const response = await api.post("/placement/faculty/assign", data);
  return response.data;
};

export const getLearningAssignments = async (className) => {
  const response = await api.get("/placement/faculty/assignments", {
    params: className ? { class_name: className } : {},
  });
  return response.data;
};

export const getHODMatrix = async () => {
  const response = await api.get("/placement/hod/matrix");
  return response.data;
};

export const getCompanyCriteria = async () => {
  const response = await api.get("/placement/hod/company-criteria");
  return response.data;
};

export const createCompanyCriteria = async (data) => {
  const response = await api.post("/placement/hod/company-criteria", data);
  return response.data;
};

export const getEligibleStudents = async (criteriaId) => {
  const response = await api.get(`/placement/hod/company-criteria/${criteriaId}/eligible-students`);
  return response.data;
};

export const exportPlacementReport = async () => {
  const response = await api.get("/placement/hod/export", {
    responseType: "blob",
  });
  return response;
};
