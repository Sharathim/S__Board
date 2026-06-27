import { useState, useRef } from "react";
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
  Bookmark, TrendingUp, Clock, MapPin, Globe, Check, Award
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

function parseAnnouncementContent(contentStr) {
  try {
    const parsed = JSON.parse(contentStr);
    if (parsed && typeof parsed === "object" && "description" in parsed) {
      return {
        department: parsed.department || "Department",
        update_type: parsed.update_type || "Post",
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
    department: "Department",
    update_type: "Post",
    title: "",
    description: contentStr || "",
    date_time: "",
    location: "",
    tags: [],
    visibility: "All Hive",
    allow_comments: true
  };
}

export default function UpdatesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [coordPickerOpen, setCoordPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all");

  // Rich Announcement Compose States
  const [compDept, setCompDept] = useState("Design Department");
  const [compType, setCompType] = useState("Post");
  const [compTitle, setCompTitle] = useState("");
  const [compContent, setCompContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [compDateTime, setCompDateTime] = useState("");
  const [compLocation, setCompLocation] = useState("");
  const [compTags, setCompTags] = useState("");
  const [compVisibility, setCompVisibility] = useState("All Hive");
  const [compAllowComments, setCompAllowComments] = useState(true);

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

  // isCoordinator: HOD always, faculty if flagged, or forum-member student whose name is in the coordinator list
  const isCoordinator = user?.role === "HOD"
    || user?.faculty?.is_update_coordinator
    || (user?.role === "STUDENT" && (coordData?.coordinators || []).some(c => c.name === user?.name));

  const assignCoordMutation = useMutation({
    mutationFn: ({ kind, refId }) => assignCoordinator(kind, refId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coordinators"] }); setCoordPickerOpen(false); showSuccess("Coordinator assigned successfully."); },
    onError: () => showError("Failed to assign coordinator."),
  });

  const removeCoordMutation = useMutation({
    mutationFn: ({ kind, refId }) => removeCoordinator(kind, refId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coordinators"] }); showSuccess("Coordinator removed."); },
    onError: () => showError("Failed to remove coordinator."),
  });

  const createMutation = useMutation({
    mutationFn: (formData) => createUpdate(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setShowCreate(false);
      setCompTitle("");
      setCompContent("");
      setSelectedFiles([]);
      setFilePreviews([]);
      setCompDateTime("");
      setCompLocation("");
      setCompTags("");
      setCompAllowComments(true);
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
      setEditTarget(null);
      setCompTitle("");
      setCompContent("");
      setCompDateTime("");
      setCompLocation("");
      setCompTags("");
      setCompAllowComments(true);
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
    if (!compContent.trim() && !compTitle.trim()) return;
    const postContent = JSON.stringify({
      department: compDept,
      update_type: compType,
      title: compTitle,
      description: compContent,
      date_time: compDateTime,
      location: compLocation,
      tags: compTags.split(',').map(t => t.trim()).filter(Boolean),
      visibility: compVisibility,
      allow_comments: compAllowComments
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
    const postContent = JSON.stringify({
      department: compDept,
      update_type: compType,
      title: compTitle,
      description: compContent,
      date_time: compDateTime,
      location: compLocation,
      tags: compTags.split(',').map(t => t.trim()).filter(Boolean),
      visibility: compVisibility,
      allow_comments: compAllowComments
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
    setCompDept(parsed.department);
    setCompType(parsed.update_type);
    setCompTitle(parsed.title);
    setCompContent(parsed.description);
    setCompDateTime(parsed.date_time);
    setCompLocation(parsed.location);
    setCompTags(parsed.tags.join(", "));
    setCompVisibility(parsed.visibility);
    setCompAllowComments(parsed.allow_comments);
  };

  const rawUpdates = data?.updates || [];

  const filteredSearchUpdates = rawUpdates.filter(u => {
    const parsed = parseAnnouncementContent(u.content);
    const textToSearch = (parsed.title + " " + parsed.description + " " + parsed.department + " " + (parsed.tags ? parsed.tags.join(" ") : "")).toLowerCase();
    return textToSearch.includes(searchTerm.toLowerCase());
  });

  const finalUpdates = filteredSearchUpdates.filter(u => {
    const parsed = parseAnnouncementContent(u.content);
    const type = (parsed.update_type || "Post").toLowerCase();
    
    if (activeFilterTab === "all") return true;
    if (activeFilterTab === "announcements") return type === "announcement";
    if (activeFilterTab === "events") return type === "event";
    if (activeFilterTab === "achievements") return type === "achievement";
    return true;
  });

  const coordinators = coordData?.coordinators || [];

  const getAvatarBg = (dept) => {
    if (dept?.toLowerCase().includes("design")) return "bg-indigo-650";
    if (dept?.toLowerCase().includes("tech")) return "bg-violet-600";
    if (dept?.toLowerCase().includes("mech")) return "bg-amber-600";
    if (dept?.toLowerCase().includes("elec")) return "bg-emerald-600";
    return "bg-primary-600";
  };

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
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
                showCreate
                  ? "bg-red-500 hover:bg-red-650 text-white"
                  : "bg-white text-primary-700 hover:bg-blue-50"
              }`}
            >
              {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreate ? "Cancel Compose" : "Create Announcement"}
            </button>
          )}
        </div>

      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT / MAIN FEED (8 cols) ── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Inline Create Announcement Form */}
          {showCreate && (
            <div className="bg-white dark:bg-gray-800/85 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-md mb-6 space-y-5 animate-slide-in">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-50 dark:border-gray-700/40">
                <Megaphone className="w-5 h-5 text-primary-500" />
                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">CREATE UPDATE</h3>
              </div>

              {/* 1 & 2: Department and Update Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">1</span>
                    Department
                  </label>
                  <select
                    value={compDept}
                    onChange={(e) => setCompDept(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                  >
                    <option value="Design Department">Design Department</option>
                    <option value="Technical Department">Technical Department</option>
                    <option value="Mechanical Department">Mechanical Department</option>
                    <option value="Electronics Department">Electronics Department</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">2</span>
                    Update Type
                  </label>
                  <select
                    value={compType}
                    onChange={(e) => setCompType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                  >
                    <option value="Post">Post</option>
                    <option value="Announcement">Announcement</option>
                    <option value="Event">Event</option>
                    <option value="Achievement">Achievement</option>
                  </select>
                </div>
              </div>

              {/* 3: Title / Heading */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">3</span>
                  Title / Heading
                </label>
                <input
                  type="text"
                  placeholder="Enter a catchy title"
                  value={compTitle}
                  onChange={(e) => setCompTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
              </div>

              {/* 4: Content / Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">4</span>
                  Content / Description
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-805">
                  <textarea
                    value={compContent}
                    onChange={(e) => setCompContent(e.target.value.slice(0, 1000))}
                    placeholder="Write about your update..."
                    rows={4}
                    className="w-full p-3 bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:ring-0 leading-relaxed"
                  />
                  <div className="p-1.5 text-right text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/60">
                    {compContent.length}/1000
                  </div>
                </div>
              </div>

              {/* 5: Media */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">5</span>
                  Media
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-gray-50 dark:bg-gray-900/30 group"
                >
                  <Image className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Add photos / videos / documents or drag and drop</p>
                  <p className="text-[10px] text-gray-400 mt-1">You can upload up to 10 files</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,application/pdf"
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
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6 & 7: Date & Time and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">6</span>
                    Date & Time
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="datetime-local"
                      value={compDateTime}
                      onChange={(e) => setCompDateTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">7</span>
                    Location (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Enter location"
                      value={compLocation}
                      onChange={(e) => setCompLocation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                    />
                  </div>
                </div>
              </div>

              {/* 8 & 9: Tags & Visibility */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">8</span>
                    Tags / Category
                  </label>
                  <input
                    type="text"
                    placeholder="Add tags (comma separated, e.g. Workshop, Design)"
                    value={compTags}
                    onChange={(e) => setCompTags(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">9</span>
                    Visibility
                  </label>
                  <select
                    value={compVisibility}
                    onChange={(e) => setCompVisibility(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                  >
                    <option value="All Hive">All Hive</option>
                    <option value="Specific Departments">Specific Departments</option>
                  </select>
                </div>
              </div>

              {/* 10: Allow Comments */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center">10</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">Allow Comments & Reactions</p>
                    <p className="text-[10px] text-gray-400">Enable others to like and comment</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compAllowComments}
                    onChange={(e) => setCompAllowComments(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3 border-t border-gray-50 dark:border-gray-700/40">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-755 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={createMutation.isPending || (!compContent.trim() && !compTitle.trim())}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:shadow-primary-500/30 disabled:opacity-60"
                >
                  {createMutation.isPending ? "Publishing..." : "Publish Update"}
                </button>
              </div>
            </div>
          )}

          {/* Feed Controls */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-700/40 rounded-xl p-1 w-full sm:w-auto">
              {[
                { key: "all", label: "All", icon: Newspaper },
                { key: "announcements", label: "Announcements", icon: Megaphone },
                { key: "events", label: "Events", icon: Calendar },
                { key: "achievements", label: "Achievements", icon: Award },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => { setActiveFilterTab(tab.key); setPage(1); }}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600/60 bg-gray-50 dark:bg-gray-700/40 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Count badge */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 shrink-0 shadow-sm">
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
              {finalUpdates.map(update => {
                const parsed = parseAnnouncementContent(update.content);
                const isBookmarked = bookmarkedIds.includes(update.id);
                return (
                  <article
                    key={update.id}
                    className="group bg-white dark:bg-gray-800/80 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-primary-100 dark:hover:border-primary-800/30 transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {/* Initials Avatar */}
                          <div className={`w-10 h-10 rounded-full ${getAvatarBg(parsed.department)} text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm`}>
                            {(parsed.department || "D").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                                {parsed.department}
                              </span>
                              {update.is_edited && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 uppercase tracking-wide">
                                  Edited
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                              <span>{formatTime(update.created_at)}</span>
                              <span className="text-gray-300 dark:text-gray-600">·</span>
                              <Globe className="w-3 h-3 text-gray-400" />
                            </div>
                          </div>
                        </div>

                        {/* Top Right Header Actions */}
                        <div className="flex items-center gap-1.5">
                          {/* Bookmark */}
                          <button
                            type="button"
                            onClick={() => toggleBookmark(update.id)}
                            className={`p-2 rounded-xl transition-all ${
                              isBookmarked
                                ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30"
                                : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                            }`}
                            title="Bookmark update"
                          >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-500" : ""}`} />
                          </button>

                          {/* Coordinator Actions */}
                          {update.posted_by === user?.id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => openEditModal(update)}
                                className="p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700/40"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(update.id)}
                                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700/40"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Title */}
                      {parsed.title && (
                        <h2 className="text-base font-extrabold text-gray-900 dark:text-white leading-snug mb-2">
                          {parsed.title}
                        </h2>
                      )}

                      {/* Card Body Description */}
                      <p className="text-sm text-gray-700 dark:text-gray-250 leading-relaxed whitespace-pre-line mb-4">
                        {parsed.description}
                      </p>

                      {/* Media Image Grid (Tweet Layout style) */}
                      {update.attachment_url && (
                        <div className="mb-4">
                          {(() => {
                            const urls = update.attachment_url.split(',').filter(Boolean);
                            if (urls.length === 0) return null;
                            if (urls.length === 1) {
                              return (
                                <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 overflow-hidden bg-gray-50 dark:bg-gray-900/30 max-h-96 flex items-center justify-center animate-fade-in">
                                  <img
                                    src={urls[0]}
                                    alt="announcement attachment"
                                    className="w-full object-cover max-h-96 hover:scale-[1.01] transition-transform duration-300"
                                    onError={(e) => { e.target.parentElement.style.display = "none"; }}
                                  />
                                </div>
                              );
                            }
                            if (urls.length === 2) {
                              return (
                                <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 animate-fade-in">
                                  {urls.map((url, i) => (
                                    <img key={i} src={url} alt={`attachment-${i}`} className="w-full h-48 object-cover hover:scale-[1.01] transition-transform duration-300" />
                                  ))}
                                </div>
                              );
                            }
                            if (urls.length === 3) {
                              return (
                                <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 h-64 animate-fade-in">
                                  <img src={urls[0]} alt="attachment-0" className="col-span-2 w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
                                  <div className="grid grid-rows-2 gap-2 h-full">
                                    <img src={urls[1]} alt="attachment-1" className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
                                    <img src={urls[2]} alt="attachment-2" className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 animate-fade-in">
                                {urls.slice(0, 4).map((url, i) => (
                                  <div key={i} className="relative h-40">
                                    <img src={url} alt={`attachment-${i}`} className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
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

                      {/* Event Info Line (Date/Time & Location) */}
                      {(parsed.update_type === "Event" || parsed.date_time || parsed.location) && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-700/40 rounded-2xl mb-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {parsed.date_time && (
                            <span className="flex items-center gap-1.5 shrink-0">
                              <Calendar className="w-4 h-4 text-primary-500" />
                              {formatEventDate(parsed.date_time)}
                            </span>
                          )}
                          {parsed.date_time && parsed.location && (
                            <span className="hidden sm:inline text-gray-300 dark:text-gray-700">|</span>
                          )}
                          {parsed.location && (
                            <span className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-4 h-4 text-indigo-500" />
                              {parsed.location}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tags list pills */}
                      {parsed.tags && parsed.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {parsed.tags.map((tag, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase tracking-wider animate-fade-in">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/40">
                        <div className="flex items-center gap-2">
                          {/* Heart Likes */}
                          <button
                            type="button"
                            onClick={() => likeMutation.mutate(update.id)}
                            className={`group/like inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${
                              update.liked
                                ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30"
                                : "text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            }`}
                          >
                            <Heart className={`w-4 h-4 transition-all group-active/like:scale-125 duration-150 ${update.liked ? "fill-rose-500 text-rose-500" : ""}`} />
                            <span>{update.like_count || 0}</span>
                          </button>

                          {/* Comments bubble (mock comment button) */}
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>8</span>
                          </button>
                        </div>

                        {/* Share */}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (4 cols) ── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Coordinators Card */}
          <div className="bg-white dark:bg-gray-800/80 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
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
                  type="button"
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
                    <div key={`${c.kind}-${c.ref_id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all group border border-transparent hover:border-gray-100 dark:hover:border-gray-700/40 shadow-sm hover:shadow">
                      <Avatar src={c.profile_picture} name={c.name} size="sm" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">{c.name}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.subtitle}</p>
                      </div>
                      {isHOD && (
                        <button
                          type="button"
                          onClick={() => removeCoordMutation.mutate({ kind: c.kind, refId: c.ref_id })}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 shrink-0 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
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

          {/* Quick Info notice tips */}
          <div className="bg-gradient-to-br from-indigo-50 to-primary-50 dark:from-indigo-900/20 dark:to-primary-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/30 p-5">
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
                <li key={tip} className="flex items-start gap-2 text-xs text-indigo-700/70 dark:text-indigo-300/60 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* ── Edit Modal with 10 fields ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Announcement">
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Department & Update Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Department</label>
              <select
                value={compDept}
                onChange={(e) => setCompDept(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              >
                <option value="Design Department">Design Department</option>
                <option value="Technical Department">Technical Department</option>
                <option value="Mechanical Department">Mechanical Department</option>
                <option value="Electronics Department">Electronics Department</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Update Type</label>
              <select
                value={compType}
                onChange={(e) => setCompType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              >
                <option value="Post">Post</option>
                <option value="Announcement">Announcement</option>
                <option value="Event">Event</option>
                <option value="Achievement">Achievement</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Title / Heading</label>
            <input
              type="text"
              placeholder="Enter title"
              value={compTitle}
              onChange={(e) => setCompTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Content / Description</label>
            <textarea
              value={compContent}
              onChange={(e) => setCompContent(e.target.value)}
              rows={4}
              placeholder="Content..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25 resize-none leading-relaxed"
            />
          </div>

          {/* Date & Time and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Date & Time</label>
              <input
                type="datetime-local"
                value={compDateTime}
                onChange={(e) => setCompDateTime(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Location (Optional)</label>
              <input
                type="text"
                placeholder="Enter location"
                value={compLocation}
                onChange={(e) => setCompLocation(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
            </div>
          </div>

          {/* Tags & Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Tags / Category</label>
              <input
                type="text"
                placeholder="Tags"
                value={compTags}
                onChange={(e) => setCompTags(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Visibility</label>
              <select
                value={compVisibility}
                onChange={(e) => setCompVisibility(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              >
                <option value="All Hive">All Hive</option>
                <option value="Specific Departments">Specific Departments</option>
              </select>
            </div>
          </div>

          {/* Allow Comments */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <span className="text-xs font-bold text-gray-800 dark:text-white">Allow Comments & Reactions</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={compAllowComments}
                onChange={(e) => setCompAllowComments(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 dark:bg-gray-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-50 dark:border-gray-700/40">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-755 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={editMutation.isPending || (!compContent.trim() && !compTitle.trim())}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

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

function formatEventDate(dt) {
  try {
    if (!dt) return "";
    return format(new Date(dt), "dd MMM yyyy · hh:mm a");
  } catch {
    return dt;
  }
}
