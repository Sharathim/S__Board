import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProject, getMessages, postMessage, editMessage, deleteMessage,
  updateProjectStatus
} from "../../../api/projects";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../hooks/useSocket";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import {
  FolderKanban, Users, Calendar, Plus, MoreVertical, Pencil, Trash2,
  Paperclip, Clock, ArrowLeft, Download, File, X, CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import MobileCard from "../../components/MobileCard";
import BottomSheet from "../../layout/BottomSheet";

const getStatusTheme = (status) => {
  const map = {
    NOT_STARTED: { bg: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
    IN_PROGRESS: { bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
    REVIEW: { bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    COMPLETED: { bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    ON_HOLD: { bg: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
    CANCELLED: { bg: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400", dot: "bg-red-500" },
  };
  return map[status] || { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
};

export default function MobileProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  // State
  const [projectKebabOpen, setProjectKebabOpen] = useState(false);
  const [openKebabId, setOpenKebabId] = useState(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formAccomplishment, setFormAccomplishment] = useState("");
  const [formNext, setFormNext] = useState("");
  const [formGuidelines, setFormGuidelines] = useState("");
  const [formAttachment, setFormAttachment] = useState(null);

  // Fetch Project details
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id).then(r => r.data.project),
  });

  // Fetch Progress updates (messages)
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => getMessages(id, { page: 1 }).then(r => r.data),
  });

  // Sync edit form fields when editingMsg changes
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

  // Socket handlers
  const onNewMessage = useCallback((msg) => {
    queryClient.setQueryData(["messages", id], old => {
      if (!old) return old;
      // Prevent duplicates
      if (old.messages?.some(m => m.id === msg.id)) return old;
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

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!project) return <div className="text-center py-16 text-gray-400">Project not found.</div>;

  const messages = messagesData?.messages || [];
  const reversedMessages = [...messages].reverse();

  const isMsgEditable = (msg) => {
    if (msg.sender?.id !== user?.id) return false;
    const postedTime = new Date(msg.created_at).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postedTime) / (1000 * 60);
    return diffMinutes < 30;
  };

  const handleFormSubmit = (e) => {
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
    setAddSheetOpen(false);
    setEditingMsg(null);
  };

  const allMembers = project.members || [];
  const facultyMembers = allMembers.filter(m => m.role_in_project === "faculty");
  const studentMembers = allMembers.filter(m => m.role_in_project === "student");
  const forumMembers = allMembers.filter(m => m.role_in_project === "forum_member");
  const leadAdvisor = facultyMembers[0]?.name || "Unassigned";

  return (
    <div className="space-y-4 mobile-fade-in pb-10">
      {/* Back button */}
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
      </Link>

      {/* Hero card */}
      <MobileCard className="!p-0 overflow-hidden relative">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5">
          {/* Status patches + Kebab */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight">{project.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/20 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {project.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <FolderKanban className="w-4.5 h-4.5 text-white" />
              </div>

              {/* Status Update Options for HOD */}
              {isHOD && project.status !== "COMPLETED" && (
                <div className="relative">
                  <button
                    onClick={() => setProjectKebabOpen(!projectKebabOpen)}
                    className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {projectKebabOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 py-1 z-30 animate-fade-in">
                      <button
                        onClick={() => { setProjectKebabOpen(false); statusMutation.mutate("COMPLETED"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-left"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        Complete Project
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: Members avatars */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex -space-x-1.5">
              {allMembers.slice(0, 5).map((m, i) => (
                <Avatar key={m.id || i} src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-white/30 w-7 h-7" />
              ))}
            </div>
            <span className="text-xs text-white/70 font-semibold">{allMembers.length} members</span>
          </div>
        </div>
      </MobileCard>

      {/* Description */}
      <MobileCard>
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Description</h2>
        <p className="text-xs text-gray-655 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
          {project.description || "No description provided."}
        </p>
      </MobileCard>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MobileCard>
          <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Lead Advisor</span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-250 mt-1 block truncate">
            {leadAdvisor}
          </span>
        </MobileCard>
        <MobileCard>
          <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Last Updated</span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-250 mt-1 block">
            {format(new Date(project.updated_at), "MMM d, yyyy")}
          </span>
        </MobileCard>
      </div>

      {/* Progress Monitor Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Progress Monitor</h2>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">"Track updates in chronological order."</p>
        </div>
        <button
          onClick={() => { setEditingMsg(null); setAddSheetOpen(true); }}
          className="mobile-tappable px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md shadow-primary-500/10 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add Progress
        </button>
      </div>

      {/* Progress Monitor Feed */}
      <div className="space-y-3">
        {reversedMessages.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800/80 rounded-2xl text-gray-400 dark:text-gray-550">
            <Clock className="w-6 h-6 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-xs font-bold">No progress updates yet.</p>
            <p className="text-[10px] mt-0.5">Click "+ Add Progress" to share first milestone.</p>
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
            const isEditable = isMsgEditable(msg);

            return (
              <div
                key={msg.id}
                className="bg-white dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm relative overflow-visible space-y-3"
              >
                {/* Header: User details + More actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={msgSender.profile_picture} name={msgSender.name} size="sm" className="w-8 h-8 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{msgSender.name}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                          {msgSender.role}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-405 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                        <span>{format(new Date(msg.created_at), "MMM d, h:mm a")}</span>
                        {msg.is_edited && <span className="opacity-60 font-semibold">(edited)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Kebab action */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenKebabId(openKebabId === msg.id ? null : msg.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {openKebabId === msg.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-850 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 py-1 z-30 animate-fade-in">
                        {isEditable ? (
                          <button
                            onClick={() => { setOpenKebabId(null); setEditingMsg(msg); setAddSheetOpen(true); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-250 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                            Edit
                          </button>
                        ) : (
                          <div className="px-3 py-1.5 text-[9px] text-gray-400 dark:text-gray-500 italic border-b border-gray-50 dark:border-slate-800">
                            Edit expired
                          </div>
                        )}
                        <button
                          onClick={() => { setOpenKebabId(null); setDeleteTarget(msg.id); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-slate-800/80" />

                {/* Content */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                    {updateData.title || "Progress Update"}
                  </h3>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Key Accomplishment</span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {updateData.accomplishment}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wider block">What's Next</span>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {updateData.next || "Continue working on tasks."}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Guidelines Needed</span>
                  <p className={`text-xs ${
                    !updateData.guidelines || updateData.guidelines === "No guidance required."
                      ? "text-gray-400 dark:text-gray-500 italic"
                      : "text-gray-750 dark:text-gray-350 font-medium"
                  }`}>
                    {updateData.guidelines || "No guidance required."}
                  </p>
                </div>

                {/* Attachment */}
                {msg.attachment_url && (
                  <div className="pt-1">
                    {msg.attachment_type === "image" ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-150 dark:border-slate-800 cursor-zoom-in max-w-xs">
                        <img
                          src={msg.attachment_url}
                          alt={msg.attachment_name || "Attachment"}
                          onClick={() => setEnlargedImage(msg.attachment_url)}
                          className="w-full max-h-40 object-cover"
                        />
                      </div>
                    ) : (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700/80 max-w-full hover:bg-gray-100 dark:hover:bg-slate-750 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
                      >
                        <File className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span className="truncate max-w-[150px]">{msg.attachment_name || "Attachment"}</span>
                        <Download className="w-3 h-3 text-gray-405 shrink-0" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Progress BottomSheet */}
      <BottomSheet
        open={addSheetOpen}
        onClose={() => { setAddSheetOpen(false); setEditingMsg(null); }}
        title={editingMsg ? "Edit Progress Update" : "Publish Progress Update"}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pb-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Update Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g., Sprint 1 Demo, UI Design Completed..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Key Accomplishment</label>
            <textarea
              value={formAccomplishment}
              onChange={e => setFormAccomplishment(e.target.value)}
              placeholder="What did you achieve in this phase?"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider block">What's Next</label>
            <textarea
              value={formNext}
              onChange={e => setFormNext(e.target.value)}
              placeholder="What are the next steps / goals?"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Guidelines Needed (Optional)</label>
            <textarea
              value={formGuidelines}
              onChange={e => setFormGuidelines(e.target.value)}
              placeholder="Any specific questions or guidance required from faculty?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Attachment selector */}
          {!editingMsg && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Attachment</label>
              {formAttachment ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-850">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                    📄 {formAttachment.name}
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
                <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-500 cursor-pointer bg-white dark:bg-slate-800/40 transition-colors text-center">
                  <Paperclip className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-1" />
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

          {/* Form Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => { setAddSheetOpen(false); setEditingMsg(null); }}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendMutation.isPending || editMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all"
            >
              {editingMsg ? "Save Update" : "Publish Update"}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Delete Progress Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Progress Update"
        message="Are you sure you want to delete this progress update?"
        confirmText="Delete"
        danger
      />

      {/* Lightbox / Enlarged Image Overlay */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
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
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-200"
          />
        </div>
      )}

      {/* Team Members List */}
      {[
        { label: "Faculty", members: facultyMembers, color: "violet" },
        { label: "Students", members: studentMembers, color: "emerald" },
        { label: "Forum Members", members: forumMembers, color: "blue" },
      ].map(group => group.members.length > 0 && (
        <MobileCard key={group.label}>
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{group.label}</h2>
          <div className="space-y-2">
            {group.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-1">
                <Avatar src={m.profile_picture} name={m.name} size="sm" className={`ring-2 ring-${group.color}-500/20 w-8 h-8`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{m.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{m.role_in_project?.replace("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      ))}
    </div>
  );
}
