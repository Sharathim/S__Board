import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { usePageTransition } from "../../context/TransitionContext";
import { createPortal } from "react-dom";
import { listClasses, toggleStudentRegistration, assignIncharge, getStudentRegistration } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { Switch } from "../../components/ui/Switch";
import { SearchPicker } from "../../components/shared/SearchPicker";
import { Modal } from "../../components/ui/Modal";
import {
  listForumMembers,
  listEligibleStudents,
  assignForumMember,
  removeForumMember,
  toggleForumCoordinator
} from "../../api/forum";
import {
  GraduationCap, Users, ToggleLeft, ToggleRight, Crown,
  Lock, ChevronRight, ChevronLeft, X, ShieldCheck, BookOpen, UserCog, Copy,
  Layers, TrendingUp, LayoutGrid, List, MoreVertical, Send, Sparkles,
  Plus, Search, Trash2, UserPlus, AlertCircle, CheckCircle2
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { gsap } from "gsap";

// ─── Class display metadata & Theme Palettes (Terracotta Orange Theme) ───────
const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A", level: "UG", year: 1, colorScheme: "orange", badgeBg: "bg-[#F05A2B]", ringColor: "#F05A2B", textAccent: "text-[#F05A2B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(240,90,43,0.28)] border-orange-300 dark:border-orange-800" },
  UG_1B: { label: "UG 1B", short: "1B", level: "UG", year: 1, colorScheme: "orange", badgeBg: "bg-[#F05A2B]", ringColor: "#F05A2B", textAccent: "text-[#F05A2B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(240,90,43,0.28)] border-orange-300 dark:border-orange-800" },
  UG_2A: { label: "UG 2A", short: "2A", level: "UG", year: 2, colorScheme: "terracotta", badgeBg: "bg-[#E04A1B]", ringColor: "#E04A1B", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(224,74,27,0.28)] border-orange-300 dark:border-orange-800" },
  UG_2B: { label: "UG 2B", short: "2B", level: "UG", year: 2, colorScheme: "terracotta", badgeBg: "bg-[#E04A1B]", ringColor: "#E04A1B", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(224,74,27,0.28)] border-orange-300 dark:border-orange-800" },
  UG_3A: { label: "UG 3A", short: "3A", level: "UG", year: 3, colorScheme: "coral", badgeBg: "bg-[#FF8365]", ringColor: "#FF8365", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(255,131,101,0.28)] border-orange-300 dark:border-orange-800" },
  UG_3B: { label: "UG 3B", short: "3B", level: "UG", year: 3, colorScheme: "coral", badgeBg: "bg-[#FF8365]", ringColor: "#FF8365", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(255,131,101,0.28)] border-orange-300 dark:border-orange-800" },
  PG_1A: { label: "PG 1A", short: "PG1A", level: "PG", year: 1, colorScheme: "rose", badgeBg: "bg-[#B83610]", ringColor: "#B83610", textAccent: "text-[#B83610]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(184,54,16,0.28)] border-orange-300 dark:border-orange-800" },
  PG_2A: { label: "PG 2A", short: "PG2A", level: "PG", year: 2, colorScheme: "rose", badgeBg: "bg-[#B83610]", ringColor: "#B83610", textAccent: "text-[#B83610]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(184,54,16,0.28)] border-orange-300 dark:border-orange-800" },
};

function StudentRegistrationBanner() {
  return null;
}

// ─── Standard Mobile & Grid Card Component ──────────────────────────────────
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
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#FF8365] to-[#F05A2B] flex items-center justify-center text-white font-bold text-[18px] shrink-0 shadow-md shadow-orange-500/20">
            {activeMeta.level}
          </div>
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
        className={`flex items-center gap-3 h-[48px] bg-[#fafafa] dark:bg-[#202024] rounded-[10px] p-[10px_14px] border border-slate-100/50 dark:border-[#2E2E34] transition-all ${
          isHOD
            ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-[#27272A] hover:border-slate-200 dark:hover:border-[#3F3F46]"
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
        <div className="h-[52px] bg-[#fafafa] dark:bg-[#202024] border border-slate-100/50 dark:border-[#2E2E34] rounded-[10px] p-2.5 flex items-center gap-[10px]">
          <Users className="w-[18px] h-[18px] text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-gray-800 dark:text-gray-250 leading-none">{c.student_count ?? 0}</span>
            <span className="text-[10px] font-[600] tracking-[0.5px] text-[var(--text-muted)] uppercase mt-[2px] leading-none">Students</span>
          </div>
        </div>
 
        <div className="h-[52px] bg-[#fafafa] dark:bg-[#202024] border border-slate-100/50 dark:border-[#2E2E34] rounded-[10px] p-2.5 flex items-center gap-[10px]">
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

const FORUM_ROLE_META = {
  President: { color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-350", dot: "bg-orange-500" },
  "Vice President": { color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-355", dot: "bg-amber-500" },
  Secretary: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-355", dot: "bg-emerald-500" },
  "Joint Secretary": { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-355", dot: "bg-teal-500" },
  Treasurer: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-355", dot: "bg-rose-500" },
  Member: { color: "bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-355", dot: "bg-slate-400" },
};

// ─── Assign Incharge Modal ────────────────────────────────────────────────────
function AssignInchargeModal({ className, eligibleFaculty, onAssign, onClose, isPending }) {
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  if (!className) return null;
  const meta = CLASS_META[className];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 pt-16 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[78vh] flex flex-col overflow-hidden transition-all shadow-[0_25px_80px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="h-1.5 rounded-t-3xl bg-gradient-to-r from-[#FF8365] via-[#F05A2B] to-[#E04A1B] shrink-0" />
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF8365] to-[#F05A2B] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">Assign Incharge</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 mt-0.5">{meta?.label || className} class</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Faculty list */}
        <div className="p-4 flex-1 overflow-y-auto min-h-0 space-y-2">
          {eligibleFaculty.length === 0 ? (
            <div className="text-center py-10">
              <UserCog className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No eligible faculty</p>
              <p className="text-xs font-medium text-slate-400 mt-1">All faculty are already assigned as class incharge.</p>
            </div>
          ) : (
            eligibleFaculty.map((f) => {
              const isSelected = selectedFacultyId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFacultyId(f.id)}
                  disabled={isPending}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left disabled:opacity-50 group cursor-pointer ${
                    isSelected
                      ? "border-[#F05A2B] bg-[#FFF5F2] dark:bg-orange-950/40 shadow-sm shadow-orange-500/10 ring-1 ring-[#F05A2B]/30"
                      : "border-slate-100 dark:border-slate-800/80 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/30 dark:hover:bg-orange-950/20"
                  }`}
                >
                  <Avatar src={f.profile_picture} name={f.name} size="sm" className="w-9 h-9 ring-2 ring-orange-500/20 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#F05A2B] dark:group-hover:text-[#FF8365] transition-colors">{f.name}</p>
                    <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">{f.designation}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? "border-[#F05A2B] bg-[#F05A2B] text-white" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFacultyId || isPending}
            onClick={() => onAssign({ className, facultyId: selectedFacultyId })}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF8365] via-[#F05A2B] to-[#E04A1B] hover:brightness-110 text-white disabled:opacity-50 text-xs font-black transition-all shadow-md shadow-orange-500/25 active:scale-95"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Classes Page ────────────────────────────────────────────────────────
export default function ClassesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const { navigateWithTransition } = usePageTransition();

  const [inchargeModal, setInchargeModal] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // Default to Grid view on desktop

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [rolePreset, setRolePreset] = useState("President");
  const [customRole, setCustomRole] = useState("");
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showSuccess = (msg) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(""), 3500); };
  const showError = (msg) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(""), 4000); };

  const { data: raw, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then((r) => r.data),
  });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
    enabled: isHOD,
  });

  const { data: forumMembers } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then((r) => r.data.members),
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

  const removeMutation = useMutation({
    mutationFn: removeForumMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      showSuccess("Member removed from Forum.");
    },
    onError: () => showError("Failed to remove member."),
  });

  const coordMutation = useMutation({
    mutationFn: toggleForumCoordinator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      showSuccess("Coordinator role updated.");
    },
    onError: () => showError("Failed to update coordinator role."),
  });

  const assignMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setPendingStudent(null);
      setRolePreset("President");
      setCustomRole("");
      showSuccess("Forum member assigned successfully.");
    },
    onError: (err) => showError(err.response?.data?.error || "Failed to assign member."),
  });

  const memberList = forumMembers || [];
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return memberList;
    const q = memberSearchQuery.toLowerCase();
    return memberList.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.class_name?.toLowerCase().includes(q)
    );
  }, [memberList, memberSearchQuery]);

  if (isLoading) return <Spinner />;

  let classes = raw?.classes || [];
  const regOpen = raw?.student_registration_open || false;
  const facultyList = facultyData || [];
  const eligibleFaculty = facultyList.filter((f) => !f.class_incharge_of);

  if (user?.role === "STUDENT") {
    const studentClassName = user?.student_profile?.class_name || classes.find((c) => c.can_view_details)?.class_name;
    if (studentClassName) {
      return <Navigate to={`/classes/${studentClassName}`} replace />;
    }
    classes = classes.filter((c) => c.can_view_details);
  }

  const ugList = classes.filter((c) => c.class_name.startsWith("UG"));
  const pgList = classes.filter((c) => c.class_name.startsWith("PG"));

  return (
    <div className="space-y-4 animate-fade-in pb-8">

      {/* ── Page Header ── */}
      <div className="flex flex-row items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Classes</h1>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFF5F2] dark:bg-orange-950/40 text-[#F05A2B] border border-orange-200/50 dark:border-orange-900/40">
            {classes.length} Classes Total
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          {/* Forum Members button */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#202024] px-3 h-9 rounded-xl border border-gray-200/60 dark:border-[#26262B] shadow-sm shrink-0">
            <button
              onClick={() => setShowMembersModal(true)}
              className="flex items-center gap-1.5 hover:opacity-85 transition-opacity text-xs font-bold text-gray-800 dark:text-gray-200"
              title="View Forum Members"
            >
              <Users className="w-3.5 h-3.5 text-[#F05A2B] shrink-0" />
              <span>Forum</span>
            </button>

            {/* "+" Button for HOD alone to appoint/manage forum members */}
            {isHOD && (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-5.5 h-5.5 rounded-full bg-gradient-to-r from-[#FF8365] to-[#F05A2B] hover:brightness-110 text-white flex items-center justify-center transition-all active:scale-90 shadow-sm shrink-0 ml-1"
                title="Appoint Forum Member"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          {isHOD && (
            <div className="flex items-center gap-2.5 bg-white dark:bg-[#202024] px-3 h-9 rounded-xl border border-gray-200/60 dark:border-[#26262B] shadow-sm shrink-0">
              <span className="text-xs font-bold text-gray-550 dark:text-gray-400">New Student</span>
              <Switch
                checked={regOpen}
                onChange={() => toggleRegMutation.mutate()}
                loading={toggleRegMutation.isPending}
                size="sm"
              />
            </div>
          )}

          {/* Desktop View Switchers */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-gray-150 dark:bg-[#202024] border border-gray-200/50 dark:border-[#26262B] h-9 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-[#28282D] text-[#F05A2B] dark:text-[#FF8365] shadow-sm"
                  : "text-gray-455 dark:text-gray-400 hover:text-gray-650"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-[#F05A2B] dark:text-[#FF8365] shadow-sm"
                  : "text-gray-455 dark:text-gray-500 hover:text-gray-655"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MOBILE VIEW + DESKTOP FALLBACK GRID/LIST VIEWS ─── */}
      <div className="block">
        {viewMode !== "list" ? (
          <>
            {/* UG Classes */}
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

            {/* PG Classes */}
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
                    className={`group grid grid-cols-1 lg:grid-cols-[minmax(180px,1.5fr)_1fr_1.5fr_1fr_120px] gap-4 items-center p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-gray-150 dark:border-[#26262B] shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300 ${
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
      </div>

      {/* ── Assign Incharge Modal ── */}
      <AssignInchargeModal
        className={inchargeModal}
        eligibleFaculty={eligibleFaculty}
        onAssign={(payload) => assignInchargeMutation.mutate(payload)}
        onClose={() => setInchargeModal(null)}
        isPending={assignInchargeMutation.isPending}
      />

      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xl shadow-emerald-500/30 border border-emerald-400/20 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-2xl shadow-red-500/30 border border-red-400/20 animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{errorMessage}</p>
        </div>
      )}

      {/* ── Add Member Picker ── */}
      <SearchPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add Forum Member"
        queryKey="eligible-students"
        fetchFn={(search) => listEligibleStudents(search).then(r => r.data.students)}
        onPick={(student) => { setPendingStudent(student); setPickerOpen(false); }}
        placeholder="Search students by name, email, roll…"
        emptyText="No eligible students found."
      />

      {/* ── Role Selection Modal ── */}
      {pendingStudent && (
        <Modal open={!!pendingStudent} onClose={() => setPendingStudent(null)} title="Assign Forum Role">
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
              <Avatar src={pendingStudent.profile_picture} name={pendingStudent.name} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{pendingStudent.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {pendingStudent.class_name?.replace("_", " ")} · {pendingStudent.email}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-2">Select Preset Role</label>
              <select
                value={rolePreset}
                onChange={(e) => {
                  setRolePreset(e.target.value);
                  if (e.target.value !== "Custom") {
                    setCustomRole("");
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-gray-250 dark:border-[#26262B] bg-white dark:bg-[#202024] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/25"
              >
                <option value="President">President</option>
                <option value="Vice President">Vice President</option>
                <option value="Secretary">Secretary</option>
                <option value="Joint Secretary">Joint Secretary</option>
                <option value="Media Secretary">Media Secretary</option>
                <option value="Technical Head">Technical Head</option>
                <option value="Technical Coordinator">Technical Coordinator</option>
                <option value="Cultural Secretary">Cultural Secretary</option>
                <option value="Sports Secretary">Sports Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Executive Member">Executive Member</option>
                <option value="Discipline Coordinator">Discipline Coordinator</option>
                <option value="Placement Coordinator">Placement Coordinator</option>
                <option value="Custom">Custom Role...</option>
              </select>
            </div>

            {rolePreset === "Custom" && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-2">Custom Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Vice Secretary, Creative Head"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#202024] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingStudent(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-[#26262B] text-sm font-semibold text-gray-650 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#28282D] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalRole = rolePreset === "Custom" ? customRole.trim() : rolePreset;
                  if (!finalRole) {
                    showError("Please enter a custom designation.");
                    return;
                  }
                  assignMutation.mutate({ studentId: pendingStudent.id, role: finalRole });
                }}
                disabled={assignMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] hover:brightness-110 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
              >
                {assignMutation.isPending ? "Adding…" : `Add as ${rolePreset === "Custom" && customRole ? customRole : rolePreset}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Members Directory Modal ── */}
      <Modal open={showMembersModal} onClose={() => setShowMembersModal(false)} title="Forum Directory" size="lg">
        <div className="space-y-5 pt-1">
          {/* Member Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, role or class..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-gray-250 dark:border-[#26262B] bg-gray-55/50 dark:bg-[#202024] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition-all"
            />
            {memberSearchQuery && (
              <button onClick={() => setMemberSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Members List (Fancy Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <div className="col-span-2 text-center py-10">
                <p className="text-xs text-gray-400 italic">No matching members found</p>
              </div>
            ) : (
              filteredMembers.map(m => {
                const isLeader = m.role?.toLowerCase() === "president" || m.role?.toLowerCase() === "vice president";
                const roleMeta = FORUM_ROLE_META[m.role] || { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400" };
                return (
                  <div
                    key={m.id}
                    className={`relative flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-800/60 border border-gray-150 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-900/40 transition-all ${
                      isLeader ? "ring-2 ring-orange-500/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <Avatar src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-orange-500/10 shrink-0" />
                        {isLeader && (
                          <div className="absolute -top-1.5 -left-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                            <Crown className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight flex items-center gap-1.5">
                          {m.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border border-current/10 ${roleMeta.color}`}>
                            {m.role}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/80 text-gray-550 dark:text-gray-300">
                            {m.class_name?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isHOD && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => removeMutation.mutate(m.id)}
                          disabled={removeMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
