import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFaculty, assignIncharge, toggleCoordinator, getFacultyInvite, toggleFacultyInvite } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatTile } from "../../components/ui/StatTile";
import { Users, ToggleLeft, ToggleRight, Crown, UserCheck, Megaphone } from "lucide-react";
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
  const coordinatorCount = facultyList.filter(f => f.is_update_coordinator).length;
  const inchargeCount = facultyList.filter(f => f.class_incharge_of).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Faculty" subtitle={`${facultyList.length} faculty members`}>
        {isHOD && (
          <Button
            variant={invite?.is_active ? "primary" : "secondary"}
            onClick={() => toggleInviteMutation.mutate()}
            className="gap-2"
          >
            {invite?.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            New Faculty {invite?.is_active ? "ON" : "OFF"}
          </Button>
        )}
      </PageHeader>

      {isHOD && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Users} value={facultyList.length} label="Total Faculty"
            accent="text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" />
          <StatTile icon={UserCheck} value={inchargeCount} label="Class Incharges"
            accent="text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30" />
          <StatTile icon={Megaphone} value={coordinatorCount} label="Coordinators"
            accent="text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30" />
        </div>
      )}

      {facultyList.length === 0 ? (
        <EmptyState icon={Users} title="No faculty members" description="Faculty members will appear here after they onboard." />
      ) : (
        <div className="grid gap-3">
          {facultyList.map(f => (
            <Card key={f.id} hover className="flex items-center gap-4">
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
