import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTransition } from "../../context/TransitionContext";
import { createPortal } from "react-dom";
import { listClasses, toggleStudentRegistration, assignIncharge, getStudentRegistration } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { Switch } from "../../components/ui/Switch";
import {
  GraduationCap, Users, ToggleLeft, ToggleRight, Crown,
  Lock, ChevronRight, X, ShieldCheck, BookOpen, UserCog, Copy,
  Layers, TrendingUp, LayoutGrid, List, Trophy
} from "lucide-react";
import { useState, useEffect } from "react";

// ─── Class display metadata ────────────────────────────────────────────────
const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A", level: "UG", year: 1, gradient: "from-violet-500 to-violet-600", ring: "ring-violet-200 dark:ring-violet-900/60", bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800/50" },
  UG_1B: { label: "UG 1B", short: "1B", level: "UG", year: 1, gradient: "from-blue-500 to-blue-600", ring: "ring-blue-200 dark:ring-blue-900/60", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/50" },
  UG_2A: { label: "UG 2A", short: "2A", level: "UG", year: 2, gradient: "from-pink-500 to-pink-600", ring: "ring-pink-200 dark:ring-pink-900/60", bg: "bg-pink-50 dark:bg-pink-900/20", text: "text-pink-700 dark:text-pink-300", border: "border-pink-200 dark:border-pink-800/50" },
  UG_2B: { label: "UG 2B", short: "2B", level: "UG", year: 2, gradient: "from-amber-500 to-amber-600", ring: "ring-amber-200 dark:ring-amber-900/60", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/50" },
  UG_3A: { label: "UG 3A", short: "3A", level: "UG", year: 3, gradient: "from-emerald-500 to-emerald-600", ring: "ring-emerald-200 dark:ring-emerald-900/60", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/50" },
  UG_3B: { label: "UG 3B", short: "3B", level: "UG", year: 3, gradient: "from-cyan-500 to-cyan-600", ring: "ring-cyan-200 dark:ring-cyan-900/60", bg: "bg-cyan-50 dark:bg-cyan-900/20", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800/50" },
  PG_1A: { label: "PG 1A", short: "PG1A", level: "PG", year: 1, gradient: "from-fuchsia-500 to-fuchsia-600", ring: "ring-fuchsia-200 dark:ring-fuchsia-900/60", bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-200 dark:border-fuchsia-800/50" },
  PG_2A: { label: "PG 2A", short: "PG2A", level: "PG", year: 2, gradient: "from-indigo-500 to-indigo-600", ring: "ring-indigo-200 dark:ring-indigo-900/60", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/50" },
};

function StudentRegistrationBanner() {
  return null;
}

function ClassCard({ c, meta, isHOD, onAssignIncharge, onNavigate }) {
  const hasIncharge = !!c.incharge;
  const activeMeta = meta || {
    label: c.class_name,
    level: c.class_name.startsWith("PG") ? "PG" : "UG",
    year: 1
  };

  const cardContent = (
    <div className={`group class-card-redesign mx-auto ${
      c.can_view_details ? "cursor-pointer" : "opacity-80 cursor-default"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Left Icon: Rounded square, 44x44, Radius: 12px, Text UG/PG 18px */}
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[18px] shrink-0">
            {activeMeta.level}
          </div>
          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h3 className="text-[16px] font-[700] leading-[22px] text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
              {activeMeta.label}
            </h3>
            <p className="text-[13px] font-[500] text-[var(--text-secondary)] leading-none mt-[2px]">
              {activeMeta.level === "UG" ? "Undergraduate" : "Postgraduate"}
            </p>
          </div>
        </div>
        {c.can_view_details && (
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
        )}
      </div>

      {/* Class Incharge Info Block */}
      <div
        onClick={(e) => {
          if (isHOD) {
            e.preventDefault();
            e.stopPropagation();
            onAssignIncharge(c.class_name);
          }
        }}
        className={`flex items-center gap-3 h-[48px] bg-[#fafafa] dark:bg-slate-950 rounded-[10px] p-[10px_14px] border border-slate-100/50 dark:border-slate-700 transition-all ${
          isHOD
            ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80"
            : ""
        }`}
      >
        {hasIncharge ? (
          <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="w-[34px] h-[34px] ring-2 ring-primary/20 shrink-0" />
        ) : (
          <div className="w-[34px] h-[34px] rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <span className="text-[10px] font-[600] tracking-[0.8px] text-[var(--text-muted)] uppercase leading-none">Class Incharge</span>
          <span className={`text-[14px] font-[600] leading-[18px] truncate mt-[2px] ${hasIncharge ? "text-gray-800 dark:text-gray-200" : "text-slate-400 dark:text-slate-500 italic"}`}>
            {hasIncharge ? c.incharge.name : "Not Assigned"}
          </span>
        </div>
      </div>
 
      {/* Statistics Block */}
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-2.5">
        {/* Students */}
        <div className="h-[52px] bg-[#fafafa] dark:bg-slate-950 border border-slate-100/50 dark:border-slate-700 rounded-[10px] p-2.5 flex items-center gap-[10px]">
          <Users className="w-[18px] h-[18px] text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-gray-800 dark:text-gray-250 leading-none">{c.student_count ?? 0}</span>
            <span className="text-[10px] font-[600] tracking-[0.5px] text-[var(--text-muted)] uppercase mt-[2px] leading-none">Students</span>
          </div>
        </div>
 
        {/* Year / Forum Members */}
        <div className="h-[52px] bg-[#fafafa] dark:bg-slate-950 border border-slate-100/50 dark:border-slate-700 rounded-[10px] p-2.5 flex items-center gap-[10px]">
          <BookOpen className="w-[18px] h-[18px] text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-gray-800 dark:text-gray-250 leading-none">
              {`Year ${activeMeta.year}`}
            </span>
            <span className="text-[10px] font-[600] tracking-[0.5px] text-[var(--text-muted)] uppercase mt-[2px] leading-none">
              Year
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (c.can_view_details) {
    const meta = CLASS_META[c.class_name];
    return (
      <div 
        onClick={() => onNavigate(`/classes/${c.class_name}`, meta?.label || c.class_name, BookOpen)} 
        className="block cursor-pointer"
      >
        {cardContent}
      </div>
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
  const { navigateWithTransition } = usePageTransition();

  const { data: invite } = useQuery({
    queryKey: ["student-invite"],
    queryFn: () => getStudentRegistration().then((r) => ({
      ...r.data,
      invite_link: `${window.location.origin}/invite/student/${r.data.token}`
    })),
    enabled: isHOD,
  });

  const [inchargeModal, setInchargeModal] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [showLeaderboardPopup, setShowLeaderboardPopup] = useState(false);

  useEffect(() => {
    if (!showLeaderboardPopup) return;
    const timer = setTimeout(() => setShowLeaderboardPopup(false), 2000);
    return () => clearTimeout(timer);
  }, [showLeaderboardPopup]);

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
      <div className="flex flex-row items-center justify-between gap-2 mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Classes</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Leaderboard button */}
          <div className="relative">
            <button
              onClick={() => setShowLeaderboardPopup(true)}
              className="flex items-center gap-2 px-3 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 shadow-sm text-xs font-bold transition-all shrink-0"
              title="View Class Leaderboard"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Leaderboard</span>
            </button>
            {showLeaderboardPopup && (
              <div className="absolute right-0 top-full mt-1.5 px-3 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[11px] font-bold rounded-lg shadow-md border border-gray-800 dark:border-gray-200 whitespace-nowrap animate-fade-in z-30">
                Coming soon!
              </div>
            )}
          </div>

          {/* HOD only: Student registration toggle "Student Invite" */}
          {isHOD && (
            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3 h-9 rounded-xl border border-gray-200/60 dark:border-gray-700 shadow-sm shrink-0">
              <span className="text-xs font-bold text-gray-550 dark:text-gray-400">New Student</span>
              <Switch
                checked={regOpen}
                onChange={() => toggleRegMutation.mutate()}
                loading={toggleRegMutation.isPending}
                size="sm"
              />
            </div>
          )}

          {/* Grid / List Switcher */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-gray-150 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 h-9 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-indigo-650 dark:text-indigo-400 shadow-sm"
                  : "text-gray-455 dark:text-gray-500 hover:text-gray-650"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-indigo-650 dark:text-indigo-400 shadow-sm"
                  : "text-gray-455 dark:text-gray-500 hover:text-gray-655"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <>
          {/* ── UG Classes ── */}
          {ugList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Undergraduate ({ugList.length} classes)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {ugList.map((c) => (
                  <ClassCard
                    key={c.class_name}
                    c={c}
                    meta={CLASS_META[c.class_name]}
                    isHOD={isHOD}
                    onAssignIncharge={setInchargeModal}
                    onNavigate={navigateWithTransition}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── PG Classes ── */}
          {pgList.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Postgraduate ({pgList.length} classes)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {pgList.map((c) => (
                  <ClassCard
                    key={c.class_name}
                    c={c}
                    meta={CLASS_META[c.class_name]}
                    isHOD={isHOD}
                    onAssignIncharge={setInchargeModal}
                    onNavigate={navigateWithTransition}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* List View */
        <div className="space-y-4">
          <div className="hidden lg:grid grid-cols-[minmax(180px,1.5fr)_1fr_1.5fr_1fr_120px] gap-4 px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider border-b border-gray-150 dark:border-gray-800/40">
            <span>Class Name</span>
            <span>Level</span>
            <span>Class Incharge</span>
            <span className="text-center">Students</span>
            <span className="text-right">Action</span>
          </div>
          <div className="space-y-2.5">
            {classes.map((c) => {
              const meta = CLASS_META[c.class_name];
              const hasIncharge = !!c.incharge;
              return (
                <div
                  key={c.class_name}
                  onClick={() => c.can_view_details && navigateWithTransition(`/classes/${c.class_name}`, meta?.label || c.class_name, BookOpen)}
                  className={`group grid grid-cols-1 lg:grid-cols-[minmax(180px,1.5fr)_1fr_1.5fr_1fr_120px] gap-4 items-center p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300 ${
                    c.can_view_details ? "cursor-pointer" : "opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                      {meta?.short || c.class_name}
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{meta?.label || c.class_name}</span>
                  </div>

                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {meta?.level === "UG" ? "Undergraduate" : "Postgraduate"}
                  </span>

                  <div className="flex items-center gap-2">
                    {hasIncharge ? (
                      <>
                        <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="w-6.5 h-6.5 ring-2 ring-primary/10 shrink-0" />
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-250 truncate">{c.incharge.name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not Assigned</span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center">
                    {c.student_count ?? 0} Students
                  </span>

                  <div className="text-right" onClick={(e) => e.stopPropagation()}>
                    {isHOD ? (
                      <button
                        onClick={() => setInchargeModal(c.class_name)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-755 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 transition-all active:scale-95"
                      >
                        Assign Incharge
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
