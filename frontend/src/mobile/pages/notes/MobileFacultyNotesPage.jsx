import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked, ChevronDown, ChevronRight, Plus, Upload, Trash2,
  FileText, File, Presentation, X, Check, Loader2,
  FolderOpen, BookOpen, Layers, RefreshCw, Download, AlertCircle,
  UploadCloud, Eye, ShieldAlert
} from "lucide-react";
import {
  getNotesHub, getSubjectNames, uploadNotesBatch,
  deleteFile, deleteSubject, deleteUnit
} from "../../../api/notes";
import { useAuth } from "../../../context/AuthContext";

function getFileIcon(type) {
  const t = (type || "").toLowerCase();
  if (t === "pdf") return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
  if (["ppt", "pptx"].includes(t)) return <Presentation className="w-4 h-4 text-amber-500 shrink-0" />;
  return <File className="w-4 h-4 text-blue-500 shrink-0" />;
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
    <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg border text-xs font-medium ${
            t.type === "success"
              ? "bg-slate-900/95 text-emerald-300 border-emerald-800/60 backdrop-blur-md"
              : "bg-slate-900/95 text-rose-300 border-rose-800/60 backdrop-blur-md"
          }`}
        >
          {t.type === "success" ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Document Preview Sheet Modal ─────────────────────────────────────────────
function MobileDocumentPreviewModal({ file, onClose }) {
  if (!file) return null;
  const isPdf = file.file_type?.toLowerCase() === "pdf";
  const previewUrl = isPdf
    ? file.file_url
    : `https://docs.google.com/viewer?url=${encodeURIComponent(file.file_url)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 overflow-hidden">
          {getFileIcon(file.file_type)}
          <span className="font-semibold text-slate-100 truncate text-xs">{file.file_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={file.file_url}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium"
          >
            <Download className="w-3 h-3" />
            <span>Save</span>
          </a>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-slate-950">
        <iframe src={previewUrl} title={file.file_name} className="w-full h-full border-0" />
      </div>
    </div>
  );
}

// ─── Mobile Upload Bottom Sheet ───────────────────────────────────────────────
function MobileUploadBottomSheet({ isOpen, onClose, availableClasses, onUploadSuccess, addToast }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("Unit 1");
  const [files, setFiles] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (availableClasses && availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoadingSubjects(true);
    getSubjectNames(selectedClass)
      .then(res => {
        const subList = res.data.subjects || [];
        setExistingSubjects(subList);
        setSelectedSubject(subList.length > 0 ? subList[0].name : "__NEW__");
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
      addToast("Some unsupported files were skipped (PDF, PPT, DOC only).", "warning");
    }
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass) return addToast("Please select a class", "error");
    const finalSubjectName = selectedSubject === "__NEW__" ? customSubjectName.trim() : selectedSubject;
    if (!finalSubjectName) return addToast("Please enter a subject name", "error");
    if (!selectedUnit) return addToast("Please select a unit", "error");
    if (files.length === 0) return addToast("Please select at least one file", "error");

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
      addToast(res.data.message || "Uploaded successfully!");
      setFiles([]);
      setCustomSubjectName("");
      onUploadSuccess();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.error || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-100">Upload Notes & Docs</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Class */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Target Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none"
            >
              {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Subject Name</label>
            {loadingSubjects ? (
              <div className="text-slate-400 py-1 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Loading subjects...</div>
            ) : (
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none"
              >
                {existingSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="__NEW__">➕ Create New Subject...</option>
              </select>
            )}

            {selectedSubject === "__NEW__" && (
              <input
                type="text"
                value={customSubjectName}
                onChange={e => setCustomSubjectName(e.target.value)}
                placeholder="Enter Subject Name"
                className="mt-2 w-full px-3 py-2 bg-slate-950 border border-indigo-500/40 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            )}
          </div>

          {/* Unit */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Unit</label>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none"
            >
              <option value="Unit 1">Unit 1</option>
              <option value="Unit 2">Unit 2</option>
              <option value="Unit 3">Unit 3</option>
              <option value="Unit 4">Unit 4</option>
              <option value="Unit 5">Unit 5</option>
            </select>
          </div>

          {/* Files */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Select Files</label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-slate-300 font-medium flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Choose Files (PDF, PPT, DOC)</span>
            </button>

            {files.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <span className="truncate text-[11px] text-slate-200">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-indigo-400 font-medium">
                <span>Uploading...</span>
                <span>{uploadPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={onClose} disabled={uploading} className="px-3 py-1.5 text-slate-400">Cancel</button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-1.5"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{uploading ? "Uploading" : "Submit"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Mobile Component ────────────────────────────────────────────────────
export default function MobileFacultyNotesPage() {
  const { user } = useAuth();
  const { toasts, add: addToast } = useToast();

  const [activeClassFilter, setActiveClassFilter] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const canManage = user?.role === "FACULTY" || user?.role === "HOD";

  const { data: hubData, isLoading, isError, refetch } = useQuery({
    queryKey: ["mobileNotesHub", activeClassFilter],
    queryFn: () => getNotesHub({ class_name: activeClassFilter || undefined }),
    refetchOnWindowFocus: false
  });

  const classes = hubData?.data?.classes || [];
  const availableClasses = hubData?.data?.available_classes || [];

  const handleDeleteSubject = async (clsName, subjId, subjName) => {
    if (!window.confirm(`Delete subject "${subjName}"?`)) return;
    setDeletingId(`subj-${subjId}`);
    try {
      await deleteSubject(clsName, subjId);
      addToast(`Deleted "${subjName}"`);
      refetch();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete", "error");
    } finally { setDeletingId(null); }
  };

  const handleDeleteUnit = async (clsName, subjId, unitId, unitName) => {
    if (!window.confirm(`Delete "${unitName}"?`)) return;
    setDeletingId(`unit-${unitId}`);
    try {
      await deleteUnit(clsName, subjId, unitId);
      addToast(`Deleted "${unitName}"`);
      refetch();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete", "error");
    } finally { setDeletingId(null); }
  };

  const handleDeleteFile = async (clsName, subjId, unitId, fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;
    setDeletingId(`file-${fileId}`);
    try {
      await deleteFile(clsName, subjId, unitId, fileId);
      addToast(`Deleted "${fileName}"`);
      refetch();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete", "error");
    } finally { setDeletingId(null); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28">
      <ToastStack toasts={toasts} />
      <MobileDocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {canManage && (
        <MobileUploadBottomSheet
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          availableClasses={availableClasses}
          onUploadSuccess={() => refetch()}
          addToast={addToast}
        />
      )}

      {/* Mobile Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">Notes & Docs</h1>
            <p className="text-[11px] text-slate-400">
              {user?.role === "STUDENT" ? "Your class study materials" : "Manage subject notes"}
            </p>
          </div>
        </div>

        <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-slate-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Available Class Pills */}
      {availableClasses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          <button
            onClick={() => setActiveClassFilter("")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              !activeClassFilter ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            All Classes
          </button>
          {availableClasses.map(cls => (
            <button
              key={cls}
              onClick={() => setActiveClassFilter(cls)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeClassFilter === cls ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      )}

      {/* Main List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-xs text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" /> Loading notes...
        </div>
      ) : classes.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl my-6">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-300 font-semibold">No Notes Found</p>
          <p className="text-[11px] text-slate-500 mt-1">No notes uploaded yet for this view.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map(clsData => (
            <div key={clsData.class_name} className="space-y-4">
              <div className="text-xs font-bold text-indigo-400 tracking-wider uppercase border-b border-slate-800/80 pb-1">
                Class {clsData.class_name}
              </div>

              {clsData.academic_years.map(yrData => (
                <div key={yrData.year} className="space-y-4">
                  {yrData.semesters.map(semData => (
                    <div key={semData.semester} className="space-y-3">
                      {semData.subjects.map(subject => (
                        <div key={subject.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-md">
                          {/* Subject Title */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-400" />
                              <span className="font-bold text-sm text-slate-100">{subject.name}</span>
                            </div>
                            {canManage && (
                              <button
                                onClick={() => handleDeleteSubject(clsData.class_name, subject.id, subject.name)}
                                className="p-1 text-slate-500 hover:text-rose-400"
                              >
                                {deletingId === `subj-${subject.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          {/* Units */}
                          <div className="mt-3 space-y-2.5">
                            {subject.units.map(unit => (
                              <div key={unit.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-indigo-300">{unit.name}</span>
                                  {canManage && (
                                    <button
                                      onClick={() => handleDeleteUnit(clsData.class_name, subject.id, unit.id, unit.name)}
                                      className="p-1 text-slate-500 hover:text-rose-400"
                                    >
                                      {deletingId === `unit-${unit.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>

                                {/* Files */}
                                {unit.files.map(file => (
                                  <div key={file.id} className="flex items-center justify-between py-1.5 text-xs border-t border-slate-900">
                                    <div onClick={() => setPreviewFile(file)} className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer">
                                      {getFileIcon(file.file_type)}
                                      <span className="truncate text-slate-200">{file.file_name}</span>
                                    </div>

                                    <div className="flex items-center gap-1 ml-2">
                                      <button onClick={() => setPreviewFile(file)} className="p-1 text-slate-400 hover:text-indigo-300">
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <a href={file.file_url} download target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-emerald-400">
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                      {canManage && (
                                        <button
                                          onClick={() => handleDeleteFile(clsData.class_name, subject.id, unit.id, file.id, file.file_name)}
                                          className="p-1 text-slate-500 hover:text-rose-400"
                                        >
                                          {deletingId === `file-${file.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
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
          ))}
        </div>
      )}

      {/* Floating Action Button (+) for Mobile */}
      {canManage && availableClasses.length > 0 && (
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="fixed bottom-20 right-4 z-40 p-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl active:scale-90 transition-all duration-200 flex items-center justify-center"
          title="Upload Notes"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      )}
    </div>
  );
}
