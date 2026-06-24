import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUpdates, createUpdate, editUpdate, deleteUpdate, toggleUpdateLike,
  listCoordinators, listEligibleCoordinators, assignCoordinator, removeCoordinator } from "../../api/updates";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/shared/Pagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { Avatar } from "../../components/ui/Avatar";
import { SearchPicker } from "../../components/shared/SearchPicker";
import { 
  Newspaper, Plus, Heart, Edit2, Trash2, Megaphone, X, 
  Search, Filter, Calendar, FileText, Image, Paperclip, 
  BarChart3, UserCheck, Sparkles, AlertCircle, ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";

export default function UpdatesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isCoordinator = user?.role === "HOD" || user?.faculty?.is_update_coordinator;
  const queryClient = useQueryClient();
  
  // State variables
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState("image"); // "image" or "file"
  const [coordPickerOpen, setCoordPickerOpen] = useState(false);

  // Client-side search & filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all"); // all, mine, liked

  // Queries
  const { data: coordData } = useQuery({
    queryKey: ["coordinators"],
    queryFn: () => listCoordinators().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["updates", page],
    queryFn: () => listUpdates({ page, per_page: 15 }).then(r => r.data),
  });

  // Mutations
  const assignCoordMutation = useMutation({
    mutationFn: ({ kind, refId }) => assignCoordinator(kind, refId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinators"] });
      setCoordPickerOpen(false);
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setDeleteTarget(null);
    },
  });

  const likeMutation = useMutation({
    mutationFn: toggleUpdateLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["updates"] }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner className="w-10 h-10 text-primary-600" />
    </div>
  );

  const rawUpdates = data?.updates || [];

  // Client-side search filter
  const filteredSearchUpdates = rawUpdates.filter(update => 
    update.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Client-side filter tab
  let finalUpdates = [...filteredSearchUpdates];
  if (activeFilterTab === "mine") {
    finalUpdates = filteredSearchUpdates.filter(update => update.posted_by === user?.id);
  } else if (activeFilterTab === "liked") {
    finalUpdates = filteredSearchUpdates.filter(update => update.liked);
  }

  // Calculate stats
  const totalLikes = rawUpdates.reduce((sum, update) => sum + (update.like_count || 0), 0);
  const totalImagePosts = rawUpdates.filter(update => update.attachment_url && update.attachment_type === "image").length;
  const totalDocPosts = rawUpdates.filter(update => update.attachment_url && update.attachment_type === "file").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Newspaper className="w-8 h-8 text-primary-600 animate-pulse" />
            Updates Feed
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stay informed with the latest department announcements, guidelines, and project news.
          </p>
        </div>

        {isCoordinator && (
          <Button 
            onClick={() => { 
              setContent(""); 
              setAttachmentUrl("");
              setAttachmentType("image");
              setShowCreate(true); 
            }} 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus className="w-4.5 h-4.5" />
            New Announcement
          </Button>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Feed, search and filters */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Filters and Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-750 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl w-full sm:w-auto">
              {[
                { key: "all", label: "All Updates" },
                { key: "mine", label: "My Posts" },
                { key: "liked", label: "Liked" }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveFilterTab(tab.key);
                    setPage(1);
                  }}
                  className={`flex-1 sm:flex-initial text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                    activeFilterTab === tab.key
                      ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Client Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search feed content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs py-2.5 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

          </div>

          {/* Updates Feed Lists */}
          {finalUpdates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-250/70 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm">
              <EmptyState 
                icon={Newspaper} 
                title="No updates found" 
                description={searchTerm ? "No announcements match your search query." : "Announcements posted by coordinators will appear here."} 
              />
            </div>
          ) : (
            <div className="space-y-5">
              {finalUpdates.map(update => (
                <article 
                  key={update.id} 
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-l-4 border-l-primary-500 border-y border-r border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Top Meta info row */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {update.is_edited && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/10 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          edited
                        </span>
                      )}
                    </div>

                    {/* Actions dropdown or buttons */}
                    {update.posted_by === user?.id && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { 
                            setEditTarget(update); 
                            setContent(update.content);
                            setAttachmentUrl(update.attachment_url || "");
                            setAttachmentType(update.attachment_type || "image");
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors"
                          title="Edit announcement"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeleteTarget(update.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Feed Announcement Content */}
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line font-medium mb-4">
                    {update.content}
                  </p>

                  {/* Render Image Attachment */}
                  {update.attachment_url && update.attachment_type === "image" && (
                    <div className="relative rounded-xl overflow-hidden max-h-96 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 group mb-4">
                      <img 
                        src={update.attachment_url} 
                        alt="attachment" 
                        className="w-full max-h-96 object-cover transition-transform duration-300 group-hover:scale-[1.01]" 
                      />
                    </div>
                  )}

                  {/* Render Document/File Attachment */}
                  {update.attachment_url && update.attachment_type === "file" && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-250/70 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/35 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-gray-800 dark:text-gray-200 block truncate max-w-md">
                            {update.attachment_url.substring(update.attachment_url.lastIndexOf('/') + 1) || "Document Attachment"}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Secure Document Attachment</span>
                        </div>
                      </div>
                      
                      <a 
                        href={update.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/20"
                      >
                        Open File
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Feed Likes Action Footer */}
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-750 pt-3.5">
                    <button
                      onClick={() => likeMutation.mutate(update.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                        update.liked
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/5"
                      }`}
                    >
                      <Heart className={`w-4 h-4 transition-transform active:scale-150 duration-200 ${
                        update.liked ? "fill-rose-500 text-rose-500" : ""
                      }`} />
                      <span>{update.like_count || 0} Likes</span>
                    </button>
                    
                    <span className="text-[10px] text-gray-400 font-semibold tracking-wide">
                      DPMS Official Announcement
                    </span>
                  </div>

                </article>
              ))}

              <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
            </div>
          )}

        </div>

        {/* Right Column: Information, stats, and coordinators list */}
        <div className="lg:col-span-4 space-y-6">

          {/* Quick Statistics Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              Feed statistics
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-center border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block font-semibold">Total Posts</span>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 block">
                  {rawUpdates.length}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-center border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block font-semibold">Total Likes</span>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 block">
                  {totalLikes}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-center border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block font-semibold">Images Shared</span>
                <span className="text-sm font-extrabold text-gray-900 dark:text-white mt-1 block">
                  {totalImagePosts} Photos
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-center border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block font-semibold">Files Shared</span>
                <span className="text-sm font-extrabold text-gray-900 dark:text-white mt-1 block">
                  {totalDocPosts} Files
                </span>
              </div>
            </div>
          </div>
          
          {/* Update Coordinators Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4.5 h-4.5 text-primary-600" />
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">
                    Coordinators
                  </h3>
                  <span className="text-[10px] text-gray-400 block">
                    {(coordData?.coordinators?.length || 0)} assigned
                  </span>
                </div>
              </div>

              {isHOD && (coordData?.coordinators?.length || 0) < (coordData?.max ?? 2) && (
                <Button size="sm" variant="secondary" onClick={() => setCoordPickerOpen(true)} className="gap-1.5 text-xs font-semibold px-3.5">
                  <Plus className="w-3.5 h-3.5" /> Assign
                </Button>
              )}
            </div>

            {/* List of coordinators */}
            {(coordData?.coordinators || []).length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400 leading-normal">
                  No coordinators assigned. Only HOD can post updates.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {coordData.coordinators.map(c => (
                  <div key={`${c.kind}-${c.ref_id}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={c.profile_picture} name={c.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{c.subtitle}</p>
                      </div>
                    </div>

                    {isHOD && (
                      <button
                        onClick={() => removeCoordMutation.mutate({ kind: c.kind, refId: c.ref_id })}
                        title="Remove coordinator"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Coordination rules info strip */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-normal">
                Update Coordinators can draft announcements, link attachments, and manage feed alerts.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Rebuilt Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Announcement">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Content</label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What announcement or update would you like to post to the department?"
              rows={4}
              className="w-full text-xs text-gray-800 dark:text-gray-200 border-gray-250 focus:border-primary-500 rounded-xl"
            />
          </div>

          {/* Attachment Input Field */}
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-primary-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Attach Media/File URL</span>
            </div>

            <input
              type="text"
              value={attachmentUrl}
              onChange={e => setAttachmentUrl(e.target.value)}
              placeholder="Paste image or document URL..."
              className="w-full text-xs py-2 px-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />

            {attachmentUrl.trim() && (
              <div className="flex items-center gap-4 pt-1">
                <span className="text-[10px] text-gray-400 font-semibold">Attachment Type:</span>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="attachmentType"
                      value="image"
                      checked={attachmentType === "image"}
                      onChange={() => setAttachmentType("image")}
                      className="accent-primary-600"
                    />
                    <Image className="w-3.5 h-3.5 text-gray-400" /> Image
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="attachmentType"
                      value="file"
                      checked={attachmentType === "file"}
                      onChange={() => setAttachmentType("file")}
                      className="accent-primary-600"
                    />
                    <FileText className="w-3.5 h-3.5 text-gray-400" /> Document/File
                  </label>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={() => createMutation.mutate()} 
            loading={createMutation.isPending} 
            disabled={!content.trim()} 
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-primary-100 transition-all"
          >
            Post Announcement
          </Button>
        </div>
      </Modal>

      {/* Rebuilt Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Announcement">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Content</label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="w-full text-xs text-gray-800 dark:text-gray-200 border-gray-250 focus:border-primary-500 rounded-xl"
            />
          </div>

          {/* Attachment Input Field */}
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-primary-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Edit Media/File URL</span>
            </div>

            <input
              type="text"
              value={attachmentUrl}
              onChange={e => setAttachmentUrl(e.target.value)}
              placeholder="Paste image or document URL..."
              className="w-full text-xs py-2 px-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />

            {attachmentUrl.trim() && (
              <div className="flex items-center gap-4 pt-1">
                <span className="text-[10px] text-gray-400 font-semibold">Attachment Type:</span>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="editAttachmentType"
                      value="image"
                      checked={attachmentType === "image"}
                      onChange={() => setAttachmentType("image")}
                      className="accent-primary-600"
                    />
                    <Image className="w-3.5 h-3.5 text-gray-400" /> Image
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="editAttachmentType"
                      value="file"
                      checked={attachmentType === "file"}
                      onChange={() => setAttachmentType("file")}
                      className="accent-primary-600"
                    />
                    <FileText className="w-3.5 h-3.5 text-gray-400" /> Document/File
                  </label>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={() => editMutation.mutate({ 
              id: editTarget.id, 
              content, 
              attachment_url: attachmentUrl, 
              attachment_type: attachmentType 
            })} 
            loading={editMutation.isPending} 
            disabled={!content.trim()} 
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-primary-100 transition-all"
          >
            Save Changes
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action is permanent."
        confirmText="Delete"
        danger
      />

      {/* Coordinator picker (HOD) */}
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
