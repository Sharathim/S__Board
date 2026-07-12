import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getForumPost, editForumPost, deleteForumPost, toggleForumPostLike } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import {
  ArrowLeft, Heart, Calendar, MoreVertical, Edit2, Trash2, X, Image, Sparkles
} from "lucide-react";

export default function ForumPostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["forum-post", id],
    queryFn: () => getForumPost(id).then((r) => r.data.post),
  });

  const likeMutation = useMutation({
    mutationFn: () => toggleForumPostLike(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["forum-post", id] });
      const prev = queryClient.getQueryData(["forum-post", id]);
      queryClient.setQueryData(["forum-post", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          liked: !old.liked,
          like_count: old.liked ? old.like_count - 1 : old.like_count + 1,
        };
      });
      return { prev };
    },
    onError: (err, variables, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["forum-post", id], context.prev);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", id] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: (data) => editForumPost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", id] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setEditModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteForumPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      navigate("/forum");
    },
  });

  // Lightbox arrow keys
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Spinner className="w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Post not found</h2>
        <button
          onClick={() => navigate("/forum")}
          className="mt-4 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1.5 justify-center mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Forum
        </button>
      </div>
    );
  }

  const isAuthor = post.posted_by?.id === user?.id;
  const isForumMember = isHOD || user?.role === "FACULTY" || user?.student?.is_forum_member === true;

  const isWithinEditWindow = (new Date() - new Date(post.created_at)) < (30 * 60 * 1000);
  const canEdit = isAuthor && isWithinEditWindow;
  const canDelete = isAuthor || isHOD;

  const handleOpenEdit = () => {
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditTags(post.tags || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    editMutation.mutate({
      title: editTitle.trim(),
      content: editContent.trim(),
      tags: editTags.trim(),
    });
  };

  const urls = post.attachment_url ? post.attachment_url.split(",").filter(Boolean) : [];
  const tags = post.tags ? post.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  // Dropdown states for Kebab menu inside detail page
  const DetailKebab = () => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    if (!canEdit && !canDelete) return null;

    return (
      <div ref={ref} className="relative shrink-0">
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-150 dark:border-gray-700 py-1 animate-fade-in">
            {canEdit && (
              <button
                onClick={() => { setOpen(false); handleOpenEdit(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Edit Post
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { setOpen(false); setDeleteDialogOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Post
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Image Grid Layout Builder
  const renderImages = () => {
    if (urls.length === 0) return null;

    if (urls.length === 1) {
      return (
        <div 
          className="rounded-[16px] border border-[#E5E7EB] dark:border-slate-800 overflow-hidden bg-gray-50 dark:bg-gray-900/30 cursor-pointer shadow-sm hover:opacity-95 transition-all duration-200"
          onClick={() => { setLightboxImages(urls); setLightboxIndex(0); }}
        >
          <img src={urls[0]} alt="Post attachment" className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      );
    }

    if (urls.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-3">
          {urls.map((url, idx) => (
            <div 
              key={idx} 
              className="rounded-[16px] border border-[#E5E7EB] dark:border-slate-800 overflow-hidden aspect-video bg-gray-50 dark:bg-gray-900/30 cursor-pointer shadow-sm hover:opacity-95 hover:scale-[1.01] transition-all duration-200"
              onClick={() => { setLightboxImages(urls); setLightboxIndex(idx); }}
            >
              <img src={url} alt="Attachment" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    if (urls.length >= 3) {
      const displayUrls = urls.slice(0, 4);
      return (
        <div className="grid grid-cols-2 gap-3">
          {displayUrls.map((url, idx) => {
            const isLast = idx === 3 && urls.length > 4;
            return (
              <div 
                key={idx}
                className="relative rounded-[16px] border border-[#E5E7EB] dark:border-slate-800 overflow-hidden aspect-video bg-gray-50 dark:bg-gray-900/30 cursor-pointer shadow-sm hover:opacity-95 hover:scale-[1.01] transition-all duration-200 group"
                onClick={() => { setLightboxImages(urls); setLightboxIndex(idx); }}
              >
                <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                {isLast && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-base font-black uppercase tracking-wider backdrop-blur-xs select-none">
                    +{urls.length - 4} More
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  };

  const designation = post.posted_by?.forum_role || (post.posted_by?.role === "HOD" ? "HOD" : post.posted_by?.role === "FACULTY" ? "Faculty" : "Forum Member");

  return (
    <div className="w-full animate-fade-in pb-12">
      {/* Back Button */}
      <div className="max-w-[1000px] mx-auto w-full px-4 mb-4">
        <button
          onClick={() => navigate("/forum")}
          className="text-xs font-semibold text-gray-500 hover:text-indigo-650 transition-colors flex items-center gap-1 cursor-pointer"
        >
          ← Back to Forum
        </button>
      </div>

      {/* Main Single Card Content */}
      <div className="max-w-[1000px] mx-auto bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800/80 rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-8 py-6 border-b border-[#E5E7EB] dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="sm" className="ring-2 ring-violet-500/10 rounded-full" />
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{post.posted_by?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {designation}
              </p>
            </div>
          </div>
          <DetailKebab />
        </div>

        {/* Content Body */}
        <div className="px-8 py-6 space-y-6">
          <div className="space-y-4">
            {post.title && (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                {post.title}
              </h1>
            )}
            
            {/* Multi-paragraph description */}
            <p className="text-[#374151] dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed text-sm md:text-base font-normal">
              {post.content}
            </p>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/20">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Image gallery */}
          {renderImages()}
        </div>

        {/* Card Footer */}
        <div className="px-8 py-4 border-t border-[#E5E7EB] dark:border-slate-800/50 flex items-center justify-between">
          <button
            onClick={() => likeMutation.mutate()}
            className={`group/like inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
              post.liked
                ? "bg-violet-50 dark:bg-violet-955/20 border-violet-100 dark:border-violet-900/30 text-violet-600 dark:text-violet-400"
                : "border-gray-200 dark:border-gray-800 text-gray-405 hover:text-violet-600 dark:hover:text-violet-400"
            }`}
          >
            <span className="text-sm group-hover/like:scale-110 transition-transform">👍</span>
            <span>{post.like_count || 0} Likes</span>
          </button>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-505 select-none">
            <Calendar className="w-4 h-4 text-violet-500" />
            <span>{format(new Date(post.created_at), "d MMM yyyy, h:mm a")}</span>
          </span>
        </div>
      </div>

      {/* Edit Post Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Forum Post">
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Title</label>
            <input
              type="text"
              placeholder="Give your post a title..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Description</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
              className="w-full p-4 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-55 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none leading-relaxed"
              placeholder="Edit your post..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tags (optional)</label>
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
              onClick={() => setEditModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-55 transition-colors cursor-pointer"
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

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Post"
        message="Are you sure you want to delete this forum post? This action cannot be undone."
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete Post"}
        danger
      />

      {/* Image Lightbox */}
      {lightboxImages.length > 0 && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setLightboxImages([])}
        >
          {/* Close button */}
          <button 
            onClick={() => setLightboxImages([])}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[100000] cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          {lightboxImages.length > 1 && (
            <>
              <button
                className="absolute left-5 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[100000] focus:outline-none cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                }}
              >
                <span className="text-3xl font-black leading-none">&lsaquo;</span>
              </button>
              <button
                className="absolute right-5 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[100000] focus:outline-none cursor-pointer"
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
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
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
