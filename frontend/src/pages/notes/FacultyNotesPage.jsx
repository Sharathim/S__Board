import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Presentation, FileCode, Image as ImageIcon, Download, Eye,
  Plus, Trash2, BookOpen, Layers, X, Check, Loader2, AlertCircle,
  Sparkles, FolderPlus, FolderOpen, ChevronDown, ChevronRight, UploadCloud,
  FileUp, Search
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getNotesClasses, getNotesTree, uploadNotesUnified,
  deleteSubjectDirect, deleteUnitDirect, deleteFileDirect
} from "../../api/notes";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

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

export default function FacultyNotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Dialogs
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Confirm delete states
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'subject'|'unit'|'file', id, name }

  // Upload Form State
  const [uploadForm, setUploadForm] = useState({
    className: "",
    subjectMode: "existing", // "existing" or "new"
    subjectId: "",
    subjectName: "",
    unitName: "Unit 1",
    files: [],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const isStaff = user?.role === "FACULTY" || user?.role === "HOD";

  // 1. Fetch user classes
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: ["notes-classes"],
    queryFn: async () => {
      const res = await getNotesClasses();
      return res.data;
    },
  });

  const availableClasses = classesData?.classes || [];

  // Set default selected class once loaded
  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  // Keep uploadForm className in sync
  useEffect(() => {
    if (selectedClass) {
      setUploadForm(prev => ({ ...prev, className: selectedClass }));
    }
  }, [selectedClass]);

  // 2. Fetch Notes Tree for selected class
  const { data: treeData, isLoading: loadingTree, refetch: refetchTree } = useQuery({
    queryKey: ["notes-tree", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return null;
      const res = await getClassNotesTree(selectedClass);
      return res.data;
    },
    enabled: !!selectedClass,
  });

  const subjects = treeData?.subjects || [];

  // Filter subjects based on search query
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

  // Handle open upload modal
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

  // Handle File Selection
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

  // Submit Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError("");

    const targetClass = uploadForm.className;
    const targetSubject = uploadForm.subjectMode === "new"
      ? uploadForm.subjectName.trim()
      : uploadForm.subjectId.trim();

    if (!targetClass) {
      setUploadError("Please select a class.");
      return;
    }
    if (!targetSubject) {
      setUploadError("Please select or enter a subject name.");
      return;
    }
    if (!uploadForm.unitName) {
      setUploadError("Please select a unit.");
      return;
    }
    if (uploadForm.files.length === 0) {
      setUploadError("Please select at least one file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("class_name", targetClass);
    formData.append("subject_name", targetSubject);
    formData.append("unit_name", uploadForm.unitName);
    uploadForm.files.forEach(file => {
      formData.append("files", file);
    });

    setUploading(true);
    setUploadProgress(10);

    try {
      await uploadNotesUnified(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadProgress(Math.max(10, percent));
      });
      setUploading(false);
      setIsUploadOpen(false);
      // Refetch tree for target class
      queryClient.invalidateQueries(["notes-tree", targetClass]);
      if (targetClass !== selectedClass) {
        setSelectedClass(targetClass);
      }
    } catch (err) {
      setUploading(false);
      setUploadError(err.response?.data?.error || "Failed to upload notes. Please try again.");
    }
  };

  // Handle Delete Actions
  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "subject") {
        await deleteSubjectDirect(deleteTarget.id);
      } else if (deleteTarget.type === "unit") {
        await deleteUnitDirect(deleteTarget.id);
      } else if (deleteTarget.type === "file") {
        await deleteFileDirect(deleteTarget.id);
      }
      queryClient.invalidateQueries(["notes-tree", selectedClass]);
      setDeleteTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || "Deletion failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      {/* ── Top Header Banner ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Notes & Docs
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {user?.role === "STUDENT"
                    ? `Study materials and course notes for ${selectedClass || "your class"}`
                    : `Upload and manage unit-wise notes across your handling classes`}
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Class Selector & Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 md:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, unit or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Class Picker */}
            {availableClasses.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
                  Class:
                </span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer shadow-sm"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        {loadingClasses || loadingTree ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-medium text-slate-500">Loading course materials...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-sm max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {searchQuery ? "No matching notes found" : `No notes uploaded yet for ${selectedClass}`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery
                ? "Try searching for a different keyword or subject name."
                : isStaff
                ? "Click the + button at the bottom right to upload unit notes for this class."
                : "Your faculty members haven't uploaded notes for this class yet. Please check back later."}
            </p>
            {isStaff && !searchQuery && (
              <button
                onClick={handleOpenUpload}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/25"
              >
                <Plus className="w-4 h-4" /> Upload First Note
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSubjects.map((subj) => (
              <div
                key={subj.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition duration-300"
              >
                {/* Subject Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-950/80 dark:to-slate-950 p-6 text-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 border border-white/10">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-white">
                        {subj.name}
                      </h2>
                      <p className="text-[11px] text-indigo-200/70 font-medium">
                        Class: <span className="font-semibold text-indigo-300">{selectedClass}</span> • {subj.units.length} Unit(s)
                      </p>
                    </div>
                  </div>

                  {/* Actions for Subject */}
                  {isStaff && (
                    <button
                      onClick={() => setDeleteTarget({ type: "subject", id: subj.id, name: subj.name })}
                      title="Delete Subject"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Units List */}
                <div className="p-6 space-y-6">
                  {subj.units.map((unit) => (
                    <div
                      key={unit.id}
                      className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 space-y-4"
                    >
                      {/* Unit Header */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/50">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold tracking-wide uppercase">
                            {unit.name}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ({unit.files.length} file{unit.files.length !== 1 ? "s" : ""})
                          </span>
                        </div>

                        {/* Delete Unit */}
                        {isStaff && (
                          <button
                            onClick={() => setDeleteTarget({ type: "unit", id: unit.id, name: unit.name })}
                            title="Delete Unit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Files Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unit.files.map((file) => {
                          const fmt = getFileFormatDetails(file.file_type);
                          const IconComp = fmt.icon;

                          return (
                            <div
                              key={file.id}
                              className="group relative bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2.5 rounded-xl border ${fmt.color} shrink-0`}>
                                  <IconComp className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4
                                    className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition"
                                    title={file.file_name}
                                  >
                                    {file.file_name}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                    <span>Uploaded by {file.uploaded_by?.name || "Faculty"}</span>
                                  </p>
                                </div>
                              </div>

                              {/* File Card Actions */}
                              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {fmt.label}
                                </span>

                                <div className="flex items-center gap-1">
                                  {/* Preview Button */}
                                  <button
                                    onClick={() => setPreviewFile(file)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                                    title="Preview Document"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Download Button */}
                                  <a
                                    href={file.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                                    title="Download File"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>

                                  {/* Delete File Button */}
                                  {isStaff && (
                                    <button
                                      onClick={() => setDeleteTarget({ type: "file", id: file.id, name: file.file_name })}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                      title="Delete File"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Floating "+" Upload Button for Faculty & HOD ── */}
      {isStaff && (
        <button
          onClick={handleOpenUpload}
          className="fixed bottom-8 right-8 z-30 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition duration-200 flex items-center gap-2 group"
          title="Upload Notes"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300" />
          <span className="pr-1 text-sm font-bold hidden sm:inline">Upload Notes</span>
        </button>
      )}

      {/* ── Upload Notes Modal (4-Step Flow) ── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Upload Notes & Documents
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add syllabus materials for students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* 1. Class Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Select Class
                </label>
                <select
                  value={uploadForm.className}
                  onChange={(e) => setUploadForm({ ...uploadForm, className: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Subject Name (Dropdown + Create New option) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    2. Subject Name
                  </label>
                  <span className="text-[10px] text-slate-400">
                    (Combines same subject notes)
                  </span>
                </div>

                {uploadForm.subjectMode === "existing" ? (
                  <div className="space-y-2">
                    <select
                      value={uploadForm.subjectId}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setUploadForm({ ...uploadForm, subjectMode: "new", subjectId: "", subjectName: "" });
                        } else {
                          setUploadForm({ ...uploadForm, subjectId: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                      <option value="__new__">+ Create New Subject...</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter new subject name..."
                      value={uploadForm.subjectName}
                      onChange={(e) => setUploadForm({ ...uploadForm, subjectName: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                    />
                    {subjects.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUploadForm({ ...uploadForm, subjectMode: "existing", subjectId: subjects[0]?.name || "" })}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        ← Pick from existing subjects
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Unit Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  3. Select Unit
                </label>
                <select
                  value={uploadForm.unitName}
                  onChange={(e) => setUploadForm({ ...uploadForm, unitName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Multi-File Upload Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  4. Select Files (PDF, PPT, DOC, Images)
                </label>
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/40 transition">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileUp className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Click or drag files here to upload
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Supports multiple files (.pdf, .ppt, .pptx, .doc, .docx, .png, .jpg, .jpeg)
                  </p>
                </div>

                {/* Selected File List */}
                {uploadForm.files.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
                    {uploadForm.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <span className="truncate pr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    "Upload Notes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Document Preview Modal ── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {previewFile.file_name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewFile.file_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
              {["png", "jpg", "jpeg"].includes((previewFile.file_type || "").toLowerCase()) ? (
                <img
                  src={previewFile.file_url}
                  alt={previewFile.file_name}
                  className="max-h-full max-w-full object-contain p-4"
                />
              ) : (previewFile.file_type || "").toLowerCase() === "pdf" ? (
                <iframe
                  src={previewFile.file_url}
                  title={previewFile.file_name}
                  className="w-full h-full border-0"
                />
              ) : (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.file_url)}&embedded=true`}
                  title={previewFile.file_name}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type}?`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
