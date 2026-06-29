import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listForumMembers,
  listEligibleStudents,
  assignForumMember,
  removeForumMember,
  toggleForumCoordinator,
  listForumPosts,
  createForumPost,
  editForumPost,
  deleteForumPost,
  toggleForumPostLike
} from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { SearchPicker } from "../../components/shared/SearchPicker";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  MessageSquare, Heart, Trash2, UserPlus, Crown, Send, Image,
  X, Search, Edit2, Clock, Sparkles, AlertCircle,
  CheckCircle2, Users, ShieldAlert, Award, Flame,
  TrendingUp, Hash, BookOpen, Plus, ChevronDown, Star, Calendar
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";

const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

const FORUM_ROLE_META = {
  Member: { color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400" },
  Coordinator: { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dot: "bg-violet-500" },
  Secretary: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
  Treasurer: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", dot: "bg-rose-500" },
  Volunteer: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
};

function formatPostTime(dateString) {
  try {
    if (!dateString) return "";
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "just now";
  }
}

function RoleBadge({ role }) {
  const meta = FORUM_ROLE_META[role] || FORUM_ROLE_META.Member;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {role}
    </span>
  );
}

export default function ForumPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [newPost, setNewPost] = useState("");
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [rolePreset, setRolePreset] = useState("President");
  const [customRole, setCustomRole] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [editTarget, setEditTarget] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);

  const canPost = user?.student?.is_forum_member === true;

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => listForumPosts({ page: 1, per_page: 50 }).then(r => r.data.posts),
  });

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(""), 3500); };
  const showError = (msg) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(""), 4000); };

  const removeMutation = useMutation({
    mutationFn: removeForumMember,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forum-members"] }); showSuccess("Member removed from Forum."); },
    onError: () => showError("Failed to remove member."),
  });

  const coordMutation = useMutation({
    mutationFn: toggleForumCoordinator,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forum-members"] }); showSuccess("Coordinator role updated."); },
    onError: () => showError("Failed to update coordinator role."),
  });

  const assignMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setPendingStudent(null);
      setRolePreset("President");
      setCustomRole("");
      showSuccess("Forum member assigned successfully.");
    },
    onError: () => showError("Failed to assign member."),
  });

  const createMutation = useMutation({
    mutationFn: (data) => createForumPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setNewPost("");
      setSelectedFiles([]);
      setFilePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showSuccess("Post published successfully!");
    },
    onError: (err) => showError(err.response?.data?.error || "Failed to publish post."),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }) => editForumPost(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setEditTarget(null);
      setEditContent("");
      showSuccess("Post updated successfully!");
    },
    onError: (err) => showError(err.response?.data?.error || "Failed to edit post."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteForumPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setDeleteTarget(null);
      showSuccess("Post deleted.");
    },
    onError: (err) => showError(err.response?.data?.error || "Failed to delete post."),
  });

  const likeMutation = useMutation({
    mutationFn: toggleForumPostLike,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["forum-posts"] });
      const previousPosts = queryClient.getQueryData(["forum-posts"]);
      queryClient.setQueryData(["forum-posts"], (old) => {
        if (!old) return [];
        return old.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, like_count: p.liked ? p.like_count - 1 : p.like_count + 1 }
            : p
        );
      });
      return { previousPosts };
    },
    onError: (err, postId, context) => {
      if (context?.previousPosts) queryClient.setQueryData(["forum-posts"], context.previousPosts);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts"] }),
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newFiles = [];
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        showError(`${file.name} is too large (max 5MB).`);
        return;
      }
      newFiles.push(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePublish = () => {
    if (!newPost.trim() && selectedFiles.length === 0) return;
    const formData = new FormData();
    formData.append("content", newPost);
    selectedFiles.forEach((file) => {
      formData.append("attachment", file);
    });
    createMutation.mutate(formData);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || !editTarget) return;
    editMutation.mutate({ id: editTarget.id, content: editContent });
  };

  const openEditModal = (post) => {
    setEditTarget(post);
    setEditContent(post.content || "");
  };

  const memberList = members || [];
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return memberList;
    const q = memberSearchQuery.toLowerCase();
    return memberList.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.class_name?.toLowerCase().includes(q)
    );
  }, [memberList, memberSearchQuery]);

  const coordinators = useMemo(() => memberList.filter(m => m.is_update_coordinator), [memberList]);

  const postList = posts || [];
  const filteredPosts = postList;

  const totalLikes = useMemo(() => postList.reduce((acc, p) => acc + (p.like_count || 0), 0), [postList]);

  const postsByDay = useMemo(() => {
    const groups = {};
    filteredPosts.forEach(post => {
      const date = new Date(post.created_at);
      const dateString = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(post);
    });

    return Object.keys(groups).map(dateKey => {
      const groupPosts = groups[dateKey].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return {
        dateString: dateKey,
        posts: groupPosts,
      };
    }).sort((a, b) => new Date(b.posts[0].created_at) - new Date(a.posts[0].created_at));
  }, [filteredPosts]);

  if (membersLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-505">Loading Forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in pb-12">
      <style>{`
        @keyframes glitter {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }
        .glitter-btn {
          position: relative;
          overflow: hidden;
        }
        .glitter-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to right,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.45) 50%,
            rgba(255,255,255,0) 100%
          );
          transform: rotate(45deg);
          animation: glitter 3s infinite linear;
        }
      `}</style>

      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xl shadow-emerald-500/30 border border-emerald-400/20 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-2xl shadow-red-500/30 border border-red-400/20 animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{errorMessage}</p>
        </div>
      )}

      {/* Redesigned Header Row */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800/80 pb-5 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Forum</h1>
          {/* Vibrant, glittering count icon */}
          <button
            onClick={() => setShowMembersModal(true)}
            className="glitter-btn w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 hover:scale-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(139,92,246,0.6)] hover:shadow-[0_0_18px_rgba(139,92,246,0.8)] shrink-0"
            title="View Forum Directory"
          >
            {memberList.length}
          </button>
        </div>

        {/* Straight Right End Actions */}
        <div className="flex items-center gap-2">
          {isHOD && (
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold transition-all shadow-md hover:shadow-violet-500/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Member
            </button>
          )}
          {canPost && (
            <button
              onClick={() => setPostModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold transition-all shadow-md hover:shadow-violet-500/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" /> Post
            </button>
          )}
        </div>
      </div>

      {/* Date Grouped Posts */}
      <div className="space-y-6">
        {postsByDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl border border-gray-150 dark:border-gray-700/80 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700/40">
              <MessageSquare className="w-7 h-7 text-gray-300 dark:text-gray-655" />
            </div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No posts shared yet</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Be the first to share something with the forum!
            </p>
          </div>
        ) : (
          postsByDay.map((group) => (
            <div
              key={group.dateString}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-150 dark:border-gray-700/80 rounded-3xl p-6 shadow-sm space-y-4"
            >
              {/* Date Header */}
              <div className="flex items-center gap-2 pb-3.5 border-b border-gray-100 dark:border-gray-750/50">
                <Calendar className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{group.dateString}</span>
              </div>

              {/* Group Posts */}
              <div className="space-y-4 pt-1">
                {group.posts.map((post) => {
                  const isAuthor = post.posted_by?.id === user?.id;
                  const isWithinEditWindow = (new Date() - new Date(post.created_at)) < (30 * 60 * 1000);
                  const canEdit = isAuthor && isWithinEditWindow;
                  const canDelete = isAuthor || isHOD;

                  return (
                    <div
                      key={post.id}
                      className="p-5 rounded-2xl bg-slate-50/50 dark:bg-gray-900/35 border border-slate-100 dark:border-gray-800/50 space-y-4 hover:border-violet-200 dark:hover:border-violet-800/30 transition-colors"
                    >
                      {/* Post Header (Author details) */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={post.posted_by?.profile_picture}
                            name={post.posted_by?.name}
                            size="md"
                            className="ring-2 ring-gray-100 dark:ring-gray-700 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {post.posted_by?.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {post.posted_by?.role}
                              </span>
                              {isAuthor && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-100/30 dark:border-violet-800/30 uppercase tracking-wide">
                                  You
                                </span>
                              )}
                              {post.is_edited && (
                                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100/30 dark:border-amber-800/30 uppercase tracking-wide">
                                  Edited
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-505 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Edit/Delete actions */}
                        {(canEdit || canDelete) && (
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(post)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                                title="Edit post (30 min window)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(post)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                title="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                        {post.content}
                      </p>

                      {/* Image Attachment */}
                      {post.attachment_url && (
                        <div className="mt-2.5">
                          {(() => {
                            const urls = post.attachment_url.split(',').filter(Boolean);
                            if (urls.length === 0) return null;
                            if (urls.length === 1) {
                              return (
                                <div className="rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden bg-gray-50 dark:bg-gray-900/30 max-h-96 flex items-center justify-center animate-fade-in">
                                  <img
                                    src={urls[0]}
                                    alt="post attachment"
                                    className="w-full object-cover max-h-96"
                                    onError={(e) => { e.target.parentElement.style.display = "none"; }}
                                  />
                                </div>
                              );
                            }
                            if (urls.length === 2) {
                              return (
                                <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 animate-fade-in">
                                  {urls.map((url, i) => (
                                    <img key={i} src={url} alt={`attachment-${i}`} className="w-full h-40 object-cover hover:scale-[1.01] transition-transform duration-205" />
                                  ))}
                                </div>
                              );
                            }
                            if (urls.length === 3) {
                              return (
                                <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 h-48 animate-fade-in">
                                  <img src={urls[0]} alt="attachment-0" className="col-span-2 w-full h-full object-cover" />
                                  <div className="grid grid-rows-2 gap-2 h-full">
                                    <img src={urls[1]} alt="attachment-1" className="w-full h-full object-cover" />
                                    <img src={urls[2]} alt="attachment-2" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 animate-fade-in">
                                {urls.slice(0, 4).map((url, i) => (
                                  <div key={i} className="relative h-32">
                                    <img src={url} alt={`attachment-${i}`} className="w-full h-full object-cover" />
                                    {i === 3 && urls.length > 4 && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-sm animate-fade-in">
                                        +{urls.length - 4}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Post Footer */}
                      <div className="flex items-center gap-4 pt-2.5 border-t border-gray-100 dark:border-gray-800/40">
                        <button
                          onClick={() => likeMutation.mutate(post.id)}
                          className={`group/like inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all ${post.liked
                              ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/30 dark:border-rose-900/30"
                              : "text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-all group-active/like:scale-125 duration-150 ${post.liked ? "fill-rose-500 text-rose-500" : ""}`}
                          />
                          <span>{post.like_count || 0}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Add Member Picker ── */}
      <SearchPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add Forum Member"
        queryKey="eligible-students"
        fetchFn={(search) => listEligibleStudents(search).then(r => r.data.students)}
        onPick={(student) => { setPendingStudent(student); setPickerOpen(false); }}
        placeholder="Search 3A/3B students by name, email, roll…"
        emptyText="No eligible students found (3A/3B, not already members)."
      />

      {/* ── Role Selection Modal ── */}
      {pendingStudent && (
        <Modal open={!!pendingStudent} onClose={() => setPendingStudent(null)} title="Assign Forum Role">
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-2xl border border-violet-100 dark:border-violet-800/30">
              <Avatar src={pendingStudent.profile_picture} name={pendingStudent.name} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{pendingStudent.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {pendingStudent.class_name?.replace("_", " ")} · {pendingStudent.email}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-2">Select Preset Role</label>
              <select
                value={rolePreset}
                onChange={(e) => {
                  setRolePreset(e.target.value);
                  if (e.target.value !== "Custom") {
                    setCustomRole("");
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
              >
                <option value="President">President</option>
                <option value="Vice President">Vice President</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Secretary">Secretary</option>
                <option value="Custom">Custom Designation...</option>
              </select>
            </div>

            {rolePreset === "Custom" && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-2">Custom Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Vice Secretary, Creative Head"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingStudent(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-gray-750 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalRole = rolePreset === "Custom" ? customRole.trim() : rolePreset;
                  if (!finalRole) {
                    showError("Please enter a custom designation.");
                    return;
                  }
                  assignMutation.mutate({ studentId: pendingStudent.id, role: finalRole });
                }}
                disabled={assignMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
              >
                {assignMutation.isPending ? "Adding…" : `Add as ${rolePreset === "Custom" && customRole ? customRole : rolePreset}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Members Directory Modal ── */}
      <Modal open={showMembersModal} onClose={() => setShowMembersModal(false)} title="Forum Directory">
        <div className="space-y-4 pt-1">
          {/* Member Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, role or class..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all"
            />
            {memberSearchQuery && (
              <button onClick={() => setMemberSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8 italic">No matching members found</p>
            ) : (
              filteredMembers.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-100 dark:border-gray-700/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-gray-100 dark:ring-gray-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">{m.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        Class: <span className="font-semibold text-gray-700 dark:text-gray-300">{m.class_name?.replace("_", " ")}</span> · Role: <span className="font-semibold text-gray-700 dark:text-gray-300">{m.role}</span>
                      </p>
                    </div>
                  </div>
                  {isHOD && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => coordMutation.mutate(m.id)}
                        disabled={coordMutation.isPending}
                        className={`p-1.5 rounded-lg transition-colors ${m.is_update_coordinator ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20" : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}
                        title={m.is_update_coordinator ? "Revoke Coordinator" : "Make Coordinator"}
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeMutation.mutate(m.id)}
                        disabled={removeMutation.isPending}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ── Create Forum Post Modal ── */}
      <Modal open={postModalOpen} onClose={() => { setPostModalOpen(false); setSelectedFiles([]); setFilePreviews([]); }} title="Create Forum Post">
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-3">
            <Avatar src={user?.profile_picture} name={user?.name} size="sm" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{user?.name}</p>
              <p className="text-[10px] text-violet-650 dark:text-violet-400 font-bold uppercase">{user?.role}</p>
            </div>
          </div>

          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share something with the forum..."
            rows={4}
            className="w-full p-3.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all resize-none leading-relaxed"
          />

          {/* Previews */}
          {filePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {filePreviews.map((preview, idx) => (
                <div key={idx} className="relative rounded-xl border border-gray-150 dark:border-gray-700 overflow-hidden h-20 bg-gray-50 dark:bg-gray-900/30 animate-fade-in">
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-250 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-755 transition-all"
            >
              <Image className="w-3.5 h-3.5 text-violet-500" />
              Add Image
            </button>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setPostModalOpen(false); setSelectedFiles([]); setFilePreviews([]); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-gray-750 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                handlePublish();
                setPostModalOpen(false);
              }}
              disabled={createMutation.isPending || (!newPost.trim() && selectedFiles.length === 0)}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
            >
              {createMutation.isPending ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Post Modal ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Forum Post">
        <div className="space-y-4 pt-1">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={5}
            className="w-full p-4 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all resize-none"
            placeholder="Edit your post..."
          />
          <div className="flex gap-3">
            <button
              onClick={() => setEditTarget(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editMutation.isPending || !editContent.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Delete Post"
        message="Are you sure you want to delete this forum post? This action cannot be undone."
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete Post"}
        danger
      />

    </div>
  );
}
