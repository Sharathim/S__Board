import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudents, removeStudent } from "../../../api/classes";
import { assignForumMember } from "../../../api/forum";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import {
  Users, UserPlus, Trash2, MessageSquarePlus, ChevronLeft,
  Search, ShieldCheck, GraduationCap, X, BookOpen, Crown,
  Mail, MoreVertical, CheckCircle2,
} from "lucide-react";
import { useState, useMemo } from "react";
import MobileCard from "../../components/MobileCard";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileEmptyState from "../../components/MobileEmptyState";

const FORUM_CLASSES = ["UG_3A", "UG_3B"];
const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A",  gradient: "from-violet-500 to-purple-600" },
  UG_1B: { label: "UG 1B", short: "1B",  gradient: "from-blue-500 to-indigo-600"   },
  UG_2A: { label: "UG 2A", short: "2A",  gradient: "from-pink-500 to-rose-600"     },
  UG_2B: { label: "UG 2B", short: "2B",  gradient: "from-amber-500 to-orange-500"  },
  UG_3A: { label: "UG 3A", short: "3A",  gradient: "from-emerald-500 to-teal-600"  },
  UG_3B: { label: "UG 3B", short: "3B",  gradient: "from-cyan-500 to-sky-600"      },
  PG_1A: { label: "PG 1A", short: "PG1A",gradient: "from-fuchsia-500 to-pink-600"  },
  PG_2A: { label: "PG 2A", short: "PG2A",gradient: "from-indigo-500 to-blue-600"   },
};

const FORUM_ROLE_COLORS = {
  Member:      "bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border-primary-200/50 dark:border-primary-850/40",
  Coordinator: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-850/40",
  Secretary:   "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-850/40",
  Treasurer:   "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200/50 dark:border-rose-850/40",
  Volunteer:   "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200/50 dark:border-violet-850/40",
};

export default function MobileClassDetailPage() {
  const { className } = useParams();
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isIncharge = user?.faculty?.class_incharge_of === className;
  const canManage = isHOD || isIncharge;
  const isForumClass = FORUM_CLASSES.includes(className);
  const queryClient = useQueryClient();

  const [removeTarget,   setRemoveTarget]   = useState(null);
  const [forumTarget,    setForumTarget]    = useState(null);
  const [forumRole,      setForumRole]      = useState("Member");
  const [searchQuery,    setSearchQuery]    = useState("");

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", className],
    queryFn: () => listStudents(className).then((r) => r.data.students),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students", className] });
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["forum-members"] });
  };

  const removeMutation = useMutation({
    mutationFn: (studentId) => removeStudent(className, studentId),
    onSuccess: () => { setRemoveTarget(null); invalidate(); },
  });

  const forumMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => { setForumTarget(null); setForumRole("Member"); invalidate(); },
  });

  const meta = CLASS_META[className] || { label: className?.replace("_", " "), short: className, gradient: "from-primary-500 to-violet-600" };

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

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  return (
    <div className="space-y-4 mobile-fade-in">
      {/* Back button */}
      <div>
        <Link to="/classes" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Classes
        </Link>
      </div>

      {/* Hero Header Card */}
      <MobileCard className="!p-0 overflow-hidden">
        <div className={`bg-gradient-to-br ${meta.gradient} p-5 text-white`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight">{meta.label}</h1>
              <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {studentList.length} student{studentList.length !== 1 ? "s" : ""}
              </p>

            </div>
          </div>
        </div>
      </MobileCard>

      {/* Search toolbar */}
      <MobileSearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search students..." />

      {/* Student List */}
      {studentList.length === 0 ? (
        <MobileEmptyState icon={Users} title="No students yet" description="Students will appear here after onboarding." />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <MobileCard key={s.id}>
              <div className="flex items-start gap-3">
                {s.profile_picture ? (
                  <img src={s.profile_picture} alt={s.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/10 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {(s.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{s.email}</p>
                  
                  {/* Roll / Reg Numbers */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.roll_number && (
                      <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700/50">
                        Roll: {s.roll_number}
                      </span>
                    )}
                    {s.register_number && (
                      <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700/50">
                        Reg: {s.register_number}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a href={`mailto:${s.email}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </a>

                  {canManage && (
                    <>

                      <button
                        onClick={() => setRemoveTarget(s)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-3 pt-2.5 border-t border-dashed border-gray-150 dark:border-slate-700/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Access Status</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-700">
                  Student
                </span>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Forum Member Modal */}
      <Modal open={!!forumTarget} onClose={() => setForumTarget(null)} title="Assign to Forum">
        {forumTarget && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700/50">
              <Avatar src={forumTarget.profile_picture} name={forumTarget.name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{forumTarget.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{forumTarget.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Forum Role</label>
              <div className="grid grid-cols-3 gap-2">
                {FORUM_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForumRole(r)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      forumRole === r
                        ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-primary-300"
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
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-xs font-bold shadow-md disabled:opacity-60"
            >
              {forumMutation.isPending ? "Assigning…" : `Assign as ${forumRole}`}
            </button>
          </div>
        )}
      </Modal>

      {/* Remove Confirm */}
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
