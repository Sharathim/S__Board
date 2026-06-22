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
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { SearchFilter, StatusFilter } from "../../components/shared/SearchFilter";
import { Pagination } from "../../components/shared/Pagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatTile } from "../../components/ui/StatTile";
import { TrendingUp, FolderKanban, Plus, Users, CheckCircle, AlertTriangle, MoreVertical, ExternalLink, Pencil, Trash2, MessageSquare, GraduationCap } from "lucide-react";
import { format } from "date-fns";

const statusOptions = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "LOW_ACTIVITY", label: "Low Activity" },
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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

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

  const statCards = [
    { key: "total",         label: "Total",        icon: FolderKanban,  color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" },
    { key: "in_progress",   label: "In Progress",  icon: TrendingUp,    color: "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30" },
    { key: "student_count", label: "Students",     icon: Users,         color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30" },
    { key: "completed",     label: "Completed",    icon: CheckCircle,   color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30" },
    { key: "low_activity",  label: "Low Activity", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30" },
  ];

  const openCreate = () => { setEditProject(null); setModalOpen(true); };
  const openEdit   = (p)  => { setEditProject(p);  setModalOpen(true); };

  if (isLoading) return <Spinner />;
  const projects = data?.projects || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" subtitle={`${data?.total || 0} total projects`}>
        {isHOD && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        )}
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map(card => (
          <StatTile key={card.key} icon={card.icon} value={stats?.[card.key] ?? 0} label={card.label} accent={card.color} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <SearchFilter value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search projects..." />
        </div>
        <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} options={statusOptions} />
      </div>

      {/* Table */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create a new project to get started."
          action={isHOD && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Create Project
            </Button>
          )}
        />
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
                          <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600">{project.name}</p>
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

// ─── Member section tab for the modal ────────────────────────────────────────
function MemberSection({ title, icon: Icon, color, people, roleKey, selected, onToggle }) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : people;
  const selectedCount = people.filter(p => selected.some(s => s.user_id === p.user_id)).length;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Section header */}
      <div className={`flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
          {selectedCount > 0 && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300`}>
              {selectedCount} selected
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{people.length} available</span>
      </div>
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      {/* List */}
      <div className="max-h-40 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No {title.toLowerCase()} found</p>
        ) : (
          filtered.map(p => {
            const isSelected = selected.some(s => s.user_id === p.user_id);
            return (
              <label
                key={p.user_id}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(p.user_id, roleKey)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Avatar src={p.profile_picture} name={p.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                  {p.subtitle && <p className="text-xs text-gray-400 truncate">{p.subtitle}</p>}
                </div>
              </label>
            );
          })
        )}
      </div>
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
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState("");

  // Sync form state when editProject changes
  useEffect(() => {
    if (editProject) {
      setName(editProject.name || "");
      setDescription(editProject.description || "");
      // Reconstruct selected members from project.members
      const members = (editProject.members || []).map(m => ({
        user_id: m.id,
        role_in_project: m.role_in_project,
      }));
      setSelectedMembers(members);
    } else {
      setName("");
      setDescription("");
      setSelectedMembers([]);
    }
    setError("");
  }, [editProject, open]);

  const toggleMember = (userId, role) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.user_id === userId);
      if (exists) return prev.filter(m => m.user_id !== userId);
      return [...prev, { user_id: userId, role_in_project: role }];
    });
  };

  const facultyPeople  = (facultyData  || []).map(f => ({ user_id: f.user_id, name: f.name, profile_picture: f.profile_picture, subtitle: f.designation }));
  const forumPeople    = (forumData    || []).map(m => ({ user_id: m.user_id, name: m.name, profile_picture: m.profile_picture, subtitle: m.role }));
  const studentPeople  = (studentsData || []).map(s => ({ user_id: s.user_id, name: s.name, profile_picture: s.profile_picture, subtitle: s.class_name?.replace("_", " ") }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required."); return; }
    if (selectedMembers.length === 0) { setError("Select at least one member (Faculty, Forum, or Student)."); return; }
    setError("");
    onSubmit({ name: name.trim(), description: description.trim(), members: selectedMembers });
  };

  return (
    <Modal open={open} onClose={onClose} title={editProject ? "Edit Project" : "Create Project"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Project Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter project name" required />
        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Assign Members <span className="text-gray-400 font-normal">(select at least one)</span>
          </p>

          <MemberSection
            title="Faculty"
            icon={Users}
            color="text-blue-600"
            people={facultyPeople}
            roleKey="faculty"
            selected={selectedMembers}
            onToggle={toggleMember}
          />
          <MemberSection
            title="Forum Members"
            icon={MessageSquare}
            color="text-violet-600"
            people={forumPeople}
            roleKey="forum_member"
            selected={selectedMembers}
            onToggle={toggleMember}
          />
          <MemberSection
            title="Students"
            icon={GraduationCap}
            color="text-green-600"
            people={studentPeople}
            roleKey="student"
            selected={selectedMembers}
            onToggle={toggleMember}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">
            {editProject ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
