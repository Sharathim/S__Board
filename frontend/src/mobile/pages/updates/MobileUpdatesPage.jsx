import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUpdates, createUpdate, editUpdate, deleteUpdate, toggleUpdateLike,
  listCoordinators, listEligibleCoordinators, assignCoordinator, removeCoordinator,
} from "../../../api/updates";
import { useAuth } from "../../../context/AuthContext";
import { parseUpdateContent } from "../../../utils/updateContent";
import { Spinner } from "../../../components/ui/Spinner";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Avatar } from "../../../components/ui/Avatar";
import { SearchPicker } from "../../../components/shared/SearchPicker";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";
import MobileFAB from "../../components/MobileFAB";
import BottomSheet from "../../layout/BottomSheet";
import {
  Megaphone, Plus, Heart, Edit2, Trash2, X,
  Calendar, Image, Clock, MapPin, ChevronRight,
  Zap, Users, FileText, ArrowUpRight, MoreVertical,
  Send,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { parseUTCDate } from "../../../utils/dateUtils";

function formatTime(dateStr) {
  try { return formatDistanceToNow(parseUTCDate(dateStr), { addSuffix: true }); }
  catch { return ""; }
}

function parseAnnouncementContent(contentStr) {
  const parsed = parseUpdateContent(contentStr);
  return {
    department: parsed.department || "PG Department of Computer Science",
    update_type: parsed.updateType || "Announcement",
    title: parsed.isStructured && parsed.title !== parsed.updateType ? parsed.title : "",
    description: parsed.description || "",
    date_time: parsed.dateTime || "",
    location: parsed.location || "",
    tags: parsed.tags || [],
  };
}

function getFileType(url) {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) return "video";
  if (lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc") || lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "document";
  return "image";
}

const TAG_COLORS = {
  Notice: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  Announcement: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  Event: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  Alert: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export default function MobileUpdatesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [coordSheetOpen, setCoordSheetOpen] = useState(false);
  const [coordPickerOpen, setCoordPickerOpen] = useState(false);

  // Compose form
  const [compType, setCompType] = useState("Announcement");
  const [compTitle, setCompTitle] = useState("");
  const [compContent, setCompContent] = useState("");
  const [compDate, setCompDate] = useState("");
  const [compTime, setCompTime] = useState("");
  const [compLocation, setCompLocation] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const fileInputRef = useRef(null);

  const { data: coordData } = useQuery({
    queryKey: ["coordinators"],
    queryFn: () => listCoordinators().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["updates", page],
    queryFn: () => listUpdates({ page, per_page: 10 }).then(r => r.data),
  });

  const isUpdateCoordinator = user?.faculty?.is_update_coordinator
    || (user?.role === "STUDENT" && ((coordData?.coordinators || []).some(c => c.name === user?.name) || user?.student?.forum_role?.toLowerCase() === "media secretary"));

  const canCompose = isHOD || isUpdateCoordinator;

  const createMutation = useMutation({
    mutationFn: (formData) => createUpdate(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setComposeOpen(false);
      resetForm();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content, attachment_url, attachment_type }) => editUpdate(id, { content, attachment_url, attachment_type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setComposeOpen(false);
      setEditTarget(null);
      resetForm();
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

  const resetForm = () => {
    setCompType("Announcement");
    setCompTitle("");
    setCompContent("");
    setCompDate("");
    setCompTime("");
    setCompLocation("");
    setSelectedFiles([]);
    setFilePreviews([]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (selectedFiles.length + files.length > 10) return;

    const newFiles = [];
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return;
      newFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handlePublish = () => {
    if (!compContent.trim() && !compTitle.trim()) return;
    const dt = compDate && compTime ? `${compDate}T${compTime}` : compDate || compTime || "";
    const postContent = JSON.stringify({
      department: "PG Department of Computer Science",
      update_type: compType,
      title: compTitle,
      description: compContent,
      date_time: dt,
      location: compLocation,
      tags: [],
      visibility: "All Hive",
      allow_comments: true,
    });

    if (editTarget) {
      editMutation.mutate({
        id: editTarget.id,
        content: postContent,
        attachment_url: editTarget.attachment_url,
        attachment_type: editTarget.attachment_type,
      });
    } else {
      const formData = new FormData();
      formData.append("content", postContent);
      selectedFiles.forEach(file => formData.append("attachment", file));
      createMutation.mutate(formData);
    }
  };

  const openEdit = (upd) => {
    const parsed = parseAnnouncementContent(upd.content);
    setEditTarget(upd);
    setCompType(parsed.update_type || "Announcement");
    setCompTitle(parsed.title || "");
    setCompContent(parsed.description || "");
    const dt = parsed.date_time || "";
    if (dt.includes("T")) {
      const [d, t] = dt.split("T");
      setCompDate(d || "");
      setCompTime(t || "");
    } else {
      setCompDate(dt);
      setCompTime("");
    }
    setCompLocation(parsed.location || "");
    setComposeOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const updates = data?.updates || [];

  return (
    <div className="mobile-fade-in pb-6 space-y-4">
      {/* Coordinator Management (HOD only) */}
      {isHOD && (
        <button
          onClick={() => setCoordSheetOpen(true)}
          className="mobile-tappable flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/60 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300"
        >
          <Users className="w-3.5 h-3.5 text-[#F05A2B]" />
          Coordinators
        </button>
      )}

      {/* Updates Feed */}
      {updates.length === 0 ? (
        <MobileEmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Department updates and announcements will appear here."
        />
      ) : (
        <div className="space-y-3">
          {updates.map(upd => (
            <UpdateCard
              key={upd.id}
              upd={upd}
              canManage={isHOD || (canCompose && upd.author_id === user?.id)}
              onEdit={() => openEdit(upd)}
              onDelete={() => setDeleteTarget(upd)}
              onLike={() => likeMutation.mutate(upd.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {updates.length > 0 && data?.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="mobile-tappable px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-gray-400 tabular-nums">{page}/{data.pages}</span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="mobile-tappable px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* FAB */}
      {canCompose && (
        <MobileFAB onClick={() => { resetForm(); setEditTarget(null); setComposeOpen(true); }} icon={Plus} label="New Update" />
      )}

      {/* Compose/Edit Bottom Sheet */}
      <BottomSheet open={composeOpen} onClose={() => { setComposeOpen(false); setEditTarget(null); resetForm(); }} title={editTarget ? "Edit Update" : "New Update"}>
        <div className="space-y-3">
          {/* Type Selector */}
          <div className="flex gap-2 overflow-x-auto mobile-hide-scrollbar">
            {["Announcement", "Notice", "Event", "Alert"].map(t => (
              <button
                key={t}
                onClick={() => setCompType(t)}
                className={`mobile-tappable whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border shrink-0 ${
                  compType === t
                    ? "bg-[#F05A2B] text-white border-[#F05A2B]"
                    : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={compTitle}
            onChange={(e) => setCompTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />

          <textarea
            value={compContent}
            onChange={(e) => setCompContent(e.target.value)}
            placeholder="Write your announcement..."
            rows={4}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
          />

          {compType === "Event" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Date</label>
                <input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Time</label>
                <input type="time" value={compTime} onChange={e => setCompTime(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Location</label>
                <input type="text" value={compLocation} onChange={e => setCompLocation(e.target.value)} placeholder="Venue" className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none" />
              </div>
            </div>
          )}

          {/* File Attachment */}
          {!editTarget && (
            <div>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mobile-tappable flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-500 w-full justify-center"
              >
                <Image className="w-4 h-4" />
                Add Images / Files ({selectedFiles.length}/10)
              </button>
              {filePreviews.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto mobile-hide-scrollbar">
                  {filePreviews.map((src, idx) => (
                    <div key={idx} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setSelectedFiles(p => p.filter((_, i) => i !== idx));
                          setFilePreviews(p => p.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={createMutation.isPending || editMutation.isPending || (!compContent.trim() && !compTitle.trim())}
            className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(createMutation.isPending || editMutation.isPending) ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {editTarget ? "Save Changes" : "Publish"}
          </button>
        </div>
      </BottomSheet>

      {/* Coordinator Sheet */}
      <BottomSheet open={coordSheetOpen} onClose={() => setCoordSheetOpen(false)} title="Update Coordinators">
        <div className="space-y-2">
          {(coordData?.coordinators || []).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No coordinators assigned.</p>
          ) : (
            (coordData?.coordinators || []).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                <Avatar src={c.profile_picture} name={c.name} size="sm" className="w-8 h-8 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{c.kind === "faculty" ? "Faculty" : "Student"}</p>
                </div>
                <button
                  onClick={() => removeCoordMutation.mutate({ kind: c.kind, refId: c.ref_id })}
                  className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
          <button
            onClick={() => { setCoordSheetOpen(false); setTimeout(() => setCoordPickerOpen(true), 300); }}
            className="mobile-tappable w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-500 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Coordinator
          </button>
        </div>
      </BottomSheet>

      {coordPickerOpen && (
        <SearchPicker
          title="Add Coordinator"
          queryKey="eligible-coordinators"
          queryFn={() => listEligibleCoordinators().then(r => r.data.eligible)}
          onSelect={(item) => {
            setCoordPickerOpen(false);
            assignCoordMutation.mutate({ kind: item.kind, refId: item.ref_id });
          }}
          onClose={() => setCoordPickerOpen(false)}
          placeholder="Search faculty or students..."
          renderItem={(item) => (
            <div className="flex items-center gap-2">
              <Avatar src={item.profile_picture} name={item.name} size="sm" className="w-7 h-7" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                <p className="text-xs text-gray-400">{item.kind}</p>
              </div>
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Delete Update"
        message="Are you sure you want to delete this announcement?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}

function UpdateCard({ upd, canManage, onEdit, onDelete, onLike }) {
  const parsed = parseAnnouncementContent(upd.content);
  const title = parsed.title || parsed.update_type || "Update";
  const desc = parsed.description || "";
  const tag = parsed.update_type || "Notice";
  const tagCls = TAG_COLORS[tag] || TAG_COLORS.Notice;
  const urls = upd.attachment_urls || (upd.attachment_url ? [upd.attachment_url] : []);
  const imageUrls = urls.filter(u => getFileType(u) === "image");
  const otherUrls = urls.filter(u => getFileType(u) !== "image");
  const [expanded, setExpanded] = useState(false);

  return (
    <MobileCard>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-[#F05A2B]/10 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-[#F05A2B]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{title}</h3>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${tagCls}`}>{tag}</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              <Clock className="w-3 h-3 inline mr-0.5" />
              {formatTime(upd.created_at)}
              {upd.author_name && ` · ${upd.author_name}`}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {desc && (
        <div className="mb-3">
          <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
            {desc}
          </p>
          {desc.length > 150 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-1">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Event Details */}
      {parsed.date_time && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-2">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{parsed.date_time}</span>
        </div>
      )}
      {parsed.location && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{parsed.location}</span>
        </div>
      )}

      {/* Image Gallery */}
      {imageUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mobile-hide-scrollbar mb-3 -mx-1 px-1">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="shrink-0 w-32 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {/* Document Attachments */}
      {otherUrls.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {otherUrls.map((url, idx) => {
            const type = getFileType(url);
            if (type === "video") {
              return (
                <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 aspect-video max-h-[180px]">
                  <video src={url} controls className="w-full h-full object-cover" />
                </div>
              );
            }
            const filename = decodeURIComponent(url.split("/").pop() || "Document");
            return (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate flex-1">{filename}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </a>
            );
          })}
        </div>
      )}

      {/* Like Button */}
      <div className="flex items-center pt-2 border-t border-gray-100 dark:border-slate-800/60">
        <button
          onClick={onLike}
          className={`mobile-tappable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            upd.liked
              ? "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-500"
              : "bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/50 text-gray-400 hover:text-rose-500"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${upd.liked ? "fill-rose-500 text-rose-500" : ""}`} />
          {upd.like_count || 0}
        </button>
      </div>
    </MobileCard>
  );
}
