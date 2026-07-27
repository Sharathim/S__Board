import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import {
  BookMarked, ChevronDown, ChevronRight, Plus, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  FolderOpen, Download, AlertCircle, UploadCloud, Eye, Search,
  Filter, Layers, User
} from "lucide-react";
import {
  getAllNotes, createSubject, createUnit, uploadFiles,
  deleteFile, deleteSubject, deleteUnit
} from "../../../api/notes";
import { useAuth } from "../../../context/AuthContext";
import MobileFAB from "../../components/MobileFAB";
import BottomSheet from "../../layout/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { EmptyState } from "../../../components/ui/EmptyState";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const UNIT_OPTIONS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];

function getFileTypeDetails(type) {
  const ext = (type || "").toLowerCase();
  if (ext === "pdf") {
    return {
      label: "PDF",
      icon: FileText,
      badgeBg: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
    };
  }
  if (["ppt", "pptx"].includes(ext)) {
    return {
      label: ext.toUpperCase(),
      icon: Presentation,
      badgeBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
    };
  }
  return {
    label: ext.toUpperCase() || "DOC",
    icon: File,
    badgeBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  };
}

function getPreviewUrl(file) {
  if (!file) return "";
  const url = file.file_url;
  const ext = file.file_type?.toLowerCase();
  if (ext === "pdf") return url;
  if (["doc", "docx", "ppt", "pptx"].includes(ext)) {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  }
  return url;
}

// ─── Toast Hook ──────────────────────────────────────────────────────────────
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
    <div
      className="fixed left-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ bottom: "calc(65px + env(safe-area-inset-bottom, 0px))" }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold pointer-events-auto ${
            t.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {t.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Upload Bottom Sheet ─────────────────────────────────────────────────────
function UploadSheet({ open, onClose, targetClasses, existingSubjects, onSuccess, toast }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [subjectMode, setSubjectMode] = useState("existing");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    setSelectedSubjectId("");
    setNewSubjectName("");
    setSubjectMode("existing");
    setSelectedUnit("");
  }, [selectedClass]);

  const classSubjects = existingSubjects.filter(s => s.class_name === selectedClass);

  useEffect(() => {
    if (selectedClass && classSubjects.length === 0) {
      setSubjectMode("new");
    }
  }, [selectedClass, classSubjects.length]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (!selectedClass || !selectedUnit) {
      toast.add("Please select class and unit", "error");
      return;
    }
    if (subjectMode === "existing" && !selectedSubjectId) {
      toast.add("Please select a subject", "error");
      return;
    }
    if (subjectMode === "new" && !newSubjectName.trim()) {
      toast.add("Please enter a subject name", "error");
      return;
    }
    if (files.length === 0) {
      toast.add("Please select at least one file", "error");
      return;
    }

    setUploading(true);
    try {
      let subjectId = selectedSubjectId;

      if (subjectMode === "new") {
        const res = await createSubject(selectedClass, {
          name: newSubjectName.trim(),
          academic_year: CURRENT_ACADEMIC_YEAR,
          semester: 1
        });
        subjectId = res.data.subject.id;
      }

      let unitId;
      try {
        const unitRes = await createUnit(selectedClass, subjectId, { name: selectedUnit });
        unitId = unitRes.data.unit.id;
      } catch (err) {
        if (err.response?.data?.error?.includes("already exists")) {
          const { listUnits } = await import("../../../api/notes");
          const unitsRes = await listUnits(selectedClass, subjectId);
          const existing = unitsRes.data.units.find(u => u.name === selectedUnit);
          if (existing) {
            unitId = existing.id;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      await uploadFiles(selectedClass, subjectId, unitId, formData, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });

      toast.add(`${files.length} file(s) uploaded!`);
      setFiles([]);
      setProgress(0);
      setSelectedUnit("");
      onSuccess();
      onClose();
    } catch (err) {
      toast.add(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Upload Notes & Docs">
      <div className="space-y-4 pb-4">
        {/* Class Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
            Class
          </label>
          <select
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B]"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">Select class...</option>
            {targetClasses.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select>
        </div>

        {/* Subject Selection */}
        {selectedClass && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Subject
            </label>
            {classSubjects.length > 0 && (
              <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-2">
                <button
                  type="button"
                  onClick={() => setSubjectMode("existing")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    subjectMode === "existing"
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => setSubjectMode("new")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    subjectMode === "new"
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Create New
                </button>
              </div>
            )}
            {subjectMode === "existing" ? (
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B]"
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
              >
                <option value="">Select subject...</option>
                {classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <input
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B]"
                placeholder="Enter new subject name..."
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Unit Selection */}
        {selectedClass && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Unit
            </label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B]"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
            >
              <option value="">Select unit...</option>
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}

        {/* File Picker */}
        {selectedClass && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Files
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-[#F05A2B] bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              <UploadCloud className="w-5 h-5 text-gray-400" />
              <span>Choose PDF, PPT, DOC files</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            {files.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
                    <span className="truncate max-w-[220px]">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {uploading && progress > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div className="bg-[#F05A2B] h-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Submit */}
        <div className="pt-2 flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={uploading} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpload} loading={uploading} disabled={uploading} className="flex-1">
            Upload Notes
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Mobile Subject Card ─────────────────────────────────────────────────────
function MobileSubjectCard({ subject, className, canDeleteItem, onDeleteSubject, onDeleteUnit, onDeleteFile, onPreviewFile }) {
  const [activeUnitName, setActiveUnitName] = useState("all");
  const units = subject.units || [];

  const activeFiles = useMemo(() => {
    if (activeUnitName === "all") {
      return units.flatMap(u => u.files.map(f => ({ ...f, unit_name: u.name, unit_id: u.id })));
    }
    const matchingUnit = units.find(u => u.name === activeUnitName);
    if (!matchingUnit) return [];
    return matchingUnit.files.map(f => ({ ...f, unit_name: matchingUnit.name, unit_id: matchingUnit.id }));
  }, [units, activeUnitName]);

  const activeUnitObj = units.find(u => u.name === activeUnitName);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-xl p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <BookMarked className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#F05A2B] to-orange-600 rounded">
                {className.replace("_", " ")}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {units.length} units
              </span>
            </div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-sm truncate mt-0.5">
              {subject.name}
            </h3>
          </div>
        </div>

        {canDeleteItem(subject) && (
          <button
            onClick={() => onDeleteSubject({ type: "subject", id: subject.id, className, name: subject.name })}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Unit Tab Selector */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none border-b border-gray-100 dark:border-gray-700/50 pb-2">
        <button
          onClick={() => setActiveUnitName("all")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
            activeUnitName === "all"
              ? "bg-[#F05A2B] text-white shadow-sm"
              : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300"
          }`}
        >
          All
        </button>
        {UNIT_OPTIONS.map(unitName => {
          const hasUnit = units.some(u => u.name === unitName);
          return (
            <button
              key={unitName}
              onClick={() => setActiveUnitName(unitName)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeUnitName === unitName
                  ? "bg-[#F05A2B] text-white shadow-sm"
                  : hasUnit
                  ? "bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200"
                  : "bg-gray-50 dark:bg-gray-900/40 text-gray-300 dark:text-gray-600"
              }`}
            >
              {unitName.replace("Unit ", "U")}
              {hasUnit && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Files */}
      <div className="space-y-1.5">
        {activeFiles.length === 0 ? (
          <div className="py-4 text-center text-gray-400 dark:text-gray-500 text-xs italic">
            No notes for {activeUnitName === "all" ? "this subject" : activeUnitName}
          </div>
        ) : (
          activeFiles.map(file => {
            const details = getFileTypeDetails(file.file_type);
            const IconComp = details.icon;
            return (
              <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-md border ${details.badgeBg} shrink-0`}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">{file.file_name}</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">
                      {file.uploaded_by?.name || "Faculty"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onPreviewFile(file)}
                    className="p-1 text-gray-500 hover:text-[#F05A2B] dark:text-gray-400"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={file.file_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-gray-500 hover:text-[#F05A2B] dark:text-gray-400"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {canDeleteItem(file) && (
                    <button
                      onClick={() => onDeleteFile({
                        type: "file", id: file.id,
                        className, subjectId: subject.id, unitId: file.unit_id, name: file.file_name
                      })}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>By {subject.created_by?.name || "Faculty"}</span>
        {activeUnitObj && canDeleteItem(activeUnitObj) && activeUnitName !== "all" && (
          <button
            onClick={() => onDeleteUnit({
              type: "unit", id: activeUnitObj.id,
              className, subjectId: subject.id, name: activeUnitObj.name
            })}
            className="text-red-500 font-semibold"
          >
            Delete {activeUnitName}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MobileFacultyNotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const isStaff = user?.role === "FACULTY" || user?.role === "HOD";

  const { data, isLoading, error } = useQuery({
    queryKey: ["notes-all"],
    queryFn: () => getAllNotes().then(r => r.data),
    staleTime: 30000,
  });

  const classes = data?.classes || [];
  const targetClasses = data?.target_classes || [];
  const allSubjects = useMemo(() => classes.flatMap(c => c.subjects.map(s => ({ ...s, class_name: c.class_name }))), [classes]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { type, id, className, subjectId, unitId } = confirmDelete;
      if (type === "subject") await deleteSubject(className, id);
      else if (type === "unit") await deleteUnit(className, subjectId, id);
      else if (type === "file") await deleteFile(className, subjectId, unitId, id);
      toast.add(`Deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ["notes-all"] });
    } catch (err) {
      toast.add(err.response?.data?.error || "Delete failed", "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const canDeleteItem = (item) => {
    if (user?.role === "HOD") return true;
    if (user?.role === "FACULTY") return item.created_by?.id === user.id || item.uploaded_by?.id === user.id;
    return false;
  };

  const filteredClasses = useMemo(() => {
    let list = classes;
    if (selectedClassFilter !== "ALL") {
      list = list.filter(c => c.class_name === selectedClassFilter);
    }
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.map(c => ({
      ...c,
      subjects: c.subjects.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.units.some(u => u.name.toLowerCase().includes(q)) ||
        s.units.some(u => u.files.some(f => f.file_name.toLowerCase().includes(q)))
      )
    })).filter(c => c.subjects.length > 0);
  }, [classes, selectedClassFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-20">
      <ToastStack toasts={toast.toasts} />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F05A2B] to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Notes & Docs</h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              {isStaff ? "Manage study materials" : "Your class materials"}
            </p>
          </div>
        </div>

        {/* Class Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <button
            onClick={() => setSelectedClassFilter("ALL")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedClassFilter === "ALL"
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            }`}
          >
            All
          </button>
          {targetClasses.map(c => (
            <button
              key={c}
              onClick={() => setSelectedClassFilter(c)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedClassFilter === c
                  ? "bg-[#F05A2B] text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {c.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Mobile Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects, files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B]"
          />
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl p-6 text-center text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-1.5 opacity-80" />
            <p className="font-semibold">Failed to load notes</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No notes found"
            description={isStaff ? "Tap + to upload notes" : "No notes uploaded for your class yet."}
          />
        ) : (
          <div className="space-y-4">
            {filteredClasses.map(cls => (
              <div key={cls.class_name} className="space-y-3">
                {cls.subjects.map(subject => (
                  <MobileSubjectCard
                    key={subject.id}
                    subject={subject}
                    className={cls.class_name}
                    canDeleteItem={canDeleteItem}
                    onDeleteSubject={setConfirmDelete}
                    onDeleteUnit={setConfirmDelete}
                    onDeleteFile={setConfirmDelete}
                    onPreviewFile={setPreviewFile}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {isStaff && <MobileFAB onClick={() => setUploadOpen(true)} label="Upload Notes" />}

      {/* Upload Sheet */}
      <UploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        targetClasses={targetClasses}
        existingSubjects={allSubjects}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["notes-all"] })}
        toast={toast}
      />

      {/* Preview Sheet */}
      {previewFile && (
        <BottomSheet open={!!previewFile} onClose={() => setPreviewFile(null)} title={previewFile.file_name}>
          <div className="space-y-3 pb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-500">{previewFile.file_type?.toUpperCase()} Document</span>
              <a
                href={previewFile.file_url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#F05A2B] rounded-lg"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
            <iframe
              src={getPreviewUrl(previewFile)}
              title={previewFile.file_name}
              className="w-full h-[60vh] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            />
          </div>
        </BottomSheet>
      )}

      {/* Delete Confirmation Sheet */}
      {confirmDelete && (
        <BottomSheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={`Delete ${confirmDelete.type}?`}>
          <div className="space-y-4 py-2 pb-4">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Are you sure you want to delete "{confirmDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting} className="flex-1">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={deleting} className="flex-1">
                Delete
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
