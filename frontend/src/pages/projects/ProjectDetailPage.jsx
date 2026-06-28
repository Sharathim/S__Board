import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
  Calendar, Clock, ShieldAlert
} from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
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

  // Edit Project fields
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  // Add/Edit Progress Update fields
  const [formTitle, setFormTitle] = useState("");
  const [formAccomplishment, setFormAccomplishment] = useState("");
  const [formNext, setFormNext] = useState("");
  const [formGuidelines, setFormGuidelines] = useState("");
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
      let parsed = { title: "", accomplishment: "", next: "", guidelines: "" };
      try {
        parsed = JSON.parse(editingMsg.content);
      } catch (e) {
        parsed = { title: "Progress Update", accomplishment: editingMsg.content || "", next: "", guidelines: "" };
      }
      setFormTitle(parsed.title || "");
      setFormAccomplishment(parsed.accomplishment || "");
      setFormNext(parsed.next || "");
      setFormGuidelines(parsed.guidelines === "No guidance required." ? "" : parsed.guidelines || "");
    } else {
      setFormTitle("");
      setFormAccomplishment("");
      setFormNext("");
      setFormGuidelines("");
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
      setFormAccomplishment("");
      setFormNext("");
      setFormGuidelines("");
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

  const messages = messagesData?.messages || [];
  // Vertical feed displays the newest update at the top
  const reversedMessages = [...messages].reverse();

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
      accomplishment: formAccomplishment,
      next: formNext,
      guidelines: formGuidelines.trim() || "No guidance required."
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
  const facultyMembers  = project.members?.filter(m => m.role_in_project === "faculty")  || [];
  const forumMembers    = project.members?.filter(m => m.role_in_project === "forum_member") || [];
  const studentMembers  = project.members?.filter(m => m.role_in_project === "student")  || [];
  
  const allMembers = [
    ...facultyMembers.map(m => ({ ...m, ringClass: "ring-violet-500" })),
    ...forumMembers.map(m => ({ ...m, ringClass: "ring-blue-500" })),
    ...studentMembers.map(m => ({ ...m, ringClass: "ring-emerald-500" }))
  ];
  const visibleMembers = allMembers.slice(0, 5);
  const restCount = allMembers.length - 5;
  const leadAdvisor = facultyMembers[0]?.name || "Unassigned Advisor";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      {/* ─── 1. Top Project Overview Card ─── */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-150 dark:border-gray-700/80 rounded-3xl shadow-sm p-6 relative overflow-visible">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/10 shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{project.description}</p>
              )}
            </div>
          </div>
          
          {/* Top Right Kebab Menu */}
          <div className="absolute top-6 right-6 project-kebab-container">
            <button
              onClick={() => setProjectKebabOpen(!projectKebabOpen)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-gray-900 dark:hover:bg-gray-750 text-gray-400 hover:text-gray-650 transition-colors border border-slate-100 dark:border-gray-850 shadow-sm"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {projectKebabOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-855 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-700 py-1.5 z-30 animate-fade-in">
                <button
                  onClick={() => { setProjectKebabOpen(false); setEditProjectModalOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-750 dark:text-gray-250 hover:bg-gray-50 dark:hover:bg-gray-700/60 font-semibold transition-colors text-left"
                >
                  <Pencil className="w-4 h-4 text-indigo-500" />
                  Edit Project
                </button>
                {project.status !== "COMPLETED" && (
                  <button
                    onClick={() => { setProjectKebabOpen(false); statusMutation.mutate("COMPLETED"); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-emerald-650 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold transition-colors text-left"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Mark as Completed
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 h-px bg-gray-150 dark:bg-gray-750" />

        {/* Info Grid (SaaS-style blocks) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lead Advisor</span>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1 truncate">{leadAdvisor}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Team Size</span>
            <div className="text-sm font-extrabold text-gray-800 dark:text-gray-200 mt-1">{allMembers.length} Members</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Created Date</span>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">
              {format(new Date(project.created_at), "MMM d, yyyy")}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Project Status</span>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                project.status === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
              }`}>
                {project.status === "COMPLETED" ? "Completed" : "In Progress"}
              </span>
            </div>
          </div>
        </div>

        {/* Members Avatars Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2">Team Members:</span>
            <div className="flex -space-x-2.5">
              {visibleMembers.map(m => (
                <Avatar
                  key={m.id}
                  src={m.profile_picture}
                  name={m.name}
                  size="sm"
                  className={`ring-2 ring-white dark:ring-gray-800 ${m.ringClass}`}
                />
              ))}
              {restCount > 0 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold border-2 border-white dark:border-gray-800 ring-2 ring-indigo-500/10">
                  +{restCount}
                </div>
              )}
            </div>
          </div>
          
          {/* Optional Project Deadline Display */}
          {project.deadline && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold bg-red-500/5 px-3 py-1 rounded-xl border border-red-500/10">
              <Calendar className="w-3.5 h-3.5" />
              <span>Deadline: {format(new Date(project.deadline), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. Progress Monitor Header Block ─── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Progress Monitor</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5">"Track every project update in chronological order."</p>
        </div>
        <Button
          onClick={() => { setEditingMsg(null); setAddModalOpen(true); }}
          className="gap-1.5 bg-primary-600 hover:bg-primary-700 shadow-sm transition-all rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Progress
        </Button>
      </div>

      {/* ─── 3. Progress Update Feed Cards ─── */}
      <div className="space-y-5">
        {reversedMessages.length === 0 ? (
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-150 dark:border-gray-700/80 rounded-3xl p-10 text-center text-gray-400 dark:text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-3 text-gray-350 dark:text-gray-650" />
            <p className="text-sm font-semibold">No progress updates posted yet.</p>
            <p className="text-xs mt-1">Click "+ Add Progress" to share your first project milestone.</p>
          </div>
        ) : (
          reversedMessages.map(msg => {
            let updateData = { title: "", accomplishment: "", next: "", guidelines: "" };
            if (msg.is_deleted) return null;
            
            try {
              updateData = JSON.parse(msg.content);
            } catch (e) {
              updateData = {
                title: "Progress Update",
                accomplishment: msg.content || "",
                next: "Continue working on tasks.",
                guidelines: "No guidance required."
              };
            }
            
            const msgSender = msg.sender || {};
            const isMsgEditable = isEditable(msg);
            
            return (
              <div key={msg.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-150 dark:border-gray-700/80 rounded-3xl shadow-sm p-6 hover:shadow-md transition-all duration-300 relative overflow-visible space-y-4">
                {/* Top Row: User details and kebab */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={msgSender.profile_picture} name={msgSender.name} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{msgSender.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-750 text-gray-500 dark:text-gray-450 border border-gray-200/40 dark:border-gray-700/40">
                          {msgSender.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {format(new Date(msg.created_at), "MMM d, yyyy · h:mm a")}
                        {msg.is_edited && <span className="text-[9px] opacity-60 ml-1">(edited)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Kebab dropdown container */}
                  <div className="relative update-kebab-container">
                    <button
                      onClick={() => setOpenKebabId(openKebabId === msg.id ? null : msg.id)}
                      className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-400 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openKebabId === msg.id && (
                      <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-850 rounded-xl shadow-xl border border-gray-150 dark:border-gray-700 py-1 z-30 animate-fade-in">
                        {isMsgEditable ? (
                          <button
                            onClick={() => { setOpenKebabId(null); setEditingMsg(msg); setAddModalOpen(true); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                          >
                            <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                            ✏️ Edit Update
                          </button>
                        ) : (
                          <div className="px-3 py-2 text-[10px] text-gray-400 dark:text-gray-500 italic border-b border-gray-100 dark:border-gray-800">
                            {"Edit expired (>30m)"}
                          </div>
                        )}
                        <button
                          onClick={() => { setOpenKebabId(null); setDeleteTarget(msg.id); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-655 dark:text-red-400 hover:bg-red-55/10 dark:hover:bg-red-950/20 transition-colors text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          🗑 Delete Update
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-150 dark:bg-gray-750" />

                {/* Title */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug tracking-tight">
                    {updateData.title || "Progress Update"}
                  </h3>
                </div>

                {/* Accomplishment */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">What did you complete?</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {updateData.accomplishment}
                  </p>
                </div>

                {/* What's Next */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">What's Next</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {updateData.next || "Continue working on remaining tasks."}
                  </p>
                </div>

                {/* Guidelines Needed */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Guidelines Needed</span>
                  <p className={`text-sm ${
                    !updateData.guidelines || updateData.guidelines === "No guidance required."
                      ? "text-gray-400 dark:text-gray-500 italic"
                      : "text-gray-750 dark:text-gray-300 font-medium"
                  }`}>
                    {updateData.guidelines || "No guidance required."}
                  </p>
                </div>

                {/* Attachment Display */}
                {msg.attachment_url && (
                  <div className="pt-2">
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-750 max-w-fit hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
                    >
                      {msg.attachment_type === "image" ? (
                        <Image className="w-4 h-4 text-indigo-500 shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-violet-500 shrink-0" />
                      )}
                      <span className="truncate max-w-[200px] sm:max-w-xs">{msg.attachment_name || "Download Attachment"}</span>
                      <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Description</label>
            <textarea
              value={editProjectDesc}
              onChange={e => setEditProjectDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm h-24 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditProjectModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={editProjectMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ─── 5. Add / Edit Progress Modal ─── */}
      <Modal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); setEditingMsg(null); }}
        title={editingMsg ? "Edit Progress Update" : "Add Progress Update"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Update Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Backend Authentication Completed"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">What did you complete?</label>
            <textarea
              value={formAccomplishment}
              onChange={e => setFormAccomplishment(e.target.value)}
              placeholder="Provide a short paragraph describing accomplishments..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm h-24 resize-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">What's Next</label>
            <input
              type="text"
              value={formNext}
              onChange={e => setFormNext(e.target.value)}
              placeholder="One concise sentence explaining the next planned task..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Guidelines Needed</label>
            <input
              type="text"
              value={formGuidelines}
              onChange={e => setFormGuidelines(e.target.value)}
              placeholder="Type any questions or help needed (or leave blank)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          
          {/* Attachment upload */}
          {!editingMsg && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Attachment</label>
              {formAttachment ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-750 text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[250px]">
                    📄 {formAttachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormAttachment(null)}
                    className="text-red-500 hover:text-red-650 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-gray-250 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-850/50 transition-colors">
                  <Paperclip className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500 font-medium">Attach files (images, pdfs, docs)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.mp4"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file && file.size > 10 * 1024 * 1024) {
                        alert("File size exceeds 10MB limit.");
                        e.target.value = null;
                        return;
                      }
                      setFormAttachment(file);
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
