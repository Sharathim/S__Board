import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked, Plus, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  FolderOpen, Download, AlertCircle, UploadCloud, Eye, Search,
  ChevronDown, ChevronUp, User
} from "lucide-react";
import {
  getAllNotes, createSubject, createUnit, uploadFiles,
  deleteFile, deleteSubject, deleteUnit
} from "../../../api/notes";
import { useAuth } from "../../../context/AuthContext";
import BottomSheet from "../../layout/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const UNIT_OPTIONS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFileTypeLabel(type) {
  const ext = (type || "").toLowerCase();
  if (ext === "pdf") return "PDF";
  if (["ppt", "pptx"].includes(ext)) return ext.toUpperCase();
  return ext.toUpperCase() || "DOC";
}

function getFileIcon(type) {
  const ext = (type || "").toLowerCase();
  if (ext === "pdf") return FileText;
  if (["ppt", "pptx"].includes(ext)) return Presentation;
  return File;
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

// ─── Toast ────────────────────────────────────────────────────────────────────
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
      style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold pointer-events-auto ${
            t.type === "success" ? "bg-[#F05A2B] text-white" : "bg-gray-900 text-white"
          }`}
        >
          {t.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Upload Bottom Sheet ───────────────────────────────────────────────────────
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

  const inputCls = "w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B] transition-all";

  useEffect(() => {
    setSelectedSubjectId("");
    setNewSubjectName("");
    setSubjectMode("existing");
    setSelectedUnit("");
  }, [selectedClass]);

  const classSubjects = existingSubjects.filter(s => s.class_name === selectedClass);

  useEffect(() => {
    if (selectedClass && classSubjects.length === 0) setSubjectMode("new");
  }, [selectedClass, classSubjects.length]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (!selectedClass || !selectedUnit) { toast.add("Please select class and unit", "error"); return; }
    if (subjectMode === "existing" && !selectedSubjectId) { toast.add("Please select a subject", "error"); return; }
    if (subjectMode === "new" && !newSubjectName.trim()) { toast.add("Please enter a subject name", "error"); return; }
    if (files.length === 0) { toast.add("Please select at least one file", "error"); return; }

    setUploading(true);
    try {
      let subjectId = selectedSubjectId;
      if (subjectMode === "new") {
        const res = await createSubject(selectedClass, { name: newSubjectName.trim(), academic_year: CURRENT_ACADEMIC_YEAR, semester: 1 });
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
          if (existing) { unitId = existing.id; } else { throw err; }
        } else { throw err; }
      }
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      await uploadFiles(selectedClass, subjectId, unitId, formData, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      toast.add(`${files.length} file(s) uploaded successfully!`);
      setFiles([]); setProgress(0); setSelectedUnit("");
      onSuccess(); onClose();
    } catch (err) {
      toast.add(err.response?.data?.error || "Upload failed", "error");
    } finally { setUploading(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Upload Notes & Docs">
      <div className="space-y-4 pb-6">

        {/* Class */}
        <div>
          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Class</label>
          <select className={inputCls} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select class...</option>
            {targetClasses.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select>
        </div>

        {/* Subject */}
        {selectedClass && (
          <div>
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
            {classSubjects.length > 0 && (
              <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-2">
                <button type="button" onClick={() => setSubjectMode("existing")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${subjectMode === "existing" ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                  Existing
                </button>
                <button type="button" onClick={() => setSubjectMode("new")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${subjectMode === "new" ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                  Create New
                </button>
              </div>
            )}
            {subjectMode === "existing"
              ? <select className={inputCls} value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                  <option value="">Select subject...</option>
                  {classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              : <input className={inputCls} placeholder="Enter subject name..." value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
            }
          </div>
        )}

        {/* Unit */}
        {selectedClass && (
          <div>
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Unit</label>
            <div className="grid grid-cols-5 gap-1.5">
              {UNIT_OPTIONS.map(u => (
                <button key={u} type="button" onClick={() => setSelectedUnit(u)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${selectedUnit === u ? "bg-[#F05A2B] text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
                  {u.replace("Unit ", "U")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {selectedClass && (
          <div>
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Files</label>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-[#F05A2B] bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors">
              <UploadCloud className="w-4.5 h-4.5 text-[#F05A2B]" />
              <span>Choose PDF, PPT, DOC files</span>
            </button>
            <input ref={fileRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={handleFileChange} className="hidden" />
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-lg">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0 ml-2"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        {uploading && progress > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#F05A2B] h-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={uploading} className="flex-1">Cancel</Button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 py-3 rounded-xl bg-[#F05A2B] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? `Uploading ${progress}%...` : "Upload Notes"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── File Row Item ─────────────────────────────────────────────────────────────
function FileRow({ file, subject, canDeleteFile, onDeleteFile, onPreviewFile }) {
  const IconComp = getFileIcon(file.file_type);
  const label = getFileTypeLabel(file.file_type);

  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 dark:border-gray-800/60 last:border-b-0 gap-2">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-lg bg-[#F05A2B]/10 flex items-center justify-center shrink-0">
          <IconComp className="w-3.5 h-3.5 text-[#F05A2B]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{file.file_name}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
            <span className="inline-block px-1.5 py-0 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black text-gray-600 dark:text-gray-400 mr-1">{label}</span>
            {file.uploaded_by?.name || "Faculty"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => onPreviewFile(file)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#F05A2B] hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors" title="Preview">
          <Eye className="w-3.5 h-3.5" />
        </button>
        <a href={file.file_url} download target="_blank" rel="noreferrer"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#F05A2B] hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors" title="Download">
          <Download className="w-3.5 h-3.5" />
        </a>
        {canDeleteFile && (
          <button onClick={() => onDeleteFile({ type: "file", id: file.id, className: file._className, subjectId: subject.id, unitId: file.unit_id, name: file.file_name })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Subject Card ──────────────────────────────────────────────────────────────
function SubjectCard({ subject, className, canDeleteItem, onDeleteSubject, onDeleteUnit, onDeleteFile, onPreviewFile }) {
  const [activeUnit, setActiveUnit] = useState("Unit 1");
  const units = subject.units || [];

  const activeFiles = useMemo(() => {
    const matchingUnit = units.find(u => u.name === activeUnit);
    if (!matchingUnit) return [];
    return matchingUnit.files.map(f => ({ ...f, unit_id: matchingUnit.id, _className: className }));
  }, [units, activeUnit, className]);

  const activeUnitObj = units.find(u => u.name === activeUnit);
  const totalFiles = units.reduce((acc, u) => acc + (u.files?.length || 0), 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">

      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F05A2B] flex items-center justify-center text-white shadow-sm shrink-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-white bg-[#F05A2B] px-2 py-0.5 rounded-md">
                {className.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {units.length} unit{units.length !== 1 ? "s" : ""} · {totalFiles} file{totalFiles !== 1 ? "s" : ""}
              </span>
            </div>
            <h3 className="font-black text-gray-900 dark:text-white text-[14px] tracking-tight leading-snug truncate">
              {subject.name}
            </h3>
          </div>
        </div>
        {canDeleteItem(subject) && (
          <button
            onClick={() => onDeleteSubject({ type: "subject", id: subject.id, className, name: subject.name })}
            className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors shrink-0"
            title="Delete Subject"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Unit Tabs */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {UNIT_OPTIONS.map(unitName => {
            const hasUnit = units.some(u => u.name === unitName);
            const isActive = activeUnit === unitName;
            return (
              <button
                key={unitName}
                onClick={() => setActiveUnit(unitName)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#F05A2B] text-white shadow-sm"
                    : hasUnit
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    : "bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600"
                }`}
              >
                {unitName.replace("Unit ", "U")}
                {hasUnit && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/70" : "bg-[#F05A2B]"}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Files */}
      <div className="px-4">
        {activeFiles.length === 0 ? (
          <div className="py-5 text-center">
            <FolderOpen className="w-6 h-6 mx-auto mb-1.5 text-gray-200 dark:text-gray-700" />
            <p className="text-[11px] text-gray-400 dark:text-gray-600 font-medium">No files in {activeUnit}</p>
          </div>
        ) : (
          <div>
            {activeFiles.map(file => (
              <FileRow
                key={file.id}
                file={file}
                subject={subject}
                canDeleteFile={canDeleteItem(file)}
                onDeleteFile={onDeleteFile}
                onPreviewFile={onPreviewFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 mt-1 border-t border-gray-50 dark:border-gray-800/60">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <User className="w-3 h-3" />
          {subject.created_by?.name || "Faculty"}
        </span>
        {activeUnitObj && canDeleteItem(activeUnitObj) && (
          <button
            onClick={() => onDeleteUnit({ type: "unit", id: activeUnitObj.id, className, subjectId: subject.id, name: activeUnitObj.name })}
            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete {activeUnit}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Preview Sheet ─────────────────────────────────────────────────────────────
function FilePreviewSheet({ file, onClose }) {
  const [loaded, setLoaded] = useState(false);
  if (!file) return null;

  return (
    <BottomSheet open={!!file} onClose={onClose} title={file.file_name}>
      <div className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#F05A2B]/10 text-[#F05A2B] text-[10px] font-black rounded uppercase">
              {file.file_type?.toUpperCase() || "DOC"}
            </span>
            <span className="text-[10px] text-gray-400">
              {file.uploaded_by?.name || "Faculty"}
            </span>
          </div>
          <a
            href={file.file_url}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F05A2B] text-white text-xs font-bold rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        </div>

        {!loaded && (
          <div className="w-full h-[55vh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#F05A2B] mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading preview...</p>
            </div>
          </div>
        )}
        <iframe
          src={getPreviewUrl(file)}
          title={file.file_name}
          className={`w-full h-[55vh] rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 ${loaded ? "block" : "hidden"}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </BottomSheet>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
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

  // Stats
  const stats = useMemo(() => {
    let subjects = 0, units = 0, docs = 0;
    classes.forEach(c => {
      subjects += c.subjects.length;
      c.subjects.forEach(s => {
        units += s.units.length;
        s.units.forEach(u => { docs += u.files.length; });
      });
    });
    return { subjects, units, docs };
  }, [classes]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { type, id, className, subjectId, unitId } = confirmDelete;
      if (type === "subject") await deleteSubject(className, id);
      else if (type === "unit") await deleteUnit(className, subjectId, id);
      else if (type === "file") await deleteFile(className, subjectId, unitId, id);
      toast.add("Deleted successfully");
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
    if (selectedClassFilter !== "ALL") list = list.filter(c => c.class_name === selectedClassFilter);
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
    <div className="space-y-0 pb-24">
      <ToastStack toasts={toast.toasts} />

      {/* ── Page Header ── */}
      <div className="bg-white dark:bg-gray-950 px-4 pt-3 pb-0 space-y-3">

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F05A2B] flex items-center justify-center text-white shadow-sm shadow-orange-500/20 shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight leading-tight">Notes & Docs</h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {isStaff ? "Manage study materials" : "Your class materials"}
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-1.5">
            <div className="text-center px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-black text-gray-900 dark:text-white">{stats.subjects}</p>
              <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">Subj</p>
            </div>
            <div className="text-center px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-black text-gray-900 dark:text-white">{stats.units}</p>
              <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">Units</p>
            </div>
            <div className="text-center px-2 py-1 rounded-lg bg-[#F05A2B]/10 border border-[#F05A2B]/20">
              <p className="text-[11px] font-black text-[#F05A2B]">{stats.docs}</p>
              <p className="text-[8px] text-[#F05A2B]/70 uppercase tracking-wider font-bold">Docs</p>
            </div>
          </div>
        </div>

        {/* Class Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setSelectedClassFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
              selectedClassFilter === "ALL"
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            All
          </button>
          {targetClasses.map(c => (
            <button
              key={c}
              onClick={() => setSelectedClassFilter(c)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedClassFilter === c
                  ? "bg-[#F05A2B] text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {c.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects, files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20 focus:border-[#F05A2B] transition-all"
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-3 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F05A2B]/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#F05A2B] animate-spin" />
            </div>
            <p className="text-xs text-gray-400 font-medium">Loading notes...</p>
          </div>
        ) : error ? (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Failed to load notes</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F05A2B]/10 flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="w-6 h-6 text-[#F05A2B]/60" />
            </div>
            <p className="text-sm font-black text-gray-700 dark:text-gray-300 mb-1">No notes found</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {isStaff ? "Tap + to upload notes" : "No notes uploaded for your class yet."}
            </p>
          </div>
        ) : (
          filteredClasses.map(cls =>
            cls.subjects.map(subject => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                className={cls.class_name}
                canDeleteItem={canDeleteItem}
                onDeleteSubject={setConfirmDelete}
                onDeleteUnit={setConfirmDelete}
                onDeleteFile={setConfirmDelete}
                onPreviewFile={setPreviewFile}
              />
            ))
          )
        )}
      </div>

      {/* ── FAB ── */}
      {isStaff && (
        <button
          onClick={() => setUploadOpen(true)}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#F05A2B] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center z-40 active:scale-95 transition-transform"
          aria-label="Upload Notes"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ── Upload Sheet ── */}
      <UploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        targetClasses={targetClasses}
        existingSubjects={allSubjects}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["notes-all"] })}
        toast={toast}
      />

      {/* ── File Preview Sheet ── */}
      <FilePreviewSheet file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* ── Delete Confirm Sheet ── */}
      {confirmDelete && (
        <BottomSheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={`Delete ${confirmDelete.type}?`}>
          <div className="space-y-4 py-2 pb-6">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <strong>"{confirmDelete.name}"</strong>?
              </p>
              <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 font-medium">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
