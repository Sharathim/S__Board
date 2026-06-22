import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listClasses, toggleStudentRegistration, assignIncharge } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { PageHeader } from "../../components/ui/PageHeader";
import { GraduationCap, Users, ToggleLeft, ToggleRight, Crown, Lock, X } from "lucide-react";
import { useState } from "react";

export default function ClassesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const isFaculty = user?.role === "FACULTY";
  const isStudent = user?.role === "STUDENT";
  const queryClient = useQueryClient();

  const [inchargeModal, setInchargeModal] = useState(null); // className string when open

  const { data: raw, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then(r => r.data),
  });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
    enabled: isHOD,
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

  if (isLoading) return <Spinner />;

  const classes = raw?.classes || [];
  const studentRegistrationOpen = raw?.student_registration_open || false;
  const facultyList = facultyData || [];

  // Faculty eligible for incharge: only those NOT already class incharge of another class
  const eligibleFaculty = facultyList.filter(f => !f.class_incharge_of);

  const classIcons = {
    "UG_1A": "1A", "UG_1B": "1B", "UG_2A": "2A", "UG_2B": "2B",
    "UG_3A": "3A", "UG_3B": "3B", "PG_1A": "PG1A", "PG_2A": "PG2A",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Classes" subtitle="Manage classes and student lists" />

      {/* Global New Student Registration toggle */}
      {isHOD && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${studentRegistrationOpen ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
            />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">New Student Registration</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                When enabled, new students can create an account and select their class
              </p>
            </div>
          </div>
          <Button
            variant={studentRegistrationOpen ? "primary" : "secondary"}
            onClick={() => toggleRegMutation.mutate()}
            className="gap-1.5 shrink-0"
          >
            {studentRegistrationOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {studentRegistrationOpen ? "ON" : "OFF"}
          </Button>
        </div>
      )}

      {/* Class cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {classes.map(c => {
          const isRestricted = (isFaculty || isStudent) && !c.can_view_details;
          return (
            <div
              key={c.class_name}
              className="group bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all relative"
            >
              {isRestricted ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="font-bold text-gray-400 text-sm">{classIcons[c.class_name]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.class_name.replace("_", " ")}</h3>
                      {c.incharge ? (
                        <p className="text-xs text-gray-500">Incharge: {c.incharge.name}</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No incharge assigned</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{c.student_count} students</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <Lock className="w-3 h-3" />
                    <span>Access restricted — contact class incharge or HOD</span>
                  </div>
                </div>
              ) : (
                <Link to={`/classes/${c.class_name}`} className="block">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="font-bold text-primary-600 text-sm">{classIcons[c.class_name]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.class_name.replace("_", " ")}</h3>
                      {c.incharge ? (
                        <p className="text-xs text-gray-500">Incharge: {c.incharge.name}</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No incharge assigned</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{c.student_count} students</span>
                    </div>
                    {c.forum_member_count !== undefined && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <GraduationCap className="w-4 h-4" />
                        <span>{c.forum_member_count} forum</span>
                      </div>
                    )}
                  </div>
                </Link>
              )}

              {/* HOD: Assign Incharge button */}
              {isHOD && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInchargeModal(c.class_name)}
                    className="w-full gap-1.5 text-xs"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {c.incharge ? `Change Incharge (${c.incharge.name})` : "Assign Incharge"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Assign Incharge Modal ── */}
      {inchargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Assign Incharge — {inchargeModal.replace("_", " ")}
              </h3>
              <button
                onClick={() => setInchargeModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {eligibleFaculty.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No available faculty to assign. All faculty members are already assigned as incharge of other classes.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {eligibleFaculty.map(f => (
                  <button
                    key={f.id}
                    onClick={() => assignInchargeMutation.mutate({ className: inchargeModal, facultyId: f.id })}
                    disabled={assignInchargeMutation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-all text-left disabled:opacity-50"
                  >
                    <Avatar src={f.profile_picture} name={f.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.name}</p>
                      <p className="text-xs text-gray-500">{f.designation}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setInchargeModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
