import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../../components/ui/Modal";
import { Avatar } from "../../components/ui/Avatar";
import { SearchPicker } from "../../components/shared/SearchPicker";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Switch } from "../../components/ui/Switch";
import { Spinner } from "../../components/ui/Spinner";
import {
  Users, UserPlus, Trash2, Crown, X, Search,
  CheckCircle2, AlertCircle, Plus
} from "lucide-react";
import {
  listForumMembers,
  listEligibleStudents,
  assignForumMember,
  removeForumMember,
  toggleForumCoordinator
} from "../../api/forum";

const getRoleMeta = (role = "") => {
  const clean = role.toLowerCase();
  if (clean.includes("president")) {
    return {
      color: "bg-amber-55/70 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/45 dark:border-amber-900/30",
      dot: "bg-amber-500",
      crown: true
    };
  }
  if (clean.includes("coordinator")) {
    return {
      color: "bg-orange-50 text-[#F05A2B] dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200/45 dark:border-orange-900/30",
      dot: "bg-[#F05A2B]"
    };
  }
  if (clean.includes("secretary")) {
    return {
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-200/45 dark:border-emerald-900/30",
      dot: "bg-emerald-500"
    };
  }
  if (clean.includes("treasurer")) {
    return {
      color: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 border border-rose-200/45 dark:border-rose-900/30",
      dot: "bg-rose-500"
    };
  }
  return {
    color: "bg-slate-50 text-slate-655 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-200/45 dark:border-slate-700/30",
    dot: "bg-slate-450"
  };
};

export default function ForumMembersModal({ open, onClose }) {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [rolePreset, setRolePreset] = useState("President");
  const [customRole, setCustomRole] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3500);
  };
  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 4000);
  };

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then((r) => r.data.members),
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setPendingStudent(null);
      setRolePreset("President");
      setCustomRole("");
      showSuccess("Forum member appointed successfully.");
    },
    onError: (err) => {
      showError(err.response?.data?.error || "Failed to assign member.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeForumMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setDeleteTarget(null);
      showSuccess("Member removed from Forum.");
    },
    onError: (err) => {
      showError(err.response?.data?.error || "Failed to remove member.");
    },
  });

  const coordMutation = useMutation({
    mutationFn: toggleForumCoordinator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      showSuccess("Coordinator role updated.");
    },
    onError: (err) => {
      showError(err.response?.data?.error || "Failed to update coordinator role.");
    },
  });

  const memberList = members || [];
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return memberList;
    const q = memberSearchQuery.toLowerCase();
    return memberList.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.class_name?.toLowerCase().includes(q)
    );
  }, [memberList, memberSearchQuery]);

  return (
    <>
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xl shadow-emerald-500/30 border border-emerald-400/20 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-2xl shadow-red-500/30 border border-red-400/20 animate-slide-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{errorMessage}</p>
        </div>
      )}

      {/* Main Forum Members Directory Modal */}
      <Modal open={open} onClose={onClose} title="Forum Directory" size="lg">
        <div className="space-y-5 pt-1">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search forum members by name, role or class..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
              {memberSearchQuery && (
                <button
                  onClick={() => setMemberSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isHOD && (
              <button
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] hover:brightness-105 text-white text-xs font-black transition-all shadow-md shadow-orange-500/10 active:scale-95 shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Appoint Member
              </button>
            )}
          </div>

          {/* Members List */}
          {membersLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <div className="col-span-2 text-center py-16 bg-gray-50/50 dark:bg-gray-950/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Users className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-450 italic font-bold">No forum members found</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {memberSearchQuery ? "Try refining your search terms." : "Appoint student forum members to get started."}
                  </p>
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const meta = getRoleMeta(m.role);
                  return (
                    <div
                      key={m.id}
                      className={`relative flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all ${
                        meta.crown ? "ring-2 ring-amber-500/20 border-amber-305" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <Avatar
                            src={m.profile_picture}
                            name={m.name}
                            size="sm"
                            className="ring-2 ring-orange-500/10 shrink-0"
                          />
                          {meta.crown && (
                            <div className="absolute -top-1.5 -left-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                              <Crown className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight">
                            {m.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${meta.color}`}>
                              <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                              {m.role}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200/10">
                              {m.class_name?.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isHOD && (
                        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[8px] text-gray-405 dark:text-gray-500 font-bold uppercase tracking-wider">Coord</span>
                            <Switch
                              checked={m.is_update_coordinator}
                              onChange={() => coordMutation.mutate(m.id)}
                              loading={coordMutation.isPending}
                              size="sm"
                            />
                          </div>
                          <button
                            onClick={() => setDeleteTarget(m)}
                            disabled={removeMutation.isPending}
                            className="p-2 rounded-xl text-gray-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-950/40"
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
          )}
        </div>
      </Modal>

      {/* Student Picker for Appointing Members */}
      <SearchPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Appoint Forum Member"
        queryKey="eligible-students"
        fetchFn={(search) => listEligibleStudents(search).then((r) => r.data.students)}
        onPick={(student) => {
          setPendingStudent(student);
          setPickerOpen(false);
        }}
        placeholder="Search students by name, email, roll…"
        emptyText="No eligible students found."
      />

      {/* Role Selection Modal */}
      {pendingStudent && (
        <Modal open={!!pendingStudent} onClose={() => setPendingStudent(null)} title="Assign Forum Role">
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50/50 to-orange-100/20 dark:from-orange-950/20 dark:to-orange-950/10 rounded-2xl border border-orange-100/30 dark:border-orange-900/20">
              <Avatar src={pendingStudent.profile_picture} name={pendingStudent.name} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white truncate">{pendingStudent.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-450 truncate mt-0.5">
                  {pendingStudent.class_name?.replace("_", " ")} · {pendingStudent.email}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Select Preset Role</label>
              <select
                value={rolePreset}
                onChange={(e) => {
                  setRolePreset(e.target.value);
                  if (e.target.value !== "Custom") {
                    setCustomRole("");
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Custom Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Vice Secretary, Creative Head"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingStudent(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-gray-750 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-55 dark:hover:bg-gray-850 transition-colors"
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
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8365] via-[#F05A2B] to-[#E04A1B] text-white text-sm font-bold hover:brightness-105 transition-all shadow-md shadow-orange-500/20 disabled:opacity-60"
              >
                {assignMutation.isPending ? "Appointing…" : `Appoint as ${rolePreset === "Custom" && customRole ? customRole : rolePreset}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => removeMutation.mutate(deleteTarget.id)}
        title="Remove Forum Member"
        message={`Are you sure you want to remove ${deleteTarget?.name || "this student"} from the forum? This action cannot be undone.`}
        confirmText={removeMutation.isPending ? "Removing..." : "Remove Member"}
        danger
      />
    </>
  );
}
