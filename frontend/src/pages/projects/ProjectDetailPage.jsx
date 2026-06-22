import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject, getMessages, postMessage, editMessage, deleteMessage, updateProjectStatus } from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { FileUpload } from "../../components/shared/FileUpload";
import {
  ArrowLeft, Send, Edit2, Trash2, Paperclip, CheckCircle,
  Image, File, Download
} from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const chatRef = useRef(null);
  const [newMsg, setNewMsg] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id).then(r => r.data.project),
  });

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => getMessages(id, { page: 1 }).then(r => r.data),
  });

  // Socket handlers
  const onNewMessage = useCallback((msg) => {
    queryClient.setQueryData(["messages", id], old => {
      if (!old) return old;
      return { ...old, messages: [...(old.messages || []), msg], total: old.total + 1 };
    });
  }, [id, queryClient]);

  const onMessageUpdated = useCallback((msg) => {
    queryClient.setQueryData(["messages", id], old => {
      if (!old) return old;
      return {
        ...old,
        messages: (old.messages || []).map(m => m.id === msg.id ? msg : m)
      };
    });
  }, [id, queryClient]);

  const onMessageDeleted = useCallback(({ id: msgId }) => {
    queryClient.setQueryData(["messages", id], old => {
      if (!old) return old;
      return {
        ...old,
        messages: (old.messages || []).map(m =>
          m.id === msgId ? { ...m, is_deleted: true, content: null, sender: null } : m
        )
      };
    });
  }, [id, queryClient]);

  useSocket(id, onNewMessage, onMessageUpdated, onMessageDeleted);

  const sendMutation = useMutation({
    mutationFn: (formData) => postMessage(id, formData),
    onSuccess: () => {
      refetchMessages();
      setNewMsg("");
      setAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, content }) => editMessage(id, messageId, { content }),
    onSuccess: () => { setEditingId(null); setEditContent(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId) => deleteMessage(id, messageId),
    onSuccess: () => setDeleteTarget(null),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateProjectStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messagesData?.messages]);

  if (isLoading) return <Spinner />;
  if (!project) return null;

  const messages = messagesData?.messages || [];
  const canEdit = (msg) => msg.can_edit && msg.sender?.id === user?.id;

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim() && !attachment) return;
    const formData = new FormData();
    formData.append("content", newMsg.trim());
    if (attachment) formData.append("attachment", attachment);
    sendMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{project.name}</h1>
            {project.description && <p className="text-sm text-gray-500 mb-3">{project.description}</p>}
            <StatusBadge status={project.status} />
            {isHOD && project.status !== "COMPLETED" && (
              <Button
                variant="success"
                size="sm"
                className="mt-3 w-full gap-1"
                onClick={() => statusMutation.mutate("COMPLETED")}
              >
                <CheckCircle className="w-4 h-4" /> Mark as Completed
              </Button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Members</h3>
            <div className="space-y-3">
              {project.members?.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar src={m.profile_picture} name={m.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.name}</p>
                    <Badge variant={m.role_in_project === "faculty" ? "primary" : m.role_in_project === "forum_member" ? "warning" : "default"}>
                      {m.role_in_project?.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Monitor Chat */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col h-[600px]">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Progress Monitor</h2>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender?.id === user?.id ? "flex-row-reverse" : ""}`}>
                  {msg.is_deleted ? (
                    <div className="flex-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 italic text-sm text-gray-400 text-center">
                      This message was deleted
                    </div>
                  ) : (
                    <>
                      <Avatar src={msg.sender?.profile_picture} name={msg.sender?.name} size="sm" className="mt-0.5" />
                      <div className={`max-w-[75%] ${msg.sender?.id === user?.id ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{msg.sender?.name}</span>
                          <Badge variant="default" className="text-[10px]">{msg.sender?.role}</Badge>
                        </div>
                        <div className={`px-4 py-2 rounded-xl ${
                          msg.sender?.id === user?.id
                            ? "bg-primary-600 text-white rounded-br-sm"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                        }`}>
                          {msg.content && <p className="text-sm">{msg.content}</p>}
                          {msg.attachment_url && msg.attachment_type === "image" && (
                            <img src={msg.attachment_url} alt="attachment" className="mt-2 rounded-lg max-h-60 object-cover" />
                          )}
                          {msg.attachment_url && msg.attachment_type !== "image" && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 mt-2 text-sm underline">
                              <File className="w-4 h-4" /> {msg.attachment_name || "Download"}
                            </a>
                          )}
                          {msg.is_edited && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">{format(new Date(msg.created_at), "h:mm a")}</span>
                          {canEdit(msg) && (
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                                className="text-gray-400 hover:text-primary-600">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => setDeleteTarget(msg.id)}
                                className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Edit mode */}
            {editingId && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/10">
                <div className="flex items-center gap-2">
                  <input
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                  <Button size="sm" onClick={() => editMutation.mutate({ messageId: editingId, content: editContent })}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-700">
              {attachment && (
                <div className="mb-2 text-sm text-gray-500 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> {attachment.name}
                  <button type="button" onClick={() => setAttachment(null)} className="text-red-500">Remove</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <Paperclip className="w-5 h-5 text-gray-400" />
                  <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={e => setAttachment(e.target.files[0])} />
                </label>
                <input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800"
                />
                <Button type="submit" disabled={!newMsg.trim() && !attachment} className="gap-1">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Message"
        message="Are you sure you want to delete this message?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}
