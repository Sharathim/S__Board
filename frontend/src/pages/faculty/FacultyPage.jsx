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
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  Users, ToggleLeft, ToggleRight, MoreVertical, Trash2,
  UserCheck, UserX, Pencil, Mail, GraduationCap, BookOpen,
  FolderKanban, Search, Link2, Copy, CheckCheck, ChevronDown,
  ShieldCheck, Star, TrendingUp, X,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

const CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];

const DESIGNATION_OPTIONS = ["Professor", "Associate Professor", "Assistant Professor"];

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_PALETTES = [
  { bg: "from-violet-500 to-purple-600",  ring: "ring-violet-200 dark:ring-violet-900" },
  { bg: "from-blue-500 to-indigo-600",    ring: "ring-blue-200 dark:ring-blue-900"    },
  { bg: "from-pink-500 to-rose-600",      ring: "ring-pink-200 dark:ring-pink-900"    },
  { bg: "from-amber-500 to-orange-500",   ring: "ring-amber-200 dark:ring-amber-900"  },
  { bg: "from-emerald-500 to-teal-600",   ring: "ring-emerald-200 dark:ring-emerald-900"},
  { bg: "from-cyan-500 to-sky-600",       ring: "ring-cyan-200 dark:ring-cyan-900"    },
];

function getAvatarPalette(name = "") {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
}

function getInitials(name = "") {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || "?").toUpperCase();
}

function Avatar({ fac, size = "lg" }) {
  const palette = getAvatarPalette(fac.name);
  const sizeClass = size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";

  if (fac.profile_picture) {
    return (
      <img
        src={fac.profile_picture}
        alt={fac.name}
        className={`${sizeClass} rounded-2xl object-cover ring-2 ring-offset-1 ${palette.ring} shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-2xl bg-gradient-to-br ${palette.bg} flex items-center justify-center font-bold text-white ring-2 ring-offset-1 ${palette.ring} shrink-0`}>
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
    "Assistant Professor":  { color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50", icon: GraduationCap },
  };
  const style = map[designation] || map["Professor"];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.color}`}>
      <Icon className="w-3 h-3" />
      {designation}
    </span>
  );
}

// ─── Class Chip ───────────────────────────────────────────────────────────────
function ClassChip({ label, variant = "default" }) {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors";
  const variants = {
    default: "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50",
    incharge: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  };
  return <span className={`${base} ${variants[variant]}`}>{label.replace("_", " ")}</span>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 flex items-center gap-4 shadow-card">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</div>
      </div>
    </div>
  );
}

// ─── Invite Banner ────────────────────────────────────────────────────────────
function InviteBanner({ invite, onToggle, isToggling }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!invite?.invite_link) return;
    navigator.clipboard.writeText(invite.invite_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!invite) return null;

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      invite.is_active
        ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-800/50"
        : "bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700"
    }`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            invite.is_active ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-gray-100 dark:bg-gray-700"
          }`}>
            <Link2 className={`w-4 h-4 ${invite.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Faculty Invite Link</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                invite.is_active
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {invite.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            {invite.is_active && invite.invite_link && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono truncate max-w-[280px] sm:max-w-md">
                {invite.invite_link}
              </p>
            )}
            {!invite.is_active && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Enable to allow new faculty to self-register
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {invite.is_active && invite.invite_link && (
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          )}
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              invite.is_active
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50 dark:hover:bg-red-900/30"
                : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
            } disabled:opacity-60`}
          >
            {invite.is_active
              ? <><ToggleRight className="w-3.5 h-3.5" /> Disable</>
              : <><ToggleLeft className="w-3.5 h-3.5" /> Enable</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Faculty Card ─────────────────────────────────────────────────────────────
function FacultyCard({ fac, isHOD, userId, onEdit, onDelete, onAssignIncharge, onRemoveIncharge }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (!e.target.closest(".kebab-container")) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="group bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Top colored stripe */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${getAvatarPalette(fac.name).bg}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar fac={fac} size="lg" />
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-50 text-base leading-snug truncate">
                {fac.name}
              </h3>
              <DesignationBadge designation={fac.designation || "Professor"} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`mailto:${fac.email}`}
              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group/mail"
              title={`Email ${fac.name}`}
            >
              <GmailIcon className="w-5 h-5 transition-transform group-hover/mail:scale-110" />
            </a>

            {isHOD ? (
              <div className="relative kebab-container">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 py-1.5 z-30 animate-fade-in">
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(fac); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 font-medium transition-colors text-left"
                    >
                      <Pencil className="w-4 h-4 text-indigo-500" />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        fac.class_incharge_of ? onRemoveIncharge(fac) : onAssignIncharge(fac);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-medium transition-colors text-left"
                    >
                      {fac.class_incharge_of
                        ? <><UserX className="w-4 h-4" />Remove as Incharge</>
                        : <><UserCheck className="w-4 h-4" />Assign as Incharge</>
                      }
                    </button>
                    <div className="my-1 h-px bg-gray-100 dark:bg-gray-700 mx-3" />
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(fac); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Faculty
                    </button>
                  </div>
                )}
              </div>
            ) : (
              userId === fac.user_id && (
                <button
                  onClick={() => onEdit(fac)}
                  className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 transition-colors"
                  title="Edit your profile"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-gray-700/60 mb-4" />

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-gray-700/40 rounded-xl p-3 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
              <BookOpen className="w-3 h-3" />
              Classes Handling
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {fac.classes_handling?.length > 0
                ? fac.classes_handling.map((cls) => (
                    <ClassChip key={cls} label={cls} variant="default" />
                  ))
                : <span className="text-xs text-gray-400 dark:text-gray-500 italic">None assigned</span>
              }
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-gray-700/40 rounded-xl p-3 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              Class Incharge
            </div>
            <div className="pt-1">
              {fac.class_incharge_of
                ? <ClassChip label={fac.class_incharge_of} variant="incharge" />
                : <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not assigned</span>
              }
            </div>
          </div>
        </div>

        {/* Projects assigned */}
        <div className="flex items-center justify-between py-3 px-3 bg-slate-50 dark:bg-gray-700/40 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <FolderKanban className="w-3.5 h-3.5" />
            Projects Assigned
          </div>
          <span className={`text-sm font-extrabold ${
            fac.project_count > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
          }`}>
            {fac.project_count || 0}
          </span>
        </div>
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
  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterDesig,  setFilterDesig]  = useState("All");

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
  });

  const { data: invite } = useQuery({
    queryKey: ["faculty-invite"],
    queryFn: () => getFacultyInvite().then((r) => r.data),
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

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return facultyList.filter((f) => {
      const matchSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDesig = filterDesig === "All" || f.designation === filterDesig;
      return matchSearch && matchDesig;
    });
  }, [facultyList, searchQuery, filterDesig]);

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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Faculty</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {facultyList.length} member{facultyList.length !== 1 ? "s" : ""} in the department
              </p>
            </div>
          </div>
        </div>

        {isHOD && (
          <button
            onClick={() => toggleInviteMutation.mutate()}
            disabled={toggleInviteMutation.isPending}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm shrink-0 ${
              invite?.is_active
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-900/30"
                : "bg-gradient-to-r from-primary-600 to-violet-600 text-white hover:from-primary-700 hover:to-violet-700 hover:shadow-primary-glow"
            } disabled:opacity-60`}
          >
            {invite?.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            New Faculty {invite?.is_active ? "ON" : "OFF"}
          </button>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Total Faculty"      value={stats.total}         color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
        <StatCard icon={ShieldCheck}   label="Class Incharges"    value={stats.withIncharge}  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={FolderKanban}  label="Projects Assigned"  value={stats.totalProjects} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
        <StatCard icon={Star}          label="Professors"          value={stats.professors}    color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
      </div>

      {/* ── Invite Banner (HOD only) ── */}
      {isHOD && (
        <InviteBanner
          invite={invite}
          onToggle={() => toggleInviteMutation.mutate()}
          isToggling={toggleInviteMutation.isPending}
        />
      )}

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search faculty by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Designation filter */}
        <div className="relative">
          <select
            value={filterDesig}
            onChange={(e) => setFilterDesig(e.target.value)}
            className="appearance-none pl-3.5 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
          >
            <option value="All">All Designations</option>
            {DESIGNATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Faculty Grid ── */}
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
      ) : filtered.length === 0 ? (
        /* No search results */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No results for "{searchQuery}"</p>
          <button onClick={() => { setSearchQuery(""); setFilterDesig("All"); }} className="mt-3 text-xs text-primary-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((fac) => (
            <FacultyCard
              key={fac.id}
              fac={fac}
              isHOD={isHOD}
              userId={user?.id}
              onEdit={handleOpenEdit}
              onDelete={setDeleteConfirm}
              onAssignIncharge={(f) => { setAssignModal(f); setSelectedClass(""); }}
              onRemoveIncharge={(f) => assignMutation.mutate({ id: f.id, className: "" })}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filtered.length > 0 && (searchQuery || filterDesig !== "All") && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
          Showing {filtered.length} of {facultyList.length} faculty members
        </p>
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
