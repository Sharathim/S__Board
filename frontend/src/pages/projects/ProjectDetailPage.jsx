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
  Calendar, Clock, ShieldAlert, X, TrendingUp, AlertCircle
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

const getStatusBadge = (status) => {
  const meta = {
    "Not Started": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800",
    "In Progress": "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-955/35 dark:text-violet-400 dark:border-violet-900/30",
    "Review": "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-955/35 dark:text-blue-400 dark:border-blue-900/30",
    "Completed": "bg-emerald-50 text-emerald-750 border-emerald-100 dark:bg-emerald-955/35 dark:text-emerald-400 dark:border-emerald-900/30",
    "On Hold": "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-955/35 dark:text-amber-400 dark:border-amber-900/30"
  };
  const style = meta[status] || meta["In Progress"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${style}`}>
      {status}
    </span>
  );
};

function CircularProgressBar({ percentage }) {
  const radius = 50;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="rgba(139, 92, 246, 0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s ease" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-base font-black text-gray-800 dark:text-white tracking-tight">{percentage}%</span>
    </div>
  );
}

function ProgressAttachmentRenderer({ attachmentUrl, attachmentType, attachmentName, onImageClick }) {
  if (!attachmentUrl) return null;
  const urls = attachmentUrl.split(",").filter(Boolean);
  if (urls.length === 0) return null;

  const images = urls.filter(url => getFileType(url) === "image");
  const others = urls.filter(url => getFileType(url) !== "image");

  return (
    <div className="w-full space-y-3">
      {images.length > 0 && (
        <div className={`images-${Math.min(images.length, 3)}`}>
          {images.length === 1 && (
            <img
              src={images[0]}
              alt={attachmentName || "Attachment"}
              onClick={() => onImageClick(images[0])}
              className="update-card-img cursor-zoom-in"
              loading="lazy"
            />
          )}
          {images.length === 2 && (
            <>
              <img
                src={images[0]}
                alt={attachmentName || "Attachment 1"}
                onClick={() => onImageClick(images[0])}
                className="update-card-img cursor-zoom-in"
                loading="lazy"
              />
              <img
                src={images[1]}
                alt={attachmentName || "Attachment 2"}
                onClick={() => onImageClick(images[1])}
                className="update-card-img cursor-zoom-in"
                loading="lazy"
              />
            </>
          )}
          {images.length >= 3 && (
            <>
              <div className="img-span-top">
                <img
                  src={images[0]}
                  alt={attachmentName || "Attachment 1"}
                  onClick={() => onImageClick(images[0])}
                  className="update-card-img cursor-zoom-in"
                  loading="lazy"
                />
              </div>
              <div className="img-span-bottom">
                <img
                  src={images[1]}
                  alt={attachmentName || "Attachment 2"}
                  onClick={() => onImageClick(images[1])}
                  className="update-card-img cursor-zoom-in"
                  loading="lazy"
                />
              </div>
              <div className="img-span-bottom">
                <img
                  src={images[2]}
                  alt={attachmentName || "Attachment 3"}
                  onClick={() => onImageClick(images[2])}
                  className="update-card-img cursor-zoom-in"
                  loading="lazy"
                />
              </div>
            </>
          )}
        </div>
      )}

      {others.map((url, idx) => (
        <div key={idx} className="pt-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-755 max-w-fit hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
          >
            <File className="w-4 h-4 text-violet-500 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{attachmentName || "Download Attachment"}</span>
            <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </a>
        </div>
      ))}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { navigateWithTransition } = usePageTransition();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  // UI Dropdown states
  const [projectKebabOpen, setProjectKebabOpen] = useState(false);
  const [openKebabId, setOpenKebabId] = useState(null);

  // Modals state
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Refs for animations
  const feedRef = useRef(null);
  const sidebarRef = useRef(null);

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
      setFormSupport(parsed.support || (parsed.guidelines && parsed.guidelines !== "No guidance required." ? parsed.guidelines : "") || "");
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

  // Clickaway helper to close dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".update-kebab-container")) {
        setOpenKebabId(null);
      }
      if (!e.target.closest(".project-kebab-container")) {
        setProjectKebabOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // GSAP animation for staggered timeline cards
  useEffect(() => {
    if (feedRef.current && reversedMessages.length > 0) {
      const cards = feedRef.current.querySelectorAll(".progress-monitor-card");
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 30, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
            clearProps: "all"
          }
        );
      }
    }
  }, [reversedMessages.length]);

  // GSAP animation for sidebar entrance
  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { opacity: 0, x: 50 },
        { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" }
      );
    }
  }, []);

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

  // Check if current user can edit/delete update (edit allowed only within 30 minutes)
  const isEditable = (msg) => {
    if (msg.sender?.id !== user?.id) return false;
    const postedTime = new Date(msg.created_at).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postedTime) / (1000 * 60);
    return diffMinutes < 30;
  };

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
    ...facultyMembers.map(m => ({ ...m, ringClass: "ring-violet-500" })),
    ...forumMembers.map(m => ({ ...m, ringClass: "ring-blue-500" })),
    ...studentMembers.map(m => ({ ...m, ringClass: "ring-emerald-500" }))
  ];
  const visibleMembers = allMembers.slice(0, 5);
  const restCount = allMembers.length - 5;
  const leadAdvisor = facultyMembers[0]?.name || "Unassigned Advisor";

  const latestMessage = reversedMessages[0];
  let currentCompletion = 0;
  if (latestMessage) {
    try {
      const parsed = JSON.parse(latestMessage.content);
      currentCompletion = typeof parsed.completion === "number" ? parsed.completion : 0;
    } catch (e) {
      currentCompletion = 0;
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pb-16">
      <style>{`
        .scrollbar-premium::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-premium::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-premium::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.2);
          border-radius: 10px;
        }
        .scrollbar-premium::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.4);
        }
        .scrollbar-premium {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.2) transparent;
        }
      `}</style>
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </div>

        {/* Global Project Actions (like Edit Project / Mark as Completed) */}
        <div className="flex items-center gap-2">
          {project.status !== "COMPLETED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate("COMPLETED")}
              className="border-emerald-500/35 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl gap-1.5 text-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditProjectModalOpen(true)}
            className="hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-slate-400 rounded-xl gap-1.5 text-xs"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Project
          </Button>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Side: Progress Monitor Timeline Feed (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                Progress Monitor
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {reversedMessages.length} updates
                </span>
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Track every project update and milestone in chronological order.
              </p>
            </div>
            <Button
              onClick={() => { setEditingMsg(null); setAddModalOpen(true); }}
              className="gap-2 bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all rounded-xl font-bold text-xs"
            >
              <Plus className="w-4 h-4" /> Add Progress
            </Button>
          </div>

          {/* Timeline Feed Scrollable Container */}
          <div className="overflow-y-auto max-h-[calc(100vh-240px)] lg:max-h-[720px] pr-3 scrollbar-premium">
            <div ref={feedRef} className="relative pl-6 sm:pl-8 border-l-2 border-slate-200/60 dark:border-slate-850/60 ml-3 sm:ml-4 py-2 space-y-8">
              {reversedMessages.length === 0 ? (
                <div className="bg-white/50 dark:bg-gray-800/30 backdrop-blur-md border border-gray-150 dark:border-gray-800/60 rounded-3xl p-10 text-center text-gray-400 dark:text-gray-500 relative">
                  {/* Visual node alignment for empty feed */}
                  <div className="absolute left-[-32px] sm:left-[-41px] top-12 w-4.5 h-4.5 rounded-full bg-slate-350 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-900 flex items-center justify-center shadow-sm">
                    <Clock className="w-2.5 h-2.5 text-white" />
                  </div>
                  <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">No progress updates posted yet</p>
                  <p className="text-xs text-gray-405 mt-1">Publish the first milestone using the "+ Add Progress" button above.</p>
                </div>
              ) : (
                reversedMessages.map(msg => {
                  let updateData = {
                    title: "",
                    summary: "",
                    completion: 0,
                    status: "In Progress",
                    completed_this_week: "",
                    next_milestone: "",
                    challenges: "",
                    support: ""
                  };
                  if (msg.is_deleted) return null;

                  try {
                    const parsed = JSON.parse(msg.content);
                    updateData = {
                      title: parsed.title || "Progress Update",
                      summary: parsed.summary || parsed.accomplishment || "",
                      completion: typeof parsed.completion === "number" ? parsed.completion : 0,
                      status: parsed.status || "In Progress",
                      completed_this_week: parsed.completed_this_week || parsed.accomplishment || "",
                      next_milestone: parsed.next_milestone || parsed.next || "",
                      challenges: parsed.challenges || "",
                      support: parsed.support || (parsed.guidelines && parsed.guidelines !== "No guidance required." ? parsed.guidelines : "") || ""
                    };
                  } catch (e) {
                    updateData = {
                      title: "Progress Update",
                      summary: msg.content || "",
                      completion: 0,
                      status: "In Progress",
                      completed_this_week: msg.content || "",
                      next_milestone: "Continue working on tasks.",
                      challenges: "",
                      support: ""
                    };
                  }

                  const msgSender = msg.sender || {};
                  const isMsgEditable = isEditable(msg);

                  // Nodes mapping
                  const nodeColors = {
                    "Not Started": "bg-slate-400 ring-slate-150 dark:ring-slate-900",
                    "In Progress": "bg-indigo-500 ring-indigo-100 dark:ring-indigo-950/40",
                    "Review": "bg-blue-500 ring-blue-100 dark:ring-blue-950/40",
                    "Completed": "bg-emerald-500 ring-emerald-100 dark:ring-emerald-950/40",
                    "On Hold": "bg-amber-500 ring-amber-100 dark:ring-amber-955/20"
                  };
                  const activeColor = nodeColors[updateData.status] || nodeColors["In Progress"];

                  return (
                    <div key={msg.id} className="progress-monitor-card relative bg-white/80 dark:bg-gray-800/65 backdrop-blur-md border border-gray-150 dark:border-gray-750/70 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-305 group">

                      {/* Timeline Node Icon aligned to vertical line */}
                      <div className={`absolute left-[-32px] sm:left-[-41px] top-7 w-4.5 h-4.5 rounded-full ${activeColor} ring-4 flex items-center justify-center z-10 shadow-sm transition-all duration-300`}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>

                      {/* Top Row: User details and kebab menu */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={msgSender.profile_picture} name={msgSender.name} size="md" className="rounded-2xl shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-gray-905 dark:text-white leading-tight">{msgSender.name}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-750 text-slate-500 dark:text-slate-405 border border-slate-200/30 dark:border-slate-700/30 leading-none">
                                {msgSender.role}
                              </span>
                              {getStatusBadge(updateData.status)}
                            </div>
                            <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(msg.created_at), "MMM d, yyyy · h:mm a")}
                              {msg.is_edited && <span className="text-[10px] opacity-60 ml-0.5 font-bold uppercase">(edited)</span>}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Options */}
                        <div className="relative update-kebab-container">
                          <button
                            onClick={() => setOpenKebabId(openKebabId === msg.id ? null : msg.id)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-755/70 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors border border-transparent hover:border-gray-205 dark:hover:border-gray-700/50"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openKebabId === msg.id && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-850 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-700 py-1.5 z-30 animate-fade-in">
                              {isMsgEditable ? (
                                <button
                                  onClick={() => { setOpenKebabId(null); setEditingMsg(msg); setAddModalOpen(true); }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-205 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                                  Edit Update
                                </button>
                              ) : (
                                <div className="px-3.5 py-2.5 text-[10px] text-gray-400 dark:text-gray-505 italic border-b border-gray-100 dark:border-gray-800">
                                  {"Edit expired (>30m)"}
                                </div>
                              )}
                              <button
                                onClick={() => { setOpenKebabId(null); setDeleteTarget(msg.id); }}
                                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-455 hover:bg-rose-50/50 dark:hover:bg-rose-955/20 transition-colors text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                Delete Update
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Card Body */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-gray-905 dark:text-white leading-tight tracking-tight">
                            {updateData.title}
                          </h3>
                          {updateData.summary && (
                            <p className="text-sm font-semibold text-indigo-650 dark:text-indigo-400 mt-1.5 leading-relaxed pl-2.5 border-l-2 border-indigo-500/40">
                              {updateData.summary}
                            </p>
                          )}
                        </div>

                        {/* 2x2 Details Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {updateData.completed_this_week && (
                            <div className="bg-slate-50/45 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between transition-all group-hover:border-slate-250 dark:group-hover:border-slate-800 shadow-sm/5">
                              <div className="flex gap-2 items-center">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                  <CheckCircle className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Completed This Week</span>
                              </div>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-relaxed mt-2.5 whitespace-pre-line break-words flex-1">{updateData.completed_this_week}</p>
                            </div>
                          )}

                          {updateData.next_milestone && (
                            <div className="bg-slate-50/45 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between transition-all group-hover:border-slate-250 dark:group-hover:border-slate-800 shadow-sm/5">
                              <div className="flex gap-2 items-center">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                  <TrendingUp className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Next Milestone</span>
                              </div>
                              <p className="text-xs font-bold text-gray-750 dark:text-gray-300 leading-relaxed mt-2.5 whitespace-pre-line break-words flex-1">{updateData.next_milestone}</p>
                            </div>
                          )}

                          {updateData.challenges && (
                            <div className="bg-slate-50/45 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between transition-all group-hover:border-slate-250 dark:group-hover:border-slate-800 shadow-sm/5">
                              <div className="flex gap-2 items-center">
                                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                  <ShieldAlert className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Challenges / Blockers</span>
                              </div>
                              <p className="text-xs font-bold text-gray-750 dark:text-gray-300 leading-relaxed mt-2.5 whitespace-pre-line break-words flex-1">{updateData.challenges}</p>
                            </div>
                          )}

                          {updateData.support && (
                            <div className="bg-slate-50/45 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between transition-all group-hover:border-slate-250 dark:group-hover:border-slate-800 shadow-sm/5">
                              <div className="flex gap-2 items-center">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                  <AlertCircle className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Support Needed</span>
                              </div>
                              <p className="text-xs font-bold text-gray-750 dark:text-gray-300 leading-relaxed mt-2.5 whitespace-pre-line break-words flex-1">{updateData.support}</p>
                            </div>
                          )}
                        </div>

                        {/* Attachments rendering */}
                        <ProgressAttachmentRenderer
                          attachmentUrl={msg.attachment_url}
                          attachmentType={msg.attachment_type}
                          attachmentName={msg.attachment_name}
                          onImageClick={setEnlargedImage}
                        />
                      </div>

                      {/* Compact Card Footer */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-850 border border-slate-200/30 dark:border-slate-700/30 text-[10px] font-extrabold">
                            {updateData.completion}% Complete
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>By <strong className="text-slate-655 dark:text-slate-300 font-bold">{msgSender.name}</strong></span>
                          <span>•</span>
                          <span>{format(new Date(msg.created_at), "d MMM yyyy")}</span>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Sticky Overview Panel (lg:col-span-4) */}
        <div ref={sidebarRef} className="lg:col-span-4 lg:sticky lg:top-[100px] space-y-6">

          {/* Main Info Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-150 dark:border-gray-750/70 rounded-3xl shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {/* Project Branding Header */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${project.status === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                  }`}>
                  {project.status === "COMPLETED" ? "Completed" : "Active Project"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">{project.name}</h1>
              {project.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{project.description}</p>
              )}
            </div>

            {/* Circular Progress Indicator for dynamic feedback */}
            <div className="my-6 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
              <CircularProgressBar percentage={currentCompletion} />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider mt-2.5">Latest Progress Milestone</span>
            </div>

            {/* Details Grid */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-xs pb-3.5 border-b border-dashed border-gray-150 dark:border-gray-750/60">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Lead Advisor</span>
                <span className="font-extrabold text-gray-800 dark:text-gray-250">{leadAdvisor}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-3.5 border-b border-dashed border-gray-150 dark:border-gray-750/60">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Team Size</span>
                <span className="font-extrabold text-gray-850 dark:text-gray-200">{allMembers.length} Members</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-3.5 border-b border-dashed border-gray-150 dark:border-gray-750/60">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Created On</span>
                <span className="font-extrabold text-gray-850 dark:text-gray-200">
                  {format(new Date(project.created_at), "MMM d, yyyy")}
                </span>
              </div>
              {project.deadline && (
                <div className="flex flex-col gap-2 p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-455">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Target Deadline</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200">
                      {format(new Date(project.deadline), "MMM d, yyyy")}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-955/40 text-rose-600 dark:text-rose-400">
                      {(() => {
                        const daysLeft = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                        return daysLeft > 0 ? `${daysLeft} days left` : "Overdue";
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Team Members List Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-150 dark:border-gray-750/70 rounded-3xl shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-black text-gray-450 dark:text-gray-400 uppercase tracking-widest">Workspace Members</h3>
            <div className="space-y-3">

              {facultyMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={m.profile_picture} name={m.name} size="xs" className="rounded-lg ring-2 ring-violet-500 shadow-sm shrink-0" />
                    <span className="font-extrabold text-gray-750 dark:text-gray-200 truncate">{m.name}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-violet-650 dark:text-violet-400 px-1.5 py-0.5 rounded-md bg-violet-500/10">Faculty</span>
                </div>
              ))}

              {forumMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={m.profile_picture} name={m.name} size="xs" className="rounded-lg ring-2 ring-blue-500 shadow-sm shrink-0" />
                    <span className="font-extrabold text-gray-750 dark:text-gray-200 truncate">{m.name}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md bg-blue-500/10">Forum</span>
                </div>
              ))}

              {studentMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={m.profile_picture} name={m.name} size="xs" className="rounded-lg ring-2 ring-emerald-500 shadow-sm shrink-0" />
                    <span className="font-extrabold text-gray-750 dark:text-gray-200 truncate">{m.name}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-emerald-650 dark:text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-500/10">Student</span>
                </div>
              ))}

            </div>
          </div>

        </div>

      </div>

      {/* ─── 4. Edit Project Modal ─── */}
      <Modal open={editProjectModalOpen} onClose={() => setEditProjectModalOpen(false)} title="Edit Project">
        <form onSubmit={handleEditProjectSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Project Name</label>
            <input
              type="text"
              value={editProjectName}
              onChange={e => setEditProjectName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-255 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Description</label>
            <textarea
              value={editProjectDesc}
              onChange={e => setEditProjectDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm resize-none"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditProjectModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ─── 5. Add / Edit Progress Update Modal ─── */}
      <Modal open={addModalOpen} onClose={() => { setAddModalOpen(false); setEditingMsg(null); }} title={editingMsg ? "Edit Progress Update" : "Publish Progress Update"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Update Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g., Sprint 1 Demo, UI Design Completed..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Short Summary *</label>
            <input
              type="text"
              value={formSummary}
              onChange={e => setFormSummary(e.target.value)}
              placeholder="Brief 1-sentence overview of current progress..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Completion Percentage ({formCompletion}%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formCompletion}
                  onChange={e => setFormCompletion(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-violet-650"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Current Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-255 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
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
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Completed This Week</label>
            <textarea
              value={formCompletedThisWeek}
              onChange={e => setFormCompletedThisWeek(e.target.value)}
              placeholder="What tasks did you complete this week?"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Next Milestone</label>
            <textarea
              value={formNextMilestone}
              onChange={e => setFormNextMilestone(e.target.value)}
              placeholder="What are the next goals / sprint plan?"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Challenges / Blockers</label>
            <textarea
              value={formChallenges}
              onChange={e => setFormChallenges(e.target.value)}
              placeholder="Any technical or resource blockers? (Optional)"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Support Needed</label>
            <textarea
              value={formSupport}
              onChange={e => setFormSupport(e.target.value)}
              placeholder="Any support, reviews, or approvals needed? (Optional)"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Attachment upload */}
          {!editingMsg && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Attachment</label>
              {formAttachment ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px] sm:max-w-md">
                    {formAttachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormAttachment(null)}
                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/20 text-gray-455 hover:text-red-550 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-205 hover:border-indigo-500 dark:border-gray-700 dark:hover:border-indigo-500 cursor-pointer bg-white dark:bg-gray-800/40 transition-colors text-center">
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

      {/* Lightbox / Enlarged Image Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={enlargedImage}
            alt="Enlarged view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
