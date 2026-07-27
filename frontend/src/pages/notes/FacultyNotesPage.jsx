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
} from "../../api/notes";
import { useAuth } from "../../context/AuthContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CURRENT_ACADEMIC_YEAR = (() => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const UNIT_OPTIONS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];

function getFileIcon(type) {
  if (type === "pdf") return <FileText className="nd-file-icon nd-file-pdf" />;
  if (["ppt", "pptx"].includes(type)) return <Presentation className="nd-file-icon nd-file-ppt" />;
  return <File className="nd-file-icon nd-file-doc" />;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
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

// ─── Confirm Dialog ──────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="nd-modal-overlay" onClick={onCancel}>
      <div className="nd-modal nd-modal-sm" onClick={e => e.stopPropagation()}>
        <h3 className="nd-modal-title">{title}</h3>
        <p className="nd-modal-text">{message}</p>
        <div className="nd-modal-actions">
          <button className="nd-btn nd-btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="nd-btn nd-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ───────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  if (!file) return null;
  const previewUrl = getPreviewUrl(file);
  return (
    <div className="nd-modal-overlay" onClick={onClose}>
      <div className="nd-modal nd-modal-preview" onClick={e => e.stopPropagation()}>
        <div className="nd-preview-header">
          <span className="nd-preview-name">{file.file_name}</span>
          <div className="nd-preview-actions">
            <a href={file.file_url} download target="_blank" rel="noreferrer" className="nd-btn nd-btn-sm nd-btn-ghost">
              <Download className="w-4 h-4" /> Download
            </a>
            <button className="nd-btn nd-btn-sm nd-btn-ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="nd-preview-body">
          {file.file_type === "pdf" ? (
            <iframe src={previewUrl} title={file.file_name} className="nd-preview-iframe" />
          ) : (
            <iframe src={previewUrl} title={file.file_name} className="nd-preview-iframe" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upload Modal ────────────────────────────────────────────────────────────
function UploadModal({ open, onClose, targetClasses, existingSubjects, onSuccess, toast }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [subjectMode, setSubjectMode] = useState("existing"); // existing | new
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  // Reset when class changes
  useEffect(() => {
    setSelectedSubjectId("");
    setNewSubjectName("");
    setSubjectMode("existing");
    setSelectedUnit("");
  }, [selectedClass]);

  // Get subjects for selected class
  const classSubjects = existingSubjects.filter(s => s.class_name === selectedClass);

  // If no existing subjects, auto-switch to new
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

      // Create new subject if needed
      if (subjectMode === "new") {
        const res = await createSubject(selectedClass, {
          name: newSubjectName.trim(),
          academic_year: CURRENT_ACADEMIC_YEAR,
          semester: 1
        });
        subjectId = res.data.subject.id;
      }

      // Create unit (or find existing)
      let unitId;
      try {
        const unitRes = await createUnit(selectedClass, subjectId, { name: selectedUnit });
        unitId = unitRes.data.unit.id;
      } catch (err) {
        // Unit might already exist — try to find it
        if (err.response?.data?.error?.includes("already exists")) {
          // Fetch units for this subject to find the existing one
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

      // Upload files
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

  if (!open) return null;

  return (
    <div className="nd-modal-overlay" onClick={onClose}>
      <div className="nd-modal nd-modal-upload" onClick={e => e.stopPropagation()}>
        <div className="nd-modal-header">
          <h3 className="nd-modal-title">Upload Notes</h3>
          <button className="nd-btn-icon" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="nd-modal-body">
          {/* Class Selection */}
          <div className="nd-form-group">
            <label className="nd-form-label">Class</label>
            <select
              className="nd-select"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              <option value="">Select class...</option>
              {targetClasses.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Subject Selection */}
          {selectedClass && (
            <div className="nd-form-group">
              <label className="nd-form-label">Subject</label>
              {classSubjects.length > 0 && (
                <div className="nd-toggle-group">
                  <button
                    className={`nd-toggle-btn ${subjectMode === "existing" ? "active" : ""}`}
                    onClick={() => setSubjectMode("existing")}
                  >Existing</button>
                  <button
                    className={`nd-toggle-btn ${subjectMode === "new" ? "active" : ""}`}
                    onClick={() => setSubjectMode("new")}
                  >Create New</button>
                </div>
              )}
              {subjectMode === "existing" ? (
                <select
                  className="nd-select"
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                >
                  <option value="">Select subject...</option>
                  {classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <input
                  className="nd-input"
                  placeholder="Enter new subject name..."
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Unit Selection */}
          {selectedClass && (
            <div className="nd-form-group">
              <label className="nd-form-label">Unit</label>
              <select
                className="nd-select"
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
              >
                <option value="">Select unit...</option>
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {/* File Upload */}
          {selectedClass && (
            <div className="nd-form-group">
              <label className="nd-form-label">Files (PDF, PPT, DOC)</label>
              <div
                className="nd-drop-zone"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("nd-drop-active"); }}
                onDragLeave={e => e.currentTarget.classList.remove("nd-drop-active")}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("nd-drop-active");
                  const droppedFiles = Array.from(e.dataTransfer.files);
                  setFiles(prev => [...prev, ...droppedFiles]);
                }}
              >
                <UploadCloud className="w-8 h-8 text-gray-400" />
                <p className="nd-drop-text">Click or drag files here</p>
                <p className="nd-drop-hint">PDF, PPT, PPTX, DOC, DOCX</p>
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
                <div className="nd-file-list">
                  {files.map((f, i) => (
                    <div key={i} className="nd-file-item">
                      <span className="nd-file-item-name">{f.name}</span>
                      <button className="nd-btn-icon-sm" onClick={() => removeFile(i)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && progress > 0 && (
            <div className="nd-progress-bar">
              <div className="nd-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <div className="nd-modal-footer">
          <button className="nd-btn nd-btn-ghost" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="nd-btn nd-btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><UploadCloud className="w-4 h-4" /> Upload</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── File Card ───────────────────────────────────────────────────────────────
function FileCard({ file, canDelete, onDelete, onPreview }) {
  return (
    <div className="nd-file-card">
      <div className="nd-file-card-left">
        {getFileIcon(file.file_type)}
        <div className="nd-file-card-info">
          <span className="nd-file-card-name">{file.file_name}</span>
          <span className="nd-file-card-meta">
            {file.file_type?.toUpperCase()} • {file.uploaded_by?.name || "Unknown"}
          </span>
        </div>
      </div>
      <div className="nd-file-card-actions">
        <button className="nd-btn-icon-sm" onClick={() => onPreview(file)} title="Preview">
          <Eye className="w-4 h-4" />
        </button>
        <a href={file.file_url} download target="_blank" rel="noreferrer" className="nd-btn-icon-sm" title="Download">
          <Download className="w-4 h-4" />
        </a>
        {canDelete && (
          <button className="nd-btn-icon-sm nd-btn-icon-danger" onClick={() => onDelete(file)} title="Delete">
            <Trash2 className="w-4 h-4" />
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
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, className, subjectId, unitId, name }
  const [deleting, setDeleting] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const isStaff = user?.role === "FACULTY" || user?.role === "HOD";

  // Fetch all notes
  const { data, isLoading, error } = useQuery({
    queryKey: ["notes-all"],
    queryFn: () => getAllNotes().then(r => r.data),
    staleTime: 30000,
  });

  const classes = data?.classes || [];
  const targetClasses = data?.target_classes || [];

  // Flatten all subjects for the upload modal's existing subject dropdown
  const allSubjects = classes.flatMap(c =>
    c.subjects.map(s => ({ ...s, class_name: c.class_name }))
  );

  // Entrance animation
  useEffect(() => {
    if (pageRef.current) {
      gsap.from(pageRef.current, { opacity: 0, y: 20, duration: 0.5, ease: "power3.out" });
    }
  }, []);

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
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

  // Filter subjects by search
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
    <div className="nd-root" ref={pageRef}>
      <ToastStack toasts={toast.toasts} />

      {/* Header */}
      <div className="nd-page-header">
        <div className="nd-page-header-left">
          <div className="nd-page-icon">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="nd-page-title">Notes & Docs</h1>
            <p className="nd-page-subtitle">
              {isStaff ? "Manage and share study materials" : "Access your class study materials"}
            </p>
          </div>
        </div>
        <div className="nd-header-right">
          <div className="nd-search-box">
            <Search className="w-4 h-4" />
            <input
              className="nd-search-input"
              placeholder="Search subjects, units, files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="nd-content">
        {isLoading ? (
          <div className="nd-empty-state">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
            <p>Loading notes...</p>
          </div>
        ) : error ? (
          <div className="nd-empty-state">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <p>Failed to load notes</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="nd-empty-state">
            <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            <p className="nd-empty-title">No notes yet</p>
            <p className="nd-empty-text">
              {isStaff
                ? "Click the + button to upload your first notes"
                : "Your faculty hasn't uploaded any notes yet"}
            </p>
          </div>
        ) : (
          filteredClasses.map(cls => (
            <div key={cls.class_name} className="nd-class-section">
              <div className="nd-class-header">
                <span className="nd-class-tag">{cls.class_name.replace("_", " ")}</span>
                <span className="nd-class-count">{cls.subjects.length} subject{cls.subjects.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="nd-subjects-list">
                {cls.subjects.map(subject => (
                  <div key={subject.id} className="nd-subject-card">
                    {/* Subject Header */}
                    <div className="nd-subject-header" onClick={() => toggleSubject(subject.id)}>
                      <div className="nd-subject-left">
                        {expandedSubjects[subject.id]
                          ? <ChevronDown className="w-4 h-4 nd-chevron" />
                          : <ChevronRight className="w-4 h-4 nd-chevron" />}
                        <BookMarked className="w-4 h-4 nd-subject-icon" />
                        <span className="nd-subject-name">{subject.name}</span>
                        <span className="nd-subject-badge">{subject.units.length} unit{subject.units.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="nd-subject-right" onClick={e => e.stopPropagation()}>
                        <span className="nd-subject-meta">by {subject.created_by?.name}</span>
                        {canDeleteItem(subject) && (
                          <button
                            className="nd-btn-icon-sm nd-btn-icon-danger"
                            onClick={() => setConfirmDelete({
                              type: "subject", id: subject.id,
                              className: cls.class_name, name: subject.name
                            })}
                            title="Delete subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Units */}
                    {expandedSubjects[subject.id] && (
                      <div className="nd-units-list">
                        {subject.units.length === 0 ? (
                          <p className="nd-no-items">No units yet</p>
                        ) : (
                          subject.units.map(unit => (
                            <div key={unit.id} className="nd-unit-card">
                              {/* Unit Header */}
                              <div className="nd-unit-header" onClick={() => toggleUnit(unit.id)}>
                                <div className="nd-unit-left">
                                  {expandedUnits[unit.id]
                                    ? <ChevronDown className="w-3.5 h-3.5 nd-chevron" />
                                    : <ChevronRight className="w-3.5 h-3.5 nd-chevron" />}
                                  <FolderOpen className="w-3.5 h-3.5 nd-unit-icon" />
                                  <span className="nd-unit-name">{unit.name}</span>
                                  <span className="nd-unit-badge">{unit.files.length} file{unit.files.length !== 1 ? "s" : ""}</span>
                                </div>
                                <div className="nd-unit-right" onClick={e => e.stopPropagation()}>
                                  {canDeleteItem(unit) && (
                                    <button
                                      className="nd-btn-icon-sm nd-btn-icon-danger"
                                      onClick={() => setConfirmDelete({
                                        type: "unit", id: unit.id,
                                        className: cls.class_name,
                                        subjectId: subject.id,
                                        name: unit.name
                                      })}
                                      title="Delete unit"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Files */}
                              {expandedUnits[unit.id] && (
                                <div className="nd-files-list">
                                  {unit.files.length === 0 ? (
                                    <p className="nd-no-items">No files uploaded</p>
                                  ) : (
                                    unit.files.map(file => (
                                      <FileCard
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
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB for Faculty/HOD */}
      {isStaff && (
        <button
          className="nd-fab"
          onClick={() => setUploadOpen(true)}
          title="Upload Notes"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Upload Modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        targetClasses={targetClasses}
        existingSubjects={allSubjects}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["notes-all"] })}
        toast={toast}
      />

      {/* Preview Modal */}
      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.type}?`}
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
