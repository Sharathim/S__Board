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

// ─── Class Card ────────────────────────────────────────────────────────────────
function ClassCard({ c, meta, isHOD, onAssignIncharge }) {
  const hasIncharge = !!c.incharge;

  const cardContent = (
    <div className={`group bg-white dark:bg-gray-800/70 rounded-2xl border dark:border-gray-700/60 shadow-card transition-all duration-200 overflow-hidden flex flex-col h-full ${
      c.can_view_details
        ? "border-gray-100 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
        : "border-gray-200 dark:border-gray-700 opacity-80 cursor-default"
    }`}>
      {/* Top gradient stripe */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient} shrink-0`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Icon badge */}
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-sm ring-2 ring-offset-1 ${meta.ring} shrink-0`}>
              <span className="text-sm font-extrabold text-white">{meta.short}</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">{meta.label}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border}`}>
                {meta.level} · Year {meta.year}
              </span>
            </div>
          </div>
          {c.can_view_details && (
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors mt-1 shrink-0" />
          )}
        </div>

        {/* Incharge */}
        <div className={`flex items-center gap-2.5 p-3 rounded-xl mb-4 ${
          hasIncharge
            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40"
            : "bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/40"
        }`}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            hasIncharge ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-gray-100 dark:bg-gray-700"
          }`}>
            <ShieldCheck className={`w-3.5 h-3.5 ${hasIncharge ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Incharge</div>
            <div className={`text-xs font-semibold truncate ${hasIncharge ? "text-emerald-700 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500 italic"}`}>
              {hasIncharge ? c.incharge.name : "Not assigned"}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-700/30 rounded-xl px-3 py-2.5">
            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white">{c.student_count ?? 0}</div>
              <div className="text-[10px] text-gray-400 font-medium">Students</div>
            </div>
          </div>
          {c.forum_member_count !== undefined ? (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-700/30 rounded-xl px-3 py-2.5">
              <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div>
                <div className="text-sm font-extrabold text-gray-900 dark:text-white">{c.forum_member_count}</div>
                <div className="text-[10px] text-gray-400 font-medium">Forum</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-700/30 rounded-xl px-3 py-2.5">
              <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div>
                <div className="text-sm font-extrabold text-gray-900 dark:text-white">{meta.year}</div>
                <div className="text-[10px] text-gray-400 font-medium">Year</div>
              </div>
            </div>
          )}
        </div>

        {/* Restricted message */}
        {!c.can_view_details && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700/40 mb-3">
            <Lock className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">Contact class incharge or HOD</span>
          </div>
        )}

        {/* HOD: Assign Incharge button — pushed to bottom */}
        {isHOD && (
          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/60">
            <button
              onClick={(e) => { e.preventDefault(); onAssignIncharge(c.class_name); }}
              className={`w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                hasIncharge
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40"
                  : "text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-primary-200 dark:border-primary-800/40"
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              {hasIncharge ? `Change: ${c.incharge.name}` : "Assign Incharge"}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-155 dark:border-gray-700">
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-505 uppercase tracking-wider">Class Name</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-505 uppercase tracking-wider">Incharge</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-550 uppercase tracking-wider text-center">Students</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-550 uppercase tracking-wider text-center">Forum</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-550 uppercase tracking-wider">Level &amp; Year</th>
                      <th className="px-6 py-3.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {ugList.map((c) => {
                      const meta = CLASS_META[c.class_name];
                      const hasIncharge = !!c.incharge;
                      return (
                        <tr key={c.class_name} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-gray-900 dark:text-white">
                            {c.can_view_details ? (
                              <Link to={`/classes/${c.class_name}`} className="hover:text-primary-600">
                                {meta?.label || c.class_name}
                              </Link>
                            ) : (
                              meta?.label || c.class_name
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {hasIncharge ? (
                              <span className="text-sm font-semibold text-emerald-650 dark:text-emerald-400">
                                {c.incharge.name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-450 italic">Not assigned</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                            {c.student_count ?? 0}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                            {c.forum_member_count ?? 0}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta?.bg} ${meta?.text} ${meta?.border}`}>
                              {meta?.level} · Year {meta?.year}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {isHOD && (
                              <button
                                onClick={() => setInchargeModal(c.class_name)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-800/40 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
                              >
                                Assign Incharge
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PG Classes ── */}
      {pgList.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Postgraduate</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/60" />
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{pgList.length} classes</span>
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-155 dark:border-gray-700">
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-505 uppercase tracking-wider">Class Name</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-505 uppercase tracking-wider">Incharge</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-550 uppercase tracking-wider text-center">Students</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-550 uppercase tracking-wider text-center">Forum</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-gray-550 uppercase tracking-wider">Level &amp; Year</th>
                      <th className="px-6 py-3.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {pgList.map((c) => {
                      const meta = CLASS_META[c.class_name];
                      const hasIncharge = !!c.incharge;
                      return (
                        <tr key={c.class_name} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-gray-900 dark:text-white">
                            {c.can_view_details ? (
                              <Link to={`/classes/${c.class_name}`} className="hover:text-primary-600">
                                {meta?.label || c.class_name}
                              </Link>
                            ) : (
                              meta?.label || c.class_name
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {hasIncharge ? (
                              <span className="text-sm font-semibold text-emerald-655 dark:text-emerald-400">
                                {c.incharge.name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-450 italic">Not assigned</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                            {c.student_count ?? 0}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                            {c.forum_member_count ?? 0}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta?.bg} ${meta?.text} ${meta?.border}`}>
                              {meta?.level} · Year {meta?.year}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {isHOD && (
                              <button
                                onClick={() => setInchargeModal(c.class_name)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-800/40 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
                              >
                                Assign Incharge
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
