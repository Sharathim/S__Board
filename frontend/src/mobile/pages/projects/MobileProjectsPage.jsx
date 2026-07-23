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
  const [editSheetTarget, setEditSheetTarget] = useState(null);
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
      {/* Search Bar */}
      <MobileSearchBar
        value={search}
        onChange={(val) => { setSearch(val); setPage(1); }}
        placeholder="Search projects by name..."
      />

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto mobile-hide-scrollbar pb-1 -mx-1 px-1">
        {STATUS_OPTIONS.map((opt) => {
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1); }}
              className={`mobile-tappable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                active
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              {opt.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: active ? "#FFFFFF" : opt.color }}
                />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <MobileEmptyState
          icon={FolderKanban}
          title="No projects found"
          description={
            search || status
              ? "Try adjusting your search or filters"
              : "No projects have been created yet."
          }
        />
      ) : (
        <div className="space-y-3">
          {projects.map((proj) => {
            const st = getStatusTheme(proj.status);
            const totalMembers =
              (proj.faculty_members?.length || 0) +
              (proj.student_members?.length || 0) +
              (proj.forum_members?.length || 0);

            return (
              <MobileCard
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
              >
                <div className="space-y-2.5">
                  {/* Top row: Status dot + Date + Kebab */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.bg} ${st.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {proj.status.replace("_", " ")}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-gray-400">
                        {format(parseUTCDate(proj.updated_at), "MMM d")}
                      </span>
                      {isHOD && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionSheet(proj);
                          }}
                          className="mobile-tappable p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    {proj.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {/* Footer: Member avatars count */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        {totalMembers} member{totalMembers !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-primary-600 text-[11px]">
                      View details
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="mobile-tappable px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-600 dark:text-gray-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-gray-400 tabular-nums">
            {page} / {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
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
      <BottomSheet open={createSheetOpen} onClose={() => setCreateSheetOpen(false)} title="Create New Project">
        <ProjectFormCard
          onSuccess={() => {
            setCreateSheetOpen(false);
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }}
          onCancel={() => setCreateSheetOpen(false)}
        />
      </BottomSheet>

      {/* Edit Project Bottom Sheet */}
      <BottomSheet open={!!editSheetTarget} onClose={() => setEditSheetTarget(null)} title="Edit Project">
        {editSheetTarget && (
          <ProjectFormCard
            projectId={editSheetTarget.id}
            onSuccess={() => {
              setEditSheetTarget(null);
              queryClient.invalidateQueries({ queryKey: ["projects"] });
            }}
            onCancel={() => setEditSheetTarget(null)}
          />
        )}
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
                onClick={() => {
                  const target = actionSheet;
                  setActionSheet(null);
                  setEditSheetTarget(target);
                }}
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
