import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listProjects, getProjectStats, createProject } from "../../api/projects";
import { listFaculty } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { SearchFilter, StatusFilter } from "../../components/shared/SearchFilter";
import { Pagination } from "../../components/shared/Pagination";
import {
  FolderKanban, Plus, Users, CheckCircle, AlertTriangle,
  MoreHorizontal, ExternalLink
} from "lucide-react";
import { format } from "date-fns";

const statusOptions = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "LOW_ACTIVITY", label: "Low Activity" },
  { value: "COMPLETED", label: "Completed" },
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);

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
      setShowCreate(false);
    },
  });

  const statCards = [
    { key: "total", label: "Total", icon: FolderKanban, color: "text-blue-600 bg-blue-100" },
    { key: "in_progress", label: "In Progress", icon: FolderKanban, color: "text-primary-600 bg-primary-100" },
    { key: "student_count", label: "Students", icon: Users, color: "text-green-600 bg-green-100" },
    { key: "completed", label: "Completed", icon: CheckCircle, color: "text-emerald-600 bg-emerald-100" },
    { key: "low_activity", label: "Low Activity", icon: AlertTriangle, color: "text-yellow-600 bg-yellow-100" },
  ];

  if (isLoading) return <Spinner />;

  const projects = data?.projects || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data?.total || 0} total projects</p>
        </div>
        {isHOD && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center mb-2`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats?.[card.key] ?? 0}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          );
        })}
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
        <EmptyState icon={FolderKanban} title="No projects found" description="Create a new project to get started." action={isHOD && <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Project</Button>} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Members</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {projects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${project.id}`} className="group">
                        <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600">{project.name}</p>
                        {project.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{project.description}</p>}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-2">
                        {project.members?.slice(0, 5).map(m => (
                          <Avatar key={m.id} src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-white dark:ring-gray-800" />
                        ))}
                        {project.members?.length > 5 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 ring-2 ring-white dark:ring-gray-800">
                            +{project.members.length - 5}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={project.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(project.updated_at), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${project.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 inline-block">
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
        </div>
      )}

      {/* Create Modal */}
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(formData) => createMutation.mutate(formData)}
        loading={createMutation.isPending}
      />
    </div>
  );
}

function CreateProjectModal({ open, onClose, onSubmit, loading }) {
  const { data: faculty } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const toggleMember = (userId, role) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.user_id === userId);
      if (exists) return prev.filter(m => m.user_id !== userId);
      return [...prev, { user_id: userId, role_in_project: role }];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), members: selectedMembers });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Project Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter project name" required />
        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Members</label>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-600 rounded-lg p-2">
            {faculty?.map(f => (
              <label key={f.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMembers.some(m => m.user_id === f.user_id)}
                  onChange={() => toggleMember(f.user_id, "faculty")}
                  className="rounded border-gray-300 text-primary-600"
                />
                <Avatar src={f.profile_picture} name={f.name} size="sm" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{f.name}</span>
                <Badge>Faculty</Badge>
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full">Create Project</Button>
      </form>
    </Modal>
  );
}
