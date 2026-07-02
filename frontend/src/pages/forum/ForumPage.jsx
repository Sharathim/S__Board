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
  MessageSquare, Heart, Trash2, Crown, Image,
  X, Search, Edit2, Clock, AlertCircle,
  CheckCircle2, Users, Plus, Calendar, Share2
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { createPortal } from "react-dom";

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

function parseForumPostContent(content = "") {
  if (!content) return { title: "", body: "" };
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return { title: lines[0], body: lines.slice(1).join("\n") };
  }
  return { title: "", body: content };
}

export default function ForumPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [newPost, setNewPost] = useState("");
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
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
  
  // Compact state expansions
  const [expandedPostIds, setExpandedPostIds] = useState({});
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const canPost = user?.student?.is_forum_member === true;

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => listForumPosts({ page: 1, per_page: 50 }).then(r => r.data.posts),
  });

  // Lightbox key listener for arrow navigation
  useEffect(() => {
    if (lightboxImages.length === 0) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === "Escape") {
        setLightboxImages([]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImages]);

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

  const postList = posts || [];
  
  // Real Search Filtering on Posts
  const filteredPosts = useMemo(() => {
    if (!postSearchQuery.trim()) return postList;
    const q = postSearchQuery.toLowerCase();
    return postList.filter(p =>
      p.content?.toLowerCase().includes(q) ||
      p.posted_by?.name?.toLowerCase().includes(q)
    );
  }, [postList, postSearchQuery]);

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

  const handleOpenLightbox = (urls, index) => {
    setLightboxImages(urls);
    setLightboxIndex(index);
  };

  const toggleExpandPost = (postId) => {
    setExpandedPostIds(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

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
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 animate-pulse">Loading Forum...</p>
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
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in {
          animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
      <div className="flex items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Forum</h1>
          {/* Vibrant, glittering count icon */}
          <button
            onClick={() => setShowMembersModal(true)}
            className="glitter-btn w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 hover:scale-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(139,92,246,0.5)] shrink-0"
            title="View Forum Directory"
          >
            {memberList.length}
          </button>
        </div>

        {/* Header End Actions */}
        <div className="flex items-center gap-2">
          {isHOD && (
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Member
            </button>
          )}
          {canPost && (
            <button
              onClick={() => setPostModalOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-1.8 rounded-xl bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Post
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout: Feed left, Sidebar right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left column: Feed */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Post Search Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search posts by content or author..."
              value={postSearchQuery}
              onChange={(e) => setPostSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
            />
            {postSearchQuery && (
              <button onClick={() => setPostSearchQuery("")} className="absolute right-3.5 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Inline Feed Post Composer */}
          {canPost && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex gap-3">
                <Avatar
                  src={user?.profile_picture}
                  name={user?.name}
                  size="sm"
                  className="shrink-0 w-8 h-8 ring-2 ring-violet-500/10"
                />
                <div className="flex-1">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Share something with the department forum..."
                    rows={newPost.trim() || selectedFiles.length > 0 ? 3 : 1}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Upload Previews */}
              {filePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 pl-11">
                  {filePreviews.map((preview, idx) => (
                    <div key={idx} className="relative rounded-xl border border-gray-155 dark:border-gray-700 overflow-hidden h-16 bg-gray-50 dark:bg-gray-900/30 animate-fade-in group">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions Row */}
              <div className="flex items-center justify-between pl-11 pt-2.5 border-t border-slate-100 dark:border-slate-800/40">
                <div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-805 transition-all"
                  >
                    <Image className="w-3.5 h-3.5 text-violet-500" />
                    Add Image
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {(newPost.trim() || selectedFiles.length > 0) && (
                    <button
                      type="button"
                      onClick={() => { setNewPost(""); setSelectedFiles([]); setFilePreviews([]); }}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-750 text-[11px] font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={createMutation.isPending || (!newPost.trim() && selectedFiles.length === 0)}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-700 hover:to-indigo-700 text-white text-[11px] font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    {createMutation.isPending ? "Publishing..." : "Publish Post"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts Feed Area */}
          <div className="space-y-4">
            {postsByDay.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-3 border border-gray-100 dark:border-gray-700/40">
                  <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-350">No posts matched search</h4>
                <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs">
                  Try adjusting your search queries or share a new post!
                </p>
              </div>
            ) : (
              postsByDay.map((group) => (
                <div key={group.dateString} className="space-y-3">
                  
                  {/* Clean Date Divider */}
                  <div className="flex items-center gap-3 my-4">
                    <span className="text-[9px] font-black tracking-widest text-gray-400 dark:text-gray-505 uppercase flex items-center gap-1 shrink-0 bg-gray-55 dark:bg-slate-950/20 py-0.8 px-3 rounded-full border border-gray-200/40 dark:border-slate-800/20">
                      <Calendar className="w-3 h-3 text-violet-500" />
                      {group.dateString}
                    </span>
                    <div className="h-[1px] w-full bg-gray-150 dark:bg-slate-800/30" />
                  </div>

                  {/* Individual Post Cards (RESTYLED: COMPACT DESIGN) */}
                  {group.posts.map((post) => {
                    const isAuthor = post.posted_by?.id === user?.id;
                    const isWithinEditWindow = (new Date() - new Date(post.created_at)) < (30 * 60 * 1000);
                    const canEdit = isAuthor && isWithinEditWindow;
                    const canDelete = isAuthor || isHOD;
                    
                    const { title, body } = parseForumPostContent(post.content);
                    const isExpanded = !!expandedPostIds[post.id];
                    const hasLongBody = body.length > 220;
                    
                    const urls = post.attachment_url ? post.attachment_url.split(',').filter(Boolean) : [];

                    return (
                      <div
                        key={post.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/70 shadow-[0_1px_8px_rgba(30,50,80,0.02)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)] space-y-2.5 hover:border-violet-200 dark:hover:border-violet-850/40 hover:shadow-[0_4px_16px_rgba(139,92,246,0.04)] transition-all duration-200"
                      >
                        {/* Post Header (Author info + actions) */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={post.posted_by?.profile_picture}
                              name={post.posted_by?.name}
                              size="xs"
                              className="ring-2 ring-slate-50 dark:ring-slate-800 shrink-0 w-7 h-7"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-gray-900 dark:text-white leading-none">
                                  {post.posted_by?.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {post.posted_by?.role}
                                </span>
                                {isAuthor && (
                                  <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-violet-50 dark:bg-violet-900/30 text-violet-650 dark:text-violet-400 uppercase tracking-wide">
                                    You
                                  </span>
                                )}
                                {post.is_edited && (
                                  <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                    Edited
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5 ml-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  {formatPostTime(post.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions (Edit / Delete) */}
                          {(canEdit || canDelete) && (
                            <div className="flex items-center gap-0.5">
                              {canEdit && (
                                <button
                                  onClick={() => openEditModal(post)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                                  title="Edit post (30 min window)"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => setDeleteTarget(post)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                  title="Delete post"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Split Content: Text Left, Thumbnail Right (Compact Space Saving) */}
                        <div className="flex gap-4 items-start justify-between">
                          <div className="flex-1 min-w-0 space-y-1">
                            {title && (
                              <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
                                {title}
                              </h3>
                            )}
                            <p className="text-xs text-gray-750 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                              {isExpanded ? body : (hasLongBody ? body.slice(0, 220) + "..." : body)}
                              {hasLongBody && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandPost(post.id)}
                                  className="text-violet-650 dark:text-violet-400 font-bold ml-1 hover:underline focus:outline-none"
                                >
                                  {isExpanded ? "Show Less" : "Read More"}
                                </button>
                              )}
                            </p>
                          </div>

                          {/* Image Attachment (Desktop Side-by-Side Thumbnail) */}
                          {urls.length > 0 && (
                            <div className="shrink-0 animate-fade-in">
                              <div 
                                className="relative w-40 h-24 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 cursor-pointer shadow-sm hover:scale-[1.01] hover:brightness-95 transition-all group"
                                onClick={() => handleOpenLightbox(urls, 0)}
                              >
                                <img
                                  src={urls[0]}
                                  alt="attachment thumbnail"
                                  className="w-full h-full object-cover"
                                />
                                {urls.length > 1 && (
                                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider">
                                    +{urls.length - 1} More
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/40 mt-1 text-slate-400">
                          <div className="flex items-center gap-5">
                            <button
                              onClick={() => likeMutation.mutate(post.id)}
                              className={`group/like inline-flex items-center gap-1 text-[11px] font-semibold py-1 transition-all ${post.liked
                                ? "text-rose-500"
                                : "text-gray-400 hover:text-rose-500"
                                }`}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 transition-all group-active/like:scale-120 duration-150 ${post.liked ? "fill-rose-500 text-rose-500" : ""}`}
                              />
                              <span>{post.like_count || 0}</span>
                            </button>

                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                              <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                              <span>0</span>
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/forum#post-${post.id}`);
                              showSuccess("Link copied to clipboard!");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-405 hover:text-indigo-650 transition-colors"
                            title="Copy link to post"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Sticky Sidebar (Directory, Quick management) */}
        <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-24">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Forum Roster</h2>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-655 dark:text-violet-405">
                {memberList.length}
              </span>
            </div>

            {/* Inline Quick Add Roster */}
            {isHOD && (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-violet-200 dark:border-violet-800/40 text-violet-650 dark:text-violet-400 text-xs font-bold hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:border-violet-400 transition-all active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" /> Add Forum Member
              </button>
            )}

            {/* Roster Search Bar */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search forum members..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all"
              />
              {memberSearchQuery && (
                <button onClick={() => setMemberSearchQuery("")} className="absolute right-3 text-gray-405 hover:text-gray-650">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Roster Members List (Sidebar view) */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-5 italic">No members found</p>
              ) : (
                filteredMembers.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/20 hover:bg-gray-100/80 dark:hover:bg-gray-805 transition-all border border-gray-100/60 dark:border-gray-850/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar src={m.profile_picture} name={m.name} size="sm" className="ring-1 ring-gray-100 dark:ring-gray-800 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">{m.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">
                            {m.class_name?.replace("_", " ")}
                          </span>
                          <span className="text-[8px] font-bold text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-1 py-0.5 rounded">
                            {m.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isHOD && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => coordMutation.mutate(m.id)}
                          disabled={coordMutation.isPending}
                          className={`p-1 rounded-lg transition-colors ${m.is_update_coordinator ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20" : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}
                          title={m.is_update_coordinator ? "Revoke Coordinator" : "Make Coordinator"}
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeMutation.mutate(m.id)}
                          disabled={removeMutation.isPending}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
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
        placeholder="Search students by name, email, roll…"
        emptyText="No eligible students found."
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
              className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-55 dark:bg-gray-900/30 text-gray-900 dark:text-gray-105 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all"
            />
            {memberSearchQuery && (
              <button onClick={() => setMemberSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-655">
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
                      <p className="text-[10px] text-gray-505 dark:text-gray-400 mt-1">
                        Class: <span className="font-semibold text-gray-750 dark:text-gray-300">{m.class_name?.replace("_", " ")}</span> · Role: <span className="font-semibold text-gray-750 dark:text-gray-300">{m.role}</span>
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
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-505 hover:bg-red-55 transition-colors"
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
            className="w-full p-3.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-55 dark:bg-gray-900/30 text-gray-900 dark:text-gray-101 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all resize-none leading-relaxed"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-250 dark:border-gray-700 text-gray-505 hover:text-gray-700 dark:hover:text-gray-305 hover:bg-gray-55 transition-all"
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-750 hover:to-indigo-750 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
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
            className="w-full p-4 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-101 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all resize-none"
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

      {/* ── Image Lightbox Modal with Gallery Navigation ── */}
      {lightboxImages.length > 0 && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setLightboxImages([])}
        >
          {/* Close button */}
          <button 
            onClick={() => setLightboxImages([])}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[100000]"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          {lightboxImages.length > 1 && (
            <>
              <button
                className="absolute left-5 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[100000] focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                }}
              >
                <span className="text-3xl font-black leading-none">&lsaquo;</span>
              </button>
              <button
                className="absolute right-5 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[100000] focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
                }}
              >
                <span className="text-3xl font-black leading-none">&rsaquo;</span>
              </button>
            </>
          )}

          {/* Large image view */}
          <div className="max-w-[95vw] max-h-[85vh] flex flex-col items-center justify-center p-4">
            <img 
              src={lightboxImages[lightboxIndex]} 
              alt="Lightbox view" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl animate-zoom-in"
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxImages.length > 1 && (
              <span className="text-white/60 text-xs font-bold mt-4 select-none bg-black/40 px-3 py-1 rounded-full border border-white/5">
                {lightboxIndex + 1} / {lightboxImages.length}
              </span>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
