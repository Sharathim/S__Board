import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudents, getClassInvite, toggleClassInvite, grantAccess } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Users, Share2, ToggleLeft, ToggleRight, UserPlus } from "lucide-react";
import { useState } from "react";

export default function ClassDetailPage() {
  const { className } = useParams();
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isIncharge = user?.faculty?.class_incharge_of === className;
  const canManage = isHOD || isIncharge;
  const queryClient = useQueryClient();
  const [showGrantModal, setShowGrantModal] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", className],
    queryFn: () => listStudents(className).then(r => r.data.students),
  });

  const { data: invite } = useQuery({
    queryKey: ["class-invite", className],
    queryFn: () => getClassInvite(className).then(r => r.data),
    enabled: canManage,
  });

  const { data: faculty } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
    enabled: canManage,
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleClassInvite(className),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-invite", className] }),
  });

  const grantMutation = useMutation({
    mutationFn: (facultyId) => grantAccess(className, facultyId),
    onSuccess: () => { setShowGrantModal(false); queryClient.invalidateQueries({ queryKey: ["classes"] }); },
  });

  if (isLoading) return <Spinner />;

  const studentList = students || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{className.replace("_", " ")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{studentList.length} students</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowGrantModal(true)} className="gap-1">
              <UserPlus className="w-4 h-4" /> Grant Access
            </Button>
            <Button
              variant={invite?.is_active ? "primary" : "secondary"}
              size="sm"
              onClick={() => toggleMutation.mutate()}
              className="gap-1"
            >
              {invite?.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {invite?.is_active ? "Invite ON" : "Invite OFF"}
            </Button>
          </div>
        )}
      </div>

      {studentList.length === 0 ? (
        <EmptyState icon={Users} title="No students" description="Students will appear here after they onboard via the class invite link." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Register No</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {studentList.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={s.profile_picture} name={s.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.roll_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.register_number}</td>
                    <td className="px-4 py-3">
                      {s.is_forum_member && <Badge variant="primary">Forum Member</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canManage && invite && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <Share2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Class invite link:</span>
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              {`${window.location.origin}/invite/${invite.token}`}
            </code>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/invite/${invite.token}`)}>
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
