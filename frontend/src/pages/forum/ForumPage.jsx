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
  TrendingUp, Hash, BookOpen, Plus, ChevronDown, Star
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";

const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

const FORUM_ROLE_META = {
  Member:      { color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400" },
  Coordinator: { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dot: "bg-violet-500" },
  Secretary:   { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
  Treasurer:   { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", dot: "bg-rose-500" },
  Volunteer:   { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
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

  // ✅ FIX: handleSaveEdit was missing — added here
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
  const filteredPosts = useMemo(() => {
    let result = postList;
    if (activeTab === "my") result = result.filter(p => p.posted_by?.id === user?.id);
    if (postSearchQuery.trim()) {
      const q = postSearchQuery.toLowerCase();
      result = result.filter(p =>
        p.content?.toLowerCase().includes(q) ||
        p.posted_by?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [postList, activeTab, postSearchQuery, user]);

  const totalLikes = useMemo(() => postList.reduce((acc, p) => acc + (p.like_count || 0), 0), [postList]);

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
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Loading Forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">

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

      {/* ── Top Header Title Line ── */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Forum</h1>
          <button
            type="button"
            onClick={() => setShowMembersModal(true)}
            className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-extrabold flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
            title="View Forum Members"
          >
            {memberList.length}
          </button>
        </div>

        {isHOD && (
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT SIDEBAR (Only Spotlight if coordinators exist) ── */}
        {coordinators.length > 0 ? (
          <div className="lg:col-span-3 space-y-5">
            {/* Coordinator Spotlight */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-100 dark:border-amber-800/30 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Leadership</span>
                <span className="ml-auto text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">{coordinators.length}</span>
              </div>
              <div className="p-3 space-y-2">
                {coordinators.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group">
                    <div className="relative">
                      <Avatar src={c.profile_picture} name={c.name} size="sm" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                        <Star className="w-1.5 h-1.5 text-white" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                      <RoleBadge role={c.role} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── MAIN FEED ── */}
        <div className={coordinators.length > 0 ? "lg:col-span-9 space-y-5" : "lg:col-span-12 space-y-5 max-w-4xl mx-auto w-full"}>

          {/* Post Composer */}
          {canPost && (
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/25 focus-within:border-violet-300 dark:focus-within:border-violet-700/60 transition-all">
              {/* Composer Top Bar */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-50 dark:border-gray-700/40">
                <Avatar src={user?.profile_picture} name={user?.name} size="md" className="shrink-0 ring-2 ring-violet-500/15" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{user?.name}</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">{user?.role}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800/40">
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">New Post</span>
                </div>
              </div>

              {/* Textarea Area */}
              <div className="p-4">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share something with the forum team or write an announcement..."
                  rows={3}
                  className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:ring-0 leading-relaxed"
                />

                {/* Images Preview Grid */}
                {filePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                    {filePreviews.map((preview, idx) => (
                      <div key={idx} className="relative rounded-xl border border-gray-150 dark:border-gray-700 overflow-hidden h-28 bg-gray-50 dark:bg-gray-900/30 animate-fade-in">
                        <img src={preview} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors shadow-sm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
              </div>

              {/* Composer Toolbar */}
              <div className="flex items-center justify-between px-4 pb-4 gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedFiles.length > 0
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800/40"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    }`}
                  >
                    <Image className="w-3.5 h-3.5" />
                    {selectedFiles.length > 0 ? `Add More (${selectedFiles.length})` : "Add Image"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={createMutation.isPending || (!newPost.trim() && selectedFiles.length === 0)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {createMutation.isPending ? <><Spinner size="xs" color="text-white" />Publishing...</> : <><Send className="w-4 h-4" />Publish</>}
                </button>
              </div>
            </div>
          )}

          {/* Feed Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/60 p-1 shadow-sm">
              {[
                { key: "all", label: "All Posts", icon: Hash },
                { key: "my", label: "My Posts", icon: BookOpen },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab.key
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts by content or author..."
                value={postSearchQuery}
                onChange={(e) => setPostSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600/60 bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all shadow-sm"
              />
              {postSearchQuery && (
                <button onClick={() => setPostSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Count */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm shrink-0">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{filteredPosts.length}</span>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700/40">
                  <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No posts found</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  {postSearchQuery ? "Try a different search keyword" : "Be the first to share something with the forum!"}
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isAuthor = post.posted_by?.id === user?.id;
                const isWithinEditWindow = (new Date() - new Date(post.created_at)) < (30 * 60 * 1000);
                const canEdit = isAuthor && isWithinEditWindow;
                const canDelete = isAuthor || isHOD;

                return (
                  <div
                    key={post.id}
                    className="group bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-violet-100 dark:hover:border-violet-800/30 transition-all duration-200"
                  >
                    {/* Post Header */}
                    <div className="flex items-start justify-between gap-3 p-5 pb-0">
                      <div className="flex items-center gap-3">
                        <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="md" className="ring-2 ring-gray-100 dark:ring-gray-700 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {post.posted_by?.name}
                            </span>
                            {isAuthor && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800/40 uppercase tracking-wide">
                                You
                              </span>
                            )}
                            {post.is_edited && (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 uppercase tracking-wide">
                                Edited
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatPostTime(post.created_at)}
                          </span>
                        </div>
                      </div>

                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(post)}
                              className="p-2 rounded-xl text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                              title="Edit post (30 min window)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(post)}
                              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              title="Delete post"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="px-5 py-4">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    {/* Image Attachment */}
                    {post.attachment_url && (
                      <div className="px-5 pb-4">
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
                                  <img key={i} src={url} alt={`attachment-${i}`} className="w-full h-48 object-cover" />
                                ))}
                              </div>
                            );
                          }
                          if (urls.length === 3) {
                            return (
                              <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 h-64 animate-fade-in">
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
                                <div key={i} className="relative h-40">
                                  <img src={url} alt={`attachment-${i}`} className="w-full h-full object-cover" />
                                  {i === 3 && urls.length > 4 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-lg animate-fade-in">
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
                    <div className="px-5 pb-4 flex items-center gap-4 border-t border-gray-50 dark:border-gray-700/30 pt-3">
                      <button
                        onClick={() => likeMutation.mutate(post.id)}
                        className={`group/like inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${
                          post.liked
                            ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30"
                            : "text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-all group-active/like:scale-125 duration-150 ${post.liked ? "fill-rose-500 text-rose-500" : ""}`}
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
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Select Preset Role</label>
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
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Custom Designation</label>
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
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
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
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
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
              placeholder="Search members..."
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
                  className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-100 dark:border-gray-700/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar src={m.profile_picture} name={m.name} size="sm" />
                      {m.is_update_coordinator && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border border-white dark:border-gray-800 flex items-center justify-center">
                          <Crown className="w-1.5 h-1.5 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">{m.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{m.class_name?.replace("_", " ")}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <RoleBadge role={m.role} />
                      </div>
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
