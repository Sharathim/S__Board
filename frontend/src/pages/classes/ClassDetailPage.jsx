import { useParams } from "react-router-dom";
import { usePageTransition } from "../../context/TransitionContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listStudents, removeStudent,
  getStudentDetails, saveStudentDetails, saveStudentDetailsAdmin,
  getStudentsData, getClassStats,
  createForm, listForms, deleteForm, submitFormResponse, getFormResponses,
  listAccomplishments, createAccomplishment, updateAccomplishment, deleteAccomplishment, getResumeData
} from "../../api/classes";
import { assignForumMember } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import api from "../../api/axios";
import { AddAccomplishmentModal } from "./components/AddAccomplishmentModal";
import { AccomplishmentCard } from "./components/AccomplishmentCard";
import { ResumeModal } from "./components/ResumeModal";
import {
  Users, UserPlus, Trash2, MessageSquarePlus, ChevronLeft,
  Search, ShieldCheck, GraduationCap, X, BookOpen, Crown,
  Mail, MoreVertical, CheckCircle2, FileText, Download,
  Eye, Plus, Archive, History, Calendar, UploadCloud,
  Settings, Save, FileSpreadsheet, FileArchive, PlusCircle,
  Lock, AlertCircle, Building, Columns, CheckCircle, Pencil,
  Award, Trophy, Printer
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";

const FORUM_CLASSES = ["UG_3A", "UG_3B"];
const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A",  gradient: "from-violet-500 to-purple-600",  bg: "bg-violet-50 dark:bg-violet-900/20",   text: "text-violet-700 dark:text-violet-300",   border: "border-violet-200 dark:border-violet-800/50"  },
  UG_1B: { label: "UG 1B", short: "1B",  gradient: "from-blue-500 to-indigo-600",    bg: "bg-blue-50 dark:bg-blue-900/20",       text: "text-blue-700 dark:text-blue-300",       border: "border-blue-200 dark:border-blue-800/50"      },
  UG_2A: { label: "UG 2A", short: "2A",  gradient: "from-pink-500 to-rose-600",      bg: "bg-pink-50 dark:bg-pink-900/20",       text: "text-pink-700 dark:text-pink-300",       border: "border-pink-200 dark:border-pink-800/50"      },
  UG_2B: { label: "UG 2B", short: "2B",  gradient: "from-amber-500 to-orange-500",   bg: "bg-amber-50 dark:bg-amber-900/20",     text: "text-amber-700 dark:text-amber-300",     border: "border-amber-200 dark:border-amber-800/50"    },
  UG_3A: { label: "UG 3A", short: "3A",  gradient: "from-emerald-500 to-teal-600",   bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/50" },
  UG_3B: { label: "UG 3B", short: "3B",  gradient: "from-cyan-500 to-sky-600",       bg: "bg-cyan-50 dark:bg-cyan-900/20",       text: "text-cyan-700 dark:text-cyan-300",       border: "border-cyan-200 dark:border-cyan-800/50"      },
  PG_1A: { label: "PG 1A", short: "PG1A",gradient: "from-fuchsia-500 to-pink-600",   bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-200 dark:border-fuchsia-800/50" },
  PG_2A: { label: "PG 2A", short: "PG2A",gradient: "from-indigo-500 to-blue-600",    bg: "bg-indigo-50 dark:bg-indigo-900/20",   text: "text-indigo-700 dark:text-indigo-300",   border: "border-indigo-200 dark:border-indigo-800/50"  },
};

const FORUM_ROLE_COLORS = {
  Member:      "bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800/50",
  Coordinator: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  Secretary:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  Treasurer:   "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50",
  Volunteer:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50",
};

const STUDENT_CORE_FIELDS = [
  { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
  { name: "blood_group", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
  { name: "nationality", label: "Nationality", type: "text" },
  { name: "religion", label: "Religion", type: "text" },
  { name: "community", label: "Community", type: "text", placeholder: "e.g. BC, MBC, SC, ST, OC" },
  { name: "caste", label: "Caste", type: "text" },
  { name: "mobile_number", label: "Student Mobile Number", type: "tel" },
  { name: "communication_address", label: "Communication Address", type: "textarea" },
  { name: "permanent_address", label: "Permanent Address", type: "textarea" },
  { name: "tenth_percentage", label: "10th Percentage (%)", type: "text" },
  { name: "twelfth_percentage", label: "12th Percentage (%)", type: "text" },
  { name: "admission_type", label: "Type of Admission", type: "select", options: ["Counselling", "Management"] },
  { name: "aadhar_number", label: "Aadhar Card Number", type: "text" },
  { name: "pan_number", label: "PAN Card Number", type: "text" },
  { name: "father_name", label: "Father's Name", type: "text" },
  { name: "father_occupation", label: "Father's Occupation", type: "text" },
  { name: "father_income", label: "Father's Annual Income", type: "text" },
  { name: "father_mobile", label: "Father's Mobile Number", type: "tel" },
  { name: "mother_name", label: "Mother's Name", type: "text" },
  { name: "mother_occupation", label: "Mother's Occupation", type: "text" },
  { name: "mother_income", label: "Mother's Annual Income", type: "text" },
  { name: "mother_mobile", label: "Mother's Mobile Number", type: "tel" }
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || "?").toUpperCase();
}

function AccomplishmentsSection({ className, user, canManage, ownStudentId, studentList }) {
  const queryClient = useQueryClient();
  const [studentFilter, setStudentFilter] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);
  const [deleteAcc, setDeleteAcc] = useState(null);
  const [resumeModal, setResumeModal] = useState({ open: false, studentId: null, studentName: "" });

  const { data: accomplishments = [], isLoading } = useQuery({
    queryKey: ["accomplishments", className, studentFilter],
    queryFn: async () => {
      const res = await listAccomplishments(className, studentFilter || null);
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: (payload) => {
      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("category", payload.category);
      formData.append("organizer", payload.organizer);
      formData.append("event_date", payload.event_date);
      formData.append("position_achieved", payload.position_achieved);
      formData.append("description", payload.description);
      if (payload.file) {
        formData.append("certificate", payload.file);
      }
      return createAccomplishment(className, formData, !!payload.file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accomplishments", className]);
      setAddModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => {
      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("category", payload.category);
      formData.append("organizer", payload.organizer);
      formData.append("event_date", payload.event_date);
      formData.append("position_achieved", payload.position_achieved);
      formData.append("description", payload.description);
      if (payload.file) {
        formData.append("certificate", payload.file);
      }
      return updateAccomplishment(id, formData, !!payload.file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accomplishments", className]);
      setEditingAcc(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAccomplishment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["accomplishments", className]);
      setDeleteAcc(null);
    }
  });

  const isStudent = user?.role === "STUDENT";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800/80 border border-gray-150 dark:border-gray-700/60 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-primary-600" />
            Extracurricular Accomplishments & Honors
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Student achievements, hackathon awards, certifications, and automated resume building.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {studentList && studentList.length > 0 && (
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Class Students</option>
              {studentList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_number})
                </option>
              ))}
            </select>
          )}

          {isStudent && ownStudentId && (
            <>
              <button
                onClick={() => setAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Accomplishment
              </button>
              <button
                onClick={() => setResumeModal({ open: true, studentId: ownStudentId, studentName: user.name })}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Build My Resume
              </button>
            </>
          )}

          {!isStudent && studentFilter && (
            <button
              onClick={() => {
                const st = studentList.find(s => String(s.id) === String(studentFilter));
                setResumeModal({ open: true, studentId: studentFilter, studentName: st?.name || "Student" });
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Build Student Resume
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Spinner />
        </div>
      ) : accomplishments.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400 italic bg-white dark:bg-gray-800/60 border border-gray-150 dark:border-gray-700/60 rounded-2xl">
          No accomplishments logged for this class yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accomplishments.map((acc) => (
            <AccomplishmentCard
              key={acc.id}
              accomplishment={acc}
              canManage={isStudent ? acc.student_id === ownStudentId : canManage}
              onEdit={(a) => setEditingAcc(a)}
              onDelete={(a) => setDeleteAcc(a)}
            />
          ))}
        </div>
      )}

      <AddAccomplishmentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isPending={createMutation.isPending}
      />

      <AddAccomplishmentModal
        open={!!editingAcc}
        onClose={() => setEditingAcc(null)}
        initialData={editingAcc}
        onSubmit={(payload) => updateMutation.mutate({ id: editingAcc.id, payload })}
        isPending={updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteAcc}
        onClose={() => setDeleteAcc(null)}
        onConfirm={() => deleteMutation.mutate(deleteAcc.id)}
        title="Delete Accomplishment"
        message={deleteAcc ? `Are you sure you want to delete "${deleteAcc.title}"?` : ""}
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        danger
      />

      <ResumeModal
        open={resumeModal.open}
        onClose={() => setResumeModal({ open: false, studentId: null, studentName: "" })}
        studentId={resumeModal.studentId}
        studentName={resumeModal.studentName}
      />
    </div>
  );
}

function StudentRow({ s, isOwn, role, canManage, isHOD, isForumClass, onForum, onRemove, onEdit, onClick }) {
  const initials = getInitials(s.name);
  const isFaculty = role === "FACULTY" && !canManage;
  const showPresentDetails = isFaculty && s.details;

  return (
    <div
      onClick={isOwn ? onClick : undefined}
      className={`group flex flex-col p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300 ${
        isOwn ? "cursor-pointer ring-2 ring-indigo-500/20 bg-indigo-50/5 dark:bg-indigo-950/5 border-indigo-200 dark:border-indigo-800" : ""
      }`}
    >
      <div className={`flex flex-col lg:grid ${
        canManage 
          ? "lg:grid-cols-[minmax(220px,2fr)_1fr_1.2fr_1fr_100px]" 
          : "lg:grid-cols-[minmax(220px,2fr)_1fr_1.2fr_1fr]"
      } gap-4 items-center`}>
        {/* Student Info */}
        <div className="flex items-center gap-3 min-w-0 w-full">
          {s.profile_picture ? (
            <img src={s.profile_picture} alt={s.name} className="w-9 h-9 rounded-xl object-cover shrink-0 ring-2 ring-indigo-500/10" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
              {isOwn && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-md uppercase">Me</span>}
            </div>
            <p className="text-xs text-gray-450 dark:text-gray-550 truncate">{s.email}</p>
          </div>
        </div>

        {/* Roll No */}
        <div className="flex items-center w-full">
          <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Roll No:</span>
          <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-700/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-gray-700">
            {s.roll_number || "—"}
          </span>
        </div>

        {/* Reg. No */}
        <div className="flex items-center w-full">
          <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Reg. No:</span>
          <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-700/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-gray-700">
            {s.register_number || "—"}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center w-full">
          <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0">Status:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Student
          </span>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex items-center justify-start lg:justify-end gap-1 w-full" onClick={e => e.stopPropagation()}>
            <a
              href={`mailto:${s.email}`}
              className="p-1.5 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
              title="Send email"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => onEdit?.(s)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30"
              title="Edit student profile"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onRemove(s)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
              title="Remove student"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {showPresentDetails && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-gray-750 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 dark:text-gray-300">
          <div><strong className="text-gray-400 block uppercase text-[9px] tracking-wide">Gender:</strong> {s.details.gender || "—"}</div>
          <div><strong className="text-gray-400 block uppercase text-[9px] tracking-wide">Blood Group:</strong> {s.details.blood_group || "—"}</div>
          <div><strong className="text-gray-400 block uppercase text-[9px] tracking-wide">Mobile:</strong> {s.details.mobile_number || "—"}</div>
          <div><strong className="text-gray-400 block uppercase text-[9px] tracking-wide">Father:</strong> {s.details.father_name || "—"}</div>
        </div>
      )}
    </div>
  );
}

export default function ClassDetailPage() {
  const { className } = useParams();
  const { user } = useAuth();
  const { navigateWithTransition } = usePageTransition();
  const isHOD = user?.role === "HOD";
  const isIncharge = user?.faculty?.class_incharge_of === className;
  const canManage = isHOD || isIncharge;
  const isForumClass = FORUM_CLASSES.includes(className);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("students");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [forumTarget, setForumTarget] = useState(null);
  const [forumRole, setForumRole] = useState("Member");
  const [searchQuery, setSearchQuery] = useState("");

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [adminDetailModal, setAdminDetailModal] = useState({ open: false, student: null });
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [viewResponses, setViewResponses] = useState({ open: false, form: null });
  const [fillFormModal, setFillFormModal] = useState({ open: false, form: null });

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", className],
    queryFn: () => listStudents(className).then((r) => r.data.students),
  });

  const { data: studentsData, refetch: refetchStudentsData } = useQuery({
    queryKey: ["students-data", className],
    queryFn: () => getStudentsData(className).then((r) => r.data),
    enabled: canManage && activeTab === "students_data",
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["class-stats", className],
    queryFn: () => getClassStats(className).then((r) => r.data),
    enabled: canManage && activeTab === "students_data",
  });

  const { data: formsData, refetch: refetchForms } = useQuery({
    queryKey: ["forms", className],
    queryFn: () => listForms(className).then((r) => r.data.forms),
    enabled: activeTab === "students_data" || (user?.role === "STUDENT" && activeTab === "forms"),
  });

  const [studentDetailsForm, setStudentDetailsForm] = useState({});
  const ownStudentId = user?.student?.id;

  const { data: ownDetails, refetch: refetchOwnDetails } = useQuery({
    queryKey: ["own-details", className, ownStudentId],
    queryFn: () => getStudentDetails(className, ownStudentId).then((r) => r.data),
    enabled: !!ownStudentId && detailModalOpen,
  });

  useEffect(() => {
    if (ownDetails) {
      setStudentDetailsForm(ownDetails.details || {});
    }
  }, [ownDetails]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students", className] });
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["forum-members"] });
    if (ownStudentId) refetchOwnDetails();
    if (canManage) {
      refetchStudentsData();
      refetchStats();
    }
    refetchForms();
  };

  const removeMutation = useMutation({
    mutationFn: (studentId) => removeStudent(className, studentId),
    onSuccess: () => { setRemoveTarget(null); invalidate(); },
  });

  const forumMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => { setForumTarget(null); setForumRole("Member"); invalidate(); },
  });

  const saveDetailsMutation = useMutation({
    mutationFn: (details) => saveStudentDetails(className, ownStudentId, details),
    onSuccess: () => { setDetailModalOpen(false); invalidate(); },
  });

  const meta = CLASS_META[className] || { label: className?.replace("_", " "), short: className, gradient: "from-primary-500 to-violet-600", bg: "", text: "", border: "" };

  const studentList = students || [];
  const forumCount = studentList.filter((s) => s.is_forum_member).length;

  const sortedStudents = useMemo(() => {
    const ownStudent = studentList.find((s) => s.user_id === user?.id);
    const others = studentList.filter((s) => s.user_id !== user?.id);
    others.sort((a, b) => (a.roll_number || "").localeCompare(b.roll_number || "", undefined, { numeric: true }));

    if (ownStudent && user?.role === "STUDENT") {
      return [ownStudent, ...others];
    }
    const allSorted = [...studentList];
    allSorted.sort((a, b) => (a.roll_number || "").localeCompare(b.roll_number || "", undefined, { numeric: true }));
    return allSorted;
  }, [studentList, user]);

  const filtered = useMemo(() => {
    if (!searchQuery) return sortedStudents;
    const q = searchQuery.toLowerCase();
    return sortedStudents.filter((s) =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.register_number?.toLowerCase().includes(q)
    );
  }, [sortedStudents, searchQuery]);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div
          onClick={() => navigateWithTransition("/classes", "Classes", BookOpen)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-505 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-4 group cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Classes
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-md ring-4 ring-white dark:ring-gray-800 shrink-0`}>
              <span className="text-lg font-extrabold text-white">{meta.short}</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{meta.label}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  {studentList.length} student{studentList.length !== 1 ? "s" : ""}
                </span>

              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-150 dark:border-gray-700/60 pb-px overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all leading-none ${
            activeTab === "students"
              ? "border-primary-600 text-primary-600 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-305"
          }`}
        >
          Students
        </button>

        <button
          onClick={() => setActiveTab("accomplishments")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all leading-none ${
            activeTab === "accomplishments"
              ? "border-primary-600 text-primary-600 font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-305"
          }`}
        >
          Accomplishments & Portfolio
        </button>

        {user?.role === "STUDENT" && (
          <button
            onClick={() => { setActiveTab("forms"); refetchForms(); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all leading-none ${
              activeTab === "forms"
                ? "border-primary-600 text-primary-600 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-305"
            }`}
          >
            Active Forms
          </button>
        )}

        {canManage && (
          <button
            onClick={() => { setActiveTab("students_data"); refetchStudentsData(); refetchStats(); refetchForms(); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all leading-none ${
              activeTab === "students_data"
                ? "border-primary-600 text-primary-600 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-305"
            }`}
          >
            Students Data
          </button>
        )}

      </div>

      {activeTab === "students" ? (
        studentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-card">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-5 shadow-md opacity-80`}>
              <Users className="w-9 h-9 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">No students yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Students will appear here after they onboard via the class invite link.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-card overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-505 font-medium shrink-0">
                {filtered.length} of {studentList.length}
              </span>
            </div>

            <div className="p-4">
              <div className={`hidden lg:grid ${
                canManage 
                  ? "grid-cols-[minmax(220px,2fr)_1fr_1.2fr_1fr_100px]" 
                  : "grid-cols-[minmax(220px,2fr)_1fr_1.2fr_1fr]"
              } gap-4 px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800/40`}>
                <span>Student Info</span>
                <span>Roll No</span>
                <span>Reg. No</span>
                <span>Status</span>
                {canManage && <span className="text-right">Actions</span>}
              </div>

              <div className="space-y-3 mt-3">
                {filtered.length > 0 ? (
                  filtered.map((s) => (
                    <StudentRow
                      key={s.id}
                      s={s}
                      isOwn={s.user_id === user?.id}
                      role={user?.role}
                      canManage={canManage}
                      isHOD={isHOD}
                      isForumClass={isForumClass}
                      onForum={(st) => { setForumTarget(st); setForumRole("Member"); }}
                      onRemove={setRemoveTarget}
                      onEdit={(st) => setAdminDetailModal({ open: true, student: st })}
                      onClick={() => setDetailModalOpen(true)}
                    />
                  ))
                ) : (
                  <div className="py-12 text-center bg-gray-50/30 dark:bg-gray-900/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700/60">
                    <Search className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-505">No students match "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : activeTab === "students_data" ? (
        <StudentsDataDashboard
          className={className}
          stats={statsData}
          students={studentsData?.students || []}
          customColumns={studentsData?.custom_columns || []}
          forms={formsData || []}
          onEditStudent={(s) => setAdminDetailModal({ open: true, student: s })}
          onExportClick={() => setExportModalOpen(true)}
          onCreateFormClick={() => setCreateFormOpen(true)}
          onViewResponsesClick={(f) => setViewResponses({ open: true, form: f })}
          refetch={invalidate}
        />
      ) : activeTab === "accomplishments" ? (
        <AccomplishmentsSection
          className={className}
          user={user}
          canManage={canManage}
          ownStudentId={ownStudentId}
          studentList={studentList}
        />
      ) : activeTab === "forms" ? (
        <ActiveFormsList
          className={className}
          forms={formsData || []}
          studentId={ownStudentId}
          user={user}
          refetch={invalidate}
        />
      ) : null}

      <StudentDetailsModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        ownDetails={ownDetails}
        formState={studentDetailsForm}
        setFormState={setStudentDetailsForm}
        onSave={() => saveDetailsMutation.mutate(studentDetailsForm)}
        isPending={saveDetailsMutation.isPending}
      />

      <AdminStudentDetailsModal
        open={adminDetailModal.open}
        onClose={() => setAdminDetailModal({ open: false, student: null })}
        student={adminDetailModal.student}
        customColumns={studentsData?.custom_columns || []}
        className={className}
        onSuccess={invalidate}
      />

      <ExportColumnsModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        className={className}
        customColumns={studentsData?.custom_columns || []}
      />

      <CreateFormModal
        open={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        className={className}
        onSuccess={invalidate}
      />

      <ViewResponsesModal
        open={viewResponses.open}
        onClose={() => setViewResponses({ open: false, form: null })}
        form={viewResponses.form}
        className={className}
      />

      <Modal open={!!forumTarget} onClose={() => setForumTarget(null)} title="Assign to Forum">
        {forumTarget && (
          <div className="space-y-5 pt-1">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-gray-700/40 rounded-2xl">
              <Avatar src={forumTarget.profile_picture} name={forumTarget.name} size="md" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{forumTarget.name}</p>
                <p className="text-xs text-gray-400">{forumTarget.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Forum Role</label>
              <div className="grid grid-cols-3 gap-2">
                {FORUM_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForumRole(r)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      forumRole === r
                        ? "bg-primary-650 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => forumMutation.mutate({ studentId: forumTarget.id, role: forumRole })}
              disabled={forumMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-650 to-violet-650 text-white text-sm font-semibold hover:from-indigo-700 hover:to-violet-755 transition-all disabled:opacity-60 shadow-sm"
            >
              {forumMutation.isPending ? "Assigning…" : `Assign as ${forumRole}`}
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeMutation.mutate(removeTarget.id)}
        title="Remove Student"
        message={removeTarget ? `Remove ${removeTarget.name} from ${meta.label}? This deletes their account permanently.` : ""}
        confirmText={removeMutation.isPending ? "Removing…" : "Remove"}
        danger
      />
    </div>
  );
}

// ─── Students Data full screen Dashboard (Class Incharge) ───────────────────

function StudentsDataDashboard({ className, stats, students, customColumns, forms, onEditStudent, onExportClick, onCreateFormClick, onViewResponsesClick, refetch }) {
  const [subTab, setSubTab] = useState("main_table");

  const handleExportExcel = async (cols) => {
    try {
      const response = await api.get(`/classes/${className}/export-students-data`, {
        params: cols ? { columns: cols } : undefined,
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_students_data_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Excel failed", err);
    }
  };

  const deleteFormMutation = useMutation({
    mutationFn: (formId) => deleteForm(className, formId),
    onSuccess: () => refetch()
  });

  return (
    <div className="space-y-6 animate-fade-in w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Total Students</p>
            <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{stats?.total_students ?? 0}</h4>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Completed Profiles</p>
            <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{stats?.complete_students ?? 0}</h4>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Incomplete Profiles</p>
            <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">{stats?.incomplete_students ?? 0}</h4>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-150 dark:border-gray-750 pb-px gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setSubTab("main_table")}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition-all ${
            subTab === "main_table" ? "border-indigo-650 text-indigo-650" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Main Table & Export
        </button>
        <button
          onClick={() => setSubTab("builder")}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition-all ${
            subTab === "builder" ? "border-indigo-650 text-indigo-650" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Form Builder
        </button>
        <button
          onClick={() => setSubTab("responses")}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition-all ${
            subTab === "responses" ? "border-indigo-650 text-indigo-650" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Form Submissions ({forms.length})
        </button>
      </div>

      {subTab === "main_table" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Students Master Registry</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExportClick()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-650 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-750 transition-all shadow-xs"
              >
                <Columns className="w-3.5 h-3.5" />
                Select & Export Excel
              </button>
              <button
                onClick={() => handleExportExcel(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Whole Table
              </button>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-750 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-gray-850">
            <div className="overflow-x-auto w-full max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-750 text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">
                    <th className="p-3 sticky left-0 bg-slate-50 dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-750">Actions</th>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Register No</th>
                    {STUDENT_CORE_FIELDS.map(f => (
                      <th key={f.name} className="p-3">{f.label}</th>
                    ))}
                    {customColumns.map(col => (
                      <th key={col.name} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={26 + customColumns.length} className="p-8 text-center text-gray-450 italic">No student profiles created yet.</td>
                    </tr>
                  ) : (
                    students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/30 dark:hover:bg-gray-750/30 transition-colors">
                        <td className="p-3 sticky left-0 bg-white dark:bg-gray-850 z-10 border-r border-gray-100 dark:border-gray-750">
                          <button
                            onClick={() => onEditStudent(s)}
                            className="text-xs font-bold text-indigo-650 hover:text-indigo-755 dark:text-indigo-400"
                          >
                            Edit
                          </button>
                        </td>
                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{s.roll_number}</td>
                        <td className="p-3 font-bold text-gray-850 dark:text-gray-200">{s.name}</td>
                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{s.register_number}</td>
                        {STUDENT_CORE_FIELDS.map(f => (
                          <td key={f.name} className="p-3 text-gray-500 dark:text-gray-450">{s.details?.[f.name] || "—"}</td>
                        ))}
                        {customColumns.map(col => (
                          <td key={col.name} className="p-3 text-indigo-600 dark:text-indigo-350">{s.extra_details?.[col.name] || "—"}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : subTab === "builder" ? (
        <div className="p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-750 space-y-4">
          <div className="flex items-center gap-3">
            <PlusCircle className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Create & Publish a Form</h3>
          </div>
          <p className="text-xs text-gray-450 max-w-xl">
            Choose to create a dynamic custom questionnaire (which can add columns to the main student details registry or be saved separately) or publish predefined template tables like Internship Reports and Exam Mark Sheets.
          </p>
          <button
            onClick={() => onCreateFormClick()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-650 to-violet-650 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            Open Form Creator Builder
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Submissions Log</h3>
          {forms.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 italic bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-750 rounded-2xl">
              No forms published for this class yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {forms.map(form => (
                <div key={form.id} className="p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-750 flex items-center justify-between shadow-xs hover:-translate-y-0.5 transition-all">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-gray-800 dark:text-gray-100">{form.title}</h5>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 uppercase font-semibold">
                      <span>Type: {form.form_type}</span>
                      <span>•</span>
                      <span>Target: {form.destination === "main_table" ? "Main Table" : "Separate Table"}</span>
                      <span>•</span>
                      <span className="text-indigo-650 dark:text-indigo-400">{form.response_count} submission{form.response_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewResponsesClick(form)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-gray-700 hover:bg-slate-50 text-[10px] font-bold text-slate-650"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Answers
                    </button>
                    <button
                      onClick={() => deleteFormMutation.mutate(form.id)}
                      className="p-1.5 rounded-xl text-gray-450 hover:text-red-500 hover:bg-red-50"
                      title="Delete Form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Student Active Forms list (Student View) ───────────────────────────────

function ActiveFormsList({ className, forms, studentId, user, refetch }) {
  const [activeFormSub, setActiveFormSub] = useState(null);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    async function loadResponses() {
      const resps = {};
      for (const form of forms) {
        try {
          const r = await getFormResponses(className, form.id);
          const studentResp = r.data.responses.find(x => x.student_id === studentId);
          if (studentResp) {
            resps[form.id] = studentResp;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setResponses(resps);
    }
    if (forms && forms.length > 0 && studentId) {
      loadResponses();
    }
  }, [forms, studentId]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-250">Academic & Administration Forms</h3>
      {forms.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400 italic bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-750 rounded-2xl">
          No active forms pending for your class at the moment.
        </div>
      ) : (
        <div className="grid gap-3">
          {forms.map(form => {
            const hasSubmitted = !!responses[form.id];
            return (
              <div key={form.id} className="p-4 bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-750 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <h5 className="text-xs font-bold text-gray-800 dark:text-gray-100">{form.title}</h5>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">Type: {form.form_type}</p>
                </div>
                <div>
                  {hasSubmitted ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveFormSub(form)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-xs transition-colors"
                    >
                      Fill Form
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeFormSub && (
        <FillFormModal
          open={!!activeFormSub}
          onClose={() => { setActiveFormSub(null); refetch(); }}
          form={activeFormSub}
          className={className}
          studentName={user?.name}
          studentRoll={user?.student?.roll_number}
          onSuccess={() => { setActiveFormSub(null); refetch(); }}
        />
      )}
    </div>
  );
}

// ─── Student Core Details Modal ──────────────────────────────────────────

function StudentDetailsModal({ open, onClose, ownDetails, formState, setFormState, onSave, isPending }) {
  const [activeSubTab, setActiveSubTab] = useState("personal");

  const personalFields = STUDENT_CORE_FIELDS.slice(0, 9);
  const academicFields = STUDENT_CORE_FIELDS.slice(9, 14);
  const parentFields = STUDENT_CORE_FIELDS.slice(14);

  const handleFieldChange = (name, value) => {
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderFieldInput = (f) => {
    const value = formState[f.name] || "";
    const isImmutable = ownDetails?.details?.[f.name] !== undefined && ownDetails.details[f.name] !== null && String(ownDetails.details[f.name]).trim() !== "";

    if (f.type === "select") {
      return (
        <select
          value={value}
          disabled={isImmutable}
          onChange={(e) => handleFieldChange(f.name, e.target.value)}
          className={`w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 ${isImmutable ? 'bg-slate-100 text-gray-400 cursor-not-allowed dark:bg-gray-900/50' : ''}`}
        >
          <option value="">Select option</option>
          {f.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (f.type === "textarea") {
      return (
        <textarea
          value={value}
          disabled={isImmutable}
          onChange={(e) => handleFieldChange(f.name, e.target.value)}
          placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
          rows={3}
          className={`w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 ${isImmutable ? 'bg-slate-100 text-gray-400 cursor-not-allowed dark:bg-gray-900/50' : ''}`}
        />
      );
    }

    return (
      <input
        type={f.type}
        value={value}
        disabled={isImmutable}
        onChange={(e) => handleFieldChange(f.name, e.target.value)}
        placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
        className={`w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 ${isImmutable ? 'bg-slate-100 text-gray-400 cursor-not-allowed dark:bg-gray-900/50' : ''}`}
      />
    );
  };

  const renderTabContent = (fields) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(f => {
          const isImmutable = ownDetails?.details?.[f.name] !== undefined && ownDetails.details[f.name] !== null && String(ownDetails.details[f.name]).trim() !== "";
          return (
            <div key={f.name} className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {f.label}
                {isImmutable && <Lock className="w-2.5 h-2.5 text-amber-500" title="Immutable once saved" />}
              </label>
              {renderFieldInput(f)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="My Registry Details" size="lg">
      <div className="space-y-6 pt-1">
        <p className="text-[11px] text-amber-600 bg-amber-500/10 p-3 rounded-xl flex items-start gap-2 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Important Notice:</strong> Once a field is saved, it becomes locked and immutable. Please verify your details before saving. You can save partially and return to fill other fields later.</span>
        </p>

        <div className="flex border-b border-gray-150 dark:border-gray-700/60 pb-px gap-2">
          <button
            onClick={() => setActiveSubTab("personal")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === "personal" ? "border-indigo-650 text-indigo-650 font-bold" : "border-transparent text-gray-400"
            }`}
          >
            Personal & Address
          </button>
          <button
            onClick={() => setActiveSubTab("parent")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === "parent" ? "border-indigo-650 text-indigo-650 font-bold" : "border-transparent text-gray-400"
            }`}
          >
            Parents Info
          </button>
          <button
            onClick={() => setActiveSubTab("academic")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === "academic" ? "border-indigo-650 text-indigo-650 font-bold" : "border-transparent text-gray-400"
            }`}
          >
            Academic & Admission
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {activeSubTab === "personal" && renderTabContent(personalFields)}
          {activeSubTab === "parent" && renderTabContent(parentFields)}
          {activeSubTab === "academic" && renderTabContent(academicFields)}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-750">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-750 text-gray-600 rounded-xl transition-all"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isPending ? "Saving..." : "Save Details"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Admin Edit Details Modal (Class Incharge) ──────────────────────────

function AdminStudentDetailsModal({ open, onClose, student, customColumns, className, onSuccess }) {
  const [activeSubTab, setActiveSubTab] = useState("personal");
  const [formState, setFormState] = useState({});
  const [extraState, setExtraState] = useState({});

  useEffect(() => {
    if (student) {
      const details = student.details || {};
      const stateObj = {};
      STUDENT_CORE_FIELDS.forEach(f => {
        stateObj[f.name] = details[f.name] || "";
      });
      setFormState(stateObj);
      setExtraState(student.extra_details || {});
    }
  }, [student]);

  const saveAdminMutation = useMutation({
    mutationFn: () => saveStudentDetailsAdmin(className, student.id, formState, extraState),
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  if (!open || !student) return null;

  const personalFields = STUDENT_CORE_FIELDS.slice(0, 9);
  const academicFields = STUDENT_CORE_FIELDS.slice(9, 14);
  const parentFields = STUDENT_CORE_FIELDS.slice(14);

  const handleFieldChange = (name, value) => {
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExtraChange = (name, value) => {
    setExtraState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderFieldInput = (f) => {
    const value = formState[f.name] || "";
    if (f.type === "select") {
      return (
        <select
          value={value}
          onChange={(e) => handleFieldChange(f.name, e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select option</option>
          {f.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    if (f.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(e) => handleFieldChange(f.name, e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      );
    }
    return (
      <input
        type={f.type}
        value={value}
        onChange={(e) => handleFieldChange(f.name, e.target.value)}
        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={`Edit Details — ${student.name}`} size="lg">
      <div className="space-y-6 pt-1">
        <div className="flex border-b border-gray-150 dark:border-gray-700/60 pb-px gap-2">
          <button
            onClick={() => setActiveSubTab("personal")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === "personal" ? "border-indigo-650 text-indigo-650 font-bold" : "border-transparent text-gray-400"
            }`}
          >
            Personal & Address
          </button>
          <button
            onClick={() => setActiveSubTab("parent")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === "parent" ? "border-indigo-650 text-indigo-650 font-bold" : "border-transparent text-gray-400"
            }`}
          >
            Parents Info
          </button>
          <button
            onClick={() => setActiveSubTab("academic")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === "academic" ? "border-indigo-650 text-indigo-650 font-bold" : "border-transparent text-gray-400"
            }`}
          >
            Academic & Admission
          </button>
          {customColumns.length > 0 && (
            <button
              onClick={() => setActiveSubTab("extra")}
              className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all ${
                activeSubTab === "extra" ? "border-indigo-650 text-indigo-650 font-bold" : "border-transparent text-gray-400"
              }`}
            >
              Custom Fields
            </button>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {activeSubTab === "personal" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personalFields.map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{f.label}</label>
                  {renderFieldInput(f)}
                </div>
              ))}
            </div>
          )}
          {activeSubTab === "parent" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {parentFields.map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{f.label}</label>
                  {renderFieldInput(f)}
                </div>
              ))}
            </div>
          )}
          {activeSubTab === "academic" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {academicFields.map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{f.label}</label>
                  {renderFieldInput(f)}
                </div>
              ))}
            </div>
          )}
          {activeSubTab === "extra" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customColumns.map(col => (
                <div key={col.name} className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{col.label}</label>
                  <input
                    type="text"
                    value={extraState[col.name] || ""}
                    onChange={(e) => handleExtraChange(col.name, e.target.value)}
                    placeholder={`Enter ${col.label.toLowerCase()}`}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-750">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-750 text-gray-650 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveAdminMutation.mutate()}
            disabled={saveAdminMutation.isPending}
            className="px-5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            {saveAdminMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Export Columns Selection Modal ──────────────────────────────────────

function ExportColumnsModal({ open, onClose, className, customColumns }) {
  const [selectedCols, setSelectedCols] = useState({});

  useEffect(() => {
    if (open) {
      const defaultSel = {
        roll_number: true,
        name: true,
        register_number: true,
      };
      STUDENT_CORE_FIELDS.forEach(f => {
        defaultSel[f.name] = true;
      });
      customColumns.forEach(c => {
        defaultSel[c.name] = true;
      });
      setSelectedCols(defaultSel);
    }
  }, [open, customColumns]);

  const handleToggle = (key) => {
    setSelectedCols(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAll = () => {
    const updated = {};
    updated.roll_number = true;
    updated.name = true;
    updated.register_number = true;
    STUDENT_CORE_FIELDS.forEach(f => { updated[f.name] = true; });
    customColumns.forEach(c => { updated[c.name] = true; });
    setSelectedCols(updated);
  };

  const handleSelectNone = () => {
    const updated = {};
    updated.roll_number = false;
    updated.name = false;
    updated.register_number = false;
    STUDENT_CORE_FIELDS.forEach(f => { updated[f.name] = false; });
    customColumns.forEach(c => { updated[c.name] = false; });
    setSelectedCols(updated);
  };

  const triggerExport = async () => {
    const activeCols = Object.keys(selectedCols).filter(k => selectedCols[k]);
    if (activeCols.length === 0) return;
    
    try {
      const response = await api.get(`/classes/${className}/export-students-data`, {
        params: { columns: activeCols.join(",") },
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_students_data_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Configure Columns Export">
      <div className="space-y-4 pt-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-55 rounded-lg"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleSelectNone}
            className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-55 rounded-lg"
          >
            Deselect All
          </button>
        </div>

        <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1 border-t border-b border-gray-100 dark:border-gray-700 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <div className="flex items-center gap-2 py-1">
            <input type="checkbox" id="col-roll" checked={!!selectedCols.roll_number} onChange={() => handleToggle("roll_number")} />
            <label htmlFor="col-roll" className="text-xs font-semibold text-gray-700 dark:text-gray-300">Roll Number</label>
          </div>
          <div className="flex items-center gap-2 py-1">
            <input type="checkbox" id="col-name" checked={!!selectedCols.name} onChange={() => handleToggle("name")} />
            <label htmlFor="col-name" className="text-xs font-semibold text-gray-700 dark:text-gray-300">Name</label>
          </div>
          <div className="flex items-center gap-2 py-1">
            <input type="checkbox" id="col-reg" checked={!!selectedCols.register_number} onChange={() => handleToggle("register_number")} />
            <label htmlFor="col-reg" className="text-xs font-semibold text-gray-700 dark:text-gray-300">Register Number</label>
          </div>

          {STUDENT_CORE_FIELDS.map(f => (
            <div key={f.name} className="flex items-center gap-2 py-1">
              <input type="checkbox" id={`col-${f.name}`} checked={!!selectedCols[f.name]} onChange={() => handleToggle(f.name)} />
              <label htmlFor={`col-${f.name}`} className="text-xs text-gray-750 dark:text-gray-400">{f.label}</label>
            </div>
          ))}

          {customColumns.map(col => (
            <div key={col.name} className="flex items-center gap-2 py-1 bg-indigo-50/20 px-2 rounded-lg">
              <input type="checkbox" id={`col-${col.name}`} checked={!!selectedCols[col.name]} onChange={() => handleToggle(col.name)} />
              <label htmlFor={`col-${col.name}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{col.label}</label>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={triggerExport}
            className="px-5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            Download Excel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Create Form Modal (Builder) ──────────────────────────────────────────

function CreateFormModal({ open, onClose, className, onSuccess }) {
  const [formType, setFormType] = useState("custom");
  const [destination, setDestination] = useState("separate_table");
  const [title, setTitle] = useState("");

  const [questions, setQuestions] = useState([{ name: "", label: "", type: "text" }]);

  const [examType, setExamType] = useState("CIA 1");
  const [semesterType, setSemesterType] = useState("odd");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [subjectsList, setSubjectsList] = useState(["English", "Mathematics"]);

  const [internshipQuestions, setInternshipQuestions] = useState([]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, { name: "", label: "", type: "text" }]);
  };

  const removeQuestion = (idx) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, val) => {
    const updated = [...questions];
    updated[idx][field] = val;
    if (field === "label") {
      updated[idx]["name"] = val.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
    }
    setQuestions(updated);
  };

  const addSubject = () => {
    setSubjectsList(prev => [...prev, ""]);
  };

  const handleSubjectChange = (idx, val) => {
    const updated = [...subjectsList];
    updated[idx] = val;
    setSubjectsList(updated);
  };

  const addInternshipQuest = () => {
    setInternshipQuestions(prev => [...prev, { name: "", label: "", type: "text" }]);
  };

  const handleInternshipQuestChange = (idx, field, val) => {
    const updated = [...internshipQuestions];
    updated[idx][field] = val;
    if (field === "label") {
      updated[idx]["name"] = val.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
    }
    setInternshipQuestions(updated);
  };

  const createFormMutation = useMutation({
    mutationFn: (payload) => createForm(className, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
      setTitle("");
      setFormType("custom");
      setDestination("separate_table");
      setQuestions([{ name: "", label: "", type: "text" }]);
      setSubjectsList(["English", "Mathematics"]);
      setInternshipQuestions([]);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    let finalTitle = title;
    let finalMetadata = {};

    if (formType === "mark_analysis") {
      finalTitle = `${examType} Mark Sheet`;
      const validSubjs = subjectsList.filter(s => s.trim() !== "");
      if (validSubjs.length === 0) {
        alert("Please add at least one subject.");
        return;
      }
      finalMetadata = {
        exam_type: examType,
        semester_type: semesterType,
        academic_year: academicYear,
        fields: validSubjs.map(s => ({
          name: s.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_"),
          label: `${s}'s Mark`,
          type: "number"
        }))
      };
    } else if (formType === "internship") {
      finalTitle = title.trim() || "Internship Form";
      finalMetadata = {
        fields: internshipQuestions.filter(q => q.label.trim() !== "")
      };
    } else {
      const validQuestions = questions.filter(q => q.label.trim() !== "");
      if (validQuestions.length === 0) {
        alert("Please add at least one question.");
        return;
      }
      finalMetadata = {
        fields: validQuestions
      };
    }

    createFormMutation.mutate({
      title: finalTitle,
      form_type: formType,
      destination: formType === "custom" ? destination : "separate_table",
      metadata: finalMetadata
    });
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Publish a Form / Table" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wide">Form / Table Template</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "custom", label: "Custom Form Builder" },
              { id: "mark_analysis", label: "CIA/Semester Mark Sheet" },
              { id: "internship", label: "Internship Form" }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFormType(t.id)}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                  formType === t.id
                    ? "bg-indigo-650 text-white border-indigo-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-250 text-gray-600 hover:border-indigo-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {formType === "custom" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wide">Form Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Student Extracurriculars"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wide">Data Target Destination</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "separate_table", label: "Maintain in Separate Table" },
                  { id: "main_table", label: "Add to Main Table (Create Columns)" }
                ].map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDestination(d.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      destination === d.id
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                        : "bg-gray-55 border-gray-200 text-gray-500 hover:border-indigo-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wide">Dynamic Questions</label>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                {questions.map((q, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Question Label (e.g. Club Name)"
                      value={q.label}
                      onChange={(e) => handleQuestionChange(idx, "label", e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-gray-50"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => handleQuestionChange(idx, "type", e.target.value)}
                      className="w-28 px-2 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-805"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="tel">Phone</option>
                    </select>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(idx)} className="text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
              >
                + Add Another Question
              </button>
            </div>
          </div>
        )}

        {formType === "mark_analysis" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wide">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-250 bg-gray-55"
                >
                  <option value="CIA 1">CIA 1</option>
                  <option value="CIA 2">CIA 2</option>
                  <option value="Semester">Semester Examination</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wide">Semester</label>
                <select
                  value={semesterType}
                  onChange={(e) => setSemesterType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-250 bg-gray-55"
                >
                  <option value="odd">Odd Semester</option>
                  <option value="even">Even Semester</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wide">Academic Year</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2024-2025"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-250 bg-gray-55"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wide">Subjects</label>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                {subjectsList.map((subj, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Python Programming"
                      value={subj}
                      onChange={(e) => handleSubjectChange(idx, e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800"
                    />
                    {subjectsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubjectsList(subjectsList.filter((_, i) => i !== idx))}
                        className="text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSubject}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-650 hover:underline"
              >
                + Add Subject
              </button>
            </div>
          </div>
        )}

        {formType === "internship" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wide">Form Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Internship Form"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-250 bg-gray-55"
              />
            </div>
            
            <div className="p-3.5 bg-slate-50 dark:bg-gray-700/35 rounded-xl border border-slate-100 dark:border-gray-700 text-[11px] text-gray-500 space-y-1">
              <strong className="block text-gray-700 dark:text-gray-300">Prefilled Fields (Ready-to-Go):</strong>
              <p>Company Name, Start Date, End Date, Duration, Project Name, Website Link, Address, Certificate Upload (PDF only)</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-455 uppercase tracking-wide">Additional Questions (Optional)</label>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                {internshipQuestions.map((q, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stipend Amount"
                      value={q.label}
                      onChange={(e) => handleInternshipQuestChange(idx, "label", e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => handleInternshipQuestChange(idx, "type", e.target.value)}
                      className="w-28 px-2 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-805"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setInternshipQuestions(internshipQuestions.filter((_, i) => i !== idx))}
                      className="text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addInternshipQuest}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-655 hover:underline"
              >
                + Add Custom Question
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-250 hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createFormMutation.isPending}
            className="px-5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            {createFormMutation.isPending ? "Publishing..." : "Publish Form"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── View Form Submissions Modal ──────────────────────────────────────────

function ViewResponsesModal({ open, onClose, form, className }) {
  const { data: responsesData } = useQuery({
    queryKey: ["responses", className, form?.id],
    queryFn: () => getFormResponses(className, form?.id).then((r) => r.data.responses),
    enabled: open && !!form?.id
  });

  const handleExportForm = async () => {
    try {
      const response = await api.get(`/classes/${className}/forms/${form.id}/export`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_${form.title.replace(/\s+/g, '_')}_responses.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleZipDownload = async () => {
    try {
      const response = await api.get(`/classes/${className}/forms/${form.id}/download-certificates`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_${form.title.replace(/\s+/g, '_')}_certificates.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  if (!open || !form) return null;

  const responses = responsesData || [];
  const fields = form.metadata?.fields || [];

  return (
    <Modal open={open} onClose={onClose} title={`Submissions — ${form.title}`} size="full">
      <div className="space-y-4 pt-1 w-full text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">Showing submissions from students for {form.title}.</p>
          <div className="flex gap-2">
            {form.form_type === "internship" && (
              <button
                onClick={handleZipDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-750 bg-indigo-500/5 hover:bg-indigo-500/10 text-[10px] font-bold shadow-xs transition-all"
              >
                <FileArchive className="w-3.5 h-3.5" />
                Download Certificates ZIP
              </button>
            )}
            <button
              onClick={handleExportForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Table to Excel
            </button>
          </div>
        </div>

        <div className="border border-gray-100 rounded-2xl bg-white max-h-[70vh] overflow-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-3">Roll No</th>
                <th className="p-3">Name</th>
                
                {form.form_type === "mark_analysis" && (
                  <>
                    <th className="p-3">Academic Year</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3">Exam</th>
                    {fields.map(f => (
                      <th key={f.name} className="p-3">{f.label}</th>
                    ))}
                  </>
                )}

                {form.form_type === "internship" && (
                  <>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Project Name</th>
                    <th className="p-3">Website Link</th>
                    <th className="p-3">Address</th>
                    <th className="p-3">Certificate</th>
                    {fields.map(f => (
                      <th key={f.name} className="p-3 text-indigo-600">{f.label}</th>
                    ))}
                  </>
                )}

                {form.form_type === "custom" && (
                  fields.map(f => (
                    <th key={f.name} className="p-3">{f.label}</th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {responses.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-gray-450 italic">No responses submitted yet.</td>
                </tr>
              ) : (
                responses.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-gray-700">{r.roll_number}</td>
                    <td className="p-3 font-bold text-gray-800">{r.student_name}</td>

                    {form.form_type === "mark_analysis" && (
                      <>
                        <td className="p-3 text-gray-500">{form.metadata?.academic_year}</td>
                        <td className="p-3 text-gray-500 uppercase">{form.metadata?.semester_type}</td>
                        <td className="p-3 text-gray-500">{form.metadata?.exam_type}</td>
                        {fields.map(f => (
                          <td key={f.name} className="p-3 text-gray-700 font-bold">{r.answers?.[f.name] || "—"}</td>
                        ))}
                      </>
                    )}

                    {form.form_type === "internship" && (
                      <>
                        <td className="p-3 text-gray-700">{r.answers?.company_name || "—"}</td>
                        <td className="p-3 text-gray-500">{r.answers?.start_date || "—"}</td>
                        <td className="p-3 text-gray-500">{r.answers?.end_date || "—"}</td>
                        <td className="p-3 text-gray-700">{r.answers?.duration || "—"}</td>
                        <td className="p-3 text-gray-750 font-bold">{r.answers?.project_name || "—"}</td>
                        <td className="p-3">
                          {r.answers?.company_website ? (
                            <a href={r.answers.company_website} target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline">Link</a>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-gray-500 max-w-xs truncate">{r.answers?.company_address || "—"}</td>
                        <td className="p-3 font-semibold">
                          {r.attachment_url ? (
                            <a href={r.attachment_url} target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline inline-flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> PDF
                            </a>
                          ) : "None"}
                        </td>
                        {fields.map(f => (
                          <td key={f.name} className="p-3 text-indigo-650 font-semibold">{r.answers?.[f.name] || "—"}</td>
                        ))}
                      </>
                    )}

                    {form.form_type === "custom" && (
                      fields.map(f => (
                        <td key={f.name} className="p-3 text-gray-750 font-semibold">{r.answers?.[f.name] || "—"}</td>
                      ))
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-200 hover:bg-slate-50 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Student Fill Form Modal ──────────────────────────────────────────────

function FillFormModal({ open, onClose, form, className, studentName, studentRoll, onSuccess }) {
  const [answers, setAnswers] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, setIsPending] = useState(false);

  const fields = form?.metadata?.fields || [];

  const handleFieldChange = (name, val) => {
    setAnswers(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== "application/pdf") {
      setErrorMsg("Only PDF certificates are allowed.");
      setSelectedFile(null);
    } else {
      setErrorMsg("");
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsPending(true);

    try {
      if (form.form_type === "internship") {
        if (!selectedFile) {
          setErrorMsg("Please upload your internship certificate PDF.");
          setIsPending(false);
          return;
        }

        const formData = new FormData();
        formData.append("answers", JSON.stringify(answers));
        formData.append("certificate", selectedFile);
        
        await submitFormResponse(className, form.id, formData, true);
      } else {
        await submitFormResponse(className, form.id, { answers });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || "Failed to submit answers");
    } finally {
      setIsPending(false);
    }
  };

  if (!open || !form) return null;

  return (
    <Modal open={open} onClose={onClose} title={form.title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-100 dark:border-gray-700/60 text-gray-500 font-semibold">
          <div><strong className="block text-gray-400">Name:</strong> {studentName}</div>
          <div><strong className="block text-gray-400">Roll Number:</strong> {studentRoll}</div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
          {form.form_type === "internship" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google"
                  value={answers.company_name || ""}
                  onChange={(e) => handleFieldChange("company_name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={answers.start_date || ""}
                    onChange={(e) => handleFieldChange("start_date", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">End Date *</label>
                  <input
                    type="date"
                    required
                    value={answers.end_date || ""}
                    onChange={(e) => handleFieldChange("end_date", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Duration *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4 weeks"
                  value={answers.duration || ""}
                  onChange={(e) => handleFieldChange("duration", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Internship project focus"
                  value={answers.project_name || ""}
                  onChange={(e) => handleFieldChange("project_name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Company Website Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://company.com"
                  value={answers.company_website || ""}
                  onChange={(e) => handleFieldChange("company_website", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Company Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Complete physical office address"
                  value={answers.company_address || ""}
                  onChange={(e) => handleFieldChange("company_address", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Internship Certificate PDF *</label>
                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 rounded-xl bg-gray-55 hover:bg-slate-50 cursor-pointer relative">
                  <input
                    type="file"
                    required
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 text-indigo-650 mb-2" />
                  <p className="font-bold text-gray-700">Click to upload certificate PDF</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Maximum size 10MB</p>
                </div>
                {selectedFile && (
                  <div className="mt-1 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Selected File: {selectedFile.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {fields.map(f => (
            <div key={f.name} className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{f.label} *</label>
              <input
                type={f.type}
                required
                value={answers[f.name] || ""}
                onChange={(e) => handleFieldChange(f.name, e.target.value)}
                placeholder={`Enter answer`}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-55"
              />
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-500 rounded-xl font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-200 hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            {isPending ? "Submitting..." : "Submit Form"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
