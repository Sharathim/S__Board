import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProjects, createProject, deleteProject } from "../../../api/projects";
import { listFaculty } from "../../../api/faculty";
import { listAllStudents } from "../../../api/classes";
import { listForumMembers } from "../../../api/forum";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Avatar } from "../../../components/ui/Avatar";
import {
  FolderKanban, Calendar, Plus, Search, X,
  GraduationCap, MessageSquare, Users
} from "lucide-react";
import { format } from "date-fns";
import MobileCard from "../../components/MobileCard";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileFAB from "../../components/MobileFAB";
import MobileEmptyState from "../../components/MobileEmptyState";
import BottomSheet from "../../layout/BottomSheet";

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

  // BottomSheet project creation state
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("faculty");
  const [memberSearch, setMemberSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page, search, status }],
    queryFn: () => listProjects({ page, search, status, per_page: 20 }).then(r => r.data),
  });

  // Queries for assigning members in BottomSheet
  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
    enabled: createSheetOpen,
  });

  const { data: forumData } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
    enabled: createSheetOpen,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => listAllStudents().then(r => r.data.students),
    enabled: createSheetOpen,
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setCreateSheetOpen(false);
      setName("");
      setDescription("");
      setSelectedMembers([]);
      setError("");
      setMemberSearch("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
    },
  });

  // Reset form states when BottomSheet toggles
  useEffect(() => {
    if (!createSheetOpen) {
      setName("");
      setDescription("");
      setSelectedMembers([]);
      setError("");
      setMemberSearch("");
      setActiveTab("faculty");
    }
  }, [createSheetOpen]);

  const toggleMember = (userId, role, name, profilePicture) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.user_id === userId);
      if (exists) return prev.filter(m => m.user_id !== userId);
      return [...prev, { user_id: userId, role_in_project: role, name, profile_picture: profilePicture }];
    });
  };

  const facultyPeople = (facultyData || []).map(f => ({
    user_id: f.user_id,
    name: f.name,
    profile_picture: f.profile_picture,
    subtitle: f.designation,
    role: "faculty"
  }));
  const forumPeople = (forumData || []).map(m => ({
    user_id: m.user_id,
    name: m.name,
    profile_picture: m.profile_picture,
    subtitle: m.role,
    role: "forum_member"
  }));
  const studentPeople = (studentsData || []).map(s => ({
    user_id: s.user_id,
    name: s.name,
    profile_picture: s.profile_picture,
    subtitle: s.class_name?.replace("_", " "),
    role: "student"
  }));

  let currentPeople = [];
  if (activeTab === "faculty") {
    currentPeople = facultyPeople;
  } else if (activeTab === "forum") {
    currentPeople = forumPeople;
  } else if (activeTab === "student") {
    currentPeople = studentPeople;
  }

  const filteredPeople = memberSearch
    ? currentPeople.filter(p => p.name.toLowerCase().includes(memberSearch.toLowerCase()))
    : currentPeople;

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project title is required.");
      return;
    }
    if (selectedMembers.length === 0) {
      setError("Select at least one member (Faculty, Forum, or Student).");
      return;
    }
    setError("");
    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      status: "IN_PROGRESS",
      members: selectedMembers.map(m => ({ user_id: m.user_id, role_in_project: m.role_in_project })),
    });
  };

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
                : "text-gray-550 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
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
                <p className="text-xs text-gray-550 dark:text-gray-400 line-clamp-2 mb-3">
                  {project.description || "No description provided."}
                </p>

                {/* 2-up info row */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-slate-850 border border-gray-100 dark:border-slate-800/50 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-gray-405 dark:text-gray-500 uppercase tracking-wider block">Lead Advisor</span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate block mt-0.5">{leadAdvisor}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-850 border border-gray-100 dark:border-slate-800/50 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-gray-405 dark:text-gray-500 uppercase tracking-wider block">Team Size</span>
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
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-555">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(project.updated_at), "MMM d")}
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* FAB for HOD to open bottom sheet */}
      {isHOD && <MobileFAB onClick={() => setCreateSheetOpen(true)} icon={Plus} label="Create Project" />}

      {/* Create Project BottomSheet */}
      <BottomSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pb-4">
          {error && (
            <div className="p-3 text-xs font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-150/40 dark:border-red-900/30">
              {error}
            </div>
          )}

          {/* Project Title */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Project Title</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter project title..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Description (Optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe project goals and details..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm resize-none"
            />
          </div>

          {/* Assigned Members Section */}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Assign Members</label>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Select at least one member (Faculty, Forum, or Student)</p>
            </div>

            {/* Selected Members Chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-100 dark:border-slate-800/40 max-h-24 overflow-y-auto">
                {selectedMembers.map(m => (
                  <div key={m.user_id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 border border-indigo-100/40 dark:border-indigo-900/30 text-[11px] font-bold">
                    <Avatar src={m.profile_picture} name={m.name} size="xs" className="w-4.5 h-4.5 rounded-full" />
                    <span className="truncate max-w-[80px]">{m.name}</span>
                    <button type="button" onClick={() => toggleMember(m.user_id, m.role_in_project, m.name, m.profile_picture)} className="hover:text-red-500 font-black">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-slate-850 border border-gray-200/40 dark:border-slate-800/50 gap-1 text-[11px] font-bold">
              {[
                { id: "faculty", label: "Faculty", icon: GraduationCap },
                { id: "forum", label: "Form", icon: MessageSquare },
                { id: "student", label: "Students", icon: Users },
              ].map(tab => {
                const TabIcon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setMemberSearch(""); }}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-all ${
                      active
                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search filter for members */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 text-xs"
              />
            </div>

            {/* Members list */}
            <div className="border border-gray-100 dark:border-slate-800/80 rounded-xl max-h-48 overflow-y-auto bg-white dark:bg-slate-900 divide-y divide-gray-50 dark:divide-slate-800/60">
              {filteredPeople.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-450 dark:text-gray-500 italic">No members found</div>
              ) : (
                filteredPeople.map(p => {
                  const isSelected = selectedMembers.some(sm => sm.user_id === p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => toggleMember(p.user_id, p.role, p.name, p.profile_picture)}
                      className={`w-full flex items-center gap-3 p-2.5 transition-colors text-left ${
                        isSelected
                          ? "bg-indigo-50/30 dark:bg-indigo-950/10"
                          : "hover:bg-gray-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <Avatar src={p.profile_picture} name={p.name} size="sm" className="w-7 h-7 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{p.subtitle}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-650 border-indigo-650 text-white"
                          : "border-gray-300 dark:border-slate-600"
                      }`}>
                        {isSelected && <Plus className="w-3 h-3 rotate-45" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCreateSheetOpen(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all"
            >
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </BottomSheet>

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
