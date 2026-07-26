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
  Download, MessageSquare, Send, Smile,
  Clock, Users, ChevronDown, ChevronUp, Eye, Map,
  ExternalLink, Layers, Check, ChevronLeft, ChevronRight,
  Flag, Trees, Sparkles, Shield, Zap, Crown, Rocket, Star,
  Lock, Compass, Hourglass, Award,
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

// ─── Milestone Icons Mapping ─────────────────────────────────────────────────

function getMilestoneIcon(index, isLastReal, isFuture) {
  if (isFuture) return <Lock className="w-5 h-5 text-slate-400" />;
  if (isLastReal) return <Award className="w-6 h-6 text-amber-500" />;
  
  const iconList = [
    <Flag className="w-5 h-5 text-indigo-500" />,
    <Sparkles className="w-5 h-5 text-emerald-500" />,
    <Shield className="w-5 h-5 text-blue-500" />,
    <Zap className="w-5 h-5 text-amber-500" />,
    <Crown className="w-5 h-5 text-purple-500" />,
    <Rocket className="w-5 h-5 text-rose-500" />,
    <Star className="w-5 h-5 text-cyan-500" />,
  ];
  return iconList[index % iconList.length];
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
                <button
                  type="button"
                  onClick={() => onPreview(att)}
                  title="Preview Attachment"
                  className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
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

// ─── Interactive Journey Map Component ───────────────────────────────────────

function JourneyMap({
  allMapNodes,
  selectedIndex,
  onSelectIndex,
  isCompleted,
}) {
  const containerRef = useRef(null);
  const nodeRefs = useRef([]);

  // Smooth scroll centering on active node
  useEffect(() => {
    const container = containerRef.current;
    const targetNode = nodeRefs.current[selectedIndex];
    if (container && targetNode) {
      const containerWidth = container.clientWidth;
      const targetLeft = targetNode.offsetLeft;
      const targetWidth = targetNode.offsetWidth;
      const scrollToLeft = targetLeft - containerWidth / 2 + targetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollToLeft), behavior: "smooth" });
    }
  }, [selectedIndex, allMapNodes.length]);

  return (
    <div className="relative py-6 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80">
      {/* Decorative background stars & path elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-4 left-10"><Sparkles className="w-4 h-4 text-indigo-400" /></div>
        <div className="absolute bottom-6 left-1/4"><Trees className="w-6 h-6 text-emerald-500" /></div>
        <div className="absolute top-6 right-1/3"><Compass className="w-5 h-5 text-amber-400" /></div>
        <div className="absolute bottom-4 right-12"><Trees className="w-5 h-5 text-emerald-600" /></div>
      </div>

      {/* Map Scroll Container */}
      <div ref={containerRef} className="jm-scroll-container px-16 md:px-32 py-8 relative">
        <div className="flex items-center min-w-max gap-16 md:gap-24 relative z-10 px-8">
          
          {/* Winding Connecting Line (SVG background path) */}
          <svg className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-12 pointer-events-none z-0 overflow-visible">
            <path
              d="M 0,24 Q 200,4 400,24 T 800,24 T 1200,24 T 1600,24 T 2000,24 T 2400,24"
              fill="none"
              stroke="#334155"
              strokeWidth="4"
              className="jm-path-dash"
            />
          </svg>

          {allMapNodes.map((node, idx) => {
            const isActive = idx === selectedIndex;
            const isFuture = node.isFuture;
            const isLastReal = !isFuture && idx === allMapNodes.length - (isCompleted ? 1 : 2);
            
            return (
              <div
                key={node.id || idx}
                ref={(el) => (nodeRefs.current[idx] = el)}
                onClick={() => onSelectIndex(idx)}
                className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 group ${
                  isActive ? "jm-active-node scale-110" : "hover:scale-105 opacity-80 hover:opacity-100"
                } ${isFuture ? "opacity-50" : ""}`}
              >
                {/* Node Top Title Tooltip / Label */}
                <div className="mb-3 text-center transition-transform group-hover:-translate-y-1">
                  {isActive && (
                    <span className="jm-active-badge inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary-500 text-white shadow-md mb-1">
                      {isFuture ? "Upcoming" : isLastReal ? "Latest Milestone" : `Milestone #${idx + 1}`}
                    </span>
                  )}
                  <h4 className={`text-xs font-black truncate max-w-[140px] ${
                    isActive ? "text-white scale-105" : "text-slate-300"
                  }`}>
                    {node.title}
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    {node.dateStr}
                  </p>
                </div>

                {/* Node Milestone Icon Badge */}
                <div
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border-2 transition-all shadow-xl relative ${
                    isActive
                      ? "bg-gradient-to-br from-primary-500 to-primary-600 border-white text-white ring-4 ring-primary-500/30"
                      : isFuture
                      ? "bg-slate-800/80 border-slate-700/80 text-slate-500 border-dashed"
                      : "bg-slate-800 border-slate-700 text-slate-200 group-hover:border-indigo-500"
                  }`}
                >
                  {getMilestoneIcon(idx, isLastReal, isFuture)}

                  {/* Attachment & Feedback counters on node */}
                  {!isFuture && (node.attachments?.length > 0 || node.comments?.length > 0) && (
                    <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-slate-300 shadow-md">
                      {node.attachments?.length > 0 && <span>📎 {node.attachments.length}</span>}
                      {node.comments?.length > 0 && <span>💬 {node.comments.length}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls: Previous / Next */}
      <div className="flex items-center justify-between px-6 pt-2 pb-1 border-t border-slate-800/80 relative z-20">
        <button
          onClick={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
          disabled={selectedIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-white transition-all active:scale-95 border border-slate-700/80 shadow-md"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-slate-300">
            Checkpoint <span className="text-primary-400 font-black">{selectedIndex + 1}</span> of {allMapNodes.length}
          </span>
        </div>

        <button
          onClick={() => onSelectIndex(Math.min(allMapNodes.length - 1, selectedIndex + 1))}
          disabled={selectedIndex === allMapNodes.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-white transition-all active:scale-95 border border-slate-700/80 shadow-md"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState(null);

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
  
  // Parse raw messages chronologically (oldest = index 0, newest = index N-1)
  const chronologicalMessages = [...messages].filter(msg => !msg.is_deleted);

  const timelineNodes = chronologicalMessages.map((msg, idx) => {
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
      title = firstLine.length > 70 ? firstLine.substring(0, 67) + "..." : firstLine;
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
      isFuture: false,
    };
  });

  // Build complete map nodes array with Future Checkpoint if project is not completed
  const isCompleted = project?.status === "COMPLETED";
  const allMapNodes = [...timelineNodes];
  if (!isCompleted) {
    allMapNodes.push({
      id: "future-node",
      title: "Waiting for next update",
      dateStr: "Next Milestone",
      isFuture: true,
      accomplishment: "The project team hasn't submitted this milestone yet. Students can post the next update using the 'Post Progress' button above.",
      attachments: [],
      comments: [],
    });
  }

  // Set initial selectedIndex to latest real progress on load
  useEffect(() => {
    if (timelineNodes.length > 0) {
      setSelectedIndex(timelineNodes.length - 1);
    } else if (!isCompleted) {
      setSelectedIndex(0);
    }
  }, [messages.length, isCompleted]);

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
    onSuccess: (res) => {
      refetchMessages();
      setFormTitle("");
      setFormAccomplishment("");
      setFormFiles([]);
      setAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      
      // Auto-focus on new checkpoint
      setTimeout(() => {
        setSelectedIndex(timelineNodes.length);
      }, 200);
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

  const selectedNode = allMapNodes[selectedIndex] || allMapNodes[0];
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

  return (
    <div className="flex flex-col min-h-screen max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
      
      {/* ── 1. Project Information Header Card ── */}
      <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Projects
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {statusStyle.label}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0 flex-wrap justify-between md:justify-end">
          {/* Team Members */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <div className="flex items-center -space-x-1.5">
              {allMembers.slice(0, 5).map((m) => (
                <AvatarCircle key={m.id} name={m.name} picture={m.profile_picture} size="xs" />
              ))}
            </div>
          </div>

          {/* Post Progress Button (Students) */}
          {isStudent && (
            <button
              onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
              className="px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-primary-500/20 transition-all flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Post Progress
            </button>
          )}

          {/* HOD Options Kebab */}
          {isHOD && (
            <div className="relative pm-kebab-container">
              <button
                onClick={() => setKebabOpen(!kebabOpen)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {kebabOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 animate-fade-in text-left">
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

      {/* ── 2. Interactive Journey Map & Navigation ── */}
      <JourneyMap
        allMapNodes={allMapNodes}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        isCompleted={isCompleted}
      />

      {/* ── 3. Selected Checkpoint Details Panel (Below Map) ── */}
      <div className="space-y-4">
        {selectedNode && !selectedNode.isFuture ? (
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5 animate-fade-in">
            {/* Header / Author row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <AvatarCircle name={selectedNode.author} picture={selectedNode.avatar} size="lg" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-slate-900 dark:text-white">{selectedNode.author}</span>
                    <RoleBadge role={selectedNode.role} />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                    {selectedNode.dateStr}
                    {selectedNode.is_edited && <span className="italic ml-2">(edited)</span>}
                  </p>
                </div>
              </div>

              {/* Edit / Delete Actions */}
              <div className="flex items-center gap-2">
                {selectedNode.isOwn && selectedNode.canEdit && (
                  <button
                    onClick={() => {
                      setEditingMsg({
                        id: selectedNode.id,
                        title: selectedNode.title,
                        content: selectedNode.accomplishment,
                        created_at: selectedNode.dateRaw,
                      });
                      setAddModalOpen(true);
                    }}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    title="Edit checkpoint"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {(selectedNode.isOwn || isHOD) && (
                  <button
                    onClick={() => setDeleteTarget(selectedNode.id)}
                    className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Delete checkpoint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Checkpoint Title */}
            {selectedNode.title && (
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {selectedNode.title}
              </h2>
            )}

            {/* Checkpoint Description */}
            {selectedNode.accomplishment && (
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                {selectedNode.accomplishment}
              </div>
            )}

            {/* Attachments List with Eye & Download Icons */}
            <AttachmentList attachments={selectedNode.attachments} onPreview={setPreviewAttachment} />

            {/* Faculty Comments & Feedback */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Faculty Feedback {selectedNode.comments.length > 0 && `(${selectedNode.comments.length})`}
                </h3>
              </div>

              {selectedNode.comments.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-1 font-medium">
                  {(isFaculty || isHOD) ? "Leave feedback for the project team on this milestone." : "No faculty feedback on this milestone yet."}
                </p>
              )}

              {/* Comments list */}
              {selectedNode.comments.length > 0 && (
                <div className="space-y-3">
                  {selectedNode.comments.map(comment => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      projectId={id}
                      msgId={selectedNode.id}
                      isStudent={isStudent}
                      isHOD={isHOD}
                      currentUserId={user?.id}
                      onDelete={(commentId) => deleteCommentMutation.mutate({ msgId: selectedNode.id, commentId })}
                      onReact={(commentId, emoji) => reactMutation.mutate({ msgId: selectedNode.id, commentId, emoji })}
                    />
                  ))}
                </div>
              )}

              {/* Feedback input — HOD and Faculty only */}
              {(isFaculty || isHOD) && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const text = e.target.feedbackInput.value.trim();
                    if (!text) return;
                    await addCommentMutation.mutateAsync({ msgId: selectedNode.id, content: text });
                    e.target.reset();
                  }}
                  className="flex gap-2 pt-2"
                >
                  <input
                    name="feedbackInput"
                    type="text"
                    placeholder="Write faculty guidance or feedback on this checkpoint..."
                    className="flex-1 px-4 py-2.5 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-95 text-white transition-all shrink-0 flex items-center gap-2 text-xs font-bold shadow-md shadow-primary-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* Future Checkpoint Card */
          <div className="p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 text-center space-y-3 animate-fade-in shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Hourglass className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-white">Upcoming Milestone</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {selectedNode?.accomplishment || "Waiting for the project team to post the next progress update."}
            </p>
            {isStudent && (
              <button
                onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-lg shadow-primary-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Post Next Checkpoint
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
        title={editingMsg ? "Edit Checkpoint" : "Post New Milestone Checkpoint"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Progress Title */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Checkpoint Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Completed Backend API Integration..."
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>

          {/* Description textarea */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={formAccomplishment}
              onChange={e => setFormAccomplishment(e.target.value)}
              placeholder="Describe what was accomplished in detail..."
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 leading-relaxed"
              rows={4}
            />
          </div>

          {/* File attachments */}
          {!editingMsg && (
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Attachments <span className="text-slate-400 font-normal">(optional)</span>
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

              <label className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer bg-white dark:bg-slate-800/40 transition-colors text-center">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Click to attach files</span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Images, PDFs, docs accepted</span>
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
              disabled={sendMutation.isPending || editMutation.isPending || (!formTitle.trim() && !formAccomplishment.trim())}
            >
              {sendMutation.isPending || editMutation.isPending
                ? "Posting..."
                : editingMsg ? "Save Checkpoint" : "Post Checkpoint"}
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
        title="Delete Checkpoint"
        message="Are you sure you want to delete this progress checkpoint? This cannot be undone."
        confirmText="Delete"
        danger
      />
    </div>
  );
}
