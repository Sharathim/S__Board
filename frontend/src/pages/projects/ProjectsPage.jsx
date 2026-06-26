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
import { TrendingUp, FolderKanban, Plus, Users, CheckCircle, AlertTriangle, MoreVertical, ExternalLink, Pencil, Trash2, MessageSquare, GraduationCap, X, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";

const statusOptions = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
      </div>
      
      {/* Filters & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-64">
            <SearchFilter value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search projects..." />
          </div>
          <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} options={statusOptions} />
          
          {/* Grid / List Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => { setViewMode("grid"); localStorage.setItem("project_view_mode", "grid"); }}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => { setViewMode("list"); localStorage.setItem("project_view_mode", "list"); }}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
              title="List View"
            >
              <List className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Create Project Button */}
        {isHOD && (
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        )}
      </div>

      {/* Projects Content */}
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
            
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="dh-card p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full border border-gray-200/60 dark:border-gray-700/80"
              >
                <div className="space-y-4">
                  {/* Top row */}
                  <div className="flex justify-between items-start">
                    <StatusBadge status={project.status} />
                    <div onClick={e => e.stopPropagation()}>
                      <ProjectKebab
                        project={project}
                        isHOD={isHOD}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {project.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Bottom section with divider */}
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-3.5">
                  {/* Members stacks */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Faculty */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Faculty</p>
                      <MemberStack members={facultyMembers} max={2} />
                    </div>
                    {/* Forum */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Forum</p>
                      <MemberStack members={forumMembers} max={2} />
                    </div>
                    {/* Students */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Students</p>
                      <MemberStack members={studentMembers} max={2} />
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    <span>ID: #{project.id}</span>
                    <span>Updated {format(new Date(project.updated_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Faculty</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Forum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Students</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {projects.map((project, idx) => {
                  const facultyMembers  = project.members?.filter(m => m.role_in_project === "faculty")  || [];
                  const forumMembers    = project.members?.filter(m => m.role_in_project === "forum_member") || [];
                  const studentMembers  = project.members?.filter(m => m.role_in_project === "student")  || [];
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * 10 + idx + 1}</td>
                      <td className="px-4 py-3">
                        <Link to={`/projects/${project.id}`} className="group">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary-600">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{project.description}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><MemberStack members={facultyMembers} /></td>
                      <td className="px-4 py-3"><MemberStack members={forumMembers} /></td>
                      <td className="px-4 py-3"><MemberStack members={studentMembers} /></td>
                      <td className="px-4 py-3"><StatusBadge status={project.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {format(new Date(project.updated_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
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
          <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
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
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("faculty");
  const [memberSearch, setMemberSearch] = useState("");

  // Sync form state when editProject changes
  useEffect(() => {
    if (editProject) {
      setName(editProject.name || "");
      setDescription(editProject.description || "");
      setStatus(editProject.status || "IN_PROGRESS");
      // Reconstruct selected members from project.members
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
      setSelectedMembers([]);
    }
    setError("");
    setMemberSearch("");
    setActiveTab("faculty");
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
    if (!name.trim()) { setError("Project name is required."); return; }
    if (selectedMembers.length === 0) { setError("Select at least one member (Faculty, Forum, or Student)."); return; }
    setError("");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      status,
      members: selectedMembers.map(m => ({ user_id: m.user_id, role_in_project: m.role_in_project })),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editProject ? "Edit Project" : "Create Project"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Pane: Project Details */}
          <div className="md:col-span-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Project Details</h3>
            <Input label="Project Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter project name" required />
            <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional project description..." rows={4} />

            {/* Status Select dropdown */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3.5 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Visual Live Preview */}
            <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Live Preview Card</p>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200/60 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hive Workspace</span>
                  <StatusBadge status={status} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{name || "Untitled Project"}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{description || "No description provided."}</p>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400">Last updated just now</span>
                  <div className="flex -space-x-1.5">
                    {selectedMembers.slice(0, 3).map((m, i) => (
                      <Avatar key={i} src={m.profile_picture} name={m.name} size="sm" className="w-6 h-6 ring-2 ring-white dark:ring-gray-800" />
                    ))}
                    {selectedMembers.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[9px] text-gray-500 ring-2 ring-white dark:ring-gray-800">
                        +{selectedMembers.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Member Assignment */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            <div className="flex justify-between items-baseline">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Assign Members</h3>
              <span className="text-xs font-semibold text-gray-400">{selectedMembers.length} assigned</span>
            </div>

            {/* Selected Members Chips */}
            {selectedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 max-h-24 overflow-y-auto">
                {selectedMembers.map(m => {
                  let roleLabel = "Faculty";
                  let roleColor = "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
                  if (m.role_in_project === "forum_member") {
                    roleLabel = "Forum";
                    roleColor = "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800/50";
                  } else if (m.role_in_project === "student") {
                    roleLabel = "Student";
                    roleColor = "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50";
                  }
                  return (
                    <div
                      key={m.user_id}
                      className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full border text-xs font-medium ${roleColor}`}
                    >
                      <Avatar src={m.profile_picture} name={m.name} size="sm" className="w-4.5 h-4.5" />
                      <span className="truncate max-w-[100px]">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleMember(m.user_id, m.role_in_project, m.name, m.profile_picture)}
                        className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 py-6 rounded-lg bg-gray-50/50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-700 text-center">
                <Users className="w-6 h-6 text-gray-400 mb-1" />
                <p className="text-xs text-gray-500 font-semibold">No members assigned yet</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Please select at least one Faculty, Forum, or Student</p>
              </div>
            )}

            {/* Custom Tab Switcher */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2">
              {[
                { id: "faculty", label: "Faculty", count: facultyPeople.length, activeColor: "border-blue-500 text-blue-600" },
                { id: "student", label: "Students", count: studentPeople.length, activeColor: "border-green-500 text-green-600" },
                { id: "forum", label: "Forum Members", count: forumPeople.length, activeColor: "border-violet-500 text-violet-600" },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setMemberSearch(""); }}
                    className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-all leading-none ${
                      isActive ? tab.activeColor : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                    }`}
                  >
                    {tab.label} <span className="text-[10px] opacity-75 font-normal ml-1">({tab.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Member Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder={`Search ${activeTab === "faculty" ? "faculty" : activeTab === "student" ? "students" : "forum members"}...`}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
              />
            </div>

            {/* Members Selection List */}
            <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto border border-gray-100 dark:border-gray-700/80 rounded-xl bg-white dark:bg-gray-900/10 p-2 space-y-1.5">
              {filteredPeople.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No {activeTab === "faculty" ? "faculty" : activeTab === "student" ? "students" : "forum members"} found</p>
                </div>
              ) : (
                filteredPeople.map(p => {
                  const isSelected = selectedMembers.some(s => s.user_id === p.user_id);
                  return (
                    <div
                      key={p.user_id}
                      onClick={() => toggleMember(p.user_id, roleKey, p.name, p.profile_picture)}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl border transition-all duration-150 ${
                        isSelected
                          ? "border-primary-500/80 bg-primary-50/40 dark:bg-primary-950/20"
                          : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      }`}
                    >
                      <Avatar src={p.profile_picture} name={p.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                        {p.subtitle && <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.subtitle}</p>}
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-primary-500 border-primary-500 text-white"
                          : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                      }`}>
                        {isSelected ? <Plus className="w-3.5 h-3.5 rotate-45" /> : <Plus className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/80">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-2.5">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1 py-2.5">
            {editProject ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
