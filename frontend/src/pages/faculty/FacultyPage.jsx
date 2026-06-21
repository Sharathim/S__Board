import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFaculty, assignIncharge, toggleCoordinator, getFacultyInvite, toggleFacultyInvite } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Users, UserPlus, Share2, ToggleLeft, ToggleRight, Crown } from "lucide-react";
import { useState } from "react";

export default function FacultyPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const [assignModal, setAssignModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
  });

  const { data: invite } = useQuery({
    queryKey: ["faculty-invite"],
    queryFn: () => getFacultyInvite().then(r => r.data),
    enabled: isHOD,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, className }) => assignIncharge(id, className),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculty"] }),
  });

  const coordMutation = useMutation({
    mutationFn: (id) => toggleCoordinator(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculty"] }),
  });

  const toggleInviteMutation = useMutation({
    mutationFn: toggleFacultyInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculty-invite"] }),
  });

  if (isLoading) return <Spinner />;

  const facultyList = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Faculty</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{facultyList.length} faculty members</p>
        </div>
        {isHOD && (
          <div className="flex items-center gap-3">
            <Button
              variant={invite?.is_active ? "primary" : "secondary"}
              onClick={() => toggleInviteMutation.mutate()}
              className="gap-2"
            >
              {invite?.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              Invite {invite?.is_active ? "ON" : "OFF"}
            </Button>
          </div>
        )}
      </div>

      {facultyList.length === 0 ? (
        <EmptyState icon={Users} title="No faculty members" description="Faculty members will appear here after they onboard." />
      ) : (
        <div className="grid gap-4">
          {facultyList.map(f => (
            <div key={f.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
              <Avatar src={f.profile_picture} name={f.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{f.name}</h3>
                  {f.is_update_coordinator && <Badge variant="primary">Coordinator</Badge>}
                  {f.class_incharge_of && <Badge variant="success">Incharge: {f.class_incharge_of.replace("_", " ")}</Badge>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{f.designation} · {f.email}</p>
                {f.classes_handling?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {f.classes_handling.map(cls => (
                      <Badge key={cls}>{cls.replace("_", " ")}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {isHOD && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAssignModal(f)} className="gap-1">
                    <Crown className="w-4 h-4" /> Incharge
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => coordMutation.mutate(f.id)}
                    className={f.is_update_coordinator ? "text-primary-600" : ""}
                  >
                    {f.is_update_coordinator ? "Remove Coordinator" : "Make Coordinator"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isHOD && invite && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <Share2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Faculty invite link:</span>
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              {`${window.location.origin}/invite/${invite.token}`}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/invite/${invite.token}`)}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
