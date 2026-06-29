import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProjects, createProject, deleteProject } from "../../../api/projects";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Modal } from "../../../components/ui/Modal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Avatar } from "../../../components/ui/Avatar";
import { FolderKanban, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import MobileCard from "../../components/MobileCard";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileFAB from "../../components/MobileFAB";
import MobileEmptyState from "../../components/MobileEmptyState";

const STATUS_CHIPS = [
  { value: "", label: "All" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "REVIEW", label: "Review" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CANCELLED", label: "Cancelled" },
];

const getStatusTheme = (status) => {
  const map = {
    NOT_STARTED: { bg: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
    IN_PROGRESS: { bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
    REVIEW: { bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    COMPLETED: { bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    ON_HOLD: { bg: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
    CANCELLED: { bg: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400", dot: "bg-red-500" },
  };
  return map[status] || { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
};

export default function MobileProjectsPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page, search, status }],
    queryFn: () => listProjects({ page, search, status, per_page: 20 }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const projects = data?.projects || [];

  return (
    <div className="space-y-4 mobile-fade-in">
      {/* Search */}
      <MobileSearchBar value={search} onChange={setSearch} placeholder="Search projects..." />

      {/* Status chips — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto mobile-hide-scrollbar pb-1 -mx-1 px-1">
        {STATUS_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => setStatus(chip.value)}
            className={`mobile-tappable px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all border ${
              status === chip.value
                ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border-primary-200/50 dark:border-primary-800/30"
                : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Project Cards */}
      {projects.length === 0 ? (
        <MobileEmptyState icon={FolderKanban} title="No projects found" description="Create a new project to get started." />
      ) : (
        <div className="space-y-3">
          {projects.map(project => {
            const allMembers = project.members || [];
            const facultyMembers = allMembers.filter(m => m.role_in_project === "faculty");
            const leadAdvisor = facultyMembers[0]?.name || "Unassigned";
            const st = getStatusTheme(project.status);

            return (
              <MobileCard key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>
                {/* Top: Title + Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight flex-1 min-w-0 truncate">
                    {project.name}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${st.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {project.status.replace("_", " ")}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                  {project.description || "No description provided."}
                </p>

                {/* 2-up info row */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Lead Advisor</span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate block mt-0.5">{leadAdvisor}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Team Size</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">{allMembers.length} Members</span>
                  </div>
                </div>

                {/* Footer: Avatars + Date */}
                <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-100 dark:border-slate-700/50">
                  <div className="flex -space-x-1.5">
                    {allMembers.slice(0, 4).map((m, idx) => (
                      <Avatar key={m.id || idx} src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-white dark:ring-slate-900 w-6 h-6" />
                    ))}
                    {allMembers.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-gray-500 ring-2 ring-white dark:ring-slate-900">
                        +{allMembers.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(project.updated_at), "MMM d")}
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* FAB for HOD */}
      {isHOD && <MobileFAB onClick={() => navigate("/projects")} icon={Plus} label="Create Project" />}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Delete Project"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
