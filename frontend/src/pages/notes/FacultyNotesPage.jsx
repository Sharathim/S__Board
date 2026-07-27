import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked, ChevronDown, ChevronRight, Plus, Upload, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  Archive, ArchiveRestore, FolderOpen, BookOpen, Layers,
  RefreshCw, Download, AlertCircle, Sparkles, UploadCloud, BookPlus,
  Eye, FileCheck, ExternalLink, ShieldAlert
} from "lucide-react";
import {
  getNotesHub, getSubjectNames, uploadNotesBatch,
  deleteFile, deleteSubject, deleteUnit
} from "../../api/notes";
import { useAuth } from "../../context/AuthContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

function getFileIcon(type) {
  const t = (type || "").toLowerCase();
  if (t === "pdf") return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
  if (["ppt", "pptx"].includes(t)) return <Presentation className="w-5 h-5 text-amber-500 shrink-0" />;
  return <File className="w-5 h-5 text-blue-500 shrink-0" />;
}

// ─── Toast System ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now().toString(36);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            t.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-800/60 backdrop-blur-md"
              : "bg-rose-950/90 text-rose-200 border-rose-800/60 backdrop-blur-md"
          }`}
        >
          {t.type === "success" ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function DocumentPreviewModal({ file, onClose }) {
  if (!file) return null;
  const isPdf = file.file_type?.toLowerCase() === "pdf";
  const previewUrl = isPdf
    ? file.file_url
    : `https://docs.google.com/viewer?url=${encodeURIComponent(file.file_url)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3 overflow-hidden">
            {getFileIcon(file.file_type)}
            <span className="font-semibold text-slate-100 truncate text-base">{file.file_name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={file.file_url}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer iframe */}
        <div className="flex-1 bg-slate-950 relative">
          <iframe
            src={previewUrl}
            title={file.file_name}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Upload Notes Modal (Floating + Triggered) ────────────────────────────────
function UploadNotesModal({ isOpen, onClose, availableClasses, onUploadSuccess, addToast }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(""); // subject name or "__NEW__"
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("Unit 1");
  const [files, setFiles] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef(null);

  // Auto-select initial class
  useEffect(() => {
    if (availableClasses && availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  // Fetch existing subjects whenever class changes
  useEffect(() => {
    if (!selectedClass) return;
    setLoadingSubjects(true);
    getSubjectNames(selectedClass)
      .then(res => {
        const subList = res.data.subjects || [];
        setExistingSubjects(subList);
        if (subList.length > 0) {
          setSelectedSubject(subList[0].name);
        } else {
          setSelectedSubject("__NEW__");
        }
      })
      .catch(() => setExistingSubjects([]))
      .finally(() => setLoadingSubjects(false));
  }, [selectedClass]);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["pdf", "ppt", "pptx", "doc", "docx"].includes(ext);
    });
    if (valid.length < selected.length) {
      addToast("Some unsupported files were skipped. Allowed: PDF, PPT, PPTX, DOC, DOCX", "warning");
    }
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass) {
      addToast("Please select a class", "error");
      return;
    }
    const finalSubjectName = selectedSubject === "__NEW__" ? customSubjectName.trim() : selectedSubject;
    if (!finalSubjectName) {
      addToast("Please enter or select a Subject Name", "error");
      return;
    }
    if (!selectedUnit) {
      addToast("Please select a Unit", "error");
      return;
    }
    if (files.length === 0) {
      addToast("Please select at least one file to upload", "error");
      return;
    }

    const formData = new FormData();
    formData.append("class_name", selectedClass);
    formData.append("subject_name", finalSubjectName);
    formData.append("unit_name", selectedUnit);
    files.forEach(f => formData.append("files", f));

    setUploading(true);
    setUploadPct(0);
    try {
      const res = await uploadNotesBatch(formData, evt => {
        if (evt.total) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
      });
      addToast(res.data.message || "Notes uploaded successfully!");
      setFiles([]);
      setCustomSubjectName("");
      onUploadSuccess();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to upload notes.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Upload Notes & Docs</h2>
              <p className="text-xs text-slate-400">Share study materials with students</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Class Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Class <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* 2. Subject Name Dropdown / New Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Subject Name <span className="text-rose-400">*</span>
            </label>
            {loadingSubjects ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading existing subjects...
              </div>
            ) : (
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {existingSubjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                <option value="__NEW__">➕ Create New Subject...</option>
              </select>
            )}

            {selectedSubject === "__NEW__" && (
              <input
                type="text"
                value={customSubjectName}
                onChange={e => setCustomSubjectName(e.target.value)}
                placeholder="Enter new Subject Name (e.g. Operating Systems)"
                className="mt-2.5 w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            )}
          </div>

          {/* 3. Unit Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Unit <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="Unit 1">Unit 1</option>
              <option value="Unit 2">Unit 2</option>
              <option value="Unit 3">Unit 3</option>
              <option value="Unit 4">Unit 4</option>
              <option value="Unit 5">Unit 5</option>
            </select>
          </div>

          {/* 4. Multi-File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Files (PDF, PPT, DOC) <span className="text-rose-400">*</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 bg-slate-950/60 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition group"
            >
              <Upload className="w-7 h-7 text-slate-500 group-hover:text-indigo-400 mb-1 transition" />
              <p className="text-xs font-medium text-slate-300">Click to browse or drag & drop multiple files</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Supports PDF, PPT, PPTX, DOC, DOCX</p>
            </div>

            {/* Selected File List */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getFileIcon(f.name.split(".").pop())}
                      <span className="text-slate-200 truncate">{f.name}</span>
                      <span className="text-slate-500 text-[10px]">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-indigo-400 font-medium">
                <span>Uploading study materials...</span>
                <span>{uploadPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? "Uploading..." : "Upload Notes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Notes Page Component ────────────────────────────────────────────────
export default function FacultyNotesPage() {
  const { user } = useAuth();
  const { toasts, add: addToast } = useToast();

  const [activeClassFilter, setActiveClassFilter] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const canManage = user?.role === "FACULTY" || user?.role === "HOD";

  // Fetch hub data
  const { data: hubData, isLoading, isError, refetch } = useQuery({
    queryKey: ["notesHub", activeClassFilter, selectedSemester],
    queryQueryFn: () => getNotesHub({
      class_name: activeClassFilter || undefined,
      semester: selectedSemester ? Number(selectedSemester) : undefined
    }),
    refetchOnWindowFocus: false
  });

  const classes = hubData?.data?.classes || [];
  const availableClasses = hubData?.data?.available_classes || [];

  // Handlers for deleting subject, unit, file
  const handleDeleteSubject = async (className, subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete subject "${subjectName}" and all its units/files?`)) return;
    setDeletingId(`subj-${subjectId}`);
    try {
      await deleteSubject(className, subjectId);
      addToast(`Subject "${subjectName}" deleted successfully`);
      refetch();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete subject", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteUnit = async (className, subjectId, unitId, unitName) => {
    if (!window.confirm(`Are you sure you want to delete "${unitName}" and its files?`)) return;
    setDeletingId(`unit-${unitId}`);
    try {
      await deleteUnit(className, subjectId, unitId);
      addToast(`"${unitName}" deleted successfully`);
      refetch();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete unit", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteFile = async (className, subjectId, unitId, fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete file "${fileName}"?`)) return;
    setDeletingId(`file-${fileId}`);
    try {
      await deleteFile(className, subjectId, unitId, fileId);
      addToast(`File "${fileName}" deleted successfully`);
      refetch();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete file", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 relative pb-28">
      <ToastStack toasts={toasts} />
      <DocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Upload Modal */}
      {canManage && (
        <UploadNotesModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          availableClasses={availableClasses}
          onUploadSuccess={() => refetch()}
          addToast={addToast}
        />
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookMarked className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Notes & Docs</h1>
          </div>
          <p className="text-sm text-slate-400">
            {user?.role === "STUDENT"
              ? "Access and download study notes uploaded for your class."
              : user?.role === "HOD"
              ? "Department repository: View and manage notes across all classes."
              : "Upload and manage course notes and documentation for your classes."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {canManage && availableClasses.length > 0 && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Notes</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap items-center gap-4 bg-slate-900/60 border border-slate-800/60 p-4 rounded-2xl backdrop-blur-sm">
        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class:</span>
          <select
            value={activeClassFilter}
            onChange={e => setActiveClassFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Available Classes</option>
            {availableClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Semester Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Semester:</span>
          <select
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium">Loading Notes & Docs repository...</p>
          </div>
        ) : isError ? (
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-800/50 text-center text-rose-300">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-rose-400" />
            <p className="font-semibold">Unable to load Notes & Docs.</p>
            <p className="text-xs text-rose-400/80 mt-1">Please refresh or try again later.</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-400 max-w-lg mx-auto my-12">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-200">No Notes Uploaded Yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              {user?.role === "STUDENT"
                ? "No study notes have been uploaded for your class yet."
                : "Get started by uploading notes and documents for your subjects."}
            </p>
            {canManage && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Note</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {classes.map(clsData => (
              <div key={clsData.class_name} className="space-y-6">
                {/* Class Section Header */}
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <div className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    Class {clsData.class_name}
                  </div>
                  {clsData.is_incharge && (
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      Class Incharge
                    </span>
                  )}
                </div>

                {/* Academic Years & Subjects */}
                {clsData.academic_years.map(yrData => (
                  <div key={yrData.year} className="space-y-6">
                    {yrData.semesters.map(semData => (
                      <div key={semData.semester} className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Academic Year {yrData.year} — Semester {semData.semester}</span>
                        </div>

                        {/* Subjects Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {semData.subjects.map(subject => (
                            <div
                              key={subject.id}
                              className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition flex flex-col justify-between"
                            >
                              {/* Subject Header */}
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/20">
                                      <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-base text-slate-100">{subject.name}</h3>
                                      <p className="text-[11px] text-slate-400">
                                        {subject.unit_count} Units • {subject.file_count} Files
                                      </p>
                                    </div>
                                  </div>

                                  {canManage && (
                                    <button
                                      onClick={() => handleDeleteSubject(clsData.class_name, subject.id, subject.name)}
                                      disabled={deletingId === `subj-${subject.id}`}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                      title="Delete Subject"
                                    >
                                      {deletingId === `subj-${subject.id}` ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>

                                {/* Units list */}
                                <div className="space-y-3 mt-4">
                                  {(!subject.units || subject.units.length === 0) ? (
                                    <p className="text-xs text-slate-500 italic py-2">No units created yet.</p>
                                  ) : (
                                    subject.units.map(unit => (
                                      <div key={unit.id} className="bg-slate-950/70 border border-slate-800/60 rounded-xl p-3.5 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-indigo-300 tracking-wide">{unit.name}</span>
                                          {canManage && (
                                            <button
                                              onClick={() => handleDeleteUnit(clsData.class_name, subject.id, unit.id, unit.name)}
                                              disabled={deletingId === `unit-${unit.id}`}
                                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                                              title="Delete Unit"
                                            >
                                              {deletingId === `unit-${unit.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                            </button>
                                          )}
                                        </div>

                                        {/* Files inside unit */}
                                        {(!unit.files || unit.files.length === 0) ? (
                                          <p className="text-[11px] text-slate-600 italic">No files in this unit.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {unit.files.map(file => (
                                              <div
                                                key={file.id}
                                                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition text-xs group"
                                              >
                                                <div
                                                  onClick={() => setPreviewFile(file)}
                                                  className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1 mr-2"
                                                >
                                                  {getFileIcon(file.file_type)}
                                                  <span className="text-slate-200 group-hover:text-indigo-300 truncate font-medium transition">
                                                    {file.file_name}
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                  {/* Preview Button */}
                                                  <button
                                                    onClick={() => setPreviewFile(file)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                                                    title="Preview document"
                                                  >
                                                    <Eye className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* Download Button */}
                                                  <a
                                                    href={file.file_url}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                                                    title="Download file"
                                                  >
                                                    <Download className="w-3.5 h-3.5" />
                                                  </a>

                                                  {/* Delete File Button */}
                                                  {canManage && (
                                                    <button
                                                      onClick={() => handleDeleteFile(clsData.class_name, subject.id, unit.id, file.id, file.file_name)}
                                                      disabled={deletingId === `file-${file.id}`}
                                                      className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                                                      title="Delete file"
                                                    >
                                                      {deletingId === `file-${file.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (+) at Bottom Right for Faculty / HOD */}
      {canManage && availableClasses.length > 0 && (
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all duration-200"
          title="Upload New Notes & Docs"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Upload Notes</span>
        </button>
      )}
    </div>
  );
}
