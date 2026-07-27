import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import {
  BookMarked, ChevronDown, ChevronRight, Plus, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  FolderOpen, Download, AlertCircle, UploadCloud, Eye, Search
} from "lucide-react";
import {
  getAllNotes, createSubject, createUnit, uploadFiles,
  deleteFile, deleteSubject, deleteUnit
} from "../../../api/notes";
import { useAuth } from "../../../context/AuthContext";
import MobileFAB from "../../components/MobileFAB";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const UNIT_OPTIONS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];

function getFileIcon(type) {
  if (type === "pdf") return <FileText className="w-4 h-4 text-rose-500" />;
  if (["ppt", "pptx"].includes(type)) return <Presentation className="w-4 h-4 text-orange-500" />;
  return <File className="w-4 h-4 text-blue-500" />;
}

function getPreviewUrl(file) {
  const url = file.file_url;
  const ext = file.file_type?.toLowerCase();
  if (ext === "pdf") return url;
  if (["doc", "docx", "ppt", "pptx"].includes(ext)) {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  }
  return url;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
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
    <div className="mnd-toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`mnd-toast mnd-toast-${t.type}`}>
          {t.type === "success" ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────────
function BottomSheetModal({ open, onClose, title, children }) {
  const sheetRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open && sheetRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(sheetRef.current, { y: "100%" }, { y: "0%", duration: 0.35, ease: "power3.out" });
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (sheetRef.current && overlayRef.current) {
      gsap.to(sheetRef.current, { y: "100%", duration: 0.25, ease: "power2.in" });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, onComplete: onClose });
    } else {
      onClose();
    }
  };

  return (
    <div className="mnd-sheet-overlay" ref={overlayRef} onClick={handleClose}>
      <div className="mnd-sheet" ref={sheetRef} onClick={e => e.stopPropagation()}>
        <div className="mnd-sheet-handle" />
        <div className="mnd-sheet-header">
          <h3 className="mnd-sheet-title">{title}</h3>
          <button className="mnd-sheet-close" onClick={handleClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="mnd-sheet-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Upload Sheet ────────────────────────────────────────────────────────────
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
    <BottomSheetModal open={open} onClose={onClose} title="Upload Notes">
      {/* Class */}
      <div className="mnd-form-group">
        <label className="mnd-form-label">Class</label>
        <select className="mnd-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
          <option value="">Select class...</option>
          {targetClasses.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
      </div>

      {/* Subject */}
      {selectedClass && (
        <div className="mnd-form-group">
          <label className="mnd-form-label">Subject</label>
          {classSubjects.length > 0 && (
            <div className="mnd-toggle-row">
              <button className={`mnd-toggle-btn ${subjectMode === "existing" ? "active" : ""}`} onClick={() => setSubjectMode("existing")}>Existing</button>
              <button className={`mnd-toggle-btn ${subjectMode === "new" ? "active" : ""}`} onClick={() => setSubjectMode("new")}>New</button>
            </div>
          )}
          {subjectMode === "existing" ? (
            <select className="mnd-select" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
              <option value="">Select subject...</option>
              {classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <input className="mnd-input" placeholder="Enter new subject name..." value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
          )}
        </div>
      )}

      {/* Unit */}
      {selectedClass && (
        <div className="mnd-form-group">
          <label className="mnd-form-label">Unit</label>
          <select className="mnd-select" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
            <option value="">Select unit...</option>
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}

      {/* Files */}
      {selectedClass && (
        <div className="mnd-form-group">
          <label className="mnd-form-label">Files</label>
          <button className="mnd-file-btn" onClick={() => fileRef.current?.click()}>
            <UploadCloud className="w-5 h-5" />
            <span>Select Files (PDF, PPT, DOC)</span>
          </button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={handleFileChange} className="hidden" />
          {files.length > 0 && (
            <div className="mnd-file-chips">
              {files.map((f, i) => (
                <div key={i} className="mnd-file-chip">
                  <span>{f.name.length > 20 ? f.name.substring(0, 18) + "..." : f.name}</span>
                  <button onClick={() => removeFile(i)}><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {uploading && progress > 0 && (
        <div className="mnd-progress">
          <div className="mnd-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Actions */}
      <div className="mnd-sheet-actions">
        <button className="mnd-btn mnd-btn-ghost" onClick={onClose} disabled={uploading}>Cancel</button>
        <button className="mnd-btn mnd-btn-primary" onClick={handleUpload} disabled={uploading}>
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><UploadCloud className="w-4 h-4" /> Upload</>}
        </button>
      </div>
    </BottomSheetModal>
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
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const isStaff = user?.role === "FACULTY" || user?.role === "HOD";

  const { data, isLoading, error } = useQuery({
    queryKey: ["notes-all"],
    queryFn: () => getAllNotes().then(r => r.data),
    staleTime: 30000,
  });

  const classes = data?.classes || [];
  const targetClasses = data?.target_classes || [];
  const allSubjects = classes.flatMap(c => c.subjects.map(s => ({ ...s, class_name: c.class_name })));

  const toggleSubject = (id) => setExpandedSubjects(p => ({ ...p, [id]: !p[id] }));
  const toggleUnit = (id) => setExpandedUnits(p => ({ ...p, [id]: !p[id] }));

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

  const filterClasses = () => {
    if (!searchQuery.trim()) return classes;
    const q = searchQuery.toLowerCase();
    return classes.map(c => ({
      ...c,
      subjects: c.subjects.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.units.some(u => u.name.toLowerCase().includes(q)) ||
        s.units.some(u => u.files.some(f => f.file_name.toLowerCase().includes(q)))
      )
    })).filter(c => c.subjects.length > 0);
  };

  const filteredClasses = filterClasses();

  return (
    <div className="mnd-root">
      <ToastStack toasts={toast.toasts} />

      {/* Header */}
      <div className="mnd-header">
        <div className="mnd-header-top">
          <div className="mnd-header-icon">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="mnd-header-title">Notes & Docs</h1>
            <p className="mnd-header-sub">{isStaff ? "Manage study materials" : "Your class materials"}</p>
          </div>
        </div>
        <div className="mnd-search-wrap">
          <Search className="w-4 h-4 mnd-search-icon" />
          <input
            className="mnd-search-input"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="mnd-content">
        {isLoading ? (
          <div className="mnd-empty">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <p>Loading notes...</p>
          </div>
        ) : error ? (
          <div className="mnd-empty">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p>Failed to load notes</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="mnd-empty">
            <FolderOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            <p className="mnd-empty-title">No notes yet</p>
            <p className="mnd-empty-sub">
              {isStaff ? "Tap + to upload notes" : "No notes uploaded for your class yet"}
            </p>
          </div>
        ) : (
          filteredClasses.map(cls => (
            <div key={cls.class_name} className="mnd-class-section">
              <div className="mnd-class-label">
                <span className="mnd-class-tag">{cls.class_name.replace("_", " ")}</span>
                <span className="mnd-class-count">{cls.subjects.length} subject{cls.subjects.length !== 1 ? "s" : ""}</span>
              </div>

              {cls.subjects.map(subject => (
                <div key={subject.id} className="mnd-subject-card">
                  <div className="mnd-subject-header" onClick={() => toggleSubject(subject.id)}>
                    <div className="mnd-subject-left">
                      {expandedSubjects[subject.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <BookMarked className="w-4 h-4 text-primary-500" />
                      <span className="mnd-subject-name">{subject.name}</span>
                    </div>
                    <div className="mnd-subject-right" onClick={e => e.stopPropagation()}>
                      <span className="mnd-badge">{subject.units.length}u</span>
                      {canDeleteItem(subject) && (
                        <button className="mnd-icon-btn mnd-icon-danger" onClick={() => setConfirmDelete({
                          type: "subject", id: subject.id, className: cls.class_name, name: subject.name
                        })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedSubjects[subject.id] && (
                    <div className="mnd-units">
                      {subject.units.length === 0 ? (
                        <p className="mnd-no-items">No units</p>
                      ) : subject.units.map(unit => (
                        <div key={unit.id} className="mnd-unit-card">
                          <div className="mnd-unit-header" onClick={() => toggleUnit(unit.id)}>
                            <div className="mnd-unit-left">
                              {expandedUnits[unit.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                              <span className="mnd-unit-name">{unit.name}</span>
                            </div>
                            <div className="mnd-unit-right" onClick={e => e.stopPropagation()}>
                              <span className="mnd-badge-sm">{unit.files.length}f</span>
                              {canDeleteItem(unit) && (
                                <button className="mnd-icon-btn mnd-icon-danger" onClick={() => setConfirmDelete({
                                  type: "unit", id: unit.id, className: cls.class_name, subjectId: subject.id, name: unit.name
                                })}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {expandedUnits[unit.id] && (
                            <div className="mnd-files">
                              {unit.files.length === 0 ? (
                                <p className="mnd-no-items">No files</p>
                              ) : unit.files.map(file => (
                                <div key={file.id} className="mnd-file-card">
                                  <div className="mnd-file-left">
                                    {getFileIcon(file.file_type)}
                                    <div className="mnd-file-info">
                                      <span className="mnd-file-name">{file.file_name}</span>
                                      <span className="mnd-file-meta">{file.file_type?.toUpperCase()} • {file.uploaded_by?.name}</span>
                                    </div>
                                  </div>
                                  <div className="mnd-file-actions">
                                    <button className="mnd-icon-btn" onClick={() => setPreviewFile(file)} title="Preview">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <a href={file.file_url} download target="_blank" rel="noreferrer" className="mnd-icon-btn" title="Download">
                                      <Download className="w-4 h-4" />
                                    </a>
                                    {canDeleteItem(file) && (
                                      <button className="mnd-icon-btn mnd-icon-danger" onClick={() => setConfirmDelete({
                                        type: "file", id: file.id, className: cls.class_name, subjectId: subject.id, unitId: unit.id, name: file.file_name
                                      })}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
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
        <div className="mnd-sheet-overlay" onClick={() => setPreviewFile(null)}>
          <div className="mnd-preview-sheet" onClick={e => e.stopPropagation()}>
            <div className="mnd-preview-header">
              <span className="mnd-preview-name">{previewFile.file_name}</span>
              <div className="mnd-preview-actions">
                <a href={previewFile.file_url} download target="_blank" rel="noreferrer" className="mnd-icon-btn">
                  <Download className="w-4 h-4" />
                </a>
                <button className="mnd-icon-btn" onClick={() => setPreviewFile(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <iframe src={getPreviewUrl(previewFile)} title={previewFile.file_name} className="mnd-preview-iframe" />
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="mnd-sheet-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="mnd-confirm-sheet" onClick={e => e.stopPropagation()}>
            <h3 className="mnd-confirm-title">Delete {confirmDelete.type}?</h3>
            <p className="mnd-confirm-text">Are you sure you want to delete "{confirmDelete.name}"?</p>
            <div className="mnd-confirm-actions">
              <button className="mnd-btn mnd-btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button className="mnd-btn mnd-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
