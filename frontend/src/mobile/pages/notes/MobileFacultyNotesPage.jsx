import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked, ChevronDown, ChevronRight, Plus, Upload, Trash2,
  FileText, File, Presentation, X, Check, Loader2, Archive,
  ArchiveRestore, FolderOpen, BookOpen, Layers, AlertCircle,
  UploadCloud, BookPlus, Sparkles, Download, RefreshCw
} from "lucide-react";
import {
  getFacultyNotesHub, createSubject, createUnit,
  uploadFiles, deleteFile, deleteSubject, deleteUnit,
  archiveSubject, unarchiveSubject, listUnits
} from "../../../api/notes";
import { useAuth } from "../../../context/AuthContext";

const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(type) {
  if (type === "pdf") return <FileText className="w-3.5 h-3.5 text-red-500" />;
  if (type === "ppt" || type === "pptx") return <Presentation className="w-3.5 h-3.5 text-orange-500" />;
  return <File className="w-3.5 h-3.5 text-blue-500" />;
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

// ─── Mobile Inline Input ──────────────────────────────────────────────────────
function MobileInlineInput({ placeholder, onSave, onCancel }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex gap-2 items-center mt-2">
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && val.trim()) { onSave(val.trim()); }
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 text-sm px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] transition-all"
      />
      <button
        onClick={() => val.trim() && onSave(val.trim())}
        className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={onCancel}
        className="w-9 h-9 rounded-xl bg-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Mobile Unit Item ─────────────────────────────────────────────────────────
function MobileUnitItem({ unit, className: cn, subjectId, onDelete, addToast, onUploadDone }) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef(null);

  const loadFiles = useCallback(async () => {
    if (!expanded) return;
    setLoading(true);
    try {
      const res = await listUnits(cn, subjectId);
      const found = (res.data.units || []).find(u => u.id === unit.id);
      setFiles(found?.files || []);
    } finally { setLoading(false); }
  }, [cn, subjectId, unit.id, expanded]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const doUpload = async (fileList) => {
    const valid = Array.from(fileList).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["pdf", "ppt", "pptx", "doc", "docx"].includes(ext);
    });
    if (!valid.length) { addToast("Only PDF, PPT, PPTX, DOC, DOCX allowed.", "error"); return; }
    const fd = new FormData();
    valid.forEach(f => fd.append("files", f));
    setUploading(true); setUploadPct(0);
    try {
      await uploadFiles(cn, subjectId, unit.id, fd, (evt) => {
        if (evt.total) setUploadPct(Math.round(evt.loaded / evt.total * 100));
      });
      addToast(`${valid.length} file(s) uploaded!`);
      setExpanded(true);
      loadFiles();
      onUploadDone?.();
    } catch { addToast("Upload failed.", "error"); }
    finally { setUploading(false); }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteFile(cn, subjectId, unit.id, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      addToast("File removed.");
    } catch { addToast("Failed to remove file.", "error"); }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Unit header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Layers className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 text-left text-sm font-semibold text-[var(--text-primary)] truncate"
        >
          {unit.name}
        </button>
        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{unit.file_count ?? files.length}f</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mobile-tappable w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0"
          title="Upload"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { if (window.confirm("Delete this unit?")) onDelete(); }}
          className="mobile-tappable w-8 h-8 rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 flex items-center justify-center shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" className="hidden"
          onChange={e => { doUpload(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="px-3 pb-2">
          <div className="flex justify-between text-[10px] font-semibold text-[var(--primary)] mb-1">
            <span>Uploading…</span><span>{uploadPct}%</span>
          </div>
          <div className="h-1.5 bg-[var(--primary-light)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {/* Files list */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)]">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-[var(--text-muted)]">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          ) : files.length === 0 ? (
            <div className="p-3 text-xs text-[var(--text-muted)]">No files yet.</div>
          ) : (
            files.map(f => (
              <div key={f.id} className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] last:border-b-0">
                {getFileIcon(f.file_type)}
                <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate">{f.file_name}</span>
                <a href={f.file_url} target="_blank" rel="noreferrer" className="mobile-tappable w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)]">
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => handleDeleteFile(f.id)} className="mobile-tappable w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Subject Card ──────────────────────────────────────────────────────
function MobileSubjectCard({ subject, className: cn, onDelete, onArchive, addToast, refetchHub }) {
  const [expanded, setExpanded] = useState(false);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);

  const loadUnits = useCallback(async () => {
    if (!expanded) return;
    setLoading(true);
    try {
      const res = await listUnits(cn, subject.id);
      setUnits(res.data.units || []);
    } finally { setLoading(false); }
  }, [cn, subject.id, expanded]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const handleAddUnit = async (name) => {
    try {
      const res = await createUnit(cn, subject.id, { name });
      setUnits(p => [...p, res.data.unit]);
      setAddingUnit(false);
      addToast(`Unit "${name}" created!`);
    } catch { addToast("Failed to create unit.", "error"); }
  };

  const handleDeleteUnit = async (unitId) => {
    try {
      await deleteUnit(cn, subject.id, unitId);
      setUnits(p => p.filter(u => u.id !== unitId));
      addToast("Unit deleted.");
      refetchHub();
    } catch { addToast("Failed to delete unit.", "error"); }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="mobile-tappable flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-orange-400 flex items-center justify-center text-white shrink-0 shadow-sm">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{subject.name}</p>
          <p className="text-xs text-[var(--text-muted)]">{subject.unit_count} units · {subject.file_count} files</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onArchive(subject.id, subject.is_archived); }}
            className="mobile-tappable w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)]">
            {subject.is_archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
          <button onClick={e => { e.stopPropagation(); if (window.confirm("Delete subject?")) onDelete(subject.id); }}
            className="mobile-tappable w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded units */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-3 py-3 space-y-2 bg-[var(--surface-secondary)]">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] p-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading units…
            </div>
          ) : (
            units.map(unit => (
              <MobileUnitItem
                key={unit.id}
                unit={unit}
                className={cn}
                subjectId={subject.id}
                onDelete={() => handleDeleteUnit(unit.id)}
                addToast={addToast}
                onUploadDone={refetchHub}
              />
            ))
          )}
          {units.length === 0 && !loading && !addingUnit && (
            <p className="text-xs text-[var(--text-muted)] px-1">No units yet.</p>
          )}
          {addingUnit ? (
            <MobileInlineInput
              placeholder="Unit name…"
              onSave={handleAddUnit}
              onCancel={() => setAddingUnit(false)}
            />
          ) : (
            <button
              onClick={() => setAddingUnit(true)}
              className="mobile-tappable flex items-center gap-2 text-xs font-bold text-[var(--primary)] px-1 py-1.5 rounded-lg hover:bg-[var(--primary-light)] w-full"
            >
              <Plus className="w-3.5 h-3.5" /> Add unit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Mobile Page ─────────────────────────────────────────────────────────
export default function MobileFacultyNotesPage() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [selectedSem, setSelectedSem] = useState(1);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectYear, setNewSubjectYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [newSubjectSem, setNewSubjectSem] = useState(1);
  const { toasts, add: addToast } = useToast();

  const { data: classes = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["faculty-notes-hub"],
    queryFn: () => getFacultyNotesHub(),
    select: d => d.data.classes || [],
    staleTime: 60000,
  });

  useEffect(() => {
    if (classes.length && !selectedClass) {
      const first = classes[0];
      setSelectedClass(first.class_name);
      if (first.academic_years?.[0]) {
        setSelectedYear(first.academic_years[0].year);
        setSelectedSem(first.academic_years[0].semesters?.[0]?.semester || 1);
      }
    }
  }, [classes, selectedClass]);

  const classData = classes.find(c => c.class_name === selectedClass);
  const yearData = classData?.academic_years.find(y => y.year === selectedYear);
  const semData = yearData?.semesters.find(s => s.semester === selectedSem);
  const subjects = semData?.subjects || [];

  const handleAddSubject = async (name) => {
    try {
      await createSubject(selectedClass, { name, academic_year: newSubjectYear, semester: newSubjectSem });
      setAddingSubject(false);
      addToast(`Subject "${name}" created!`);
      refetch();
    } catch (e) {
      addToast(e?.response?.data?.error || "Failed.", "error");
    }
  };

  const handleDelete = async (id) => {
    try { await deleteSubject(selectedClass, id); addToast("Deleted."); refetch(); }
    catch { addToast("Failed to delete.", "error"); }
  };

  const handleArchive = async (id, isArchived) => {
    try {
      if (isArchived) { await unarchiveSubject(selectedClass, id); addToast("Restored."); }
      else { await archiveSubject(selectedClass, id); addToast("Archived."); }
      refetch();
    } catch { addToast("Failed.", "error"); }
  };

  if (user?.role !== "FACULTY") {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-center px-6">
        <div>
          <BookMarked className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm font-bold text-[var(--text-primary)]">Faculty Only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Page title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-orange-400 flex items-center justify-center text-white shadow-sm">
            <BookMarked className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-base font-black text-[var(--text-primary)]">Notes & Docs</h1>
            <p className="text-[11px] text-[var(--text-muted)]">Manage class resources</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="mobile-tappable w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] bg-[var(--border)]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px] gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        </div>
      ) : isError ? (
        <div className="text-center py-10">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Failed to load</p>
          <button onClick={() => refetch()} className="text-xs text-[var(--primary)] mt-1">Retry</button>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-10">
          <Sparkles className="w-10 h-10 text-[var(--primary)] mx-auto mb-2 opacity-60" />
          <p className="text-sm font-bold text-[var(--text-primary)]">No classes assigned</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Ask the HOD to assign you.</p>
        </div>
      ) : (
        <>
          {/* Horizontal class chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 scrollbar-hide">
            {classes.map((cls) => (
              <button
                key={cls.class_name}
                onClick={() => {
                  setSelectedClass(cls.class_name);
                  if (cls.academic_years?.[0]) {
                    setSelectedYear(cls.academic_years[0].year);
                    setSelectedSem(cls.academic_years[0].semesters?.[0]?.semester || 1);
                  }
                }}
                className={`mobile-tappable shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedClass === cls.class_name
                    ? "bg-[var(--text-primary)] text-white shadow-sm"
                    : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]"
                }`}
              >
                {cls.class_name.replace("_", " ")}
                {cls.is_incharge && <span className="ml-1 text-[9px] opacity-70">★</span>}
              </button>
            ))}
          </div>

          {/* Year selector */}
          {classData && classData.academic_years.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-4 px-4 scrollbar-hide">
              {classData.academic_years.map(yr => (
                <button
                  key={yr.year}
                  onClick={() => { setSelectedYear(yr.year); setSelectedSem(yr.semesters?.[0]?.semester || 1); }}
                  className={`mobile-tappable shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedYear === yr.year
                      ? "bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]"
                      : "bg-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  {yr.year}
                </button>
              ))}
            </div>
          )}

          {/* Semester toggle */}
          {yearData && (
            <div className="flex gap-2 mb-4">
              {[1, 2].map(sem => (
                <button
                  key={sem}
                  onClick={() => setSelectedSem(sem)}
                  className={`mobile-tappable flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    selectedSem === sem
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  Semester {sem}
                  {yearData.semesters.find(s => s.semester === sem) && (
                    <span className="ml-1 text-[11px] opacity-70">
                      ({yearData.semesters.find(s => s.semester === sem)?.subjects.length || 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Add Subject button */}
          <button
            onClick={() => setAddingSubject(true)}
            className="mobile-tappable w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[var(--primary)] text-[var(--primary)] text-sm font-bold bg-[var(--primary-light)] mb-4 hover:bg-[var(--primary-soft)] transition-colors"
          >
            <BookPlus className="w-4 h-4" /> New Subject
          </button>

          {/* Add subject form */}
          {addingSubject && (
            <div className="rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary-light)] p-4 mb-4 space-y-3 animate-fade-in">
              <p className="text-xs font-bold text-[var(--primary)]">New Subject</p>
              <input
                value={newSubjectYear}
                onChange={e => setNewSubjectYear(e.target.value)}
                placeholder="Academic Year (2025-26)"
                className="w-full text-sm px-3 py-2 rounded-xl border border-[var(--border)] bg-white dark:bg-slate-900 text-[var(--text-primary)] outline-none"
              />
              <div className="flex gap-2">
                {[1, 2].map(s => (
                  <button
                    key={s}
                    onClick={() => setNewSubjectSem(s)}
                    className={`mobile-tappable flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      newSubjectSem === s ? "bg-[var(--primary)] text-white" : "bg-white dark:bg-slate-900 border border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    Sem {s}
                  </button>
                ))}
              </div>
              <MobileInlineInput
                placeholder="Subject name…"
                onSave={handleAddSubject}
                onCancel={() => setAddingSubject(false)}
              />
            </div>
          )}

          {/* Subjects list */}
          {subjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No subjects for Sem {selectedSem}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Tap "New Subject" to add one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map(subj => (
                <MobileSubjectCard
                  key={subj.id}
                  subject={subj}
                  className={selectedClass}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  addToast={addToast}
                  refetchHub={refetch}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Toast */}
      <div className="fixed bottom-24 left-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-xs font-semibold ${t.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
            {t.type === "error" ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Check className="w-3.5 h-3.5 shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
