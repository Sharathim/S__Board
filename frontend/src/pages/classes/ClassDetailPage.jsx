import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudents, grantAccess, removeStudent } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { assignForumMember } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  Users, UserPlus, Trash2, MessageSquarePlus, ChevronLeft,
  Search, ShieldCheck, GraduationCap, X, BookOpen, Crown,
  Mail, MoreVertical, CheckCircle2,
} from "lucide-react";
import { useState, useMemo } from "react";

const FORUM_CLASSES = ["UG_3A", "UG_3B"];
const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A",  gradient: "from-violet-500 to-purple-600",  bg: "bg-violet-50 dark:bg-violet-900/20",   text: "text-violet-700 dark:text-violet-300",   border: "border-violet-200 dark:border-violet-800/50"  },
  UG_1B: { label: "UG 1B", short: "1B",  gradient: "from-blue-500 to-indigo-600",    bg: "bg-blue-50 dark:bg-blue-900/20",       text: "text-blue-700 dark:text-blue-300",       border: "border-blue-200 dark:border-blue-800/50"      },
  UG_2A: { label: "UG 2A", short: "2A",  gradient: "from-pink-500 to-rose-600",      bg: "bg-pink-50 dark:bg-pink-900/20",       text: "text-pink-700 dark:text-pink-300",       border: "border-pink-200 dark:border-pink-800/50"      },
  UG_2B: { label: "UG 2B", short: "2B",  gradient: "from-amber-500 to-orange-500",   bg: "bg-amber-50 dark:bg-amber-900/20",     text: "text-amber-700 dark:text-amber-300",     border: "border-amber-200 dark:border-amber-800/50"    },
  UG_3A: { label: "UG 3A", short: "3A",  gradient: "from-emerald-500 to-teal-600",   bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/50" },
  UG_3B: { label: "UG 3B", short: "3B",  gradient: "from-cyan-500 to-sky-600",       bg: "bg-cyan-50 dark:bg-cyan-900/20",       text: "text-cyan-700 dark:text-cyan-300",       border: "border-cyan-200 dark:border-cyan-800/50"      },
  PG_1A: { label: "PG 1A", short: "PG1A",gradient: "from-fuchsia-500 to-pink-600",   bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-200 dark:border-fuchsia-800/50" },
  PG_2A: { label: "PG 2A", short: "PG2A",gradient: "from-indigo-500 to-blue-600",    bg: "bg-indigo-50 dark:bg-indigo-900/20",   text: "text-indigo-700 dark:text-indigo-300",   border: "border-indigo-200 dark:border-indigo-800/50"  },
};

const FORUM_ROLE_COLORS = {
  Member:      "bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800/50",
  Coordinator: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  Secretary:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  Treasurer:   "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50",
  Volunteer:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50",
};

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || "?").toUpperCase();
}

function StudentRow({ s, canManage, isHOD, isForumClass, onForum, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = getInitials(s.name);

  return (
    <tr className="group hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
      {/* Student info */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          {s.profile_picture ? (
            <img src={s.profile_picture} alt={s.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.email}</p>
          </div>
        </div>
      </td>

      {/* Roll No */}
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
          {s.roll_number || "—"}
        </span>
      </td>

      {/* Register No */}
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
          {s.register_number || "—"}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        {s.is_forum_member ? (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${FORUM_ROLE_COLORS[s.forum_role] || FORUM_ROLE_COLORS.Member}`}>
            <CheckCircle2 className="w-2.5 h-2.5" />
            {s.forum_role || "Forum"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-50 dark:bg-gray-700/40 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
            Student
          </span>
        )}
      </td>

      {/* Actions */}
      {canManage && (
        <td className="px-5 py-3.5">
          <div className="flex items-center justify-end gap-1">
            <a
              href={`mailto:${s.email}`}
              className="p-1.5 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Send email"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>

            {isHOD && isForumClass && !s.is_forum_member && (
              <button
                onClick={() => onForum(s)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                title="Assign to Forum"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onRemove(s)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Remove student"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

export default function ClassDetailPage() {
  const { className } = useParams();
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isIncharge = user?.faculty?.class_incharge_of === className;
  const canManage = isHOD || isIncharge;
  const isForumClass = FORUM_CLASSES.includes(className);
  const queryClient = useQueryClient();

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [removeTarget,   setRemoveTarget]   = useState(null);
  const [forumTarget,    setForumTarget]    = useState(null);
  const [forumRole,      setForumRole]      = useState("Member");
  const [searchQuery,    setSearchQuery]    = useState("");

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", className],
    queryFn: () => listStudents(className).then((r) => r.data.students),
  });

  const { data: faculty } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
    enabled: canManage,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students", className] });
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["forum-members"] });
  };

  const grantMutation = useMutation({
    mutationFn: (facultyId) => grantAccess(className, facultyId),
    onSuccess: () => { setShowGrantModal(false); queryClient.invalidateQueries({ queryKey: ["classes"] }); },
  });

  const removeMutation = useMutation({
    mutationFn: (studentId) => removeStudent(className, studentId),
    onSuccess: () => { setRemoveTarget(null); invalidate(); },
  });

  const forumMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => { setForumTarget(null); setForumRole("Member"); invalidate(); },
  });

  const meta = CLASS_META[className] || { label: className?.replace("_", " "), short: className, gradient: "from-primary-500 to-violet-600", bg: "", text: "", border: "" };

  const studentList = students || [];
  const forumCount = studentList.filter((s) => s.is_forum_member).length;

  const filtered = useMemo(() => {
    if (!searchQuery) return studentList;
    const q = searchQuery.toLowerCase();
    return studentList.filter((s) =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.register_number?.toLowerCase().includes(q)
    );
  }, [studentList, searchQuery]);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Back + Header ── */}
      <div>
        <Link to="/classes" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-4 group">
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Classes
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Class icon */}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-md ring-4 ring-white dark:ring-gray-800 shrink-0`}>
              <span className="text-lg font-extrabold text-white">{meta.short}</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{meta.label}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  {studentList.length} student{studentList.length !== 1 ? "s" : ""}
                </span>
                {isForumClass && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {forumCount} forum member{forumCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <button
              onClick={() => setShowGrantModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-semibold hover:from-primary-700 hover:to-violet-700 transition-all shadow-sm hover:shadow-primary-glow shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Grant Access
            </button>
          )}
        </div>
      </div>

      {/* ── Students Table ── */}
      {studentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-card">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-5 shadow-md opacity-80`}>
            <Users className="w-9 h-9 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">No students yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Students will appear here after they onboard via the class invite link.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-card overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium shrink-0">
              {filtered.length} of {studentList.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/60">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Student</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Roll No</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reg. No</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                  {canManage && <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {filtered.length > 0 ? (
                  filtered.map((s) => (
                    <StudentRow
                      key={s.id}
                      s={s}
                      canManage={canManage}
                      isHOD={isHOD}
                      isForumClass={isForumClass}
                      onForum={(st) => { setForumTarget(st); setForumRole("Member"); }}
                      onRemove={setRemoveTarget}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="py-12 text-center">
                      <Search className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">No students match "{searchQuery}"</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Grant Access Modal ── */}
      <Modal open={showGrantModal} onClose={() => setShowGrantModal(false)} title={`Grant Access — ${meta.label}`}>
        <div className="space-y-3 pt-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Give another faculty member view access to this class roster.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(faculty || []).filter((f) => f.class_incharge_of !== className).map((f) => (
              <button
                key={f.id}
                onClick={() => grantMutation.mutate(f.id)}
                disabled={grantMutation.isPending}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left disabled:opacity-50 group"
              >
                <Avatar src={f.profile_picture} name={f.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{f.name}</p>
                  <p className="text-xs text-gray-400 truncate">{f.designation}</p>
                </div>
                <BookOpen className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
              </button>
            ))}
            {(faculty || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No faculty available.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Forum Member Modal ── */}
      <Modal open={!!forumTarget} onClose={() => setForumTarget(null)} title="Assign to Forum">
        {forumTarget && (
          <div className="space-y-5 pt-1">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-gray-700/40 rounded-2xl">
              <Avatar src={forumTarget.profile_picture} name={forumTarget.name} size="md" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{forumTarget.name}</p>
                <p className="text-xs text-gray-400">{forumTarget.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Forum Role</label>
              <div className="grid grid-cols-3 gap-2">
                {FORUM_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForumRole(r)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      forumRole === r
                        ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => forumMutation.mutate({ studentId: forumTarget.id, role: forumRole })}
              disabled={forumMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-semibold hover:from-primary-700 hover:to-violet-700 transition-all disabled:opacity-60 shadow-sm"
            >
              {forumMutation.isPending ? "Assigning…" : `Assign as ${forumRole}`}
            </button>
          </div>
        )}
      </Modal>

      {/* ── Remove Confirm ── */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeMutation.mutate(removeTarget.id)}
        title="Remove Student"
        message={removeTarget ? `Remove ${removeTarget.name} from ${meta.label}? This deletes their account permanently.` : ""}
        confirmText={removeMutation.isPending ? "Removing…" : "Remove"}
        danger
      />
    </div>
  );
}
