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
  X, Search, Edit2, Clock, Sparkles, Filter, AlertCircle,
  CheckCircle2, ChevronRight, Layers, Users, ShieldAlert, Award
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { format, formatDistanceToNow } from "date-fns";

const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

const FORUM_ROLE_COLORS = {
  Member:      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800/50",
  Coordinator: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50",
  Secretary:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  Treasurer:   "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50",
  Volunteer:   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
};

// Safe date formatter utility
function formatPostTime(dateString) {
  try {
    if (!dateString) return "";
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (err) {
    return "just now";
  }
}

export default function ForumPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  // Local States
  const [newPost, setNewPost] = useState("");
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'my'
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [memberRole, setMemberRole] = useState("Member");

  // Notifications feedback
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Edit / Delete Target States
  const [editTarget, setEditTarget] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // File Upload Reference
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const canPost = isHOD || user?.role === "FACULTY" || user?.student?.is_forum_member;

  // React Queries
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => listForumPosts({ page: 1, per_page: 50 }).then(r => r.data.posts),
  });

  // Mutations
  const removeMutation = useMutation({
    mutationFn: removeForumMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setSuccessMessage("Member removed from Forum successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const coordMutation = useMutation({
    mutationFn: toggleForumCoordinator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setSuccessMessage("Coordinator role toggled successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setPendingStudent(null);
      setMemberRole("Member");
      setSuccessMessage("Forum member assigned successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => createForumPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setNewPost("");
      removeFile();
      setSuccessMessage("Post published successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error || "Failed to publish post.");
      setTimeout(() => setErrorMessage(""), 4000);
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }) => editForumPost(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setEditTarget(null);
      setEditContent("");
      setSuccessMessage("Post updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error || "Failed to edit post.");
      setTimeout(() => setErrorMessage(""), 4000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteForumPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setDeleteTarget(null);
      setSuccessMessage("Post deleted successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error || "Failed to delete post.");
      setTimeout(() => setErrorMessage(""), 4000);
    }
  });

  const likeMutation = useMutation({
    mutationFn: toggleForumPostLike,
    onMutate: async (postId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["forum-posts"] });
      const previousPosts = queryClient.getQueryData(["forum-posts"]);
      queryClient.setQueryData(["forum-posts"], (old) => {
        if (!old) return [];
        return old.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              liked: !p.liked,
              like_count: p.liked ? p.like_count - 1 : p.like_count + 1
            };
          }
          return p;
        });
      });
      return { previousPosts };
    },
    onError: (err, postId, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["forum-posts"], context.previousPosts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
    },
  });

  // File Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("File size should be less than 5MB");
        setTimeout(() => setErrorMessage(""), 4000);
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePublish = () => {
    if (!newPost.trim() && !selectedFile) return;
    const formData = new FormData();
    formData.append("content", newPost);
    if (selectedFile) {
      formData.append("attachment", selectedFile);
    }
    createMutation.mutate(formData);
  };

  const openEditModal = (post) => {
    setEditTarget(post);
    setEditContent(post.content || "");
  };

  // Filter Members
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

  // Coordinators List
  const coordinators = useMemo(() => {
    return memberList.filter(m => m.is_update_coordinator);
  }, [memberList]);

  // Filter Posts
  const postList = posts || [];
  const filteredPosts = useMemo(() => {
    let result = postList;

    // Filter by Contribution tab
    if (activeTab === "my") {
      result = result.filter(p => p.posted_by?.id === user?.id);
    }

    // Filter by search bar query
    if (postSearchQuery.trim()) {
      const q = postSearchQuery.toLowerCase();
      result = result.filter(p =>
        p.content?.toLowerCase().includes(q) ||
        p.posted_by?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [postList, activeTab, postSearchQuery, user]);

  const totalLikes = useMemo(() => {
    return postList.reduce((acc, p) => acc + (p.like_count || 0), 0);
  }, [postList]);

  if (membersLoading || postsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">

      {/* ── Banner Alerts ── */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500 text-white shadow-lg border border-emerald-400/20 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-500 text-white shadow-lg border border-red-400/20 animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Forum Feed</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Share updates, files, and start threads within the department
            </p>
          </div>
        </div>
        {isHOD && (
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-sm font-semibold hover:from-primary-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-primary-glow shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* ── Main Dashboard Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT COLUMN: STATS & COORDINATORS TEAM (4 cols on lg) ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Quick Stats Panel */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-card space-y-4">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Forum Statistics
            </h3>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700/30 rounded-xl">
                <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{postList.length}</div>
                  <div className="text-[10px] text-gray-400 font-semibold mt-1">Posts</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700/30 rounded-xl">
                <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{memberList.length}</div>
                  <div className="text-[10px] text-gray-400 font-semibold mt-1">Members</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700/30 rounded-xl">
                <Heart className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{totalLikes}</div>
                  <div className="text-[10px] text-gray-400 font-semibold mt-1">Likes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Coordinators Team Card */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-card">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Coordinators Team
              </h3>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {coordinators.length}
              </span>
            </div>
            {coordinators.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">No coordinators assigned yet.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {coordinators.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700/20 transition-all">
                    <Avatar src={c.profile_picture} name={c.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-950 dark:text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate uppercase mt-0.5 tracking-wide">
                        {c.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── MIDDLE COLUMN: FEED & POST CREATOR (6 cols on lg) ── */}
        <div className="lg:col-span-6 space-y-6">

          {/* Rich Post Editor Widget */}
          {canPost && (
            <div className="bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-4 shadow-card focus-within:ring-2 focus-within:ring-indigo-500/25 transition-all">
              <div className="flex gap-3.5">
                <Avatar src={user?.profile_picture} name={user?.name} size="md" className="shrink-0 ring-2 ring-indigo-500/10" />
                <div className="flex-1 space-y-3">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Share something with the forum team or write an announcement..."
                    rows={3}
                    className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none py-1 focus:ring-0 focus:outline-none"
                  />

                  {/* File preview */}
                  {filePreview && (
                    <div className="relative rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden w-full max-h-60 bg-gray-50 dark:bg-gray-900/30">
                      <img src={filePreview} alt="upload preview" className="w-full h-full object-contain max-h-60" />
                      <button
                        onClick={removeFile}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Attachment Hidden Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Post creation toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-700/40">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                        selectedFile
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      }`}
                    >
                      <Image className="w-4 h-4 text-indigo-500" />
                      {selectedFile ? "Change Image" : "Add Image"}
                    </button>

                    <button
                      onClick={handlePublish}
                      disabled={createMutation.isPending || (!newPost.trim() && !selectedFile)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-indigo-glow disabled:opacity-50"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Spinner size="xs" color="text-white" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Publish Post
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts Search / Filtering / Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-gray-800/30 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/30">
            {/* Feed Tabs */}
            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                All Discussions
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "my"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                My Posts
              </button>
            </div>

            {/* Feed search bar */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={postSearchQuery}
                onChange={(e) => setPostSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
              {postSearchQuery && (
                <button
                  onClick={() => setPostSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-card">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No posts found</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                  {postSearchQuery ? "Try refining your search keyword" : "Be the first to post something in the forum!"}
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isAuthor = post.posted_by?.id === user?.id;
                // Backend checks window of 30 minutes to allow edits
                const isWithinEditWindow = (new Date() - new Date(post.created_at)) < (30 * 60 * 1000);
                const canEdit = isAuthor && isWithinEditWindow;
                const canDelete = isAuthor || isHOD;

                return (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="md" className="ring-2 ring-gray-100 dark:ring-gray-700" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                              {post.posted_by?.name}
                            </span>
                            {isAuthor && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatPostTime(post.created_at)}
                            {post.is_edited && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-1 py-0.1 rounded font-medium border border-amber-100 dark:border-amber-800/30">
                                edited
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Post actions for author/HOD */}
                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(post)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                              title="Edit post (Available for 30m)"
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

                    {/* Content text */}
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap break-words leading-relaxed">
                      {post.content}
                    </p>

                    {/* Image Attachment */}
                    {post.attachment_url && (
                      <div className="rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden bg-slate-50 dark:bg-gray-900/20 mb-3.5 max-h-80 flex items-center justify-center">
                        <img
                          src={post.attachment_url}
                          alt="attached post media"
                          className="w-full h-full object-cover max-h-80"
                        />
                      </div>
                    )}

                    {/* Bottom stats action bar */}
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-50 dark:border-gray-700/40">
                      <button
                        onClick={() => likeMutation.mutate(post.id)}
                        className={`group inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all ${
                          post.liked
                            ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20"
                            : "text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform group-active:scale-125 duration-150 ${
                            post.liked ? "fill-rose-500 text-rose-500" : ""
                          }`}
                        />
                        <span>{post.like_count || 0}</span>
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN: MEMEBER ROSTER (3 cols on lg) ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Members Roster Card */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-card flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Forum Directory
              </h3>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {filteredMembers.length}
              </span>
            </div>

            {/* Member search bar */}
            <div className="relative mb-3.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search roster..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              {memberSearchQuery && (
                <button
                  onClick={() => setMemberSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Member list container */}
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic py-6 text-center">No matching members</p>
            ) : (
              <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="group/item flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700/20 border border-transparent hover:border-gray-100 dark:hover:border-gray-700/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={m.profile_picture} name={m.name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-gray-950 dark:text-white truncate">{m.name}</p>
                          {m.is_update_coordinator && (
                            <Crown className="w-3 h-3 text-amber-500 shrink-0" title="Forum Coordinator" />
                          )}
                        </div>
                        <span className={`inline-flex items-center px-1.5 py-0.2 mt-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${FORUM_ROLE_COLORS[m.role] || FORUM_ROLE_COLORS.Member}`}>
                          {m.role}
                        </span>
                        <span className="text-[8px] text-gray-400 ml-1 font-semibold">
                          · {m.class_name?.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* HOD Actions */}
                    {isHOD && (
                      <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          onClick={() => coordMutation.mutate(m.id)}
                          disabled={coordMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors ${
                            m.is_update_coordinator
                              ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20 hover:text-amber-600"
                              : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          }`}
                          title={m.is_update_coordinator ? "Revoke Coordinator status" : "Make Coordinator"}
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeMutation.mutate(m.id)}
                          disabled={removeMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Searchable student picker (HOD) ── */}
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

      {/* ── Role selection for the picked student ── */}
      {pendingStudent && (
        <Modal open={!!pendingStudent} onClose={() => setPendingStudent(null)} title="Assign Forum Role">
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700/50">
              <Avatar src={pendingStudent.profile_picture} name={pendingStudent.name} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{pendingStudent.name}</p>
                <p className="text-xs text-gray-450 dark:text-gray-400 truncate mt-0.5">
                  {pendingStudent.class_name?.replace("_", " ")} · {pendingStudent.email}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                Forum Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORUM_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMemberRole(r)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      memberRole === r
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPendingStudent(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => assignMutation.mutate({ studentId: pendingStudent.id, role: memberRole })}
                disabled={assignMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-sm hover:shadow-indigo-glow disabled:opacity-60"
              >
                {assignMutation.isPending ? "Adding…" : "Add Member"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Forum Post Modal ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Forum Post">
        <div className="space-y-4 pt-1">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full p-3.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all"
            placeholder="Edit your post content..."
          />
          <div className="flex gap-3">
            <button
              onClick={() => setEditTarget(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editMutation.isPending || !editContent.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-sm hover:shadow-indigo-glow disabled:opacity-60"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm dialog ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Delete Post"
        message="Are you sure you want to delete this forum post? This action is permanent and cannot be undone."
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        danger
      />

    </div>
  );
}
