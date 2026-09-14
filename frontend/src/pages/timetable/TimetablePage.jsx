import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, Zap, Trash2, Plus, Pencil, X, FlaskConical,
  BookOpen, UserMinus, UserCheck, RotateCcw, AlertTriangle,
  CheckCircle2, Save, Info, ChevronRight
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

// ─── Constants ────────────────────────────────────────────────────────────────
const CLASSES    = ["UG_1A","UG_1B","UG_2A","UG_2B","UG_3A","UG_3B","PG_1A","PG_2A"];
const DAYS       = [1,2,3,4,5,6];
const DAY_LABELS = {1:"Mon",2:"Tue",3:"Wed",4:"Thu",5:"Fri",6:"Sat"};
const PERIODS    = [1,2,3,4,5];
const TABS       = ["Lab Setup","Subjects","Schedule","Leave"];

function getLabRoom(cn) {
  if (cn.startsWith("PG")) return 3;
  return cn.endsWith("A") ? 1 : 2;
}

const LAB_META = {
  1: { label:"Lab 1", desc:"UG A-sections", color:"emerald", bg:"bg-emerald-50", border:"border-emerald-200", text:"text-emerald-700", dot:"bg-emerald-500"},
  2: { label:"Lab 2", desc:"UG B-sections", color:"amber", bg:"bg-amber-50", border:"border-amber-200", text:"text-amber-700", dot:"bg-amber-500"},
  3: { label:"PG Lab", desc:"PG classes only", color:"purple", bg:"bg-purple-50", border:"border-purple-200", text:"text-purple-700", dot:"bg-purple-500"},
};

function cls(...a) { return a.filter(Boolean).join(" "); }
function toast(type, msg) {
  window.dispatchEvent(new CustomEvent("app-toast",{detail:{type,message:msg}}));
}

// ─── STANDALONE Subject Form (MUST be outside parent component to prevent focus loss) ─
function SubjectForm({ form, onChange, onSubmit, onClose, faculties, isPending, isEdit }) {
  const isLab = form.subject_type === "lab";
  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label-xs">Subject Name</label>
          <input required autoFocus
            value={form.subject_name}
            onChange={e => onChange("subject_name", e.target.value)}
            placeholder="e.g. Operating Systems"
            className="input-field text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="label-xs">Subject Code</label>
          <input required
            value={form.subject_code}
            onChange={e => onChange("subject_code", e.target.value.toUpperCase())}
            placeholder="e.g. OS"
            className="input-field text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label-xs">Type</label>
          <select value={form.subject_type} onChange={e => onChange("subject_type", e.target.value)} className="input-field text-sm">
            <option value="theory">Theory</option>
            <option value="lab">Lab / Practical</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-xs">Weekly Periods</label>
          <input required type="number" min={1} max={30}
            value={form.weekly_hours}
            onChange={e => onChange("weekly_hours", e.target.value)}
            className="input-field text-sm" />
        </div>
      </div>

      {isLab && (
        <div className="space-y-1.5">
          <label className="label-xs">Lab Block Size (consecutive periods)</label>
          <select value={form.lab_block_size} onChange={e => onChange("lab_block_size", e.target.value)} className="input-field text-sm">
            <option value="">Auto (2 periods)</option>
            <option value="2">2 periods</option>
            <option value="3">3 periods</option>
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="label-xs">
          Faculty {isLab && <span className="text-[10px] text-gray-400 normal-case ml-1">— optional for lab</span>}
        </label>
        <select value={form.faculty_id} onChange={e => onChange("faculty_id", e.target.value)} className="input-field text-sm">
          <option value="">{isLab ? "— TBD / Unassigned —" : "— Select Faculty —"}</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm">
          {isPending ? "Saving…" : isEdit ? "Update Subject" : "Add Subject"}
        </button>
      </div>
    </form>
  );
}

const EMPTY_FORM = { subject_name:"", subject_code:"", subject_type:"theory", weekly_hours:5, lab_block_size:"", faculty_id:"" };

// ─── Lab Setup Tab ────────────────────────────────────────────────────────────
function LabSetupTab({ className }) {
  const qc      = useQueryClient();
  const labRoom = getLabRoom(className);
  const meta    = LAB_META[labRoom];
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["lab-config", className],
    queryFn:  () => getLabConfig(className).then(r => r.data.config),
  });

  useState(() => { if (data) { setHours(String(data.weekly_lab_hours ?? "")); setNotes(data.notes ?? ""); } }, [data]);

  const saveMut = useMutation({
    mutationFn: () => saveLabConfig(className, { weekly_lab_hours: Number(hours)||0, notes }),
    onSuccess: () => { qc.invalidateQueries({queryKey:["lab-config",className]}); toast("success","Lab config saved!"); },
    onError: e => toast("error", e.response?.data?.error || "Save failed"),
  });

  return (
    <div className="space-y-4">
      {/* Lab room card */}
      <div className={cls("flex items-start gap-3 p-4 rounded-2xl border", meta.bg, meta.border)}>
        <div className={cls("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.bg, "border", meta.border)}>
          <FlaskConical className={cls("w-4.5 h-4.5", meta.text)} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cls("text-sm font-extrabold", meta.text)}>{meta.label} assigned</span>
            <span className={cls("px-2 py-0.5 rounded-full text-[10px] font-bold border", meta.bg, meta.border, meta.text)}>{meta.desc}</span>
          </div>
          <p className={cls("text-xs leading-relaxed opacity-80", meta.text)}>
            {labRoom === 1 && "UG 1A, UG 2A, UG 3A share Lab 1. A-section class cannot use Lab 1 simultaneously."}
            {labRoom === 2 && "UG 1B, UG 2B, UG 3B share Lab 2. B-section class cannot use Lab 2 simultaneously."}
            {labRoom === 3 && "PG 1A, PG 2A share the dedicated PG Lab. No conflict with UG labs."}
            {" "}Auto-generator prevents conflicts automatically.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-50 border border-sky-100">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-700 leading-relaxed">
          <strong>Lab faculty can be left blank.</strong> Add lab subjects in Subjects tab with no faculty — the system schedules the lab time slot using only the lab room constraint.
        </p>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            Lab Period Configuration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label-xs">Total Weekly Lab Hours</label>
              <input type="number" min={0} max={30} value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="e.g. 10"
                className="input-field text-sm" />
              <p className="text-[11px] text-gray-400 mt-1">Total across ALL lab subjects for this class. E.g. RDBMS Lab(5hrs) + ASP Lab(5hrs) = 10.</p>
            </div>
            <div className="space-y-1.5">
              <label className="label-xs">Notes (optional)</label>
              <input type="text" value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. RDBMS Lab + ASP Lab"
                className="input-field text-sm" />
              <p className="text-[11px] text-gray-400 mt-1">Reminder of which labs this class has.</p>
            </div>
          </div>
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || hours === ""}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm">
            <Save className="w-3.5 h-3.5" />
            {saveMut.isPending ? "Saving…" : "Save Lab Config"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Subjects Tab ─────────────────────────────────────────────────────────────
// NOTE: SubjectForm is defined OUTSIDE this component (above) to prevent React
// from unmounting it on every keystroke (which would cause cursor focus loss).
function SubjectsTab({ className, faculties }) {
  const qc = useQueryClient();
  const [addOpen,  setAddOpen]  = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem,  setDelItem]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const { data: mapData, isLoading } = useQuery({
    queryKey: ["timetable-mappings", className],
    queryFn:  () => listMappings(className).then(r => r.data.mappings),
  });

  const createMut = useMutation({
    mutationFn: (d) => createMapping(className, d),
    onSuccess: () => { qc.invalidateQueries({queryKey:["timetable-mappings",className]}); setAddOpen(false); setForm(EMPTY_FORM); toast("success","Subject added!"); },
    onError: e => toast("error", e.response?.data?.error || "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({id,d}) => updateMapping(id,d),
    onSuccess: () => { qc.invalidateQueries({queryKey:["timetable-mappings",className]}); setEditItem(null); toast("success","Updated!"); },
    onError: e => toast("error", e.response?.data?.error || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: id => deleteMapping(id),
    onSuccess: () => { qc.invalidateQueries({queryKey:["timetable-mappings",className]}); setDelItem(null); toast("success","Removed"); },
  });

  const handleSubmit = e => {
    e.preventDefault();
    const payload = {
      ...form,
      weekly_hours:  Number(form.weekly_hours),
      lab_block_size: form.subject_type==="lab" ? (Number(form.lab_block_size)||null) : null,
      faculty_id:    form.faculty_id || null,
    };
    editItem
      ? updateMut.mutate({id: editItem.id, d: payload})
      : createMut.mutate(payload);
  };

  const openEdit = m => {
    setForm({ subject_name:m.subject_name, subject_code:m.subject_code, subject_type:m.subject_type, weekly_hours:m.weekly_hours, lab_block_size:m.lab_block_size||"", faculty_id:m.faculty_id||"" });
    setEditItem(m);
  };

  const mappings = mapData || [];
  const theory   = mappings.filter(m => m.subject_type === "theory");
  const labs     = mappings.filter(m => m.subject_type === "lab");

  const MappingRow = ({ m }) => (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{m.subject_name}</p>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-mono font-bold">{m.subject_code}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-bold text-indigo-600">{m.weekly_hours}</span>
      </td>
      {m.subject_type==="lab" && (
        <td className="px-4 py-3 text-center">
          <span className="text-xs font-bold text-violet-600">{m.lab_block_size||2}hr</span>
        </td>
      )}
      <td className="px-4 py-3 text-sm">
        {m.faculty_name
          ? <span className="text-gray-700">{m.faculty_name}</span>
          : <span className="text-amber-500 italic text-xs">TBD</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-500 transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
          <button onClick={() => setDelItem(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </td>
    </tr>
  );

  const SubjectSection = ({ items, label, isLab }) => (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className={cls(
"px-4 py-3 flex items-center gap-2 border-b border-gray-100",
        isLab ?"bg-violet-50/60":"bg-indigo-50/60"
      )}>
        {isLab ? <FlaskConical className="w-4 h-4 text-violet-500" /> : <BookOpen className="w-4 h-4 text-indigo-500" />}
        <span className={cls("text-xs font-bold uppercase tracking-wider", isLab?"text-violet-700":"text-indigo-700")}>{label}</span>
        <span className={cls("ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold", isLab?"bg-violet-100 text-violet-700":"bg-indigo-100 text-indigo-700")}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400 bg-white">
          No {label.toLowerCase()} added yet
        </div>
      ) : (
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-sm min-w-[480px]">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Subject</th>
              <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Code</th>
              <th className="text-center px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Hrs/Wk</th>
              {isLab && <th className="text-center px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Block</th>}
              <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Faculty</th>
              <th className="px-4 py-2" />
            </tr></thead>
            <tbody>{items.map(m => <MappingRow key={m.id} m={m} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Subject — Faculty Assignments</h3>
          <p className="text-xs text-gray-400 mt-0.5">Auto-generator reads this to build the conflict-free timetable.</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Add Subject
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="space-y-4">
          <SubjectSection items={theory} label="Theory Subjects" isLab={false} />
          <SubjectSection items={labs}   label="Lab / Practical Subjects" isLab={true} />
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Subject">
        <SubjectForm
          form={form} onChange={handleChange} onSubmit={handleSubmit}
          onClose={() => setAddOpen(false)} faculties={faculties}
          isPending={createMut.isPending} isEdit={false}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Subject">
        <SubjectForm
          form={form} onChange={handleChange} onSubmit={handleSubmit}
          onClose={() => setEditItem(null)} faculties={faculties}
          isPending={updateMut.isPending} isEdit={true}
        />
      </Modal>

      <ConfirmDialog
        open={!!delItem} onClose={() => setDelItem(null)}
        onConfirm={() => deleteMut.mutate(delItem.id)}
        title="Remove Subject"
        message={`Remove "${delItem?.subject_name}" from ${className.replace("_"," ")}?`}
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
    <div className="h-14 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
      <span className="text-[10px] text-gray-300">—</span>
    </div>
  );
  if (entry.is_lab_continuation) return <div className="h-0" />;

  const cancelled = entry.is_cancelled;
  const isLab     = entry.is_lab_anchor || entry.subject_type === "lab";
  const span       = entry.lab_span || 1;
  const minH       = span === 3 ? "min-h-[11rem]" : span === 2 ? "min-h-[7rem]" : "min-h-[3.25rem]";

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className={cls(
        "relative rounded-lg border p-2 transition-all group select-none", minH,
        cancelled
          ?"bg-red-50 border-red-200 opacity-60"
          : isLab
          ?"bg-violet-50 border-violet-200"
          :"bg-white border-gray-200 hover:border-indigo-300"
      )}
    >
      <p className={cls(
        "text-[11px] font-extrabold leading-none truncate",
        cancelled ?"line-through text-red-400": isLab ?"text-violet-700":"text-indigo-700"
      )}>
        {entry.subject_code}
        {isLab && span > 1 && <span className="ml-1 text-[8px] opacity-50 font-semibold">×{span}</span>}
      </p>
      <p className={cls("text-[10px] mt-0.5 leading-none truncate", cancelled?"text-red-300 line-through":"text-gray-400")}>
        {entry.faculty_name || <span className="text-amber-500">TBD</span>}
      </p>
      {cancelled && <span className="mt-1 flex items-center gap-0.5 text-[9px] font-bold text-red-500"><AlertTriangle className="w-2.5 h-2.5"/>Gap</span>}
      {hov && (
        <div className="absolute top-1 right-1">
          {cancelled
            ? <button onClick={() => onRestore(entry)} className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600"><RotateCcw className="w-2.5 h-2.5"/></button>
            : <button onClick={() => onCancel(entry)}  className="w-5 h-5 rounded bg-red-500    text-white flex items-center justify-center hover:bg-red-600"><X className="w-2.5 h-2.5"/></button>
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
  const meta       = LAB_META[labRoom];
  const [cancelModal, setCancelModal] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [generating, setGenerating]  = useState(false);

  const { data: ttData, isLoading } = useQuery({
    queryKey: ["timetable", className],
    queryFn:  () => getTimetable(className).then(r => r.data.entries),
  });

  const genMut = useMutation({
    mutationFn: () => generateTimetable(className),
    onMutate:   () => setGenerating(true),
    onSuccess:  r  => {
      qc.invalidateQueries({queryKey:["timetable",className]});
      toast("success", `✅ ${r.data.total} entries generated · ${meta.label} assigned`);
      setGenerating(false);
    },
    onError: e => { toast("error", e.response?.data?.error||"Generation failed"); setGenerating(false); },
  });

  const clearMut = useMutation({
    mutationFn: () => clearTimetable(className),
    onSuccess:  () => { qc.invalidateQueries({queryKey:["timetable",className]}); setClearConfirm(false); toast("success","Cleared"); },
  });

  const cancelMut = useMutation({
    mutationFn: ({id,reason}) => cancelEntry(className, id, reason),
    onSuccess:  () => { qc.invalidateQueries({queryKey:["timetable",className]}); setCancelModal(null); toast("success","Marked as gap"); },
    onError:    e  => toast("error", e.response?.data?.error||"Failed"),
  });

  const restoreMut = useMutation({
    mutationFn: id => restoreEntry(className, id),
    onSuccess:  () => { qc.invalidateQueries({queryKey:["timetable",className]}); toast("success","Restored"); },
  });

  const grid = (() => {
    const g = {};
    DAYS.forEach(d => { g[d]={}; PERIODS.forEach(p => { g[d][p]=null; }); });
    (ttData||[]).forEach(e => { if(g[e.day]) g[e.day][e.period]=e; });
    return g;
  })();

  const total     = (ttData||[]).filter(e=>!e.is_lab_continuation).length;
  const cancelled = (ttData||[]).filter(e=>e.is_cancelled&&!e.is_lab_continuation).length;

  return (
    <div className="space-y-4">
      {/* Lab tag + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={cls("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold", meta.bg, meta.border, meta.text)}>
          <FlaskConical className="w-3.5 h-3.5" />{meta.label}
          <span className="opacity-60 font-normal">· {meta.desc}</span>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>{total-cancelled} active</span>
            {cancelled>0 && <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500"/>{cancelled} gap</span>}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {total > 0 && (
            <button onClick={() => setClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5"/>Clear
            </button>
          )}
          <button onClick={() => genMut.mutate()} disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
            <Zap className="w-3.5 h-3.5"/>{generating?"Generating…":total>0?"Re-Generate":"Auto-Generate"}
          </button>
        </div>
      </div>

      {isLoading ? <Spinner /> : total===0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <CalendarDays className="w-10 h-10 text-gray-300 mb-3"/>
          <p className="text-sm font-bold text-gray-600">No timetable yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">Configure Lab Setup + add Subjects first, then click Auto-Generate.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <div style={{minWidth:"640px"}}>
            {/* Header */}
            <div className="grid bg-gray-50 border-b border-gray-100"style={{gridTemplateColumns:"52px repeat(6,1fr)"}}>
              <div className="p-3 text-[10px] font-bold text-gray-400 text-center">Hr</div>
              {DAYS.map(d=><div key={d} className="p-3 text-center text-xs font-black text-gray-600">{DAY_LABELS[d]}</div>)}
            </div>
            {PERIODS.map(period=>(
              <div key={period} className="grid border-b border-gray-100 last:border-0"style={{gridTemplateColumns:"52px repeat(6,1fr)"}}>
                <div className="flex items-center justify-center p-1">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black flex items-center justify-center">{period}</span>
                </div>
                {DAYS.map(day=>{
                  const entry = grid[day]?.[period];
                  if(entry?.is_lab_continuation) return <div key={day} className="p-1 bg-violet-50/30"/>;
                  return (
                    <div key={day} className="p-1">
                      <GridCell entry={entry} onCancel={setCancelModal} onRestore={e=>restoreMut.mutate(e.id)} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel period modal */}
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Mark as Gap">
        {cancelModal && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
              <p className="text-sm font-bold text-gray-900">{DAY_LABELS[cancelModal.day]} · Hour {cancelModal.period}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cancelModal.subject_name} — {cancelModal.faculty_name||"Unassigned"}</p>
            </div>
            <p className="text-xs text-gray-500">This slot will show as a gap. <strong>No messages sent to faculty.</strong></p>
            <div className="flex gap-3">
              <button onClick={()=>setCancelModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={()=>cancelMut.mutate({id:cancelModal.id,reason:"Faculty on leave"})} disabled={cancelMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-60">
                {cancelMut.isPending?"Marking…":"Mark as Gap"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={clearConfirm} onClose={()=>setClearConfirm(false)} onConfirm={()=>clearMut.mutate()}
        title="Clear Timetable" message={`Delete all ${total} entries for ${className.replace("_"," ")}?`}
        confirmText={clearMut.isPending?"Clearing…":"Clear"} danger />
    </div>
  );
}

// ─── Leave Tab ────────────────────────────────────────────────────────────────
function LeaveTab({ className, faculties }) {
  const qc = useQueryClient();
  const [selFac, setSelFac] = useState("");
  const [selDay, setSelDay] = useState("");
  const [subDay, setSubDay] = useState("");
  const [subPer, setSubPer] = useState("");

  const {data:ttData} = useQuery({queryKey:["timetable",className],queryFn:()=>getTimetable(className).then(r=>r.data.entries)});
  const {data:subsData, isLoading:subsLoad} = useQuery({
    queryKey:["substitutes",subDay,subPer],
    queryFn: ()=>findSubstitutes(Number(subDay),Number(subPer)).then(r=>r.data.substitutes),
    enabled:!!subDay&&!!subPer,
  });

  const cancelDayMut = useMutation({
    mutationFn:()=>cancelFacultyDay(className,selFac,Number(selDay),"Faculty on leave"),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["timetable",className]});toast("success","Marked as gap — no messages sent");},
    onError:e=>toast("error",e.response?.data?.error||"Failed"),
  });
  const restoreDayMut = useMutation({
    mutationFn:()=>restoreFacultyDay(className,selFac,Number(selDay)),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["timetable",className]});toast("success","Restored");},
    onError:e=>toast("error",e.response?.data?.error||"Failed"),
  });

  const affected = (ttData||[]).filter(e=>String(e.faculty_id)===String(selFac)&&e.day===Number(selDay)&&!e.is_lab_continuation);
  const classFacs = (() => {
    if(!ttData) return faculties;
    const ids=new Set((ttData||[]).map(e=>e.faculty_id).filter(Boolean));
    return faculties.filter(f=>ids.has(f.id));
  })();

  return (
    <div className="space-y-4">
      {/* Leave section */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-4">
        <div className="flex items-center gap-2">
          <UserMinus className="w-4 h-4 text-red-500"/><h3 className="text-sm font-bold text-gray-900">Faculty Leave</h3>
          <span className="text-[11px] text-gray-400">— leaves gap, no messages</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className="label-xs">Faculty</label>
            <select value={selFac} onChange={e=>setSelFac(e.target.value)} className="input-field text-sm">
              <option value="">— Select —</option>
              {classFacs.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select></div>
          <div className="space-y-1.5"><label className="label-xs">Day</label>
            <select value={selDay} onChange={e=>setSelDay(e.target.value)} className="input-field text-sm">
              <option value="">— Select —</option>
              {DAYS.map(d=><option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </select></div>
        </div>

        {affected.length>0&&(
          <div className="p-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-xs font-bold text-red-600 mb-2">Affected on {DAY_LABELS[selDay]}:</p>
            <div className="flex flex-wrap gap-2">
              {affected.map(e=>(
                <span key={e.id} className={cls("px-2.5 py-1 rounded-lg text-xs font-semibold border",
                  e.is_cancelled?"bg-red-100 text-red-500 border-red-200 line-through"
                                :"bg-white text-gray-700 border-gray-200")}>
                  Hr {e.period}: {e.subject_code}
                </span>
              ))}
            </div>
          </div>
        )}

        {selFac&&selDay&&(
          <div className="flex gap-3">
            <button onClick={()=>restoreDayMut.mutate()} disabled={restoreDayMut.isPending||affected.every(e=>!e.is_cancelled)}
              className="flex-1 py-2.5 rounded-xl border border-emerald-200 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-40">
              <RotateCcw className="w-3.5 h-3.5 inline mr-1.5"/>Restore All
            </button>
            <button onClick={()=>cancelDayMut.mutate()} disabled={cancelDayMut.isPending||affected.every(e=>e.is_cancelled)}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-40">
              <X className="w-3.5 h-3.5 inline mr-1.5"/>Mark Leave
            </button>
          </div>
        )}
      </div>

      {/* Substitute finder */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-500"/><h3 className="text-sm font-bold text-gray-900">Find Free Substitutes</h3>
          <span className="text-xs text-gray-400">department-wide</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className="label-xs">Day</label>
            <select value={subDay} onChange={e=>setSubDay(e.target.value)} className="input-field text-sm">
              <option value="">—</option>{DAYS.map(d=><option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </select></div>
          <div className="space-y-1.5"><label className="label-xs">Period</label>
            <select value={subPer} onChange={e=>setSubPer(e.target.value)} className="input-field text-sm">
              <option value="">—</option>{PERIODS.map(p=><option key={p} value={p}>Hour {p}</option>)}
            </select></div>
        </div>
        {subDay&&subPer&&(subsLoad?<Spinner/>:(
          (subsData||[]).length===0
            ?<p className="text-xs text-gray-400 text-center py-3">No free faculty found</p>
            :<div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-600">{subsData.length} free faculty:</p>
              {subsData.map(f=>(
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-black">{f.name[0]}</div>
                  <div><p className="text-sm font-semibold text-gray-900">{f.name}</p><p className="text-xs text-gray-400">{f.designation}</p></div>
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
  const { user }  = useAuth();
  const isHOD     = user?.role === "HOD";
  const [activeClass, setActiveClass] = useState("UG_3B");
  const [activeTab,   setActiveTab]   = useState("Schedule");

  const {data:facultyData} = useQuery({queryKey:["faculty"],queryFn:()=>listFaculty().then(r=>r.data.faculty)});
  const faculties = facultyData || [];

  if (!isHOD) return (
    <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
      <div>
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
          <CalendarDays className="w-7 h-7 text-indigo-400"/>
        </div>
        <h2 className="text-lg font-bold text-gray-700">Timetable</h2>
        <p className="text-sm text-gray-400 mt-1">Available for HOD only.</p>
      </div>
    </div>
  );

  const ugClasses = CLASSES.filter(c=>c.startsWith("UG"));
  const pgClasses = CLASSES.filter(c=>c.startsWith("PG"));
  const labRoom   = getLabRoom(activeClass);
  const meta      = LAB_META[labRoom];

  return (
    <div className="space-y-5 pb-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
          <CalendarDays className="w-5 h-5 text-white"/>
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Timetable</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Lab 1 · UG A-sections &nbsp;|&nbsp; Lab 2 · UG B-sections &nbsp;|&nbsp; PG Lab · PG classes</p>
        </div>
      </div>

      {/* Class Selector */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Select Class</p>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black text-gray-400 w-6">UG</span>
            {ugClasses.map(c=>(
              <button key={c} onClick={()=>setActiveClass(c)} className={cls(
                "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                activeClass===c
                  ?"bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  :"bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"
              )}>{c.replace("_"," ")}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black text-gray-400 w-6">PG</span>
            {pgClasses.map(c=>(
              <button key={c} onClick={()=>setActiveClass(c)} className={cls(
                "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                activeClass===c
                  ?"bg-purple-600 text-white border-purple-600 shadow-sm"
                  :"bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50"
              )}>{c.replace("_"," ")}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Class Panel */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

        {/* Class header strip */}
        <div className="px-5 pt-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-sm font-extrabold shadow-sm">{activeClass.replace("_"," ")}</span>
            <span className="text-xs text-gray-500">
              {activeClass.startsWith("UG")?"Undergraduate":"Postgraduate"} ·{" "}
              {activeClass.includes("1")?"Year 1":activeClass.includes("2")?"Year 2":"Year 3"}
            </span>
            <div className={cls("ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold", meta.bg, meta.border, meta.text)}>
              <div className={cls("w-1.5 h-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {TABS.map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} className={cls(
                "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                activeTab===tab
                  ?"border-indigo-600 text-indigo-600"
                  :"border-transparent text-gray-500 hover:text-gray-700"
              )}>{tab}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {activeTab==="Lab Setup" && <LabSetupTab className={activeClass} />}
          {activeTab==="Subjects"  && <SubjectsTab className={activeClass} faculties={faculties} />}
          {activeTab==="Schedule"  && <ScheduleTab className={activeClass} />}
          {activeTab==="Leave"     && <LeaveTab    className={activeClass} faculties={faculties} />}
        </div>
      </div>
    </div>
  );
}
