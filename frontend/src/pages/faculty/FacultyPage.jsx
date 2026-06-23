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
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  Users,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  Trash2,
  UserCheck,
  UserX,
  Pencil,
} from "lucide-react";
import { useState, useEffect } from "react";

const CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];

function GmailIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#F2F2F2"/>
      <path d="M22 6V18C22 19.1 21.1 20 20 20H18V8.5L12 13L6 8.5V20H4C2.9 20 2 19.1 2 18V6C2 5.23 2.44 4.57 3.07 4.25L12 11L20.93 4.25C21.56 4.57 22 5.23 22 6Z" fill="#EA4335"/>
    </svg>
  );
}

export default function FacultyPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  // Modals / Dialogs states
  const [assignModal, setAssignModal] = useState(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("Professor");
  const [editClasses, setEditClasses] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Queries
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

  // Demo: Open kebab menu for the first faculty card by default on HOD view on load
  useEffect(() => {
    if (isHOD && facultyList.length > 0 && activeDropdownId === null) {
      setActiveDropdownId(facultyList[0].id);
    }
  }, [isHOD, facultyList, activeDropdownId]);

  // Click outside listener to close kebab menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".kebab-container")) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mutations
  const assignMutation = useMutation({
    mutationFn: ({ id, className }) => assignIncharge(id, className),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
      setAssignModal(null);
      setSelectedClass("");
    },
  });

  const toggleInviteMutation = useMutation({
    mutationFn: toggleFacultyInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculty-invite"] }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => updateFaculty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
      setEditModal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteFaculty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
      setDeleteConfirm(null);
    },
  });

  if (isLoading) return <Spinner />;

  // Initializing Edit Modal data
  const handleOpenEdit = (fac) => {
    setEditModal(fac);
    setEditName(fac.name);
    setEditDesignation(fac.designation || "Professor");
    setEditClasses(fac.classes_handling || []);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editModal) return;
    editMutation.mutate({
      id: editModal.id,
      data: {
        name: editName,
        designation: editDesignation,
        classes_handling: editClasses,
      },
    });
  };

  const handleAssignConfirm = () => {
    if (!assignModal || !selectedClass) return;
    assignMutation.mutate({ id: assignModal.id, className: selectedClass });
  };

  const handleRemoveIncharge = (fac) => {
    assignMutation.mutate({ id: fac.id, className: "" });
  };

  const renderAvatar = (fac) => {
    if (fac.profile_picture) {
      return (
        <img
          src={fac.profile_picture}
          alt={fac.name}
          className="w-12 h-12 rounded-full object-cover shrink-0"
        />
      );
    }
    const initials = fac.name
      ? fac.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?";

    const colors = [
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    ];

    let sum = 0;
    if (fac.name) {
      for (let i = 0; i < fac.name.length; i++) {
        sum += fac.name.charCodeAt(i);
      }
    }
    const colorClass = colors[sum % colors.length];

    return (
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${colorClass}`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Faculty" subtitle={`${facultyList.length} faculty members`}>
        {isHOD && (
          <Button
            variant={invite?.is_active ? "primary" : "secondary"}
            onClick={() => toggleInviteMutation.mutate()}
            className="gap-2 shrink-0 rounded-lg font-medium px-4 py-2"
          >
            {invite?.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            New Faculty {invite?.is_active ? "ON" : "OFF"}
          </Button>
        )}
      </PageHeader>

      {facultyList.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No faculty members"
          description="Faculty members will appear here after they onboard."
        />
      ) : (
        <div className="grid gap-4.5">
          {facultyList.map((f) => (
            <div
              key={f.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow p-4.5 flex items-center gap-6 relative"
            >
              {/* Left Section */}
              <div className="flex items-center gap-4.5 w-[28%] min-w-0">
                {renderAvatar(f)}
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-950 dark:text-gray-50 truncate text-base leading-snug">
                    {f.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-normal">
                    {f.designation}
                  </p>
                </div>
              </div>

              {/* Middle Section - Classes Handling */}
              <div className="flex flex-col w-[25%] border-l border-gray-100 dark:border-gray-700/50 pl-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                  Classes Handling
                </span>
                <div className="flex flex-wrap gap-1">
                  {f.classes_handling && f.classes_handling.length > 0 ? (
                    f.classes_handling.map((cls) => (
                      <span
                        key={cls}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50/70 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/40"
                      >
                        {cls.replace("_", " ")}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">—</span>
                  )}
                </div>
              </div>

              {/* Middle Section - Class Incharge */}
              <div className="flex flex-col w-[15%] border-l border-gray-100 dark:border-gray-700/50 pl-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                  Incharge
                </span>
                {f.class_incharge_of ? (
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800/30">
                      {f.class_incharge_of.replace("_", " ")}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500 font-semibold">—</span>
                )}
              </div>

              {/* Right Section - Projects Assigned */}
              <div className="flex flex-col w-[17%] border-l border-gray-100 dark:border-gray-700/50 pl-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                  Projects Assigned
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {f.project_count || 0} {f.project_count === 1 ? "Project" : "Projects"}
                </span>
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center justify-end gap-5 w-[15%] border-l border-gray-100 dark:border-gray-700/50 pl-5 shrink-0">
                <a
                  href={`mailto:${f.email}`}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/15 rounded-lg transition-colors group shrink-0"
                  title={`Email ${f.name}`}
                >
                  <GmailIcon className="w-5 h-5 text-red-500 transition-transform group-hover:scale-105" />
                </a>

                {isHOD ? (
                  <div className="relative kebab-container shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(activeDropdownId === f.id ? null : f.id);
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {activeDropdownId === f.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={() => {
                            setActiveDropdownId(null);
                            if (f.class_incharge_of) {
                              handleRemoveIncharge(f);
                            } else {
                              setAssignModal(f);
                              setSelectedClass("");
                            }
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 font-medium transition-colors text-left"
                        >
                          {f.class_incharge_of ? (
                            <>
                              <UserX className="w-4.5 h-4.5" />
                              Remove as Incharge
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4.5 h-4.5" />
                              Assign as Incharge
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setActiveDropdownId(null);
                            setDeleteConfirm(f);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium transition-colors text-left"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEdit(f)}
                    disabled={user?.id !== f.user_id}
                    className="gap-1.5 border border-indigo-100 hover:bg-indigo-50/50 text-indigo-600 bg-indigo-50/10 px-3 py-1.5 rounded-lg flex items-center text-sm font-semibold shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Faculty Modal (Faculty View) */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Profile">
        <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Designation
            </label>
            <select
              value={editDesignation}
              onChange={(e) => setEditDesignation(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
            >
              <option value="Professor">Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Assistant Professor">Assistant Professor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Classes Handling
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CLASSES.map((cls) => {
                const isSelected = editClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setEditClasses((prev) =>
                        prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
                      );
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800"
                        : "bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {cls.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              variant="secondary"
              onClick={() => setEditModal(null)}
              type="button"
              className="flex-1 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="flex-1 rounded-lg"
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Incharge Modal (HOD View) */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign as Class Incharge">
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Assign <span className="font-bold text-gray-900 dark:text-gray-100">{assignModal?.name}</span> as class incharge for:
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
            >
              <option value="">-- Select Class --</option>
              {CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setAssignModal(null)}
              className="flex-1 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignConfirm}
              className="flex-1 rounded-lg"
              disabled={!selectedClass || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal (HOD View) */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        title="Delete Faculty"
        message={`Are you sure you want to delete ${deleteConfirm?.name}? This action will permanently remove their profile and credentials. Historical posts and project messages will be preserved.`}
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        danger
      />
    </div>
  );
}
