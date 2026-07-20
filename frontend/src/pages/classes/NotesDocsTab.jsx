import { useState, useMemo } from "react";
import { parseUTCDate } from "../../utils/dateUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  FolderPlus, Plus, Archive, Trash2, Edit3, FileText, Download,
  Eye, History, ChevronDown, ChevronUp, ArrowLeft, UploadCloud, X,
  CheckCircle2, AlertCircle, Calendar, BookOpen, Layers, User,
  Sparkles, ChevronRight
} from "lucide-react";
import {
  listSubjects, createSubject, editSubject, deleteSubject,
  archiveSubject, unarchiveSubject, listUnits, createUnit,
  editUnit, deleteUnit, uploadFiles, deleteFile, getNotesLogs
} from "../../api/classes";
import { useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import AIAssistPanel from "./AIAssistPanel";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Permission helpers ───────────────────────────────────────────────────────
function canModify(user, className, creatorId) {
  if (!user) return false;
  if (user.role === "HOD") return true;
  if (user.role === "FACULTY") {
    if (user.faculty?.class_incharge_of === className) return true;
    return user.id === creatorId;
  }
  return false;
}

// ─── Generate academic year options ──────────────────────────────────────────
function getAcademicYearOptions() {
  const now = new Date();
  const currentYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 2; y--) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
}

function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

// ─── Semester tab pills ───────────────────────────────────────────────────────
const SEMESTERS = [
  { value: 1, label: "Semester 1" },
  { value: 2, label: "Semester 2" },
  { value: null, label: "Unsorted" },
];

// ─── NotesDocsTab ─────────────────────────────────────────────────────────────
export default function NotesDocsTab({ className }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Navigation
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Semester/year filters
  const [activeSemester, setActiveSemester] = useState(1);
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
  const yearOptions = useMemo(getAcademicYearOptions, []);

  // Modals
  const [subjectModal, setSubjectModal] = useState({ open: false, mode: "create", subject: null });
  const [unitModal, setUnitModal] = useState({ open: false, mode: "create", unit: null });
  const [uploadModal, setUploadModal] = useState({ open: false, unit: null });
  const [logsModal, setLogsModal] = useState(false);
  const [previewModal, setPreviewModal] = useState({ open: false, unit: null, initialFileId: null });

  const handleDownload = async (e, url, fileName) => {
    if (e) e.preventDefault();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, "_blank");
    }
  };

  // Confirm dialogs
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  // Form states
  const [subjectName, setSubjectName] = useState("");
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [subjectSemester, setSubjectSemester] = useState(1);
  const [unitName, setUnitName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadError, setUploadError] = useState("");

  // Accordion state for units
  const [expandedUnits, setExpandedUnits] = useState({});

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: subjectsData, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["subjects", className, showArchived],
    queryFn: () => listSubjects(className, showArchived).then(r => r.data.subjects)
  });

  const { data: unitsData, isLoading: isLoadingUnits } = useQuery({
    queryKey: ["units", className, selectedSubject?.id],
    queryFn: () => listUnits(className, selectedSubject?.id).then(r => r.data.units),
    enabled: !!selectedSubject
  });

  const [logsPage, setLogsPage] = useState(1);
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["notes-logs", className, logsPage],
    queryFn: () => getNotesLogs(className, logsPage).then(r => r.data),
    enabled: logsModal
  });

  // ── Derived: filter subjects by semester + year ───────────────────────────
  const filteredSubjects = useMemo(() => {
    if (!subjectsData) return [];
    return subjectsData.filter(s => {
      const yearMatch = !showArchived ? s.academic_year === selectedYear : true;
      const semMatch = activeSemester === null
        ? s.semester === null || s.semester === undefined
        : s.semester === activeSemester;
      return yearMatch && semMatch;
    });
  }, [subjectsData, activeSemester, selectedYear, showArchived]);

  // Count per semester tab (for badges)
  const semesterCounts = useMemo(() => {
    if (!subjectsData) return {};
    const counts = {};
    for (const sem of SEMESTERS) {
      counts[String(sem.value)] = subjectsData.filter(s => {
        const yearMatch = s.academic_year === selectedYear;
        const semMatch = sem.value === null
          ? s.semester === null || s.semester === undefined
          : s.semester === sem.value;
        return yearMatch && semMatch;
      }).length;
    }
    return counts;
  }, [subjectsData, selectedYear]);

  // ── Mutations: Subjects ──────────────────────────────────────────────────
  const createSubjectMutation = useMutation({
    mutationFn: (data) => createSubject(className, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects", className] });
      setSubjectModal({ open: false, mode: "create", subject: null });
    }
  });

  const editSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => editSubject(className, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects", className] });
      setSubjectModal({ open: false, mode: "create", subject: null });
    }
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id) => deleteSubject(className, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects", className] });
      setDeleteSubjectTarget(null);
    }
  });

  const archiveSubjectMutation = useMutation({
    mutationFn: (id) => archiveSubject(className, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects", className] });
      setArchiveTarget(null);
    }
  });

  const unarchiveSubjectMutation = useMutation({
    mutationFn: (id) => unarchiveSubject(className, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects", className] });
    }
  });

  // ── Mutations: Units ─────────────────────────────────────────────────────
  const createUnitMutation = useMutation({
    mutationFn: (data) => createUnit(className, selectedSubject.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", className, selectedSubject.id] });
      setUnitModal({ open: false, mode: "create", unit: null });
    }
  });

  const editUnitMutation = useMutation({
    mutationFn: ({ id, data }) => editUnit(className, selectedSubject.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", className, selectedSubject.id] });
      setUnitModal({ open: false, mode: "create", unit: null });
    }
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id) => deleteUnit(className, selectedSubject.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", className, selectedSubject.id] });
      setDeleteUnitTarget(null);
    }
  });

  // ── Mutations: Files ──────────────────────────────────────────────────────
  const uploadFilesMutation = useMutation({
    mutationFn: ({ unitId, formData }) => uploadFiles(className, selectedSubject.id, unitId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", className, selectedSubject.id] });
      setUploadModal({ open: false, unit: null });
      setSelectedFiles([]);
      setUploadError("");
    },
    onError: (err) => {
      setUploadError(err.response?.data?.error || "Failed to upload files");
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: ({ unitId, fileId }) => deleteFile(className, selectedSubject.id, unitId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", className, selectedSubject.id] });
      setDeleteFileTarget(null);
    }
  });

  // ── Form handlers ─────────────────────────────────────────────────────────
  const handleSubjectSubmit = (e) => {
    e.preventDefault();
    if (!subjectName.trim() || !academicYear.trim()) return;
    const payload = { name: subjectName.trim(), academic_year: academicYear.trim(), semester: subjectSemester };
    if (subjectModal.mode === "create") {
      createSubjectMutation.mutate(payload);
    } else {
      editSubjectMutation.mutate({ id: subjectModal.subject.id, data: payload });
    }
  };

  const handleUnitSubmit = (e) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    const payload = { name: unitName.trim() };
    if (unitModal.mode === "create") {
      createUnitMutation.mutate(payload);
    } else {
      editUnitMutation.mutate({ id: unitModal.unit.id, data: payload });
    }
  };

  const handleFileUploadSubmit = (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append("files", file));
    uploadFilesMutation.mutate({ unitId: uploadModal.unit.id, formData });
  };

  const openSubjectModal = (mode, subject = null) => {
    setSubjectName(subject ? subject.name : "");
    setAcademicYear(subject ? subject.academic_year : selectedYear);
    setSubjectSemester(subject ? (subject.semester ?? activeSemester ?? 1) : (activeSemester ?? 1));
    setSubjectModal({ open: true, mode, subject });
  };

  const openUnitModal = (mode, unit = null) => {
    setUnitName(unit ? unit.name : "");
    setUnitModal({ open: true, mode, unit });
  };

  const toggleUnitAccordion = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIconColor = (type) => {
    const map = {
      pdf: "text-red-500 bg-red-50 dark:bg-red-950/20",
      ppt: "text-orange-500 bg-orange-50 dark:bg-orange-950/20",
      pptx: "text-orange-500 bg-orange-50 dark:bg-orange-950/20",
      doc: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
      docx: "text-blue-500 bg-blue-50 dark:bg-blue-950/20"
    };
    return map[type?.toLowerCase()] || "text-gray-500 bg-gray-50 dark:bg-gray-850/20";
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Subject Detail View ─────────────────────────────────────────────── */}
      {selectedSubject ? (
        <div className="space-y-5 animate-fade-in">
          {/* Breadcrumbs and actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              onClick={() => setSelectedSubject(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-450 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group self-start"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Subjects
            </button>
            {user.role !== "STUDENT" && (
              <button
                onClick={() => openUnitModal("create")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white text-xs font-semibold shadow-sm hover:shadow-primary-glow transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Unit
              </button>
            )}
          </div>

          {/* Subject header card */}
          <div className="p-5 bg-white dark:bg-gray-800/80 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight" style={{ fontSize: "clamp(1rem, 4vw, 1.25rem)" }}>
                  {selectedSubject.name}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedSubject.academic_year}
                  </span>
                  {selectedSubject.semester && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 text-[10px] font-bold border border-violet-100 dark:border-violet-800/30">
                      Semester {selectedSubject.semester}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500">
                    <User className="w-3.5 h-3.5" />
                    {selectedSubject.created_by.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Units list */}
          {isLoadingUnits ? (
            <Spinner />
          ) : !unitsData || unitsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800/60 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-gray-700/40 flex items-center justify-center mb-4 text-gray-400">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">No units yet</h3>
              <p className="text-xs text-gray-400 max-w-xs">
                Create units to organize notes by topics or chapters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unitsData.map(unit => {
                const isExpanded = expandedUnits[unit.id] ?? true;
                return (
                  <div key={unit.id} className="bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                    {/* Unit header */}
                    <div
                      onClick={() => toggleUnitAccordion(unit.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-gray-700/40 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{unit.name}</h4>
                        <span className="px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-[10px] font-bold text-gray-400 shrink-0">
                          {unit.files.length} file{unit.files.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {canModify(user, className, unit.created_by.id) && (
                          <>
                            <button onClick={() => openUnitModal("edit", unit)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-955 transition-all" title="Edit Unit">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteUnitTarget(unit)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955 transition-all" title="Delete Unit">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {user.role !== "STUDENT" && (
                          <button onClick={() => setUploadModal({ open: true, unit })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all" title="Upload Files">
                            <UploadCloud className="w-3.5 h-3.5" />
                            Upload
                          </button>
                        )}
                        <div className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Unit content */}
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-gray-50 dark:border-gray-700/40 bg-slate-50/20 dark:bg-gray-800/30">
                        {unit.files.length === 0 ? (
                          <div className="py-5 text-center text-xs text-gray-400 font-medium italic">
                            No files uploaded to this unit yet.
                          </div>
                        ) : (
                          <div className="grid gap-2 mt-3">
                            {unit.files.map(file => (
                              <div key={file.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs uppercase ${getFileIconColor(file.file_type)}`}>
                                    {file.file_type}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate pr-4">{file.file_name}</p>
                                    <p className="text-[10px] text-gray-450 dark:text-gray-500 font-semibold mt-0.5">
                                      {formatFileSize(file.file_size)} · {file.uploaded_by.name}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button onClick={() => setPreviewModal({ open: true, unit, initialFileId: file.id })} className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-gray-750 border border-gray-100 dark:border-gray-700/60 shadow-sm transition-all" title="Preview">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={e => handleDownload(e, file.file_url, file.file_name)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-slate-50 dark:hover:bg-gray-750 border border-gray-100 dark:border-gray-700/60 shadow-sm transition-all" title="Download">
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  {canModify(user, className, file.uploaded_by.id) && (
                                    <button onClick={() => setDeleteFileTarget({ file, unitId: unit.id })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955 border border-gray-150 dark:border-gray-750 transition-all" title="Delete">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Subject List View ────────────────────────────────────────────── */
        <div className="space-y-5 animate-fade-in">

          {/* ── Toolbar row ─────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-800/80 p-4 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-card space-y-4">
            {/* Top row: title + action buttons */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {showArchived ? "Archived Subjects" : "Notes & Docs"}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-gray-700 text-[10px] font-bold text-gray-400">
                  {filteredSubjects.length}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setLogsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-750 transition-all"
                >
                  <History className="w-3.5 h-3.5" />
                  Logs
                </button>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${showArchived ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-750"}`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {showArchived ? "Active" : "Archives"}
                </button>
                {user.role !== "STUDENT" && !showArchived && (
                  <button
                    onClick={() => openSubjectModal("create")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm hover:shadow-primary-glow transition-all"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Subject
                  </button>
                )}
              </div>
            </div>

            {/* Year selector + Semester tab pills — only in active mode */}
            {!showArchived && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Academic year dropdown */}
                <div className="shrink-0">
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="
                      text-xs font-bold px-3 py-2 rounded-xl
                      bg-slate-50 dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700
                      text-gray-700 dark:text-gray-200
                      focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
                      transition-all cursor-pointer
                    "
                    aria-label="Academic Year"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Semester tab pills */}
                <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800 p-1 rounded-2xl">
                  {SEMESTERS.map(sem => {
                    const count = semesterCounts[String(sem.value)] || 0;
                    const isActive = activeSemester === sem.value;
                    return (
                      <button
                        key={String(sem.value)}
                        onClick={() => setActiveSemester(sem.value)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200
                          ${isActive
                            ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          }
                        `}
                        aria-label={`Filter by ${sem.label}`}
                      >
                        {sem.label}
                        {count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${isActive ? "bg-primary/10 text-primary" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Subject Grid ─────────────────────────────────────────────────── */}
          {isLoadingSubjects ? (
            <Spinner />
          ) : filteredSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-800/60 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-card">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-gray-700 flex items-center justify-center mb-4 text-gray-400">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">
                {showArchived ? "No archived subjects" : `No subjects in Semester ${activeSemester ?? "Unsorted"} for ${selectedYear}`}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-4">
                {showArchived
                  ? "Archive old subjects to keep this section clean."
                  : user.role !== "STUDENT"
                    ? "Use the AI Assistant or create a subject manually."
                    : "Your faculty hasn't uploaded any notes here yet."}
              </p>
              {user.role !== "STUDENT" && !showArchived && (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => openSubjectModal("create")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all border border-primary/20"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Create Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSubjects.map(subject => (
                <div
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className="group relative flex flex-col justify-between p-5 bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-card hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 transition-all duration-300 cursor-pointer"
                >
                  <div className="space-y-3 min-w-0">
                    {/* Top row: year badge + actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
                          {subject.academic_year}
                        </span>
                        {subject.semester && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800/30">
                            S{subject.semester}
                          </span>
                        )}
                      </div>
                      {canModify(user, className, subject.created_by.id) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openSubjectModal("edit", subject)} className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-955 transition-all" title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!subject.is_archived ? (
                            <button onClick={() => setArchiveTarget(subject)} className="p-1 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-955 transition-all" title="Archive">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => unarchiveSubjectMutation.mutate(subject.id)} className="p-1 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-955 transition-all" title="Unarchive">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => setDeleteSubjectTarget(subject)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955 transition-all" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Subject name */}
                    <h4 className="text-sm font-extrabold text-gray-800 dark:text-gray-100 group-hover:text-primary leading-tight truncate pr-2 transition-colors">
                      {subject.name}
                    </h4>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700/60 pt-3 mt-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <span>{subject.unit_count} unit{subject.unit_count !== 1 ? "s" : ""}</span>
                    <span>{subject.file_count} file{subject.file_count !== 1 ? "s" : ""}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AI Assist Panel (floating) — only for HOD/FACULTY ────────────────── */}
      {user.role !== "STUDENT" && (
        <AIAssistPanel
          className={className}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["subjects", className] });
          }}
        />
      )}

      {/* ── Subject Form Modal ──────────────────────────────────────────────── */}
      <Modal
        open={subjectModal.open}
        onClose={() => setSubjectModal({ open: false, mode: "create", subject: null })}
        title={subjectModal.mode === "create" ? "Create Subject" : "Edit Subject"}
      >
        <form onSubmit={handleSubjectSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Machine Learning"
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</label>
              <select
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</label>
              <select
                value={subjectSemester}
                onChange={e => setSubjectSemester(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setSubjectModal({ open: false, mode: "create", subject: null })} className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-705 text-gray-605 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-750 rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={createSubjectMutation.isPending || editSubjectMutation.isPending} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md">
              {createSubjectMutation.isPending || editSubjectMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Unit Form Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={unitModal.open}
        onClose={() => setUnitModal({ open: false, mode: "create", unit: null })}
        title={unitModal.mode === "create" ? "Create Unit" : "Edit Unit"}
      >
        <form onSubmit={handleUnitSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Unit 1: Introduction"
              value={unitName}
              onChange={e => setUnitName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setUnitModal({ open: false, mode: "create", unit: null })} className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-705 text-gray-605 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-750 rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={createUnitMutation.isPending || editUnitMutation.isPending} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md">
              {createUnitMutation.isPending || editUnitMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── File Upload Modal ───────────────────────────────────────────────── */}
      <Modal
        open={uploadModal.open}
        onClose={() => { setUploadModal({ open: false, unit: null }); setSelectedFiles([]); setUploadError(""); }}
        title={`Upload Documents — ${uploadModal.unit?.name}`}
      >
        <form onSubmit={handleFileUploadSubmit} className="space-y-4 pt-1">
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 rounded-2xl cursor-pointer bg-slate-50/50 dark:bg-gray-800/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all relative">
              <input
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx"
                onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-10 h-10 text-primary mb-3" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Drag & Drop or Click to browse</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">PDF, PPT, PPTX, DOC, DOCX up to 10MB each</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold text-gray-450 dark:text-gray-500 uppercase tracking-widest">Selected ({selectedFiles.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 rounded-xl text-xs">
                      <span className="font-bold text-gray-700 dark:text-gray-200 truncate pr-4">{file.name}</span>
                      <button type="button" onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 text-xs font-medium flex items-start gap-2 border border-red-100 dark:border-red-955">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setUploadModal({ open: false, unit: null }); setSelectedFiles([]); setUploadError(""); }} className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-705 text-gray-650 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-750 rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={selectedFiles.length === 0 || uploadFilesMutation.isPending} className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-all shadow-md">
              {uploadFilesMutation.isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Activity Logs Modal ─────────────────────────────────────────────── */}
      <Modal open={logsModal} onClose={() => { setLogsModal(false); setLogsPage(1); }} title="Notes & Docs Activity Logs" size="lg">
        <div className="space-y-4 pt-1">
          {isLoadingLogs ? (
            <Spinner />
          ) : !logsData || logsData.logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-semibold italic">No activity logs yet.</div>
          ) : (
            <div className="space-y-3">
              <div className="border border-gray-100 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">By</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {logsData.logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-750 transition-colors">
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-bold ${log.action.startsWith("ai_") ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300" : "bg-primary/10 text-primary"}`}>
                            {log.action.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{log.target_name}</td>
                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{log.performed_by.name}</td>
                        <td className="p-3 text-gray-450 dark:text-gray-500 font-semibold whitespace-nowrap">{parseUTCDate(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logsData.pages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700 pt-3 text-xs font-semibold text-gray-550">
                  <span>Page {logsPage} of {logsData.pages}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setLogsPage(p => Math.max(p - 1, 1))} disabled={logsPage === 1} className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-750 disabled:opacity-50">Prev</button>
                    <button onClick={() => setLogsPage(p => Math.min(p + 1, logsData.pages))} disabled={logsPage === logsData.pages} className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-750 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Confirm Dialogs ─────────────────────────────────────────────────── */}
      <ConfirmDialog open={!!deleteSubjectTarget} onClose={() => setDeleteSubjectTarget(null)} onConfirm={() => deleteSubjectMutation.mutate(deleteSubjectTarget.id)} title="Delete Subject" message={deleteSubjectTarget ? `Delete "${deleteSubjectTarget.name}"? This deletes all associated units and files permanently.` : ""} confirmText={deleteSubjectMutation.isPending ? "Deleting…" : "Delete"} danger />
      <ConfirmDialog open={!!deleteUnitTarget} onClose={() => setDeleteUnitTarget(null)} onConfirm={() => deleteUnitMutation.mutate(deleteUnitTarget.id)} title="Delete Unit" message={deleteUnitTarget ? `Delete "${deleteUnitTarget.name}"? This deletes all associated files permanently.` : ""} confirmText={deleteUnitMutation.isPending ? "Deleting…" : "Delete"} danger />
      <ConfirmDialog open={!!deleteFileTarget} onClose={() => setDeleteFileTarget(null)} onConfirm={() => deleteFileMutation.mutate({ unitId: deleteFileTarget.unitId, fileId: deleteFileTarget.file.id })} title="Delete File" message={deleteFileTarget ? `Delete "${deleteFileTarget.file.file_name}" permanently?` : ""} confirmText={deleteFileMutation.isPending ? "Deleting…" : "Delete"} danger />
      <ConfirmDialog open={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={() => archiveSubjectMutation.mutate(archiveTarget.id)} title="Archive Subject" message={archiveTarget ? `Move "${archiveTarget.name}" to archives? It can be restored later.` : ""} confirmText={archiveSubjectMutation.isPending ? "Archiving…" : "Archive"} />

      <PreviewModal
        open={previewModal.open}
        onClose={() => setPreviewModal({ open: false, unit: null, initialFileId: null })}
        unit={previewModal.unit}
        initialFileId={previewModal.initialFileId}
        handleDownload={handleDownload}
      />
    </div>
  );
}

// ─── Preview Components (unchanged) ──────────────────────────────────────────

function PdfPreviewer({ fileUrl, fileName }) {
  const [pdfBlob, setPdfBlob] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPdf() {
      try {
        setLoading(true);
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
        const blob = await response.blob();
        if (active) { setPdfBlob(blob); setError(null); setUseFallback(false); }
      } catch (err) {
        if (active) { setError(err.message); setUseFallback(true); }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPdf();
    return () => { active = false; };
  }, [fileUrl]);

  if (useFallback) return <DocxPptPreviewer fileUrl={fileUrl} fileName={fileName} fileType="pdf" />;
  if (loading && !pdfBlob) return (
    <div className="flex flex-col items-center bg-slate-50 dark:bg-gray-900/40 p-4 rounded-2xl w-full max-h-[600px] border border-gray-100 dark:border-gray-800/80">
      <div className="py-8 text-xs font-bold text-gray-400 animate-pulse">Loading document pages...</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center bg-slate-50 dark:bg-gray-900/40 p-4 rounded-2xl w-full max-h-[600px] overflow-y-auto border border-gray-100 dark:border-gray-800/80">
      {pdfBlob && (
        <Document
          file={pdfBlob}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={err => { setError(err.message); setUseFallback(true); }}
          loading={<div className="py-8 text-xs font-bold text-gray-400 animate-pulse">Initializing renderer...</div>}
          error={<div className="py-8 text-xs font-bold text-red-500">Failed to render PDF</div>}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              width={Math.min(window.innerWidth * 0.7, 680)}
              className="shadow-md rounded-xl overflow-hidden mb-4 bg-white"
            />
          ))}
        </Document>
      )}
    </div>
  );
}

function DocxPptPreviewer({ fileUrl, fileName, fileType }) {
  const [viewerType, setViewerType] = useState("microsoft");
  const microsoftUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  const googleUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] font-extrabold text-gray-450 dark:text-gray-500 uppercase tracking-wider">
          Viewer: {viewerType === "microsoft" ? "Office Online" : "Google Docs"}
        </span>
        <button type="button" onClick={() => setViewerType(p => p === "microsoft" ? "google" : "microsoft")} className="text-[10px] font-bold text-indigo-600 hover:underline">
          Switch to {viewerType === "microsoft" ? "Google" : "Office"} Viewer
        </button>
      </div>
      <div className="w-full h-[600px] border border-gray-150 dark:border-gray-700/60 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-gray-900/40 shadow-inner">
        <iframe src={viewerType === "microsoft" ? microsoftUrl : googleUrl} width="100%" height="100%" frameBorder="0" title={`${fileName} Preview`} className="w-full h-full" />
      </div>
    </div>
  );
}

function PreviewModal({ open, onClose, unit, initialFileId, handleDownload }) {
  const fileRefs = useRef({});

  useEffect(() => {
    if (open && initialFileId && fileRefs.current[initialFileId]) {
      const timer = setTimeout(() => {
        fileRefs.current[initialFileId]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open, initialFileId]);

  if (!open || !unit) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Unit Preview — ${unit.name}`} size="xl">
      <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-2 divide-y divide-gray-150 dark:divide-gray-800">
        {unit.files.map(file => {
          const isPdf = file.file_type.toLowerCase() === "pdf";
          return (
            <div key={file.id} ref={el => fileRefs.current[file.id] = el} className="pt-6 first:pt-0 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-705">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs uppercase text-red-500 bg-red-50 dark:bg-red-955">
                    {file.file_type}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-gray-805 dark:text-gray-200 truncate pr-4">{file.file_name}</h5>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">Uploaded by {file.uploaded_by.name}</p>
                  </div>
                </div>
                <button type="button" onClick={e => handleDownload(e, file.file_url, file.file_name)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-750 text-[10px] font-bold text-gray-600 dark:text-gray-300 transition-all shadow-sm">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
              <div className="w-full flex justify-center pb-4">
                {isPdf ? <PdfPreviewer fileUrl={file.file_url} fileName={file.file_name} /> : <DocxPptPreviewer fileUrl={file.file_url} fileName={file.file_name} fileType={file.file_type} />}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
