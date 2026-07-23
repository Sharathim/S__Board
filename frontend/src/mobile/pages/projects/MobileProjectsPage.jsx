import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProjects, deleteProject } from "../../../api/projects";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { format } from "date-fns";
import { parseUTCDate } from "../../../utils/dateUtils";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";
import MobileFAB from "../../components/MobileFAB";
import BottomSheet from "../../layout/BottomSheet";
import { ProjectFormCard } from "../../../pages/projects/ProjectWorkflowPage";
import {
  FolderKanban, Clock, Users, GraduationCap,
  MessageSquare, MoreVertical, Trash2, Eye,
  Plus, ChevronRight, Pencil,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "IN_PROGRESS", label: "Active", color: "#F05A2B" },
  { value: "COMPLETED", label: "Done", color: "#10B981" },
  { value: "NOT_STARTED", label: "New", color: "#9CA3AF" },
  { value: "REVIEW", label: "Review", color: "#A855F7" },
];

const getStatusTheme = (status) => {
  const map = {
    NOT_STARTED: { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
    IN_PROGRESS: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-[#F05A2B] dark:text-orange-400", dot: "bg-[#F05A2B]" },
    REVIEW: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
    COMPLETED: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    ON_HOLD: { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-500" },
    CANCELLED: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  };
  return map[status] || map.NOT_STARTED;
};

export default function MobileProjectsPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [actionSheet, setActionSheet] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page, search, status }],
    queryFn: () => listProjects({ page, search, status, per_page: 15 }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      setActionSheet(null);
    },
  });

  const canCreateProject = isHOD || (user?.role === "STUDENT" && user?.student?.forum_role?.toLowerCase() === "placement coordinator");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const projects = data?.projects || [];

  return (
    <div className="mobile-fade-in pb-6 space-y-4">
      {/* Search */}
      <MobileSearchBar
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search projects..."
      />

      {/* Status Filter Chips */}
      <div className="flex gap-2 overflow-x-auto mobile-hide-scrollbar pb-1 -mx-1 px-1">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setPage(1); }}
            className={`mobile-tappable whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 ${
              status === opt.value
                ? "bg-[#F05A2B] text-white border-[#F05A2B] shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-800"
            }`}
          >
            {opt.color && status !== opt.value && (
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: opt.color }} />
            )}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <MobileEmptyState
          icon={FolderKanban}
          title="No projects found"
          description={search ? "Try a different search term" : "Create a new project to get started."}
        />
      ) : (
        <div className="space-y-2.5">
          {projects.map((project) => {
            const st = getStatusTheme(project.status);
            const facultyMembers = project.members?.filter(m => m.role_in_project === "faculty") || [];
            const studentMembers = project.members?.filter(m => m.role_in_project === "student") || [];

            return (
              <MobileCard
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  {(isHOD || canCreateProject) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setActionSheet(project); }}
                      className="mobile-tappable p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Members */}
                <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                  {facultyMembers.length > 0 && (
                    <div className="flex items-center gap-1 truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{facultyMembers.map(m => m.name).join(", ")}</span>
                    </div>
                  )}
                  {studentMembers.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{studentMembers.length}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {format(parseUTCDate(project.updated_at), "dd MMM, yyyy")}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {projects.length > 0 && data?.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="mobile-tappable px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-gray-400 tabular-nums">
            {page} / {data.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="mobile-tappable px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* FAB for Create */}
      {canCreateProject && (
        <MobileFAB onClick={() => setCreateSheetOpen(true)} icon={Plus} label="Create Project" />
      )}

      {/* Create Project Bottom Sheet */}
      <BottomSheet open={createSheetOpen} onClose={() => setCreateSheetOpen(false)}>
        <ProjectFormCard
          onSuccess={() => setCreateSheetOpen(false)}
          onCancel={() => setCreateSheetOpen(false)}
        />
      </BottomSheet>

      {/* Action Bottom Sheet */}
      <BottomSheet open={!!actionSheet} onClose={() => setActionSheet(null)} title={actionSheet?.name}>
        {actionSheet && (
          <div className="space-y-1">
            <button
              onClick={() => { setActionSheet(null); navigate(`/projects/${actionSheet.id}`); }}
              className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">View Details</span>
            </button>
            {isHOD && (
              <button
                onClick={() => { setActionSheet(null); navigate(`/projects/${actionSheet.id}/workflow`); }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500">
                  <Pencil className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Edit Project</span>
              </button>
            )}
            {isHOD && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete "${actionSheet.name}"?`)) {
                    deleteMutation.mutate(actionSheet.id);
                  }
                }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Project</span>
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
