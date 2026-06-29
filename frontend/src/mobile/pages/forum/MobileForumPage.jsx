import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listForumMembers, listForumPosts, createForumPost,
  editForumPost, deleteForumPost, toggleForumPostLike,
  listEligibleStudents, assignForumMember, removeForumMember,
} from "../../../api/forum";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Avatar } from "../../../components/ui/Avatar";
import { SearchPicker } from "../../../components/shared/SearchPicker";
import {
  MessageSquare, Heart, Trash2, Edit2, Clock,
  Calendar, Plus, Image, X, UserPlus
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";

function formatPostTime(dateString) {
  try { return formatDistanceToNow(new Date(dateString), { addSuffix: true }); }
  catch { return "just now"; }
}

export default function MobileForumPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const canPost = user?.student?.is_forum_member === true;
  const queryClient = useQueryClient();

  const [newPost, setNewPost] = useState("");
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [rolePreset, setRolePreset] = useState("President");
  const [customRole, setCustomRole] = useState("");
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

  const createMutation = useMutation({
    mutationFn: (data) => createForumPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setNewPost(""); setSelectedFiles([]); setFilePreviews([]);
    },
  });
  const editMutation = useMutation({
    mutationFn: ({ id, content }) => editForumPost(id, { content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["forum-posts"] }); setEditTarget(null); },
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

  if (membersLoading || postsLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  }

  return (
    <div className="space-y-4 mobile-fade-in">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Posts</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
            {postList.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isHOD && (
            <button
              onClick={() => setPickerOpen(true)}
              className="mobile-tappable w-8 h-8 rounded-xl flex items-center justify-center bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400"
            >
              <UserPlus className="w-4 h-4" />
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
            <div key={group.dateString}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{group.dateString}</span>
              </div>
              <div className="space-y-3">
                {group.posts.map(post => {
                  const isAuthor = post.posted_by?.id === user?.id;
                  const canEdit = isAuthor && (new Date() - new Date(post.created_at)) < 30 * 60 * 1000;
                  const canDelete = isAuthor || isHOD;
                  return (
                    <MobileCard key={post.id}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="sm" className="w-8 h-8 ring-2 ring-gray-100 dark:ring-slate-700" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{post.posted_by?.name}</span>
                              {isAuthor && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">You</span>}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {canEdit && (
                            <button onClick={() => { setEditTarget(post); setEditContent(post.content); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-600">
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

                      <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed mb-2">{post.content}</p>

                      {post.attachment_url && (
                        <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700/50 mb-2">
                          {(() => {
                            const urls = post.attachment_url.split(',').filter(Boolean);
                            if (urls.length === 1) return <img src={urls[0]} alt="attachment" className="w-full object-cover max-h-64" />;
                            return (
                              <div className={`grid gap-1 ${urls.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                                {urls.slice(0, 4).map((url, i) => (
                                  <div key={i} className="relative h-32">
                                    <img src={url} alt={`attachment-${i}`} className="w-full h-full object-cover" />
                                    {i === 3 && urls.length > 4 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-sm">+{urls.length - 4}</div>}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex items-center pt-2 border-t border-gray-50 dark:border-slate-800/40">
                        <button
                          onClick={() => likeMutation.mutate(post.id)}
                          className={`mobile-tappable inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-xl transition-all ${
                            post.liked ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20" : "text-gray-400 hover:text-rose-500"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${post.liked ? "fill-rose-500" : ""}`} />
                          {post.like_count || 0}
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
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share something..." rows={4}
            className="w-full p-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-none" />
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
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800">
              <Image className="w-3.5 h-3.5 text-violet-500" /> Add Image
            </button>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setPostModalOpen(false); setSelectedFiles([]); setFilePreviews([]); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-500">Cancel</button>
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
            className="w-full p-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-none" />
          <div className="flex gap-3">
            <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-500">Cancel</button>
            <button onClick={() => editMutation.mutate({ id: editTarget.id, content: editContent })} disabled={editMutation.isPending || !editContent.trim()}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50">{editMutation.isPending ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget.id)} title="Delete Post" message="Delete this post?" confirmText="Delete" danger />

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
                <p className="text-[10px] text-gray-500 truncate">{pendingStudent.email}</p>
              </div>
            </div>
            <select value={rolePreset} onChange={e => { setRolePreset(e.target.value); if (e.target.value !== "Custom") setCustomRole(""); }}
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white">
              <option value="President">President</option><option value="Vice President">Vice President</option><option value="Treasurer">Treasurer</option><option value="Secretary">Secretary</option><option value="Custom">Custom...</option>
            </select>
            {rolePreset === "Custom" && (
              <input type="text" value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="Custom designation..." className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
            )}
            <div className="flex gap-3">
              <button onClick={() => setPendingStudent(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-500">Cancel</button>
              <button onClick={() => { const r = rolePreset === "Custom" ? customRole.trim() : rolePreset; if (r) assignMutation.mutate({ studentId: pendingStudent.id, role: r }); }}
                disabled={assignMutation.isPending} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50">
                {assignMutation.isPending ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
