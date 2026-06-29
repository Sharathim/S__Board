import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  listUpdates, createUpdate, editUpdate, deleteUpdate, toggleUpdateLike,
  listCoordinators, listEligibleCoordinators, assignCoordinator
} from "../../api/updates";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/shared/Pagination";
import { Avatar } from "../../components/ui/Avatar";
import { SearchPicker } from "../../components/shared/SearchPicker";
import {
  Megaphone, Plus, Heart, Edit2, Trash2, X,
  Search, Calendar, FileText, Image, ArrowUpRight,
  AlertCircle, CheckCircle2, Clock, MapPin, ChevronRight,
  TrendingUp, Award, Globe
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

function formatEventDate(dt) {
  try {
    if (!dt) return "";
    return format(new Date(dt), "dd MMM yyyy · hh:mm a");
  } catch {
    return dt;
  }
}

function getFileType(url) {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".avi")) {
    return "video";
  }
  if (lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc") || lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".ppt") || lower.endsWith(".pptx")) {
    return "document";
  }
  return "image";
}

function parseAnnouncementContent(contentStr) {
  try {
    const parsed = JSON.parse(contentStr);
    if (parsed && typeof parsed === "object" && "description" in parsed) {
      return {
        department: parsed.department || "PG Department of Computer Science",
        update_type: parsed.update_type || "Announcement",
        title: parsed.title || "",
        description: parsed.description || "",
        date_time: parsed.date_time || "",
        location: parsed.location || "",
        tags: parsed.tags || [],
        visibility: parsed.visibility || "All Hive",
        allow_comments: parsed.allow_comments !== false
      };
    }
  } catch (e) {
    // Treat as raw text
  }
  return {
    department: "PG Department of Computer Science",
    update_type: "Announcement",
    title: "",
    description: contentStr || "",
    date_time: "",
    location: "",
    tags: [],
    visibility: "All Hive",
    allow_comments: true
  };
}

// ─── Swipable Horizontal Image/Video Gallery ───────────────────────────────
function ImageGallery({ urls }) {
  const containerRef = useRef(null);
  const [showPrev, setShowPrev] = useState(false);
  const [showNext, setShowNext] = useState(urls.length > 1);

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowPrev(scrollLeft > 10);
      setShowNext(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (dir) => {
    if (containerRef.current) {
      const offset = dir === "left" ? -containerRef.current.clientWidth * 0.85 : containerRef.current.clientWidth * 0.85;
      containerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [urls]);

  return (
    <div className="relative group/gallery w-full my-4">
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-1 cursor-grab active:cursor-grabbing"
      >
        {urls.map((url, idx) => {
          const type = getFileType(url);
          return (
            <div
              key={idx}
              className="snap-start shrink-0 w-[88%] sm:w-[65%] md:w-[48%] aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700/60"
            >
              {type === "video" ? (
                <video src={url} controls className="w-full h-full object-cover" />
              ) : (
                <img
                  src={url}
                  alt={`attachment-${idx}`}
                  className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
              )}
            </div>
          );
        })}
      </div>
      {showPrev && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center text-gray-700 dark:text-gray-250 z-10 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/gallery:opacity-100"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      )}
      {showNext && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center text-gray-700 dark:text-gray-255 z-10 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/gallery:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ─── Card Media Dispatcher ──────────────────────────────────────────────────
function CardMediaRenderer({ urls }) {
  const mediaUrls = urls.filter(url => getFileType(url) !== "document");
  const docUrls = urls.filter(url => getFileType(url) === "document");

  const renderMediaItem = (url) => {
    const type = getFileType(url);
    if (type === "video") {
      return (
        <video
          src={url}
          controls
          className="w-full h-full object-cover rounded-2xl"
        />
      );
    }
    return (
      <img
        src={url}
        alt="attachment"
        className="w-full h-full object-cover rounded-2xl hover:scale-[1.01] transition-transform duration-300"
      />
    );
  };

  return (
    <div className="w-full space-y-4">
      {mediaUrls.length === 1 && (
        <div className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/30 max-h-[480px] aspect-video w-full border border-gray-100 dark:border-gray-700/40">
          {renderMediaItem(mediaUrls[0])}
        </div>
      )}
      {mediaUrls.length === 2 && (
        <div className="grid grid-cols-2 gap-3 aspect-video sm:aspect-[16/9] w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/40">
          <div className="h-full w-full">{renderMediaItem(mediaUrls[0])}</div>
          <div className="h-full w-full">{renderMediaItem(mediaUrls[1])}</div>
        </div>
      )}
      {mediaUrls.length === 3 && (
        <div className="grid grid-cols-3 gap-3 aspect-video sm:aspect-[16/9] w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/40">
          <div className="h-full w-full">{renderMediaItem(mediaUrls[0])}</div>
          <div className="h-full w-full">{renderMediaItem(mediaUrls[1])}</div>
          <div className="h-full w-full">{renderMediaItem(mediaUrls[2])}</div>
        </div>
      )}
      {mediaUrls.length > 3 && (
        <ImageGallery urls={mediaUrls} />
      )}

      {docUrls.length > 0 && (
        <div className="space-y-2 mt-3">
          {docUrls.map((docUrl, idx) => {
            const filename = decodeURIComponent(docUrl.split("/").pop() || "Attachment Document");
            return (
              <a
                key={idx}
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-150 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/35 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-650 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{filename}</p>
                  <p className="text-[10px] text-gray-400">PDF Document</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Like Action Button with bounce animation ─────────────────────────────
function LikeButton({ liked, count, onClick }) {
  const [animate, setAnimate] = useState(false);

  const handleLike = () => {
    setAnimate(true);
    onClick();
    setTimeout(() => setAnimate(false), 300);
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all duration-200 border ${liked
          ? "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-500 shadow-sm"
          : "bg-gray-50/50 dark:bg-gray-900/20 border-gray-150 dark:border-gray-850/55 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
        } ${animate ? "scale-110" : "scale-100"}`}
    >
      <Heart className={`w-4 h-4 transition-all duration-200 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
      <span>{count}</span>
    </button>
  );
}

// ─── MAIN UPDATES PAGE ──────────────────────────────────────────────────────
export default function UpdatesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [coordPickerOpen, setCoordPickerOpen] = useState(false);
  const [openKebabId, setOpenKebabId] = useState(null);

  // Form compose states
  const [compType, setCompType] = useState("Announcement");
  const [compTitle, setCompTitle] = useState("");
  const [compContent, setCompContent] = useState("");
  const [compDate, setCompDate] = useState("");
  const [compTime, setCompTime] = useState("");
  const [compLocation, setCompLocation] = useState("");
  const [compTags, setCompTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  // Toast States
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef(null);

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(""), 3500); };
  const showError = (msg) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(""), 4000); };

  const { data: coordData } = useQuery({
    queryKey: ["coordinators"],
    queryFn: () => listCoordinators().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["updates", page],
    queryFn: () => listUpdates({ page, per_page: 15 }).then(r => r.data),
  });

  // isUpdateCoordinator check: only flagged faculty or students in the coordinators list
  const isUpdateCoordinator = user?.faculty?.is_update_coordinator
    || (user?.role === "STUDENT" && (coordData?.coordinators || []).some(c => c.name === user?.name));

  const assignCoordMutation = useMutation({
    mutationFn: ({ kind, refId }) => assignCoordinator(kind, refId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinators"] });
      setCoordPickerOpen(false);
      showSuccess("Coordinator assigned successfully.");
    },
    onError: () => showError("Failed to assign coordinator."),
  });

  const createMutation = useMutation({
    mutationFn: (formData) => createUpdate(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setShowCreateModal(false);
      resetFormStates();
      showSuccess("Announcement published successfully!");
    },
    onError: (err) => showError(err.response?.data?.error || "Failed to publish announcement."),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content, attachment_url, attachment_type }) => editUpdate(id, {
      content,
      attachment_url,
      attachment_type
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setShowCreateModal(false);
      setEditTarget(null);
      resetFormStates();
      showSuccess("Announcement updated successfully!");
    },
    onError: (err) => showError(err.response?.data?.error || "Failed to update announcement."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setDeleteTarget(null);
      showSuccess("Announcement deleted.");
    },
    onError: () => showError("Failed to delete announcement."),
  });

  const likeMutation = useMutation({
    mutationFn: toggleUpdateLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["updates"] }),
  });

  const resetFormStates = () => {
    setCompType("Announcement");
    setCompTitle("");
    setCompContent("");
    setCompDate("");
    setCompTime("");
    setCompLocation("");
    setCompTags([]);
    setNewTagInput("");
    setSelectedFiles([]);
    setFilePreviews([]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (selectedFiles.length + files.length > 10) {
      showError("Maximum 10 files allowed.");
      return;
    }

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
    if (!compContent.trim() && !compTitle.trim()) return;
    const combinedDateTime = compDate && compTime ? `${compDate}T${compTime}` : compDate || compTime || "";

    const postContent = JSON.stringify({
      department: "PG Department of Computer Science",
      update_type: compType,
      title: compTitle,
      description: compContent,
      date_time: combinedDateTime,
      location: compLocation,
      tags: compTags,
      visibility: "All Hive",
      allow_comments: true
    });

    const formData = new FormData();
    formData.append("content", postContent);
    selectedFiles.forEach((file) => {
      formData.append("attachment", file);
    });

    createMutation.mutate(formData);
  };

  const handleSaveEdit = () => {
    if (!compContent.trim() && !compTitle.trim()) return;
    const combinedDateTime = compDate && compTime ? `${compDate}T${compTime}` : compDate || compTime || "";

    const postContent = JSON.stringify({
      department: "PG Department of Computer Science",
      update_type: compType,
      title: compTitle,
      description: compContent,
      date_time: combinedDateTime,
      location: compLocation,
      tags: compTags,
      visibility: "All Hive",
      allow_comments: true
    });

    editMutation.mutate({
      id: editTarget.id,
      content: postContent,
      attachment_url: editTarget.attachment_url,
      attachment_type: editTarget.attachment_type
    });
  };

  const openEditModal = (update) => {
    const parsed = parseAnnouncementContent(update.content);
    setEditTarget(update);
    setCompType(parsed.update_type || "Announcement");
    setCompTitle(parsed.title || "");
    setCompContent(parsed.description || "");

    const dt = parsed.date_time || "";
    if (dt.includes("T")) {
      const [dPart, tPart] = dt.split("T");
      setCompDate(dPart || "");
      setCompTime(tPart || "");
    } else {
      setCompDate(dt || "");
      setCompTime("");
    }
    setCompLocation(parsed.location || "");
    setCompTags(parsed.tags || []);
    setShowCreateModal(true);
  };

  const triggerCreateModal = () => {
    setEditTarget(null);
    resetFormStates();
    setShowCreateModal(true);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-indigo-650">
            <Megaphone className="w-7 h-7 text-white" />
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-400">Loading Announcements...</p>
      </div>
    </div>
  );

  const rawUpdates = data?.updates || [];

  const filteredSearchUpdates = rawUpdates.filter(u => {
    const parsed = parseAnnouncementContent(u.content);
    const textToSearch = (parsed.title + " " + parsed.description + " " + parsed.department + " " + (parsed.tags ? parsed.tags.join(" ") : "")).toLowerCase();
    return textToSearch.includes(searchTerm.toLowerCase());
  });

  const finalUpdates = filteredSearchUpdates.filter(u => {
    const parsed = parseAnnouncementContent(u.content);
    const type = (parsed.update_type || "Announcement").toLowerCase();

    if (activeFilterTab === "all") return true;
    if (activeFilterTab === "announcements") return type === "announcement";
    if (activeFilterTab === "events") return type === "event";
    if (activeFilterTab === "achievements") return type === "achievement";
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">

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

      {/* ── Page Header Row ── */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800/80 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Updates</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {isHOD && (
            <button
              type="button"
              onClick={() => setCoordPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-750 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" /> Updates coordinator
            </button>
          )}
          {isUpdateCoordinator && (
            <button
              type="button"
              onClick={triggerCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-750 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" /> Create Update
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Floating Action Button ── */}
      {isUpdateCoordinator && (
        <button
          type="button"
          onClick={triggerCreateModal}
          className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-650 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ── Filters Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-805 pb-3 mt-4">
        {/* Tabs */}
        <div className="flex gap-6 overflow-x-auto scrollbar-none shrink-0">
          {[
            { key: "all", label: "All" },
            { key: "announcements", label: "Announcements" },
            { key: "events", label: "Events" },
            { key: "achievements", label: "Achievements" },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveFilterTab(tab.key); setPage(1); }}
              className={`px-1 py-1.5 text-sm transition-all shrink-0 relative ${activeFilterTab === tab.key
                  ? "text-violet-650 dark:text-violet-400 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-850 dark:hover:text-gray-205"
                }`}
            >
              {tab.label}
              {activeFilterTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-600 rounded-full animate-fade-in" />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search updates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-905 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-605">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Content Feed ── */}
      {finalUpdates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl border border-gray-150 dark:border-gray-700/60 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700/40">
            <Megaphone className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No updates available</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
            Department updates published by the department will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {finalUpdates.map(update => {
            const parsed = parseAnnouncementContent(update.content);
            const urls = update.attachment_url ? update.attachment_url.split(',').filter(Boolean) : [];

            return (
              <article
                key={update.id}
                className="group bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-700/60 shadow-sm p-4 sm:p-[18px] md:p-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-900 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm">
                      {(parsed.department || "D").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                        {parsed.department || "PG Department of Computer Science"}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                        <span>{formatTime(update.created_at)}</span>
                        <span>·</span>
                        <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Actions Kebab Menu for Coordinators & HOD */}
                  {(isHOD || (isUpdateCoordinator && update.posted_by === user?.id)) && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenKebabId(openKebabId === update.id ? null : update.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <span className="text-lg font-bold tracking-widest leading-none block -mt-1">...</span>
                      </button>
                      {openKebabId === update.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1">
                          {update.posted_by === user?.id && (
                            <button
                              type="button"
                              onClick={() => { openEditModal(update); setOpenKebabId(null); }}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setDeleteTarget(update.id); setOpenKebabId(null); }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Title */}
                {parsed.title && (
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug mt-3.5 mb-1.5">
                    {parsed.title}
                  </h2>
                )}

                {/* Description */}
                <p className="text-sm text-gray-750 dark:text-gray-300 leading-relaxed whitespace-pre-line mb-4">
                  {parsed.description}
                </p>

                {/* Media Renderer */}
                {urls.length > 0 && (
                  <div className="mb-4">
                    <CardMediaRenderer urls={urls} />
                  </div>
                )}

                {/* Tags */}
                {parsed.tags && parsed.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {parsed.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-955/35 text-violet-650 dark:text-violet-400 text-xs font-bold shrink-0">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Event Details */}
                {(parsed.update_type === "Event" || parsed.date_time || parsed.location) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {parsed.date_time && (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatEventDate(parsed.date_time)}
                      </span>
                    )}
                    {parsed.location && (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {parsed.location}
                      </span>
                    )}
                  </div>
                )}

                {/* Card Divider Line */}
                <div className="h-px bg-gray-100 dark:bg-gray-750/60 my-4" />

                {/* Bottom Actions - Likes Only */}
                <div className="flex items-center">
                  <LikeButton
                    liked={update.liked}
                    count={update.like_count || 0}
                    onClick={() => likeMutation.mutate(update.id)}
                  />
                </div>

              </article>
            );
          })}

          <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
        </div>
      )}

      {/* ── Center Compose/Edit Modal (React Portal) ── */}
      {showCreateModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[5px] p-0 sm:p-4 md:p-6 animate-fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-[900px] sm:w-[95%] md:w-[900px] sm:rounded-3xl shadow-2xl border border-gray-150 dark:border-gray-700/60 flex flex-col overflow-hidden transition-all duration-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-155 dark:border-gray-700/60 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editTarget ? "Edit Update" : "Create New Update"}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Provide announcement info and publish to the feed.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form scrollable container */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">

              {/* Department */}
              <div className="bg-gray-50 dark:bg-gray-900/35 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700/60">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5">Department</label>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">PG Department of Computer Science</p>
              </div>

              {/* Update Type */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5">Update Type</label>
                <select
                  value={compType}
                  onChange={(e) => setCompType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Event">Event</option>
                  <option value="Achievement">Achievement</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5">Title</label>
                <input
                  type="text"
                  placeholder="Enter a catchy title..."
                  value={compTitle}
                  onChange={(e) => setCompTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  placeholder="Write your details here..."
                  value={compContent}
                  onChange={(e) => setCompContent(e.target.value)}
                  rows={6}
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-none leading-relaxed"
                />
              </div>

              {/* Media Upload - Creation Only */}
              {!editTarget && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest mb-1.5">Media Upload</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-gray-900/20 group"
                  >
                    <Image className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:scale-105 transition-transform" />
                    <p className="text-xs font-bold text-gray-650 dark:text-gray-300">Add photos / videos / PDF / documents or drag and drop</p>
                    <p className="text-[10px] text-gray-400 mt-1">Maximum 10 files (Up to 5MB each)</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/*,video/*,application/pdf"
                    className="hidden"
                  />

                  {/* File previews */}
                  {filePreviews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3 animate-fade-in">
                      {filePreviews.map((preview, idx) => (
                        <div key={idx} className="relative rounded-xl border border-gray-150 dark:border-gray-700 overflow-hidden h-20 bg-gray-50 dark:bg-gray-900/30">
                          <img src={preview} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5">Date</label>
                  <input
                    type="date"
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5">Time</label>
                  <input
                    type="time"
                    value={compTime}
                    onChange={(e) => setCompTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Seminar Hall"
                  value={compLocation}
                  onChange={(e) => setCompLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                />
              </div>

              {/* Tags Creator Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 min-h-[42px] items-center">
                  {compTags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-955 text-violet-650 dark:text-violet-400 text-xs font-extrabold border border-violet-100/40 dark:border-violet-900/30">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setCompTags(compTags.filter((_, i) => i !== idx))}
                        className="hover:text-red-500 focus:outline-none shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Type and press Enter or comma..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const clean = newTagInput.trim().replace(/,/g, "");
                        if (clean && !compTags.includes(clean)) {
                          setCompTags([...compTags, clean]);
                        }
                        setNewTagInput("");
                      }
                    }}
                    className="flex-1 bg-transparent border-0 outline-none p-0 text-sm text-gray-905 dark:text-white placeholder-gray-400 focus:ring-0 min-w-[120px]"
                  />
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-150 dark:border-gray-700/60 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-650 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editTarget ? handleSaveEdit : handlePublish}
                disabled={createMutation.isPending || editMutation.isPending || (!compContent.trim() && !compTitle.trim())}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-750 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/20 disabled:opacity-60"
              >
                {editTarget
                  ? (editMutation.isPending ? "Saving..." : "Save Changes")
                  : (createMutation.isPending ? "Publishing..." : "Publish Update")
                }
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action is permanent and cannot be undone."
        confirmText="Delete Announcement"
        danger
      />

      {/* Coordinator Assignment picker */}
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
