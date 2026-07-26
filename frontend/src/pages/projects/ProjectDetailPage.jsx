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
  ExternalLink, Layers, Check, Lock, ChevronRight, ChevronLeft,
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

// ─── Progress Post Item (Clean Flat Design) ───────────────────────────────────

function ProgressPostItem({
  node, projectId, isStudent, isFaculty, isHOD, currentUserId,
  onEdit, onDelete, onDeleteComment, onReact, onAddComment, onPreviewAttachment,
  isOwn, canEdit, isLatest,
}) {
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
    <div className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md hover:border-slate-300/80 dark:hover:border-slate-700 space-y-4 transition-all duration-200">
      {/* Top Author Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AvatarCircle name={node.author} picture={node.avatar} size="md" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900 dark:text-white">{node.author}</span>
              <RoleBadge role={node.role} />
              {isLatest && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                  Latest Update
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              {node.dateStr}
              {node.is_edited && <span className="italic ml-1.5 text-slate-400">(edited)</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isOwn && canEdit && (
            <button
              onClick={() => onEdit(node)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Edit progress"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {(isOwn || isHOD) && (
            <button
              onClick={() => onDelete(node.id)}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition-colors"
              title="Delete progress"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Title */}
      {node.title && (
        <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug tracking-tight">
          {node.title}
        </h3>
      )}

      {/* Progress Description */}
      {node.accomplishment && (
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
          {node.accomplishment}
        </div>
      )}

      {/* Attachments List with Eye & Download Icons */}
      <AttachmentList attachments={node.attachments} onPreview={onPreviewAttachment} />

      {/* Faculty Feedback Section */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Faculty Feedback {comments.length > 0 && `(${comments.length})`}
          </span>
        </div>

        {comments.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-1 font-medium">
            {(isFaculty || isHOD) ? "Add feedback for the students on this progress update." : "No faculty feedback added yet."}
          </p>
        )}

        {/* Comment list */}
        {comments.length > 0 && (
          <div className="space-y-2.5">
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

        {/* Feedback input — HOD and Faculty only */}
        {(isFaculty || isHOD) && (
          <form onSubmit={handleFeedback} className="flex gap-2 pt-1">
            <input
              type="text"
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Write faculty feedback or notes..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button
              type="submit"
              disabled={!feedbackText.trim() || submittingFeedback}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white disabled:opacity-40 transition-all shrink-0 flex items-center gap-1.5 text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Roadmap View (Game-Style Island Path) ────────────────────────────────────

const ISLAND_MIN_SLOTS = 5;

function IslandNode({ node, index, isCompleted, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => isCompleted && onClick(node)}
      disabled={!isCompleted}
      className={`group relative flex flex-col items-center shrink-0 focus:outline-none ${isCompleted ? "cursor-pointer" : "cursor-not-allowed"}`}
      style={{ width: 128 }}
    >
      {/* Number badge */}
      <span
        className={`mb-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm border ${
          isCompleted
            ? isSelected
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
            : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
        }`}
      >
        {index + 1}
        {isCompleted && <span className="uppercase tracking-wider">{isSelected ? "Viewing" : "Completed"}</span>}
      </span>

      {/* Island illustration */}
      <div
        className={`relative w-32 h-32 flex items-center justify-center transition-transform duration-300 ${
          isCompleted ? "group-hover:-translate-y-1.5 group-active:translate-y-0" : ""
        }`}
      >
        {isCompleted && (
          <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 blur-2xl scale-75" />
        )}
        <img
          src="/island.png"
          alt={isCompleted ? node.title || "Completed milestone" : "Locked milestone"}
          draggable={false}
          className={`relative w-full h-full object-contain select-none transition-all duration-300 ${
            isCompleted
              ? isSelected
                ? "drop-shadow-[0_0_18px_rgba(99,102,241,0.45)]"
                : "drop-shadow-lg"
              : "grayscale opacity-50 brightness-90"
          }`}
        />
        {!isCompleted && (
          <span className="absolute w-9 h-9 rounded-full bg-slate-700/85 dark:bg-slate-900/85 flex items-center justify-center shadow-md">
            <Lock className="w-4 h-4 text-slate-200" />
          </span>
        )}
      </div>
    </button>
  );
}

function RoadmapView({ timelineNodes, onSelectMilestone, selectedId }) {
  const scrollRef = useRef(null);
  const totalSlots = Math.max(ISLAND_MIN_SLOTS, timelineNodes.length);
  const slots = Array.from({ length: totalSlots }, (_, i) => timelineNodes[i] || null);
  const activeNode = timelineNodes.find((n) => n.id === selectedId) || timelineNodes[0];

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
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
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 p-8 pb-6 overflow-hidden">
        {/* Decorative background clouds */}
        <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20">
          <div className="absolute top-6 left-16 w-16 h-6 rounded-full bg-white dark:bg-slate-700 blur-sm" />
          <div className="absolute bottom-10 right-24 w-20 h-7 rounded-full bg-white dark:bg-slate-700 blur-sm" />
        </div>

        {/* Nav arrows */}
        {slots.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="absolute right-3 top-[4.5rem] z-10 w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all"
              aria-label="Scroll roadmap forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="absolute left-3 top-[4.5rem] z-10 w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all"
              aria-label="Scroll roadmap backward"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="relative flex items-start gap-2 overflow-x-auto scrollbar-premium scroll-smooth px-4 py-2"
        >
          {slots.map((node, idx) => {
            const isCompleted = !!node;
            const isSelected = isCompleted && node.id === selectedId;
            return (
              <div key={node ? node.id : `locked-${idx}`} className="flex items-start shrink-0">
                <IslandNode
                  node={node}
                  index={idx}
                  isCompleted={isCompleted}
                  isSelected={isSelected}
                  onClick={onSelectMilestone}
                />
                {idx < slots.length - 1 && (
                  <div className="flex items-center h-32 -mx-2">
                    <svg width="40" height="16" viewBox="0 0 40 16" className="text-slate-300 dark:text-slate-700">
                      <line x1="2" y1="8" x2="38" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail card for the active/selected milestone */}
        {activeNode && (
          <div className="mt-2 max-w-sm mx-auto md:mx-0 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-900/5 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {format(parseUTCDate(activeNode.dateRaw), "MMM d, h:mm a")}
            </p>
            {activeNode.title && (
              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{activeNode.title}</h4>
            )}
            {activeNode.accomplishment && (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
                {activeNode.accomplishment}
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              <Users className="w-3.5 h-3.5" />
              {(activeNode.comments || []).length} Update{(activeNode.comments || []).length !== 1 ? "s" : ""}
            </div>
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

  // Edit project fields
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  // Progress form fields (student only)
  const [formTitle, setFormTitle] = useState("");
  const [formAccomplishment, setFormAccomplishment] = useState("");
  const [formFiles, setFormFiles] = useState([]);

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
        parsed.completed_this_week || parsed.accomplishment || parsed.summary ||
        editingMsg.content || ""
      );
    } else {
      setFormTitle("");
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
      {/* ── Top Header & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3 pt-1 pb-4 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="space-y-1.5">
          <button
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Projects
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              Progress Monitor
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/50">
            <button
              onClick={() => setActiveTab("stream")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                activeTab === "stream"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Progress Stream
            </button>
            <button
              onClick={() => setActiveTab("roadmap")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                activeTab === "roadmap"
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

      {/* ── Compact Project Info Summary Bar (No card bloat) ── */}
      <div className="px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="space-y-0.5 max-w-2xl">
          <h2 className="text-base font-black text-slate-900 dark:text-white truncate">{project.name}</h2>
          {project.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex items-center -space-x-1.5">
              {allMembers.slice(0, 5).map((m) => (
                <AvatarCircle key={m.id} name={m.name} picture={m.profile_picture} size="xs" />
              ))}
              {allMembers.length > 5 && (
                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300">
                  +{allMembers.length - 5}
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-4">
            {timelineNodes.length} Progress Update{timelineNodes.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Main View Content Area ── */}
      {activeTab === "stream" ? (
        // Progress Stream: shows only the selected/latest update — page itself never scrolls.
        <div className="flex-1 min-h-0 overflow-hidden">
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
            <div className="h-full max-w-4xl mx-auto flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={displayedNode.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-0 overflow-y-auto scrollbar-premium"
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
    </div>
  );
}