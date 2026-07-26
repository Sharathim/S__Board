import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, getMessages, postMessage, editMessage, deleteMessage,
  updateProjectStatus, updateProject,
  postProgressComment, deleteProgressComment, reactToComment,
} from "../../../api/projects";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../hooks/useSocket";
import { Spinner } from "../../../components/ui/Spinner";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import BottomSheet from "../../layout/BottomSheet";
import { Paperclip, X, File, Download, ExternalLink, Send } from "lucide-react";
import { format } from "date-fns";

import ProgressWorld3D from "../../../components/projects/ProgressWorld3D";

function parseUTCDate(dateStr) {
  if (!dateStr) return new Date();
  try {
    const s = String(dateStr);
    const d = new Date(s.endsWith("Z") ? s : s + "Z");
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

function formatDateSafe(dateStr, formatPattern = "MMM d, yyyy · h:mm a") {
  try {
    const d = parseUTCDate(dateStr);
    return format(d, formatPattern);
  } catch {
    return "Recently";
  }
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

// ─── Mobile Attachment Preview Bottom Sheet ───────────────────────────────────

function AttachmentPreviewSheet({ attachment, onClose }) {
  if (!attachment) return null;
  const ext = getFileExt(attachment.name);
  const isImage = isImageExt(ext);
  const isPdf = isPdfExt(ext);

  return (
    <BottomSheet open={!!attachment} onClose={onClose} title={attachment.name || "Attachment Preview"}>
      <div className="space-y-3 pb-2">
        {isImage && (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-black/5 flex items-center justify-center">
            <img src={attachment.url} alt={attachment.name} className="w-full max-h-[50vh] object-contain" />
          </div>
        )}
        {isPdf && (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 h-[50vh]">
            <iframe src={attachment.url} title={attachment.name} className="w-full h-full border-none" />
          </div>
        )}
        {!isImage && !isPdf && (
          <div className="text-center py-8 space-y-2">
            <File className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{attachment.name}</p>
            <p className="text-xs text-gray-400">{ext.toUpperCase()} file</p>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <a
            href={attachment.url}
            download={attachment.name || true}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-tappable flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download
          </a>
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-tappable flex-1 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Open File
          </a>
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Main Mobile Component ────────────────────────────────────────────────────

export default function MobileProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isHOD = user?.role === "HOD";
  const isFaculty = user?.role === "FACULTY";
  const isStudent = user?.role === "STUDENT";

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Progress form
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formFiles, setFormFiles] = useState([]);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id).then(r => r.data.project),
  });

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
      try { parsed = JSON.parse(editingMsg.content); } catch {}
      setFormText(parsed.completed_this_week || parsed.accomplishment || parsed.summary || editingMsg.content || "");
    } else {
      setFormTitle("");
      setFormText("");
    }
    setFormFiles([]);
  }, [editingMsg]);

  // Socket
  const onNewMessage = useCallback((msg) => {
    queryClient.setQueryData(["messages", id], old => {
      if (!old) return old;
      return { ...old, messages: [...(old.messages || []), msg], total: (old.total || 0) + 1 };
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
      return { ...old, messages: (old.messages || []).map(m => m.id === msgId ? { ...m, is_deleted: true, content: null, sender: null } : m) };
    });
  }, [id, queryClient]);

  useSocket(id, onNewMessage, onMessageUpdated, onMessageDeleted);

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (formData) => postMessage(id, formData),
    onSuccess: () => { refetchMessages(); setFormTitle(""); setFormText(""); setFormFiles([]); setAddSheetOpen(false); queryClient.invalidateQueries({ queryKey: ["project", id] }); },
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, title, content }) => editMessage(id, messageId, { title, content }),
    onSuccess: () => { setEditingMsg(null); setAddSheetOpen(false); refetchMessages(); },
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

  const handleSubmit = () => {
    if (!formText.trim() && formFiles.length === 0 && !formTitle.trim()) return;
    if (editingMsg) {
      editMutation.mutate({ messageId: editingMsg.id, title: formTitle, content: formText });
    } else {
      const formData = new FormData();
      formData.append("title", formTitle);
      formData.append("content", formText);
      for (const file of formFiles) formData.append("attachments", file);
      sendMutation.mutate(formData);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner /></div>;
  if (isError || !project) return <div className="p-8 text-center text-slate-400">Failed to load project details.</div>;

  // Parse messages into timeline nodes
  const timelineNodes = reversedMessages.filter(msg => msg && !msg.is_deleted).map(msg => {
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
    if (msg.attachments?.length > 0) attachments = msg.attachments;
    else if (msg.attachment_url) attachments = [{ url: msg.attachment_url, type: msg.attachment_type, name: msg.attachment_name }];

    return {
      id: msg.id, dateRaw: msg.created_at,
      dateStr: formatDateSafe(msg.created_at),
      author: msg.sender?.name || "Student Member", role: msg.sender?.role || "STUDENT",
      avatar: msg.sender?.profile_picture, title: title || "Progress Milestone", accomplishment, attachments,
      comments: Array.isArray(msg.comments) ? msg.comments : [], is_edited: msg.is_edited,
      isOwn: msg.sender?.id === user?.id, canEdit: msg.can_edit && msg.sender?.id === user?.id,
    };
  });

  return (
    <div className="w-full h-[calc(100vh-60px)] overflow-hidden relative bg-slate-950 mobile-fade-in">
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
        onPostProgress={() => { setAddSheetOpen(true); setEditingMsg(null); }}
        onPreviewAttachment={setPreviewAttachment}
        onAddComment={(msgId, content) => addCommentMutation.mutateAsync({ msgId, content })}
        onDeleteComment={(msgId, commentId) => deleteCommentMutation.mutate({ msgId, commentId })}
        onReact={(msgId, commentId, emoji) => reactMutation.mutate({ msgId, commentId, emoji })}
        onEditProgress={(n) => { setEditingMsg({ id: n.id, title: n.title, content: n.accomplishment, created_at: n.dateRaw }); setAddSheetOpen(true); }}
        onDeleteProgress={(msgId) => setDeleteTarget(msgId)}
      />

      {/* ── Post/Edit Progress Bottom Sheet ── */}
      <BottomSheet open={addSheetOpen} onClose={() => { setAddSheetOpen(false); setEditingMsg(null); }} title={editingMsg ? "Edit Progress" : "Post Progress"}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Completed login module..."
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
            <textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Describe what you accomplished in detail..."
              rows={3}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
          {!editingMsg && (
            <div>
              <input type="file" multiple onChange={(e) => setFormFiles(Array.from(e.target.files))} className="hidden" id="progress-files" />
              <label htmlFor="progress-files" className="mobile-tappable flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-500 cursor-pointer justify-center">
                <Paperclip className="w-4 h-4" />
                Attach Files ({formFiles.length})
              </label>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={sendMutation.isPending || editMutation.isPending || (!formTitle.trim() && !formText.trim() && formFiles.length === 0)}
            className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(sendMutation.isPending || editMutation.isPending) ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {editingMsg ? "Save Changes" : "Post Update"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Attachment Preview Sheet ── */}
      <AttachmentPreviewSheet
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Update"
        message="Are you sure you want to delete this progress update?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}
