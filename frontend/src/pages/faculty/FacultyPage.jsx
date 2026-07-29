import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFaculty,
  updateFaculty,
  assignIncharge,
  deleteFaculty,
  getFacultyInvite,
  toggleFacultyInvite,
} from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/Switch";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  Users, ToggleLeft, ToggleRight, MoreVertical, Trash2,
  UserCheck, UserX, Pencil, Mail, GraduationCap, BookOpen,
  FolderKanban, Search, Link2, Copy, CheckCheck, ChevronDown,
  ShieldCheck, Star, TrendingUp, X, LayoutGrid, List
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

const CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];

const DESIGNATION_OPTIONS = ["Professor", "Associate Professor", "Assistant Professor"];

// ─── Avatar helpers ───────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || "?").toUpperCase();
}

function Avatar({ fac, size = "lg", className = "" }) {
  const sizeClass = size === "lg" ? "w-[52px] h-[52px] text-base" : "w-10 h-10 text-sm";

  if (fac.profile_picture) {
    return (
      <img
        src={fac.profile_picture}
        alt={fac.name}
        className={`${sizeClass} rounded-2xl object-cover ring-2 ring-[#5B5CEB] shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center font-bold text-[#5B5CEB] dark:text-indigo-300 ring-2 ring-[#5B5CEB] shrink-0 ${className}`}>
      {getInitials(fac.name)}
    </div>
  );
}

// ─── Gmail Icon ───────────────────────────────────────────────────────────────
function GmailIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#F2F2F2"/>
      <path d="M22 6V18C22 19.1 21.1 20 20 20H18V8.5L12 13L6 8.5V20H4C2.9 20 2 19.1 2 18V6C2 5.23 2.44 4.57 3.07 4.25L12 11L20.93 4.25C21.56 4.57 22 5.23 22 6Z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Designation Badge ────────────────────────────────────────────────────────
function DesignationBadge({ designation }) {
  const map = {
    "Professor":            { color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50", icon: Star },
    "Associate Professor":  { color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50",     icon: TrendingUp },
    "Assistant Professor":  { color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50", icon: GraduationCap },
  };
  const style = map[designation] || map["Professor"];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${style.color}`}>
      <Icon className="w-2.5 h-2.5 opacity-90" />
      {designation}
    </span>
  );
}

// ─── Class Chip ───────────────────────────────────────────────────────────────
function ClassChip({ label }) {
  return (
    <span className="inline-flex items-center justify-center px-[12px] h-[28px] rounded-full text-[11px] font-semibold border bg-white dark:bg-gray-800/40 border-[#DDE3ED] dark:border-gray-700 text-[#4F46E5] dark:text-indigo-400 shrink-0">
      {label.replace("_", " ")}
    </span>
  );
}


// ─── Invite Banner ────────────────────────────────────────────────────────────
function InviteBanner() {
  return null;
}

// ─── Faculty Card ─────────────────────────────────────────────────────────────
function FacultyCard({ fac, isHOD, userId, userRole, user, onEdit, onDelete, onAssignIncharge, onRemoveIncharge }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMe = user && (fac.user_id === user.id || fac.id === user.id || (fac.email && user.email && fac.email.toLowerCase() === user.email.toLowerCase()));

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (!e.target.closest(".kebab-container")) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className={`group rounded-[20px] shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition-all duration-200 ease-out flex flex-col justify-between h-full relative p-[20px] ${
      isMe
        ? "ring-2 ring-indigo-500/50 border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/30 dark:via-gray-800 dark:to-gray-800"
        : "bg-white dark:bg-gray-800/80 border border-[#E5E7EB] dark:border-gray-700/80 hover:border-[#5B5CEB] dark:hover:border-[#5B5CEB] hover:-translate-y-[2px]"
    } ${menuOpen ? "z-30" : "z-10"}`}>
      {/* Top half container that will grow to fill space */}
      <div className="flex flex-col flex-1">
        {/* Top Section (Avatar & Actions) */}
        <div className="flex justify-between items-start">
          <Avatar fac={fac} size="lg" />

          {/* Actions button strip */}
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${fac.email}`}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-500 hover:text-[#5B5CEB] dark:text-gray-400 dark:hover:text-white transition-colors"
              title={`Email ${fac.name}`}
            >
              <GmailIcon className="w-3.5 h-3.5" />
            </a>

            {isHOD ? (
              <div className="relative kebab-container">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150/80 dark:border-gray-700 py-1.5 z-30 animate-fade-in">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (fac.class_incharge_of) {
                          onRemoveIncharge(fac);
                        } else {
                          onAssignIncharge(fac);
                        }
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-605 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-955/20 font-medium transition-colors text-left"
                    >
                      {fac.class_incharge_of
                        ? <><UserX className="w-4 h-4" />Remove as Incharge</>
                        : <><UserCheck className="w-4 h-4" />Assign as Incharge</>
                      }
                    </button>
                    <div className="my-1.5 h-px bg-gray-100 dark:bg-gray-700 mx-3" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete(fac);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-655 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20 font-medium transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Faculty
                    </button>
                  </div>
                )}
              </div>
            ) : (
              (userRole === "FACULTY" && (userId === fac.user_id || userId === fac.id)) && (
                <button
                  onClick={() => onEdit(fac)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-655 transition-all"
                  title="Edit your profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Faculty Name & YOU Badge */}
        <div className="mt-[8px] flex items-center justify-between gap-2">
          <h3 className="text-[24px] lg:text-[26px] font-bold text-[#1E293B] dark:text-white leading-tight tracking-tight group-hover:text-[#5B5CEB] dark:group-hover:text-indigo-400 transition-colors truncate">
            {fac.name}
          </h3>
          {isMe && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs shrink-0">
              YOU
            </span>
          )}
        </div>

        {/* Email Address */}
        <div className="mt-[8px]">
          <p className="text-[14px] font-medium text-[#64748B] dark:text-gray-400 truncate leading-none">
            {fac.email}
          </p>
        </div>

        {/* Designation Badge */}
        <div className="mt-[10px]">
          <DesignationBadge designation={fac.designation || "Professor"} />
        </div>

        {/* Class Chips */}
        <div className="mt-[8px] flex flex-wrap gap-1.5 flex-1 align-content-start">
          {fac.classes_handling?.length > 0 ? (
            fac.classes_handling.map((cls) => (
              <ClassChip key={cls} label={cls} />
            ))
          ) : (
            <span className="text-[11px] text-gray-400 dark:text-gray-505 italic mt-1">No classes</span>
          )}
          {fac.class_incharge_of && (
            <ClassChip label={`IC: ${fac.class_incharge_of}`} />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mt-[18px] border-t border-[#EEF2F7] dark:border-gray-700" />

      {/* Bottom Section */}
      <div className="mt-[16px] flex items-center justify-start gap-1.5">
        <FolderKanban className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="text-[12px] font-bold text-gray-550 dark:text-gray-400">Projects</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          fac.project_count > 0 
            ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30" 
            : "bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 border border-slate-100 dark:border-gray-700/60"
        }`}>
          {fac.project_count || 0} Active
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FacultyPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [assignModal,  setAssignModal]  = useState(null);
  const [selectedClass,setSelectedClass]= useState("");
  const [editModal,    setEditModal]    = useState(null);
  const [editName,     setEditName]     = useState("");
  const [editDesignation,setEditDesignation] = useState("Professor");
  const [editClasses,  setEditClasses]  = useState([]);
  const [deleteConfirm,setDeleteConfirm]= useState(null);
  const [viewMode,     setViewMode]     = useState("grid");
  const [openKebabId,  setOpenKebabId]  = useState(null);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".kebab-container-list")) setOpenKebabId(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
  });

  const { data: invite } = useQuery({
    queryKey: ["faculty-invite"],
    queryFn: () => getFacultyInvite().then((r) => ({
      ...r.data,
      invite_link: `${window.location.origin}/invite/faculty/${r.data.token}`
    })),
    enabled: isHOD,
  });

  const facultyList = data || [];

  // ── Derived stats ──
  const stats = useMemo(() => ({
    total: facultyList.length,
    withIncharge: facultyList.filter((f) => f.class_incharge_of).length,
    totalProjects: facultyList.reduce((s, f) => s + (f.project_count || 0), 0),
    professors: facultyList.filter((f) => f.designation === "Professor").length,
  }), [facultyList]);

  // ── Filtered & Sorted list (Logged in user sorted FIRST) ──
  const filtered = useMemo(() => {
    if (!facultyList || facultyList.length === 0) return [];
    const list = [...facultyList];
    if (user) {
      list.sort((a, b) => {
        const aIsMe = a.user_id === user.id || a.id === user.id || (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase());
        const bIsMe = b.user_id === user.id || b.id === user.id || (b.email && user.email && b.email.toLowerCase() === user.email.toLowerCase());
        if (aIsMe && !bIsMe) return -1;
        if (!aIsMe && bIsMe) return 1;
        return 0;
      });
    }
    return list;
  }, [facultyList, user]);

  // ── Mutations ──
  const assignMutation = useMutation({
    mutationFn: ({ id, className }) => assignIncharge(id, className),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["faculty"] }); setAssignModal(null); setSelectedClass(""); },
  });

  const toggleInviteMutation = useMutation({
    mutationFn: toggleFacultyInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculty-invite"] }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => updateFaculty(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["faculty"] }); setEditModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteFaculty(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["faculty"] }); setDeleteConfirm(null); },
  });

  const handleOpenEdit = (fac) => {
    setEditModal(fac);
    setEditName(fac.name);
    setEditDesignation(fac.designation || "Professor");
    setEditClasses(fac.classes_handling || []);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editModal) return;
    editMutation.mutate({ id: editModal.id, data: { name: editName, designation: editDesignation, classes_handling: editClasses } });
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex flex-row items-center justify-between gap-2 mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Faculty</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* HOD only: Invite toggle "Faculty Invite" */}
          {isHOD && invite && (
            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3 h-9 rounded-xl border border-gray-200/60 dark:border-gray-700 shadow-sm shrink-0">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">New Faculty</span>
              <Switch
                checked={invite.is_active}
                onChange={() => toggleInviteMutation.mutate()}
                loading={toggleInviteMutation.isPending}
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
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-450 dark:text-gray-500 hover:text-gray-650"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-455 dark:text-gray-500 hover:text-gray-655"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* HOD only: Invite Link Banner */}
      {isHOD && invite && (
        <div className="mb-4">
          <InviteBanner
            invite={invite}
            onToggle={() => toggleInviteMutation.mutate()}
            isToggling={toggleInviteMutation.isPending}
          />
        </div>
      )}

      {/* ── Faculty Grid / List View ── */}
      {facultyList.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-violet-50 dark:bg-violet-900/20 border-2 border-dashed border-violet-200 dark:border-violet-800/40 flex items-center justify-center mb-5">
            <GraduationCap className="w-9 h-9 text-violet-400 dark:text-violet-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">No faculty members yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            {isHOD
              ? "Enable the faculty invite link above to allow faculty to self-register."
              : "Faculty members will appear here once they've been onboarded."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((fac) => (
            <FacultyCard
              key={fac.id}
              fac={fac}
              isHOD={isHOD}
              userId={user?.id}
              userRole={user?.role}
              user={user}
              onEdit={handleOpenEdit}
              onDelete={setDeleteConfirm}
              onAssignIncharge={(f) => { setAssignModal(f); setSelectedClass(""); }}
              onRemoveIncharge={(f) => assignMutation.mutate({ id: f.id, className: "" })}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header row for large screens */}
          <div className="hidden lg:grid grid-cols-[minmax(200px,1.5fr)_140px_1fr_140px_80px_80px] gap-4 px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-150 dark:border-gray-800/40">
            <span>Faculty Member</span>
            <span>Designation</span>
            <span>Classes Handling</span>
            <span>Class Incharge</span>
            <span className="text-center">Projects</span>
            <span className="text-center">Actions</span>
          </div>

          <div className="space-y-3">
            {filtered.map((fac) => {
              const isMe = user && (fac.user_id === user.id || fac.id === user.id || (fac.email && user.email && fac.email.toLowerCase() === user.email.toLowerCase()));
              return (
                <div
                  key={fac.id}
                  className={`group grid grid-cols-1 lg:grid-cols-[minmax(200px,1.5fr)_140px_1fr_140px_80px_80px] gap-4 items-center p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 transition-all duration-300 relative ${
                    isMe
                      ? "ring-2 ring-indigo-500/50 border-2 border-indigo-500/60 bg-gradient-to-r from-indigo-50/40 via-white to-white dark:from-indigo-950/30 dark:via-gray-800 dark:to-gray-800"
                      : "bg-white dark:bg-gray-800/80 border border-gray-150 dark:border-gray-700/80 hover:border-indigo-500/20"
                  } ${openKebabId === fac.id ? "z-30" : "z-10"}`}
                >
                  {/* Col 1: Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar fac={fac} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{fac.name}</p>
                        {isMe && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-450 dark:text-gray-550 mt-0.5 truncate">{fac.email}</p>
                    </div>
                  </div>

                {/* Col 2: Designation */}
                <div className="flex items-center">
                  <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Role:</span>
                  <DesignationBadge designation={fac.designation || "Professor"} />
                </div>

                {/* Col 3: Classes Handling */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Classes:</span>
                  {fac.classes_handling?.length > 0 ? (
                    fac.classes_handling.map((c) => (
                      <ClassChip key={c} label={c} variant="default" />
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">None</span>
                  )}
                </div>

                {/* Col 4: Class Incharge */}
                <div className="flex items-center">
                  <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Incharge:</span>
                  {fac.class_incharge_of ? (
                    <ClassChip label={fac.class_incharge_of} variant="incharge" />
                  ) : (
                    <span className="text-xs text-gray-400 italic">None</span>
                  )}
                </div>

                {/* Col 5: Projects count */}
                <div className="flex items-center lg:justify-center">
                  <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Projects:</span>
                  <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                    fac.project_count > 0
                      ? "bg-indigo-50 dark:bg-indigo-955/30 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {fac.project_count || 0}
                  </span>
                </div>

                {/* Col 6: Actions */}
                <div className="flex items-center justify-end lg:justify-center gap-1.5">
                  <a
                    href={`mailto:${fac.email}`}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/20 text-gray-400 hover:text-red-500 transition-colors"
                    title={`Email ${fac.name}`}
                  >
                    <GmailIcon className="w-4 h-4" />
                  </a>
                   {isHOD ? (
                    <div className="relative kebab-container-list">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenKebabId(openKebabId === fac.id ? null : fac.id); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openKebabId === fac.id && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150/80 dark:border-gray-700 py-1.5 z-30 animate-fade-in">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (fac.class_incharge_of) {
                                assignMutation.mutate({ id: fac.id, className: "" });
                              } else {
                                setAssignModal(fac);
                                setSelectedClass("");
                              }
                              setOpenKebabId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-955/20 font-medium transition-colors text-left"
                          >
                            {fac.class_incharge_of
                              ? <><UserX className="w-4 h-4" />Remove as Incharge</>
                              : <><UserCheck className="w-4 h-4" />Assign as Incharge</>
                            }
                          </button>
                          <div className="my-1.5 h-px bg-gray-100 dark:bg-gray-700 mx-3" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setDeleteConfirm(fac);
                              setOpenKebabId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20 font-medium transition-colors text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove Faculty
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    user?.role === "FACULTY" && user?.id === fac.user_id && (
                      <button
                        onClick={() => handleOpenEdit(fac)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-500 transition-colors"
                        title="Edit Profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* Edit Faculty Modal */}
      {/* ─────────────────────────────────────────────────────── */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Faculty Profile">
        <form onSubmit={handleEditSubmit} className="space-y-5 pt-1">
          {/* Avatar preview row */}
          {editModal && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-gray-700/40 rounded-2xl">
              <Avatar fac={{ ...editModal, name: editName }} size="lg" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{editName || editModal.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{editModal.email}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Designation</label>
            <select
              value={editDesignation}
              onChange={(e) => setEditDesignation(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
            >
              {DESIGNATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Classes Handling</label>
            <div className="grid grid-cols-4 gap-2">
              {CLASSES.map((cls) => {
                const isSelected = editClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setEditClasses((prev) => prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls])}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700"
                    }`}
                  >
                    {cls.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditModal(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-semibold hover:from-primary-700 hover:to-violet-700 transition-all disabled:opacity-60 shadow-sm"
            >
              {editMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────── */}
      {/* Assign Incharge Modal */}
      {/* ─────────────────────────────────────────────────────── */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Class Incharge">
        <div className="space-y-5 pt-1">
          {assignModal && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-gray-700/40 rounded-2xl">
              <Avatar fac={assignModal} size="sm" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{assignModal.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{assignModal.designation}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
            >
              <option value="">— Select a class —</option>
              {CLASSES.map((cls) => <option key={cls} value={cls}>{cls.replace("_", " ")}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAssignModal(null)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => assignMutation.mutate({ id: assignModal.id, className: selectedClass })}
              disabled={!selectedClass || assignMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-60 shadow-sm"
            >
              {assignMutation.isPending ? "Assigning…" : "Assign Incharge"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────── */}
      {/* Delete Confirmation */}
      {/* ─────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        title="Remove Faculty Member"
        message={`Are you sure you want to remove ${deleteConfirm?.name}? Their profile and credentials will be permanently deleted. Historical posts and project messages will be preserved.`}
        confirmText={deleteMutation.isPending ? "Removing…" : "Remove"}
        danger
      />
    </div>
  );
}
