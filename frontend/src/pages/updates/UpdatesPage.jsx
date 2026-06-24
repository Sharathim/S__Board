import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUpdates, createUpdate, editUpdate, deleteUpdate, toggleUpdateLike,
  listCoordinators, listEligibleCoordinators, assignCoordinator, removeCoordinator
} from "../../api/updates";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/shared/Pagination";
import { Avatar } from "../../components/ui/Avatar";
import { SearchPicker } from "../../components/shared/SearchPicker";
import {
  Newspaper, Plus, Heart, Edit2, Trash2, Megaphone, X,
  Search, Calendar, FileText, Image, Paperclip,
  BarChart3, Sparkles, AlertCircle, ArrowUpRight,
  CheckCircle2, Filter, MessageSquare, UserCheck,
  Bookmark, TrendingUp, Clock
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

function formatTime(dateStr) {
  try {
    if (!dateStr) return "";
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function UpdatesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isCoordinator = user?.role === "HOD" || user?.faculty?.is_update_coordinator;
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState("image");
  const [coordPickerOpen, setCoordPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all");

  const { data: coordData } = useQuery({
    queryKey: ["coordinators"],
    queryFn: () => listCoordinators().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["updates", page],
    queryFn: () => listUpdates({ page, per_page: 15 }).then(r => r.data),
  });

  const assignCoordMutation = useMutation({
    mutationFn: ({ kind, refId }) => assignCoordinator(kind, refId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coordinators"] }); setCoordPickerOpen(false); },
  });

  const removeCoordMutation = useMutation({
    mutationFn: ({ kind, refId }) => removeCoordinator(kind, refId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coordinators"] }),
  });

  const createMutation = useMutation({
    mutationFn: () => createUpdate({
      content,
      attachment_url: attachmentUrl.trim() || null,
      attachment_type: attachmentUrl.trim() ? attachmentType : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setShowCreate(false);
      setContent("");
      setAttachmentUrl("");
      setAttachmentType("image");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content, attachment_url, attachment_type }) => editUpdate(id, {
      content,
      attachment_url: attachment_url ? attachment_url.trim() : null,
      attachment_type: attachment_url ? attachment_type : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setEditTarget(null);
      setContent("");
      setAttachmentUrl("");
      setAttachmentType("image");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUpdate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["updates"] }); setDeleteTarget(null); },
  });

  const likeMutation = useMutation({
    mutationFn: toggleUpdateLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["updates"] }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600">
            <Newspaper className="w-7 h-7 text-white" />
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-400">Loading Announcements...</p>
      </div>
    </div>
  );

  const rawUpdates = data?.updates || [];

  const filteredSearchUpdates = rawUpdates.filter(u =>
    u.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  let finalUpdates = [...filteredSearchUpdates];
  if (activeFilterTab === "mine") {
    finalUpdates = filteredSearchUpdates.filter(u => u.posted_by === user?.id);
  } else if (activeFilterTab === "liked") {
    finalUpdates = filteredSearchUpdates.filter(u => u.liked);
  }

  const totalLikes = rawUpdates.reduce((s, u) => s + (u.like_count || 0), 0);
  const totalImagePosts = rawUpdates.filter(u => u.attachment_url && u.attachment_type === "image").length;
  const totalDocPosts = rawUpdates.filter(u => u.attachment_url && u.attachment_type === "file").length;
  const coordinators = coordData?.coordinators || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ── Page Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-indigo-600 to-blue-700 p-6 sm:p-8 shadow-2xl shadow-primary-500/25">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Announcements</h1>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm">OFFICIAL</span>
              </div>
              <p className="text-sm text-blue-200 font-medium">
                Department updates, guidelines, and important notices
              </p>
            </div>
          </div>
          {isCoordinator && (
            <button
              onClick={() => { setContent(""); setAttachmentUrl(""); setAttachmentType("image"); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary-700 text-sm font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Posts", value: rawUpdates.length },
            { label: "Total Likes", value: totalLikes },
            { label: "Photos Shared", value: totalImagePosts },
            { label: "Files Shared", value: totalDocPosts },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="text-xl sm:text-2xl font-black text-white">{s.value}</div>
              <div className="text-[10px] sm:text-xs text-blue-200 mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT / MAIN FEED (8 cols) ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Feed Controls */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-700/40 rounded-xl p-1 w-full sm:w-auto">
              {[
                { key: "all", label: "All", icon: Newspaper },
                { key: "mine", label: "Mine", icon: Bookmark },
                { key: "liked", label: "Liked", icon: Heart },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveFilterTab(tab.key); setPage(1); }}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeFilterTab === tab.key
                        ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
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
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600/60 bg-gray-50 dark:bg-gray-700/40 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Count badge */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 shrink-0">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{finalUpdates.length}</span>
            </div>
          </div>

          {/* Feed */}
          {finalUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700/40">
                <Newspaper className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No announcements found</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                {searchTerm ? "No announcements match your search." : "Announcements posted by coordinators will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {finalUpdates.map(update => (
                <article
                  key={update.id}
                  className="group bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-primary-100 dark:hover:border-primary-800/30 transition-all duration-200 overflow-hidden"
                >
                  {/* Top accent stripe */}
                  <div className="h-1 w-full bg-gradient-to-r from-primary-500 via-indigo-500 to-blue-500" />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/30 dark:to-indigo-900/30 border border-primary-100 dark:border-primary-800/30 flex items-center justify-center shrink-0">
                          <Megaphone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">Official Announcement</span>
                            {update.is_edited && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 uppercase tracking-wide">
                                Edited
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(update.created_at), "MMM d, yyyy")}
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <Clock className="w-3 h-3" />
                            {formatTime(update.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {update.posted_by === user?.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditTarget(update);
                              setContent(update.content);
                              setAttachmentUrl(update.attachment_url || "");
                              setAttachmentType(update.attachment_type || "image");
                            }}
                            className="p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(update.id)}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line mb-4">
                      {update.content}
                    </p>

                    {/* Image Attachment */}
                    {update.attachment_url && update.attachment_type === "image" && (
                      <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/60 mb-4 max-h-80 bg-gray-50 dark:bg-gray-900/30">
                        <img
                          src={update.attachment_url}
                          alt="announcement attachment"
                          className="w-full max-h-80 object-cover hover:scale-[1.01] transition-transform duration-300"
                          onError={(e) => { e.target.parentElement.style.display = "none"; }}
                        />
                      </div>
                    )}

                    {/* File Attachment */}
                    {update.attachment_url && update.attachment_type === "file" && (
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-700/20 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block truncate">
                              {update.attachment_url.substring(update.attachment_url.lastIndexOf('/') + 1) || "Document"}
                            </span>
                            <span className="text-[10px] text-gray-400">Secure Attachment</span>
                          </div>
                        </div>
                        <a
                          href={update.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 shrink-0"
                        >
                          Open <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/40">
                      <button
                        onClick={() => likeMutation.mutate(update.id)}
                        className={`group/like inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${
                          update.liked
                            ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30"
                            : "text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        }`}
                      >
                        <Heart className={`w-4 h-4 transition-all group-active/like:scale-125 ${update.liked ? "fill-rose-500 text-rose-500" : ""}`} />
                        <span>{update.like_count || 0} {update.like_count === 1 ? "Like" : "Likes"}</span>
                      </button>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600 font-semibold uppercase tracking-wider">Department Official</span>
                    </div>
                  </div>
                </article>
              ))}

              <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (4 cols) ── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Statistics Card */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/40 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Feed Statistics</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { label: "Total Posts", value: rawUpdates.length, color: "text-primary-600" },
                { label: "Total Likes", value: totalLikes, color: "text-rose-500" },
                { label: "Photos", value: `${totalImagePosts}`, color: "text-emerald-500" },
                { label: "Files", value: `${totalDocPosts}`, color: "text-amber-500" },
              ].map(stat => (
                <div key={stat.label} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center border border-gray-100 dark:border-gray-700/40">
                  <div className={`text-2xl font-black ${stat.color} leading-none`}>{stat.value}</div>
                  <div className="text-[10px] text-gray-400 font-medium mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Coordinators Card */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border-b border-primary-100 dark:border-primary-800/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <h3 className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-widest">Coordinators</h3>
                <span className="text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full">
                  {coordinators.length}/{coordData?.max ?? 2}
                </span>
              </div>
              {isHOD && coordinators.length < (coordData?.max ?? 2) && (
                <button
                  onClick={() => setCoordPickerOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-bold transition-colors shadow-sm"
                >
                  <Plus className="w-3 h-3" /> Assign
                </button>
              )}
            </div>

            <div className="p-4">
              {coordinators.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    No coordinators assigned yet.
                    {isHOD && " Click Assign to add one."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {coordinators.map(c => (
                    <div key={`${c.kind}-${c.ref_id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all group">
                      <Avatar src={c.profile_picture} name={c.name} size="sm" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.subtitle}</p>
                      </div>
                      {isHOD && (
                        <button
                          onClick={() => removeCoordMutation.mutate({ kind: c.kind, refId: c.ref_id })}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                          title="Remove coordinator"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/40 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Coordinators can post announcements, link media, and manage the department feed.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-gradient-to-br from-indigo-50 to-primary-50 dark:from-indigo-900/20 dark:to-primary-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Notice Board Tips</h4>
            </div>
            <ul className="space-y-2">
              {[
                "Stay updated with the latest department notices",
                "Like posts to show appreciation to coordinators",
                "Use filters to view only your relevant posts",
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs text-indigo-700/70 dark:text-indigo-300/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* ── Create Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Announcement">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Announcement Content</label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What would you like to announce to the department?"
              rows={4}
              className="w-full text-sm border-gray-200 dark:border-gray-700 focus:border-primary-500 rounded-xl"
            />
          </div>

          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/40">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Attach Media / File URL (optional)</span>
            </div>
            <input
              type="text"
              value={attachmentUrl}
              onChange={e => setAttachmentUrl(e.target.value)}
              placeholder="Paste image or document URL..."
              className="w-full text-sm py-2.5 px-3.5 border border-gray-200 dark:border-gray-600/60 bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
            {attachmentUrl.trim() && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 font-semibold">Type:</span>
                <div className="flex gap-4">
                  {[
                    { value: "image", label: "Image", icon: Image },
                    { value: "file", label: "Document", icon: FileText },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <label key={opt.value} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="attachmentType" value={opt.value} checked={attachmentType === opt.value} onChange={() => setAttachmentType(opt.value)} className="accent-primary-600" />
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !content.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Posting...</>
            ) : (
              <><Megaphone className="w-4 h-4" />Post Announcement</>
            )}
          </button>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Announcement">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content</label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="w-full text-sm border-gray-200 dark:border-gray-700 focus:border-primary-500 rounded-xl"
            />
          </div>

          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/40">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Edit Media / File URL</span>
            </div>
            <input
              type="text"
              value={attachmentUrl}
              onChange={e => setAttachmentUrl(e.target.value)}
              placeholder="Paste image or document URL..."
              className="w-full text-sm py-2.5 px-3.5 border border-gray-200 dark:border-gray-600/60 bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
            {attachmentUrl.trim() && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 font-semibold">Type:</span>
                <div className="flex gap-4">
                  {[
                    { value: "image", label: "Image", icon: Image },
                    { value: "file", label: "Document", icon: FileText },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <label key={opt.value} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="editAttachmentType" value={opt.value} checked={attachmentType === opt.value} onChange={() => setAttachmentType(opt.value)} className="accent-primary-600" />
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => editMutation.mutate({ id: editTarget.id, content, attachment_url: attachmentUrl, attachment_type: attachmentType })}
            disabled={editMutation.isPending || !content.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {editMutation.isPending ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" />Save Changes</>
            )}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action is permanent and cannot be undone."
        confirmText="Delete Announcement"
        danger
      />

      <SearchPicker
        open={coordPickerOpen}
        onClose={() => setCoordPickerOpen(false)}
        title="Add Update Coordinator"
        queryKey="eligible-coordinators"
        fetchFn={(search) => listEligibleCoordinators(search).then(r => r.data.eligible)}
        onPick={(item) => assignCoordMutation.mutate({ kind: item.kind, refId: item.ref_id })}
        picking={assignCoordMutation.isPending}
        placeholder="Search faculty or forum members…"
        emptyText="No eligible faculty or forum members found."
      />

    </div>
  );
}
