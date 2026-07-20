/**
 * AIAssistPanel.jsx
 * Ultra-responsive AI-powered Notes Ingestion Panel for S-DESK
 * Works for HOD and Faculty roles
 * Supports: single files, multiple files, ZIP archives, clipboard paste, drag & drop
 * Two-step flow: Preview → Confirm → Execute
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, X, Upload, FileText, Loader2, ChevronRight,
  CheckCircle2, AlertCircle, BookOpen, Layers, Package,
  Trash2, Send, Eye, ArrowLeft, Zap, FolderOpen
} from "lucide-react";
import { aiIngestPreview, aiIngestExecute } from "../../api/classes";

const ALLOWED_EXTS = ["pdf", "ppt", "pptx", "doc", "docx", "zip"];

// ─── File chip component ──────────────────────────────────────────────────────
function FileChip({ file, onRemove }) {
  const ext = file.name.split(".").pop().toLowerCase();
  const isZip = ext === "zip";
  const colorMap = {
    pdf: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50",
    ppt: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/50",
    pptx: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/50",
    doc: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    docx: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    zip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800/50",
  };
  const cls = colorMap[ext] || "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  const sizeFmt = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${cls} group`}>
      {isZip ? <Package className="w-3.5 h-3.5 shrink-0" /> : <FileText className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate max-w-[120px]" title={file.name}>{file.name}</span>
      <span className="opacity-60 shrink-0">{sizeFmt}</span>
      <button
        type="button"
        onClick={() => onRemove(file)}
        className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Remove file"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── AI Plan Preview Card ─────────────────────────────────────────────────────
function PlanPreview({ plan, fileNames, onConfirm, onBack, isExecuting, uploadProgress }) {
  const { action_summary, operations = [], ai_provider, skipped = [] } = plan;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-violet-800 dark:text-violet-200 uppercase tracking-wider mb-0.5">
            AI Preview · {ai_provider === "gemini" ? "Gemini 2.0 Flash" : "Groq Llama"}
          </p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-snug">{action_summary}</p>
        </div>
      </div>

      {/* Operations tree */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {operations.map((op, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-700/60 rounded-2xl overflow-hidden bg-white dark:bg-gray-800/60">
            {/* Subject row */}
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-gray-800">
              <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100 truncate">{op.subject_name}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                  {op.academic_year} · Semester {op.subject_semester || "?"}
                  {op.existing_subject_id
                    ? <span className="ml-1.5 text-amber-600 dark:text-amber-400">(adding to existing)</span>
                    : <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">(new subject)</span>
                  }
                </p>
              </div>
            </div>

            {/* Units */}
            {op.units && op.units.length > 0 && (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {op.units.map((unit, j) => (
                  <div key={j} className="pl-8 pr-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{unit.unit_name}</p>
                    </div>
                    {unit.files && unit.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {unit.files.map((fn, k) => (
                          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                            <FileText className="w-2.5 h-2.5" />
                            {fn}
                          </span>
                        ))}
                      </div>
                    )}
                    {(!unit.files || unit.files.length === 0) && (
                      <p className="pl-5 text-[10px] text-gray-400 italic">No files for this unit</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Skipped files */}
      {skipped.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <p className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">Skipped Files</p>
          <div className="space-y-0.5">
            {skipped.map((s, i) => (
              <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-bold">{s.file}</span>: {s.reason}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {isExecuting && uploadProgress > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Uploading to Cloudinary…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isExecuting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-md hover:shadow-violet-glow transition-all disabled:opacity-60"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm & Create
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Success Result ───────────────────────────────────────────────────────────
function SuccessResult({ result, onDone }) {
  const { created_subjects, created_units, uploaded_files, errors, summary } = result;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg mb-3">
          <CheckCircle2 className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Done! ✨</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">{summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Subjects", value: created_subjects.length, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Units", value: created_units.length, color: "text-violet-600 dark:text-violet-400" },
          { label: "Files", value: uploaded_files.length, color: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
          <p className="text-[10px] font-extrabold text-red-700 dark:text-red-300 uppercase tracking-wider mb-1.5">
            {errors.length} Error{errors.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-1">
            {errors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-red-600 dark:text-red-400">
                <span className="font-bold">{e.file || "Unknown"}</span>: {e.error}
              </p>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-md transition-all"
      >
        Done
      </button>
    </div>
  );
}

// ─── Main AIAssistPanel ───────────────────────────────────────────────────────
export default function AIAssistPanel({ className, onSuccess }) {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState("input"); // "input" | "preview" | "success"
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState([]); // File[]
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [aiPlan, setAiPlan] = useState(null);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const panelRef = useRef(null);

  // ── Add files helper ───────────────────────────────────────────────────────
  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ALLOWED_EXTS.includes(ext);
    });
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !existingNames.has(f.name))];
    });
  }, []);

  const removeFile = useCallback((fileToRemove) => {
    setFiles(prev => prev.filter(f => f.name !== fileToRemove.name));
  }, []);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!panelRef.current?.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  // ── Clipboard paste ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) pastedFiles.push(f);
        }
      }
      if (pastedFiles.length > 0) addFiles(pastedFiles);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, addFiles]);

  // ── Reset state ────────────────────────────────────────────────────────────
  const reset = () => {
    setPhase("input");
    setPrompt("");
    setFiles([]);
    setError("");
    setAiPlan(null);
    setResult(null);
    setUploadProgress(0);
    setIsLoading(false);
    setIsExecuting(false);
  };

  const close = () => {
    setIsOpen(false);
    reset();
  };

  // ── Step 1: Get AI Preview ─────────────────────────────────────────────────
  const handleGetPreview = async () => {
    if (!prompt.trim()) {
      setError("Please describe what you want to create.");
      textareaRef.current?.focus();
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      files.forEach(f => formData.append("files", f));

      const res = await aiIngestPreview(className, formData);
      setAiPlan(res.data);
      setPhase("preview");
    } catch (err) {
      const msg = err.response?.data?.error || "AI failed to parse your request. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Execute Confirmed Plan ─────────────────────────────────────────
  const handleConfirmExecute = async () => {
    if (!aiPlan) return;
    setIsExecuting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      // Send the confirmed plan as JSON
      formData.append("plan", JSON.stringify(aiPlan));
      // Re-attach all original files
      files.forEach(f => formData.append("files", f));

      const res = await aiIngestExecute(
        className,
        formData,
        (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        }
      );

      setResult(res.data);
      setPhase("success");

      // Invalidate subject query so the list auto-refreshes
      queryClient.invalidateQueries({ queryKey: ["subjects", className] });
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || "Execution failed. Please try again.";
      setError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  // ── PROMPT EXAMPLES ───────────────────────────────────────────────────────
  const EXAMPLES = [
    "Create subject 'Operating Systems' Sem 1, add Unit 1 – Introduction, upload these notes",
    "Add Unit 3 to Data Structures subject, name it Linked Lists, upload the attached PDF",
    "Create Machine Learning for Sem 2 2024-2025, with 3 units from these ZIP files",
  ];

  return (
    <>
      {/* ── Floating Trigger Button ────────────────────────────────────────── */}
      {!isOpen && (
        <button
          id="ai-assist-trigger"
          onClick={() => setIsOpen(true)}
          className="
            fixed bottom-6 right-6 z-40
            flex items-center gap-2
            px-4 py-3
            rounded-2xl
            bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600
            hover:from-violet-700 hover:to-purple-700
            text-white text-sm font-extrabold
            shadow-xl hover:shadow-violet-500/40
            transition-all duration-300
            hover:scale-105 active:scale-95
            sm:bottom-8 sm:right-8
          "
          style={{ fontSize: "clamp(0.7rem, 2vw, 0.875rem)", padding: "clamp(0.5rem, 2vw, 0.75rem) clamp(0.75rem, 3vw, 1rem)" }}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden xs:inline">AI Assist</span>
          <span className="xs:hidden">AI</span>
        </button>
      )}

      {/* ── Backdrop + Panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 p-0">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl
              bg-white dark:bg-gray-900
              border border-gray-100 dark:border-gray-700/60
              shadow-2xl
              max-h-[90vh] sm:max-h-[85vh]
              flex flex-col
              transition-all duration-300
              ${isDragging ? "ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-900" : ""}
            `}
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 0)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 dark:text-white" style={{ fontSize: "clamp(0.8rem, 2.5vw, 0.9375rem)" }}>
                    AI Notes Assistant
                  </h2>
                  <p className="text-[10px] text-gray-400 font-semibold">
                    {phase === "input" ? "Describe what you want to create" :
                     phase === "preview" ? "Review the AI plan before confirming" :
                     "Operation complete!"}
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drag overlay indicator */}
            {isDragging && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-violet-500/10 rounded-3xl border-2 border-dashed border-violet-400 pointer-events-none">
                <Upload className="w-10 h-10 text-violet-500 mb-2 animate-bounce" />
                <p className="text-sm font-extrabold text-violet-600 dark:text-violet-300">Drop files here</p>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
              {/* ── INPUT PHASE ──────────────────────────────────────────── */}
              {phase === "input" && (
                <div className="space-y-4">
                  {/* Prompt textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Your Instruction
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isLoading) {
                          handleGetPreview();
                        }
                      }}
                      placeholder="e.g. Create subject 'Data Structures' Sem 1, add Unit 1 – Arrays with this PDF..."
                      rows={3}
                      className="
                        w-full px-3 py-2.5 text-sm
                        rounded-2xl border border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-800
                        text-gray-900 dark:text-gray-100
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
                        resize-none transition-all leading-relaxed
                      "
                      style={{ fontSize: "clamp(0.75rem, 2.5vw, 0.875rem)" }}
                    />
                    <p className="text-[10px] text-gray-400 font-medium">
                      Ctrl+Enter to submit · No structure needed — just describe naturally!
                    </p>
                  </div>

                  {/* Example prompts */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Try these examples:</p>
                    <div className="flex flex-col gap-1.5">
                      {EXAMPLES.map((ex, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPrompt(ex)}
                          className="text-left text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-100 dark:border-violet-800/30 transition-all font-medium leading-snug"
                          style={{ fontSize: "clamp(0.65rem, 2vw, 0.75rem)" }}
                        >
                          <ChevronRight className="w-3 h-3 inline mr-1 opacity-70" />
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Attach Files <span className="font-normal normal-case text-gray-400">(optional)</span>
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        flex flex-col items-center justify-center gap-2
                        p-5 rounded-2xl cursor-pointer
                        border-2 border-dashed
                        transition-all duration-200
                        ${isDragging
                          ? "border-violet-400 bg-violet-50/50 dark:bg-violet-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 bg-slate-50/50 dark:bg-gray-800/50 hover:bg-violet-50/30 dark:hover:bg-violet-900/10"
                        }
                      `}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-violet-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200" style={{ fontSize: "clamp(0.7rem, 2.5vw, 0.8125rem)" }}>
                          Drag & Drop, Click, or Paste
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          PDF · PPT · PPTX · DOC · DOCX · ZIP — up to 10MB each
                        </p>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.ppt,.pptx,.doc,.docx,.zip"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.length) addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />

                    {/* File chips */}
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {files.map(f => (
                          <FileChip key={f.name} file={f} onRemove={removeFile} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleGetPreview}
                    disabled={isLoading || !prompt.trim()}
                    className="
                      w-full flex items-center justify-center gap-2
                      py-3 rounded-2xl
                      bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600
                      hover:from-violet-700 hover:to-purple-700
                      text-white font-extrabold
                      shadow-lg hover:shadow-violet-500/40
                      transition-all duration-300
                      disabled:opacity-50 disabled:cursor-not-allowed
                      active:scale-[0.98]
                    "
                    style={{ fontSize: "clamp(0.75rem, 2.5vw, 0.875rem)" }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI is analyzing…
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generate Plan
                        <Send className="w-3.5 h-3.5 ml-0.5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── PREVIEW PHASE ─────────────────────────────────────────── */}
              {phase === "preview" && aiPlan && (
                <div>
                  {error && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  <PlanPreview
                    plan={aiPlan}
                    fileNames={files.map(f => f.name)}
                    onConfirm={handleConfirmExecute}
                    onBack={() => { setPhase("input"); setError(""); }}
                    isExecuting={isExecuting}
                    uploadProgress={uploadProgress}
                  />
                </div>
              )}

              {/* ── SUCCESS PHASE ─────────────────────────────────────────── */}
              {phase === "success" && result && (
                <SuccessResult result={result} onDone={close} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
