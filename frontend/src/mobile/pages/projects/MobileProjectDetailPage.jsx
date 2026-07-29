import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  getProject, getMessages, postMessage, editMessage, deleteMessage,
  updateProjectStatus, updateProject,
  postProgressComment, deleteProgressComment, reactToComment,
} from "../../../api/projects";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../hooks/useSocket";
import { Spinner } from "../../../components/ui/Spinner";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ProjectFormCard } from "../../../pages/projects/ProjectWorkflowPage";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";
import MobileSectionHeader from "../../components/MobileSectionHeader";
import MobileFAB from "../../components/MobileFAB";
import BottomSheet from "../../layout/BottomSheet";
import {
  ArrowLeft, Plus, Edit2, Trash2, Send, Smile,
  FolderKanban, Users, GraduationCap, MessageSquare,
  CheckCircle, Paperclip, FileText, Image, File,
  Download, ChevronDown, ChevronUp, MoreVertical,
  Clock, X, Map, ExternalLink, Eye, Check, Lock,
  ChevronRight, ChevronLeft, Flag,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

function parseUTCDate(dateStr) {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  return new Date(s.endsWith("Z") ? s : s + "Z");
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

const ROLE_COLORS = {
  HOD: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  FACULTY: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  faculty: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  forum_member: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  student: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  STUDENT: "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400",
};

const STATUS_MAP = {
  COMPLETED: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", label: "Completed" },
  IN_PROGRESS: { dot: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-600 dark:text-orange-400", label: "In Progress" },
  NOT_STARTED: { dot: "bg-slate-400", bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", label: "Not Started" },
  REVIEW: { dot: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-400", label: "Review" },
  ON_HOLD: { dot: "bg-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", label: "On Hold" },
  CANCELLED: { dot: "bg-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400", label: "Cancelled" },
};

const EMOJIS = ["👍", "❤️", "🔥"];

function AvatarCircle({ name = "?", picture, size = 8 }) {
  const colors = ["bg-indigo-600", "bg-rose-600", "bg-violet-600", "bg-emerald-600", "bg-amber-600", "bg-cyan-600"];
  const idx = (name || "?").charCodeAt(0) % colors.length;
  const px = `${size * 4}px`;
  if (picture) return <img src={picture} alt={name} className="rounded-full object-cover ring-2 ring-white/10 shrink-0" style={{ width: px, height: px }} />;
  return (
    <div className={`${colors[idx]} rounded-full flex items-center justify-center font-black text-white shrink-0`} style={{ width: px, height: px, fontSize: `${size * 1.4}px` }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Attachment Preview Bottom Sheet ──────────────────────────────────────────

function AttachmentPreviewSheet({ attachment, onClose }) {
  if (!attachment) return null;
  const ext = getFileExt(attachment.name);
  const isImage = isImageExt(ext);
  const isPdf = isPdfExt(ext);

  return (
    <BottomSheet open={!!attachment} onClose={onClose} title={attachment.name || "Attachment Preview"}>
      <div className="space-y-3 pb-2">
        {isImage && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 flex items-center justify-center">
            <img src={attachment.url} alt={attachment.name} className="w-full max-h-[55vh] object-contain" />
          </div>
        )}
        {isPdf && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-[55vh]">
            <iframe src={attachment.url} title={attachment.name} className="w-full h-full border-none" />
          </div>
        )}
        {!isImage && !isPdf && (
          <div className="text-center py-8 space-y-2">
            <File className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{attachment.name}</p>
            <p className="text-xs text-slate-400">{ext.toUpperCase()} file</p>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <a
            href={attachment.url}
            download={attachment.name || true}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-tappable flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2"
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

// ─── Mobile Attachment List with Eye & Download Icons ─────────────────────────

function MobileAttachmentList({ attachments, onPreview }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
        Attachments ({attachments.length})
      </span>
      <div className="space-y-1.5">
        {attachments.map((att, i) => {
          const ext = getFileExt(att.name);
          const isImg = isImageExt(ext);
          const isPdf = isPdfExt(ext);

          let icon = <File className="w-3.5 h-3.5 text-blue-500" />;
          if (isImg) icon = <Image className="w-3.5 h-3.5 text-emerald-500" />;
          else if (isPdf) icon = <FileText className="w-3.5 h-3.5 text-rose-500" />;

          return (
            <div
              key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {att.name || "Attachment"}
                  </p>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">{ext || "file"}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Eye Icon for Preview */}
                <button
                  type="button"
                  onClick={() => onPreview(att)}
                  title="Preview"
                  className="mobile-tappable p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {/* Download Icon */}
                <a
                  href={att.url}
                  download={att.name || true}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download"
                  className="mobile-tappable p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mobile Roadmap View (Vertical Stacked Timeline) ─────────────────────────

function MobileRoadmapView({ timelineNodes, onSelectMilestone, selectedId, onBack }) {
  const ascendingNodes = [...timelineNodes].reverse();
  const total = timelineNodes.length;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-500">
          <Map className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Roadmap Milestones Logged</p>
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
        >
          Back to Progress
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-1">
      {/* Back button & Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Progress</span>
        </button>
        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Project Roadmap ({total})
        </span>
      </div>

      {/* Simplified Mobile Stacked Timeline */}
      <div className="space-y-3">
        {ascendingNodes.map((node, idx) => {
          const milestoneNum = idx + 1;
          const isSelected = node.id === selectedId;

          return (
            <div
              key={node.id}
              onClick={() => onSelectMilestone(node)}
              className={`w-full p-4 rounded-2xl transition-all duration-200 cursor-pointer text-left ${
                isSelected
                  ? "bg-white dark:bg-slate-900 border-2 border-indigo-500 dark:border-indigo-400 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/10"
                  : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-black border border-indigo-200/60 dark:border-indigo-800/60">
                    Milestone #{milestoneNum}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {node.dateStr}
                  </span>
                </div>

                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                  {node.title || "Progress Update"}
                </h4>

                {node.accomplishment && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
                    {node.accomplishment}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MobileProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isHOD = user?.role === "HOD";
  const isFaculty = user?.role === "FACULTY";
  const isStudent = user?.role === "STUDENT";

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editProjectSheetOpen, setEditProjectSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("progress"); // "progress" | "roadmap"
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);

  // Progress form
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formFiles, setFormFiles] = useState([]);
  const [formPercentage, setFormPercentage] = useState(0);

  // Edit project form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

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
      setEditName(project.name || "");
      setEditDesc(project.description || "");
    }
  }, [project]);

  useEffect(() => {
    if (editingMsg) {
      setFormTitle(editingMsg.title || "");
      let parsed = {};
      try { parsed = JSON.parse(editingMsg.content); } catch {}
      setFormText(parsed.accomplishment || parsed.completed_this_week || parsed.summary || editingMsg.content || "");
      setFormPercentage(parsed.percentage || 0);
    } else {
      setFormTitle("");
      setFormText("");
      setFormPercentage(0);
    }
    setFormFiles([]);
  }, [editingMsg]);

  // Socket
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

  const statusMutation = useMutation({
    mutationFn: (status) => updateProjectStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", id] }),
  });

  const editProjectMutation = useMutation({
    mutationFn: (data) => updateProject(id, data),
    onSuccess: () => { setEditProjectSheetOpen(false); queryClient.invalidateQueries({ queryKey: ["project", id] }); },
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
    const contentPayload = JSON.stringify({ accomplishment: formText, percentage: Number(formPercentage) });
    if (editingMsg) {
      editMutation.mutate({ messageId: editingMsg.id, title: formTitle, content: contentPayload });
    } else {
      const formData = new FormData();
      formData.append("title", formTitle);
      formData.append("content", contentPayload);
      for (const file of formFiles) formData.append("attachments", file);
      sendMutation.mutate(formData);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner /></div>;
  if (!project) return null;

  const st = STATUS_MAP[project.status] || STATUS_MAP.IN_PROGRESS;
  const allMembers = project.members || [];

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
      title = firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine;
    }

    let attachments = [];
    if (msg.attachments?.length > 0) attachments = msg.attachments;
    else if (msg.attachment_url) attachments = [{ url: msg.attachment_url, type: msg.attachment_type, name: msg.attachment_name }];

    return {
      id: msg.id, dateRaw: msg.created_at,
      dateStr: format(parseUTCDate(msg.created_at), "MMM d, yyyy · h:mm a"),
      author: msg.sender?.name || "Unknown", role: msg.sender?.role || "STUDENT",
      avatar: msg.sender?.profile_picture, title, accomplishment, attachments,
      comments: msg.comments || [], is_edited: msg.is_edited,
      isOwn: msg.sender?.id === user?.id, canEdit: msg.can_edit && msg.sender?.id === user?.id,
      percentage,
    };
  });

  const handleSelectMilestone = (node) => {
    setSelectedMilestoneId(node.id);
    setActiveTab("progress");
  };

  const displayedNode = selectedMilestoneId
    ? timelineNodes.find((n) => n.id === selectedMilestoneId) || timelineNodes[0]
    : timelineNodes[0];

  return (
    <div className="mobile-fade-in pb-6 space-y-4">
      {/* Mobile Integrated Project Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => navigate("/projects")} className="mobile-tappable flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 active:opacity-75">
            <ArrowLeft className="w-4 h-4" /> Projects
          </button>
          {isHOD && (
            <button onClick={() => setActionSheetOpen(true)} className="mobile-tappable p-1.5 rounded-xl text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Integrated Mobile Hero Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight flex-1 min-w-0">{project.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
          </div>

          {project.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium line-clamp-2">{project.description}</p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
            <button
              type="button"
              onClick={() => setMembersSheetOpen(true)}
              className="mobile-tappable flex items-center gap-1.5 active:opacity-75"
            >
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="flex -space-x-1.5">
                {allMembers.slice(0, 5).map((m, idx) => (
                  <AvatarCircle key={m.id || m.user_id || idx} name={m.name || m.user?.name} picture={m.profile_picture || m.user?.profile_picture} size={5} />
                ))}
              </div>
              <span className="font-bold text-slate-600 dark:text-slate-400">{allMembers.length} member{allMembers.length !== 1 ? "s" : ""}</span>
            </button>

            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
              {timelineNodes.length} Update{timelineNodes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "progress" ? (
        timelineNodes.length === 0 ? (
          <MobileEmptyState
            icon={FileText}
            title="No progress updates yet"
            description={isStudent ? "Post your first update to get started." : "Students haven't posted any updates yet."}
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={displayedNode.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ProgressCard
                  node={displayedNode}
                  projectId={id}
                  isStudent={isStudent}
                  isFaculty={isFaculty}
                  isHOD={isHOD}
                  currentUserId={user?.id}
                  isLatest={displayedNode.id === timelineNodes[0]?.id}
                  onEdit={(n) => { setEditingMsg({ id: n.id, title: n.title, content: n.accomplishment, created_at: n.dateRaw }); setAddSheetOpen(true); }}
                  onDelete={(msgId) => setDeleteTarget(msgId)}
                  onAddComment={(msgId, content) => addCommentMutation.mutateAsync({ msgId, content })}
                  onDeleteComment={(msgId, commentId) => deleteCommentMutation.mutate({ msgId, commentId })}
                  onReact={(msgId, commentId, emoji) => reactMutation.mutate({ msgId, commentId, emoji })}
                  onPreviewAttachment={setPreviewAttachment}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )
      ) : (
        <MobileRoadmapView
          timelineNodes={timelineNodes}
          onSelectMilestone={handleSelectMilestone}
          selectedId={selectedMilestoneId ?? timelineNodes[0]?.id}
          onBack={() => setActiveTab("progress")}
        />
      )}

      {/* Floating Action Button for Roadmap (Progress View only, stacked above Student + button using Portal) */}
      {activeTab === "progress" && createPortal(
        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={() => setActiveTab("roadmap")}
          className="mobile-tappable fixed z-[90] w-14 h-14 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center active:scale-90 transition-all border border-white/20 dark:border-slate-700/50 cursor-pointer"
          style={{
            right: "16px",
            bottom: isStudent
              ? "calc(60px + env(safe-area-inset-bottom, 0px) + 16px + 64px)"
              : "calc(60px + env(safe-area-inset-bottom, 0px) + 16px)",
          }}
          aria-label="Open Project Roadmap"
          title="Open Project Roadmap"
        >
          <Map className="w-6 h-6" />
        </motion.button>,
        document.body
      )}

      {/* Student FAB to Post Progress */}
      {isStudent && (
        <MobileFAB onClick={() => { setEditingMsg(null); setAddSheetOpen(true); }} icon={Plus} label="Post Progress" />
      )}

      {/* Post/Edit Progress Bottom Sheet */}
      <BottomSheet open={addSheetOpen} onClose={() => { setAddSheetOpen(false); setEditingMsg(null); }} title={editingMsg ? "Edit Progress" : "Post Progress"}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Completed login module..."
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
            <textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Describe what you accomplished in detail..."
              rows={3}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
          </div>
          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress Completed (%)</label>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{formPercentage}%</span>
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
            <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          {!editingMsg && (
            <div>
              <input type="file" multiple onChange={(e) => setFormFiles(Array.from(e.target.files))} className="hidden" id="progress-files" />
              <label htmlFor="progress-files" className="mobile-tappable flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 cursor-pointer justify-center">
                <Paperclip className="w-4 h-4" />
                Attach Files ({formFiles.length})
              </label>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={sendMutation.isPending || editMutation.isPending || (!formTitle.trim() && !formText.trim() && formFiles.length === 0)}
            className="mobile-tappable w-full py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-colors"
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

      {/* HOD Action Sheet */}
      <BottomSheet open={actionSheetOpen} onClose={() => setActionSheetOpen(false)} title={project.name}>
        <div className="space-y-1">
          {project.status !== "COMPLETED" && (
            <button
              onClick={() => { statusMutation.mutate("COMPLETED"); setActionSheetOpen(false); }}
              className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500"><CheckCircle className="w-4 h-4" /></div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Mark Completed</span>
            </button>
          )}
          <button
            onClick={() => { setActionSheetOpen(false); setTimeout(() => setEditProjectSheetOpen(true), 300); }}
            className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500"><Edit2 className="w-4 h-4" /></div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Edit Project</span>
          </button>
        </div>
      </BottomSheet>

      {/* Edit Project Bottom Sheet */}
      <BottomSheet open={editProjectSheetOpen} onClose={() => setEditProjectSheetOpen(false)} title="Edit Project">
        <div className="space-y-3">
          <input
            type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
            placeholder="Project name"
            className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <textarea
            value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description" rows={3}
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
          />
          <button
            onClick={() => editProjectMutation.mutate({ name: editName, description: editDesc, members: allMembers.map(m => ({ user_id: m.id, role_in_project: m.role_in_project })) })}
            disabled={editProjectMutation.isPending || !editName.trim()}
            className="mobile-tappable w-full py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold tracking-wide disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition-colors"
          >
            {editProjectMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </BottomSheet>

      {/* Attachment Preview Sheet */}
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

      {/* Project Members BottomSheet */}
      <BottomSheet open={membersSheetOpen} onClose={() => setMembersSheetOpen(false)} title={`Project Members (${allMembers.length})`}>
        <div className="space-y-3 pb-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Team members assigned to this project:</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto mobile-hide-scrollbar">
            {allMembers.map((m, idx) => {
              const name = m.name || m.user?.name || "Member";
              const picture = m.profile_picture || m.user?.profile_picture;
              const role = m.role_in_project || m.role || m.user?.role || "STUDENT";
              const email = m.email || m.user?.email || "";

              return (
                <div key={m.id || m.user_id || idx} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarCircle name={name} picture={picture} size={6} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{name}</p>
                      {email && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{email}</p>}
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${ROLE_COLORS[role] || ROLE_COLORS.STUDENT}`}>
                    {role === "faculty" ? "Faculty" : role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── Progress Card Component ──────────────────────────────────────────────────

function ProgressCard({ node, projectId, isStudent, isFaculty, isHOD, currentUserId, onEdit, onDelete, onAddComment, onDeleteComment, onReact, onPreviewAttachment, isLatest }) {
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isExpandingComposer, setIsExpandingComposer] = useState(false);

  const handleFeedback = async (e) => {
    if (e) e.preventDefault();
    if (!feedbackText.trim()) return;
    setSubmitting(true);
    await onAddComment(node.id, feedbackText.trim());
    setFeedbackText("");
    setSubmitting(false);
    setIsExpandingComposer(false);
  };

  const comments = node.comments || [];

  return (
    <MobileCard>
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-1.5">
        <AvatarCircle name={node.author} picture={node.avatar} size={7} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{node.author}</span>
            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${ROLE_COLORS[node.role] || ROLE_COLORS.STUDENT}`}>
              {node.role === "faculty" ? "Faculty" : node.role === "forum_member" ? "Forum" : node.role}
            </span>
            {isLatest && (
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-full">
                Latest
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {node.dateStr}
            {node.is_edited && <span className="italic ml-1">(edited)</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {node.isOwn && node.canEdit && (
            <button onClick={() => onEdit(node)} className="mobile-tappable p-1 rounded-lg text-slate-400 hover:text-indigo-600">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {(node.isOwn || isHOD) && (
            <button onClick={() => onDelete(node.id)} className="mobile-tappable p-1 rounded-lg text-slate-400 hover:text-rose-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title & Completion */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
        {node.title && (
          <h3 className="text-xs font-black text-slate-900 dark:text-white leading-snug">{node.title}</h3>
        )}
        {node.percentage !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
            Completion: <strong className="font-black text-indigo-600 dark:text-indigo-400">{node.percentage}%</strong>
          </span>
        )}
      </div>

      {/* Description */}
      {node.accomplishment && (
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium mb-2">{node.accomplishment}</p>
      )}

      {/* Attachments List with Eye & Download Icons */}
      <MobileAttachmentList attachments={node.attachments} onPreview={onPreviewAttachment} />

      {/* Faculty Feedback */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Faculty Feedback {comments.length > 0 && `(${comments.length})`}
            </span>
          </div>
          {(isFaculty || isHOD) && (
            <button
              onClick={() => setIsExpandingComposer(p => !p)}
              className="mobile-tappable px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1"
            >
              {isExpandingComposer ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {isExpandingComposer ? "Close" : "Add Feedback"}
            </button>
          )}
        </div>

        {/* Mobile Expandable Composer */}
        <AnimatePresence>
          {isExpandingComposer && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleFeedback}
              className="overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 space-y-2">
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Write faculty feedback or notes..."
                  rows={2}
                  autoFocus
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setFeedbackText(""); setIsExpandingComposer(false); }}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!feedbackText.trim() || submitting}
                    className="mobile-tappable px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-40 flex items-center gap-1 shadow-sm"
                  >
                    <Send className="w-3 h-3" /> Post
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {comments.length === 0 && !isExpandingComposer && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1">
            {(isFaculty || isHOD) ? "No feedback added yet. Tap 'Add Feedback' to review." : "No faculty feedback added yet."}
          </p>
        )}

        {comments.filter(c => !c.is_deleted).map(comment => (
          <div key={comment.id} className="flex gap-2 items-start">
            <AvatarCircle name={comment.author?.name || "?"} picture={comment.author?.profile_picture} size={5} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{comment.author?.name}</span>
                <span className="text-[9px] text-slate-400">{formatDistanceToNow(parseUTCDate(comment.created_at), { addSuffix: true })}</span>
                {(isHOD || comment.author?.id === currentUserId) && (
                  <button onClick={() => onDeleteComment(node.id, comment.id)} className="mobile-tappable p-0.5 text-slate-300 hover:text-rose-500 ml-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl rounded-tl-none px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {comment.content}
              </div>
              {/* Reactions */}
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {EMOJIS.map(emoji => {
                  const count = comment.reaction_counts?.[emoji] || 0;
                  const reacted = comment.user_reactions?.includes(emoji);
                  if (!isStudent && count === 0) return null;
                  return (
                    <button key={emoji}
                      onClick={() => isStudent && onReact(node.id, comment.id, emoji)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        reacted ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700" : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50"
                      } ${isStudent ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {emoji} {count > 0 && <span>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </MobileCard>
  );
}