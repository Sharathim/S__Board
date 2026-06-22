import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudents, grantAccess, removeStudent } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { assignForumMember } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Users, UserPlus, Trash2, MessageSquarePlus } from "lucide-react";
import { useState } from "react";

const FORUM_CLASSES = ["UG_3A", "UG_3B"];
const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

export default function ClassDetailPage() {
  const { className } = useParams();
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isIncharge = user?.faculty?.class_incharge_of === className;
  const canManage = isHOD || isIncharge;
  const isForumClass = FORUM_CLASSES.includes(className);
  const queryClient = useQueryClient();

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [forumTarget, setForumTarget] = useState(null);
  const [forumRole, setForumRole] = useState("Member");

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", className],
    queryFn: () => listStudents(className).then(r => r.data.students),
  });

  const { data: faculty } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
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

  if (isLoading) return <Spinner />;

  const studentList = students || [];

  return (
    <div className="space-y-6">
      <PageHeader title={className.replace("_", " ")} subtitle={`${studentList.length} students`}>
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setShowGrantModal(true)} className="gap-1.5">
            <UserPlus className="w-4 h-4" /> Grant Access
          </Button>
        )}
      </PageHeader>

      {studentList.length === 0 ? (
        <EmptyState icon={Users} title="No students" description="Students will appear here after they onboard via the class invite link." />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Roll No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Register No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  {canManage && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {studentList.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={s.profile_picture} name={s.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.roll_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.register_number}</td>
                    <td className="px-4 py-3">
                      {s.is_forum_member
                        ? <Badge variant="primary">Forum Member</Badge>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isHOD && isForumClass && !s.is_forum_member && (
                            <button
                              onClick={() => { setForumTarget(s); setForumRole("Member"); }}
                              title="Assign to Forum"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            >
                              <MessageSquarePlus className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setRemoveTarget(s)}
                            title="Remove student"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Grant access modal */}
      <Modal open={showGrantModal} onClose={() => setShowGrantModal(false)} title={`Grant access — ${className.replace("_", " ")}`}>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Give another faculty member view access to this class.
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {(faculty || []).filter(f => f.class_incharge_of !== className).map(f => (
            <button
              key={f.id}
              onClick={() => grantMutation.mutate(f.id)}
              disabled={grantMutation.isPending}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-all text-left disabled:opacity-50"
            >
              <Avatar src={f.profile_picture} name={f.name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                <p className="text-xs text-gray-500">{f.designation}</p>
              </div>
            </button>
          ))}
          {(faculty || []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No faculty available.</p>
          )}
        </div>
      </Modal>

      {/* Assign forum member modal */}
      <Modal open={!!forumTarget} onClose={() => setForumTarget(null)} title="Assign to Forum">
        {forumTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={forumTarget.profile_picture} name={forumTarget.name} size="md" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{forumTarget.name}</p>
                <p className="text-xs text-gray-500">{forumTarget.email}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Forum Role</label>
              <select
                value={forumRole}
                onChange={e => setForumRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {FORUM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Button
              onClick={() => forumMutation.mutate({ studentId: forumTarget.id, role: forumRole })}
              loading={forumMutation.isPending}
              className="w-full"
            >
              Assign to Forum
            </Button>
          </div>
        )}
      </Modal>

      {/* Remove student confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeMutation.mutate(removeTarget.id)}
        title="Remove student"
        message={removeTarget ? `Remove ${removeTarget.name} from ${className.replace("_", " ")}? This deletes their account and cannot be undone.` : ""}
        confirmText="Remove"
        danger
      />
    </div>
  );
}
