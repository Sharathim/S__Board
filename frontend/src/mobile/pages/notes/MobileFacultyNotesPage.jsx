import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Presentation, FileCode, Image as ImageIcon, Download, Eye,
  Plus, Trash2, BookOpen, X, Loader2, AlertCircle, UploadCloud,
  FileUp, Search, ChevronDown
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getNotesClasses, getNotesTree, uploadNotesUnified,
  deleteSubjectDirect, deleteUnitDirect, deleteFileDirect
} from "../../../api/notes";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";

const UNIT_OPTIONS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];

function getFileFormatDetails(type) {
  const t = (type || "").toLowerCase();
  if (t === "pdf") {
    return { icon: FileText, color: "text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50", label: "PDF" };
  }
  if (["ppt", "pptx"].includes(t)) {
    return { icon: Presentation, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50", label: "PPT" };
  }
  if (["doc", "docx"].includes(t)) {
    return { icon: FileCode, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50", label: "DOC" };
  }
  if (["png", "jpg", "jpeg"].includes(t)) {
    return { icon: ImageIcon, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50", label: "IMG" };
  }
  return { icon: FileText, color: "text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700", label: (type || "FILE").toUpperCase() };
}

export default function MobileFacultyNotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    className: "",
    subjectMode: "existing",
    subjectId: "",
    subjectName: "",
    unitName: "Unit 1",
    files: [],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const isStaff = user?.role === "FACULTY" || user?.role === "HOD";

  // Fetch classes
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: ["notes-classes-mobile"],
    queryFn: async () => {
      const res = await getNotesClasses();
      return res.data;
    },
  });

  const availableClasses = classesData?.classes || [];

  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      setUploadForm(prev => ({ ...prev, className: selectedClass }));
    }
  }, [selectedClass]);

  // Fetch Notes Tree
  const { data: treeData, isLoading: loadingTree } = useQuery({
    queryKey: ["notes-tree-mobile", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return null;
      const res = await getClassNotesTree(selectedClass);
      return res.data;
    },
    enabled: !!selectedClass,
  });

  const subjects = treeData?.subjects || [];

  const filteredSubjects = subjects.filter(subj => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchSubj = subj.name.toLowerCase().includes(q);
    const matchUnits = subj.units.some(u =>
      u.name.toLowerCase().includes(q) ||
      u.files.some(f => f.file_name.toLowerCase().includes(q))
    );
    return matchSubj || matchUnits;
  });

  const handleOpenUpload = () => {
    setUploadForm({
      className: selectedClass || (availableClasses[0] || ""),
      subjectMode: "existing",
      subjectId: subjects.length > 0 ? String(subjects[0].name) : "__new__",
      subjectName: subjects.length > 0 ? "" : "",
      unitName: "Unit 1",
      files: [],
    });
    if (subjects.length === 0) {
      setUploadForm(prev => ({ ...prev, subjectMode: "new" }));
    }
    setUploadError("");
    setUploadProgress(0);
    setIsUploadOpen(true);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setUploadForm(prev => ({
        ...prev,
        files: [...prev.files, ...selected]
      }));
    }
  };

  const removeSelectedFile = (idx) => {
    setUploadForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== idx)
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError("");

    const targetClass = uploadForm.className;
    const targetSubject = uploadForm.subjectMode === "new"
      ? uploadForm.subjectName.trim()
      : uploadForm.subjectId.trim();

    if (!targetClass) { setUploadError("Please select a class."); return; }
    if (!targetSubject) { setUploadError("Please select or enter a subject name."); return; }
    if (!uploadForm.unitName) { setUploadError("Please select a unit."); return; }
    if (uploadForm.files.length === 0) { setUploadError("Please select at least one file."); return; }

    const formData = new FormData();
    formData.append("class_name", targetClass);
    formData.append("subject_name", targetSubject);
    formData.append("unit_name", uploadForm.unitName);
    uploadForm.files.forEach(f => formData.append("files", f));

    setUploading(true);
    setUploadProgress(10);

    try {
      await uploadNotesUnified(formData, (pe) => {
        const pct = Math.round((pe.loaded * 100) / (pe.total || 1));
        setUploadProgress(Math.max(10, pct));
      });
      setUploading(false);
      setIsUploadOpen(false);
      queryClient.invalidateQueries(["notes-tree-mobile", targetClass]);
      queryClient.invalidateQueries(["notes-tree", targetClass]);
      if (targetClass !== selectedClass) {
        setSelectedClass(targetClass);
      }
    } catch (err) {
      setUploading(false);
      setUploadError(err.response?.data?.error || "Failed to upload notes.");
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "subject") await deleteSubjectDirect(deleteTarget.id);
      else if (deleteTarget.type === "unit") await deleteUnitDirect(deleteTarget.id);
      else if (deleteTarget.type === "file") await deleteFileDirect(deleteTarget.id);
      queryClient.invalidateQueries(["notes-tree-mobile", selectedClass]);
      queryClient.invalidateQueries(["notes-tree", selectedClass]);
      setDeleteTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || "Deletion failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      {/* Mobile Top Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Notes & Docs
            </h1>
          </div>

          {/* Class selector dropdown */}
          {availableClasses.length > 1 && (
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="appearance-none bg-slate-100 dark:bg-slate-800 text-xs font-bold px-3 py-1.5 pr-7 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:outline-none"
              >
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Mobile Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4">
        {loadingClasses || loadingTree ? (
          <div className="py-20 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading notes...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center my-6">
            <BookOpen className="w-10 h-10 text-indigo-500 mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No notes for {selectedClass}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isStaff ? "Tap '+' below to upload notes." : "Check back later for updates."}
            </p>
          </div>
        ) : (
          filteredSubjects.map((subj) => (
            <div
              key={subj.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
            >
              {/* Subject Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">{subj.name}</h2>
                  <p className="text-[10px] text-indigo-300">{selectedClass} • {subj.units.length} Unit(s)</p>
                </div>
                {isStaff && (
                  <button
                    onClick={() => setDeleteTarget({ type: "subject", id: subj.id, name: subj.name })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Units */}
              <div className="p-3 space-y-4">
                {subj.units.map((unit) => (
                  <div key={unit.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                        {unit.name}
                      </span>
                      {isStaff && (
                        <button
                          onClick={() => setDeleteTarget({ type: "unit", id: unit.id, name: unit.name })}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Files List */}
                    <div className="space-y-2">
                      {unit.files.map((file) => {
                        const fmt = getFileFormatDetails(file.file_type);
                        const IconComp = fmt.icon;
                        return (
                          <div
                            key={file.id}
                            className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1.5 rounded-md border ${fmt.color} shrink-0`}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {file.file_name}
                                </h4>
                                <span className="text-[9px] text-slate-400">{fmt.label}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setPreviewFile(file)}
                                className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              {isStaff && (
                                <button
                                  onClick={() => setDeleteTarget({ type: "file", id: file.id, name: file.file_name })}
                                  className="p-1.5 rounded text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating "+" Button */}
      {isStaff && (
        <button
          onClick={handleOpenUpload}
          className="fixed bottom-20 right-5 z-30 p-4 rounded-2xl bg-indigo-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Upload Bottom Sheet / Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-h-[90vh] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 overflow-y-auto animate-slideUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Upload Notes & Docs
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Step 1: Class */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">1. Class</label>
                <select
                  value={uploadForm.className}
                  onChange={(e) => setUploadForm({ ...uploadForm, className: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">2. Subject Name</label>
                {uploadForm.subjectMode === "existing" ? (
                  <select
                    value={uploadForm.subjectId}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setUploadForm({ ...uploadForm, subjectMode: "new", subjectId: "", subjectName: "" });
                      } else {
                        setUploadForm({ ...uploadForm, subjectId: e.target.value });
                      }
                    }}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="__new__">+ Create New Subject...</option>
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="New subject name..."
                      value={uploadForm.subjectName}
                      onChange={(e) => setUploadForm({ ...uploadForm, subjectName: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                    />
                    {subjects.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUploadForm({ ...uploadForm, subjectMode: "existing", subjectId: subjects[0]?.name || "" })}
                        className="text-[10px] text-indigo-500 underline"
                      >
                        ← Choose existing subject
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">3. Unit</label>
                <select
                  value={uploadForm.unitName}
                  onChange={(e) => setUploadForm({ ...uploadForm, unitName: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                >
                  {UNIT_OPTIONS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Step 4: Files */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">4. Select Files</label>
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <FileUp className="w-6 h-6 mx-auto text-indigo-500 mb-1" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tap to browse files</p>
                  <p className="text-[9px] text-slate-400">PDF, PPT, DOC, Images supported</p>
                </div>

                {uploadForm.files.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                    {uploadForm.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                        <span className="truncate pr-1">{file.name}</span>
                        <button type="button" onClick={() => removeSelectedFile(idx)} className="text-slate-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-indigo-600">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload Notes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-800 w-full h-[80vh] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {previewFile.file_name}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.file_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
              {["png", "jpg", "jpeg"].includes((previewFile.file_type || "").toLowerCase()) ? (
                <img src={previewFile.file_url} alt={previewFile.file_name} className="max-h-full max-w-full object-contain p-2" />
              ) : (previewFile.file_type || "").toLowerCase() === "pdf" ? (
                <iframe src={previewFile.file_url} title={previewFile.file_name} className="w-full h-full border-0" />
              ) : (
                <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.file_url)}&embedded=true`} title={previewFile.file_name} className="w-full h-full border-0" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type}?`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText="Delete"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
