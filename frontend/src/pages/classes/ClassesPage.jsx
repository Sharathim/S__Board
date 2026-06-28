import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
  UG_1A: { label: "UG 1A", short: "1A",  level: "UG",  year: 1, gradient: "from-violet-500 to-purple-600",  ring: "ring-violet-200 dark:ring-violet-900/60",  bg: "bg-violet-50 dark:bg-violet-900/20",  text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800/50" },
  UG_1B: { label: "UG 1B", short: "1B",  level: "UG",  year: 1, gradient: "from-blue-500 to-indigo-600",    ring: "ring-blue-200 dark:ring-blue-900/60",      bg: "bg-blue-50 dark:bg-blue-900/20",      text: "text-blue-700 dark:text-blue-300",   border: "border-blue-200 dark:border-blue-800/50"   },
  UG_2A: { label: "UG 2A", short: "2A",  level: "UG",  year: 2, gradient: "from-pink-500 to-rose-600",      ring: "ring-pink-200 dark:ring-pink-900/60",      bg: "bg-pink-50 dark:bg-pink-900/20",      text: "text-pink-700 dark:text-pink-300",   border: "border-pink-200 dark:border-pink-800/50"   },
  UG_2B: { label: "UG 2B", short: "2B",  level: "UG",  year: 2, gradient: "from-amber-500 to-orange-500",   ring: "ring-amber-200 dark:ring-amber-900/60",    bg: "bg-amber-50 dark:bg-amber-900/20",    text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/50" },
  UG_3A: { label: "UG 3A", short: "3A",  level: "UG",  year: 3, gradient: "from-emerald-500 to-teal-600",   ring: "ring-emerald-200 dark:ring-emerald-900/60",bg: "bg-emerald-50 dark:bg-emerald-900/20",text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/50" },
  UG_3B: { label: "UG 3B", short: "3B",  level: "UG",  year: 3, gradient: "from-cyan-500 to-sky-600",       ring: "ring-cyan-200 dark:ring-cyan-900/60",      bg: "bg-cyan-50 dark:bg-cyan-900/20",      text: "text-cyan-700 dark:text-cyan-300",   border: "border-cyan-200 dark:border-cyan-800/50"   },
  PG_1A: { label: "PG 1A", short: "PG1A",level: "PG",  year: 1, gradient: "from-fuchsia-500 to-pink-600",   ring: "ring-fuchsia-200 dark:ring-fuchsia-900/60",bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20",text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-200 dark:border-fuchsia-800/50" },
  PG_2A: { label: "PG 2A", short: "PG2A",level: "PG",  year: 2, gradient: "from-indigo-500 to-blue-600",    ring: "ring-indigo-200 dark:ring-indigo-900/60",  bg: "bg-indigo-50 dark:bg-indigo-900/20",  text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/50" },
};

function ClassCard({ c, meta, isHOD, onAssignIncharge }) {
  const hasIncharge = !!c.incharge;

  const cardContent = (
    <div className={`group bg-white dark:bg-gray-800/80 rounded-3xl border border-gray-150 dark:border-gray-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between h-full relative ${
      c.can_view_details ? "cursor-pointer" : "opacity-80 cursor-default"
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
          <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            hasIncharge
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
              className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
                hasIncharge
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
  if (!className) return null;
  const meta = CLASS_META[className];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-1.5 rounded-t-2xl bg-gradient-to-r ${meta?.gradient}`} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta?.gradient} flex items-center justify-center`}>
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Incharge</h3>
              <p className="text-xs text-gray-400">{meta?.label} class</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Faculty list */}
        <div className="p-4">
          {eligibleFaculty.length === 0 ? (
            <div className="text-center py-10">
              <UserCog className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No eligible faculty</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All faculty are already assigned as class incharge.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {eligibleFaculty.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onAssign({ className, facultyId: f.id })}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left disabled:opacity-50 group"
                >
                  <Avatar src={f.profile_picture} name={f.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{f.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{f.designation}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Classes</h1>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* HOD only: Student registration toggle "+ New Student" */}
          {isHOD && (
            <button
              onClick={() => toggleRegMutation.mutate()}
              disabled={toggleRegMutation.isPending}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                regOpen
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              } disabled:opacity-60`}
            >
              {regOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              <span>+ New Student</span>
            </button>
          )}

          {/* Grid / List Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
              title="List View"
            >
              <List className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── UG Classes ── */}
      {ugList.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Undergraduate</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/60" />
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{ugList.length} classes</span>
          </div>
          {viewMode === "grid" ? (
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
          ) : (
            <div className="space-y-4">
              {/* Header row for large screens */}
              <div className="hidden lg:grid grid-cols-[minmax(180px,1.2fr)_1.5fr_100px_100px_140px_140px] gap-4 px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wider border-b border-gray-150 dark:border-gray-800/40">
                <span>Class Name</span>
                <span>Class Incharge</span>
                <span className="text-center">Students</span>
                <span className="text-center">Forum</span>
                <span>Level &amp; Year</span>
                <span className="text-center">Actions</span>
              </div>

              <div className="space-y-3">
                {ugList.map((c) => {
                  const meta = CLASS_META[c.class_name];
                  const hasIncharge = !!c.incharge;
                  return (
                    <div
                      key={c.class_name}
                      className="group grid grid-cols-1 lg:grid-cols-[minmax(180px,1.2fr)_1.5fr_100px_100px_140px_140px] gap-4 items-center p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300"
                    >
                      {/* Col 1: Class Name & Link */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta?.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                          <span className="text-xs font-extrabold text-white">{meta?.short || c.class_name}</span>
                        </div>
                        <div className="min-w-0">
                          {c.can_view_details ? (
                            <Link to={`/classes/${c.class_name}`} className="text-sm font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors block truncate">
                              {meta?.label || c.class_name}
                            </Link>
                          ) : (
                            <span className="text-sm font-bold text-gray-900 dark:text-white block truncate">
                              {meta?.label || c.class_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Col 2: Incharge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Incharge:</span>
                        {hasIncharge ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" />
                            <span className="text-xs font-semibold text-gray-750 dark:text-gray-300 truncate">
                              {c.incharge.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not assigned</span>
                        )}
                      </div>

                      {/* Col 3: Students Count */}
                      <div className="flex items-center lg:justify-center">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Students:</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
                          {c.student_count ?? 0}
                        </span>
                      </div>

                      {/* Col 4: Forum Members Count */}
                      <div className="flex items-center lg:justify-center">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Forum:</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
                          {c.forum_member_count ?? 0}
                        </span>
                      </div>

                      {/* Col 5: Level & Year */}
                      <div className="flex items-center">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Year:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta?.bg} ${meta?.text} ${meta?.border}`}>
                          {meta?.level} · Year {meta?.year}
                        </span>
                      </div>

                      {/* Col 6: Actions */}
                      <div className="flex items-center justify-end lg:justify-center">
                        {isHOD ? (
                          <button
                            onClick={() => setInchargeModal(c.class_name)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800/40 text-primary-650 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
                          >
                            Assign
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PG Classes ── */}
      {pgList.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest">Postgraduate</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/60" />
            <span className="text-xs font-bold text-gray-400 dark:text-gray-505">{pgList.length} classes</span>
          </div>
          {viewMode === "grid" ? (
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
          ) : (
            <div className="space-y-4">
              {/* Header row for large screens */}
              <div className="hidden lg:grid grid-cols-[minmax(180px,1.2fr)_1.5fr_100px_100px_140px_140px] gap-4 px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wider border-b border-gray-150 dark:border-gray-800/40">
                <span>Class Name</span>
                <span>Class Incharge</span>
                <span className="text-center">Students</span>
                <span className="text-center">Forum</span>
                <span>Level &amp; Year</span>
                <span className="text-center">Actions</span>
              </div>

              <div className="space-y-3">
                {pgList.map((c) => {
                  const meta = CLASS_META[c.class_name];
                  const hasIncharge = !!c.incharge;
                  return (
                    <div
                      key={c.class_name}
                      className="group grid grid-cols-1 lg:grid-cols-[minmax(180px,1.2fr)_1.5fr_100px_100px_140px_140px] gap-4 items-center p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300"
                    >
                      {/* Col 1: Class Name & Link */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta?.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                          <span className="text-xs font-extrabold text-white">{meta?.short || c.class_name}</span>
                        </div>
                        <div className="min-w-0">
                          {c.can_view_details ? (
                            <Link to={`/classes/${c.class_name}`} className="text-sm font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors block truncate">
                              {meta?.label || c.class_name}
                            </Link>
                          ) : (
                            <span className="text-sm font-bold text-gray-900 dark:text-white block truncate">
                              {meta?.label || c.class_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Col 2: Incharge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Incharge:</span>
                        {hasIncharge ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" />
                            <span className="text-xs font-semibold text-gray-755 dark:text-gray-300 truncate">
                              {c.incharge.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not assigned</span>
                        )}
                      </div>

                      {/* Col 3: Students Count */}
                      <div className="flex items-center lg:justify-center">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Students:</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
                          {c.student_count ?? 0}
                        </span>
                      </div>

                      {/* Col 4: Forum Members Count */}
                      <div className="flex items-center lg:justify-center">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Forum:</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
                          {c.forum_member_count ?? 0}
                        </span>
                      </div>

                      {/* Col 5: Level & Year */}
                      <div className="flex items-center">
                        <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Year:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta?.bg} ${meta?.text} ${meta?.border}`}>
                          {meta?.level} · Year {meta?.year}
                        </span>
                      </div>

                      {/* Col 6: Actions */}
                      <div className="flex items-center justify-end lg:justify-center">
                        {isHOD ? (
                          <button
                            onClick={() => setInchargeModal(c.class_name)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800/40 text-primary-650 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
                          >
                            Assign
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
