import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import gsap from "gsap";
import { usePageTransition } from "../../context/TransitionContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, getMessages, postMessage, editMessage, deleteMessage,
  updateProjectStatus, updateProject
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
  Calendar, Clock, ShieldAlert, X, TrendingUp, AlertCircle, LifeBuoy, FileText, User, Users, ArrowRight
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

function AttachmentCard({ url, name }) {
  const ext = name ? name.split(".").pop().toLowerCase() : "";
  const isPdf = ext === "pdf";
  const isZip = ext === "zip" || ext === "rar";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);

  let iconBg = "bg-blue-500/10 text-blue-600";
  let icon = <File className="w-4 h-4" />;

  if (isPdf) {
    iconBg = "bg-rose-500/10 text-rose-650 dark:text-rose-455";
    icon = <FileText className="w-4 h-4" />;
  } else if (isZip) {
    iconBg = "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400";
    icon = <FolderKanban className="w-4 h-4" />;
  } else if (isImage) {
    iconBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    icon = <Image className="w-4 h-4" />;
  }

  const fileSize = getDeterministicSize(name || url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3.5 p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl hover:-translate-y-0.5 transition-all shadow-xs shrink-0 w-[220px]"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate leading-tight">{name || "Attachment"}</span>
        <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 leading-none">{fileSize}</span>
      </div>
    </a>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { navigateWithTransition } = usePageTransition();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  // Modals state
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUpdateId, setSelectedUpdateId] = useState(null);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [viewAllProgress, setViewAllProgress] = useState(false);

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

  // Determine currently selected progress update
  const currentUpdate = timelineNodes.find(n => n.id === selectedUpdateId) || timelineNodes[0];

  const updateData = currentUpdate ? currentUpdate.updateData : {
    title: "Vibe chat — social media platform",
    summary: "No updates posted yet.",
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

  // Avatar styling helpers
  const getAvatarBg = (name = "A") => {
    const char = name.charAt(0).toUpperCase();
    const colors = {
      S: "bg-indigo-600 text-white",
    Z: "bg-rose-600 text-white"
    };
    return colors[char] || "bg-indigo-500 text-white";
  };

  if (viewAllProgress) {
    return (
      <div className="flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pb-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start shrink-0 gap-4">
          <div className="space-y-1 text-left">
            <div
              onClick={() => setViewAllProgress(false)}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-655 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to progress monitor
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 leading-none">
              All progress updates
            </h1>
            <p className="text-xs text-slate-405 dark:text-slate-500 font-semibold mt-0.5">
              History of progress logs for {project.name}
            </p>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-premium relative pl-8 py-4 max-w-[800px] mx-auto w-full">
          {timelineNodes.length === 0 ? (
            <div className="text-sm font-semibold text-slate-400 italic py-12 text-center">
              No progress updates published yet.
            </div>
          ) : (
            <>
              {/* Vertical Connector Line */}
              <div className="absolute left-[39px] top-6 bottom-6 w-[2px] bg-indigo-50 dark:bg-slate-850" />

              <div className="space-y-6 relative z-10 pt-2">
                {timelineNodes.map((node) => (
                  <div
                    key={node.id}
                    className="relative pl-8 pb-2 text-left"
                  >
                    {/* Node Dot */}
                    <div className="absolute left-[-5px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-indigo-605 bg-white dark:bg-slate-900" />
                    
                    {/* Entry Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">{node.dateStr}</span>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">• By {node.author}</span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-50 dark:bg-slate-800 text-slate-555 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 leading-none">{node.role}</span>
                        </div>
                        
                        <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border leading-none ${
                          node.status === "Completed"
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400 border-emerald-250"
                            : "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 border-indigo-250"
                        }`}>
                          {node.status}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-black text-slate-900 dark:text-white mt-3 leading-tight">{node.title}</h3>
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 leading-relaxed whitespace-pre-wrap font-medium">{node.summary}</p>
                      
                      {node.attachmentUrl && (
                        <div className="mt-4">
                          <AttachmentCard url={node.attachmentUrl} name={node.attachmentName} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pb-4 space-y-4">
      {/* Top Header Navigation bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start shrink-0 gap-4">
        <div className="space-y-1 text-left">
          <div
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-655 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 leading-none">Progress monitor</h1>
          <p className="text-xs text-slate-405 dark:text-slate-500 font-semibold mt-0.5">Current state of {project.name}, at a glance</p>
        </div>

        <div className="flex items-center justify-end gap-2 relative pm-kebab-container shrink-0">
          <button
            onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
            className="px-4 h-9 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add progress
          </button>
          
          <button
            onClick={() => setKebabOpen(!kebabOpen)}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-505 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {kebabOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-155 dark:border-slate-800 py-1 z-35 animate-fade-in text-left">
              {project.status !== "COMPLETED" && (
                <button
                  onClick={() => {
                    statusMutation.mutate("COMPLETED");
                    setKebabOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-emerald-605 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold transition-colors text-left"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Mark completed
                </button>
              )}
              <button
                onClick={() => {
                  setEditProjectModalOpen(true);
                  setKebabOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold transition-colors text-left"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout (>=1024px) */}
      <div className="hidden lg:grid grid-cols-[28%_72%] gap-5 flex-1 min-h-0 overflow-hidden h-full">
        {/* Left column: Update History */}
        <div className="flex flex-col h-full overflow-hidden border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">UPDATE HISTORY</span>
            <span
              onClick={() => setViewAllProgress(true)}
              className="text-[10px] font-black text-indigo-655 dark:text-indigo-405 hover:underline cursor-pointer flex items-center gap-1"
            >
              View all progress <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          
          {/* Timeline List */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-premium relative pl-6">
            {timelineNodes.length === 0 ? (
              <div className="text-xs font-semibold text-slate-400 italic py-6 text-center">No progress updates published yet.</div>
            ) : (
              <>
                {/* Connecting Line */}
                <div className="absolute left-[30px] top-4 bottom-4 w-[2px] bg-indigo-50 dark:bg-slate-855" />
                
                <div className="space-y-6 relative z-10 pt-2">
                  {timelineNodes.map((node, index) => {
                    const isActive = currentUpdate?.id === node.id;
                    const isNewest = index === 0;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedUpdateId(node.id)}
                        className={`group flex flex-col cursor-pointer transition-all border p-3.5 rounded-xl text-left relative ${
                          isActive
                            ? "bg-slate-50/50 dark:bg-slate-950/20 border-indigo-200 dark:border-indigo-900/60 ring-2 ring-indigo-500/10"
                            : "bg-white dark:bg-slate-900 border-transparent hover:border-slate-155 dark:hover:border-slate-800"
                        }`}
                      >
                        {/* Dot */}
                        <div className="absolute left-[-16px] top-4 mt-0.5">
                          <div className={`w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center transition-all ${
                            isNewest ? "border-indigo-605 bg-indigo-605" : "border-slate-350"
                          }`}>
                            {isNewest && <div className="w-1 h-1 rounded-full bg-white" />}
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider">
                            {node.dateStr}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 shrink-0">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-205 truncate max-w-[100px]">{node.author}</span>
                            <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded border scale-95 leading-none ${
                              isActive
                                ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 border-indigo-200 dark:border-indigo-850"
                                : "bg-slate-50 dark:bg-slate-805/60 text-slate-505 border-slate-200/50 dark:border-slate-700/50"
                            }`}>
                              {node.role}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 truncate">
                            {node.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-455 mt-1 line-clamp-3 leading-relaxed font-medium">
                            {node.summary}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right column: Dark hero, 2x2 grid, Attachments */}
        <div className="flex flex-col h-full overflow-y-auto pr-1 scrollbar-premium gap-4">
          {/* Dark Navy Hero Card */}
          <div className="bg-[#0b1329] text-white p-5 rounded-2xl flex items-center justify-between shrink-0 min-h-[140px] relative overflow-hidden shadow-sm text-left">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              {/* Circular SVG Progress Meter */}
              <div className="relative w-18 h-18 flex items-center justify-center shrink-0 bg-slate-900/40 rounded-full border border-slate-800">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle stroke="rgba(255, 255, 255, 0.05)" fill="transparent" strokeWidth="4" r="25" cx="32" cy="32" />
                  <circle
                    stroke="#6366f1"
                    fill="transparent"
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 25}
                    strokeDashoffset={2 * Math.PI * 25 * (1 - currentCompletion / 100)}
                    strokeLinecap="round"
                    r="25"
                    cx="32"
                    cy="32"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-black tracking-tight leading-none">{currentCompletion}%</span>
                  <span className="text-[7px] text-slate-400 font-extrabold uppercase mt-0.5">Complete</span>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    project.status === "COMPLETED" ? "bg-emerald-500" : "bg-indigo-500 animate-pulse"
                  }`} />
                  <span className={`text-[9.5px] font-black uppercase tracking-wider ${
                    project.status === "COMPLETED" ? "text-emerald-500" : "text-indigo-400"
                  }`}>
                    {project.status || "In progress"}
                  </span>
                </div>
                <h2 className="text-base font-black tracking-tight text-white truncate">{project.name}</h2>
                <p className="text-xs text-slate-350 line-clamp-2 leading-relaxed font-medium">
                  {updateData.summary || "No updates posted yet."}
                </p>
              </div>
            </div>

            {/* Last updated by & Team members */}
            <div className="flex flex-col justify-between items-end border-l border-slate-800/80 pl-6 shrink-0 h-[100px] w-[220px]">
              {/* Last updated by */}
              <div className="text-right w-full">
                <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Last updated by</span>
                {currentUpdate ? (
                  <div className="flex items-center justify-end gap-2 mt-1">
                    {currentUpdate.avatar ? (
                      <img src={currentUpdate.avatar} alt={currentUpdate.author} className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10" />
                    ) : (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] ${getAvatarBg(currentUpdate.author)}`}>
                        {currentUpdate.author.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold text-white leading-none truncate max-w-[120px]">{currentUpdate.author}</span>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-400 mt-1 italic">No updates yet</div>
                )}
              </div>
              
              {/* Team members overlapping avatar row */}
              <div className="text-right w-full">
                <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider block mb-1">Team members</span>
                <div className="flex items-center justify-end -space-x-1.5 overflow-hidden">
                  {allMembers.slice(0, 4).map((m) => {
                    const initial = m.name ? m.name.charAt(0).toUpperCase() : "M";
                    return m.profile_picture ? (
                      <img key={m.id} src={m.profile_picture} alt={m.name} className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#0b1329] object-cover" title={m.name} />
                    ) : (
                      <div key={m.id} className={`inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#0b1329] flex items-center justify-center font-black text-[9px] ${getAvatarBg(m.name)}`} title={m.name}>
                        {initial}
                      </div>
                    );
                  })}
                  {allMembers.length > 4 && (
                    <div className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-[#0b1329] bg-slate-800 flex items-center justify-center text-[8.5px] font-bold text-slate-300">
                      +{allMembers.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2x2 grid */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            {/* Card 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-805 p-4 rounded-2xl flex flex-col justify-between shadow-xs overflow-hidden h-[120px] text-left">
              <div className="space-y-1.5">
                <div className="flex gap-2 items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-emerald-250/60 shadow-xs">
                    <CheckCircle className={`w-3.5 h-3.5 ${timelineNodes.length === 0 ? "text-emerald-300 dark:text-emerald-700" : "text-emerald-500"}`} />
                  </div>
                  <span className="text-[9.5px] font-black text-emerald-655 dark:text-emerald-400 uppercase tracking-wider">Completed This Week</span>
                </div>
                <p className={`text-[11.5px] font-semibold leading-relaxed line-clamp-3 ${
                  timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
                }`}>
                  {updateData.completed_this_week || "No accomplishments recorded for this period."}
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-805 p-4 rounded-2xl flex flex-col justify-between shadow-xs overflow-hidden h-[120px] text-left">
              <div className="space-y-1.5">
                <div className="flex gap-2 items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-indigo-250/60 shadow-xs">
                    <TrendingUp className={`w-3.5 h-3.5 ${timelineNodes.length === 0 ? "text-indigo-300 dark:text-indigo-700/60" : "text-indigo-655"}`} />
                  </div>
                  <span className="text-[9.5px] font-black text-indigo-705 dark:text-indigo-400 uppercase tracking-wider">Next Milestone</span>
                </div>
                <p className={`text-[11.5px] font-semibold leading-relaxed line-clamp-3 ${
                  timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
                }`}>
                  {updateData.next_milestone || "No upcoming milestones declared."}
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-805 p-4 rounded-2xl flex flex-col justify-between shadow-xs overflow-hidden h-[120px] text-left">
              <div className="space-y-1.5">
                <div className="flex gap-2 items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-rose-250/60 shadow-xs">
                    <ShieldAlert className={`w-3.5 h-3.5 ${timelineNodes.length === 0 ? "text-rose-300 dark:text-rose-700" : "text-rose-500"}`} />
                  </div>
                  <span className="text-[9.5px] font-black text-rose-600 dark:text-rose-455 uppercase tracking-wider">Challenges / Blockers</span>
                </div>
                <p className={`text-[11.5px] font-semibold leading-relaxed line-clamp-3 ${
                  timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
                }`}>
                  {updateData.challenges || "No active challenges or blockers."}
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-805 p-4 rounded-2xl flex flex-col justify-between shadow-xs overflow-hidden h-[120px] text-left">
              <div className="space-y-1.5">
                <div className="flex gap-2 items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-amber-250/60 shadow-xs">
                    <LifeBuoy className={`w-3.5 h-3.5 ${timelineNodes.length === 0 ? "text-amber-300 dark:text-amber-700" : "text-amber-500"}`} />
                  </div>
                  <span className="text-[9.5px] font-black text-amber-600 dark:text-amber-455 uppercase tracking-wider">Support Needed</span>
                </div>
                <p className={`text-[11.5px] font-semibold leading-relaxed line-clamp-3 ${
                  timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
                }`}>
                  {updateData.support || "No additional support required."}
                </p>
              </div>
            </div>
          </div>

          {/* Attachments Section Row */}
          <div className="shrink-0 bg-slate-50/40 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center min-w-0 text-left">
            <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider mb-2 leading-none">
              Attachments ({allAttachments.length})
            </span>
            {allAttachments.length === 0 ? (
              <div className="text-xs font-semibold text-slate-400 italic py-2">No attachments yet</div>
            ) : (
              <div className="flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-none py-1">
                {allAttachments.map(node => (
                  <AttachmentCard key={node.id} url={node.attachmentUrl} name={node.attachmentName} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout (<1024px) */}
      <div className="flex flex-col lg:hidden space-y-5 overflow-y-auto pb-8">
        {/* Dark Hero Card */}
        <div className="bg-[#0b1329] text-white p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden shadow-sm text-left">
          <div className="flex items-center gap-4">
            {/* Progress Meter */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0 bg-slate-900/40 rounded-full border border-slate-800">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle stroke="rgba(255, 255, 255, 0.05)" fill="transparent" strokeWidth="3" r="20" cx="24" cy="24" />
                <circle
                  stroke="#6366f1"
                  fill="transparent"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - currentCompletion / 100)}
                  strokeLinecap="round"
                  r="20"
                  cx="24"
                  cy="24"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black tracking-tight leading-none">{currentCompletion}%</span>
                <span className="text-[5px] text-slate-400 font-extrabold uppercase mt-0.5">Complete</span>
              </div>
            </div>

            {/* Meta details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  project.status === "COMPLETED" ? "bg-emerald-500" : "bg-indigo-500 animate-pulse"
                }`} />
                <span className={`text-[9px] font-black uppercase tracking-wider ${
                  project.status === "COMPLETED" ? "text-emerald-500" : "text-indigo-400"
                }`}>
                  {project.status || "In progress"}
                </span>
              </div>
              <h2 className="text-sm font-black tracking-tight text-white truncate">{project.name}</h2>
              <p className="text-[11px] text-slate-350 line-clamp-2 leading-relaxed font-medium">
                {updateData.summary || "No updates posted yet."}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-850 pt-3.5 flex items-center justify-between gap-4">
            {/* Last updated by */}
            <div className="flex-1 min-w-0">
              <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider block">Last updated by</span>
              {currentUpdate ? (
                <div className="flex items-center gap-1.5 mt-1">
                  {currentUpdate.avatar ? (
                    <img src={currentUpdate.avatar} alt={currentUpdate.author} className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] ${getAvatarBg(currentUpdate.author)}`}>
                      {currentUpdate.author.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-white truncate leading-none">{currentUpdate.author}</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic">No updates yet</span>
              )}
            </div>

            {/* Team members overlapping avatars */}
            <div className="shrink-0 text-right">
              <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider block mb-1">Team members</span>
              <div className="flex items-center justify-end -space-x-1.5 overflow-hidden">
                {allMembers.slice(0, 4).map((m) => {
                  const initial = m.name ? m.name.charAt(0).toUpperCase() : "M";
                  return m.profile_picture ? (
                    <img key={m.id} src={m.profile_picture} alt={m.name} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0b1329] object-cover" />
                  ) : (
                    <div key={m.id} className={`inline-block h-6 w-6 rounded-full ring-2 ring-[#0b1329] flex items-center justify-center font-black text-[8px] ${getAvatarBg(m.name)}`}>
                      {initial}
                    </div>
                  );
                })}
                {allMembers.length > 4 && (
                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0b1329] bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-300">
                    +{allMembers.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2x2 cards status grid */}
        <div className="grid grid-cols-2 max-[430px]:grid-cols-1 gap-4">
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs text-left">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-emerald-250/60 shadow-xs">
                  <CheckCircle className={`w-4 h-4 ${timelineNodes.length === 0 ? "text-emerald-300 dark:text-emerald-700" : "text-emerald-500"}`} />
                </div>
                <span className="text-[10px] font-black text-emerald-655 dark:text-emerald-400 uppercase tracking-wider">Completed This Week</span>
              </div>
              <p className={`text-[12px] font-semibold leading-relaxed ${
                timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
              }`}>
                {updateData.completed_this_week || "No accomplishments recorded for this period."}
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs text-left">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-indigo-250/60 shadow-xs">
                  <TrendingUp className={`w-4 h-4 ${timelineNodes.length === 0 ? "text-indigo-300 dark:text-indigo-700/60" : "text-indigo-655"}`} />
                </div>
                <span className="text-[10px] font-black text-indigo-705 dark:text-indigo-400 uppercase tracking-wider">Next Milestone</span>
              </div>
              <p className={`text-[12px] font-semibold leading-relaxed ${
                timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
              }`}>
                {updateData.next_milestone || "No upcoming milestones declared."}
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs text-left">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-rose-250/60 shadow-xs">
                  <ShieldAlert className={`w-4 h-4 ${timelineNodes.length === 0 ? "text-rose-300 dark:text-rose-700" : "text-rose-500"}`} />
                </div>
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-455 uppercase tracking-wider">Challenges / Blockers</span>
              </div>
              <p className={`text-[12px] font-semibold leading-relaxed ${
                timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
              }`}>
                {updateData.challenges || "No active challenges or blockers."}
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs text-left">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-amber-250/60 shadow-xs">
                  <LifeBuoy className={`w-4 h-4 ${timelineNodes.length === 0 ? "text-amber-300 dark:text-amber-700" : "text-amber-500"}`} />
                </div>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-450 uppercase tracking-wider">Support Needed</span>
              </div>
              <p className={`text-[12px] font-semibold leading-relaxed ${
                timelineNodes.length === 0 ? "text-slate-400 dark:text-slate-650 italic" : "text-slate-550 dark:text-slate-400"
              }`}>
                {updateData.support || "No additional support required."}
              </p>
            </div>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="bg-slate-50/40 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center min-w-0 text-left">
          <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider mb-2 leading-none">
            Attachments ({allAttachments.length})
          </span>
          {allAttachments.length === 0 ? (
            <div className="text-xs font-semibold text-slate-400 italic py-2">No attachments yet</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-none py-1 flex-wrap">
              {allAttachments.map(node => (
                <AttachmentCard key={node.id} url={node.attachmentUrl} name={node.attachmentName} />
              ))}
            </div>
          )}
        </div>

        {/* Update History Section at the bottom */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col shadow-xs text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UPDATE HISTORY ({timelineNodes.length})</span>
            <span
              onClick={() => setViewAllProgress(true)}
              className="text-[10px] font-black text-indigo-655 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              View all progress <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="relative pl-6">
            {timelineNodes.length === 0 ? (
              <div className="text-xs font-semibold text-slate-400 italic py-4 text-center">No progress updates published yet.</div>
            ) : (
              <>
                {/* Connector Line */}
                <div className="absolute left-[30px] top-4 bottom-4 w-[2px] bg-indigo-50 dark:bg-slate-850" />
                
                <div className="space-y-5 relative z-10 pt-1">
                  {timelineNodes.map((node, index) => {
                    const isActive = currentUpdate?.id === node.id;
                    const isNewest = index === 0;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedUpdateId(node.id)}
                        className={`flex flex-col cursor-pointer transition-all border p-3 rounded-xl text-left relative ${
                          isActive
                            ? "bg-slate-50/50 dark:bg-slate-950/20 border-indigo-200 dark:border-indigo-900/60"
                            : "bg-white dark:bg-slate-900 border-transparent"
                        }`}
                      >
                        {/* Dot */}
                        <div className="absolute left-[-16px] top-3.5 mt-0.5">
                          <div className={`w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center transition-all ${
                            isNewest ? "border-indigo-605 bg-indigo-605" : "border-slate-350"
                          }`}>
                            {isNewest && <div className="w-1 h-1 rounded-full bg-white" />}
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider">
                            {node.dateStr}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-205 truncate max-w-[120px]">{node.author}</span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border scale-90 leading-none ${
                              isActive
                                ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 border-indigo-200 dark:border-indigo-850"
                                : "bg-slate-55 dark:bg-slate-800/60 text-slate-505 border-slate-200/50 dark:border-slate-700/50"
                            }`}>
                              {node.role}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-900 dark:text-white mt-1 truncate">
                            {node.title}
                          </div>
                          <div className="text-[10px] text-slate-505 dark:text-slate-400 mt-0.5 line-clamp-3 leading-relaxed font-medium">
                            {node.summary}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Edit Project Modal ─── */}
      <Modal open={editProjectModalOpen} onClose={() => setEditProjectModalOpen(false)} title="Edit Project">
        <form onSubmit={handleEditProjectSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Project Name</label>
            <input
              type="text"
              value={editProjectName}
              onChange={e => setEditProjectName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-255 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Description</label>
            <textarea
              value={editProjectDesc}
              onChange={e => setEditProjectDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Update Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g., Sprint 1 Demo, UI Design Completed..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Short Summary *</label>
            <input
              type="text"
              value={formSummary}
              onChange={e => setFormSummary(e.target.value)}
              placeholder="Brief 1-sentence overview of current progress..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-255 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 text-left">
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

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Current Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Completed This Week</label>
            <textarea
              value={formCompletedThisWeek}
              onChange={e => setFormCompletedThisWeek(e.target.value)}
              placeholder="What tasks did you complete this week?"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-255 bg-white dark:bg-gray-805 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Next Milestone</label>
            <textarea
              value={formNextMilestone}
              onChange={e => setFormNextMilestone(e.target.value)}
              placeholder="What are the next goals / sprint plan?"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-255 bg-white dark:bg-gray-805 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Challenges / Blockers</label>
            <textarea
              value={formChallenges}
              onChange={e => setFormChallenges(e.target.value)}
              placeholder="Any technical or resource blockers? (Optional)"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-255 bg-white dark:bg-gray-850 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Support Needed</label>
            <textarea
              value={formSupport}
              onChange={e => setFormSupport(e.target.value)}
              placeholder="Any support, reviews, or approvals needed? (Optional)"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-255 bg-white dark:bg-gray-850 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          {!editingMsg && (
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider font-sans">Attachment</label>
              {formAttachment ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/55 dark:bg-gray-950/20">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px] sm:max-w-md">
                    {formAttachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormAttachment(null)}
                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/20 text-gray-450 hover:text-red-555 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-505 dark:border-gray-700 dark:hover:border-indigo-500 cursor-pointer bg-white dark:bg-gray-800/40 transition-colors text-center font-sans">
                  <Paperclip className="w-5 h-5 text-gray-400 dark:text-gray-555 mb-1" />
                  <span className="text-xs font-semibold text-gray-505 dark:text-gray-450">Attach file (Max 10MB)</span>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Progress Update"
        message="Are you sure you want to delete this progress update?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}
