import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, Zap, Trash2, Plus, Pencil, X, FlaskConical,
  BookOpen, UserMinus, UserCheck, RotateCcw,
  AlertTriangle, CheckCircle2, Save, Info
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { listFaculty } from "../../api/faculty";
import {
  listMappings, createMapping, updateMapping, deleteMapping,
  getTimetable, generateTimetable, clearTimetable,
  cancelEntry, restoreEntry, cancelFacultyDay, restoreFacultyDay,
  findSubstitutes, getLabConfig, saveLabConfig,
} from "../../api/timetable";

// ─── Constants ───────────────────────────────────────────────────────────────
const CLASSES    = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];
const DAYS       = [1, 2, 3, 4, 5, 6];
const DAY_LABELS = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
const PERIODS    = [1, 2, 3, 4, 5];
const TABS       = ["Lab Setup", "Subjects", "Schedule", "Leave Manager"];

// Lab room badge colours
const LAB_ROOM_STYLE = {
  1: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  2: "bg-amber-50  dark:bg-amber-950/40  text-amber-700  dark:text-amber-300  border-amber-200  dark:border-amber-800",
};

function getLabRoom(className) {
  return className.endsWith("A") ? 1 : 2;
}

// ─── Utils ───────────────────────────────────────────────────────────────────
function cls(...args) { return args.filter(Boolean).join(" "); }

function toastErr(msg) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "error",   message: msg } }));
}
function toastOk(msg) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "success", message: msg } }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ClassPill({ name, active, onClick }) {
  return (
    <button onClick={onClick} className={cls(
      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
      active
        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300"
    )}>{name.replace("_", " ")}</button>
  );
}

function SubjectBadge({ type }) {
  return (
    <span className={cls(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
      type === "lab"
        ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
        : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
    )}>
      {type === "lab" ? <FlaskConical className="w-2.5 h-2.5" /> : <BookOpen className="w-2.5 h-2.5" />}
      {type}
    </span>
  );
}

// ─── Lab Setup Tab ────────────────────────────────────────────────────────────
function LabSetupTab({ className }) {
  const qc     = useQueryClient();
  const labRoom = getLabRoom(className);

  const { data, isLoading } = useQuery({
    queryKey: ["lab-config", className],
    queryFn:  () => getLabConfig(className).then(r => r.data.config),
  });

  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  // Sync form when data loads
  useMemo(() => {
    if (data) {
      setHours(data.weekly_lab_hours ?? "");
      setNotes(data.notes ?? "");
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => saveLabConfig(className, { weekly_lab_hours: Number(hours), notes }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["lab-config", className] }); toastOk("Lab configuration saved!"); },
    onError:    (e) => toastErr(e.response?.data?.error || "Save failed"),
  });

  return (
    <div className="space-y-5">
      {/* Lab Room Banner */}
      <div className={cls(
        "flex items-center gap-3 p-4 rounded-2xl border",
        LAB_ROOM_STYLE[labRoom]
      )}>
        <FlaskConical className="w-5 h-5 shrink-0" />
        <div>
          <p className="text-sm font-extrabold">Lab {labRoom} assigned to {className.replace("_", " ")}</p>
          <p className="text-xs mt-0.5 opacity-80">
            {labRoom === 1
              ? "All A-section classes (UG 1A, UG 2A, UG 3A, PG 1A) share Lab 1"
              : "All B-section classes (UG 1B, UG 2B, UG 3B, PG 2B) share Lab 2"}
            . The auto-generator will prevent conflicts with other classes using this lab.
          </p>
        </div>
      </div>

      {/* Info panel */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>Lab faculty can be unassigned.</strong> Add lab subjects in the Subjects tab and leave
          the faculty field blank if the lab instructor is not yet decided. The system will still
          schedule the lab time block — only the lab room availability is checked as a hard constraint.
        </p>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="p-5 rounded-2xl border border-gray-150 dark:border-gray-700/60 bg-white dark:bg-gray-800/40 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Lab Period Configuration</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label-xs">Total Weekly Lab Hours</label>
              <input
                type="number" min={0} max={30}
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="e.g. 10"
                className="input-field text-sm"
              />
              <p className="text-[10px] text-gray-400">
                Total lab periods across ALL lab subjects for this class per week.
                E.g., if RDBMS Lab = 5 hrs and ASP Lab = 5 hrs, enter 10.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="label-xs">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. RDBMS Lab + ASP Lab"
                className="input-field text-sm"
              />
              <p className="text-[10px] text-gray-400">Reminder for yourself about which labs this class has.</p>
            </div>
          </div>

          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || hours === ""}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMut.isPending ? "Saving…" : "Save Lab Config"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Subjects Tab (formerly Setup) ───────────────────────────────────────────
function SubjectsTab({ className, faculties }) {
  const qc = useQueryClient();
  const labRoom = getLabRoom(className);

  const emptyForm = {
    subject_name: "", subject_code: "", subject_type: "theory",
    weekly_hours: 5, lab_block_size: "", faculty_id: "",
  };
  const [addModal,   setAddModal]   = useState(false);
  const [editModal,  setEditModal]  = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [form,       setForm]       = useState(emptyForm);

  const { data: mapData, isLoading } = useQuery({
    queryKey: ["timetable-mappings", className],
    queryFn:  () => listMappings(className).then(r => r.data.mappings),
  });

  const createMut = useMutation({
    mutationFn: (data) => createMapping(className, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable-mappings", className] }); setAddModal(false); setForm(emptyForm); toastOk("Subject added!"); },
    onError:    (e) => toastErr(e.response?.data?.error || "Failed to add"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateMapping(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable-mappings", className] }); setEditModal(null); toastOk("Subject updated!"); },
    onError:    (e) => toastErr(e.response?.data?.error || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteMapping(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable-mappings", className] }); setDelConfirm(null); toastOk("Subject removed"); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      weekly_hours:  Number(form.weekly_hours),
      lab_block_size: form.subject_type === "lab" ? (Number(form.lab_block_size) || null) : null,
      faculty_id:    form.faculty_id || null,
    };
    editModal
      ? updateMut.mutate({ id: editModal.id, data: payload })
      : createMut.mutate(payload);
  };

  const openEdit = (m) => {
    setForm({
      subject_name:  m.subject_name,
      subject_code:  m.subject_code,
      subject_type:  m.subject_type,
      weekly_hours:  m.weekly_hours,
      lab_block_size: m.lab_block_size || "",
      faculty_id:    m.faculty_id || "",
    });
    setEditModal(m);
  };

  const mappings = mapData || [];
  const theorySubjects = mappings.filter(m => m.subject_type === "theory");
  const labSubjects    = mappings.filter(m => m.subject_type === "lab");

  const MappingForm = ({ onClose }) => (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><label className="label-xs">Subject Name</label>
          <input required value={form.subject_name} onChange={e => setForm(p => ({ ...p, subject_name: e.target.value }))}
            placeholder="e.g. Operating Systems" className="input-field text-sm" /></div>
        <div className="space-y-1"><label className="label-xs">Subject Code</label>
          <input required value={form.subject_code} onChange={e => setForm(p => ({ ...p, subject_code: e.target.value.toUpperCase() }))}
            placeholder="e.g. OS" className="input-field text-sm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><label className="label-xs">Type</label>
          <select value={form.subject_type} onChange={e => setForm(p => ({ ...p, subject_type: e.target.value }))} className="input-field text-sm">
            <option value="theory">Theory</option>
            <option value="lab">Lab / Practical</option>
          </select></div>
        <div className="space-y-1"><label className="label-xs">Weekly Periods</label>
          <input required type="number" min={1} max={30} value={form.weekly_hours}
            onChange={e => setForm(p => ({ ...p, weekly_hours: e.target.value }))} className="input-field text-sm" /></div>
      </div>
      {form.subject_type === "lab" && (
        <div className="space-y-1"><label className="label-xs">Lab Block Size (consecutive periods)</label>
          <select value={form.lab_block_size} onChange={e => setForm(p => ({ ...p, lab_block_size: e.target.value }))} className="input-field text-sm">
            <option value="">— Auto (2) —</option><option value="2">2 periods</option><option value="3">3 periods</option>
          </select>
          <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-1 flex items-center gap-1">
            <FlaskConical className="w-3 h-3" />Will use Lab {labRoom} — conflicts with other classes auto-prevented
          </p>
        </div>
      )}
      <div className="space-y-1"><label className="label-xs">
        Assigned Faculty {form.subject_type === "lab" && <span className="text-[10px] text-gray-400 normal-case">(optional — can leave blank for lab)</span>}
      </label>
        <select value={form.faculty_id} onChange={e => setForm(p => ({ ...p, faculty_id: e.target.value }))} className="input-field text-sm">
          <option value="">— {form.subject_type === "lab" ? "Unassigned / TBD" : "Select Faculty"} —</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select></div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
        <button type="submit" disabled={createMut.isPending || updateMut.isPending}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold disabled:opacity-60 shadow-sm hover:from-indigo-700 hover:to-violet-700 transition-all">
          {createMut.isPending || updateMut.isPending ? "Saving…" : "Save Subject"}</button>
      </div>
    </form>
  );

  const SubjectTable = ({ items, title, emptyMsg }) => (
    <div className="space-y-2">
      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic pl-1">{emptyMsg}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-150 dark:border-gray-700/60">
          <table className="w-full text-sm min-w-[500px]">
            <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Subject</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Code</th>
              <th className="text-center px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Wk Hrs</th>
              {title.includes("Lab") && <th className="text-center px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Block</th>}
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase">Faculty</th>
              <th className="px-4 py-2.5" />
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {items.map(m => (
                <tr key={m.id} className="bg-white dark:bg-gray-800/40 hover:bg-gray-50/60 dark:hover:bg-gray-800/80 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white text-sm">{m.subject_name}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono font-bold">{m.subject_code}</span></td>
                  <td className="px-4 py-2.5 text-center"><span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{m.weekly_hours}</span></td>
                  {title.includes("Lab") && (
                    <td className="px-4 py-2.5 text-center">
                      {m.lab_block_size
                        ? <span className="px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-bold">{m.lab_block_size}hr</span>
                        : <span className="text-gray-300 text-xs">auto</span>}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {m.faculty_name || <span className="text-amber-500 dark:text-amber-400 italic text-xs">TBD / Unassigned</span>}
                  </td>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-500 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDelConfirm(m)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Subject — Faculty Assignments</h3>
          <p className="text-xs text-gray-400 mt-0.5">The auto-generator reads this to build the conflict-free schedule.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setAddModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Add Subject
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="space-y-5">
          <SubjectTable items={theorySubjects} title="Theory Subjects" emptyMsg="No theory subjects yet. Add using the button above." />
          <SubjectTable items={labSubjects}    title="Lab / Practical Subjects" emptyMsg="No lab subjects yet. Lab faculty can be left unassigned." />
        </div>
      )}

      <Modal open={addModal}    onClose={() => setAddModal(false)} title="Add Subject"><MappingForm onClose={() => setAddModal(false)} /></Modal>
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Subject"><MappingForm onClose={() => setEditModal(null)} /></Modal>
      <ConfirmDialog
        open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => deleteMut.mutate(delConfirm.id)}
        title="Remove Subject"
        message={`Remove "${delConfirm?.subject_name}" from ${className.replace("_", " ")}?`}
        confirmText={deleteMut.isPending ? "Removing…" : "Remove"}
        danger
      />
    </div>
  );
}

// ─── Grid Cell ────────────────────────────────────────────────────────────────
function GridCell({ entry, onCancel, onRestore }) {
  const [hov, setHov] = useState(false);
  if (!entry) return (
    <div className="h-14 rounded-xl border border-dashed border-gray-200 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-900/20 flex items-center justify-center">
      <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
    </div>
  );
  if (entry.is_lab_continuation) return <div />;

  const cancelled = entry.is_cancelled;
  const isLab     = entry.is_lab_anchor || entry.subject_type === "lab";
  const span       = entry.lab_span || 1;
  const minH       = span === 3 ? "min-h-[11.5rem]" : span === 2 ? "min-h-[7.5rem]" : "min-h-[3.25rem]";

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className={cls(
        "relative rounded-xl border p-2 transition-all duration-150 group", minH,
        cancelled
          ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 opacity-70"
          : isLab
          ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50"
          : "bg-white dark:bg-gray-800/60 border-gray-150 dark:border-gray-700/60 hover:border-indigo-200 dark:hover:border-indigo-700"
      )}
    >
      <p className={cls(
        "text-[11px] font-extrabold leading-tight truncate",
        cancelled ? "line-through text-red-400" : isLab ? "text-violet-700 dark:text-violet-300" : "text-indigo-700 dark:text-indigo-300"
      )}>
        {entry.subject_code}
        {isLab && <span className="ml-1 text-[9px] opacity-60">×{span}</span>}
      </p>
      <p className={cls(
        "text-[10px] leading-tight mt-0.5 truncate",
        cancelled ? "text-red-300 line-through" : "text-gray-500 dark:text-gray-400"
      )}>
        {entry.faculty_name || <span className="text-amber-500 italic">TBD</span>}
      </p>
      {cancelled && (
        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase">
          <AlertTriangle className="w-2.5 h-2.5" />Cancelled
        </span>
      )}
      {hov && !entry.is_lab_continuation && (
        <div className="absolute top-1 right-1 flex gap-0.5">
          {cancelled
            ? <button onClick={() => onRestore(entry)} className="w-5 h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600"><RotateCcw className="w-2.5 h-2.5" /></button>
            : <button onClick={() => onCancel(entry)}  className="w-5 h-5 rounded-lg bg-red-500    text-white flex items-center justify-center hover:bg-red-600"><X className="w-2.5 h-2.5" /></button>
          }
        </div>
      )}
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ className }) {
  const qc         = useQueryClient();
  const labRoom    = getLabRoom(className);
  const [cancelModal, setCancelModal] = useState(null);
  const [clearConfirm,setClearConfirm]= useState(false);
  const [generating,  setGenerating]  = useState(false);

  const { data: ttData, isLoading } = useQuery({
    queryKey: ["timetable", className],
    queryFn:  () => getTimetable(className).then(r => r.data.entries),
  });

  const genMut = useMutation({
    mutationFn: () => generateTimetable(className),
    onMutate:   () => setGenerating(true),
    onSuccess:  (r) => {
      qc.invalidateQueries({ queryKey: ["timetable", className] });
      toastOk(`✅ ${r.data.total} entries generated for ${className.replace("_", " ")} · Lab ${r.data.lab_room} assigned`);
      setGenerating(false);
    },
    onError: (e) => { toastErr(e.response?.data?.error || "Generation failed"); setGenerating(false); },
  });

  const clearMut = useMutation({
    mutationFn: () => clearTimetable(className),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable", className] }); setClearConfirm(false); toastOk("Timetable cleared"); },
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }) => cancelEntry(className, id, reason),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable", className] }); setCancelModal(null); toastOk("Period marked cancelled"); },
    onError:    (e) => toastErr(e.response?.data?.error || "Failed"),
  });

  const restoreMut = useMutation({
    mutationFn: (id) => restoreEntry(className, id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable", className] }); toastOk("Period restored"); },
  });

  const grid = useMemo(() => {
    const g = {};
    DAYS.forEach(d => { g[d] = {}; PERIODS.forEach(p => { g[d][p] = null; }); });
    (ttData || []).forEach(e => { if (g[e.day]) g[e.day][e.period] = e; });
    return g;
  }, [ttData]);

  const totalEntries    = (ttData || []).filter(e => !e.is_lab_continuation).length;
  const cancelledCount  = (ttData || []).filter(e => e.is_cancelled && !e.is_lab_continuation).length;

  return (
    <div className="space-y-4">
      {/* Lab room indicator */}
      <div className={cls("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold", LAB_ROOM_STYLE[labRoom])}>
        <FlaskConical className="w-3.5 h-3.5" />
        Lab {labRoom} · {className.replace("_", " ")}
        <span className="opacity-60 font-normal">— conflicts with other {labRoom === 1 ? "A" : "B"}-section classes auto-blocked</span>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {totalEntries > 0 && <>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{totalEntries - cancelledCount} active</span>
            {cancelledCount > 0 && <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" />{cancelledCount} cancelled</span>}
          </>}
        </div>
        <div className="flex items-center gap-2">
          {totalEntries > 0 && (
            <button onClick={() => setClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Clear
            </button>
          )}
          <button onClick={() => genMut.mutate()} disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm disabled:opacity-60">
            <Zap className="w-3.5 h-3.5" />
            {generating ? "Generating…" : totalEntries > 0 ? "Re-Generate" : "Auto-Generate"}
          </button>
        </div>
      </div>

      {isLoading ? <Spinner /> : totalEntries === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex items-center justify-center mb-4">
            <CalendarDays className="w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">No timetable generated yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">Configure lab settings and add subjects first, then click Auto-Generate.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-150 dark:border-gray-700/60">
          <div className="min-w-[640px]">
            {/* Header */}
            <div className="grid bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700" style={{ gridTemplateColumns: "60px repeat(6, 1fr)" }}>
              <div className="p-3 text-[10px] font-bold text-gray-400 uppercase">Hr</div>
              {DAYS.map(d => <div key={d} className="p-3 text-center text-xs font-extrabold text-gray-700 dark:text-gray-200">{DAY_LABELS[d]}</div>)}
            </div>
            {/* Rows */}
            {PERIODS.map(period => (
              <div key={period} className="grid border-b border-gray-50 dark:border-gray-700/40 last:border-0" style={{ gridTemplateColumns: "60px repeat(6, 1fr)" }}>
                <div className="p-2 flex items-start justify-center">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold flex items-center justify-center mt-1">{period}</span>
                </div>
                {DAYS.map(day => {
                  const entry = grid[day]?.[period];
                  if (entry?.is_lab_continuation) return <div key={day} className="p-1" />;
                  return (
                    <div key={day} className="p-1">
                      <GridCell entry={entry} onCancel={setCancelModal} onRestore={e => restoreMut.mutate(e.id)} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel modal */}
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Mark Period Cancelled">
        {cancelModal && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800/40">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Day {cancelModal.day} · Hour {cancelModal.period}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cancelModal.subject_name} — {cancelModal.faculty_name || "Unassigned"}</p>
            </div>
            <p className="text-xs text-gray-500">This period will be left as a <strong>gap</strong>. No messages sent.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={() => cancelMut.mutate({ id: cancelModal.id, reason: "Faculty on leave" })} disabled={cancelMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-60">
                {cancelMut.isPending ? "Marking…" : "Mark Cancelled"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={clearConfirm} onClose={() => setClearConfirm(false)} onConfirm={() => clearMut.mutate()}
        title="Clear Timetable"
        message={`Delete all ${totalEntries} entries for ${className.replace("_", " ")}? You can regenerate anytime.`}
        confirmText={clearMut.isPending ? "Clearing…" : "Clear Timetable"}
        danger
      />
    </div>
  );
}

// ─── Leave Manager Tab ────────────────────────────────────────────────────────
function LeaveTab({ className, faculties }) {
  const qc = useQueryClient();
  const [selFaculty, setSelFaculty] = useState("");
  const [selDay,     setSelDay]     = useState("");
  const [subDay,     setSubDay]     = useState("");
  const [subPeriod,  setSubPeriod]  = useState("");

  const { data: ttData } = useQuery({
    queryKey: ["timetable", className],
    queryFn:  () => getTimetable(className).then(r => r.data.entries),
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ["substitutes", subDay, subPeriod],
    queryFn:  () => findSubstitutes(Number(subDay), Number(subPeriod)).then(r => r.data.substitutes),
    enabled:  !!subDay && !!subPeriod,
  });

  const cancelDayMut = useMutation({
    mutationFn: () => cancelFacultyDay(className, selFaculty, Number(selDay), "Faculty on leave"),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable", className] }); toastOk("Periods marked as gap — no messages sent"); },
    onError:    (e) => toastErr(e.response?.data?.error || "Failed"),
  });

  const restoreDayMut = useMutation({
    mutationFn: () => restoreFacultyDay(className, selFaculty, Number(selDay)),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["timetable", className] }); toastOk("Periods restored"); },
    onError:    (e) => toastErr(e.response?.data?.error || "Failed"),
  });

  const affectedPeriods = useMemo(() =>
    (ttData || []).filter(e =>
      String(e.faculty_id) === String(selFaculty) &&
      e.day === Number(selDay) &&
      !e.is_lab_continuation
    ),
  [ttData, selFaculty, selDay]);

  const classFaculties = useMemo(() => {
    if (!ttData) return faculties;
    const fids = new Set((ttData || []).map(e => e.faculty_id).filter(Boolean));
    return faculties.filter(f => fids.has(f.id));
  }, [ttData, faculties]);

  return (
    <div className="space-y-5">
      {/* Faculty Leave */}
      <div className="p-5 rounded-2xl border border-gray-150 dark:border-gray-700/60 bg-white dark:bg-gray-800/40">
        <div className="flex items-center gap-2 mb-4">
          <UserMinus className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mark Faculty Leave</h3>
          <span className="text-[10px] text-gray-400">(leaves as gap — no messages sent)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="space-y-1"><label className="label-xs">Faculty</label>
            <select value={selFaculty} onChange={e => setSelFaculty(e.target.value)} className="input-field text-sm">
              <option value="">— Select Faculty —</option>
              {classFaculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select></div>
          <div className="space-y-1"><label className="label-xs">Day</label>
            <select value={selDay} onChange={e => setSelDay(e.target.value)} className="input-field text-sm">
              <option value="">— Select Day —</option>
              {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </select></div>
        </div>

        {affectedPeriods.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-800/30">
            <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-2">Affected on {DAY_LABELS[selDay]}:</p>
            <div className="flex flex-wrap gap-2">
              {affectedPeriods.map(e => (
                <span key={e.id} className={cls(
                  "px-2 py-1 rounded-lg text-xs font-semibold border",
                  e.is_cancelled
                    ? "bg-red-100 dark:bg-red-900/40 text-red-500 border-red-200 dark:border-red-800 line-through"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                )}>
                  Hr {e.period}: {e.subject_code}{e.is_cancelled && " ✕"}
                </span>
              ))}
            </div>
          </div>
        )}

        {selFaculty && selDay && (
          <div className="flex gap-3">
            <button onClick={() => restoreDayMut.mutate()} disabled={restoreDayMut.isPending || affectedPeriods.every(e => !e.is_cancelled)}
              className="flex-1 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-40">
              <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
              {restoreDayMut.isPending ? "Restoring…" : "Restore All"}
            </button>
            <button onClick={() => cancelDayMut.mutate()} disabled={cancelDayMut.isPending || affectedPeriods.every(e => e.is_cancelled)}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-40">
              <X className="w-3.5 h-3.5 inline mr-1.5" />
              {cancelDayMut.isPending ? "Cancelling…" : "Mark Leave (Gap)"}
            </button>
          </div>
        )}
      </div>

      {/* Substitute Finder */}
      <div className="p-5 rounded-2xl border border-gray-150 dark:border-gray-700/60 bg-white dark:bg-gray-800/40">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Find Free Substitutes</h3>
          <span className="text-xs text-gray-400">(department-wide)</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1"><label className="label-xs">Day</label>
            <select value={subDay} onChange={e => setSubDay(e.target.value)} className="input-field text-sm">
              <option value="">—</option>{DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </select></div>
          <div className="space-y-1"><label className="label-xs">Period</label>
            <select value={subPeriod} onChange={e => setSubPeriod(e.target.value)} className="input-field text-sm">
              <option value="">—</option>{PERIODS.map(p => <option key={p} value={p}>Hour {p}</option>)}
            </select></div>
        </div>
        {subDay && subPeriod && (subsLoading ? <Spinner /> : (
          (subsData || []).length === 0
            ? <p className="text-xs text-gray-400 text-center py-4">No free faculty on {DAY_LABELS[subDay]} Hour {subPeriod}</p>
            : <div className="space-y-2">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{subsData.length} free:</p>
                {subsData.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/30">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-xs font-bold">{f.name[0]}</div>
                    <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{f.name}</p><p className="text-xs text-gray-400">{f.designation}</p></div>
                  </div>
                ))}
              </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const { user } = useAuth();
  const isHOD    = user?.role === "HOD";

  const [activeClass, setActiveClass] = useState("UG_3B");
  const [activeTab,   setActiveTab]   = useState("Schedule");

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn:  () => listFaculty().then(r => r.data.faculty),
  });
  const faculties = facultyData || [];

  if (!isHOD) return (
    <div className="flex items-center justify-center min-h-[60vh] text-center">
      <div>
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">Timetable</h2>
        <p className="text-sm text-gray-400 mt-1">Available for HOD only.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
          <CalendarDays className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Timetable</h1>
          <p className="text-xs text-gray-400 mt-0.5">Auto-generate conflict-free schedules · {CLASSES.length} classes · Lab 1 (A sections) · Lab 2 (B sections)</p>
        </div>
      </div>

      {/* Class Selector */}
      <div className="p-4 rounded-2xl border border-gray-150 dark:border-gray-700/60 bg-white dark:bg-gray-800/40">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Select Class</p>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase w-5 shrink-0">UG</span>
            {CLASSES.filter(c => c.startsWith("UG")).map(c => (
              <ClassPill key={c} name={c} active={activeClass === c} onClick={() => setActiveClass(c)} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase w-5 shrink-0">PG</span>
            {CLASSES.filter(c => c.startsWith("PG")).map(c => (
              <ClassPill key={c} name={c} active={activeClass === c} onClick={() => setActiveClass(c)} />
            ))}
          </div>
        </div>
      </div>

      {/* Active Class Panel */}
      <div className="rounded-2xl border border-gray-150 dark:border-gray-700/60 bg-white dark:bg-gray-800/40 overflow-hidden">

        {/* Banner + Tabs */}
        <div className="px-5 pt-4 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 dark:from-indigo-950/30 dark:to-violet-950/20 border-b border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="px-3 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{activeClass.replace("_", " ")}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {activeClass.startsWith("UG") ? "Undergraduate" : "Postgraduate"} ·{" "}
              {activeClass.includes("1") ? "Year 1" : activeClass.includes("2") ? "Year 2" : "Year 3"} ·{" "}
              Lab {getLabRoom(activeClass)}
            </span>
          </div>

          <div className="flex gap-0 border-b border-gray-100 dark:border-gray-700/60 -mb-px">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cls(
                "px-4 py-2.5 text-xs font-bold border-b-2 transition-all duration-150 whitespace-nowrap",
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}>{tab}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "Lab Setup"      && <LabSetupTab  className={activeClass} />}
          {activeTab === "Subjects"       && <SubjectsTab  className={activeClass} faculties={faculties} />}
          {activeTab === "Schedule"       && <ScheduleTab  className={activeClass} />}
          {activeTab === "Leave Manager"  && <LeaveTab     className={activeClass} faculties={faculties} />}
        </div>
      </div>
    </div>
  );
}
