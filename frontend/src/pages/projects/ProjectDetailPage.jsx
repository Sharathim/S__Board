import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  ArrowLeft, Plus, MoreVertical, CheckCircle, Paperclip, X,
  FolderKanban, Trash2, Edit2, FileText, Image, File,
  Download, ArrowRight, MessageSquare, Send, Smile,
  Clock, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Backend stores UTC datetimes WITHOUT 'Z' suffix.
// Appending 'Z' makes JS parse them as UTC → converts to user's local timezone.
function parseUTCDate(dateStr) {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  return new Date(s.endsWith('Z') ? s : s + 'Z');
}

function getFileExt(name) {
  if (!name) return "";
  return name.split(".").pop().toLowerCase();
}

function AttachmentPill({ url, name, type }) {
  const ext = getFileExt(name);
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
  const isPdf = ext === "pdf";
  const isZip = ext === "zip" || ext === "rar";

  let icon = <File className="w-3.5 h-3.5" />;
  let colorCls = "text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50";
  if (isImage) { icon = <Image className="w-3.5 h-3.5" />; colorCls = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50"; }
  else if (isPdf) { icon = <FileText className="w-3.5 h-3.5" />; colorCls = "text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50"; }
  else if (isZip) { icon = <FolderKanban className="w-3.5 h-3.5" />; colorCls = "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50"; }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${colorCls} hover:opacity-80 transition-opacity max-w-[200px] truncate`}
    >
      {icon}
      <span className="truncate">{name || "Attachment"}</span>
      <Download className="w-3 h-3 shrink-0 opacity-60" />
    </a>
  );
}

function AvatarCircle({ name = "?", picture, size = "md", colorSeed }) {
  const colors = [
    "bg-indigo-600", "bg-rose-600", "bg-violet-600", "bg-emerald-600",
    "bg-amber-600", "bg-cyan-600", "bg-pink-600", "bg-teal-600",
  ];
  const seed = colorSeed || name;
  const colorIdx = seed.charCodeAt(0) % colors.length;
  const sizeMap = { xs: "w-6 h-6 text-[9px]", sm: "w-7 h-7 text-[10px]", md: "w-8 h-8 text-xs", lg: "w-10 h-10 text-sm" };
  const cls = sizeMap[size] || sizeMap.md;
  if (picture) {
    return <img src={picture} alt={name} className={`${cls} rounded-full object-cover ring-2 ring-white/10 shrink-0`} />;
  }
  return (
    <div className={`${cls} ${colors[colorIdx]} rounded-full flex items-center justify-center font-black text-white shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

import { ProjectFormCard } from "./ProjectWorkflowPage";

function RoleBadge({ role }) {
  const map = {
    HOD: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/50",
    FACULTY: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50",
    STUDENT: "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50",
    faculty: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50",
    forum_member: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
    student: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
  };
  const labelMap = {
    HOD: "HOD",
    FACULTY: "Faculty",
    STUDENT: "Student",
    faculty: "Faculty",
    forum_member: "Forum Member",
    student: "Students",
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none ${map[role] || map.STUDENT}`}>
      {labelMap[role] || role}
    </span>
  );
}

const EMOJIS = ["👍", "❤️", "🔥"];

function CommentCard({ comment, projectId, msgId, isStudent, isHOD, currentUserId, onDelete, onReact }) {
  const [showEmojis, setShowEmojis] = useState(false);
  if (comment.is_deleted) return null;
  const reactions = comment.reaction_counts || {};
  const userReactions = comment.user_reactions || [];
  const canDelete = isHOD || comment.author?.id === currentUserId;

  return (
    <div className="flex gap-3 items-start group">
      <AvatarCircle name={comment.author?.name || "?"} picture={comment.author?.profile_picture} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{comment.author?.name || "Unknown"}</span>
          <RoleBadge role={comment.author?.role} />
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            {formatDistanceToNow(parseUTCDate(comment.created_at), { addSuffix: true })}
          </span>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-rose-500 text-slate-400 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850 rounded-xl rounded-tl-none px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-150 dark:border-slate-700/50">
          {comment.content}
        </div>
        {/* Reactions */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {EMOJIS.map(emoji => {
            const count = reactions[emoji] || 0;
            const reacted = userReactions.includes(emoji);
            if (!isStudent && count === 0) return null;
            return (
              <button
                key={emoji}
                onClick={() => isStudent && onReact(comment.id, emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                  reacted
                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400"
                } ${isStudent ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
              >
                {emoji} {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
          {isStudent && (
            <button
              onClick={() => setShowEmojis(p => !p)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          )}
          {showEmojis && (
            <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow-md animate-fade-in">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { onReact(comment.id, e); setShowEmojis(false); }}
                  className="text-base hover:scale-125 transition-transform p-0.5"
                >{e}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressPostCard({
  node, projectId, isStudent, isFaculty, isHOD, currentUserId,
  onEdit, onDelete, onDeleteComment, onReact, onAddComment,
  isOwn, canEdit,
}) {
  const [expanded, setExpanded] = useState(true);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    await onAddComment(node.id, feedbackText.trim());
    setFeedbackText("");
    setSubmittingFeedback(false);
  };

  const comments = node.comments || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <AvatarCircle name={node.author} picture={node.avatar} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{node.author}</span>
            <RoleBadge role={node.role} />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
              {formatDistanceToNow(parseUTCDate(node.dateRaw), { addSuffix: true })}
            </span>
            {node.is_edited && (
              <span className="text-[9px] text-slate-400 italic">(edited)</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{node.dateStr}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOwn && canEdit && (
            <button
              onClick={() => onEdit(node)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {(isOwn || isHOD) && (
            <button
              onClick={() => onDelete(node.id)}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-4">
          {/* Accomplishment content */}
          {node.accomplishment && (
            <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/60 dark:from-indigo-950/20 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {node.accomplishment}
              </p>
            </div>
          )}

          {/* Attachments */}
          {node.attachments && node.attachments.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Attachments ({node.attachments.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {node.attachments.map((att, i) => (
                  <AttachmentPill key={i} url={att.url} name={att.name} type={att.type} />
                ))}
              </div>
            </div>
          )}

          {/* Faculty/HOD Feedback Section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Faculty Feedback {comments.length > 0 && `(${comments.length})`}
              </span>
            </div>

            {comments.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-1">
                {(isFaculty || isHOD) ? "Share your feedback below." : "No feedback yet from faculty."}
              </p>
            )}

            {/* Comment list */}
            <div className="space-y-3">
              {comments.map(comment => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  projectId={projectId}
                  msgId={node.id}
                  isStudent={isStudent}
                  isHOD={isHOD}
                  currentUserId={currentUserId}
                  onDelete={(commentId) => onDeleteComment(node.id, commentId)}
                  onReact={(commentId, emoji) => onReact(node.id, commentId, emoji)}
                />
              ))}
            </div>

            {/* Feedback input — HOD and Faculty only */}
            {(isFaculty || isHOD) && (
              <form onSubmit={handleFeedback} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Write feedback or guidance..."
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-0"
                />
                <button
                  type="submit"
                  disabled={!feedbackText.trim() || submittingFeedback}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all shrink-0 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold hidden sm:inline">Send</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { navigateWithTransition } = usePageTransition();
  const queryClient = useQueryClient();

  const isHOD = user?.role === "HOD";
  const isFaculty = user?.role === "FACULTY";
  const isStudent = user?.role === "STUDENT";

  // UI state
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUpdateId, setSelectedUpdateId] = useState(null);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [viewAllProgress, setViewAllProgress] = useState(false);

  // Edit project fields
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  // Simplified progress form fields (student only)
  const [formAccomplishment, setFormAccomplishment] = useState("");
  const [formFiles, setFormFiles] = useState([]);

  // Fetch
  const { data: project, isLoading } = useQuery({
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
    if (project) {
      setEditProjectName(project.name || "");
      setEditProjectDesc(project.description || "");
    }
  }, [project]);

  useEffect(() => {
    if (editingMsg) {
      // For editing, parse old content format too
      let parsed = {};
      try { parsed = JSON.parse(editingMsg.content); } catch { parsed = {}; }
      setFormAccomplishment(
        parsed.completed_this_week || parsed.accomplishment || parsed.summary ||
        editingMsg.content || ""
      );
    } else {
      setFormAccomplishment("");
    }
    setFormFiles([]);
  }, [editingMsg]);

  useEffect(() => {
    if (!kebabOpen) return;
    const handler = (e) => { if (!e.target.closest(".pm-kebab-container")) setKebabOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [kebabOpen]);

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
      setFormAccomplishment("");
      setFormFiles([]);
      setAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, content }) => editMessage(id, messageId, { content }),
    onSuccess: () => { setEditingMsg(null); setAddModalOpen(false); refetchMessages(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId) => deleteMessage(id, messageId),
    onSuccess: () => { setDeleteTarget(null); refetchMessages(); },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateProjectStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  const editProjectMutation = useMutation({
    mutationFn: (data) => updateProject(id, data),
    onSuccess: () => {
      setEditProjectModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    }
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

  const handleEditProjectSubmit = (e) => {
    e.preventDefault();
    editProjectMutation.mutate({
      name: editProjectName,
      description: editProjectDesc,
      members: project.members.map(m => ({ user_id: m.id, role_in_project: m.role_in_project }))
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formAccomplishment.trim() && formFiles.length === 0) return;

    for (const f of formFiles) {
      if (f.size > 10 * 1024 * 1024) {
        alert(`File "${f.name}" exceeds 10MB limit.`);
        return;
      }
    }

    if (editingMsg) {
      // For edits keep as simple JSON with backward compat
      const contentJson = JSON.stringify({
        completed_this_week: formAccomplishment,
        summary: formAccomplishment,
      });
      editMutation.mutate({ messageId: editingMsg.id, content: contentJson });
    } else {
      const formData = new FormData();
      formData.append("content", formAccomplishment);
      for (const file of formFiles) {
        formData.append("attachments", file);
      }
      sendMutation.mutate(formData);
    }
  };

  // Parse messages into timeline nodes
  const timelineNodes = reversedMessages.filter(msg => !msg.is_deleted).map(msg => {
    let accomplishment = "";
    try {
      const parsed = JSON.parse(msg.content);
      accomplishment = parsed.completed_this_week || parsed.accomplishment || parsed.summary || msg.content || "";
    } catch {
      accomplishment = msg.content || "";
    }

    // Resolve attachments - support both new multi-attachment list and legacy single
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
      accomplishment,
      attachments,
      comments: msg.comments || [],
      is_edited: msg.is_edited,
      isOwn,
      canEdit,
    };
  });

  const currentUpdate = timelineNodes.find(n => n.id === selectedUpdateId) || timelineNodes[0];
  const allMembers = project.members || [];

  // ─── View All Progress ────────────────────────────────────────────────────

  if (viewAllProgress) {
    return (
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 pb-12 space-y-6">
        {/* Header */}
        <div className="pt-2 space-y-1">
          <button
            onClick={() => setViewAllProgress(false)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to progress monitor
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">All Progress Updates</h1>
          <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">Complete history for {project.name}</p>
        </div>

        {timelineNodes.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic text-sm">No progress updates yet.</div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent dark:from-indigo-800 dark:via-indigo-900/40 dark:to-transparent" />
            <div className="space-y-6 pl-12">
              {timelineNodes.map((node, idx) => (
                <div key={node.id} className="relative">
                  {/* Dot */}
                  <div className={`absolute -left-[38px] top-4 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                    idx === 0
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  }`}>
                    {idx === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </div>
                  <ProgressPostCard
                    node={node}
                    projectId={id}
                    isStudent={isStudent}
                    isFaculty={isFaculty}
                    isHOD={isHOD}
                    currentUserId={user?.id}
                    isOwn={node.isOwn}
                    canEdit={node.canEdit}
                    onEdit={(n) => { setEditingMsg({ id: n.id, content: n.accomplishment, created_at: n.dateRaw }); setAddModalOpen(true); }}
                    onDelete={(msgId) => setDeleteTarget(msgId)}
                    onDeleteComment={(msgId, commentId) => deleteCommentMutation.mutate({ msgId, commentId })}
                    onReact={(msgId, commentId, emoji) => reactMutation.mutate({ msgId, commentId, emoji })}
                    onAddComment={(msgId, content) => addCommentMutation.mutateAsync({ msgId, content })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main View ────────────────────────────────────────────────────────────

  const statusColors = {
    COMPLETED: { dot: "bg-emerald-500", text: "text-emerald-400", label: "Completed" },
    IN_PROGRESS: { dot: "bg-indigo-500 animate-pulse", text: "text-indigo-400", label: "In Progress" },
    NOT_STARTED: { dot: "bg-slate-400", text: "text-slate-400", label: "Not Started" },
    ON_HOLD: { dot: "bg-amber-400", text: "text-amber-400", label: "On Hold" },
    REVIEW: { dot: "bg-violet-500", text: "text-violet-400", label: "Review" },
    CANCELLED: { dot: "bg-rose-500", text: "text-rose-400", label: "Cancelled" },
    LOW_ACTIVITY: { dot: "bg-orange-400", text: "text-orange-400", label: "Low Activity" },
  };
  const statusStyle = statusColors[project.status] || statusColors.IN_PROGRESS;

  return (
    <div className="flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden max-w-[1440px] mx-auto px-3 sm:px-5 md:px-8 pb-4 space-y-4">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start shrink-0 gap-3">
        <div className="space-y-0.5 text-left">
          <button
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Progress Monitor</h1>
          <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
            Current state of <span className="font-bold text-slate-700 dark:text-slate-300">{project.name}</span>, at a glance
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 relative pm-kebab-container shrink-0">
          {/* Only students get the Add progress button */}
          {isStudent && (
            <button
              onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
              className="px-4 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Post Progress
            </button>
          )}

          {(isHOD) && (
            <button
              onClick={() => setKebabOpen(!kebabOpen)}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}

          {kebabOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-150 dark:border-slate-800 py-1 z-50 animate-fade-in text-left">
              {project.status !== "COMPLETED" && (
                <button
                  onClick={() => { statusMutation.mutate("COMPLETED"); setKebabOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold transition-colors"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Mark completed
                </button>
              )}
              <button
                onClick={() => { setEditProjectModalOpen(true); setKebabOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop Layout (≥1024px) ── */}
      <div className="hidden lg:grid grid-cols-[300px_1fr] gap-5 flex-1 min-h-0 overflow-hidden">

        {/* Left: Update History Panel */}
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Update History
              </span>
              {timelineNodes.length > 0 && (
                <span className="text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full px-1.5 py-0.5">
                  {timelineNodes.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setViewAllProgress(true)}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto scrollbar-premium ${timelineNodes.length === 0 ? "flex flex-col items-center justify-center" : ""}`}>
            {timelineNodes.length === 0 ? (
              <div className="text-center p-6 space-y-3 max-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 italic leading-relaxed">
                  No progress updates yet.
                </p>
                {isStudent && (
                  <button
                    onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[10.5px] font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all"
                  >
                    + Post Progress
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {timelineNodes.map((node, idx) => {
                  const isActive = currentUpdate?.id === node.id;
                  const isNewest = idx === 0;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedUpdateId(node.id)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-500/20"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-150 dark:hover:border-slate-800"
                      }`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <AvatarCircle name={node.author} picture={node.avatar} size="sm" />
                        {isNewest && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{node.author}</span>
                          <RoleBadge role={node.role} />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{node.dateStr}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                          {node.accomplishment || "No content"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {node.attachments.length > 0 && (
                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                              <Paperclip className="w-2.5 h-2.5" /> {node.attachments.length}
                            </span>
                          )}
                          {node.comments.length > 0 && (
                            <span className="text-[9px] font-bold text-indigo-400 flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5" /> {node.comments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Main Content */}
        <div className="flex flex-col h-full overflow-hidden gap-4">
          {/* Hero Card */}
          <div className="bg-[#080f20] text-white rounded-2xl overflow-hidden shrink-0 relative shadow-xl">
            {/* Subtle glow effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet-600/10 rounded-full blur-3xl" />
            </div>
            <div className="relative flex items-center justify-between px-6 py-5 gap-4">
              <div className="flex items-center gap-5 min-w-0 flex-1">
                {/* Status + Name */}
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight truncate">{project.name}</h2>
                  {project.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-[380px]">
                      {project.description}
                    </p>
                  )}
                  {currentUpdate && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      <span className="text-slate-500">Latest: </span>
                      {currentUpdate.accomplishment}
                    </p>
                  )}
                </div>
              </div>

              {/* Right side: last updated + team */}
              <div className="flex flex-col gap-4 items-end border-l border-slate-800/80 pl-6 shrink-0 min-w-[160px]">
                <div className="text-right w-full">
                  <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block mb-1">Last Updated By</span>
                  {currentUpdate ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <AvatarCircle name={currentUpdate.author} picture={currentUpdate.avatar} size="xs" />
                      <span className="text-xs font-bold text-white truncate max-w-[100px]">{currentUpdate.author}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No updates yet</span>
                  )}
                </div>
                <div className="text-right w-full">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <Users className="w-2.5 h-2.5 text-slate-500" />
                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Team</span>
                  </div>
                  <div className="flex items-center justify-end -space-x-1.5">
                    {allMembers.slice(0, 5).map((m) => (
                      m.profile_picture ? (
                        <img key={m.id} src={m.profile_picture} alt={m.name} title={m.name}
                          className="w-6 h-6 rounded-full ring-2 ring-[#080f20] object-cover" />
                      ) : (
                        <div key={m.id} title={m.name}
                          className={`w-6 h-6 rounded-full ring-2 ring-[#080f20] flex items-center justify-center text-[8px] font-black bg-indigo-600 text-white`}>
                          {(m.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )
                    ))}
                    {allMembers.length > 5 && (
                      <div className="w-6 h-6 rounded-full ring-2 ring-[#080f20] bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-300">
                        +{allMembers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Post Detail */}
          <div className="flex-1 overflow-y-auto scrollbar-premium space-y-4 pr-0.5">
            {timelineNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-indigo-500/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No progress updates yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {isStudent ? "Be the first to post a progress update for this project." : "Students haven't posted any updates yet."}
                  </p>
                </div>
                {isStudent && (
                  <button
                    onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
                  >
                    <span className="flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Post First Update</span>
                  </button>
                )}
              </div>
            ) : currentUpdate ? (
              <ProgressPostCard
                node={currentUpdate}
                projectId={id}
                isStudent={isStudent}
                isFaculty={isFaculty}
                isHOD={isHOD}
                currentUserId={user?.id}
                isOwn={currentUpdate.isOwn}
                canEdit={currentUpdate.canEdit}
                onEdit={(n) => { setEditingMsg({ id: n.id, content: n.accomplishment, created_at: n.dateRaw }); setAddModalOpen(true); }}
                onDelete={(msgId) => setDeleteTarget(msgId)}
                onDeleteComment={(msgId, commentId) => deleteCommentMutation.mutate({ msgId, commentId })}
                onReact={(msgId, commentId, emoji) => reactMutation.mutate({ msgId, commentId, emoji })}
                onAddComment={(msgId, content) => addCommentMutation.mutateAsync({ msgId, content })}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Mobile Layout (<1024px) ── */}
      <div className="flex flex-col lg:hidden space-y-5 overflow-y-auto pb-8">
        {/* Hero Card Mobile */}
        <div className="bg-[#080f20] text-white rounded-2xl overflow-hidden relative shadow-xl">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl" />
          </div>
          <div className="relative p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
                <h2 className="text-base font-black text-white tracking-tight">{project.name}</h2>
              </div>
              {/* Team */}
              <div className="flex items-center -space-x-1.5 shrink-0">
                {allMembers.slice(0, 4).map(m =>
                  m.profile_picture ? (
                    <img key={m.id} src={m.profile_picture} alt={m.name} className="w-6 h-6 rounded-full ring-2 ring-[#080f20] object-cover" />
                  ) : (
                    <div key={m.id} className="w-6 h-6 rounded-full ring-2 ring-[#080f20] bg-indigo-600 flex items-center justify-center text-[8px] font-black text-white">
                      {(m.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )
                )}
              </div>
            </div>
            {currentUpdate && (
              <div className="border-t border-white/10 pt-3">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-1">Latest Update</span>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{currentUpdate.accomplishment}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <AvatarCircle name={currentUpdate.author} picture={currentUpdate.avatar} size="xs" />
                  <span className="text-[10px] font-bold text-slate-400">{currentUpdate.author}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{currentUpdate.dateStr}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Posts */}
        {timelineNodes.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">No progress updates yet.</p>
            {isStudent && (
              <button
                onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >+ Post Progress</button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress Updates ({timelineNodes.length})</span>
              <button onClick={() => setViewAllProgress(true)} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {timelineNodes.slice(0, 3).map(node => (
              <ProgressPostCard
                key={node.id}
                node={node}
                projectId={id}
                isStudent={isStudent}
                isFaculty={isFaculty}
                isHOD={isHOD}
                currentUserId={user?.id}
                isOwn={node.isOwn}
                canEdit={node.canEdit}
                onEdit={(n) => { setEditingMsg({ id: n.id, content: n.accomplishment, created_at: n.dateRaw }); setAddModalOpen(true); }}
                onDelete={(msgId) => setDeleteTarget(msgId)}
                onDeleteComment={(msgId, commentId) => deleteCommentMutation.mutate({ msgId, commentId })}
                onReact={(msgId, commentId, emoji) => reactMutation.mutate({ msgId, commentId, emoji })}
                onAddComment={(msgId, content) => addCommentMutation.mutateAsync({ msgId, content })}
              />
            ))}
            {timelineNodes.length > 3 && (
              <button onClick={() => setViewAllProgress(true)} className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                View {timelineNodes.length - 3} more updates →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Project Modal ── */}
      <Modal open={editProjectModalOpen} onClose={() => setEditProjectModalOpen(false)}>
        <ProjectFormCard
          projectId={id}
          onCancel={() => setEditProjectModalOpen(false)}
          onSuccess={() => setEditProjectModalOpen(false)}
        />
      </Modal>

      {/* ── Post / Edit Progress Modal (Students only) ── */}
      <Modal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setEditingMsg(null); }}
        title={editingMsg ? "Edit Progress Update" : "Post Progress Update"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role info banner for student */}
          {!editingMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                Share what you have completed or worked on. Faculty and HOD will review and provide feedback.
              </p>
            </div>
          )}

          {/* Main textarea */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              What did you complete / accomplish? <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={formAccomplishment}
              onChange={e => setFormAccomplishment(e.target.value)}
              placeholder="Describe what you worked on and completed. Be specific — what features, tasks, or milestones did you finish?"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 leading-relaxed"
              rows={5}
            />
          </div>

          {/* File attachments */}
          {!editingMsg && (
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Attachments <span className="text-slate-400 font-normal">(optional, max 10MB each)</span>
              </label>

              {/* Selected files list */}
              {formFiles.length > 0 && (
                <div className="space-y-1.5">
                  {formFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">{file.name}</span>
                      <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button
                        type="button"
                        onClick={() => setFormFiles(prev => prev.filter((_, j) => j !== i))}
                        className="p-0.5 rounded hover:text-rose-500 text-slate-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <label className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer bg-white dark:bg-slate-800/40 transition-colors text-center">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Click to attach files</span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">PDF, images, documents, ZIP accepted</span>
                </div>
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
              disabled={sendMutation.isPending || editMutation.isPending || (!formAccomplishment.trim() && formFiles.length === 0)}
            >
              {sendMutation.isPending || editMutation.isPending
                ? "Posting..."
                : editingMsg ? "Save Update" : "Post Update"}
            </Button>
          </div>
        </form>
      </Modal>

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
