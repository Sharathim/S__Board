import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket(projectId, onNewMessage, onMessageUpdated, onMessageDeleted) {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    if (projectId) {
      socketRef.current.emit("join_project", { project_id: projectId });
    }

    return () => {
      if (projectId) {
        socketRef.current.emit("leave_project", { project_id: projectId });
      }
      socketRef.current.disconnect();
    };
  }, [projectId]);

  useEffect(() => {
    if (!socketRef.current || !projectId) return;

    socketRef.current.on(`new_message_${projectId}`, onNewMessage);
    socketRef.current.on(`message_updated_${projectId}`, onMessageUpdated);
    socketRef.current.on(`message_deleted_${projectId}`, onMessageDeleted);

    return () => {
      socketRef.current.off(`new_message_${projectId}`);
      socketRef.current.off(`message_updated_${projectId}`);
      socketRef.current.off(`message_deleted_${projectId}`);
    };
  }, [projectId, onNewMessage, onMessageUpdated, onMessageDeleted]);

  return socketRef;
}
