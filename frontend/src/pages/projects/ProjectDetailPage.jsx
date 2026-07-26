import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, getMessages, postMessage, editMessage, deleteMessage,
  updateProjectStatus, updateProject,
  postProgressComment, deleteProgressComment, reactToComment,
} from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { usePageTransition } from "../../context/TransitionContext";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Paperclip, X, FileText, File, Image, Download, ExternalLink, Plus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import ProgressWorld3D from "../../components/projects/ProgressWorld3D";
import { ProjectFormCard } from "./ProjectWorkflowPage";

function parseUTCDate(dateStr) {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  return new Date(s.endsWith('Z') ? s : s + 'Z');
}

function getFileExt(name) {
  if (!name) return "";
  return name.split(".").pop().toLowerCase();
}

function isImageExt(ext) {
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext);
}

function isPdfExt(ext) {
  return ext === "pdf";
}

// ─── Attachment Preview Modal ─────────────────────────────────────────────────

function AttachmentPreviewModal({ attachment, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handleEsc); document.body.style.overflow = ""; };
  }, [onClose]);

  if (!attachment) return null;
  const ext = getFileExt(attachment.name);
  const isImage = isImageExt(ext);
  const isPdf = isPdfExt(ext);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <Paperclip className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm font-bold truncate">{attachment.name || "Attachment Preview"}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={attachment.url}
              download={attachment.name || true}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content viewer */}
        <div className="p-4 flex items-center justify-center min-h-[350px] max-h-[75vh] overflow-auto bg-slate-950">
          {isImage && (
            <img src={attachment.url} alt={attachment.name || "Preview"} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
          )}
          {isPdf && (
            <iframe src={attachment.url} title={attachment.name || "PDF Preview"} className="w-full h-[70vh] border-none rounded-xl" />
          )}
          {!isImage && !isPdf && (
            <div className="py-12 px-8 text-center space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center mx-auto text-indigo-400">
                <File className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-white">{attachment.name || "File"}</p>
              <p className="text-xs text-slate-400">Direct preview is not supported for this file type in browser.</p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Desktop Component ───────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHOD = user?.role === "HOD";
  const isFaculty = user?.role === "FACULTY";
  const isStudent = user?.role === "STUDENT";

  // UI state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formAccomplishment, setFormAccomplishment] = useState("");
  const [formFiles, setFormFiles] = useState([]);

  // Fetch project
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id).then(r => r.data.project),
  });

  // Fetch messages
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => getMessages(id, { page: 1 }).then(r => r.data),
  });

  const messages = messagesData?.messages || [];
  const reversedMessages = [...messages].reverse();

  useEffect(() => {
    if (editingMsg) {
      setFormTitle(editingMsg.title || "");
      let parsed = {};
      try { parsed = JSON.parse(editingMsg.content); } catch { parsed = {}; }
      setFormAccomplishment(
        parsed.completed_this_week || parsed.accomplishment || parsed.summary ||
        editingMsg.content || ""
      );
    } else {
      setFormTitle("");
      setFormAccomplishment("");
    }
    setFormFiles([]);
  }, [editingMsg]);

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
      return { ...old, messages: (old.messages || []).map(m => m.id === msg.id ? msg : m) };
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

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (formData) => postMessage(id, formData),
    onSuccess: () => {
      refetchMessages();
      setFormTitle("");
      setFormAccomplishment("");
      setFormFiles([]);
      setAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, title, content }) => editMessage(id, messageId, { title, content }),
    onSuccess: () => { setEditingMsg(null); setAddModalOpen(false); refetchMessages(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId) => deleteMessage(id, messageId),
    onSuccess: () => { setDeleteTarget(null); refetchMessages(); },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ msgId, content }) => postProgressComment(id, msgId, { content }),
    onSuccess: () => refetchMessages(),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ msgId, commentId }) => deleteProgressComment(id, msgId, commentId),
    onSuccess: () => refetchMessages(),
  });

  const reactMutation = useMutation({
    mutationFn: ({ msgId, commentId, emoji }) => reactToComment(id, msgId, commentId, emoji),
    onSuccess: () => refetchMessages(),
  });

  if (isLoading) return <Spinner />;
  if (!project) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formTitle.trim() && !formAccomplishment.trim() && formFiles.length === 0) return;

    for (const f of formFiles) {
      if (f.size > 10 * 1024 * 1024) {
        alert(`File "${f.name}" exceeds 10MB limit.`);
        return;
      }
    }

    if (editingMsg) {
      editMutation.mutate({
        messageId: editingMsg.id,
        title: formTitle,
        content: formAccomplishment,
      });
    } else {
      const formData = new FormData();
      formData.append("title", formTitle);
      formData.append("content", formAccomplishment);
      for (const file of formFiles) {
        formData.append("attachments", file);
      }
      sendMutation.mutate(formData);
    }
  };

  // Parse messages into timeline nodes
  const timelineNodes = reversedMessages.filter(msg => !msg.is_deleted).map(msg => {
    let title = msg.title || "";
    let accomplishment = "";
    try {
      const parsed = JSON.parse(msg.content);
      accomplishment = parsed.completed_this_week || parsed.accomplishment || parsed.summary || msg.content || "";
      if (!title && parsed.title) title = parsed.title;
    } catch {
      accomplishment = msg.content || "";
    }

    if (!title && accomplishment) {
      const firstLine = accomplishment.split('\n')[0];
      title = firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine;
    }

    let attachments = [];
    if (msg.attachments && msg.attachments.length > 0) {
      attachments = msg.attachments;
    } else if (msg.attachment_url) {
      attachments = [{ url: msg.attachment_url, type: msg.attachment_type, name: msg.attachment_name }];
    }

    const isOwn = msg.sender?.id === user?.id;
    const canEdit = msg.can_edit && isOwn;

    return {
      id: msg.id,
      dateRaw: msg.created_at,
      dateStr: format(parseUTCDate(msg.created_at), "MMM d, yyyy · h:mm a"),
      author: msg.sender?.name || "Unknown",
      role: msg.sender?.role || "STUDENT",
      avatar: msg.sender?.profile_picture,
      title,
      accomplishment,
      attachments,
      comments: msg.comments || [],
      is_edited: msg.is_edited,
      isOwn,
      canEdit,
    };
  });

  return (
    <div className="w-full h-[calc(100vh-80px)] overflow-hidden relative bg-slate-950">
      {/* ── 3D Interactive World Scene ── */}
      <ProgressWorld3D
        project={project}
        timelineNodes={timelineNodes}
        selectedIndex={selectedIndex}
        onSelectCheckpoint={(idx) => setSelectedIndex(idx)}
        isStudent={isStudent}
        isFaculty={isFaculty}
        isHOD={isHOD}
        currentUserId={user?.id}
        onPostProgress={() => { setAddModalOpen(true); setEditingMsg(null); }}
        onPreviewAttachment={setPreviewAttachment}
        onAddComment={(msgId, content) => addCommentMutation.mutateAsync({ msgId, content })}
        onDeleteComment={(msgId, commentId) => deleteCommentMutation.mutate({ msgId, commentId })}
        onReact={(msgId, commentId, emoji) => reactMutation.mutate({ msgId, commentId, emoji })}
        onEditProgress={(n) => { setEditingMsg({ id: n.id, title: n.title, content: n.accomplishment, created_at: n.dateRaw }); setAddModalOpen(true); }}
        onDeleteProgress={(msgId) => setDeleteTarget(msgId)}
      />

      {/* ── Post / Edit Progress Modal ── */}
      <Modal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setEditingMsg(null); }}
        title={editingMsg ? "Edit Progress Update" : "Post Progress Update"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Progress Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Completed Database Schemas..."
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={formAccomplishment}
              onChange={e => setFormAccomplishment(e.target.value)}
              placeholder="Describe what you accomplished in detail..."
              className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 leading-relaxed"
              rows={4}
            />
          </div>

          {!editingMsg && (
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Attachments <span className="text-slate-500 font-normal">(optional, max 10MB each)</span>
              </label>

              {formFiles.length > 0 && (
                <div className="space-y-1.5">
                  {formFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-200 truncate flex-1">{file.name}</span>
                      <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button
                        type="button"
                        onClick={() => setFormFiles(prev => prev.filter((_, j) => j !== i))}
                        className="p-0.5 rounded hover:text-rose-400 text-slate-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 cursor-pointer bg-slate-800/40 transition-colors text-center">
                <Paperclip className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Click to attach files</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const valid = files.filter(f => {
                      if (f.size > 10 * 1024 * 1024) { alert(`"${f.name}" exceeds 10MB`); return false; }
                      return true;
                    });
                    setFormFiles(prev => [...prev, ...valid]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <Button type="button" variant="ghost" onClick={() => { setAddModalOpen(false); setEditingMsg(null); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendMutation.isPending || editMutation.isPending || (!formTitle.trim() && !formAccomplishment.trim() && formFiles.length === 0)}
            >
              {sendMutation.isPending || editMutation.isPending ? "Posting..." : editingMsg ? "Save Update" : "Post Update"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Attachment Preview Overlay Modal ── */}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Progress Update"
        message="Are you sure you want to delete this progress update? This cannot be undone."
        confirmText="Delete"
        danger
      />
    </div>
  );
}
