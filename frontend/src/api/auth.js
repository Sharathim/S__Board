import api from "./axios";

export const verifyToken = (idToken, inviteToken = null) =>
  api.post("/auth/verify", { idToken, inviteToken });

export const onboardFaculty = (data) =>
  api.post("/auth/onboard/faculty", data);

export const onboardStudent = (data) =>
  api.post("/auth/onboard/student", data);

export const updateFCMToken = (fcmToken) =>
  api.post("/auth/fcm-token", { fcm_token: fcmToken });
