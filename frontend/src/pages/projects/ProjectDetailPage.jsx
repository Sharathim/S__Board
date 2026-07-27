import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
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
  Download, MessageSquare, Send, Smile,
  Clock, Users, ChevronDown, ChevronUp, Eye, Map,
  ExternalLink, Layers, Check, Lock, ChevronRight, ChevronLeft, Flag,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { ProjectFormCard } from "./ProjectWorkflowPage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Shared Sub-components ────────────────────────────────────────────────────

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

function MemberAvatarWithTooltip({ member, size = "xs" }) {
  const [isHovered, setIsHovered] = useState(false);
  const name = member?.name || member?.user?.name || "Member";
  const picture = member?.profile_picture || member?.user?.profile_picture;
  const role = member?.role_in_project || member?.role || member?.user?.role || "STUDENT";
  const email = member?.email || member?.user?.email || "";

  return (
    <div
      className="relative flex items-center shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AvatarCircle name={name} picture={picture} size={size} />

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-48 p-3 rounded-2xl bg-slate-900 text-white shadow-2xl ring-1 ring-slate-700/60 z-50 pointer-events-none text-center space-y-1.5"
          >
            {/* Top Caret Arrow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900 rotate-45 border-t border-l border-slate-700/60" />

            <div className="flex justify-center relative z-10">
              <AvatarCircle name={name} picture={picture} size="sm" />
            </div>
            <p className="text-xs font-black truncate text-white leading-tight relative z-10">{name}</p>
            <div className="relative z-10">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {role === "faculty" ? "FACULTY" : role}
              </span>
            </div>
            {email && <p className="text-[10px] text-slate-400 truncate pt-0.5 relative z-10">{email}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    HOD: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
    FACULTY: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
    STUDENT: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60",
    faculty: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
    forum_member: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    student: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
  };
  const labelMap = {
    HOD: "HOD",
    FACULTY: "Faculty",
    STUDENT: "Student",
    faculty: "Faculty",
    forum_member: "Forum Member",
    student: "Student",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border leading-none ${map[role] || map.STUDENT}`}>
      {labelMap[role] || role}
    </span>
  );
}

const EMOJIS = ["👍", "❤️", "🔥"];

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
    <div className="pm-preview-overlay" onClick={onClose}>
      <div className="pm-preview-content relative" onClick={(e) => e.stopPropagation()}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
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
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content viewer */}
        <div className="p-4 flex items-center justify-center min-h-[300px] max-h-[80vh] overflow-auto bg-slate-950/80">
          {isImage && (
            <img src={attachment.url} alt={attachment.name || "Preview"} className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" />
          )}
          {isPdf && (
            <iframe src={attachment.url} title={attachment.name || "PDF Preview"} className="w-[80vw] h-[75vh] border-none rounded-lg" />
          )}
          {!isImage && !isPdf && (
            <div className="py-12 px-8 text-center space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-indigo-900/30 border border-indigo-700/50 flex items-center justify-center mx-auto text-indigo-400">
                <File className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-white">{attachment.name || "File"}</p>
              <p className="text-xs text-slate-400">Direct preview is not available for this file type in browser.</p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
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

// ─── Attachments List with Eye & Download Icons ───────────────────────────────

function AttachmentList({ attachments, onPreview }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
        Attachments ({attachments.length})
      </span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {attachments.map((att, i) => {
          const ext = getFileExt(att.name);
          const isImg = isImageExt(ext);
          const isPdf = isPdfExt(ext);

          let icon = <File className="w-4 h-4 text-blue-500" />;
          if (isImg) icon = <Image className="w-4 h-4 text-emerald-500" />;
          else if (isPdf) icon = <FileText className="w-4 h-4 text-rose-500" />;

          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0 shadow-2xs">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                    {att.name || "Attachment"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{ext || "file"}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Eye Icon for Preview */}
                <button
                  type="button"
                  onClick={() => onPreview(att)}
                  title="Preview Attachment"
                  className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {/* Download Icon */}
                <a
                  href={att.url}
                  download={att.name || true}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download File"
                  className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Comment Card ─────────────────────────────────────────────────────────────

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
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl rounded-tl-none px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200/50 dark:border-slate-700/50">
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
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${reacted
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

// ─── Progress Post Item (Executive Modern Card Design) ──────────────────────────

function ProgressPostItem({
  node, projectId, isStudent, isFaculty, isHOD, currentUserId,
  onEdit, onDelete, onDeleteComment, onReact, onAddComment, onPreviewAttachment,
  isOwn, canEdit, isLatest,
}) {
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [isExpandingComposer, setIsExpandingComposer] = useState(false);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    await onAddComment(node.id, feedbackText.trim());
    setFeedbackText("");
    setSubmittingFeedback(false);
    setIsExpandingComposer(false);
  };

  const comments = node.comments || [];

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
      {/* Top Author & Status Row */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <AvatarCircle name={node.author} picture={node.avatar} size="lg" />
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">{node.author}</span>
              <RoleBadge role={node.role} />
              {isLatest && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  Latest Update
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {node.dateStr}
              {node.is_edited && <span className="italic ml-1.5 text-slate-400">(edited)</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwn && canEdit && (
            <button
              onClick={() => onEdit(node)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all active:scale-95"
              title="Edit progress update"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {(isOwn || isHOD) && (
            <button
              onClick={() => onDelete(node.id)}
              className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition-all active:scale-95"
              title="Delete progress update"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Title & Percentage */}
      <div className="space-y-2">
        {node.title && (
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug tracking-tight">
            {node.title}
          </h3>
        )}

        {node.percentage !== undefined && node.percentage > 0 && (
          <div className="flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-2.5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 max-w-md">
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 shrink-0">{node.percentage}% Done</span>
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${node.percentage}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Progress Description / Details */}
      {node.accomplishment && (
        <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
          {node.accomplishment}
        </div>
      )}

      {/* Attachments List */}
      <AttachmentList attachments={node.attachments} onPreview={onPreviewAttachment} />

      {/* Faculty Feedback Section */}
      <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
              Faculty Feedback & Review
            </span>
            {comments.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                {comments.length}
              </span>
            )}
          </div>

          {(isFaculty || isHOD) && (
            <button
              type="button"
              onClick={() => setIsExpandingComposer(prev => !prev)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${isExpandingComposer
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 active:scale-95 shadow-indigo-500/20"
                }`}
            >
              {isExpandingComposer ? (
                <>
                  <X className="w-3.5 h-3.5" /> Close Composer
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Add Feedback
                </>
              )}
            </button>
          )}
        </div>

        {/* Expandable Composer Box */}
        <AnimatePresence>
          {isExpandingComposer && (
            <motion.form
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onSubmit={handleFeedbackSubmit}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Writing Official Faculty Review
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="font-medium">Quick tags:</span>
                    {["Approved 👍", "Needs Revision ⚠️", "Great Progress 🚀"].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setFeedbackText(prev => prev ? `${prev} ${tag}` : tag)}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-600 text-[10px] font-medium transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide constructive guidance, review notes, or action items for the student team..."
                  rows={3}
                  autoFocus
                  className="w-full p-3.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none leading-relaxed transition-all"
                />

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] font-medium text-slate-400">
                    Feedback will be visible to all project members.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setFeedbackText(""); setIsExpandingComposer(false); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!feedbackText.trim() || submittingFeedback}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white disabled:opacity-40 transition-all text-xs font-bold shadow-sm shadow-indigo-500/30 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingFeedback ? "Posting..." : "Post Feedback"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Empty state when no feedback and composer is collapsed */}
        {comments.length === 0 && !isExpandingComposer && (
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {(isFaculty || isHOD)
                ? "No faculty feedback has been added for this progress update yet."
                : "No faculty feedback added yet."}
            </p>
            {(isFaculty || isHOD) && (
              <button
                type="button"
                onClick={() => setIsExpandingComposer(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Feedback
              </button>
            )}
          </div>
        )}

        {/* Comment list */}
        {comments.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

// ─── Roadmap View (Game-Style Island Path) ────────────────────────────────────

const ISLAND_MIN_SLOTS = 5;

function IslandNode({ node, index, isCompleted, isActive, onClick, onHoverChange }) {
  return (
    <button
      type="button"
      onClick={() => isCompleted && onClick(node)}
      onMouseEnter={() => isCompleted && onHoverChange(node.id)}
      onMouseLeave={() => isCompleted && onHoverChange(null)}
      disabled={!isCompleted}
      className={`group relative flex flex-col items-center shrink-0 focus:outline-none ${isCompleted ? "cursor-pointer" : "cursor-not-allowed"}`}
      style={{ width: 176 }}
    >
      {/* Number badge */}
      <span
        className={`mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-sm border transition-colors ${isCompleted
          ? isActive
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
          }`}
      >
        {index + 1}
        {isCompleted && <span className="uppercase tracking-wider">{isActive ? "Viewing" : "Completed"}</span>}
      </span>

      {/* Island illustration */}
      <div
        className={`relative w-44 h-44 flex items-center justify-center transition-transform duration-300 ${isCompleted ? "group-hover:-translate-y-2 group-active:translate-y-0" : ""
          }`}
      >
        {isCompleted && (
          <span className={`absolute inset-0 rounded-full bg-emerald-500 blur-2xl scale-75 transition-opacity duration-300 ${isActive ? "opacity-40" : "opacity-20"}`} />
        )}
        <img
          src="/island.png"
          alt={isCompleted ? node.title || "Completed milestone" : "Locked milestone"}
          draggable={false}
          className={`relative w-full h-full object-contain select-none transition-all duration-300 ${isCompleted ? "drop-shadow-lg" : "grayscale contrast-75 brightness-95"
            }`}
        />
        {!isCompleted && (
          <>
            {/* Solid cap over the flag/checkmark so locked islands read as plain stone */}
            <span className="absolute top-[18%] w-20 h-20 rounded-full bg-slate-300/90 dark:bg-slate-700/90 backdrop-blur-[1px]" />
            <span className="absolute top-[18%] w-14 h-14 rounded-full bg-slate-500/90 dark:bg-slate-800/90 flex items-center justify-center shadow-md ring-4 ring-white/60 dark:ring-slate-900/60">
              <Lock className="w-6 h-6 text-slate-100" />
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function MilestoneDetailCard({ node }) {
  if (!node) return null;
  return (
    <div className="w-full max-w-sm p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-900/5 space-y-1.5">
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        {format(parseUTCDate(node.dateRaw), "MMM d, h:mm a")}
      </p>
      {node.title && (
        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{node.title}</h4>
      )}
      {node.accomplishment && (
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
          {node.accomplishment}
        </p>
      )}
      <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        <Users className="w-3.5 h-3.5" />
        {(node.comments || []).length} Update{(node.comments || []).length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function RoadmapView({ timelineNodes, onSelectMilestone, selectedId }) {
  const scrollRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  // timelineNodes is newest-first; the roadmap must read oldest -> newest (island 1 = first milestone achieved).
  const chronological = [...timelineNodes].reverse();
  const slots = chronological;
  const latestNode = chronological[chronological.length - 1];
  // Hovering always wins; otherwise fall back to the latest milestone (never "stuck" on an old click).
  const activeNode = (hoveredId ? chronological.find((n) => n.id === hoveredId) : null) || latestNode;
  const activeIslandIndex = slots.findIndex((n) => n && n.id === activeNode?.id);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  if (timelineNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-500">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Everything Is Locked</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs">
            Post your first progress update to unlock the first island on this project's roadmap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      <div className="px-1">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Project Roadmap</h3>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track the journey of this project</p>
      </div>

      {/* Island path */}
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 p-10 pb-8 overflow-hidden">
        {/* Decorative background clouds */}
        <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20">
          <div className="absolute top-8 left-20 w-20 h-7 rounded-full bg-white dark:bg-slate-700 blur-sm" />
          <div className="absolute bottom-16 right-28 w-24 h-8 rounded-full bg-white dark:bg-slate-700 blur-sm" />
        </div>

        {/* Nav arrows */}
        {slots.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="absolute right-4 top-24 z-10 w-11 h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all"
              aria-label="Scroll roadmap forward"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="absolute left-4 top-24 z-10 w-11 h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all"
              aria-label="Scroll roadmap backward"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="relative flex items-start gap-1 overflow-x-auto scrollbar-premium scroll-smooth px-6 py-2"
          onMouseLeave={() => setHoveredId(null)}
        >
          {slots.map((node, idx) => {
            const isCompleted = !!node;
            const isActive = isCompleted && node.id === activeNode?.id;
            return (
              <div key={node ? node.id : `locked-${idx}`} className="flex items-start shrink-0">
                <IslandNode
                  node={node}
                  index={idx}
                  isCompleted={isCompleted}
                  isActive={isActive}
                  onClick={onSelectMilestone}
                  onHoverChange={setHoveredId}
                />
                {idx < slots.length - 1 && (
                  <div className="flex items-center h-44 -mx-1">
                    <svg width="64" height="16" viewBox="0 0 64 16" className="text-slate-300 dark:text-slate-700">
                      <line x1="2" y1="8" x2="62" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
                      <circle cx="22" cy="8" r="2.5" fill="currentColor" />
                      <circle cx="42" cy="8" r="2.5" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail card for the hovered milestone (falls back to the latest) — visually tethered to its island */}
        {activeNode && activeIslandIndex >= 0 && (
          <div
            className="relative mt-1 transition-all duration-200"
            style={{ marginLeft: activeIslandIndex * 180 + 24 }}
          >
            <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-700 ml-6" />
            <MilestoneDetailCard node={activeNode} />
          </div>
        )}
      </div>
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
  const [kebabOpen, setKebabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stream"); // "stream" | "roadmap"
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);

  // Edit project fields
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  // Progress form fields (student only)
  const [formTitle, setFormTitle] = useState("");
  const [formAccomplishment, setFormAccomplishment] = useState("");
  const [formFiles, setFormFiles] = useState([]);
  const [formPercentage, setFormPercentage] = useState(0);

  // Fetch data
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
      setFormTitle(editingMsg.title || "");
      let parsed = {};
      try { parsed = JSON.parse(editingMsg.content); } catch { parsed = {}; }
      setFormAccomplishment(
        parsed.accomplishment || parsed.completed_this_week || parsed.summary ||
        editingMsg.content || ""
      );
      setFormPercentage(parsed.percentage || 0);
    } else {
      setFormTitle("");
      setFormAccomplishment("");
      setFormPercentage(0);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formTitle.trim() && !formAccomplishment.trim() && formFiles.length === 0) return;

    for (const f of formFiles) {
      if (f.size > 10 * 1024 * 1024) {
        alert(`File "${f.name}" exceeds 10MB limit.`);
        return;
      }
    }

    const contentPayload = JSON.stringify({
      accomplishment: formAccomplishment,
      percentage: Number(formPercentage)
    });

    if (editingMsg) {
      editMutation.mutate({
        messageId: editingMsg.id,
        title: formTitle,
        content: contentPayload,
      });
    } else {
      const formData = new FormData();
      formData.append("title", formTitle);
      formData.append("content", contentPayload);
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
    let percentage = 0;
    try {
      const parsed = JSON.parse(msg.content);
      accomplishment = parsed.accomplishment || parsed.completed_this_week || parsed.summary || msg.content || "";
      if (!title && parsed.title) title = parsed.title;
      percentage = parsed.percentage || 0;
    } catch {
      accomplishment = msg.content || "";
      percentage = 0;
    }

    if (!title && accomplishment) {
      const firstLine = accomplishment.split('\n')[0];
      title = firstLine.length > 80 ? firstLine.substring(0, 77) + "..." : firstLine;
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
      percentage,
    };
  });

  const allMembers = project.members || [];

  const statusColors = {
    COMPLETED: { dot: "bg-emerald-500", text: "text-emerald-500 dark:text-emerald-400", label: "Completed" },
    IN_PROGRESS: { dot: "bg-indigo-500 animate-pulse", text: "text-indigo-500 dark:text-indigo-400", label: "In Progress" },
    NOT_STARTED: { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400", label: "Not Started" },
    ON_HOLD: { dot: "bg-amber-400", text: "text-amber-500 dark:text-amber-400", label: "On Hold" },
    REVIEW: { dot: "bg-violet-500", text: "text-violet-500 dark:text-violet-400", label: "Review" },
    CANCELLED: { dot: "bg-rose-500", text: "text-rose-500 dark:text-rose-400", label: "Cancelled" },
    LOW_ACTIVITY: { dot: "bg-orange-400", text: "text-orange-500 dark:text-orange-400", label: "Low Activity" },
  };
  const statusStyle = statusColors[project.status] || statusColors.IN_PROGRESS;

  const progressHandlers = {
    onEdit: (n) => { setEditingMsg({ id: n.id, title: n.title, content: n.accomplishment, created_at: n.dateRaw }); setAddModalOpen(true); },
    onDelete: (msgId) => setDeleteTarget(msgId),
    onDeleteComment: (msgId, commentId) => deleteCommentMutation.mutate({ msgId, commentId }),
    onReact: (msgId, commentId, emoji) => reactMutation.mutate({ msgId, commentId, emoji }),
    onAddComment: (msgId, content) => addCommentMutation.mutateAsync({ msgId, content }),
    onPreviewAttachment: setPreviewAttachment,
  };

  const handleSelectMilestone = (node) => {
    setSelectedMilestoneId(node.id);
    setActiveTab("stream");
  };

  const displayedNode = selectedMilestoneId
    ? timelineNodes.find((n) => n.id === selectedMilestoneId) || timelineNodes[0]
    : timelineNodes[0];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-4">
      {/* ── Integrated Project Header & Actions Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 pt-1 pb-4 border-b border-slate-200/70 dark:border-slate-800/70">
        {/* Left Side: Navigation, Project Title, Status, Description & Team Meta */}
        <div className="space-y-2 min-w-0 flex-1">
          <button
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
              {project.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {statusStyle.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs flex-wrap pt-0.5">
            {project.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium max-w-xl">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMembersModalOpen(true)}
                className="flex items-center gap-1.5 p-1 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
                title="Click to view all project members"
              >
                <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                <div className="flex items-center -space-x-1.5">
                  {allMembers.slice(0, 5).map((m, idx) => (
                    <MemberAvatarWithTooltip key={m.id || m.user_id || idx} member={m} size="xs" />
                  ))}
                  {allMembers.length > 5 && (
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900">
                      +{allMembers.length - 5}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ml-1">
                  {allMembers.length} member{allMembers.length !== 1 ? "s" : ""}
                </span>
              </button>

              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                {timelineNodes.length} Update{timelineNodes.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: View Switcher & Actions */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/50">
            <button
              onClick={() => setActiveTab("stream")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === "stream"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Progress Stream
            </button>
            <button
              onClick={() => setActiveTab("roadmap")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${activeTab === "roadmap"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              <Map className="w-3.5 h-3.5" />
              Project Roadmap
            </button>
          </div>

          {/* Student Post Progress Button */}
          {isStudent && (
            <button
              onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Post Progress
            </button>
          )}

          {/* HOD Menu */}
          {isHOD && (
            <div className="relative pm-kebab-container">
              <button
                onClick={() => setKebabOpen(!kebabOpen)}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {kebabOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-800/50 border border-slate-200 dark:border-slate-800 py-1 z-50 animate-fade-in text-left">
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
          )}
        </div>
      </div>

      {/* ── Main View Content Area ── */}
      {activeTab === "stream" ? (
        // Progress Stream: shows only the selected/latest update card
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-premium pr-1 pb-4">
          {timelineNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-500">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Progress Updates Yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                  {isStudent
                    ? "Post your first progress update to start tracking project milestones."
                    : "Students haven't submitted any progress updates yet."}
                </p>
              </div>
              {isStudent && (
                <button
                  onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Post First Update
                </button>
              )}
            </div>
          ) : (
            <div className="max-w-5xl mx-auto py-2 flex flex-col lg:flex-row gap-8 items-start">
              {/* Right Column: Clean premium progress card - Ordered first on mobile (default) and last on lg desktop */}
              <div className="w-full lg:w-72 shrink-0 lg:order-last">
                {(() => {
                  const latestPct = timelineNodes[0]?.percentage || 0;
                  const latestTitle = timelineNodes[0]?.title || "No updates yet";
                  const circumference = 2 * Math.PI * 36; // r=36
                  const strokeDash = (latestPct / 100) * circumference;
                  return (
                    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_24px_rgba(79,70,229,0.09)]">
                      {/* Top accent bar */}
                      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600" />

                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Latest Progress</span>
                          {latestPct === 100 && (
                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">COMPLETED</span>
                          )}
                        </div>

                        {/* SVG Ring centered */}
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative w-24 h-24">
                            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                              <circle cx="40" cy="40" r="36" fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800" />
                              <circle
                                cx="40" cy="40" r="36"
                                fill="none" strokeWidth="6" strokeLinecap="round"
                                stroke="url(#desktopProgressGradient)"
                                strokeDasharray={`${strokeDash} ${circumference}`}
                                style={{ transition: "stroke-dasharray 0.7s ease" }}
                              />
                              <defs>
                                <linearGradient id="desktopProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#6366f1" />
                                  <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-indigo-600 dark:text-indigo-400">
                              {latestPct}%
                            </span>
                          </div>

                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">{latestTitle}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                              {latestPct > 0 ? `${latestPct}% of project completed` : "No percentage logged yet"}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                            style={{ width: `${latestPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Left Column: Progress update card */}
              <div className="flex-1 w-full min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={displayedNode.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <ProgressPostItem
                      node={displayedNode}
                      projectId={id}
                      isStudent={isStudent}
                      isFaculty={isFaculty}
                      isHOD={isHOD}
                      currentUserId={user?.id}
                      isOwn={displayedNode.isOwn}
                      canEdit={displayedNode.canEdit}
                      isLatest={displayedNode.id === timelineNodes[0]?.id}
                      {...progressHandlers}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-premium pr-1">
          <RoadmapView
            timelineNodes={timelineNodes}
            onSelectMilestone={handleSelectMilestone}
            selectedId={selectedMilestoneId ?? timelineNodes[0]?.id}
          />
        </div>
      )}

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
          {/* Progress Title */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Progress Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Implemented Authentication Module..."
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Description textarea */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={formAccomplishment}
              onChange={e => setFormAccomplishment(e.target.value)}
              placeholder="Describe what you worked on in detail..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 leading-relaxed"
              rows={4}
            />
          </div>

          {/* Progress Completed Slider */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Progress Completed (%)
              </label>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formPercentage}
              onChange={e => setFormPercentage(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-650"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold">
              <span>0% (Kickoff)</span>
              <span>50% (Halfway)</span>
              <span>100% (Completed)</span>
            </div>
          </div>

          {/* File attachments */}
          {!editingMsg && (
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Attachments <span className="text-slate-400 font-normal">(optional, max 10MB each)</span>
              </label>

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

              <label className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer bg-white dark:bg-slate-800/40 transition-colors text-center">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Click to attach files</span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Images, PDF, documents, ZIP accepted</span>
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
              disabled={sendMutation.isPending || editMutation.isPending || (!formTitle.trim() && !formAccomplishment.trim() && formFiles.length === 0)}
            >
              {sendMutation.isPending || editMutation.isPending
                ? "Posting..."
                : editingMsg ? "Save Update" : "Post Update"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Progress Update"
        message="Are you sure you want to delete this progress update? This cannot be undone."
        confirmText="Delete"
        danger
      />

      {/* ── Project Members Details Modal ── */}
      <Modal open={membersModalOpen} onClose={() => setMembersModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Project Team Members ({allMembers.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Assigned team members for {project.name}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto scrollbar-premium pr-1">
            {allMembers.map((m, idx) => {
              const name = m.name || m.user?.name || "Member";
              const picture = m.profile_picture || m.user?.profile_picture;
              const role = m.role_in_project || m.role || m.user?.role || "STUDENT";
              const email = m.email || m.user?.email || "";

              return (
                <div
                  key={m.id || m.user_id || idx}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarCircle name={name} picture={picture} size="md" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">{name}</p>
                      {email ? (
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">{email}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">Project Member</p>
                      )}
                    </div>
                  </div>

                  <RoleBadge role={role} />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setMembersModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}