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
      P: "bg-emerald-600 text-white",
      Y: "bg-amber-600 text-white",
      Z: "bg-rose-600 text-white"
    };
    return colors[char] || "bg-indigo-500 text-white";
  };

  return (
    <div className="flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pb-4 space-y-4">
      {/* Top Header Navigation bar */}
      <div className="flex justify-between items-start shrink-0">
        <div className="space-y-1">
          <div
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-655 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 leading-none">Progress monitor</h1>
          <p className="text-xs text-slate-405 dark:text-slate-500 font-semibold mt-0.5">Current state of {project.name}, at a glance</p>
        </div>

        <div className="flex items-center gap-3 mt-1">
          {project.status !== "COMPLETED" && (
            <button
              onClick={() => statusMutation.mutate("COMPLETED")}
              className="neomorphic-btn text-emerald-655 dark:text-emerald-400"
            >
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Mark completed
            </button>
          )}
          <button
            onClick={() => setEditProjectModalOpen(true)}
            className="neomorphic-btn text-slate-600 dark:text-slate-350"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit project
          </button>
          <button
            onClick={() => { setAddModalOpen(true); setEditingMsg(null); }}
            className="px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add progress
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
        
        {/* Left Dashboard Panel (col-span-9) */}
        <div className="lg:col-span-9 flex flex-col h-full min-h-0 gap-4">
          
          {/* Header Card (Indigo Deep Ocean Theme) */}
          <div className="bg-[#0b1329] text-white p-5 rounded-2xl flex items-center justify-between shrink-0 h-[125px] relative overflow-hidden shadow-sm">
            <div className="flex items-center gap-5">
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
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9.5px] font-black text-emerald-500 uppercase tracking-wider">In progress</span>
                </div>
                <h2 className="text-base font-black tracking-tight text-white">{project.name}</h2>
                <p className="text-xs text-slate-350 max-w-xl line-clamp-2 leading-relaxed font-medium">
                  {updateData.summary || project.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Last update card badge */}
            {currentUpdate && (
              <div className="hidden sm:flex items-center gap-3.5 border-l border-slate-850 pl-6 shrink-0 h-14">
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Last update</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    {currentUpdate.avatar ? (
                      <img src={currentUpdate.avatar} alt={currentUpdate.author} className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10" />
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${getAvatarBg(currentUpdate.author)}`}>
                        {currentUpdate.author.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold text-white leading-none">{currentUpdate.author}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1.5 leading-none">
                    {currentUpdate.dateOnly} • {currentUpdate.timeOnly}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2x2 Layout Grid (Fixed height/no internal scroll design) */}
          <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1 min-h-0">
            {/* Card 1: Completed This Week */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-full min-h-0 shadow-xs overflow-hidden">
              <div className="space-y-3">
                <div className="flex gap-3 items-center shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-xs">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                  <span className="text-[10.5px] font-black text-emerald-655 dark:text-emerald-400 uppercase tracking-wider">Completed This Week</span>
                </div>
                <p className="text-[12px] font-semibold text-slate-550 dark:text-slate-400 leading-relaxed pl-1 line-clamp-4 select-none">
                  {updateData.completed_this_week || "No accomplishments recorded for this period."}
                </p>
              </div>
            </div>

            {/* Card 2: Next Milestone */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-full min-h-0 shadow-xs overflow-hidden">
              <div className="space-y-3">
                <div className="flex gap-3 items-center shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-indigo-200/60 shadow-xs">
                    <TrendingUp className="w-4.5 h-4.5 text-indigo-650" />
                  </div>
                  <span className="text-[10.5px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Next Milestone</span>
                </div>
                <p className="text-[12px] font-semibold text-slate-550 dark:text-slate-400 leading-relaxed pl-1 line-clamp-4 select-none">
                  {updateData.next_milestone || "No upcoming milestones declared."}
                </p>
              </div>
            </div>

            {/* Card 3: Challenges / Blockers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-full min-h-0 shadow-xs overflow-hidden">
              <div className="space-y-3">
                <div className="flex gap-3 items-center shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-xs">
                    <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                  </div>
                  <span className="text-[10.5px] font-black text-rose-600 dark:text-rose-455 uppercase tracking-wider">Challenges / Blockers</span>
                </div>
                <p className="text-[12px] font-semibold text-slate-550 dark:text-slate-400 leading-relaxed pl-1 line-clamp-4 select-none">
                  {updateData.challenges || "No active challenges or blockers."}
                </p>
              </div>
            </div>

            {/* Card 4: Support Needed */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-full min-h-0 shadow-xs overflow-hidden">
              <div className="space-y-3">
                <div className="flex gap-3 items-center shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-xs">
                    <LifeBuoy className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <span className="text-[10.5px] font-black text-amber-600 dark:text-amber-450 uppercase tracking-wider">Support Needed</span>
                </div>
                <p className="text-[12px] font-semibold text-slate-550 dark:text-slate-400 leading-relaxed pl-1 line-clamp-4 select-none">
                  {updateData.support || "No additional support required."}
                </p>
              </div>
            </div>
          </div>

          {/* Attachments Section Row */}
          {allAttachments.length > 0 && (
            <div className="shrink-0 bg-slate-50/40 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center min-w-0">
              <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider mb-2 leading-none">Attachments ({allAttachments.length})</span>
              <div className="flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-none py-1">
                {allAttachments.map(node => (
                  <AttachmentCard key={node.id} url={node.attachmentUrl} name={node.attachmentName} />
                ))}
              </div>
            </div>
          )}

          {/* Horizontal Update Timeline (History log with visual connecting line) */}
          <div className="shrink-0 h-[140px] bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center shadow-xs">
            <div className="flex items-center justify-between shrink-0 mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Update History ({timelineNodes.length})</span>
              {selectedUpdateId !== null && (
                <span
                  onClick={() => setSelectedUpdateId(null)}
                  className="text-[10px] font-black text-indigo-655 dark:text-indigo-400 hover:underline cursor-pointer transition-colors"
                >
                  View latest update →
                </span>
              )}
            </div>

            <div className="relative flex-1 min-h-0 flex flex-col justify-center">
              {/* Connector Line */}
              <div className="absolute left-6 right-6 top-[22px] h-[2px] bg-indigo-50 dark:bg-slate-850" />
              
              {/* Nodes list */}
              <div className="flex items-start gap-8 overflow-x-auto overflow-y-hidden scrollbar-none h-full w-full relative z-10">
                {timelineNodes.length === 0 ? (
                  <div className="text-xs font-semibold text-slate-400 italic pl-6 pt-6">No progress updates published yet.</div>
                ) : (
                  timelineNodes.map((node) => {
                    const isActive = currentUpdate?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedUpdateId(node.id)}
                        className="flex flex-col min-w-[210px] max-w-[250px] cursor-pointer transition-all shrink-0 relative pt-1"
                      >
                        {/* Node Dot */}
                        <div className="flex items-center pl-4 mb-2">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 transition-all flex items-center justify-center ${
                            isActive
                              ? "border-indigo-605 ring-4 ring-indigo-100 dark:ring-indigo-900/30 scale-110"
                              : "border-slate-350 hover:border-indigo-500"
                          }`}>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-605" />}
                          </div>
                        </div>

                        <div className="pl-4">
                          <div className="text-[9px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider">
                            {node.dateStr}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 shrink-0">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-205 truncate max-w-[120px]">{node.author}</span>
                            <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded border scale-95 leading-none ${
                              isActive
                                ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 border-indigo-200 dark:border-indigo-850"
                                : "bg-slate-50 dark:bg-slate-800/60 text-slate-505 border-slate-200/50 dark:border-slate-700/50"
                            }`}>
                              {node.role}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate leading-tight font-medium">
                            {node.summary}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar Panel (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-0 gap-4">
          
          {/* Project Overview metadata list */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-150 dark:border-gray-750/70 rounded-2xl p-5 space-y-4 shrink-0 shadow-xs">
            <h3 className="text-[10px] font-black text-gray-405 dark:text-gray-400 uppercase tracking-widest leading-none">Project Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-855">
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="font-bold uppercase tracking-wider text-[9px]">Lead advisor</span>
                </div>
                <span className="font-extrabold text-slate-850 dark:text-gray-250 truncate max-w-[140px]">{leadAdvisor}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-855">
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="font-bold uppercase tracking-wider text-[9px]">Team size</span>
                </div>
                <span className="font-extrabold text-slate-850 dark:text-gray-250">{allMembers.length} members</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-855">
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="font-bold uppercase tracking-wider text-[9px]">Created by</span>
                </div>
                <span className="font-extrabold text-slate-855 dark:text-gray-250 truncate max-w-[140px]">{project.created_by?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-855">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="font-bold uppercase tracking-wider text-[9px]">Created on</span>
                </div>
                <span className="font-extrabold text-slate-855 dark:text-gray-250">{format(new Date(project.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="font-bold uppercase tracking-wider text-[9px]">Last updated</span>
                </div>
                <span className="font-extrabold text-slate-850 dark:text-gray-250">{format(new Date(project.updated_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          {/* Workspace Members list (COMPACT row system design) */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-150 dark:border-gray-750/70 rounded-2xl p-5 flex flex-col flex-1 min-h-0 shadow-xs">
            <h3 className="text-[10px] font-black text-gray-455 dark:text-gray-400 uppercase tracking-widest leading-none shrink-0 mb-4">Workspace Members</h3>
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 scrollbar-premium">
              {allMembers.map(m => {
                const initial = m.name ? m.name.charAt(0).toUpperCase() : "M";
                const isFaculty = m.role_in_project === "faculty";
                const isForum = m.role_in_project === "forum_member";
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 text-xs py-1">
                    <div className="flex items-center gap-3 min-w-0">
                      {m.profile_picture ? (
                        <img src={m.profile_picture} alt={m.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${getAvatarBg(m.name)}`}>
                          {initial}
                        </div>
                      )}
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate leading-none">{m.name}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-405 uppercase tracking-wider shrink-0">
                      {isFaculty ? "FACULTY" : isForum ? "FORUM" : "STUDENT"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-255 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <div className="space-y-1">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-255 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/20 text-gray-450 hover:text-red-550 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-500 dark:border-gray-700 dark:hover:border-indigo-500 cursor-pointer bg-white dark:bg-gray-800/40 transition-colors text-center font-sans">
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
