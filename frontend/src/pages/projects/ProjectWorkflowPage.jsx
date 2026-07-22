import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Save, Check, GraduationCap, MessageSquare, Users,
  Search, AlertCircle, Loader2, Sparkles
} from "lucide-react";
import { listFaculty } from "../../api/faculty";
import { listAllStudents } from "../../api/classes";
import { listForumMembers } from "../../api/forum";
import { createProject, updateProject, getProject } from "../../api/projects";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";

const STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "In Progress", color: "#F05A2B" },
  { value: "NOT_STARTED", label: "Not Started", color: "#9CA3AF" },
  { value: "REVIEW", label: "Review", color: "#A855F7" },
  { value: "COMPLETED", label: "Completed", color: "#10B981" },
  { value: "ON_HOLD", label: "On Hold", color: "#F59E0B" },
  { value: "CANCELLED", label: "Cancelled", color: "#EF4444" },
];

export default function ProjectWorkflowPage() {
  const { id: editProjectId } = useParams();
  const isEdit = Boolean(editProjectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form State
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("IN_PROGRESS");

  // Selected Member Objects / IDs
  const [selectedFaculty, setSelectedFaculty] = useState([]);
  const [selectedForum, setSelectedForum] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Member Search Filters
  const [searchFaculty, setSearchFaculty] = useState("");
  const [searchForum, setSearchForum] = useState("");
  const [searchStudents, setSearchStudents] = useState("");

  const [validationError, setValidationError] = useState("");

  // ─── Fetch Master Lists ───────────────────────────────────────────────────
  const { data: facultyData } = useQuery({
    queryKey: ["faculty-list"],
    queryFn: async () => {
      const res = await listFaculty();
      return res.data?.faculty || res.data || [];
    },
  });

  const { data: forumData } = useQuery({
    queryKey: ["forum-members-list"],
    queryFn: async () => {
      const res = await listForumMembers();
      return res.data?.members || res.data || [];
    },
  });

  const { data: studentsData } = useQuery({
    queryKey: ["all-students-list"],
    queryFn: async () => {
      const res = await listAllStudents();
      return res.data?.students || res.data || [];
    },
  });

  // ─── Fetch Existing Project Data if Editing ────────────────────────────────
  const { data: existingProject } = useQuery({
    queryKey: ["project", editProjectId],
    queryFn: async () => {
      const res = await getProject(editProjectId);
      return res.data?.project || res.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingProject) {
      setProjectName(existingProject.name || "");
      setDescription(existingProject.description || "");
      setStatus(existingProject.status || "IN_PROGRESS");

      if (existingProject.members) {
        const fac = [];
        const forum = [];
        const stud = [];

        existingProject.members.forEach((m) => {
          const userObj = {
            id: m.id,
            user_id: m.id,
            name: m.name,
            profile_picture: m.profile_picture,
            role: m.role,
          };
          const roleInProj = m.role_in_project || "";
          if (roleInProj === "Faculty" || m.role === "FACULTY") {
            fac.push(userObj);
          } else if (roleInProj === "Forum Member") {
            forum.push(userObj);
          } else {
            stud.push(userObj);
          }
        });

        setSelectedFaculty(fac);
        setSelectedForum(forum);
        setSelectedStudents(stud);
      }
    }
  }, [existingProject]);

  // ─── Mutation ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return updateProject(editProjectId, payload);
      } else {
        return createProject(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["project", editProjectId] });
      navigate("/projects");
    },
    onError: (err) => {
      const msg = err.response?.data?.error || "Failed to save project. Please check required fields.";
      setValidationError(msg);
    },
  });

  const handleSave = () => {
    setValidationError("");

    if (!projectName.trim()) {
      setValidationError("Project Name is required.");
      return;
    }

    const totalMembers = selectedFaculty.length + selectedForum.length + selectedStudents.length;
    if (totalMembers === 0) {
      setValidationError("At least one member must be selected across Faculty, Forum Member, or Students.");
      return;
    }

    // Build normalized members array for backend
    const members = [
      ...selectedFaculty.map((f) => ({
        user_id: f.user_id || f.id,
        role_in_project: "Faculty",
      })),
      ...selectedForum.map((fm) => ({
        user_id: fm.user_id || fm.id,
        role_in_project: "Forum Member",
      })),
      ...selectedStudents.map((s) => ({
        user_id: s.user_id || s.id,
        role_in_project: "Students",
      })),
    ];

    saveMutation.mutate({
      name: projectName.trim(),
      description: description.trim(),
      status: status,
      members: members,
    });
  };

  // Toggle selection helpers
  const toggleMember = (list, setList, item) => {
    const itemId = item.user_id || item.id;
    const exists = list.some((m) => (m.user_id || m.id) === itemId);
    if (exists) {
      setList(list.filter((m) => (m.user_id || m.id) !== itemId));
    } else {
      setList([
        ...list,
        {
          id: itemId,
          user_id: itemId,
          name: item.name || item.user?.name || "Unknown",
          profile_picture: item.profile_picture || item.user?.profile_picture,
        },
      ]);
    }
  };

  const isSelected = (list, item) => {
    const itemId = item.user_id || item.id;
    return list.some((m) => (m.user_id || m.id) === itemId);
  };

  // Normalize list filtering
  const facultyList = (facultyData || []).filter((f) => {
    const name = f.name || f.user?.name || "";
    return name.toLowerCase().includes(searchFaculty.toLowerCase());
  });

  const forumList = (forumData || []).filter((fm) => {
    const name = fm.name || fm.user?.name || fm.student?.user?.name || "";
    return name.toLowerCase().includes(searchForum.toLowerCase());
  });

  const studentsList = (studentsData || []).filter((s) => {
    const name = s.name || s.user?.name || "";
    const regNo = s.register_number || s.reg_no || "";
    const query = searchStudents.toLowerCase();
    return name.toLowerCase().includes(query) || regNo.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F3F3F5] dark:bg-[#000000] text-gray-900 dark:text-white flex flex-col">
      {/* ── Top Bar Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/projects")}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
              {isEdit ? "Edit Project" : "Create New Project"}
            </h1>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          loading={saveMutation.isPending}
          className="gap-2 text-xs sm:text-sm font-bold shadow-md shadow-primary-500/25"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEdit ? "Update Project" : "Create Project"}
        </Button>
      </header>

      {/* ── Main Form Container ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Error Banner */}
        {validationError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* ── Section 1: Basic Information ──────────────────────────────────── */}
        <section className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-finexy space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Project Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Project Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Project Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Smart Department Management System"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-sm font-medium transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Provide a brief overview of the project objectives, scope, and deliverables..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-sm transition-all"
              />
            </div>
          </div>
        </section>

        {/* ── Section 2: Team Members ────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                Project Members
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select any member from Faculty, Forum Member, or Students to form the project team.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/50">
              {selectedFaculty.length + selectedForum.length + selectedStudents.length} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. FACULTY */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col shadow-finexy">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Faculty</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  {selectedFaculty.length}
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchFaculty}
                  onChange={(e) => setSearchFaculty(e.target.value)}
                  placeholder="Search faculty..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex-1 max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {facultyList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No faculty members found</p>
                ) : (
                  facultyList.map((f) => {
                    const active = isSelected(selectedFaculty, f);
                    const name = f.name || f.user?.name || "Faculty Member";
                    const pic = f.profile_picture || f.user?.profile_picture;
                    return (
                      <div
                        key={f.user_id || f.id}
                        onClick={() => toggleMember(selectedFaculty, setSelectedFaculty, f)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800"
                            : "bg-white dark:bg-slate-950/40 border-gray-100 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar src={pic} name={name} size="xs" />
                          <span className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">
                            {name}
                          </span>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. FORUM MEMBER */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col shadow-finexy">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Forum Member</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  {selectedForum.length}
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchForum}
                  onChange={(e) => setSearchForum(e.target.value)}
                  placeholder="Search forum member..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex-1 max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {forumList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No forum members found</p>
                ) : (
                  forumList.map((fm) => {
                    const active = isSelected(selectedForum, fm);
                    const name = fm.name || fm.user?.name || fm.student?.user?.name || "Forum Member";
                    const pic = fm.profile_picture || fm.user?.profile_picture || fm.student?.user?.profile_picture;
                    return (
                      <div
                        key={fm.user_id || fm.id}
                        onClick={() => toggleMember(selectedForum, setSelectedForum, fm)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                            : "bg-white dark:bg-slate-950/40 border-gray-100 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar src={pic} name={name} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">
                              {name}
                            </p>
                            {fm.role && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">
                                {fm.role}
                              </p>
                            )}
                          </div>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. STUDENTS */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col shadow-finexy">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Students</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  {selectedStudents.length}
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchStudents}
                  onChange={(e) => setSearchStudents(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex-1 max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {studentsList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No students found</p>
                ) : (
                  studentsList.map((s) => {
                    const active = isSelected(selectedStudents, s);
                    const name = s.name || s.user?.name || "Student";
                    const pic = s.profile_picture || s.user?.profile_picture;
                    const regNo = s.register_number || s.reg_no || s.class_name;
                    return (
                      <div
                        key={s.user_id || s.id}
                        onClick={() => toggleMember(selectedStudents, setSelectedStudents, s)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                            : "bg-white dark:bg-slate-950/40 border-gray-100 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar src={pic} name={name} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">
                              {name}
                            </p>
                            {regNo && (
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                {regNo}
                              </p>
                            )}
                          </div>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
