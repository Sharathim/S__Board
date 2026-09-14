import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderKanban, GraduationCap, MessageSquare, Users,
  Search, Check, X, ArrowLeft, Save, Sparkles, Loader2
} from "lucide-react";
import { listFaculty } from "../../api/faculty";
import { listAllStudents } from "../../api/classes";
import { listForumMembers } from "../../api/forum";
import { createProject, updateProject, getProject } from "../../api/projects";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";

/**
 * Reusable clean card-based project creation & edit form component.
 */
export function ProjectFormCard({ projectId, onSuccess, onCancel, className = "" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(projectId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState("faculty"); // "faculty" | "forum" | "students"
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFaculty, setSelectedFaculty] = useState([]);
  const [selectedForum, setSelectedForum] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch available members
  const { data: facultyData = [], isLoading: loadingFaculty } = useQuery({
    queryKey: ["faculty-list"],
    queryFn: () => listFaculty().then((r) => r.data.faculty || []),
  });

  const { data: forumData = [], isLoading: loadingForum } = useQuery({
    queryKey: ["forum-members-list"],
    queryFn: () => listForumMembers().then((r) => r.data.members || []),
  });

  const { data: studentsData = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["all-students-list"],
    queryFn: () => listAllStudents().then((r) => r.data.students || []),
  });

  // 2. Fetch existing project details in edit mode
  const { data: existingProjectData, isLoading: loadingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId).then((r) => r.data?.project),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingProjectData && isEdit) {
      setName(existingProjectData.name || "");
      setDescription(existingProjectData.description || "");

      const projMembers = existingProjectData.members || [];
      const fAcc = [];
      const fmAcc = [];
      const sAcc = [];

      projMembers.forEach((m) => {
        const item = {
          user_id: m.id,
          name: m.name,
          profile_picture: m.profile_picture,
          subtitle: m.email || m.department || "",
        };
        if (m.role_in_project === "faculty") fAcc.push(item);
        else if (m.role_in_project === "forum_member") fmAcc.push(item);
        else if (m.role_in_project === "student") sAcc.push(item);
      });

      setSelectedFaculty(fAcc);
      setSelectedForum(fmAcc);
      setSelectedStudents(sAcc);
    }
  }, [existingProjectData, isEdit]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? updateProject(projectId, payload) : createProject(payload)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      }
      if (onSuccess) {
        onSuccess(res.data?.project);
      } else {
        navigate("/projects");
      }
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || "Failed to save project. Please try again.");
    },
  });

  // 3. Selection Handlers
  const toggleFaculty = (person) => {
    const userId = person.user_id || person.id;
    if (selectedFaculty.some((p) => (p.user_id || p.id) === userId)) {
      setSelectedFaculty((prev) => prev.filter((p) => (p.user_id || p.id) !== userId));
    } else {
      setSelectedFaculty((prev) => [
        ...prev,
        {
          user_id: userId,
          name: person.name,
          profile_picture: person.profile_picture,
          subtitle: person.designation || person.department || "Faculty",
        },
      ]);
    }
  };

  const toggleForum = (person) => {
    const userId = person.user_id || person.id;
    if (selectedForum.some((p) => (p.user_id || p.id) === userId)) {
      setSelectedForum((prev) => prev.filter((p) => (p.user_id || p.id) !== userId));
    } else {
      setSelectedForum((prev) => [
        ...prev,
        {
          user_id: userId,
          name: person.name,
          profile_picture: person.profile_picture,
          subtitle: person.role || "Forum Member",
        },
      ]);
    }
  };

  const toggleStudent = (person) => {
    const userId = person.user_id || person.id;
    if (selectedStudents.some((p) => (p.user_id || p.id) === userId)) {
      setSelectedStudents((prev) => prev.filter((p) => (p.user_id || p.id) !== userId));
    } else {
      setSelectedStudents((prev) => [
        ...prev,
        {
          user_id: userId,
          name: person.name,
          profile_picture: person.profile_picture,
          subtitle: person.register_number || person.email || "Student",
        },
      ]);
    }
  };

  // 4. Cross-exclusion lists
  const selectedForumUserIds = new Set(selectedForum.map((f) => f.user_id || f.id));
  const selectedStudentUserIds = new Set(selectedStudents.map((s) => s.user_id || s.id));

  // Available lists filtered by search and cross-exclusion
  const filteredFaculty = facultyData.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredForum = forumData.filter((fm) => {
    const uid = fm.user_id || fm.id;
    // Exclude if already selected under Students
    if (selectedStudentUserIds.has(uid)) return false;
    return (fm.name || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredStudents = studentsData.filter((s) => {
    const uid = s.user_id || s.id;
    // Exclude if already selected under Forum Member
    if (selectedForumUserIds.has(uid)) return false;
    return (s.name || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalSelectedMembersCount =
    selectedFaculty.length + selectedForum.length + selectedStudents.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Project name is required.");
      return;
    }
    if (totalSelectedMembersCount === 0) {
      setErrorMsg("Please select at least one member (Faculty, Forum Member, or Student).");
      return;
    }
    setErrorMsg("");

    const membersPayload = [
      ...selectedFaculty.map((f) => ({ user_id: f.user_id || f.id, role_in_project: "faculty" })),
      ...selectedForum.map((fm) => ({ user_id: fm.user_id || fm.id, role_in_project: "forum_member" })),
      ...selectedStudents.map((s) => ({ user_id: s.user_id || s.id, role_in_project: "student" })),
    ];

    const payload = {
      name: name.trim(),
      description: description.trim(),
      status: isEdit ? (existingProjectData?.status || "IN_PROGRESS") : "IN_PROGRESS",
      members: membersPayload,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && loadingProject) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className={`w-full max-w-3xl mx-auto bg-white border border-gray-200/80 rounded-3xl shadow-xl overflow-hidden transition-colors ${className}`}>
      {/* Form Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              {isEdit ? "Edit Project Details" : "Create New Project"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill in the project name and assign members to get started.
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errorMsg && (
          <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg("")} className="hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI-Powered Department Portal"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Description <span className="text-gray-400 text-[10px] lowercase font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the project scope, objectives, or requirements..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* 2. Selected Members Summary Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Assigned Members ({totalSelectedMembersCount})
            </label>
            <span className="text-[11px] text-gray-400">At least 1 member required</span>
          </div>

          {totalSelectedMembersCount === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-gray-200 text-center bg-gray-50/50">
              <p className="text-xs font-medium text-gray-400">
                No members assigned yet. Select members below from Faculty, Forum Member, or Students.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
              {/* Faculty Chips */}
              {selectedFaculty.map((f) => (
                <div
                  key={f.user_id || f.id}
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
                >
                  <Avatar src={f.profile_picture} name={f.name} size="xs" className="w-5 h-5 rounded-full" />
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-200/60 px-1.5 py-0.2 rounded-full">
                    Faculty
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFaculty(f)}
                    className="hover:text-rose-600 transition-colors ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Forum Member Chips */}
              {selectedForum.map((fm) => (
                <div
                  key={fm.user_id || fm.id}
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"
                >
                  <Avatar src={fm.profile_picture} name={fm.name} size="xs" className="w-5 h-5 rounded-full" />
                  <span className="truncate max-w-[120px]">{fm.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-200/60 px-1.5 py-0.2 rounded-full">
                    Forum Member
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleForum(fm)}
                    className="hover:text-rose-600 transition-colors ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Student Chips */}
              {selectedStudents.map((s) => (
                <div
                  key={s.user_id || s.id}
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold"
                >
                  <Avatar src={s.profile_picture} name={s.name} size="xs" className="w-5 h-5 rounded-full" />
                  <span className="truncate max-w-[120px]">{s.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200/60 px-1.5 py-0.2 rounded-full">
                    Students
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleStudent(s)}
                    className="hover:text-rose-600 transition-colors ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Member Selector Picker */}
        <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white">
          {/* Category Tabs */}
          <div className="flex items-center border-b border-gray-100 bg-gray-50/50 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("faculty")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "faculty"
                  ?"bg-white text-indigo-600 shadow-sm border border-gray-200/50"
                  :"text-gray-500 hover:text-gray-800"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Faculty ({selectedFaculty.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("forum")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "forum"
                  ?"bg-white text-amber-600 shadow-sm border border-gray-200/50"
                  :"text-gray-500 hover:text-gray-800"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Forum Member ({selectedForum.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "students"
                  ?"bg-white text-emerald-600 shadow-sm border border-gray-200/50"
                  :"text-gray-500 hover:text-gray-800"
              }`}
            >
              <Users className="w-4 h-4" />
              Students ({selectedStudents.length})
            </button>
          </div>

          {/* Search Member Bar */}
          <div className="p-3 border-b border-gray-100 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-6 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === "faculty" ? "Faculty" : activeTab === "forum" ? "Forum Member" : "Students"} by name...`}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
          </div>

          {/* Member List */}
          <div className="max-h-56 overflow-y-auto p-2 divide-y divide-gray-50">
            {activeTab === "faculty" && (
              loadingFaculty ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading Faculty...</div>
              ) : filteredFaculty.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No faculty found.</div>
              ) : (
                filteredFaculty.map((person) => {
                  const uid = person.user_id || person.id;
                  const isSelected = selectedFaculty.some((p) => (p.user_id || p.id) === uid);
                  return (
                    <div
                      key={uid}
                      onClick={() => toggleFaculty(person)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ?"bg-indigo-50/70 text-indigo-900 font-semibold"
                          :"hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={person.profile_picture} name={person.name} size="sm" className="w-8 h-8 rounded-full shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{person.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{person.designation || person.department || "Faculty"}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ?"bg-indigo-600 border-indigo-600 text-white":"border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )
            )}

            {activeTab === "forum" && (
              loadingForum ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading Forum Members...</div>
              ) : filteredForum.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  {selectedStudentUserIds.size > 0
                    ? "No available Forum Members (some students are already selected under Students)."
                    : "No forum members found."}
                </div>
              ) : (
                filteredForum.map((person) => {
                  const uid = person.user_id || person.id;
                  const isSelected = selectedForum.some((p) => (p.user_id || p.id) === uid);
                  return (
                    <div
                      key={uid}
                      onClick={() => toggleForum(person)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ?"bg-amber-50/70 text-amber-900 font-semibold"
                          :"hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={person.profile_picture} name={person.name} size="sm" className="w-8 h-8 rounded-full shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{person.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{person.role || "Forum Member"}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ?"bg-amber-600 border-amber-600 text-white":"border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )
            )}

            {activeTab === "students" && (
              loadingStudents ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading Students...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  {selectedForumUserIds.size > 0
                    ? "No available Students (some are already selected under Forum Member)."
                    : "No students found."}
                </div>
              ) : (
                filteredStudents.map((person) => {
                  const uid = person.user_id || person.id;
                  const isSelected = selectedStudents.some((p) => (p.user_id || p.id) === uid);
                  return (
                    <div
                      key={uid}
                      onClick={() => toggleStudent(person)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ?"bg-emerald-50/70 text-emerald-900 font-semibold"
                          :"hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={person.profile_picture} name={person.name} size="sm" className="w-8 h-8 rounded-full shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{person.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{person.register_number || person.email || "Student"}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ?"bg-emerald-600 border-emerald-600 text-white":"border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel || (() => navigate("/projects"))}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saveMutation.isPending}
            className="shadow-md shadow-primary-500/20"
          >
            {isEdit ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Main Standalone Page Controller for /projects/new or /projects/:id/workflow
 */
export default function ProjectWorkflowPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto mb-4">
        <button
          onClick={() => navigate("/projects")}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
      </div>

      <ProjectFormCard
        projectId={projectId}
        onCancel={() => navigate("/projects")}
        onSuccess={() => navigate("/projects")}
      />
    </div>
  );
}
