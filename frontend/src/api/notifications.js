import api from "./axios";

export const listNotifications = (params) => api.get("/notifications/", { params });
export const markAllRead = () => api.post("/notifications/read-all");
export const markRead = (id) => api.patch(`/notifications/${id}/read`);
export const getUnreadCount = () => api.get("/notifications/unread-count");
