import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  listProjects, getProjectStats, createProject, updateProject, deleteProject,
} from "../../api/projects";
import { listFaculty } from "../../api/faculty";
import { listAllStudents } from "../../api/classes";
import { listForumMembers } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { SearchFilter, StatusFilter } from "../../components/shared/SearchFilter";
import { Pagination } from "../../components/shared/Pagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatTile } from "../../components/ui/StatTile";
import {
  TrendingUp, FolderKanban, Plus, Users, CheckCircle, AlertTriangle,
  MoreVertical, ExternalLink, Pencil, Trash2, MessageSquare, GraduationCap,
  X, LayoutGrid, List, FileText, Edit3, Flag, Search, ChevronDown, Sparkles, FolderPlus
} from "lucide-react";
import { format } from "date-fns";

const statusOptions = [
  { value: "IN_PROGRESS", label: "In Progress", color: "#3b82f6" },
  { value: "NOT_STARTED", label: "Not Started", color: "#9ca3af" },
  { value: "REVIEW", label: "Review", color: "#f97316" },
  { value: "COMPLETED", label: "Completed", color: "#10b981" },
  { value: "ON_HOLD", label: "On Hold", color: "#f59e0b" },
  { value: "CANCELLED", label: "Cancelled", color: "#ef4444" },
];

// ─── Kebab dropdown ──────────────────────────────────────────────────────────
function ProjectKebab({ project, isHOD, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Project actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </button>
          {isHOD && (
            <>
              <button
                onClick={() => onEdit(project)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => onDelete(project)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Compact avatar stack ────────────────────────────────────────────────────
function MemberStack({ members, max = 3 }) {
  if (!members || members.length === 0) return <span className="text-xs text-gray-400">—</span>;
  const visible = members.slice(0, max);
  const rest = members.length - max;
  return (
    <div className="flex -space-x-1.5 items-center">
      {visible.map(m => (
        <Avatar key={m.id} src={m.profile_picture} name={m.name} size="sm"
          className="ring-2 ring-white dark:ring-gray-800" />
      ))}
      {rest > 0 && (
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 ring-2 ring-white dark:ring-gray-800">
          +{rest}
        </div>
      )}
    </div>
  );
}

const getStatusTheme = (status) => {
  const map = {
    NOT_STARTED: { bg: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/50", dot: "bg-slate-400" },
    IN_PROGRESS: { bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-900/30", dot: "bg-indigo-500" },
    REVIEW:      { bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30", dot: "bg-amber-500" },
    COMPLETED:   { bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30", dot: "bg-emerald-500" },
    ON_HOLD:     { bg: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 border-yellow-100/50 dark:border-yellow-900/30", dot: "bg-yellow-500" },
    CANCELLED:   { bg: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100/50 dark:border-red-900/30", dot: "bg-red-500" },
  };
  return map[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("project_view_mode") || "grid");

  // modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null); // null = create, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page, search, status }],
    queryFn: () => listProjects({ page, search, status, per_page: 10 }).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      setModalOpen(false);
      setEditProject(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      setModalOpen(false);
      setEditProject(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => { setEditProject(null); setModalOpen(true); };
  const openEdit   = (p)  => { setEditProject(p);  setModalOpen(true); };

  if (isLoading) return <Spinner />;
  const projects = data?.projects || [];

  return (
    <div className="space-y-8">
      {/* ─── Premium Header ─── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Projects</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Manage, allocate, and monitor department projects and team workspaces.
        </p>
      </div>

      {/* ─── Premium Glassmorphic Stats Dock ─── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Projects", value: stats.total || 0, icon: FolderKanban, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
            { label: "In Progress", value: stats.in_progress || 0, icon: TrendingUp, color: "text-indigo-500 dark:text-indigo-400 bg-indigo-500/10" },
            { label: "Completed", value: stats.completed || 0, icon: CheckCircle, color: "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="dh-card p-4 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] border border-gray-200/50 dark:border-gray-800/40"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color} shrink-0`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{stat.value}</span>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* ─── Filters & Actions Dock ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10 border border-gray-200/50 dark:border-gray-800/30">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-64">
            <SearchFilter value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search projects..." />
          </div>
          <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} options={statusOptions} />
          
          {/* Grid / List Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-200/50 dark:bg-gray-800/60 border border-gray-200/40 dark:border-gray-700/40">
            <button
              onClick={() => { setViewMode("grid"); localStorage.setItem("project_view_mode", "grid"); }}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-400 dark:text-gray-550 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setViewMode("list"); localStorage.setItem("project_view_mode", "list"); }}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-400 dark:text-gray-550 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Create Project Button */}
        {isHOD && (
          <Button onClick={openCreate} className="gap-2 shadow-sm hover:shadow-primary-glow/20 transition-all shrink-0">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        )}
      </div>

      {/* ─── Projects Content ─── */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create a new project to get started."
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const facultyMembers  = project.members?.filter(m => m.role_in_project === "faculty")  || [];
            const forumMembers    = project.members?.filter(m => m.role_in_project === "forum_member") || [];
            const studentMembers  = project.members?.filter(m => m.role_in_project === "student")  || [];
            
            // Combine and sort members with role ring classes
            const allMembers = [
              ...facultyMembers.map(m => ({ ...m, ringClass: "ring-violet-500" })),
              ...forumMembers.map(m => ({ ...m, ringClass: "ring-blue-500" })),
              ...studentMembers.map(m => ({ ...m, ringClass: "ring-emerald-500" }))
            ];

            const visibleMembers = allMembers.slice(0, 4);
            const restCount = allMembers.length - 4;
            
            const isCompleted = project.status === "COMPLETED";
            const borderAccent = isCompleted 
              ? "hover:border-emerald-500/40 hover:shadow-emerald-500/5" 
              : "hover:border-indigo-500/40 hover:shadow-indigo-500/5";

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className={`group flex flex-col justify-between h-full bg-white dark:bg-gray-800/80 rounded-3xl border border-gray-150 dark:border-gray-700/80 shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden ${borderAccent}`}
              >
                {/* Card Main Body */}
                <div className="p-6 space-y-5">
                  {/* Header row: Icon & Status */}
                  <div className="flex justify-between items-start">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/10">
                      <FolderKanban className="w-5.5 h-5.5" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getStatusTheme(project.status).bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusTheme(project.status).dot}`} />
                        {project.status.replace("_", " ")}
                      </span>
                      <div onClick={e => e.stopPropagation()}>
                        <ProjectKebab
                          project={project}
                          isHOD={isHOD}
                          onEdit={openEdit}
                          onDelete={setDeleteTarget}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight group-hover:text-primary-650 dark:group-hover:text-primary-400 transition-colors tracking-tight line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                      {project.description || "No description provided for this project."}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Darker Glass Well */}
                <div className="px-6 py-4.5 bg-slate-50/70 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  {/* Member avatars */}
                  <div className="flex items-center gap-2 min-w-0">
                    {allMembers.length > 0 ? (
                      <>
                        <div className="flex -space-x-2 shrink-0">
                          {visibleMembers.map((m, idx) => (
                            <Avatar
                              key={m.id || idx}
                              src={m.profile_picture}
                              name={m.name}
                              size="sm"
                              className={`ring-2 ${m.ringClass} w-7 h-7 rounded-full`}
                            />
                          ))}
                          {restCount > 0 && (
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-gray-800 border border-slate-350 dark:border-gray-700 flex items-center justify-center text-[9px] font-extrabold text-gray-655 dark:text-gray-400 ring-2 ring-slate-100 dark:ring-gray-900">
                              +{restCount}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-455 dark:text-gray-500 uppercase tracking-wider truncate">
                          {allMembers.length} {allMembers.length === 1 ? "Contributor" : "Contributors"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">No contributors</span>
                    )}
                  </div>

                  {/* Metadata */}
                  <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider shrink-0 ml-3">
                    {format(new Date(project.updated_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-800/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider w-12">#</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Faculty</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Forum</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Students</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="w-10 px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800/40">
                {projects.map((project, idx) => {
                  const facultyMembers  = project.members?.filter(m => m.role_in_project === "faculty")  || [];
                  const forumMembers    = project.members?.filter(m => m.role_in_project === "forum_member") || [];
                  const studentMembers  = project.members?.filter(m => m.role_in_project === "student")  || [];
                  return (
                    <tr key={project.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-450 dark:text-gray-500">{(page - 1) * 10 + idx + 1}</td>
                      <td className="px-5 py-4">
                        <Link to={`/projects/${project.id}`} className="group block max-w-sm">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1 leading-relaxed">{project.description}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-4"><MemberStack members={facultyMembers} /></td>
                      <td className="px-5 py-4"><MemberStack members={forumMembers} /></td>
                      <td className="px-5 py-4"><MemberStack members={studentMembers} /></td>
                      <td className="px-5 py-4"><StatusBadge status={project.status} /></td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {format(new Date(project.updated_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-5 py-4">
                        <ProjectKebab
                          project={project}
                          isHOD={isHOD}
                          onEdit={openEdit}
                          onDelete={setDeleteTarget}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-150 dark:border-gray-800/40">
            <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
          </div>
        </div>
      )}


      {/* Create / Edit Modal */}
      <ProjectModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProject(null); }}
        editProject={editProject}
        onSubmit={(formData) => {
          if (editProject) {
            updateMutation.mutate({ id: editProject.id, data: formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────
function ProjectModal({ open, onClose, editProject, onSubmit, loading }) {
  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
    enabled: open,
  });

  const { data: forumData } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
    enabled: open,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => listAllStudents().then(r => r.data.students),
    enabled: open,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("IN_PROGRESS");
  const [priority, setPriority] = useState("Medium");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("faculty");
  const [memberSearch, setMemberSearch] = useState("");

  // Dropdown UI states
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  const statusRef = useRef(null);
  const priorityRef = useRef(null);

  // Click away to close custom dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
      if (priorityRef.current && !priorityRef.current.contains(e.target)) setPriorityOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync form state when editProject changes
  useEffect(() => {
    if (editProject) {
      setName(editProject.name || "");
      setDescription(editProject.description || "");
      setStatus(editProject.status || "IN_PROGRESS");
      setPriority("Medium");
      const members = (editProject.members || []).map(m => ({
        user_id: m.id,
        role_in_project: m.role_in_project,
        name: m.name,
        profile_picture: m.profile_picture,
      }));
      setSelectedMembers(members);
    } else {
      setName("");
      setDescription("");
      setStatus("IN_PROGRESS");
      setPriority("Medium");
      setSelectedMembers([]);
    }
    setError("");
    setMemberSearch("");
    setActiveTab("faculty");
    setStatusOpen(false);
    setPriorityOpen(false);
  }, [editProject, open]);

  const toggleMember = (userId, role, name, profilePicture) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.user_id === userId);
      if (exists) return prev.filter(m => m.user_id !== userId);
      return [...prev, { user_id: userId, role_in_project: role, name, profile_picture: profilePicture }];
    });
  };

  const facultyPeople  = (facultyData  || []).map(f => ({ user_id: f.user_id, name: f.name, profile_picture: f.profile_picture, subtitle: f.designation, role: "faculty" }));
  const forumPeople    = (forumData    || []).map(m => ({ user_id: m.user_id, name: m.name, profile_picture: m.profile_picture, subtitle: m.role, role: "forum_member" }));
  const studentPeople  = (studentsData || []).map(s => ({ user_id: s.user_id, name: s.name, profile_picture: s.profile_picture, subtitle: s.class_name?.replace("_", " "), role: "student" }));

  let currentPeople = [];
  let roleKey = "faculty";
  if (activeTab === "faculty") {
    currentPeople = facultyPeople;
    roleKey = "faculty";
  } else if (activeTab === "forum") {
    currentPeople = forumPeople;
    roleKey = "forum_member";
  } else if (activeTab === "student") {
    currentPeople = studentPeople;
    roleKey = "student";
  }

  const filteredPeople = memberSearch
    ? currentPeople.filter(p => p.name.toLowerCase().includes(memberSearch.toLowerCase()))
    : currentPeople;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project title is required."); return; }
    if (selectedMembers.length === 0) { setError("Select at least one member (Faculty, Forum, or Student)."); return; }
    setError("");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      status,
      members: selectedMembers.map(m => ({ user_id: m.user_id, role_in_project: m.role_in_project })),
    });
  };

  // Find label & color details of current status option
  const activeStatusOption = statusOptions.find(opt => opt.value === status) || statusOptions[0];

  // Priority options config
  const priorityOptions = [
    { value: "Low", label: "Low", color: "text-green-500 bg-green-500/10", flagColor: "#10b981" },
    { value: "Medium", label: "Medium", color: "text-orange-500 bg-orange-500/10", flagColor: "#f97316" },
    { value: "High", label: "High", color: "text-red-500 bg-red-500/10", flagColor: "#ef4444" },
  ];
  const activePriorityOption = priorityOptions.find(opt => opt.value === priority) || priorityOptions[1];

  return (
    <Modal open={open} onClose={onClose} size="xl" hideHeader={true}>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ─── Redesigned Custom Header ─── */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 flex items-center justify-center shrink-0">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {editProject ? "Edit Project Details" : "Create New Project"}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {editProject ? "Modify fields and update allocations below" : "Fill in the details to create a new project"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-650 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ─── Left Pane: Details ─── */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Project Title Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Project Title</label>
              <div className="relative flex items-center">
                <FileText className="absolute left-3.5 w-4 h-4 text-gray-400 dark:text-gray-505" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter project title..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Description (Optional)</label>
              <div className="relative">
                <Edit3 className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 dark:text-gray-550" />
                <textarea
                  value={description}
                  onChange={e => { if (e.target.value.length <= 500) setDescription(e.target.value); }}
                  placeholder="Describe your project goals, objectives, and details..."
                  rows={5}
                  maxLength={500}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm resize-none"
                />
                <span className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-gray-400 select-none">
                  {description.length}/500
                </span>
              </div>
            </div>

            {/* Custom Project Status Dropdown */}
            <div className="space-y-1.5" ref={statusRef}>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Project Status</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeStatusOption.color }} />
                    <span className="font-medium text-gray-850 dark:text-gray-200">{activeStatusOption.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-205 ${statusOpen ? "rotate-180" : ""}`} />
                </button>

                {statusOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                    {statusOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setStatus(opt.value); setStatusOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          opt.value === status ? "bg-gray-50/50 dark:bg-gray-700/30 font-semibold" : ""
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                        <span className="text-gray-800 dark:text-gray-200">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Priority Dropdown */}
            <div className="space-y-1.5" ref={priorityRef}>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Priority</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPriorityOpen(!priorityOpen)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 shrink-0" style={{ color: activePriorityOption.flagColor }} />
                    <span className="font-medium text-gray-850 dark:text-gray-200">{activePriorityOption.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-205 ${priorityOpen ? "rotate-180" : ""}`} />
                </button>

                {priorityOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-800 shadow-xl overflow-hidden py-1">
                    {priorityOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setPriority(opt.value); setPriorityOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          opt.value === priority ? "bg-gray-50/50 dark:bg-gray-700/30 font-semibold" : ""
                        }`}
                      >
                        <Flag className="w-4 h-4 shrink-0" style={{ color: opt.flagColor }} />
                        <span className="text-gray-850 dark:text-gray-200">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ─── Right Pane: Member Assignment ─── */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Header Title block */}
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight">Assign Members</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Add faculty, students or forum members</p>
            </div>

            {/* Custom Tab Switcher with custom matched Icons */}
            <div className="flex p-1 rounded-xl bg-gray-150/60 dark:bg-gray-800/60 border border-gray-200/40 dark:border-gray-700/40 gap-1.5">
              {[
                { id: "faculty", label: "Faculty", count: facultyPeople.length, icon: GraduationCap },
                { id: "student", label: "Students", count: studentPeople.length, icon: Users },
                { id: "forum", label: "Forum Members", count: forumPeople.length, icon: MessageSquare },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setMemberSearch(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      isActive 
                        ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                        : "text-gray-450 dark:text-gray-500 hover:text-gray-650 dark:hover:text-gray-400"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-75 font-normal ml-0.5">({tab.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Member Search input with left Search Icon inside */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={`Search ${activeTab === "faculty" ? "faculty" : activeTab === "student" ? "students" : "forum members"}...`}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-250 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
              />
            </div>

            {/* Members Selection List */}
            <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto border border-gray-100 dark:border-gray-800/60 rounded-2xl bg-white dark:bg-gray-900/10 p-2 space-y-1.5">
              {filteredPeople.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-550 font-medium">No matches found</p>
                </div>
              ) : (
                filteredPeople.map(p => {
                  const isSelected = selectedMembers.some(s => s.user_id === p.user_id);
                  return (
                    <div
                      key={p.user_id}
                      onClick={() => toggleMember(p.user_id, roleKey, p.name, p.profile_picture)}
                      className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "border-primary-500/60 bg-primary-50/20 dark:bg-primary-950/10 shadow-sm"
                          : "border-gray-100 dark:border-gray-800/40 hover:border-gray-200/60 dark:hover:border-gray-700 hover:bg-gray-50/30 dark:hover:bg-gray-800/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={p.profile_picture} name={p.name} size="sm" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-750" />
                        <div className="min-w-0 flex flex-col">
                          <p className="text-sm font-semibold text-gray-850 dark:text-gray-205 truncate">{p.name}</p>
                          {p.subtitle && <p className="text-[11px] text-gray-450 dark:text-gray-500 truncate mt-0.5">{p.subtitle}</p>}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 ${
                          isSelected
                            ? "bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 text-white shadow-sm"
                            : "border-gray-250 dark:border-gray-750 text-gray-400 hover:text-gray-650 hover:border-gray-350 dark:hover:text-gray-300"
                        }`}
                      >
                        {isSelected ? <Plus className="w-3.5 h-3.5 rotate-45" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom members added status banner */}
            <div className="p-3.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-55/30 dark:bg-gray-900/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-150/50 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-205">
                  {selectedMembers.length === 0 ? "No members added yet" : `${selectedMembers.length} member(s) added`}
                </p>
                <p className="text-[10px] text-gray-455 dark:text-gray-500 mt-0.5">
                  {selectedMembers.length === 0 ? "Add at least one member to create the project" : "Ready to configure project workspace"}
                </p>
              </div>
            </div>

          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3.5 py-2.5 rounded-xl border border-red-100 dark:border-red-900/50">
            {error}
          </p>
        )}

        {/* ─── Form Actions Footer ─── */}
        <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-800/80">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] text-white hover:opacity-90 shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <Spinner className="w-4.5 h-4.5 border-white" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{editProject ? "Save Changes" : "Create Project"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
