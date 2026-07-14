import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { usePageTransition } from "../../context/TransitionContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, getMessages, postMessage, editMessage, deleteMessage,
  updateProjectStatus, updateProject, deleteProject
} from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  ArrowLeft, Edit2, Trash2, Paperclip, CheckCircle,
  Image, File, Download, FolderKanban, Plus, MoreVertical, Pencil,
  Calendar, Clock, ShieldAlert, X, TrendingUp, AlertCircle, LifeBuoy, FileText, User, Users
} from "lucide-react";
import { format } from "date-fns";

function getFileType(url) {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".avi")) {
    return "video";
  }
  if (lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc") || lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".ppt") || lower.endsWith(".pptx")) {
    return "document";
  }
  return "image";
}

function getDeterministicSize(str) {
  if (!str) return "1.2 MB";
  const hash = str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const size = (hash % 45) / 10 + 0.5;
  return `${size.toFixed(1)} MB`;
}

// ─── CSS Variables Definitions ───
// These are loaded locally and respect standard HIVE guidelines
const injectStyles = () => {
  if (document.getElementById("pm-redesign-styles")) return;
  const styleEl = document.createElement("style");
  styleEl.id = "pm-redesign-styles";
  styleEl.innerHTML = `
    :root {
      --pm-hero-bg: #0b1329;
      --pm-card-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
      --pm-progress-ring: #6366f1;
      --pm-success-bg: rgba(16, 185, 129, 0.1);
      --pm-warning-bg: rgba(245, 158, 11, 0.1);
      --pm-danger-bg: rgba(239, 68, 68, 0.1);
      --pm-support-bg: rgba(139, 92, 246, 0.1);
      --pm-history-line: #f1f5f9;
      --pm-history-dot: #6366f1;
      --pm-chip-bg: #f8fafc;
      --pm-chip-border: #f1f5f9;
      --pm-muted-border: #f1f5f9;
      --pm-section-title: #475569;
      --pm-empty-icon-bg: #f1f5f9;
    }
    .dark {
      --pm-hero-bg: #0b1329;
      --pm-card-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      --pm-progress-ring: #818cf8;
      --pm-success-bg: rgba(16, 185, 129, 0.2);
      --pm-warning-bg: rgba(245, 158, 11, 0.2);
      --pm-danger-bg: rgba(239, 68, 68, 0.2);
      --pm-support-bg: rgba(139, 92, 246, 0.2);
      --pm-history-line: #1e293b;
      --pm-history-dot: #818cf8;
      --pm-chip-bg: #1e293b;
      --pm-chip-border: #334155;
      --pm-muted-border: #1e293b;
      --pm-section-title: #94a3b8;
      --pm-empty-icon-bg: #1e293b;
    }
    .info-card-glow-redesign {
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .info-card-glow-redesign:hover {
      border-color: rgba(99, 102, 241, 0.3) !important;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.06) !important;
    }
  `;
  document.head.appendChild(styleEl);
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { navigateWithTransition } = usePageTransition();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  useEffect(() => {
    injectStyles();
  }, []);

  // Modals state
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUpdateId, setSelectedUpdateId] = useState(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);

  // Edit Project fields
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  // Add/Edit Progress Update fields
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formCompletion, setFormCompletion] = useState(0);
  const [formStatus, setFormStatus] = useState("In Progress");
  const [formCompletedThisWeek, setFormCompletedThisWeek] = useState("");
  const [formNextMilestone, setFormNextMilestone] = useState("");
  const [formChallenges, setFormChallenges] = useState("");
  const [formSupport, setFormSupport] = useState("");
  const [formAttachment, setFormAttachment] = useState(null);

  // Check URL query parameters for direct triggers
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "true") {
      setAddModalOpen(true);
      setEditingMsg(null);
      // Clean up search parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch Project
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id).then(r => r.data.project),
  });

  // Fetch Progress Updates
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => getMessages(id, { page: 1 }).then(r => r.data),
  });

  const messages = messagesData?.messages || [];
  const reversedMessages = [...messages].reverse();

  // Sync edit project form
  useEffect(() => {
    if (project) {
      setEditProjectName(project.name || "");
      setEditProjectDesc(project.description || "");
    }
  }, [project]);

  // Sync add/edit progress form when editingMsg changes
  useEffect(() => {
    if (editingMsg) {
      let parsed = {};
      try {
        parsed = JSON.parse(editingMsg.content);
      } catch (e) {
        parsed = {
          title: "Progress Update",
          accomplishment: editingMsg.content || ""
        };
      }
      setFormTitle(parsed.title || "Progress Update");
      setFormSummary(parsed.summary || parsed.accomplishment || "");
      setFormCompletion(typeof parsed.completion === "number" ? parsed.completion : 0);
      setFormStatus(parsed.status || "In Progress");
      setFormCompletedThisWeek(parsed.completed_this_week || parsed.accomplishment || "");
      setFormNextMilestone(parsed.next_milestone || parsed.next || "");
      setFormChallenges(parsed.challenges || "");
      setFormSupport(parsed.support || "");
    } else {
      setFormTitle("");
      setFormSummary("");
      setFormCompletion(0);
      setFormStatus("In Progress");
      setFormCompletedThisWeek("");
      setFormNextMilestone("");
      setFormChallenges("");
      setFormSupport("");
    }
    setFormAttachment(null);
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

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (formData) => postMessage(id, formData),
    onSuccess: () => {
      refetchMessages();
      setFormTitle("");
      setFormSummary("");
      setFormCompletion(0);
      setFormStatus("In Progress");
      setFormCompletedThisWeek("");
      setFormNextMilestone("");
      setFormChallenges("");
      setFormSupport("");
      setFormAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, content }) => editMessage(id, messageId, { content }),
    onSuccess: () => {
      setEditingMsg(null);
      refetchMessages();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId) => deleteMessage(id, messageId),
    onSuccess: () => {
      setDeleteTarget(null);
      refetchMessages();
    },
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

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(id),
    onSuccess: () => {
      setDeleteProjectTarget(false);
      navigateWithTransition("/projects", "Projects", FolderKanban);
    }
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
    if (formAttachment && formAttachment.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }
    const contentJson = JSON.stringify({
      title: formTitle,
      summary: formSummary,
      completion: Number(formCompletion),
      status: formStatus,
      completed_this_week: formCompletedThisWeek,
      next_milestone: formNextMilestone,
      challenges: formChallenges,
      support: formSupport
    });

    if (editingMsg) {
      editMutation.mutate({ messageId: editingMsg.id, content: contentJson });
    } else {
      const formData = new FormData();
      formData.append("content", contentJson);
      if (formAttachment) {
        formData.append("attachment", formAttachment);
      }
      sendMutation.mutate(formData);
    }
    setAddModalOpen(false);
    setEditingMsg(null);
  };

  // Group and format members
  const facultyMembers = project.members?.filter(m => m.role_in_project === "faculty") || [];
  const forumMembers = project.members?.filter(m => m.role_in_project === "forum_member") || [];
  const studentMembers = project.members?.filter(m => m.role_in_project === "student") || [];

  const allMembers = [
    ...facultyMembers,
    ...forumMembers,
    ...studentMembers
  ];
  const leadAdvisor = facultyMembers[0]?.name || "Unassigned Advisor";

  // Parse all messages into timeline nodes
  const timelineNodes = reversedMessages.filter(msg => !msg.is_deleted).map(msg => {
    let uData = {
      title: "Progress Update",
      summary: "",
      completion: 0,
      status: "In Progress",
      completed_this_week: "",
      next_milestone: "",
      challenges: "",
      support: ""
    };
    try {
      const parsed = JSON.parse(msg.content);
      uData = {
        title: parsed.title || "Progress Update",
        summary: parsed.summary || parsed.accomplishment || "",
        completion: typeof parsed.completion === "number" ? parsed.completion : 0,
        status: parsed.status || "In Progress",
        completed_this_week: parsed.completed_this_week || parsed.accomplishment || "",
        next_milestone: parsed.next_milestone || parsed.next || "",
        challenges: parsed.challenges || "",
        support: parsed.support || ""
      };
    } catch (e) {
      uData.summary = msg.content || "";
      uData.completed_this_week = msg.content || "";
    }
    return {
      id: msg.id,
      dateStr: format(new Date(msg.created_at), "MMM d, yyyy · h:mm a"),
      dateOnly: format(new Date(msg.created_at), "MMM d, yyyy"),
      timeOnly: format(new Date(msg.created_at), "h:mm a"),
      author: msg.sender?.name || "Unknown",
      role: msg.sender?.role || "STUDENT",
      avatar: msg.sender?.profile_picture,
      status: uData.status,
      title: uData.title,
      summary: uData.summary,
      completion: uData.completion,
      attachmentUrl: msg.attachment_url,
      attachmentName: msg.attachment_name,
      updateData: uData,
      fullMsg: msg
    };
  });

  const hasUpdates = timelineNodes.length > 0;

  // Determine currently selected progress update
  const currentUpdate = timelineNodes.find(n => n.id === selectedUpdateId) || timelineNodes[0];

  const updateData = currentUpdate ? currentUpdate.updateData : {
    title: "Progress Update",
    summary: "",
    completion: 0,
    status: project.status || "In Progress",
    completed_this_week: "",
    next_milestone: "",
    challenges: "",
    support: ""
  };

  const currentCompletion = currentUpdate ? currentUpdate.completion : 0;

  // Gather attachments across all updates
  const allAttachments = timelineNodes.filter(node => node.attachmentUrl);

  const getStatusBadgeColor = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("complete")) return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/30";
    if (s.includes("progress")) return "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30";
    if (s.includes("review")) return "bg-blue-50 dark:bg-blue-950/20 text-blue-655 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
    if (s.includes("hold")) return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-100 dark:border-amber-900/30";
    return "bg-slate-50 dark:bg-slate-805 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  };

  // Avatar styling helpers
  const getAvatarBg = (name = "A") => {
    const char = name.charAt(0).toUpperCase();
    const colors = {
      S: "bg-indigo-605 text-white",
      P: "bg-emerald-605 text-white",
      Y: "bg-amber-605 text-white",
      Z: "bg-rose-605 text-white"
    };
    return colors[char] || "bg-indigo-500 text-white";
  };

  return (
    <div className="flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pb-4 space-y-4 font-sans leading-relaxed text-[14px]">
      
      {/* ─── DESKTOP HEADER (Hidden on Mobile) ─── */}
      <div className="hidden lg:flex justify-between items-start shrink-0">
        <div className="space-y-1">
          <div
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-655 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
          </div>
          <h1 className="text-[34px] font-black text-slate-905 dark:text-white tracking-tight mt-1.5 leading-none">Progress monitor</h1>
          <p className="text-xs text-slate-405 dark:text-slate-500 font-semibold mt-0.5">Current state of the project, at a glance</p>
        </div>

        <div className="flex items-center gap-3 mt-1">
          {/* Add Progress primary button (Stands out when empty) */}
          <button
            onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
            className={`px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all flex items-center gap-2 ${
              !hasUpdates ? "ring-4 ring-indigo-500/30 animate-pulse border border-indigo-400" : ""
            }`}
          >
            <Plus className="w-4 h-4" /> Add progress
          </button>

          {/* Kebab Action Menu */}
          <div className="relative">
            <button
              onClick={() => setKebabOpen(!kebabOpen)}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all shrink-0"
              title="Project Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {kebabOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setKebabOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-40 py-1.5 animate-fade-in">
                  <button
                    onClick={() => { setKebabOpen(false); setEditProjectModalOpen(true); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Edit Project
                  </button>
                  {project.status !== "COMPLETED" && (
                    <button
                      onClick={() => { setKebabOpen(false); statusMutation.mutate("COMPLETED"); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {isHOD && (
                    <button
                      onClick={() => { setKebabOpen(false); setDeleteProjectTarget(true); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      Delete Project
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── MOBILE HEADER (Hidden on Desktop) ─── */}
      <div className="flex flex-col gap-3 lg:hidden shrink-0">
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="w-9 h-9 rounded-xl border border-slate-202 dark:border-slate-800 flex items-center justify-center text-slate-655 dark:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">Progress monitor</h1>
          
          <div className="relative">
            <button
              onClick={() => setKebabOpen(!kebabOpen)}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-350"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {kebabOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setKebabOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-40 py-1.5">
                  <button
                    onClick={() => { setKebabOpen(false); setEditProjectModalOpen(true); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Edit Project
                  </button>
                  {project.status !== "COMPLETED" && (
                    <button
                      onClick={() => { setKebabOpen(false); statusMutation.mutate("COMPLETED"); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {isHOD && (
                    <button
                      onClick={() => { setKebabOpen(false); setDeleteProjectTarget(true); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      Delete Project
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
          className="w-full py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add progress
        </button>
      </div>

      {/* ─── MAIN DESKTOP GRID LAYOUT ─── */}
      <div className="hidden lg:grid lg:grid-cols-10 gap-5 flex-1 min-h-0 lg:overflow-hidden">
        
        {/* Left Column Timeline (~30%) */}
        <div className="col-span-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col h-full min-h-0 shadow-xs relative">
          <div className="flex items-center justify-between shrink-0 mb-3">
            <span className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight leading-none">Progress History</span>
            <span
              onClick={() => navigateWithTransition(`/projects/${id}/progress`, "Progress History", Calendar)}
              className="text-[12px] font-bold text-indigo-655 dark:text-indigo-400 hover:underline cursor-pointer transition-colors"
            >
              View all Progress
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 relative no-scrollbar">
            {/* Connecting Vertical Line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-[2px] bg-slate-100 dark:bg-slate-800 z-0" />
            
            {!hasUpdates ? (
              <div className="text-xs text-slate-400 italic text-center py-12">No progress updates published yet.</div>
            ) : (
              timelineNodes.map((node) => {
                const isActive = currentUpdate?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedUpdateId(node.id)}
                    className={`relative z-10 flex items-start gap-4 p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-800 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                    }`}
                  >
                    {/* Node dot icon */}
                    <div className="flex items-center justify-center shrink-0 w-[14px] h-[14px] mt-1 relative">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 transition-all flex items-center justify-center ${
                        isActive
                          ? "border-indigo-650 ring-4 ring-indigo-100 dark:ring-indigo-950/30 scale-110"
                          : "border-slate-350"
                      }`}>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-650" />}
                      </div>
                    </div>
                    
                    {/* Compact timeline card details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{node.dateStr}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border leading-none scale-95 shrink-0 ${getStatusBadgeColor(node.status)}`}>
                          {node.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-850 dark:text-slate-205 truncate">{node.author}</span>
                        <span className="text-[8.5px] font-black uppercase text-slate-400 truncate max-w-[100px]">({project.name})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                        {node.summary}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column Content (~70%) */}
        <div className="col-span-7 flex flex-col h-full min-h-0 gap-4">
          
          {/* ─── Hero Card ─── */}
          <div className="bg-[#0b1329] text-white p-5 rounded-2xl flex items-center justify-between shrink-0 h-[115px] relative overflow-hidden shadow-sm">
            <div className="flex items-center gap-5 min-w-0 flex-1">
              
              {/* Circular Progress Ring */}
              <div className="relative w-18 h-18 flex items-center justify-center shrink-0 bg-slate-900/40 rounded-full border border-slate-800">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle stroke="rgba(255, 255, 255, 0.05)" fill="transparent" strokeWidth="4.5" r="25" cx="32" cy="32" />
                  <circle
                    stroke="var(--pm-progress-ring, #6366f1)"
                    fill="transparent"
                    strokeWidth="4.5"
                    strokeDasharray={2 * Math.PI * 25}
                    strokeDashoffset={2 * Math.PI * 25 * (1 - heroCompletion / 100)}
                    strokeLinecap="round"
                    r="25"
                    cx="32"
                    cy="32"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-black tracking-tight leading-none">{heroCompletion}%</span>
                  <span className="text-[7px] text-slate-400 font-extrabold uppercase mt-0.5">Complete</span>
                </div>
              </div>

              {/* Middle Section */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-black tracking-tight text-white truncate max-w-[280px]">{heroProjectName}</h2>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none scale-95 shrink-0 ${
                    hasUpdates ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  }`}>
                    {heroStatus.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-350 max-w-xl line-clamp-2 leading-relaxed font-medium">
                  {heroSummary}
                </p>
              </div>
            </div>

            {/* Top Right / Bottom Right Details Panel */}
            <div className="flex flex-col justify-between items-end h-16 shrink-0 pl-4 border-l border-slate-800">
              {/* Last Updated By */}
              <div className="text-right">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">Last update</span>
                <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                  {hasUpdates ? (
                    <>
                      {currentUpdate.avatar ? (
                        <img src={currentUpdate.avatar} alt={currentUpdate.author} className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] ${getAvatarBg(currentUpdate.author)}`}>
                          {currentUpdate.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-white leading-none">{currentUpdate.author}</span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 leading-none">No updates yet</span>
                  )}
                </div>
              </div>

              {/* Bottom Right: Team Avatars overlapping */}
              <div className="flex -space-x-2 overflow-hidden justify-end">
                {allMembers.slice(0, 5).map((m) => {
                  const initial = m.name ? m.name.charAt(0).toUpperCase() : "M";
                  return m.profile_picture ? (
                    <img
                      key={m.id}
                      src={m.profile_picture}
                      alt={m.name}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0b1329] object-cover"
                      title={m.name}
                    />
                  ) : (
                    <div
                      key={m.id}
                      className={`inline-block h-6 w-6 rounded-full ring-2 ring-[#0b1329] flex items-center justify-center font-black text-[8px] ${getAvatarBg(m.name)}`}
                      title={m.name}
                    >
                      {initial}
                    </div>
                  );
                })}
                {allMembers.length > 5 && (
                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0b1329] bg-slate-800 text-white flex items-center justify-center font-bold text-[8px]">
                    +{allMembers.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── 2x2 Information Grid ─── */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {/* Card 1: Completed This Week */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:border-indigo-500/20 hover:shadow-sm transition-all h-full min-h-0 info-card-glow-redesign">
              <div className="space-y-2">
                <div className="flex gap-2.5 items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 shadow-xs border-emerald-200/60">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Completed This Week</span>
                </div>
                <p className={`text-[12px] font-semibold leading-relaxed pl-0.5 line-clamp-4 ${!updateData.completed_this_week ? "text-slate-400 dark:text-slate-500 italic" : "text-slate-655 dark:text-slate-300"}`}>
                  {updateData.completed_this_week || "No completed work yet."}
                </p>
              </div>
            </div>

            {/* Card 2: Next Milestone */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:border-indigo-500/20 hover:shadow-sm transition-all h-full min-h-0 info-card-glow-redesign">
              <div className="space-y-2">
                <div className="flex gap-2.5 items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 shadow-xs border-indigo-200/60">
                    <TrendingUp className="w-4 h-4 text-indigo-650" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Next Milestone</span>
                </div>
                <p className={`text-[12px] font-semibold leading-relaxed pl-0.5 line-clamp-4 ${!updateData.next_milestone ? "text-slate-400 dark:text-slate-500 italic" : "text-slate-655 dark:text-slate-300"}`}>
                  {updateData.next_milestone || "No milestone defined."}
                </p>
              </div>
            </div>

            {/* Card 3: Challenges / Blockers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:border-indigo-500/20 hover:shadow-sm transition-all h-full min-h-0 info-card-glow-redesign">
              <div className="space-y-2">
                <div className="flex gap-2.5 items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 shadow-xs border-rose-200/60">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-wider">Challenges / Blockers</span>
                </div>
                <p className={`text-[12px] font-semibold leading-relaxed pl-0.5 line-clamp-4 ${!updateData.challenges ? "text-slate-400 dark:text-slate-500 italic" : "text-slate-655 dark:text-slate-300"}`}>
                  {updateData.challenges || "No blockers reported."}
                </p>
              </div>
            </div>

            {/* Card 4: Support Needed */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:border-indigo-500/20 hover:shadow-sm transition-all h-full min-h-0 info-card-glow-redesign">
              <div className="space-y-2">
                <div className="flex gap-2.5 items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 shadow-xs border-amber-200/60">
                    <LifeBuoy className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Support Needed</span>
                </div>
                <p className={`text-[12px] font-semibold leading-relaxed pl-0.5 line-clamp-4 ${!updateData.support ? "text-slate-400 dark:text-slate-500 italic" : "text-slate-655 dark:text-slate-300"}`}>
                  {updateData.support || "No support requested."}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Attachments Section ─── */}
          <div className="shrink-0 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 flex flex-col justify-center min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 leading-none">Attachments ({allAttachments.length})</span>
            {allAttachments.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-none py-1 h-[56px] items-center">
                {allAttachments.map(node => (
                  <a
                    key={node.id}
                    href={node.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl hover:-translate-y-0.5 transition-all shadow-xs shrink-0 w-[200px] h-[48px]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      {node.attachmentName?.toLowerCase().endsWith(".pdf") ? (
                        <FileText className="w-3.5 h-3.5" />
                      ) : ["png", "jpg", "jpeg", "webp"].some(ext => node.attachmentName?.toLowerCase().endsWith(ext)) ? (
                        <Image className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-850 dark:text-slate-205 truncate leading-tight">{node.attachmentName || "Attachment"}</span>
                      <span className="block text-[9px] text-slate-400 font-bold leading-none mt-0.5">{getDeterministicSize(node.attachmentName || node.attachmentUrl)}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl h-[56px] flex items-center justify-center gap-3 px-4 text-center">
                <Paperclip className="w-4 h-4 text-slate-405 dark:text-slate-500 shrink-0" />
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-350 leading-none">No attachments added yet</p>
                  <p className="text-[9px] text-slate-400 mt-1 leading-none">Upload screenshots, PDFs or supporting documents.</p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ─── MOBILE VIEWPORT LAYOUT (Hidden on Desktop) ─── */}
      <div className="flex flex-col lg:hidden gap-4 flex-1">
        {/* Mobile Hero centered */}
        <div className="bg-[#0b1329] text-white p-5 rounded-2xl flex flex-col items-center text-center gap-4 relative overflow-hidden shadow-sm shrink-0">
          <div className="space-y-1">
            <h2 className="text-base font-black tracking-tight text-white">{project.name}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border leading-none ${
                hasUpdates ? "bg-emerald-500/10 text-emerald-405 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}>
                {heroStatus.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="relative w-20 h-20 flex items-center justify-center bg-slate-900/40 rounded-full border border-slate-800 shrink-0">
            <svg className="w-18 h-18 transform -rotate-90">
              <circle stroke="rgba(255, 255, 255, 0.05)" fill="transparent" strokeWidth="4.5" r="28" cx="36" cy="36" />
              <circle
                stroke="#6366f1"
                fill="transparent"
                strokeWidth="4.5"
                strokeDasharray={2 * Math.PI * 28}
                strokeDashoffset={2 * Math.PI * 28 * (1 - heroCompletion / 100)}
                strokeLinecap="round"
                r="28"
                cx="36"
                cy="36"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xs font-black tracking-tight leading-none">{heroCompletion}%</span>
              <span className="text-[7px] text-slate-400 font-extrabold uppercase mt-0.5">Complete</span>
            </div>
          </div>

          <div className="space-y-3.5 w-full flex flex-col items-center">
            <p className="text-xs text-slate-350 max-w-xs leading-relaxed font-medium">
              {heroSummary}
            </p>
            <div className="text-[10px] text-slate-400 font-semibold leading-none">
              {hasUpdates ? (
                <span>Last updated by <strong className="text-white">{currentUpdate.author}</strong> on {currentUpdate.dateOnly}</span>
              ) : (
                <span>No updates yet</span>
              )}
            </div>

            <div className="flex -space-x-2 overflow-hidden justify-center">
              {allMembers.slice(0, 5).map((m) => {
                const initial = m.name ? m.name.charAt(0).toUpperCase() : "M";
                return m.profile_picture ? (
                  <img
                    key={m.id}
                    src={m.profile_picture}
                    alt={m.name}
                    className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#0b1329] object-cover"
                  />
                ) : (
                  <div
                    key={m.id}
                    className={`inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#0b1329] flex items-center justify-center font-black text-[8px] ${getAvatarBg(m.name)}`}
                  >
                    {initial}
                  </div>
                );
              })}
              {allMembers.length > 5 && (
                <div className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#0b1329] bg-slate-800 text-white flex items-center justify-center font-bold text-[8px]">
                  +{allMembers.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Info Cards */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Completed</span>
            </div>
            <p className={`text-[11px] font-semibold line-clamp-3 leading-snug ${!updateData.completed_this_week ? "text-slate-400 italic" : "text-slate-700 dark:text-slate-300"}`}>
              {updateData.completed_this_week || "No completed work yet."}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <TrendingUp className="w-4 h-4 text-indigo-650 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Milestone</span>
            </div>
            <p className={`text-[11px] font-semibold line-clamp-3 leading-snug ${!updateData.next_milestone ? "text-slate-400 italic" : "text-slate-700 dark:text-slate-300"}`}>
              {updateData.next_milestone || "No milestone defined."}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Challenges</span>
            </div>
            <p className={`text-[11px] font-semibold line-clamp-3 leading-snug ${!updateData.challenges ? "text-slate-400 italic" : "text-slate-705 dark:text-slate-300"}`}>
              {updateData.challenges || "No blockers reported."}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <LifeBuoy className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Support</span>
            </div>
            <p className={`text-[11px] font-semibold line-clamp-3 leading-snug ${!updateData.support ? "text-slate-400 italic" : "text-slate-700 dark:text-slate-300"}`}>
              {updateData.support || "No support requested."}
            </p>
          </div>
        </div>

        {/* Mobile Attachments */}
        <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 flex flex-col justify-center min-w-0 shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 leading-none">Attachments ({allAttachments.length})</span>
          {allAttachments.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none py-1">
              {allAttachments.map(node => (
                <a
                  key={node.id}
                  href={node.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xs shrink-0 w-[180px]"
                >
                  <div className="w-7.5 h-7.5 rounded-lg bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    {node.attachmentName?.toLowerCase().endsWith(".pdf") ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : ["png", "jpg", "jpeg", "webp"].some(ext => node.attachmentName?.toLowerCase().endsWith(ext)) ? (
                      <Image className="w-3.5 h-3.5" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-205 truncate leading-tight">{node.attachmentName || "Attachment"}</span>
                    <span className="block text-[8.5px] text-slate-400 font-bold leading-none mt-0.5">{getDeterministicSize(node.attachmentName || node.attachmentUrl)}</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </a>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-center gap-3 text-center">
              <Paperclip className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">No attachments added yet</span>
            </div>
          )}
        </div>

        {/* Mobile Timeline section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center shadow-xs shrink-0 space-y-3.5">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Progress History ({timelineNodes.length})</span>
            <span
              onClick={() => navigateWithTransition(`/projects/${id}/progress`, "Progress History", Calendar)}
              className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer transition-colors"
            >
              View all Progress →
            </span>
          </div>

          <div className="space-y-2.5">
            {!hasUpdates ? (
              <div className="text-xs text-slate-400 italic text-center py-4">No progress updates published yet.</div>
            ) : (
              timelineNodes.slice(0, 2).map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedUpdateId(node.id)}
                  className="p-3 bg-slate-55 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{node.dateStr}</span>
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full border leading-none scale-95 ${getStatusBadgeColor(node.status)}`}>
                      {node.status}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-855 dark:text-slate-205">{node.author}</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    {node.summary}
                  </p>
                </div>
              ))
            )}
          </div>

          {timelineNodes.length > 2 && (
            <button
              onClick={() => navigateWithTransition(`/projects/${id}/progress`, "Progress History", Calendar)}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
            >
              View all Progress
            </button>
          )}
        </div>

      </div>

      {/* ─── Edit Project Modal ─── */}
      <Modal open={editProjectModalOpen} onClose={() => setEditProjectModalOpen(false)} title="Edit Project">
        <form onSubmit={handleEditProjectSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Project Name</label>
            <input
              type="text"
              value={editProjectName}
              onChange={e => setEditProjectName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Description</label>
            <textarea
              value={editProjectDesc}
              onChange={e => setEditProjectDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditProjectModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Add / Edit Progress Update Modal ─── */}
      <Modal open={addModalOpen} onClose={() => { setAddModalOpen(false); setEditingMsg(null); }} title={editingMsg ? "Edit Progress Update" : "Publish Progress Update"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 scrollbar-premium">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Update Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g., Sprint 1 Demo, UI Design Completed..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Short Summary *</label>
            <input
              type="text"
              value={formSummary}
              onChange={e => setFormSummary(e.target.value)}
              placeholder="Brief 1-sentence overview of current progress..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Completion Percentage ({formCompletion}%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formCompletion}
                  onChange={e => setFormCompletion(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Current Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Completed This Week</label>
            <textarea
              value={formCompletedThisWeek}
              onChange={e => setFormCompletedThisWeek(e.target.value)}
              placeholder="What tasks did you complete this week?"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Next Milestone</label>
            <textarea
              value={formNextMilestone}
              onChange={e => setFormNextMilestone(e.target.value)}
              placeholder="What are the next goals / sprint plan?"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Challenges / Blockers</label>
            <textarea
              value={formChallenges}
              onChange={e => setFormChallenges(e.target.value)}
              placeholder="Any technical or resource blockers? (Optional)"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Support Needed</label>
            <textarea
              value={formSupport}
              onChange={e => setFormSupport(e.target.value)}
              placeholder="Any support, reviews, or approvals needed? (Optional)"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          {!editingMsg && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Attachment</label>
              {formAttachment ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/20">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px] sm:max-w-md">
                    {formAttachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormAttachment(null)}
                    className="p-1 rounded-lg hover:bg-red-55 dark:hover:bg-red-955/20 text-gray-450 hover:text-red-550 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-500 dark:border-gray-700 dark:hover:border-indigo-500 cursor-pointer bg-white dark:bg-gray-800/40 transition-colors text-center font-sans">
                  <Paperclip className="w-5 h-5 text-gray-400 dark:text-gray-555 mb-1" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Attach file (Max 10MB)</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert("File size exceeds 10MB limit.");
                          e.target.value = null;
                          return;
                        }
                        setFormAttachment(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setAddModalOpen(false); setEditingMsg(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendMutation.isPending || editMutation.isPending}
            >
              {editingMsg ? "Save Update" : "Publish Update"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Progress Update Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Progress Update"
        message="Are you sure you want to delete this progress update?"
        confirmText="Delete"
        danger
      />

      {/* Delete Project Confirmation */}
      <ConfirmDialog
        open={!!deleteProjectTarget}
        onClose={() => setDeleteProjectTarget(false)}
        onConfirm={() => deleteProjectMutation.mutate()}
        title="Delete Project"
        message={`Are you sure you want to delete this project (${project.name})? This action is permanent and cannot be undone.`}
        confirmText={deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
        danger
      />
    </div>
  );
}
