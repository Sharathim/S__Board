import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked, ChevronDown, Plus, Upload, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  Archive, ArchiveRestore, FolderOpen, BookOpen, Layers,
  RefreshCw, Download, AlertCircle, Sparkles, UploadCloud, BookPlus
} from "lucide-react";
import {
  getFacultyNotesHub, createSubject, createUnit, listUnits,
  uploadFiles, deleteFile, deleteSubject, deleteUnit,
  archiveSubject, unarchiveSubject
} from "../../../api/notes";
import { useAuth } from "../../../context/AuthContext";

const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const CLASS_PALETTE = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-600",
];

function getFileIcon(type) {
  if (type === "pdf") return <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  if (["ppt", "pptx"].includes(type)) return <Presentation className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
  return <File className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now().toString(36);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

// ─── Inline Input ─────────────────────────────────────────────────────────────
function MobileInput({ placeholder, onSave, onCancel }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="mnd-inline-row">
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) onSave(val.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        className="mnd-input flex-1"
      />
      <button onClick={() => val.trim() && onSave(val.trim())} className="mnd-icon-btn mnd-icon-confirm">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onCancel} className="mnd-icon-btn mnd-icon-cancel">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Mobile Unit Item ─────────────────────────────────────────────────────────
function MobileUnitItem({ unit, className: cls, subjectId, onDelete, addToast, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef(null);

  const loadFiles = useCallback(async () => {
    if (!expanded) return;
    setLoading(true);
    try {
      const res = await listUnits(cls, subjectId);
      const found = (res.data.units || []).find(u => u.id === unit.id);
      setFiles(found?.files || []);
    } finally { setLoading(false); }
  }, [cls, subjectId, unit.id, expanded]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const doUpload = async (fileList) => {
    const valid = Array.from(fileList).filter(f =>
      ["pdf", "ppt", "pptx", "doc", "docx"].includes(f.name.split(".").pop().toLowerCase())
    );
    if (!valid.length) { addToast("Only PDF, PPT, PPTX, DOC, DOCX.", "error"); return; }
    const fd = new FormData();
    valid.forEach(f => fd.append("files", f));
    setUploading(true); setUploadPct(0);
    try {
      await uploadFiles(cls, subjectId, unit.id, fd, evt => {
        if (evt.total) setUploadPct(Math.round(evt.loaded / evt.total * 100));
      });
      addToast(`${valid.length} file(s) uploaded!`);
      setExpanded(true);
      onRefresh?.();
      await loadFiles();
    } catch { addToast("Upload failed.", "error"); }
    finally { setUploading(false); }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteFile(cls, subjectId, unit.id, fileId);
      setFiles(p => p.filter(f => f.id !== fileId));
    } catch { addToast("Failed.", "error"); }
  };

  return (
    <div className="mnd-unit-card">
      {/* Header */}
      <div className="mnd-unit-header">
        <button className="mnd-unit-toggle" onClick={() => setExpanded(v => !v)}>
          <Layers className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="mnd-unit-name">{unit.name}</span>
          <span className="mnd-unit-count">{unit.file_count ?? files.length}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform${expanded ? " rotate-180" : ""}`} />
        </button>
        <button onClick={() => fileRef.current?.click()} className="mnd-icon-btn mnd-icon-upload" title="Upload">
          <Upload className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { if (window.confirm("Delete unit?")) onDelete(); }} className="mnd-icon-btn mnd-icon-danger">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <input ref={fileRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" className="hidden"
          onChange={e => { doUpload(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mnd-progress-wrap">
          <div className="mnd-progress-label">
            <span>Uploading…</span><span className="font-bold text-[var(--primary)]">{uploadPct}%</span>
          </div>
          <div className="mnd-progress-track">
            <div className="mnd-progress-fill" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {/* Files */}
      {expanded && (
        <div className="mnd-files-wrap">
          {loading ? (
            <div className="mnd-loading"><Loader2 className="w-3 h-3 animate-spin" /><span>Loading…</span></div>
          ) : files.length === 0 ? (
            <p className="mnd-empty-files">No files yet — tap Upload above</p>
          ) : files.map(f => (
            <div key={f.id} className="mnd-file-row">
              {getFileIcon(f.file_type)}
              <span className="mnd-file-name">{f.file_name}</span>
              <a href={f.file_url} target="_blank" rel="noreferrer" className="mnd-icon-btn">
                <Download className="w-3 h-3" />
              </a>
              <button onClick={() => handleDeleteFile(f.id)} className="mnd-icon-btn mnd-icon-danger">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Subject Card ──────────────────────────────────────────────────────
function MobileSubjectCard({ subject, className: cls, colorIdx, onDelete, onArchive, addToast, refetch }) {
  const [expanded, setExpanded] = useState(false);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);

  const loadUnits = useCallback(async () => {
    if (!expanded) return;
    setLoading(true);
    try {
      const res = await listUnits(cls, subject.id);
      setUnits(res.data.units || []);
    } finally { setLoading(false); }
  }, [cls, subject.id, expanded]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const handleAddUnit = async (name) => {
    try {
      const res = await createUnit(cls, subject.id, { name });
      setUnits(p => [...p, res.data.unit]);
      setAddingUnit(false);
      addToast(`Unit "${name}" created!`);
    } catch { addToast("Failed.", "error"); }
  };

  const handleDeleteUnit = async (unitId) => {
    try {
      await deleteUnit(cls, subject.id, unitId);
      setUnits(p => p.filter(u => u.id !== unitId));
      refetch();
    } catch { addToast("Failed.", "error"); }
  };

  const grad = CLASS_PALETTE[colorIdx % CLASS_PALETTE.length];

  return (
    <div className="mnd-subject-card">
      {/* Header */}
      <div className="mnd-subject-header" onClick={() => setExpanded(v => !v)}>
        <div className={`mnd-subject-icon bg-gradient-to-br ${grad}`}>
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div className="mnd-subject-info">
          <p className="mnd-subject-name">{subject.name}</p>
          <p className="mnd-subject-meta">{subject.unit_count} units · {subject.file_count} files</p>
        </div>
        <div className="mnd-subject-actions" onClick={e => e.stopPropagation()}>
          <button className="mnd-icon-btn" onClick={() => onArchive(subject.id, subject.is_archived)}>
            {subject.is_archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
          <button className="mnd-icon-btn mnd-icon-danger" onClick={() => { if (window.confirm(`Delete "${subject.name}"?`)) onDelete(subject.id); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform${expanded ? " rotate-180" : ""}`} />
      </div>

      {/* Body */}
      {expanded && (
        <div className="mnd-subject-body">
          {loading ? (
            <div className="mnd-loading"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Loading units…</span></div>
          ) : (
            <>
              {units.length === 0 && !addingUnit && (
                <p className="mnd-empty-units">No units yet.</p>
              )}
              {units.map(u => (
                <MobileUnitItem
                  key={u.id}
                  unit={u}
                  className={cls}
                  subjectId={subject.id}
                  onDelete={() => handleDeleteUnit(u.id)}
                  addToast={addToast}
                  onRefresh={refetch}
                />
              ))}
              {addingUnit ? (
                <MobileInput
                  placeholder="Unit name…"
                  onSave={handleAddUnit}
                  onCancel={() => setAddingUnit(false)}
                />
              ) : (
                <button className="mnd-add-unit-btn" onClick={() => setAddingUnit(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add unit</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Subject Sheet (slide up) ────────────────────────────────────────────
function NewSubjectSheet({ className: cls, defaultYear, defaultSem, onDone, onCancel, addToast }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(defaultYear || CURRENT_ACADEMIC_YEAR);
  const [sem, setSem] = useState(defaultSem || 1);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  const handleSave = async () => {
    if (!name.trim()) { addToast("Enter a subject name.", "error"); return; }
    setSaving(true);
    try {
      await createSubject(cls, { name: name.trim(), academic_year: year, semester: sem });
      addToast(`"${name.trim()}" created!`);
      onDone();
    } catch (e) {
      addToast(e?.response?.data?.error || "Failed.", "error");
    } finally { setSaving(false); }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="mnd-sheet-backdrop" onClick={onCancel} />
      {/* Sheet */}
      <div className="mnd-sheet">
        <div className="mnd-sheet-handle" />
        <div className="mnd-sheet-header">
          <BookPlus className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="mnd-sheet-title">New Subject</h2>
          <button onClick={onCancel} className="mnd-icon-btn ml-auto"><X className="w-4 h-4" /></button>
        </div>

        <div className="mnd-sheet-body">
          <div className="mnd-field">
            <label className="mnd-label">Academic Year</label>
            <input value={year} onChange={e => setYear(e.target.value)}
              placeholder="e.g. 2025-26" className="mnd-input" />
          </div>
          <div className="mnd-field">
            <label className="mnd-label">Semester</label>
            <div className="mnd-sem-row">
              {[1, 2].map(s => (
                <button key={s} onClick={() => setSem(s)}
                  className={`mnd-sem-btn${sem === s ? " mnd-sem-btn-active" : ""}`}>
                  Semester {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mnd-field">
            <label className="mnd-label">Subject Name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              placeholder="e.g. Software Engineering"
              className="mnd-input"
            />
          </div>
          <div className="mnd-sheet-actions">
            <button onClick={onCancel} className="mnd-btn-outline flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="mnd-btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Mobile Page ─────────────────────────────────────────────────────────
export default function MobileFacultyNotesPage() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [selectedSem, setSelectedSem] = useState(1);
  const [addingSubject, setAddingSubject] = useState(false);
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
      const yr = first.academic_years?.[0];
      if (yr) { setSelectedYear(yr.year); setSelectedSem(yr.semesters?.[0]?.semester || 1); }
    }
  }, [classes, selectedClass]);

  const classData = classes.find(c => c.class_name === selectedClass);
  const allYears = classData?.academic_years || [];
  const yearData = allYears.find(y => y.year === selectedYear);
  const bothSems = yearData
    ? [1, 2].map(s => ({ sem: s, count: yearData.semesters.find(x => x.semester === s)?.subjects.length || 0 }))
    : [{ sem: 1, count: 0 }, { sem: 2, count: 0 }];
  const semData = yearData?.semesters.find(s => s.semester === selectedSem);
  const subjects = semData?.subjects || [];

  const handleSelectClass = (cn) => {
    setSelectedClass(cn);
    setAddingSubject(false);
    const cd = classes.find(c => c.class_name === cn);
    const yr = cd?.academic_years?.[0];
    if (yr) { setSelectedYear(yr.year); setSelectedSem(yr.semesters?.[0]?.semester || 1); }
  };

  const handleDeleteSubject = async (id) => {
    try { await deleteSubject(selectedClass, id); addToast("Deleted."); refetch(); }
    catch { addToast("Failed.", "error"); }
  };

  const handleArchiveSubject = async (id, isArchived) => {
    try {
      if (isArchived) { await unarchiveSubject(selectedClass, id); addToast("Restored."); }
      else { await archiveSubject(selectedClass, id); addToast("Archived."); }
      refetch();
    } catch { addToast("Failed.", "error"); }
  };

  if (user?.role !== "FACULTY") {
    return (
      <div className="mnd-guard">
        <BookMarked className="w-10 h-10 text-[var(--text-muted)]" />
        <p>Faculty only</p>
      </div>
    );
  }

  return (
    <div className="mnd-root">

      {/* ── Header ── */}
      <div className="mnd-header">
        <div className="mnd-header-left">
          <div className="mnd-header-icon">
            <BookMarked className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="mnd-header-title">Notes & Docs</h1>
            <p className="mnd-header-sub">Manage class resources</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="mnd-icon-btn">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="mnd-state">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          <p>Loading…</p>
        </div>
      ) : isError ? (
        <div className="mnd-state">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p>Failed to load</p>
          <button onClick={() => refetch()} className="mnd-btn-primary mnd-btn-sm">Retry</button>
        </div>
      ) : classes.length === 0 ? (
        <div className="mnd-state">
          <Sparkles className="w-10 h-10 text-[var(--primary)] opacity-50" />
          <p className="font-semibold">No classes assigned</p>
        </div>
      ) : (
        <>
          {/* Class chips */}
          <div className="mnd-chip-scroll">
            {classes.map((cls, idx) => {
              const grad = CLASS_PALETTE[idx % CLASS_PALETTE.length];
              const active = cls.class_name === selectedClass;
              return (
                <button
                  key={cls.class_name}
                  onClick={() => handleSelectClass(cls.class_name)}
                  className={`mnd-class-chip${active ? " mnd-class-chip-active" : ""}`}
                >
                  <span className={`mnd-chip-dot bg-gradient-to-br ${grad}`} />
                  {cls.class_name.replace("_", " ")}
                  {cls.is_incharge && <span className="mnd-chip-star">★</span>}
                </button>
              );
            })}
          </div>

          {/* Year tabs */}
          {allYears.length > 0 && (
            <div className="mnd-year-scroll">
              {allYears.map(yr => (
                <button
                  key={yr.year}
                  onClick={() => { setSelectedYear(yr.year); setSelectedSem(yr.semesters?.[0]?.semester || 1); }}
                  className={`mnd-year-chip${selectedYear === yr.year ? " mnd-year-chip-active" : ""}`}
                >
                  {yr.year}
                </button>
              ))}
            </div>
          )}

          {/* Semester toggle */}
          <div className="mnd-sem-toggle-row">
            {bothSems.map(({ sem, count }) => (
              <button
                key={sem}
                onClick={() => setSelectedSem(sem)}
                className={`mnd-sem-tile${selectedSem === sem ? " mnd-sem-tile-active" : ""}`}
              >
                <span className="mnd-sem-label">Semester {sem}</span>
                <span className="mnd-sem-badge">{count} subjects</span>
              </button>
            ))}
          </div>

          {/* Add subject button */}
          <button className="mnd-add-subject-btn" onClick={() => setAddingSubject(true)}>
            <BookPlus className="w-4 h-4" />
            <span>New Subject</span>
          </button>

          {/* Subject list */}
          {subjects.length === 0 ? (
            <div className="mnd-empty">
              <FolderOpen className="w-10 h-10 text-[var(--text-muted)] opacity-40" />
              <p className="font-semibold text-[var(--text-primary)]">No subjects for Semester {selectedSem}</p>
              <p className="text-sm text-[var(--text-muted)]">Tap "New Subject" above.</p>
            </div>
          ) : (
            <div className="mnd-subject-list">
              {subjects.map((s, idx) => (
                <MobileSubjectCard
                  key={s.id}
                  subject={s}
                  className={selectedClass}
                  colorIdx={idx}
                  onDelete={handleDeleteSubject}
                  onArchive={handleArchiveSubject}
                  addToast={addToast}
                  refetch={refetch}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* New Subject Sheet */}
      {addingSubject && (
        <NewSubjectSheet
          className={selectedClass}
          defaultYear={selectedYear}
          defaultSem={selectedSem}
          addToast={addToast}
          onDone={() => { setAddingSubject(false); refetch(); }}
          onCancel={() => setAddingSubject(false)}
        />
      )}

      {/* Toasts — fixed above bottom tab bar */}
      <div className="mnd-toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`mnd-toast${t.type === "error" ? " mnd-toast-error" : " mnd-toast-success"}`}>
            {t.type === "success" ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
