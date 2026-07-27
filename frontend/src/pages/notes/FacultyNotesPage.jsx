import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import {
  BookMarked, ChevronDown, ChevronRight, Plus, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  FolderOpen, Download, AlertCircle, UploadCloud, Eye, Search,
  LayoutGrid, List, Filter, Layers, FileCode, User
} from "lucide-react";
import {
  getAllNotes, createSubject, createUnit, uploadFiles,
  deleteFile, deleteSubject, deleteUnit
} from "../../api/notes";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { DesktopFAB } from "../../components/ui/DesktopFAB";

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
      iconColor: "text-red-500",
    };
  }
  if (["ppt", "pptx"].includes(ext)) {
    return {
      label: ext.toUpperCase(),
      icon: Presentation,
      badgeBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
      iconColor: "text-amber-500",
    };
  }
  return {
    label: ext.toUpperCase() || "DOC",
    icon: File,
    badgeBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
    iconColor: "text-blue-500",
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
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all duration-200 pointer-events-auto ${
            t.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-red-600 text-white border-red-500"
          }`}
        >
          {t.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Upload Modal ────────────────────────────────────────────────────────────
function UploadModal({ open, onClose, targetClasses, existingSubjects, onSuccess, toast }) {
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
          const { listUnits } = await import("../../api/notes");
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

      toast.add(`${files.length} file(s) uploaded successfully!`);
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
    <Modal open={open} onClose={onClose} title="Upload Notes & Docs" size="md">
      <div className="space-y-4 py-1">
        {/* Class Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Class
          </label>
          <select
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B] transition-all"
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
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
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
                  Existing Subject
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
                  Create New Subject
                </button>
              </div>
            )}
            {subjectMode === "existing" ? (
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B] transition-all"
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
              >
                <option value="">Select subject...</option>
                {classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <input
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B] transition-all"
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
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Unit
            </label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B] transition-all"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
            >
              <option value="">Select unit...</option>
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}

        {/* File Upload Zone */}
        {selectedClass && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Select Files
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const droppedFiles = Array.from(e.dataTransfer.files);
                setFiles(prev => [...prev, ...droppedFiles]);
              }}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-[#F05A2B] dark:hover:border-[#F05A2B] rounded-2xl p-6 text-center bg-gray-50/50 dark:bg-gray-900/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <UploadCloud className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click or drag files here</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">PDF, PPT, PPTX, DOC, DOCX</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[300px]">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {uploading && progress > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div className="bg-[#F05A2B] h-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpload} loading={uploading} disabled={uploading}>
            <UploadCloud className="w-4 h-4 mr-1.5" /> Upload Notes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── File Item ───────────────────────────────────────────────────────────────
function FileItemCard({ file, canDelete, onDelete, onPreview }) {
  const fileDetails = getFileTypeDetails(file.file_type);
  const IconComponent = fileDetails.icon;

  return (
    <div className="group flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/60 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow transition-all gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2.5 rounded-xl border ${fileDetails.badgeBg} flex items-center justify-center shrink-0`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#F05A2B] transition-colors">
            {file.file_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {fileDetails.label}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
              by {file.uploaded_by?.name || "Faculty"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onPreview(file)}
          className="p-2 text-gray-500 hover:text-[#F05A2B] dark:text-gray-400 dark:hover:text-[#F05A2B] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Preview Document"
        >
          <Eye className="w-4 h-4" />
        </button>
        <a
          href={file.file_url}
          download
          target="_blank"
          rel="noreferrer"
          className="p-2 text-gray-500 hover:text-[#F05A2B] dark:text-gray-400 dark:hover:text-[#F05A2B] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Download Document"
        >
          <Download className="w-4 h-4" />
        </a>
        {canDelete && (
          <button
            onClick={() => onDelete(file)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Delete File"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Subject Card (With Unit Tabs) ───────────────────────────────────────────
function RedesignedSubjectCard({ subject, className, canDeleteItem, onDeleteSubject, onDeleteUnit, onDeleteFile, onPreviewFile }) {
  const [activeUnitName, setActiveUnitName] = useState("all");

  const units = subject.units || [];

  // Filter files by active unit tab
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
    <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/70 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Card Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#F05A2B] bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 rounded-md">
                  {className.replace("_", " ")}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                  {units.length} units
                </span>
              </div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base truncate mt-0.5">
                {subject.name}
              </h3>
            </div>
          </div>

          {canDeleteItem(subject) && (
            <button
              onClick={() => onDeleteSubject({ type: "subject", id: subject.id, className, name: subject.name })}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
              title="Delete Subject"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Unit Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none mb-4 border-b border-gray-100 dark:border-gray-700/60 pb-3">
          <button
            onClick={() => setActiveUnitName("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeUnitName === "all"
                ? "bg-[#F05A2B] text-white shadow-sm"
                : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All Units
          </button>
          {UNIT_OPTIONS.map(unitName => {
            const hasUnit = units.some(u => u.name === unitName);
            return (
              <button
                key={unitName}
                onClick={() => setActiveUnitName(unitName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  activeUnitName === unitName
                    ? "bg-[#F05A2B] text-white shadow-sm"
                    : hasUnit
                    ? "bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                    : "bg-gray-50 dark:bg-gray-900/40 text-gray-300 dark:text-gray-600 cursor-default"
                }`}
              >
                {unitName}
                {hasUnit && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>

        {/* Files List in Active Unit */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {activeFiles.length === 0 ? (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500 space-y-1">
              <FolderOpen className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs font-medium">No notes uploaded for {activeUnitName === "all" ? "this subject" : activeUnitName}</p>
            </div>
          ) : (
            activeFiles.map(file => (
              <FileItemCard
                key={file.id}
                file={file}
                canDelete={canDeleteItem(file)}
                onDelete={(f) => onDeleteFile({
                  type: "file", id: f.id,
                  className,
                  subjectId: subject.id,
                  unitId: file.unit_id,
                  name: f.file_name
                })}
                onPreview={onPreviewFile}
              />
            ))
          )}
        </div>
      </div>

      {/* Card Footer Meta */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" /> Created by {subject.created_by?.name || "Faculty"}
        </span>
        {activeUnitObj && canDeleteItem(activeUnitObj) && activeUnitName !== "all" && (
          <button
            onClick={() => onDeleteUnit({
              type: "unit", id: activeUnitObj.id,
              className, subjectId: subject.id, name: activeUnitObj.name
            })}
            className="text-red-500 hover:underline text-[11px] font-medium flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete {activeUnitName}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function FacultyNotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const pageRef = useRef(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Filter & Layout States
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [expandedSubjects, setExpandedSubjects] = useState({});

  const isStaff = user?.role === "FACULTY" || user?.role === "HOD";

  const { data, isLoading, error } = useQuery({
    queryKey: ["notes-all"],
    queryFn: () => getAllNotes().then(r => r.data),
    staleTime: 30000,
  });

  const classes = data?.classes || [];
  const targetClasses = data?.target_classes || [];

  const allSubjects = useMemo(() => {
    return classes.flatMap(c => c.subjects.map(s => ({ ...s, class_name: c.class_name })));
  }, [classes]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalSubjects = 0;
    let totalUnits = 0;
    let totalFiles = 0;

    classes.forEach(c => {
      totalSubjects += c.subjects.length;
      c.subjects.forEach(s => {
        totalUnits += s.units.length;
        s.units.forEach(u => {
          totalFiles += u.files.length;
        });
      });
    });

    return { totalSubjects, totalUnits, totalFiles };
  }, [classes]);

  useEffect(() => {
    if (pageRef.current) {
      gsap.from(pageRef.current, { opacity: 0, y: 15, duration: 0.4, ease: "power3.out" });
    }
  }, []);

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { type, id, className, subjectId, unitId } = confirmDelete;
      if (type === "subject") {
        await deleteSubject(className, id);
      } else if (type === "unit") {
        await deleteUnit(className, subjectId, id);
      } else if (type === "file") {
        await deleteFile(className, subjectId, unitId, id);
      }
      toast.add(`${confirmDelete.name} deleted`);
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

  // Filter logic: Filter by Class pill & Search query
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
    <div ref={pageRef} className="space-y-6 pb-12">
      <ToastStack toasts={toast.toasts} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F05A2B] to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Notes & Docs</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isStaff ? "Manage and share subject study materials" : "Access your class study materials"}
            </p>
          </div>
        </div>

        {/* Quick Stat Summary Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/60 px-4 py-2 rounded-2xl shadow-sm">
            <div className="text-center">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Subjects</p>
              <p className="text-base font-black text-gray-900 dark:text-white">{stats.totalSubjects}</p>
            </div>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Units</p>
              <p className="text-base font-black text-gray-900 dark:text-white">{stats.totalUnits}</p>
            </div>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Docs</p>
              <p className="text-base font-black text-[#F05A2B]">{stats.totalFiles}</p>
            </div>
          </div>

          {isStaff && (
            <Button onClick={() => setUploadOpen(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> Upload Notes
            </Button>
          )}
        </div>
      </div>

      {/* Control Bar: Class Filter Pills + Search + View Switcher */}
      <div className="bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700/70 p-3 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Class Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Class:
            </span>
            <button
              onClick={() => setSelectedClassFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedClassFilter === "ALL"
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All Classes
            </button>
            {targetClasses.map(c => (
              <button
                key={c}
                onClick={() => setSelectedClassFilter(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedClassFilter === c
                    ? "bg-[#F05A2B] text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {c.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Right Controls: Search + View Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects, files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B]"
              />
            </div>

            {/* View Switcher */}
            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Display Section */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-8 text-center text-red-600 dark:text-red-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-80" />
            <p className="font-semibold">Failed to load notes</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No notes found"
            description={isStaff ? "Upload notes or adjust your filter/search criteria." : "No study materials available for your criteria."}
            action={isStaff ? (
              <Button onClick={() => setUploadOpen(true)} className="gap-2 mt-2">
                <Plus className="w-4 h-4" /> Upload Notes
              </Button>
            ) : null}
          />
        ) : viewMode === "grid" ? (
          /* GRID VIEW: Responsive grid of RedesignedSubjectCard components */
          <div className="space-y-8">
            {filteredClasses.map(cls => (
              <div key={cls.class_name} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#F05A2B] to-orange-600 rounded-lg shadow-sm">
                    {cls.class_name.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {cls.subjects.length} {cls.subjects.length === 1 ? "subject" : "subjects"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cls.subjects.map(subject => (
                    <RedesignedSubjectCard
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
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW: Compact Accordion List */
          <div className="space-y-6">
            {filteredClasses.map(cls => (
              <div key={cls.class_name} className="bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#F05A2B] to-orange-600 rounded-lg shadow-sm">
                    {cls.class_name.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {cls.subjects.length} {cls.subjects.length === 1 ? "subject" : "subjects"}
                  </span>
                </div>

                <div className="space-y-3">
                  {cls.subjects.map(subject => (
                    <div key={subject.id} className="border border-gray-200/80 dark:border-gray-700/60 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-gray-900/40">
                      <div
                        onClick={() => toggleSubject(subject.id)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {expandedSubjects[subject.id] ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <BookMarked className="w-5 h-5 text-[#F05A2B] shrink-0" />
                          <span className="font-bold text-gray-900 dark:text-white text-base truncate">{subject.name}</span>
                          <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">
                            {subject.units.length} units
                          </span>
                        </div>
                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium hidden sm:inline">
                            by {subject.created_by?.name}
                          </span>
                          {canDeleteItem(subject) && (
                            <button
                              onClick={() => setConfirmDelete({ type: "subject", id: subject.id, className: cls.class_name, name: subject.name })}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Delete subject"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedSubjects[subject.id] && (
                        <div className="p-4 pt-1 space-y-3 border-t border-gray-200/60 dark:border-gray-700/40">
                          {subject.units.map(unit => (
                            <div key={unit.id} className="space-y-2">
                              <div className="flex items-center justify-between font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider pt-2">
                                <span className="flex items-center gap-1.5">
                                  <FolderOpen className="w-4 h-4 text-amber-500" /> {unit.name} ({unit.files.length} files)
                                </span>
                                {canDeleteItem(unit) && (
                                  <button
                                    onClick={() => setConfirmDelete({ type: "unit", id: unit.id, className: cls.class_name, subjectId: subject.id, name: unit.name })}
                                    className="text-red-500 hover:underline text-[11px]"
                                  >
                                    Delete Unit
                                  </button>
                                )}
                              </div>
                              <div className="space-y-2">
                                {unit.files.map(file => (
                                  <FileItemCard
                                    key={file.id}
                                    file={file}
                                    canDelete={canDeleteItem(file)}
                                    onDelete={(f) => setConfirmDelete({
                                      type: "file", id: f.id,
                                      className: cls.class_name,
                                      subjectId: subject.id,
                                      unitId: unit.id,
                                      name: f.file_name
                                    })}
                                    onPreview={setPreviewFile}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Staff */}
      {isStaff && <DesktopFAB onClick={() => setUploadOpen(true)} label="Upload Notes" />}

      {/* Upload Modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        targetClasses={targetClasses}
        existingSubjects={allSubjects}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["notes-all"] })}
        toast={toast}
      />

      {/* File Preview Modal */}
      <Modal open={!!previewFile} onClose={() => setPreviewFile(null)} title={previewFile?.file_name || "File Preview"} size="xl">
        <div className="flex flex-col h-[75vh]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {previewFile?.file_type?.toUpperCase()} Document
            </span>
            <a
              href={previewFile?.file_url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#F05A2B] rounded-lg hover:bg-[#E04A1B] transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download File
            </a>
          </div>
          <iframe
            src={getPreviewUrl(previewFile)}
            title={previewFile?.file_name}
            className="w-full flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          />
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Delete ${confirmDelete?.type}?`}
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        danger
        confirmText="Delete"
      />
    </div>
  );
}
