import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { listClasses, toggleStudentRegistration, assignIncharge } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import {
  GraduationCap, Users, ToggleLeft, ToggleRight, Crown,
  Lock, ChevronRight, X, ShieldCheck, BookOpen, UserCog,
  Layers, TrendingUp, LayoutGrid, List
} from "lucide-react";
import { useState } from "react";

// ─── Class display metadata ────────────────────────────────────────────────
const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A", level: "UG", year: 1, gradient: "from-violet-500 to-purple-600", ring: "ring-violet-200 dark:ring-violet-900/60", bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800/50" },
  UG_1B: { label: "UG 1B", short: "1B", level: "UG", year: 1, gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-200 dark:ring-blue-900/60", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/50" },
  UG_2A: { label: "UG 2A", short: "2A", level: "UG", year: 2, gradient: "from-pink-500 to-rose-600", ring: "ring-pink-200 dark:ring-pink-900/60", bg: "bg-pink-50 dark:bg-pink-900/20", text: "text-pink-700 dark:text-pink-300", border: "border-pink-200 dark:border-pink-800/50" },
  UG_2B: { label: "UG 2B", short: "2B", level: "UG", year: 2, gradient: "from-amber-500 to-orange-500", ring: "ring-amber-200 dark:ring-amber-900/60", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/50" },
  UG_3A: { label: "UG 3A", short: "3A", level: "UG", year: 3, gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-200 dark:ring-emerald-900/60", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/50" },
  UG_3B: { label: "UG 3B", short: "3B", level: "UG", year: 3, gradient: "from-cyan-500 to-sky-600", ring: "ring-cyan-200 dark:ring-cyan-900/60", bg: "bg-cyan-50 dark:bg-cyan-900/20", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800/50" },
  PG_1A: { label: "PG 1A", short: "PG1A", level: "PG", year: 1, gradient: "from-fuchsia-500 to-pink-600", ring: "ring-fuchsia-200 dark:ring-fuchsia-900/60", bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-200 dark:border-fuchsia-800/50" },
  PG_2A: { label: "PG 2A", short: "PG2A", level: "PG", year: 2, gradient: "from-indigo-500 to-blue-600", ring: "ring-indigo-200 dark:ring-indigo-900/60", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/50" },
};

function ClassCard({ c, meta, isHOD, onAssignIncharge }) {
  const hasIncharge = !!c.incharge;

  const cardContent = (
    <div className={`group bg-white dark:bg-gray-800/80 rounded-3xl border border-gray-150 dark:border-gray-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between h-full relative ${c.can_view_details ? "cursor-pointer" : "opacity-80 cursor-default"
      }`}>
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-md ring-2 ring-offset-1 ${meta.ring} shrink-0`}>
              <span className="text-sm font-extrabold text-white">{meta.short}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border}`}>
                {meta.level} · Year {meta.year}
              </span>
              {c.can_view_details && (
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-655 dark:group-hover:text-gray-300 transition-colors" />
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight group-hover:text-primary-650 dark:group-hover:text-primary-400 transition-colors">
              {meta.label}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
              {meta.level === "UG" ? "Undergraduate Programme" : "Postgraduate Programme"}
            </p>
          </div>

          {/* Class Incharge block */}
          <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${hasIncharge
              ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/30"
              : "bg-slate-50/50 dark:bg-gray-900/30 border-slate-100/60 dark:border-gray-800/40 border-dashed"
            }`}>
            {hasIncharge ? (
              <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="ring-2 ring-emerald-500/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 border border-dashed border-slate-300 dark:border-gray-700 flex items-center justify-center text-gray-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Class Incharge</div>
              <div className={`text-xs font-bold truncate ${hasIncharge ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-550 italic"}`}>
                {hasIncharge ? c.incharge.name : "Not assigned"}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50/40 dark:bg-gray-900/20 border border-slate-100/60 dark:border-gray-800/40 p-2.5 rounded-xl flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-extrabold text-gray-800 dark:text-gray-200">{c.student_count ?? 0}</div>
                <div className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">Students</div>
              </div>
            </div>

            <div className="bg-slate-50/40 dark:bg-gray-900/20 border border-slate-100/60 dark:border-gray-800/40 p-2.5 rounded-xl flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
              <div>
                <div className="text-xs font-extrabold text-gray-800 dark:text-gray-200">
                  {c.forum_member_count !== undefined ? c.forum_member_count : meta.year}
                </div>
                <div className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                  {c.forum_member_count !== undefined ? "Forum" : "Year"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button for HOD */}
        {isHOD && (
          <div className="mt-4 pt-3.5 border-t border-dashed border-gray-100 dark:border-gray-700/50">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAssignIncharge(c.class_name); }}
              className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 border ${hasIncharge
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                  : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40"
                }`}
            >
              <Crown className="w-3.5 h-3.5" />
              {hasIncharge ? `Change Incharge` : "Assign Incharge"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (c.can_view_details) {
    return (
      <Link to={`/classes/${c.class_name}`} className="block h-full">
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}

// ─── Assign Incharge Modal ────────────────────────────────────────────────────
function AssignInchargeModal({ className, eligibleFaculty, onAssign, onClose, isPending }) {
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  if (!className) return null;
  const meta = CLASS_META[className];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-150 dark:border-gray-700 w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-1.5 rounded-t-3xl bg-gradient-to-r ${meta?.gradient} shrink-0`} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta?.gradient} flex items-center justify-center`}>
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Incharge</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">{meta?.label} class</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Faculty list */}
        <div className="p-4 flex-1 overflow-y-auto min-h-0">
          {eligibleFaculty.length === 0 ? (
            <div className="text-center py-10">
              <UserCog className="w-10 h-10 text-gray-300 dark:text-gray-650 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No eligible faculty</p>
              <p className="text-xs text-gray-400 dark:text-gray-505 mt-1">All faculty are already assigned as class incharge.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-1">
              {eligibleFaculty.map((f) => {
                const isSelected = selectedFacultyId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFacultyId(f.id)}
                    disabled={isPending}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left disabled:opacity-50 group ${isSelected
                        ? "border-primary-500 bg-primary-50/20 dark:bg-primary-950/15"
                        : "border-gray-100 dark:border-gray-700/60 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                      }`}
                  >
                    <Avatar src={f.profile_picture} name={f.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{f.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{f.designation}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-primary-600 bg-primary-600 text-white" : "border-gray-350 dark:border-gray-600"
                      }`}>
                      {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-800/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFacultyId || isPending}
            onClick={() => onAssign({ className, facultyId: selectedFacultyId })}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 text-sm font-bold transition-all shadow-md shadow-indigo-500/10"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClassesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [inchargeModal, setInchargeModal] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  const { data: raw, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then((r) => r.data),
  });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
    enabled: isHOD,
  });

  const toggleRegMutation = useMutation({
    mutationFn: toggleStudentRegistration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  const assignInchargeMutation = useMutation({
    mutationFn: ({ className, facultyId }) => assignIncharge(className, facultyId),
    onSuccess: () => {
      setInchargeModal(null);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
    },
  });

  if (isLoading) return <Spinner />;

  const classes = raw?.classes || [];
  const regOpen = raw?.student_registration_open || false;
  const facultyList = facultyData || [];
  const eligibleFaculty = facultyList.filter((f) => !f.class_incharge_of);

  const ugList = classes.filter((c) => c.class_name.startsWith("UG"));
  const pgList = classes.filter((c) => c.class_name.startsWith("PG"));

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Classes</h1>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* HOD only: Student registration toggle "+ New Student" */}
          {isHOD && (
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700 shadow-sm">
              <button
                type="button"
                onClick={() => toggleRegMutation.mutate()}
                disabled={toggleRegMutation.isPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${regOpen
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                <span>+ New Student</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── UG Classes ── */}
      {ugList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Undergraduate</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/60" />
            <span className="text-xs font-bold text-gray-400 dark:text-gray-505">{ugList.length} classes</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ugList.map((c) => (
              <ClassCard
                key={c.class_name}
                c={c}
                meta={CLASS_META[c.class_name]}
                isHOD={isHOD}
                onAssignIncharge={setInchargeModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── PG Classes ── */}
      {pgList.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest">Postgraduate</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/60" />
            <span className="text-xs font-bold text-gray-400 dark:text-gray-550">{pgList.length} classes</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pgList.map((c) => (
              <ClassCard
                key={c.class_name}
                c={c}
                meta={CLASS_META[c.class_name]}
                isHOD={isHOD}
                onAssignIncharge={setInchargeModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Assign Incharge Modal ── */}
      <AssignInchargeModal
        className={inchargeModal}
        eligibleFaculty={eligibleFaculty}
        onAssign={(payload) => assignInchargeMutation.mutate(payload)}
        onClose={() => setInchargeModal(null)}
        isPending={assignInchargeMutation.isPending}
      />
    </div>
  );
}
