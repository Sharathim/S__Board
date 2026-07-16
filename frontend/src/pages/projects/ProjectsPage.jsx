import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usePageTransition } from "../../context/TransitionContext";
import {
  listProjects, getProjectStats, createProject, updateProject, deleteProject,
} from "../../api/projects";
import { listFaculty } from "../../api/faculty";
import { listAllStudents } from "../../api/classes";
import { listForumMembers } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SearchFilter, StatusFilter } from "../../components/shared/SearchFilter";
import { Pagination } from "../../components/shared/Pagination";
import {
  FolderKanban, Plus, Users, CheckCircle,
  MoreVertical, ExternalLink, Pencil, Trash2, MessageSquare, GraduationCap,
  X, FileText, Edit3, Sparkles, FolderPlus,
  ChevronDown, Clock, Search
} from "lucide-react";
import { format } from "date-fns";
import { parseUTCDate } from "../../utils/dateUtils";
import { Modal } from "../../components/ui/Modal";
import { Avatar } from "../../components/ui/Avatar";

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
    <div ref={ref} className="relative" style={{ overflow: "visible" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-2 rounded-xl text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Project actions"
      >
        <MoreVertical className="w-4.5 h-4.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-[100] w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-150 dark:border-gray-700 py-1.5 animate-fade-in"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[#F05A2B]" /> Open
          </button>
          {isHOD && (
            <>
              <button
                onClick={() => onEdit(project)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              >
                <Pencil className="w-4 h-4 text-amber-555" /> Edit
              </button>
              <div className="my-1 h-px bg-gray-100 dark:bg-gray-700 mx-3" />
              <button
                onClick={() => onDelete(project)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
    NOT_STARTED: { bg: "bg-slate-50 text-slate-650 dark:bg-slate-800/85 dark:text-slate-400 border-slate-200/60", dot: "bg-slate-400" },
    IN_PROGRESS: { bg: "bg-orange-50 text-[#F05A2B] dark:bg-orange-950/30 dark:text-orange-450 border-orange-100 dark:border-orange-900/35", dot: "bg-[#F05A2B]" },
    REVIEW: { bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-100", dot: "bg-purple-500" },
    COMPLETED: { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450 border-emerald-100/50", dot: "bg-emerald-500" },
    ON_HOLD: { bg: "bg-yellow-50 text-yellow-750 dark:bg-yellow-950/40 dark:text-yellow-405 border-yellow-100/50", dot: "bg-yellow-550" },
    CANCELLED: { bg: "bg-red-50 text-red-750 dark:bg-red-950/40 dark:text-red-405 border-red-100/50", dot: "bg-red-550" },
  };
  return map[status] || { bg: "bg-slate-100 text-slate-650 border-slate-200", dot: "bg-slate-450" };
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
  const [status, setStatus] = useState("");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null); // null = create, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page, search, status }],
    queryFn: () => listProjects({ page, search, status, per_page: 10 }).then(r => r.data),
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
  const openEdit = (p) => { setEditProject(p); setModalOpen(true); };

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
        <div className="overflow-x-auto rounded-[24px] border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/35 text-gray-400 dark:text-gray-500 uppercase tracking-widest font-extrabold" style={{ fontSize: "clamp(9px, 1.1vw, 10.5px)" }}>
                <th className="py-4 px-6">Project Name</th>
                <th className="py-4 px-5">Faculty Advisor</th>
                <th className="py-4 px-5">Forum Coordinator</th>
                <th className="py-4 px-5">Students Team</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Last Updated</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
              {projects.map((project, idx) => {
                const facultyMembers = project.members?.filter(m => m.role_in_project === "faculty") || [];
                const forumMembers = project.members?.filter(m => m.role_in_project === "forum_member") || [];
                const studentMembers = project.members?.filter(m => m.role_in_project === "student") || [];
                
                const indexVal = (page - 1) * 10 + idx + 1;

                return (
                  <tr
                    key={project.id}
                    onClick={() => navigateWithTransition(`/projects/${project.id}`, project.name, FolderKanban)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 cursor-pointer transition-all duration-150"
                  >
                    {/* Project Name (Index styled as a rounded pill) */}
                    <td className="px-6" style={{ paddingTop: "clamp(12px, 1.8vw, 17px)", paddingBottom: "clamp(12px, 1.8vw, 17px)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-[#F05A2B] flex items-center justify-center shrink-0 font-mono text-[11px] font-bold border border-orange-100/30">
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
                        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20 text-[#6366F1] dark:text-[#818CF8] border border-indigo-100/30 w-fit max-w-[155px] truncate">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{facultyMembers[0].name}</span>
                          {facultyMembers.length > 1 && (
                            <span className="text-[10px] opacity-75 font-bold ml-1">+{facultyMembers.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Forum Coord. */}
                    <td className="px-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {forumMembers.length > 0 ? (
                        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/30 w-fit max-w-[155px] truncate">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                          <span className="truncate">{forumMembers[0].name}</span>
                          {forumMembers.length > 1 && (
                            <span className="text-[10px] opacity-75 font-bold ml-1">+{forumMembers.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Students Team */}
                    <td className="px-5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {studentMembers.length > 0 ? (
                        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 w-fit max-w-[165px] truncate">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{studentMembers[0].name}</span>
                          {studentMembers.length > 1 && (
                            <span className="text-[10px] opacity-75 font-bold ml-1">+{studentMembers.length - 1}</span>
                          )}
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
      )}

      {/* Pagination */}
      {projects.length > 0 && (
        <div className="pt-2">
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

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger
      />

      {/* Floating Plus Button for Project Creation (Terracotta Orange themed) */}
      {canCreateProject && (
        <button
          onClick={openCreate}
          className="fixed bottom-24 md:bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#F05A2B] to-[#C93D14] text-white flex items-center justify-center shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="Create New Project"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
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

  // Dropdown UI states
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef(null);

  // Click away to close custom dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
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
    setStatusOpen(false);
  }, [editProject, open]);

  const toggleMember = (userId, role, name, profilePicture) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.user_id === userId);
      if (exists) return prev.filter(m => m.user_id !== userId);
      return [...prev, { user_id: userId, role_in_project: role, name, profile_picture: profilePicture }];
    });
  };

  const facultyPeople = (facultyData || []).map(f => ({ user_id: f.user_id, name: f.name, profile_picture: f.profile_picture, subtitle: f.designation, role: "faculty" }));
  const forumPeople = (forumData || []).map(m => ({ user_id: m.user_id, name: m.name, profile_picture: m.profile_picture, subtitle: m.role, role: "forum_member" }));
  const studentPeople = (studentsData || []).map(s => ({ user_id: s.user_id, name: s.name, profile_picture: s.profile_picture, subtitle: s.class_name?.replace("_", " "), role: "student" }));

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

  return (
    <Modal open={open} onClose={onClose} size="xl" hideHeader={true}>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── Redesigned Custom Header ─── */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-[#F05A2B] flex items-center justify-center shrink-0">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {editProject ? "Edit Project Details" : "Create New Project"}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-555 mt-0.5">
                {editProject ? "Modify fields and update allocations below" : "Fill in the details to create a new project"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-655 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ─── Left Pane: Details ─── */}
          <div className="lg:col-span-5 space-y-5">

            {/* Project Title Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Project Title</label>
              <div className="relative flex items-center">
                <FileText className="absolute left-3.5 w-4 h-4 text-gray-400 dark:text-gray-555" />
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
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Description (Optional)</label>
              <div className="relative">
                <Edit3 className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 dark:text-gray-555" />
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
            {editProject && (
              <div className="space-y-1.5" ref={statusRef}>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Project Status</label>
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
                    <div className="absolute z-35 left-0 right-0 mt-1.5 rounded-xl border border-gray-205 dark:border-gray-755 bg-white dark:bg-gray-800 shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                      {statusOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setStatus(opt.value); setStatusOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${opt.value === status ? "bg-gray-50/50 dark:bg-gray-700/30 font-semibold" : ""}`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                          <span className="text-gray-800 dark:text-gray-200">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── Right Pane: Member Assignment ─── */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight">Assign Members</h3>
              <p className="text-xs text-gray-400 dark:text-gray-505">Add faculty, students or forum coordinators</p>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex p-1 rounded-xl bg-gray-150/60 dark:bg-gray-800/60 border border-gray-200/40 dark:border-gray-700/40 gap-1.5">
              {[
                { id: "faculty", label: "Faculty", count: facultyPeople.length, icon: GraduationCap },
                { id: "forum", label: "Forum", count: forumPeople.length, icon: MessageSquare },
                { id: "student", label: "Students", count: studentPeople.length, icon: Users },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setMemberSearch(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${isActive
                      ? "bg-white dark:bg-gray-700 text-[#F05A2B] shadow-sm"
                      : "text-gray-450 dark:text-gray-505 hover:text-gray-655"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-75 font-normal ml-0.5">({tab.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Member Search */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-gray-400 dark:text-gray-505" />
              <input
                type="text"
                placeholder={`Search ${activeTab === "faculty" ? "faculty" : activeTab === "student" ? "students" : "forum members"}...`}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-250 dark:border-gray-755 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
              />
            </div>

            {/* Selection list */}
            <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto border border-gray-100 dark:border-gray-800/60 rounded-2xl bg-white dark:bg-gray-900/10 p-2 space-y-1.5">
              {filteredPeople.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-555 font-medium">No matches found</p>
                </div>
              ) : (
                filteredPeople.map(p => {
                  const isSelected = selectedMembers.some(s => s.user_id === p.user_id);
                  return (
                    <div
                      key={p.user_id}
                      onClick={() => toggleMember(p.user_id, roleKey, p.name, p.profile_picture)}
                      className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer rounded-xl border transition-all duration-200 ${isSelected
                        ? "border-primary-500/60 bg-primary-50/20 dark:bg-primary-950/10 shadow-sm"
                        : "border-gray-100 dark:border-gray-800/40 hover:border-gray-200/60 dark:hover:border-gray-700 hover:bg-gray-50/30 dark:hover:bg-gray-800/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={p.profile_picture} name={p.name} size="sm" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-755" />
                        <div className="min-w-0 flex flex-col">
                          <p className="text-sm font-semibold text-gray-850 dark:text-gray-205 truncate">{p.name}</p>
                          {p.subtitle && <p className="text-[11px] text-gray-450 dark:text-gray-500 truncate mt-0.5">{p.subtitle}</p>}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 ${isSelected
                          ? "bg-[#F05A2B] border-[#F05A2B] text-white shadow-sm"
                          : "border-gray-250 dark:border-gray-755 text-gray-450 hover:text-gray-655 hover:border-gray-350 dark:hover:text-gray-300"
                        }`}
                      >
                        {isSelected ? <Plus className="w-3.5 h-3.5 rotate-45" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })
              )}
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
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#F05A2B] to-[#C93D14] text-white hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5"
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
