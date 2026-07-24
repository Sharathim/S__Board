import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import {
  BookMarked, ChevronRight, ChevronDown, Plus, Upload, Trash2,
  FileText, File, Presentation, X, Check, Loader2, Archive,
  ArchiveRestore, FolderOpen, BookOpen, Layers, RefreshCw,
  Download, GripVertical, AlertCircle, Sparkles,
  UploadCloud, BookPlus
} from "lucide-react";
import {
  getFacultyNotesHub, listUnits, createSubject, createUnit,
  uploadFiles, deleteFile, deleteSubject, deleteUnit,
  archiveSubject, unarchiveSubject
} from "../../api/notes";
import { useAuth } from "../../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type) {
  if (!type) return <FileText className="w-4 h-4" />;
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (type === "ppt" || type === "pptx") return <Presentation className="w-4 h-4 text-orange-500" />;
  return <File className="w-4 h-4 text-blue-500" />;
}

const CLASS_COLORS = [
  { bg: "from-violet-500 to-purple-600", light: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800/50" },
  { bg: "from-blue-500 to-cyan-600", light: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/50" },
  { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/50" },
  { bg: "from-amber-500 to-orange-600", light: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/50" },
  { bg: "from-rose-500 to-pink-600", light: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800/50" },
  { bg: "from-indigo-500 to-blue-600", light: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/50" },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

// ─── Upload Progress Bar ──────────────────────────────────────────────────────
function UploadProgressBar({ uploads }) {
  const active = Object.values(uploads).filter(u => u.active);
  if (!active.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {active.map(u => (
        <div key={u.id} className="notes-upload-bar animate-slide-up-fade">
          <div className="flex items-center gap-2 mb-1.5">
            <UploadCloud className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate flex-1">{u.name}</p>
            <span className="text-xs font-bold text-[var(--primary)]">{u.pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary)] to-orange-400 rounded-full transition-all duration-200"
              style={{ width: `${u.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Inline Input ─────────────────────────────────────────────────────────────
function InlineInput({ placeholder, onSave, onCancel, autoFocus = true, className = "" }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { if (autoFocus && inputRef.current) inputRef.current.focus(); }, [autoFocus]);

  const handleKey = (e) => {
    if (e.key === "Enter" && val.trim()) { onSave(val.trim()); setVal(""); }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="notes-inline-input flex-1"
      />
      <button
        onClick={() => { if (val.trim()) { onSave(val.trim()); setVal(""); } }}
        className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors shrink-0"
        title="Save (Enter)"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onCancel}
        className="w-7 h-7 rounded-lg bg-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center hover:bg-[var(--border-medium)] transition-colors shrink-0"
        title="Cancel (Esc)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Unit Row ─────────────────────────────────────────────────────────────────
function UnitRow({ unit, className: classNameStr, subjectId, onDelete, onUploadDone, addToast }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [uploads, setUploads] = useState({});
  const fileInputRef = useRef(null);
  const rowRef = useRef(null);

  const { data: unitsData, refetch } = useQuery({
    queryKey: ["unit-files", unit.id],
    queryFn: () => listUnits(classNameStr, subjectId),
    enabled: expanded,
    select: d => d.data.units?.find(u => u.id === unit.id)?.files || [],
  });
  const files = unitsData || [];

  const doUpload = useCallback(async (fileList) => {
    const validFiles = Array.from(fileList).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["pdf", "ppt", "pptx", "doc", "docx"].includes(ext);
    });
    if (!validFiles.length) { addToast("Only PDF, PPT, PPTX, DOC, DOCX files are allowed.", "error"); return; }

    const formData = new FormData();
    validFiles.forEach(f => formData.append("files", f));
    const uploadId = Math.random().toString(36).slice(2);

    setUploads(prev => ({
      ...prev,
      [uploadId]: { id: uploadId, name: validFiles.map(f => f.name).join(", "), pct: 0, active: true }
    }));

    try {
      await uploadFiles(classNameStr, subjectId, unit.id, formData, (evt) => {
        if (evt.total) {
          setUploads(prev => ({
            ...prev,
            [uploadId]: { ...prev[uploadId], pct: Math.round((evt.loaded / evt.total) * 100) }
          }));
        }
      });
      setUploads(prev => ({ ...prev, [uploadId]: { ...prev[uploadId], active: false } }));
      addToast(`${validFiles.length} file(s) uploaded successfully!`);
      setExpanded(true);
      refetch();
      onUploadDone?.();
    } catch {
      setUploads(prev => ({ ...prev, [uploadId]: { ...prev[uploadId], active: false } }));
      addToast("Upload failed. Please try again.", "error");
    }
  }, [classNameStr, subjectId, unit.id, addToast, refetch, onUploadDone]);

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    doUpload(e.dataTransfer.files);
    gsap.fromTo(rowRef.current, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: "back.out(2)" });
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteFile(classNameStr, subjectId, unit.id, fileId);
      refetch();
      addToast("File deleted.");
    } catch { addToast("Failed to delete file.", "error"); }
  };

  return (
    <div
      ref={rowRef}
      className={`notes-unit-row ${isDragOver ? "notes-unit-row-drag" : ""}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Unit header */}
      <div className="flex items-center gap-2 min-w-0">
        <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 cursor-grab" />
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${expanded ? "bg-[var(--primary)] text-white" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>
            <Layers className="w-3 h-3" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{unit.name}</span>
          <span className="text-xs text-[var(--text-muted)] shrink-0">{unit.file_count ?? files.length} files</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="notes-upload-btn shrink-0"
          title="Upload files to this unit"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
        <button
          onClick={() => { if (window.confirm("Delete this unit and all its files?")) onDelete(); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" className="hidden"
          onChange={e => { doUpload(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Drag hint */}
      {isDragOver && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary-light)] border-2 border-dashed border-[var(--primary)] text-[var(--primary)] text-xs font-semibold animate-pulse">
          <UploadCloud className="w-4 h-4" /> Drop files here
        </div>
      )}

      {/* Active uploads */}
      {Object.values(uploads).filter(u => u.active).map(u => (
        <div key={u.id} className="mt-2 px-2 py-1.5 rounded-lg bg-[var(--primary-light)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--primary)] truncate">{u.name}</span>
            <span className="text-xs font-bold text-[var(--primary)]">{u.pct}%</span>
          </div>
          <div className="w-full h-1 bg-[var(--primary-soft)] rounded-full">
            <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-200" style={{ width: `${u.pct}%` }} />
          </div>
        </div>
      ))}

      {/* Expanded files */}
      {expanded && (
        <div className="mt-2 space-y-1.5 pl-5 animate-fade-in">
          {files.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2 px-2">
              <AlertCircle className="w-3.5 h-3.5" /> No files yet — drag & drop or click Upload above.
            </div>
          )}
          {files.map(file => (
            <div key={file.id} className="notes-file-row group">
              <div className="shrink-0">{getFileIcon(file.file_type)}</div>
              <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate min-w-0">{file.file_name}</span>
              <span className="text-xs text-[var(--text-muted)] shrink-0">{formatBytes(file.file_size)}</span>
              <a href={file.file_url} target="_blank" rel="noreferrer"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors opacity-0 group-hover:opacity-100">
                <Download className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => handleDeleteFile(file.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, className: classNameStr, colorIdx, onDelete, onArchive, addToast, refetchHub }) {
  const [expanded, setExpanded] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const cardRef = useRef(null);
  const qc = useQueryClient();

  const loadUnits = useCallback(async () => {
    if (!expanded) return;
    setLoadingUnits(true);
    try {
      const res = await listUnits(classNameStr, subject.id);
      setUnits(res.data.units || []);
    } finally { setLoadingUnits(false); }
  }, [classNameStr, subject.id, expanded]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const handleAddUnit = async (name) => {
    try {
      const res = await createUnit(classNameStr, subject.id, { name });
      setUnits(prev => [...prev, res.data.unit]);
      setAddingUnit(false);
      addToast(`Unit "${name}" created!`);
    } catch { addToast("Failed to create unit.", "error"); }
  };

  const handleDeleteUnit = async (unitId) => {
    try {
      await deleteUnit(classNameStr, subject.id, unitId);
      setUnits(prev => prev.filter(u => u.id !== unitId));
      addToast("Unit deleted.");
      refetchHub();
    } catch { addToast("Failed to delete unit.", "error"); }
  };

  const color = CLASS_COLORS[colorIdx % CLASS_COLORS.length];

  const handleToggle = () => {
    setExpanded(v => !v);
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 4, opacity: 0.8 },
        { y: 0, opacity: 1, duration: 0.25, ease: "power2.out" }
      );
    }
  };

  return (
    <div ref={cardRef} className="notes-subject-card">
      {/* Subject header */}
      <div
        className="flex items-start gap-3 cursor-pointer select-none"
        onClick={handleToggle}
      >
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center text-white shrink-0 shadow-sm`}>
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{subject.name}</h3>
            {subject.is_archived && (
              <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-[10px] font-semibold">Archived</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-[var(--text-muted)]">{subject.unit_count} units</span>
            <span className="text-xs text-[var(--text-muted)]">·</span>
            <span className="text-xs text-[var(--text-muted)]">{subject.file_count} files</span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onArchive(subject.id, subject.is_archived); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-colors"
            title={subject.is_archived ? "Unarchive" : "Archive"}
          >
            {subject.is_archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); if (window.confirm("Delete this subject and all its units and files?")) onDelete(subject.id); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {loadingUnits ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2 pl-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading units...
            </div>
          ) : (
            <>
              {units.map(unit => (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  className={classNameStr}
                  subjectId={subject.id}
                  onDelete={() => handleDeleteUnit(unit.id)}
                  onUploadDone={refetchHub}
                  addToast={addToast}
                />
              ))}
              {units.length === 0 && !addingUnit && (
                <div className="text-xs text-[var(--text-muted)] pl-2 py-1">No units yet. Add one below.</div>
              )}
            </>
          )}

          {/* Add unit inline */}
          {addingUnit ? (
            <InlineInput
              placeholder="Unit name (e.g. Unit 1 – Introduction)"
              onSave={handleAddUnit}
              onCancel={() => setAddingUnit(false)}
              className="mt-1 pl-2"
            />
          ) : (
            <button
              onClick={() => setAddingUnit(true)}
              className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] pl-2 py-1 rounded-lg hover:bg-[var(--primary-light)] transition-colors w-full text-left"
            >
              <Plus className="w-3.5 h-3.5" />
              Add unit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Left Panel: Class + Semester Navigator ────────────────────────────────────
function ClassNavigator({ classes, selectedClass, selectedYear, selectedSem, onSelect, colorMap }) {
  const navRef = useRef(null);

  useEffect(() => {
    if (navRef.current) {
      gsap.from(navRef.current.children, {
        opacity: 0, x: -20, stagger: 0.05, duration: 0.4, ease: "power3.out"
      });
    }
  }, []);

  return (
    <div ref={navRef} className="space-y-1.5">
      {classes.map((cls, idx) => {
        const color = CLASS_COLORS[idx % CLASS_COLORS.length];
        const isSelected = selectedClass === cls.class_name;
        return (
          <div key={cls.class_name}>
            {/* Class pill */}
            <button
              onClick={() => onSelect(cls.class_name, cls.academic_years?.[0]?.year || CURRENT_ACADEMIC_YEAR, 1)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${
                isSelected
                  ? "bg-[var(--text-primary)] text-white shadow-sm"
                  : "hover:bg-[var(--border)] text-[var(--text-primary)]"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color.bg} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                {cls.class_name.split("_")[1] || cls.class_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{cls.class_name.replace("_", " ")}</p>
                {cls.is_incharge && (
                  <p className={`text-[10px] font-semibold ${isSelected ? "text-white/70" : "text-[var(--primary)]"}`}>
                    Class Incharge
                  </p>
                )}
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
            </button>

            {/* Year + Semester selector (when class expanded) */}
            {isSelected && (
              <div className="ml-3 mt-1 space-y-1 animate-fade-in">
                {cls.academic_years.map(yr => (
                  <div key={yr.year}>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-0.5">{yr.year}</p>
                    <div className="flex gap-1.5 px-2">
                      {yr.semesters.map(sem => (
                        <button
                          key={sem.semester}
                          onClick={() => onSelect(cls.class_name, yr.year, sem.semester)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                            selectedYear === yr.year && selectedSem === sem.semester && isSelected
                              ? "bg-[var(--primary)] text-white shadow-sm"
                              : "bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
                          }`}
                        >
                          Sem {sem.semester}
                          <span className="ml-1 opacity-60">({sem.subjects.length})</span>
                        </button>
                      ))}
                      {/* Add missing semester if needed */}
                      {yr.semesters.length < 2 && yr.semesters.map(s => s.semester).indexOf(yr.semesters.length === 0 ? 1 : (yr.semesters[0].semester === 1 ? 2 : 1)).length === 0 && null}
                    </div>
                  </div>
                ))}
                {cls.academic_years.length === 0 && (
                  <p className="text-[11px] text-[var(--text-muted)] px-2 py-1">No subjects yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Right Panel: Subjects for selected class+semester ────────────────────────
function SubjectsPanel({ classes, selectedClass, selectedYear, selectedSem, addToast, refetchHub }) {
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectYear, setNewSubjectYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [newSubjectSem, setNewSubjectSem] = useState(1);
  const panelRef = useRef(null);

  const classData = classes.find(c => c.class_name === selectedClass);
  const yearData = classData?.academic_years.find(y => y.year === selectedYear);
  const semData = yearData?.semesters.find(s => s.semester === selectedSem);
  const subjects = semData?.subjects || [];

  useEffect(() => {
    if (panelRef.current) {
      gsap.from(panelRef.current, {
        opacity: 0, y: 15, duration: 0.35, ease: "power3.out"
      });
    }
  }, [selectedClass, selectedYear, selectedSem]);

  const handleAddSubject = async (name) => {
    try {
      await createSubject(selectedClass, {
        name,
        academic_year: newSubjectYear,
        semester: newSubjectSem,
      });
      setAddingSubject(false);
      addToast(`Subject "${name}" created!`);
      refetchHub();
    } catch (e) {
      addToast(e?.response?.data?.error || "Failed to create subject.", "error");
    }
  };

  const handleDelete = async (subjectId) => {
    try {
      await deleteSubject(selectedClass, subjectId);
      addToast("Subject deleted.");
      refetchHub();
    } catch { addToast("Failed to delete subject.", "error"); }
  };

  const handleArchive = async (subjectId, isCurrentlyArchived) => {
    try {
      if (isCurrentlyArchived) {
        await unarchiveSubject(selectedClass, subjectId);
        addToast("Subject restored.");
      } else {
        await archiveSubject(selectedClass, subjectId);
        addToast("Subject archived.");
      }
      refetchHub();
    } catch { addToast("Archive action failed.", "error"); }
  };

  if (!selectedClass) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center mx-auto mb-4">
            <BookMarked className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Select a Class</h3>
          <p className="text-xs text-[var(--text-muted)]">Choose a class from the left panel to manage its notes and documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-[var(--text-primary)]">
            {selectedClass?.replace("_", " ")}
            <span className="ml-2 text-sm font-semibold text-[var(--text-muted)]">
              / {selectedYear} / Sem {selectedSem}
            </span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{subjects.length} subject(s)</p>
        </div>
        <button
          onClick={() => setAddingSubject(true)}
          className="notes-add-btn"
        >
          <BookPlus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {/* Add subject inline form */}
      {addingSubject && (
        <div className="notes-subject-card border-dashed animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <BookPlus className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">New Subject</span>
          </div>
          <div className="flex gap-2 mb-2 flex-wrap">
            <input
              type="text"
              value={newSubjectYear}
              onChange={e => setNewSubjectYear(e.target.value)}
              placeholder="Academic Year (e.g. 2025-26)"
              className="notes-inline-input w-44"
            />
            <div className="flex gap-1.5">
              {[1, 2].map(s => (
                <button
                  key={s}
                  onClick={() => setNewSubjectSem(s)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    newSubjectSem === s
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
                  }`}
                >
                  Sem {s}
                </button>
              ))}
            </div>
          </div>
          <InlineInput
            placeholder="Subject name (e.g. Software Engineering)"
            onSave={handleAddSubject}
            onCancel={() => setAddingSubject(false)}
          />
        </div>
      )}

      {/* Subject cards */}
      {subjects.length === 0 && !addingSubject ? (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">No subjects for Sem {selectedSem}</p>
            <p className="text-xs text-[var(--text-muted)] mb-3">Click "New Subject" to add the first one.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((subj, idx) => (
            <SubjectCard
              key={subj.id}
              subject={subj}
              className={selectedClass}
              colorIdx={idx}
              onDelete={handleDelete}
              onArchive={handleArchive}
              addToast={addToast}
              refetchHub={refetchHub}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FacultyNotesPage() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [selectedSem, setSelectedSem] = useState(1);
  const [uploads, setUploads] = useState({});
  const { toasts, add: addToast } = useToast();
  const pageRef = useRef(null);

  const {
    data: hubData,
    isLoading,
    isError,
    refetch: refetchHub,
  } = useQuery({
    queryKey: ["faculty-notes-hub"],
    queryFn: () => getFacultyNotesHub(),
    select: d => d.data.classes || [],
    staleTime: 60000,
  });

  const classes = hubData || [];

  useEffect(() => {
    if (classes.length && !selectedClass) {
      const first = classes[0];
      setSelectedClass(first.class_name);
      if (first.academic_years?.[0]) {
        const yr = first.academic_years[0];
        setSelectedYear(yr.year);
        setSelectedSem(yr.semesters?.[0]?.semester || 1);
      }
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (pageRef.current) {
      gsap.from(pageRef.current, { opacity: 0, y: 20, duration: 0.5, ease: "power3.out" });
    }
  }, []);

  const handleSelect = (className, year, sem) => {
    setSelectedClass(className);
    setSelectedYear(year);
    setSelectedSem(sem);
  };

  // Keyboard shortcut: N = new subject
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        // trigger new subject button
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (user?.role !== "FACULTY") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <BookMarked className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">Faculty Only</h3>
          <p className="text-sm text-[var(--text-muted)]">This page is only accessible to faculty members.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="notes-page-root">
      {/* Page header */}
      <div className="notes-page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-orange-400 flex items-center justify-center text-white shadow-md">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Notes & Docs</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Manage class resources, subjects, units and documents
            </p>
          </div>
        </div>
        <button
          onClick={() => refetchHub()}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading your classes…</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Failed to load data</p>
            <button onClick={() => refetchHub()} className="mt-2 text-xs text-[var(--primary)] hover:underline">Try again</button>
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No Classes Assigned</h3>
            <p className="text-xs text-[var(--text-muted)]">Ask the HOD to assign you to a class to start managing notes.</p>
          </div>
        </div>
      ) : (
        <div className="notes-two-panel-layout">
          {/* Left panel */}
          <aside className="notes-left-panel">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">My Classes</span>
            </div>
            <ClassNavigator
              classes={classes}
              selectedClass={selectedClass}
              selectedYear={selectedYear}
              selectedSem={selectedSem}
              onSelect={handleSelect}
            />
          </aside>

          {/* Divider */}
          <div className="notes-panel-divider" />

          {/* Right panel */}
          <SubjectsPanel
            classes={classes}
            selectedClass={selectedClass}
            selectedYear={selectedYear}
            selectedSem={selectedSem}
            addToast={addToast}
            refetchHub={refetchHub}
          />
        </div>
      )}

      {/* Upload progress bars */}
      <UploadProgressBar uploads={uploads} />

      {/* Toast notifications */}
      <div className="fixed top-20 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`notes-toast ${t.type === "error" ? "notes-toast-error" : "notes-toast-success"}`}>
            {t.type === "error" ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Check className="w-3.5 h-3.5 shrink-0" />}
            <span className="text-xs font-semibold">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
