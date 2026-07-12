import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listForumMembers, listForumPosts, createForumPost,
  editForumPost, deleteForumPost, toggleForumPostLike,
  listEligibleStudents, assignForumMember, removeForumMember,
  toggleForumCoordinator,
} from "../../../api/forum";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Avatar } from "../../../components/ui/Avatar";
import { SearchPicker } from "../../../components/shared/SearchPicker";
import {
  MessageSquare, Heart, Trash2, Edit2, Clock,
  Calendar, Plus, Image, X, UserPlus, Share2, Users, Crown, Search
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";

function formatPostTime(dateString) {
  try { return formatDistanceToNow(new Date(dateString), { addSuffix: true }); }
  catch { return "just now"; }
}

function parseForumPostContent(content = "") {
  if (!content) return { title: "", body: "" };
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return { title: lines[0], body: lines.slice(1).join("\n") };
  }
  return { title: "", body: content };
}

export default function MobileForumPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isForumMember = isHOD || user?.role === "FACULTY" || user?.student?.is_forum_member === true;
  const canPost = isForumMember;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postTags, setPostTags] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState("");

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [rolePreset, setRolePreset] = useState("President");
  const [customRole, setCustomRole] = useState("");
  
  // Compact & Directory states
  const [expandedPostIds, setExpandedPostIds] = useState({});
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
  });
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => listForumPosts({ page: 1, per_page: 50 }).then(r => r.data.posts),
  });

  // Lightbox arrow navigation keys
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

  const createMutation = useMutation({
    mutationFn: (data) => createForumPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setNewPost("");
      setPostTitle("");
      setPostTags("");
      setSelectedFiles([]);
      setFilePreviews([]);
    },
  });
  const editMutation = useMutation({
    mutationFn: ({ id, content, title, tags }) => editForumPost(id, { content, title, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setEditTarget(null);
      setEditTitle("");
      setEditTags("");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteForumPost,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forum-posts"] }); setDeleteTarget(null); },
  });
  const likeMutation = useMutation({
    mutationFn: toggleForumPostLike,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["forum-posts"] });
      const prev = queryClient.getQueryData(["forum-posts"]);
      queryClient.setQueryData(["forum-posts"], (old) => old ? old.map(p => p.id === postId ? { ...p, liked: !p.liked, like_count: p.liked ? p.like_count - 1 : p.like_count + 1 } : p) : []);
      return { prev };
    },
    onError: (err, postId, ctx) => { if (ctx?.prev) queryClient.setQueryData(["forum-posts"], ctx.prev); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts"] }),
  });
  const assignMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forum-members"] }); setPendingStudent(null); },
  });
  const removeMutation = useMutation({
    mutationFn: removeForumMember,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forum-members"] }); },
  });
  const coordMutation = useMutation({
    mutationFn: toggleForumCoordinator,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forum-members"] }); },
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      if (f.size > 5 * 1024 * 1024) return;
      setSelectedFiles(prev => [...prev, f]);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(f);
    });
  };
  const removeFile = (idx) => {
    setSelectedFiles(p => p.filter((_, i) => i !== idx));
    setFilePreviews(p => p.filter((_, i) => i !== idx));
  };
  const handlePublish = () => {
    if (!newPost.trim() && selectedFiles.length === 0) return;
    const fd = new FormData();
    fd.append("content", newPost);
    selectedFiles.forEach(f => fd.append("attachment", f));
    createMutation.mutate(fd);
    setPostModalOpen(false);
  };

  const postList = posts || [];
  const postsByDay = useMemo(() => {
    const groups = {};
    postList.forEach(post => {
      const dateString = new Date(post.created_at).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      if (!groups[dateString]) groups[dateString] = [];
      groups[dateString].push(post);
    });
    return Object.keys(groups).map(d => ({
      dateString: d,
      posts: groups[d].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    })).sort((a, b) => new Date(b.posts[0].created_at) - new Date(a.posts[0].created_at));
  }, [postList]);

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

  const handleOpenLightbox = (urls, index) => {
    setLightboxImages(urls);
    setLightboxIndex(index);
  };

  const toggleExpandPost = (postId) => {
    setExpandedPostIds(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (membersLoading || postsLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  }

  return (
    <div className="space-y-4 mobile-fade-in playbook pb-16">
      
      {/* Zoom Animation for Lightbox */}
      <style>{`
        @keyframes mobileZoomIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-mobile-zoom {
          animation: mobileZoomIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header actions */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800/40 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Posts</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              {postList.length}
            </span>
          </div>

          {/* Members Badge Trigger for Mobile */}
          <button
            onClick={() => setShowMembersModal(true)}
            className="mobile-tappable flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-650 dark:text-violet-450 border border-violet-100 dark:border-violet-900/40 text-xs font-bold"
          >
            <Users className="w-3.5 h-3.5" /> Roster ({memberList.length})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {isHOD && (
            <button
              onClick={() => setPickerOpen(true)}
              className="mobile-tappable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Member
            </button>
          )}
          {canPost && (
            <button
              onClick={() => setPostModalOpen(true)}
              className="mobile-tappable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Post
            </button>
          )}
        </div>
      </div>

      {/* Posts feed */}
      {postsByDay.length === 0 ? (
        <MobileEmptyState icon={MessageSquare} title="No posts yet" description="Be the first to share something!" />
      ) : (
        <div className="space-y-4">
          {postsByDay.map(group => (
            <div key={group.dateString} className="space-y-2.5">
              
              {/* Date Header Divider */}
              <div className="flex items-center gap-2 pt-1 mb-1">
                <Calendar className="w-3 h-3 text-violet-500" />
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{group.dateString}</span>
                <div className="h-[1px] flex-1 bg-gray-100 dark:bg-slate-800/40" />
              </div>

              {/* Feed Card List */}
              <div className="space-y-2.5">
                {group.posts.map(post => {
                  const isAuthor = post.posted_by?.id === user?.id;
                  const canEdit = isAuthor && (new Date() - new Date(post.created_at)) < 30 * 60 * 1000;
                  const canDelete = isAuthor || isHOD;
                  
                  const { title, body } = parseForumPostContent(post.content);
                  const isExpanded = !!expandedPostIds[post.id];
                  const hasLongBody = body.length > 180;

                  return (
                    <MobileCard key={post.id} className="p-3.5 border border-slate-100 dark:border-slate-800/50 shadow-sm space-y-2">
                      
                      {/* Card Author Info */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="sm" className="w-7 h-7 ring-2 ring-violet-500/5 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap leading-none">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{post.posted_by?.name}</span>
                              {isAuthor && <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">You</span>}
                            </div>
                            <span className="text-[9px] text-gray-400 dark:text-gray-505 flex items-center gap-0.5 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {formatPostTime(post.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {canEdit && (
                            <button onClick={() => { setEditTarget(post); setEditContent(post.content); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-650">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteTarget(post)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="space-y-0.8">
                        {title && (
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                            {title}
                          </h4>
                        )}
                        <p className="text-[11px] text-gray-800 dark:text-gray-205 whitespace-pre-wrap break-words leading-relaxed">
                          {isExpanded ? body : (hasLongBody ? body.slice(0, 180) + "..." : body)}
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

                      {/* Compact Image attachments */}
                      {post.attachment_url && (
                        <div className="mb-1">
                          {(() => {
                            const urls = post.attachment_url.split(',').filter(Boolean);
                            if (urls.length === 1) {
                              return (
                                <div 
                                  className="rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 max-h-40 flex items-center justify-center cursor-pointer"
                                  onClick={() => handleOpenLightbox(urls, 0)}
                                >
                                  <img 
                                    src={urls[0]} 
                                    alt="attachment" 
                                    className="w-full h-40 object-cover" 
                                  />
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950/20">
                                {urls.slice(0, 4).map((url, i) => (
                                  <div 
                                    key={i} 
                                    className="relative h-20 rounded-lg overflow-hidden cursor-pointer"
                                    onClick={() => handleOpenLightbox(urls, i)}
                                  >
                                    <img src={url} alt={`attachment-${i}`} className="w-full h-full object-cover" />
                                    {i === 3 && urls.length > 4 && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xs">
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

                      {/* Footer Actions (Likes, Share) */}
                      <div className="flex items-center justify-between pt-1.8 border-t border-gray-50 dark:border-slate-800/40 mt-1">
                        <button
                          onClick={() => likeMutation.mutate(post.id)}
                          className={`mobile-tappable inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg transition-all ${
                            post.liked ? "text-rose-500 bg-rose-50 dark:bg-rose-955/20" : "text-gray-400 hover:text-rose-550"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${post.liked ? "fill-rose-500 text-rose-500" : ""}`} />
                          <span>{post.like_count || 0}</span>
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/forum#post-${post.id}`);
                          }}
                          className="mobile-tappable inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 px-2 py-0.5 hover:text-indigo-500"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>
                      </div>

                    </MobileCard>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal open={postModalOpen} onClose={() => { setPostModalOpen(false); setSelectedFiles([]); setFilePreviews([]); }} title="Create Post">
        <div className="space-y-3 pt-1">
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share something with the forum..." rows={4}
            className="w-full p-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-none" />
          {filePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {filePreviews.map((p, i) => (
                <div key={i} className="relative h-20 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-700">
                  <img src={p} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-250 dark:border-slate-700 text-gray-505 hover:bg-gray-55 dark:hover:bg-slate-800">
              <Image className="w-3.5 h-3.5 text-violet-500" /> Add Image
            </button>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setPostModalOpen(false); setSelectedFiles([]); setFilePreviews([]); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 text-sm font-semibold text-gray-500">Cancel</button>
            <button onClick={handlePublish} disabled={createMutation.isPending || (!newPost.trim() && selectedFiles.length === 0)}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50">
              {createMutation.isPending ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Post">
        <div className="space-y-3 pt-1">
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
            className="w-full p-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-55 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-none" />
          <div className="flex gap-3">
            <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 text-sm font-semibold text-gray-500">Cancel</button>
            <button onClick={() => editMutation.mutate({ id: editTarget.id, content: editContent })} disabled={editMutation.isPending || !editContent.trim()}
              className="flex-1 py-2.5 rounded-xl bg-violet-650 text-white text-sm font-bold disabled:opacity-50">{editMutation.isPending ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget.id)} title="Delete Post" message="Are you sure you want to delete this post? This action cannot be undone." confirmText="Delete" danger />

      {/* Add Member Picker */}
      <SearchPicker open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add Forum Member" queryKey="eligible-students"
        fetchFn={search => listEligibleStudents(search).then(r => r.data.students)}
        onPick={student => { setPendingStudent(student); setPickerOpen(false); }}
        placeholder="Search students..." emptyText="No eligible students found." />

      {/* Assign Role Modal */}
      {pendingStudent && (
        <Modal open={!!pendingStudent} onClose={() => setPendingStudent(null)} title="Assign Role">
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
              <Avatar src={pendingStudent.profile_picture} name={pendingStudent.name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{pendingStudent.name}</p>
                <p className="text-[10px] text-gray-505 truncate">{pendingStudent.email}</p>
              </div>
            </div>
            <select value={rolePreset} onChange={e => { setRolePreset(e.target.value); if (e.target.value !== "Custom") setCustomRole(""); }}
              className="w-full p-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white">
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
              <option value="Custom">Custom...</option>
            </select>
            {rolePreset === "Custom" && (
              <input type="text" value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="Custom designation..." className="w-full p-2.5 rounded-xl border border-gray-255 dark:border-slate-755 bg-white dark:bg-slate-900 text-sm" />
            )}
            <div className="flex gap-3">
              <button onClick={() => setPendingStudent(null)} className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 text-sm font-semibold text-gray-500">Cancel</button>
              <button onClick={() => { const r = rolePreset === "Custom" ? customRole.trim() : rolePreset; if (r) assignMutation.mutate({ studentId: pendingStudent.id, role: r }); }}
                disabled={assignMutation.isPending} className="flex-1 py-2.5 rounded-xl bg-violet-650 text-white text-sm font-bold disabled:opacity-50">
                {assignMutation.isPending ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Image Lightbox Modal Overlay (Mobile with gallery navigation) ── */}
      {lightboxImages.length > 0 && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setLightboxImages([])}
        >
          <button 
            onClick={() => setLightboxImages([])}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white z-[100000]"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation Arrows for Mobile */}
          {lightboxImages.length > 1 && (
            <>
              <button
                className="absolute left-3 p-3 rounded-full bg-white/5 active:bg-white/15 text-white z-[100000]"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                }}
              >
                <span className="text-2xl font-bold leading-none">&lsaquo;</span>
              </button>
              <button
                className="absolute right-3 p-3 rounded-full bg-white/5 active:bg-white/15 text-white z-[100000]"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
                }}
              >
                <span className="text-2xl font-bold leading-none">&rsaquo;</span>
              </button>
            </>
          )}

          <div className="max-w-[95vw] max-h-[80vh] flex flex-col items-center justify-center">
            <img 
              src={lightboxImages[lightboxIndex]} 
              alt="Lightbox Mobile preview" 
              className="max-w-full max-h-[75vh] object-contain rounded-lg animate-mobile-zoom"
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxImages.length > 1 && (
              <span className="text-white/60 text-xs font-bold mt-3 select-none bg-black/50 px-3 py-1 rounded-full border border-white/5">
                {lightboxIndex + 1} / {lightboxImages.length}
              </span>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Members Directory Modal (Mobile View) ── */}
      {showMembersModal && createPortal(
        <Modal open={showMembersModal} onClose={() => setShowMembersModal(false)} title="Forum Directory">
          <div className="space-y-4 pt-1">
            {/* Member Search */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search roster..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all"
              />
              {memberSearchQuery && (
                <button onClick={() => setMemberSearchQuery("")} className="absolute right-3 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Members List */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 italic">No matching members found</p>
              ) : (
                filteredMembers.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-100/60 dark:border-gray-700/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={m.profile_picture} name={m.name} size="sm" className="ring-1 ring-gray-100 dark:ring-gray-700 shrink-0" />
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
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => coordMutation.mutate(m.id)}
                          disabled={coordMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors ${m.is_update_coordinator ? "text-amber-500 bg-amber-55 dark:bg-amber-900/20" : "text-gray-400 hover:text-amber-500 hover:bg-amber-55 dark:hover:bg-amber-900/20"}`}
                          title={m.is_update_coordinator ? "Revoke Coordinator" : "Make Coordinator"}
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeMutation.mutate(m.id)}
                          disabled={removeMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-55 dark:hover:bg-red-900/20 transition-colors"
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
        </Modal>,
        document.body
      )}

    </div>
  );
}
