import { useState, useEffect, useRef, useCallback } from "react";
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
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";
import MobileFAB from "../../components/MobileFAB";
import BottomSheet from "../../layout/BottomSheet";
import {
  ArrowLeft, Plus, Edit2, Trash2, Send, Smile,
  FolderKanban, Users, GraduationCap, MessageSquare,
  CheckCircle, Paperclip, FileText, Image, File,
  Download, ChevronDown, ChevronUp, MoreVertical,
  Clock, X, Map, ExternalLink, Eye, Check, ChevronLeft, ChevronRight,
  Flag, Trees, Sparkles, Shield, Zap, Crown, Rocket, Star,
  Lock, Compass, Hourglass, Award,
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

function getMilestoneIcon(index, isLastReal, isFuture) {
  if (isFuture) return <Lock className="w-4 h-4 text-slate-400" />;
  if (isLastReal) return <Award className="w-5 h-5 text-amber-500" />;
  
  const iconList = [
    <Flag className="w-4 h-4 text-indigo-500" />,
    <Sparkles className="w-4 h-4 text-emerald-500" />,
    <Shield className="w-4 h-4 text-blue-500" />,
    <Zap className="w-4 h-4 text-amber-500" />,
    <Crown className="w-4 h-4 text-purple-500" />,
    <Rocket className="w-4 h-4 text-rose-500" />,
    <Star className="w-4 h-4 text-cyan-500" />,
  ];
  return iconList[index % iconList.length];
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
  IN_PROGRESS: { dot: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-[#F05A2B] dark:text-orange-400", label: "In Progress" },
  NOT_STARTED: { dot: "bg-slate-400", bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", label: "Not Started" },
  REVIEW: { dot: "bg-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", label: "Review" },
  ON_HOLD: { dot: "bg-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", label: "On Hold" },
  CANCELLED: { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", label: "Cancelled" },
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

// ─── Mobile Attachment List ───────────────────────────────────────────────────

function MobileAttachmentList({ attachments, onPreview }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-slate-800">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
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
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200/70 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/50 shrink-0">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">
                    {att.name || "Attachment"}
                  </p>
                  <span className="text-[9px] font-semibold text-gray-400 uppercase">{ext || "file"}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onPreview(att)}
                  title="Preview"
                  className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <a
                  href={att.url}
                  download={att.name || true}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download"
                  className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
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

// ─── Mobile Interactive Journey Map ───────────────────────────────────────────

function MobileJourneyMap({
  allMapNodes,
  selectedIndex,
  onSelectIndex,
  isCompleted,
}) {
  const containerRef = useRef(null);
  const nodeRefs = useRef([]);

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
    <div className="relative py-4 bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={containerRef} className="jm-scroll-container px-12 py-5 relative">
        <div className="flex items-center min-w-max gap-12 relative z-10 px-4">
          
          {/* Winding Connecting SVG Line */}
          <svg className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-8 pointer-events-none z-0 overflow-visible">
            <path
              d="M 0,16 Q 150,2 300,16 T 600,16 T 900,16 T 1200,16"
              fill="none"
              stroke="#334155"
              strokeWidth="3"
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
                className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 ${
                  isActive ? "jm-active-node scale-110" : "opacity-80"
                } ${isFuture ? "opacity-45" : ""}`}
              >
                <div className="mb-2 text-center">
                  <h4 className={`text-[11px] font-black truncate max-w-[100px] ${
                    isActive ? "text-white" : "text-slate-300"
                  }`}>
                    {node.title}
                  </h4>
                </div>

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all shadow-md relative ${
                    isActive
                      ? "bg-gradient-to-br from-[#F05A2B] to-[#E04A1B] border-white text-white ring-2 ring-[#F05A2B]/40"
                      : isFuture
                      ? "bg-slate-800/80 border-slate-700/80 text-slate-500 border-dashed"
                      : "bg-slate-800 border-slate-700 text-slate-200"
                  }`}
                >
                  {getMilestoneIcon(idx, isLastReal, isFuture)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between px-4 pt-2 border-t border-slate-800/80">
        <button
          onClick={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
          disabled={selectedIndex === 0}
          className="mobile-tappable flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-30 text-[11px] font-bold text-white"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>

        <span className="text-[11px] font-bold text-slate-300">
          <span className="text-[#F05A2B] font-black">{selectedIndex + 1}</span> / {allMapNodes.length}
        </span>

        <button
          onClick={() => onSelectIndex(Math.min(allMapNodes.length - 1, selectedIndex + 1))}
          disabled={selectedIndex === allMapNodes.length - 1}
          className="mobile-tappable flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-30 text-[11px] font-bold text-white"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
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

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editProjectSheetOpen, setEditProjectSheetOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Progress form
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formFiles, setFormFiles] = useState([]);

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
  const chronologicalMessages = [...messages].filter(msg => !msg.is_deleted);

  const timelineNodes = chronologicalMessages.map(msg => {
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
      title = firstLine.length > 50 ? firstLine.substring(0, 47) + "..." : firstLine;
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
      isFuture: false,
    };
  });

  const isCompleted = project?.status === "COMPLETED";
  const allMapNodes = [...timelineNodes];
  if (!isCompleted) {
    allMapNodes.push({
      id: "future-node",
      title: "Waiting for next update",
      dateStr: "Next Milestone",
      isFuture: true,
      accomplishment: "The project team hasn't submitted this milestone yet. Students can post the next update using the button below.",
      attachments: [],
      comments: [],
    });
  }

  useEffect(() => {
    if (timelineNodes.length > 0) {
      setSelectedIndex(timelineNodes.length - 1);
    } else if (!isCompleted) {
      setSelectedIndex(0);
    }
  }, [messages.length, isCompleted]);

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
    onSuccess: () => {
      refetchMessages();
      setFormTitle("");
      setFormText("");
      setFormFiles([]);
      setAddSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setTimeout(() => { setSelectedIndex(timelineNodes.length); }, 200);
    },
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
  if (!project) return null;

  const st = STATUS_MAP[project.status] || STATUS_MAP.IN_PROGRESS;
  const allMembers = project.members || [];
  const selectedNode = allMapNodes[selectedIndex] || allMapNodes[0];

  return (
    <div className="mobile-fade-in pb-12 space-y-4">
      {/* Back + Title Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/projects")} className="mobile-tappable p-2 -ml-2 rounded-xl">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress Journey</p>
          <h1 className="text-base font-black text-gray-900 dark:text-white truncate leading-tight">{project.name}</h1>
        </div>
        {isHOD && (
          <button onClick={() => setActionSheetOpen(true)} className="mobile-tappable p-2 rounded-xl text-gray-500">
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Project Status Summary Card */}
      <MobileCard>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.bg} ${st.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
          <span className="text-[10px] text-gray-400 ml-auto">
            <Clock className="w-3 h-3 inline mr-0.5" />
            {format(parseUTCDate(project.updated_at), "dd MMM yyyy")}
          </span>
        </div>
        {project.description && (
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{project.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex -space-x-1.5">
            {allMembers.slice(0, 5).map(m => (
              <AvatarCircle key={m.id} name={m.name} picture={m.profile_picture} size={5} />
            ))}
          </div>
          <span className="text-[10px] font-bold text-gray-400 ml-1">{allMembers.length} members</span>
        </div>
      </MobileCard>

      {/* ── Journey Map Section ── */}
      <MobileJourneyMap
        allMapNodes={allMapNodes}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        isCompleted={isCompleted}
      />

      {/* ── Selected Checkpoint Details Section (Below Map) ── */}
      {selectedNode && !selectedNode.isFuture ? (
        <MobileCard className="space-y-3">
          {/* Author row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <AvatarCircle name={selectedNode.author} picture={selectedNode.avatar} size={7} />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedNode.author}</span>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${ROLE_COLORS[selectedNode.role] || ROLE_COLORS.STUDENT}`}>
                    {selectedNode.role === "faculty" ? "Faculty" : selectedNode.role}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {selectedNode.dateStr}
                  {selectedNode.is_edited && <span className="italic ml-1">(edited)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {selectedNode.isOwn && selectedNode.canEdit && (
                <button
                  onClick={() => {
                    setEditingMsg({ id: selectedNode.id, title: selectedNode.title, content: selectedNode.accomplishment, created_at: selectedNode.dateRaw });
                    setAddSheetOpen(true);
                  }}
                  className="mobile-tappable p-1 text-gray-400 hover:text-indigo-600"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {(selectedNode.isOwn || isHOD) && (
                <button onClick={() => setDeleteTarget(selectedNode.id)} className="mobile-tappable p-1 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          {selectedNode.title && (
            <h3 className="text-xs font-black text-gray-900 dark:text-white leading-snug">{selectedNode.title}</h3>
          )}

          {/* Description */}
          {selectedNode.accomplishment && (
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">{selectedNode.accomplishment}</p>
          )}

          {/* Attachments */}
          <MobileAttachmentList attachments={selectedNode.attachments} onPreview={setPreviewAttachment} />

          {/* Faculty Comments */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Faculty Feedback {selectedNode.comments.length > 0 && `(${selectedNode.comments.length})`}
              </span>
            </div>

            {selectedNode.comments.filter(c => !c.is_deleted).map(comment => (
              <div key={comment.id} className="flex gap-2 items-start">
                <AvatarCircle name={comment.author?.name || "?"} picture={comment.author?.profile_picture} size={5} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{comment.author?.name}</span>
                    <span className="text-[9px] text-gray-400">{formatDistanceToNow(parseUTCDate(comment.created_at), { addSuffix: true })}</span>
                    {(isHOD || comment.author?.id === user?.id) && (
                      <button onClick={() => deleteCommentMutation.mutate({ msgId: selectedNode.id, commentId: comment.id })} className="mobile-tappable p-0.5 text-gray-300 hover:text-red-500 ml-auto">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl px-2.5 py-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {comment.content}
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {EMOJIS.map(emoji => {
                      const count = comment.reaction_counts?.[emoji] || 0;
                      const reacted = comment.user_reactions?.includes(emoji);
                      if (!isStudent && count === 0) return null;
                      return (
                        <button key={emoji}
                          onClick={() => isStudent && reactMutation.mutate({ msgId: selectedNode.id, commentId: comment.id, emoji })}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            reacted ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700" : "bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700/50"
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

            {(isFaculty || isHOD) && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const text = e.target.mobileFeedbackInput.value.trim();
                  if (!text) return;
                  await addCommentMutation.mutateAsync({ msgId: selectedNode.id, content: text });
                  e.target.reset();
                }}
                className="flex gap-2 mt-1"
              >
                <input
                  name="mobileFeedbackInput"
                  type="text"
                  placeholder="Write faculty feedback..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 min-w-0"
                />
                <button type="submit" className="mobile-tappable px-3 py-2 rounded-xl bg-indigo-600 text-white shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </MobileCard>
      ) : (
        <MobileCard className="text-center py-6 space-y-2">
          <Hourglass className="w-8 h-8 text-gray-400 mx-auto animate-pulse" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Upcoming Milestone</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{selectedNode?.accomplishment}</p>
        </MobileCard>
      )}

      {/* Student FAB to Post Progress */}
      {isStudent && (
        <MobileFAB onClick={() => { setEditingMsg(null); setAddSheetOpen(true); }} icon={Plus} label="Post Progress" />
      )}

      {/* Post/Edit Progress Bottom Sheet */}
      <BottomSheet open={addSheetOpen} onClose={() => { setAddSheetOpen(false); setEditingMsg(null); }} title={editingMsg ? "Edit Checkpoint" : "Post New Milestone"}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Checkpoint Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Completed API Integration..."
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description *</label>
            <textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Describe what was accomplished in detail..."
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
            disabled={sendMutation.isPending || editMutation.isPending || (!formTitle.trim() && !formText.trim())}
            className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(sendMutation.isPending || editMutation.isPending) ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {editingMsg ? "Save Checkpoint" : "Post Checkpoint"}
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
            className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500"><Edit2 className="w-4 h-4" /></div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Edit Project</span>
          </button>
        </div>
      </BottomSheet>

      {/* Edit Project Bottom Sheet */}
      <BottomSheet open={editProjectSheetOpen} onClose={() => setEditProjectSheetOpen(false)} title="Edit Project">
        <div className="space-y-3">
          <input
            type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
            placeholder="Project name"
            className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <textarea
            value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description" rows={3}
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
          />
          <button
            onClick={() => editProjectMutation.mutate({ name: editName, description: editDesc, members: allMembers.map(m => ({ user_id: m.id, role_in_project: m.role_in_project })) })}
            disabled={editProjectMutation.isPending || !editName.trim()}
            className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] text-white text-xs font-bold disabled:opacity-50"
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
        title="Delete Checkpoint"
        message="Are you sure you want to delete this progress checkpoint?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}
