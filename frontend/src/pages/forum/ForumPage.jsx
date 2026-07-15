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
  toggleForumPostLike,
  getForumInvite,
  toggleForumInvite
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
  CheckCircle2, Users, Plus, Calendar, Share2, Copy, UserPlus, MoreVertical
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Pagination } from "../../components/shared/Pagination";
import { format, formatDistanceToNow } from "date-fns";
import { parseUTCDate } from "../../utils/dateUtils";
import { Switch } from "../../components/ui/Switch";
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
    return formatDistanceToNow(parseUTCDate(dateString), { addSuffix: true });
  } catch {
    return "just now";
  }
}

import { useNavigate } from "react-router-dom";

function parseForumPostContent(content = "") {
  if (!content) return { title: "", body: "" };
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return { title: lines[0], body: lines.slice(1).join("\n") };
  }
  return { title: "", body: content };
}

function ForumPostKebab({ post, isAuthor, isHOD, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isWithinEditWindow = (new Date() - parseUTCDate(post.created_at)) < (30 * 60 * 1000);
  const canEdit = isAuthor && isWithinEditWindow;
  const canDelete = isAuthor || isHOD;

  if (!canEdit && !canDelete) return null;

  return (
    <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4.5 h-4.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-150 dark:border-gray-700 py-1 animate-fade-in">
          {canEdit && (
            <button
              onClick={() => { setOpen(false); onEdit(post); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { setOpen(false); onDelete(post); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
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

  const navigate = useNavigate();
  const [postTitle, setPostTitle] = useState("");
  const [postTags, setPostTags] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState("");

  const isForumMember = isHOD || user?.role === "FACULTY" || user?.student?.is_forum_member === true;
  const canPost = isForumMember;

  const [page, setPage] = useState(1);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["forum-posts", page],
    queryFn: () => listForumPosts({ page, per_page: 5 }).then(r => r.data),
  });

  const posts = postsData?.posts || [];

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
      setPostTitle("");
      setPostTags("");
      setSelectedFiles([]);
      setFilePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showSuccess("Post published successfully!");
    },
    onError: (err) => showError(err.response?.data?.error || "Failed to publish post."),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content, title, tags }) => editForumPost(id, { content, title, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setEditTarget(null);
      setEditContent("");
      setEditTitle("");
      setEditTags("");
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
    if (postTitle.trim()) {
      formData.append("title", postTitle.trim());
    }
    if (postTags.trim()) {
      formData.append("tags", postTags.trim());
    }
    selectedFiles.forEach((file) => {
      formData.append("attachment", file);
    });
    createMutation.mutate(formData);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || !editTarget) return;
    editMutation.mutate({
      id: editTarget.id,
      content: editContent,
      title: editTitle.trim(),
      tags: editTags.trim(),
    });
  };

  const openEditModal = (post) => {
    setEditTarget(post);
    setEditContent(post.content || "");
    setEditTitle(post.title || "");
    setEditTags(post.tags || "");
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
      const date = parseUTCDate(post.created_at);
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
      const groupPosts = groups[dateKey].sort((a, b) => parseUTCDate(b.created_at) - parseUTCDate(a.created_at));
      return {
        dateString: dateKey,
        posts: groupPosts,
      };
    }).sort((a, b) => parseUTCDate(b.posts[0].created_at) - parseUTCDate(a.posts[0].created_at));
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
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Forum</h1>
        </div>

        {/* Header End Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembersModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-750 dark:text-gray-200 text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
          >
            <Users className="w-4 h-4 text-violet-500" /> Roster
          </button>
          {isHOD && (
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/10 active:scale-95 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Member
            </button>
          )}
        </div>
      </div>

      {/* Centered Forum Feed Layout (No Sidebar) */}
      <div className="max-w-[1000px] mx-auto space-y-5">
        
        {/* Post Search Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search posts by content, title, tags or author..."
            value={postSearchQuery}
            onChange={(e) => setPostSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
          />
          {postSearchQuery && (
            <button onClick={() => setPostSearchQuery("")} className="absolute right-3.5 text-gray-450 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Posts Feed Area */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
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
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const isAuthor = post.posted_by?.id === user?.id;
                const displayTitle = post.title;
                const displayTags = post.tags ? post.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
                
                const { body } = parseForumPostContent(post.content);
                const isExpanded = !!expandedPostIds[post.id];
                const hasLongBody = body.length > 220;
                
                const urls = post.attachment_url ? post.attachment_url.split(',').filter(Boolean) : [];
                const hasImages = urls.length > 0;

                return (
                  <article
                    key={post.id}
                    className="update-card mx-auto p-4 sm:p-5 mb-4 flex flex-col justify-between"
                  >
                    <div className={hasImages ? "grid grid-cols-1 md:grid-cols-10 gap-5" : "w-full"}>
                      
                      {/* Left Content Area */}
                      <div className={hasImages ? "col-span-1 md:col-span-7 flex flex-col justify-between min-w-0" : "w-full min-w-0"}>
                        <div>
                          {/* Header */}
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar
                                src={post.posted_by?.profile_picture}
                                name={post.posted_by?.name}
                                size="sm"
                                className="shrink-0 w-8 h-8 ring-2 ring-violet-500/10"
                              />
                              <div className="flex items-center gap-2 flex-wrap min-w-0 leading-none">
                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {post.posted_by?.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {post.posted_by?.forum_role || post.posted_by?.role || "Member"}
                                </span>
                                {isAuthor && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                    You
                                  </span>
                                )}
                                {post.is_edited && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                    Edited
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  {formatPostTime(post.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Actions Kebab Menu for Forum Members */}
                            {isForumMember && (
                              <ForumPostKebab
                                post={post}
                                isAuthor={isAuthor}
                                isHOD={isHOD}
                                onEdit={openEditModal}
                                onDelete={setDeleteTarget}
                              />
                            )}
                          </div>

                          {/* Title */}
                          {displayTitle && (
                            <h2
                              onClick={() => navigate(`/forum/post/${post.id}`)}
                              className="text-base sm:text-lg font-black tracking-tight mb-1 text-gray-900 dark:text-white leading-snug line-clamp-2 hover:text-violet-600 cursor-pointer transition-colors"
                            >
                              {displayTitle}
                            </h2>
                          )}

                          {/* Description with Read More Toggle */}
                          <p className="text-xs sm:text-sm text-gray-750 dark:text-gray-350 leading-relaxed mb-3 break-words">
                            {isExpanded ? body : (hasLongBody ? body.slice(0, 220) + "..." : body)}
                            {hasLongBody && (
                              <button
                                type="button"
                                onClick={() => toggleExpandPost(post.id)}
                                className="text-violet-650 dark:text-violet-450 font-bold ml-1 hover:underline focus:outline-none"
                              >
                                {isExpanded ? "Show Less" : "Read More"}
                              </button>
                            )}
                          </p>

                          {/* Display Tags */}
                          {displayTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {displayTags.map(tag => (
                                <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/20">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Footer Date & Reactions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-gray-150 dark:border-gray-800/60 mt-auto">
                          <span className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {format(parseUTCDate(post.created_at), "dd MMM yyyy · hh:mm a")}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => likeMutation.mutate(post.id)}
                              className={`like-btn-scale inline-flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-lg bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/30 transition-all ${
                                post.liked ? "text-rose-500 animate-pulse" : "text-gray-400 hover:text-rose-500"
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 transition-all ${post.liked ? "fill-rose-500 text-rose-500" : ""}`} />
                              <span>{post.like_count || 0}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/forum/post/${post.id}`)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-lg bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/30 text-gray-400 hover:text-violet-600 transition-all cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                              <span>0</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/forum/post/${post.id}`);
                                showSuccess("Link copied to clipboard!");
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-lg bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/30 text-gray-400 hover:text-indigo-600 transition-all cursor-pointer"
                              title="Copy link to post"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Image Thumbnail Block (Desktop Split) */}
                      {hasImages && (
                        <div className="col-span-1 md:col-span-3 flex flex-col justify-center">
                          <div 
                            className="relative rounded-2xl overflow-hidden border border-gray-105 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950/20 max-h-36 sm:max-h-44 md:max-h-32 flex items-center justify-center cursor-pointer shadow-sm hover:scale-[1.01] transition-all"
                            onClick={() => handleOpenLightbox(urls, 0)}
                          >
                            <img 
                              src={urls[0]} 
                              alt="thumbnail" 
                              className="w-full h-36 md:h-28 object-cover rounded-xl hover:scale-[1.02] transition-transform duration-300" 
                            />
                            {urls.length > 1 && (
                              <div className="absolute inset-0.5 bg-black/60 rounded-xl flex flex-col items-center justify-center text-white gap-0.5">
                                <span className="text-base font-black">+{urls.length - 1}</span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-white/80">More Photos</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </article>
                );
              })}

              <Pagination page={postsData?.page || page} pages={postsData?.pages || 1} onPageChange={(p) => setPage(p)} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Plus Button for Forum Members to Post */}
      {canPost && (
        <button
          onClick={() => setPostModalOpen(true)}
          className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="Create Forum Post"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

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
                className="w-full p-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
              >
                <option value="President">President</option>
                <option value="Vice President">Vice President</option>
                <option value="Secretary">Secretary</option>
                <option value="Joint Secretary">Joint Secretary</option>
                <option value="Media Secretary">Media Secretary</option>
                <option value="Technical Head">Technical Head</option>
                <option value="Technical Coordinator">Technical Coordinator</option>
                <option value="Cultural Secretary">Cultural Secretary</option>
                <option value="Sports Secretary">Sports Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Executive Member">Executive Member</option>
                <option value="Discipline Coordinator">Discipline Coordinator</option>
                <option value="Placement Coordinator">Placement Coordinator</option>
                <option value="Custom">Custom Role...</option>
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
      <Modal open={showMembersModal} onClose={() => setShowMembersModal(false)} title="Forum Directory" size="lg">
        <div className="space-y-5 pt-1">
          {/* Member Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, role or class..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all"
            />
            {memberSearchQuery && (
              <button onClick={() => setMemberSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-405 hover:text-gray-650">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Members List (Fancy Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <div className="col-span-2 text-center py-10">
                <p className="text-xs text-gray-450 italic">No matching members found</p>
              </div>
            ) : (
              filteredMembers.map(m => {
                const isLeader = m.role?.toLowerCase() === "president" || m.role?.toLowerCase() === "vice president";
                return (
                  <div
                    key={m.id}
                    className={`relative flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-800/60 border border-gray-150 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-900/40 transition-all ${
                      isLeader ? "ring-2 ring-violet-500/25" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <Avatar src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-violet-500/10 shrink-0" />
                        {isLeader && (
                          <div className="absolute -top-1.5 -left-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                            <Crown className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight flex items-center gap-1.5">
                          {m.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-55/60 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100/30 dark:border-violet-900/20">
                            {m.role}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-300">
                            {m.class_name?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isHOD && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">Coord</span>
                          <Switch
                            checked={m.is_update_coordinator}
                            onChange={() => coordMutation.mutate(m.id)}
                            loading={coordMutation.isPending}
                            size="sm"
                          />
                        </div>
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
                );
              })
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

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest">Title</label>
            <input
              type="text"
              placeholder="Give your post a title..."
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest">Description</label>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share something with the forum..."
              rows={4}
              className="w-full p-3 text-xs rounded-xl border border-gray-255 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest">Tags (optional)</label>
            <input
              type="text"
              placeholder="e.g. academic, events, announcements (comma separated)"
              value={postTags}
              onChange={(e) => setPostTags(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {/* Previews */}
          {filePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {filePreviews.map((preview, idx) => (
                <div key={idx} className="relative rounded-xl border border-gray-150 dark:border-gray-700 overflow-hidden h-20 bg-gray-55 dark:bg-gray-900/30 animate-fade-in">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-250 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-305 hover:bg-gray-50 transition-all cursor-pointer"
            >
              <Image className="w-3.5 h-3.5 text-violet-500" />
              Add Image
            </button>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setPostModalOpen(false); setSelectedFiles([]); setFilePreviews([]); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-gray-750 text-sm font-semibold text-gray-650 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-755 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60 cursor-pointer"
            >
              {createMutation.isPending ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Post Modal ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Forum Post">
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest">Title</label>
            <input
              type="text"
              placeholder="Give your post a title..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-905 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest">Description</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
              className="w-full p-4 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none leading-relaxed"
              placeholder="Edit your post..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest">Tags (optional)</label>
            <input
              type="text"
              placeholder="e.g. academic, events, announcements (comma separated)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setEditTarget(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editMutation.isPending || !editContent.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60 cursor-pointer"
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
