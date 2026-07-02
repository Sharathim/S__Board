import api from "./axios";

export const getSmtpStatus = () => api.get("/mail/smtp-status");
export const getRecipients = () => api.get("/mail/recipients");
export const sendMail = (data) => api.post("/mail/send", data);
