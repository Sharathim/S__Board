import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usePageTransition } from "../../context/TransitionContext";
import {
  listProjects, getProjectStats, deleteProject,
} from "../../api/projects";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { SearchFilter, StatusFilter } from "../../components/shared/SearchFilter";
import { Pagination } from "../../components/shared/Pagination";
import {
  FolderKanban, Plus, Users,
  MoreVertical, ExternalLink, Pencil, Trash2, MessageSquare, GraduationCap,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { parseUTCDate } from "../../utils/dateUtils";
import { Avatar } from "../../components/ui/Avatar";
import BottomSheet from "../../mobile/layout/BottomSheet";
import { ProjectFormCard } from "./ProjectWorkflowPage";

const statusOptions = [
  { value: "IN_PROGRESS", label: "In Progress", color: "#F05A2B" },
  { value: "NOT_STARTED", label: "Not Started", color: "#9ca3af" },
  { value: "REVIEW", label: "Review", color: "#A855F7" },
  { value: "COMPLETED", label: "Completed", color: "#10b981" },
  { value: "ON_HOLD", label: "On Hold", color: "#F59E0B" },
  { value: "CANCELLED", label: "Cancelled", color: "#EF4444" },
];

const filterStatusOptions = [
  { value: "IN_PROGRESS", label: "In Progress", color: "#F05A2B" },
  { value: "COMPLETED", label: "Completed", color: "#10b981" },
];

// ─── Kebab dropdown ──────────────────────────────────────────────────────────
function ProjectKebab({ project, isHOD }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
    },
  });

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-50 min-w-[168px] rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl shadow-black/10 overflow-hidden py-1.5"
        >
          <button
            onClick={() => { setOpen(false); navigate(`/projects/${project.id}`); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[#F05A2B]" /> View Details
          </button>
          {isHOD && (
            <>
              <button
                onClick={() => navigate(`/projects/${project.id}/workflow`)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              >
                <Pencil className="w-4 h-4 text-amber-555" /> Edit
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <button
                onClick={() => { setOpen(false); if (window.confirm(`Delete "${project.name}"?`)) deleteMutation.mutate(project.id); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const getStatusTheme = (status) => {
  const map = {
    NOT_STARTED: { bg: "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 border border-slate-200 dark:border-white/10", dot: "bg-slate-400" },
    IN_PROGRESS: { bg: "bg-[#FFEEE9] text-[#F05A2B] dark:bg-[#F05A2B]/15 dark:text-[#FF8365] border border-[#FFDBD2] dark:border-[#F05A2B]/30", dot: "bg-[#F05A2B]" },
    REVIEW: { bg: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30", dot: "bg-purple-500" },
    COMPLETED: { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30", dot: "bg-emerald-500" },
    ON_HOLD: { bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30", dot: "bg-amber-500" },
    CANCELLED: { bg: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30", dot: "bg-rose-500" },
  };
  return map[status] || { bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-white/10", dot: "bg-slate-400" };
};

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { navigateWithTransition } = usePageTransition();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const openCreate = () => {
    if (window.innerWidth < 768) {
      setCreateSheetOpen(true);
    } else {
      navigate("/projects/new");
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page, search: debouncedSearch, status }],
    queryFn: () => listProjects({ page, search: debouncedSearch, status, per_page: 10 }).then(r => r.data),
  });

  const canCreateProject = isHOD || (user?.role === "STUDENT" && user?.student?.forum_role?.toLowerCase() === "placement coordinator");

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  const projects = data?.projects || [];

  return (
    <div className="space-y-5">
      {/* ─── Premium Header & Actions (Using clamp padding & spacing) ─── */}
      <div className="flex flex-row items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="font-black text-gray-900 dark:text-white tracking-tight leading-none" style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.85rem)" }}>
            Projects Registry
          </h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1.5 font-medium" style={{ fontSize: "clamp(0.68rem, 1.1vw, 0.8rem)" }}>
            Track allocations, status milestones, and latest department updates.
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="w-40 sm:w-56">
            <SearchFilter value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search projects..." />
          </div>
          <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} options={filterStatusOptions} />
        </div>
      </div>

      {/* ─── Upgraded Projects Table ─── */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create a new project to get started."
        />
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-gray-200/80 dark:border-[#2E2E34] bg-white dark:bg-[#18181B] shadow-sm">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-[#2E2E34] bg-gray-50/50 dark:bg-[#202024] text-gray-400 dark:text-zinc-400 uppercase tracking-widest font-extrabold" style={{ fontSize: "clamp(9px, 1.1vw, 10.5px)" }}>
                <th className="py-4 px-6">Project Name</th>
                <th className="py-4 px-5">Faculty</th>
                <th className="py-4 px-5">Forum Member</th>
                <th className="py-4 px-5">Students</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Last Updated</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]">
              {projects.map((project, idx) => {
                const facultyMembers = project.members?.filter(m => m.role_in_project === "faculty") || [];
                const forumMembers = project.members?.filter(m => m.role_in_project === "forum_member") || [];
                const studentMembers = project.members?.filter(m => m.role_in_project === "student") || [];
                
                const indexVal = (page - 1) * 10 + idx + 1;

                return (
                  <tr
                    key={project.id}
                    onClick={() => navigateWithTransition(`/projects/${project.id}`, project.name, FolderKanban)}
                    className="hover:bg-slate-50/60 dark:hover:bg-[#202024] cursor-pointer transition-all duration-150"
                  >
                    {/* Project Name (Index styled as a rounded pill) */}
                    <td className="px-6" style={{ paddingTop: "clamp(12px, 1.8vw, 17px)", paddingBottom: "clamp(12px, 1.8vw, 17px)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-[#202024] text-[#F05A2B] flex items-center justify-center shrink-0 font-mono text-[11px] font-bold border border-orange-100/30 dark:border-[#26262B]">
                          {indexVal}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white hover:text-[#F05A2B] transition-colors leading-tight line-clamp-1 max-w-[240px]" style={{ fontSize: "clamp(12.5px, 1.4vw, 14px)" }}>
                          {project.name}
                        </span>
                      </div>
                    </td>

                    {/* Faculty Advisor */}
                    <td className="px-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {facultyMembers.length > 0 ? (
                        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-indigo-50/50 dark:bg-[#202024] text-[#6366F1] dark:text-indigo-300 border border-indigo-100/30 dark:border-[#26262B] w-fit">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                          <span>{facultyMembers.map(m => m.name).join(", ")}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Forum Coordinator */}
                    <td className="px-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {forumMembers.length > 0 ? (
                        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-amber-50/50 dark:bg-[#202024] text-amber-600 dark:text-amber-300 border border-amber-100/30 dark:border-[#26262B] w-fit">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                          <span>{forumMembers.map(m => m.name).join(", ")}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Students Team */}
                    <td className="px-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {studentMembers.length > 0 ? (
                        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-50/50 dark:bg-[#202024] text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-[#26262B] w-fit">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>{studentMembers.map(m => m.name).join(", ")}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusTheme(project.status).bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusTheme(project.status).dot}`} />
                        {project.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className="px-5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <div>
                          <div className="font-bold text-gray-800 dark:text-gray-300">{format(parseUTCDate(project.updated_at), "dd MMM, yyyy")}</div>
                          <div className="text-[10px] font-medium text-gray-400 mt-0.5">{format(parseUTCDate(project.updated_at), "hh:mm a")}</div>
                        </div>
                      </div>
                    </td>

                    {/* Action dropdown */}
                    <td className="px-6 text-center" onClick={e => e.stopPropagation()}>
                      <ProjectKebab
                        project={project}
                        isHOD={isHOD || canCreateProject}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {projects.length > 0 && (
        <div className="pt-2">
          <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
        </div>
      )}


      {/* Floating Plus Button for Project Creation (Terracotta Orange themed) */}
      {canCreateProject && createPortal(
        <button
          onClick={openCreate}
          className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-gradient-to-r from-[#F05A2B] to-[#C93D14] text-white flex items-center justify-center shadow-xl shadow-orange-500/30 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Create New Project"
        >
          <Plus className="w-6 h-6" />
        </button>,
        document.body
      )}

      {/* Mobile Project Creation Bottom Sheet */}
      <BottomSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      >
        <ProjectFormCard
          onSuccess={() => setCreateSheetOpen(false)}
          onCancel={() => setCreateSheetOpen(false)}
        />
      </BottomSheet>
    </div>
  );
}
