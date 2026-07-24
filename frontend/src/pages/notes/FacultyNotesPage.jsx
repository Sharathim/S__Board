import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import {
  BookMarked, ChevronDown, Plus, Upload, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  Archive, ArchiveRestore, FolderOpen, BookOpen, Layers,
  RefreshCw, Download, AlertCircle, Sparkles, UploadCloud, BookPlus
} from "lucide-react";
import {
  getFacultyNotesHub, listUnits, createSubject, createUnit,
  uploadFiles, deleteFile, deleteSubject, deleteUnit,
  archiveSubject, unarchiveSubject
} from "../../api/notes";
import { useAuth } from "../../context/AuthContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  if (type === "pdf") return <FileText className="nd-file-icon nd-file-pdf" />;
  if (["ppt", "pptx"].includes(type)) return <Presentation className="nd-file-icon nd-file-ppt" />;
  return <File className="nd-file-icon nd-file-doc" />;
}

// ─── Toast System ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now().toString(36);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="nd-toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`nd-toast nd-toast-${t.type}`}>
          {t.type === "success" ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Inline Creator (press Enter to save) ────────────────────────────────────
function InlineCreator({ placeholder, onSave, onCancel }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => { if (val.trim()) { onSave(val.trim()); setVal(""); } };
  return (
    <div className="nd-inline-creator">
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        className="nd-inline-input"
      />
      <button onClick={submit} className="nd-btn-icon nd-btn-confirm" title="Save (Enter)">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="nd-btn-icon nd-btn-cancel" title="Cancel (Esc)">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────
function FileRow({ file, onDelete }) {
  return (
    <div className="nd-file-row group">
      {getFileIcon(file.file_type)}
      <span className="nd-file-name">{file.file_name}</span>
      <div className="nd-file-actions">
        <a href={file.file_url} target="_blank" rel="noreferrer" className="nd-btn-icon-sm" title="Download">
          <Download className="w-3 h-3" />
        </a>
        <button onClick={onDelete} className="nd-btn-icon-sm nd-btn-danger-sm" title="Delete file">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Unit Row ─────────────────────────────────────────────────────────────────
function UnitRow({ unit, className: cls, subjectId, onDelete, addToast, onRefreshHub }) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef(null);
  const rowRef = useRef(null);

  const loadFiles = useCallback(async () => {
    if (!expanded) return;
    setLoadingFiles(true);
    try {
      const res = await listUnits(cls, subjectId);
      const found = (res.data.units || []).find(u => u.id === unit.id);
      setFiles(found?.files || []);
    } finally { setLoadingFiles(false); }
  }, [cls, subjectId, unit.id, expanded]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const doUpload = useCallback(async (fileList) => {
    const valid = Array.from(fileList).filter(f =>
      ["pdf", "ppt", "pptx", "doc", "docx"].includes(f.name.split(".").pop().toLowerCase())
    );
    if (!valid.length) { addToast("Only PDF, PPT, PPTX, DOC, DOCX allowed.", "error"); return; }
    const fd = new FormData();
    valid.forEach(f => fd.append("files", f));
    setUploading(true); setUploadPct(0);
    try {
      await uploadFiles(cls, subjectId, unit.id, fd, evt => {
        if (evt.total) setUploadPct(Math.round(evt.loaded / evt.total * 100));
      });
      addToast(`${valid.length} file(s) uploaded!`);
      setExpanded(true);
      await loadFiles();
      onRefreshHub?.();
    } catch { addToast("Upload failed.", "error"); }
    finally { setUploading(false); }
  }, [cls, subjectId, unit.id, addToast, loadFiles, onRefreshHub]);

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteFile(cls, subjectId, unit.id, fileId);
      setFiles(p => p.filter(f => f.id !== fileId));
      addToast("File deleted.");
    } catch { addToast("Failed to delete file.", "error"); }
  };

  return (
    <div
      ref={rowRef}
      className={`nd-unit-row${isDragOver ? " nd-unit-drag" : ""}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); doUpload(e.dataTransfer.files); gsap.fromTo(rowRef.current, { scale: 0.98 }, { scale: 1, duration: 0.25, ease: "back.out(2)" }); }}
    >
      {/* Unit header */}
      <div className="nd-unit-header">
        <button className="nd-unit-toggle" onClick={() => setExpanded(v => !v)}>
          <div className={`nd-unit-icon${expanded ? " nd-unit-icon-active" : ""}`}>
            <Layers className="w-3 h-3" />
          </div>
          <span className="nd-unit-name">{unit.name}</span>
          <span className="nd-unit-meta">{unit.file_count ?? files.length} files</span>
          <ChevronDown className={`nd-chevron${expanded ? " rotate-180" : ""}`} />
        </button>
        <button onClick={() => fileRef.current?.click()} className="nd-upload-pill">
          <Upload className="w-3 h-3" />
          <span>Upload</span>
        </button>
        <button onClick={() => { if (window.confirm("Delete this unit and all its files?")) onDelete(); }} className="nd-btn-icon-sm nd-btn-danger-sm">
          <Trash2 className="w-3 h-3" />
        </button>
        <input ref={fileRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" className="hidden"
          onChange={e => { doUpload(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Drag hint */}
      {isDragOver && (
        <div className="nd-drag-hint">
          <UploadCloud className="w-4 h-4" />
          <span>Drop files here</span>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="nd-progress-bar-wrap">
          <div className="nd-progress-label">
            <span>Uploading…</span>
            <span>{uploadPct}%</span>
          </div>
          <div className="nd-progress-track">
            <div className="nd-progress-fill" style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {/* Files list */}
      {expanded && (
        <div className="nd-files-list">
          {loadingFiles ? (
            <div className="nd-loading-row"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Loading files…</span></div>
          ) : files.length === 0 ? (
            <div className="nd-empty-files">
              <UploadCloud className="w-4 h-4" />
              <span>No files — drag & drop or click Upload above</span>
            </div>
          ) : files.map(f => (
            <FileRow key={f.id} file={f} onDelete={() => handleDeleteFile(f.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, className: cls, colorIdx, onDelete, onArchive, addToast, refetchHub }) {
  const [expanded, setExpanded] = useState(false);
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const cardRef = useRef(null);

  const loadUnits = useCallback(async () => {
    if (!expanded) return;
    setLoadingUnits(true);
    try {
      const res = await listUnits(cls, subject.id);
      setUnits(res.data.units || []);
    } finally { setLoadingUnits(false); }
  }, [cls, subject.id, expanded]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  const handleAddUnit = async (name) => {
    try {
      const res = await createUnit(cls, subject.id, { name });
      setUnits(p => [...p, res.data.unit]);
      setAddingUnit(false);
      addToast(`Unit "${name}" created!`);
    } catch { addToast("Failed to create unit.", "error"); }
  };

  const handleDeleteUnit = async (unitId) => {
    try {
      await deleteUnit(cls, subject.id, unitId);
      setUnits(p => p.filter(u => u.id !== unitId));
      addToast("Unit deleted.");
      refetchHub();
    } catch { addToast("Failed.", "error"); }
  };

  const gradBg = CLASS_PALETTE[colorIdx % CLASS_PALETTE.length];

  return (
    <div ref={cardRef} className={`nd-subject-card${expanded ? " nd-subject-expanded" : ""}`}>
      {/* Card header */}
      <div className="nd-subject-header" onClick={() => setExpanded(v => !v)}>
        <div className={`nd-subject-icon bg-gradient-to-br ${gradBg}`}>
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div className="nd-subject-info">
          <div className="nd-subject-title-row">
            <h3 className="nd-subject-title">{subject.name}</h3>
            {subject.is_archived && <span className="nd-badge-archived">Archived</span>}
          </div>
          <p className="nd-subject-meta">{subject.unit_count} units · {subject.file_count} files</p>
        </div>
        <div className="nd-subject-actions" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onArchive(subject.id, subject.is_archived)}
            className="nd-btn-icon-sm"
            title={subject.is_archived ? "Restore" : "Archive"}
          >
            {subject.is_archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => { if (window.confirm(`Delete "${subject.name}" and all its content?`)) onDelete(subject.id); }}
            className="nd-btn-icon-sm nd-btn-danger-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className={`nd-chevron ml-1${expanded ? " rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="nd-subject-body">
          {loadingUnits ? (
            <div className="nd-loading-row"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Loading…</span></div>
          ) : (
            <>
              <div className="nd-units-list">
                {units.length === 0 && !addingUnit && (
                  <p className="nd-empty-units">No units yet — add one below</p>
                )}
                {units.map(u => (
                  <UnitRow
                    key={u.id}
                    unit={u}
                    className={cls}
                    subjectId={subject.id}
                    onDelete={() => handleDeleteUnit(u.id)}
                    addToast={addToast}
                    onRefreshHub={refetchHub}
                  />
                ))}
              </div>
              {addingUnit ? (
                <InlineCreator
                  placeholder="Unit name — e.g. Unit 1: Introduction"
                  onSave={handleAddUnit}
                  onCancel={() => setAddingUnit(false)}
                />
              ) : (
                <button className="nd-add-unit-btn" onClick={() => setAddingUnit(true)}>
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

// ─── New Subject Modal / Form ─────────────────────────────────────────────────
function NewSubjectForm({ className: cls, onDone, onCancel, addToast, defaultYear, defaultSem }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(defaultYear || CURRENT_ACADEMIC_YEAR);
  const [sem, setSem] = useState(defaultSem || 1);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { addToast("Enter a subject name.", "error"); return; }
    setSaving(true);
    try {
      await createSubject(cls, { name: name.trim(), academic_year: year, semester: sem });
      addToast(`"${name.trim()}" created!`);
      onDone();
    } catch (e) {
      addToast(e?.response?.data?.error || "Failed to create subject.", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="nd-new-subject-form">
      <div className="nd-nsf-header">
        <BookPlus className="w-4 h-4 text-[var(--primary)]" />
        <span className="nd-nsf-title">New Subject</span>
        <button onClick={onCancel} className="nd-btn-icon-sm ml-auto"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="nd-nsf-row">
        <div className="nd-nsf-field">
          <label className="nd-label">Academic Year</label>
          <input
            value={year}
            onChange={e => setYear(e.target.value)}
            placeholder="e.g. 2025-26"
            className="nd-input"
          />
        </div>
        <div className="nd-nsf-field">
          <label className="nd-label">Semester</label>
          <div className="nd-sem-toggle">
            {[1, 2].map(s => (
              <button key={s} onClick={() => setSem(s)}
                className={`nd-sem-btn${sem === s ? " nd-sem-btn-active" : ""}`}>
                Sem {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="nd-nsf-field">
        <label className="nd-label">Subject Name</label>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
          placeholder="e.g. Software Engineering"
          className="nd-input"
        />
      </div>
      <div className="nd-nsf-actions">
        <button onClick={onCancel} className="nd-btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="nd-btn-primary">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Create Subject"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FacultyNotesPage() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [selectedSem, setSelectedSem] = useState(1);
  const [addingSubject, setAddingSubject] = useState(false);
  const { toasts, add: addToast } = useToast();
  const pageRef = useRef(null);
  const panelRef = useRef(null);

  const { data: classes = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["faculty-notes-hub"],
    queryFn: () => getFacultyNotesHub(),
    select: d => d.data.classes || [],
    staleTime: 60000,
  });

  // Auto-select first class
  useEffect(() => {
    if (classes.length && !selectedClass) {
      const first = classes[0];
      setSelectedClass(first.class_name);
      const yr = first.academic_years?.[0];
      if (yr) { setSelectedYear(yr.year); setSelectedSem(yr.semesters?.[0]?.semester || 1); }
    }
  }, [classes, selectedClass]);

  // Page entrance
  useEffect(() => {
    if (pageRef.current) gsap.from(pageRef.current, { opacity: 0, y: 16, duration: 0.4, ease: "power3.out" });
  }, []);

  // Panel transition on selection change
  useEffect(() => {
    if (panelRef.current) gsap.from(panelRef.current, { opacity: 0, x: 12, duration: 0.3, ease: "power2.out" });
  }, [selectedClass, selectedYear, selectedSem]);

  const classData = classes.find(c => c.class_name === selectedClass);
  const yearData = classData?.academic_years.find(y => y.year === selectedYear);
  const semData = yearData?.semesters.find(s => s.semester === selectedSem);
  const subjects = semData?.subjects || [];

  const allYears = classData?.academic_years || [];
  const bothSems = yearData
    ? [1, 2].map(s => ({ sem: s, count: yearData.semesters.find(x => x.semester === s)?.subjects.length || 0 }))
    : [];

  const handleSelectClass = (cn) => {
    setSelectedClass(cn);
    setAddingSubject(false);
    const cd = classes.find(c => c.class_name === cn);
    const yr = cd?.academic_years?.[0];
    if (yr) { setSelectedYear(yr.year); setSelectedSem(yr.semesters?.[0]?.semester || 1); }
  };

  const handleDeleteSubject = async (id) => {
    try { await deleteSubject(selectedClass, id); addToast("Subject deleted."); refetch(); }
    catch { addToast("Failed to delete.", "error"); }
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
      <div className="nd-guard-msg">
        <BookMarked className="w-10 h-10 text-[var(--text-muted)]" />
        <p>This page is for Faculty only.</p>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="nd-root">

      {/* ── Page Header ── */}
      <div className="nd-page-header">
        <div className="nd-page-header-left">
          <div className="nd-page-icon">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="nd-page-title">Notes & Docs</h1>
            <p className="nd-page-subtitle">Manage class resources — subjects, units & documents</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="nd-btn-icon nd-btn-ghost" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="nd-state-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          <p>Loading your classes…</p>
        </div>
      ) : isError ? (
        <div className="nd-state-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p>Failed to load data</p>
          <button onClick={() => refetch()} className="nd-btn-primary nd-btn-sm">Retry</button>
        </div>
      ) : classes.length === 0 ? (
        <div className="nd-state-center">
          <Sparkles className="w-10 h-10 text-[var(--primary)] opacity-50" />
          <p className="font-semibold">No classes assigned</p>
          <p className="text-sm text-[var(--text-muted)]">Ask the HOD to assign you to a class.</p>
        </div>
      ) : (
        <div className="nd-workspace">

          {/* ── LEFT: Class Selector ── */}
          <aside className="nd-sidebar">
            <p className="nd-sidebar-label">My Classes</p>
            <div className="nd-class-list">
              {classes.map((cls, idx) => {
                const grad = CLASS_PALETTE[idx % CLASS_PALETTE.length];
                const active = cls.class_name === selectedClass;
                return (
                  <button
                    key={cls.class_name}
                    onClick={() => handleSelectClass(cls.class_name)}
                    className={`nd-class-btn${active ? " nd-class-btn-active" : ""}`}
                  >
                    <span className={`nd-class-avatar bg-gradient-to-br ${grad}`}>
                      {cls.class_name.split("_")[1]?.[0] || cls.class_name[0]}
                    </span>
                    <div className="nd-class-info">
                      <span className="nd-class-name">{cls.class_name.replace("_", " ")}</span>
                      {cls.is_incharge && <span className="nd-class-badge">Incharge</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── RIGHT: Subject Panel ── */}
          <main ref={panelRef} className="nd-panel">
            {!selectedClass ? (
              <div className="nd-state-center">
                <BookMarked className="w-10 h-10 text-[var(--text-muted)] opacity-40" />
                <p>Select a class to manage notes</p>
              </div>
            ) : (
              <>
                {/* Panel top bar */}
                <div className="nd-panel-topbar">
                  <div className="nd-panel-title-block">
                    <h2 className="nd-panel-class">{selectedClass.replace("_", " ")}</h2>
                    <p className="nd-panel-crumb">{selectedYear} · Semester {selectedSem}</p>
                  </div>
                  <button className="nd-btn-primary" onClick={() => setAddingSubject(v => !v)}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Subject</span>
                  </button>
                </div>

                {/* Year tabs */}
                {allYears.length > 0 && (
                  <div className="nd-year-tabs">
                    {allYears.map(yr => (
                      <button
                        key={yr.year}
                        onClick={() => { setSelectedYear(yr.year); setSelectedSem(yr.semesters?.[0]?.semester || 1); }}
                        className={`nd-year-tab${selectedYear === yr.year ? " nd-year-tab-active" : ""}`}
                      >
                        {yr.year}
                      </button>
                    ))}
                  </div>
                )}

                {/* Semester toggle */}
                <div className="nd-sem-strip">
                  {bothSems.map(({ sem, count }) => (
                    <button
                      key={sem}
                      onClick={() => setSelectedSem(sem)}
                      className={`nd-sem-pill${selectedSem === sem ? " nd-sem-pill-active" : ""}`}
                    >
                      Semester {sem}
                      <span className="nd-sem-count">{count}</span>
                    </button>
                  ))}
                </div>

                {/* New Subject Form — inline, not a modal */}
                {addingSubject && (
                  <NewSubjectForm
                    className={selectedClass}
                    defaultYear={selectedYear}
                    defaultSem={selectedSem}
                    addToast={addToast}
                    onDone={() => { setAddingSubject(false); refetch(); }}
                    onCancel={() => setAddingSubject(false)}
                  />
                )}

                {/* Subject list */}
                {subjects.length === 0 && !addingSubject ? (
                  <div className="nd-empty-state">
                    <FolderOpen className="w-10 h-10 text-[var(--text-muted)] opacity-40" />
                    <p className="font-semibold text-[var(--text-primary)]">No subjects for Semester {selectedSem}</p>
                    <p className="text-sm text-[var(--text-muted)]">Click "New Subject" above to add one.</p>
                  </div>
                ) : (
                  <div className="nd-subject-list">
                    {subjects.map((s, idx) => (
                      <SubjectCard
                        key={s.id}
                        subject={s}
                        className={selectedClass}
                        colorIdx={idx}
                        onDelete={handleDeleteSubject}
                        onArchive={handleArchiveSubject}
                        addToast={addToast}
                        refetchHub={refetch}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
