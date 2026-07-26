import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listStudents, removeStudent,
  getStudentDetails, saveStudentDetails, saveStudentDetailsAdmin,
  getStudentsData, getClassStats,
  createForm, listForms, deleteForm, submitFormResponse, getFormResponses
} from "../../../api/classes";
import { assignForumMember } from "../../../api/forum";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import api from "../../../api/axios";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";
import MobileSectionHeader from "../../components/MobileSectionHeader";
import BottomSheet from "../../layout/BottomSheet";
import {
  Users, Trash2, Search, GraduationCap, ChevronLeft,
  BookOpen, Mail, ArrowLeft, Crown, ShieldCheck,
  MoreVertical, MessageSquarePlus, FileText,
  Download, Plus, Save, CheckCircle2,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";

const FORUM_CLASSES = ["UG_3A", "UG_3B"];
const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A", year: 1, level: "UG", gradient: "from-violet-500 to-purple-600" },
  UG_1B: { label: "UG 1B", short: "1B", year: 1, level: "UG", gradient: "from-blue-500 to-indigo-600" },
  UG_2A: { label: "UG 2A", short: "2A", year: 2, level: "UG", gradient: "from-pink-500 to-rose-600" },
  UG_2B: { label: "UG 2B", short: "2B", year: 2, level: "UG", gradient: "from-amber-500 to-orange-500" },
  UG_3A: { label: "UG 3A", short: "3A", year: 3, level: "UG", gradient: "from-emerald-500 to-teal-600" },
  UG_3B: { label: "UG 3B", short: "3B", year: 3, level: "UG", gradient: "from-cyan-500 to-sky-600" },
  PG_1A: { label: "PG 1A", short: "PG1A", year: 1, level: "PG", gradient: "from-fuchsia-500 to-pink-600" },
  PG_2A: { label: "PG 2A", short: "PG2A", year: 2, level: "PG", gradient: "from-indigo-500 to-blue-600" },
};

const STUDENT_CORE_FIELDS = [
  { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
  { name: "blood_group", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
  { name: "nationality", label: "Nationality", type: "text" },
  { name: "religion", label: "Religion", type: "text" },
  { name: "community", label: "Community", type: "text" },
  { name: "caste", label: "Caste", type: "text" },
  { name: "mobile_number", label: "Mobile Number", type: "tel" },
  { name: "communication_address", label: "Communication Address", type: "textarea" },
  { name: "permanent_address", label: "Permanent Address", type: "textarea" },
  { name: "tenth_percentage", label: "10th %", type: "text" },
  { name: "twelfth_percentage", label: "12th %", type: "text" },
  { name: "admission_type", label: "Admission Type", type: "select", options: ["Counselling", "Management"] },
  { name: "aadhar_number", label: "Aadhar Number", type: "text" },
  { name: "pan_number", label: "PAN Number", type: "text" },
  { name: "father_name", label: "Father's Name", type: "text" },
  { name: "father_occupation", label: "Father's Occupation", type: "text" },
  { name: "father_income", label: "Father's Income", type: "text" },
  { name: "father_mobile", label: "Father's Mobile", type: "tel" },
  { name: "mother_name", label: "Mother's Name", type: "text" },
  { name: "mother_occupation", label: "Mother's Occupation", type: "text" },
  { name: "mother_income", label: "Mother's Income", type: "text" },
  { name: "mother_mobile", label: "Mother's Mobile", type: "tel" },
];

export default function MobileClassDetailPage() {
  const { className } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHOD = user?.role === "HOD";
  const isIncharge = user?.faculty?.class_incharge_of === className;
  const canManage = isHOD || isIncharge;
  const isForumClass = FORUM_CLASSES.includes(className);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [forumSheet, setForumSheet] = useState(null);
  const [forumRole, setForumRole] = useState("Member");
  const [studentActionSheet, setStudentActionSheet] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [adminDetailSheet, setAdminDetailSheet] = useState(null);

  const meta = CLASS_META[className] || { label: className?.replace("_", " "), short: className, gradient: "from-primary-500 to-violet-600", year: 1, level: "UG" };

  // ─── Data ───────────────────────────────────────────
  const { data: students, isLoading } = useQuery({
    queryKey: ["students", className],
    queryFn: () => listStudents(className).then(r => r.data.students),
  });

  const { data: studentsData, refetch: refetchStudentsData } = useQuery({
    queryKey: ["students-data", className],
    queryFn: () => getStudentsData(className).then(r => r.data),
    enabled: canManage && activeTab === "students_data",
  });

  const { data: statsData } = useQuery({
    queryKey: ["class-stats", className],
    queryFn: () => getClassStats(className).then(r => r.data),
    enabled: canManage && activeTab === "students_data",
  });

  const { data: formsData, refetch: refetchForms } = useQuery({
    queryKey: ["forms", className],
    queryFn: () => listForms(className).then(r => r.data.forms),
    enabled: activeTab === "students_data" || (user?.role === "STUDENT" && activeTab === "forms"),
  });

  const ownStudentId = user?.student?.id;
  const [studentDetailsForm, setStudentDetailsForm] = useState({});

  const { data: ownDetails, refetch: refetchOwnDetails } = useQuery({
    queryKey: ["own-details", className, ownStudentId],
    queryFn: () => getStudentDetails(className, ownStudentId).then(r => r.data),
    enabled: !!ownStudentId && detailSheetOpen,
  });

  useEffect(() => {
    if (ownDetails) setStudentDetailsForm(ownDetails.details || {});
  }, [ownDetails]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students", className] });
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["forum-members"] });
    if (ownStudentId) refetchOwnDetails();
    if (canManage) refetchStudentsData();
    refetchForms();
  };

  // ─── Mutations ──────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (studentId) => removeStudent(className, studentId),
    onSuccess: () => { setRemoveTarget(null); invalidate(); },
  });

  const forumMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => { setForumSheet(null); setForumRole("Member"); invalidate(); },
  });

  const saveDetailsMutation = useMutation({
    mutationFn: (details) => saveStudentDetails(className, ownStudentId, details),
    onSuccess: () => { setDetailSheetOpen(false); invalidate(); },
  });

  const saveAdminDetailsMutation = useMutation({
    mutationFn: ({ studentId, details }) => saveStudentDetailsAdmin(className, studentId, details),
    onSuccess: () => { setAdminDetailSheet(null); invalidate(); },
  });

  // ─── Student List ───────────────────────────────────
  const studentList = students || [];

  const sortedStudents = useMemo(() => {
    const ownStudent = studentList.find(s => s.user_id === user?.id);
    const others = studentList.filter(s => s.user_id !== user?.id);
    others.sort((a, b) => (a.roll_number || "").localeCompare(b.roll_number || "", undefined, { numeric: true }));
    if (ownStudent && user?.role === "STUDENT") return [ownStudent, ...others];
    const all = [...studentList];
    all.sort((a, b) => (a.roll_number || "").localeCompare(b.roll_number || "", undefined, { numeric: true }));
    return all;
  }, [studentList, user]);

  const filtered = useMemo(() => {
    if (!searchQuery) return sortedStudents;
    const q = searchQuery.toLowerCase();
    return sortedStudents.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.register_number?.toLowerCase().includes(q)
    );
  }, [sortedStudents, searchQuery]);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner /></div>;

  const TABS = [
    { key: "students", label: "Students" },
    ...(user?.role === "STUDENT" ? [{ key: "forms", label: "Forms" }] : []),
    ...(canManage ? [{ key: "students_data", label: "Data" }] : []),
  ];

  return (
    <div className="mobile-fade-in pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/classes")} className="mobile-tappable p-2 -ml-2 rounded-xl">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md`}>
          {meta.short}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-gray-900 dark:text-white leading-tight">{meta.label}</h1>
          <p className="text-[11px] text-gray-400">{studentList.length} students · Year {meta.year}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mobile-hide-scrollbar pb-1 -mx-1 px-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "students_data") refetchStudentsData();
              if (tab.key === "forms") refetchForms();
            }}
            className={`mobile-tappable whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.key
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── STUDENTS TAB ─── */}
      {activeTab === "students" && (
        <div className="space-y-3">
          <MobileSearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search students..." />

          {filtered.length === 0 ? (
            <MobileEmptyState
              icon={Users}
              title={searchQuery ? "No results" : "No students yet"}
              description={searchQuery ? `No students match "${searchQuery}"` : "Students will appear after they onboard."}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map(s => {
                const isOwn = s.user_id === user?.id;
                return (
                  <MobileCard
                    key={s.id}
                    onClick={isOwn && user?.role === "STUDENT" ? () => setDetailSheetOpen(true) : undefined}
                    className={isOwn ? "!border-primary-300 dark:!border-primary-700/50 !bg-primary-50/30 dark:!bg-primary-950/10" : ""}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                        {s.profile_picture ? (
                          <img src={s.profile_picture} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                            {(s.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                          {isOwn && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-md uppercase">Me</span>
                          )}
                          {s.is_forum_member && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md uppercase">Forum</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                      </div>

                      {/* Roll & Reg */}
                      <div className="text-right shrink-0">
                        {s.roll_number && (
                          <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded block">{s.roll_number}</span>
                        )}
                      </div>

                      {canManage && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setStudentActionSheet(s); }}
                          className="mobile-tappable p-1.5 rounded-xl text-gray-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </MobileCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── FORMS TAB (Student) ─── */}
      {activeTab === "forms" && (
        <ActiveFormsTab className={className} forms={formsData || []} studentId={ownStudentId} user={user} refetch={invalidate} />
      )}

      {/* ─── STUDENTS DATA TAB (Admin) ─── */}
      {activeTab === "students_data" && (
        <StudentsDataTab
          className={className}
          stats={statsData}
          students={studentsData?.students || []}
          forms={formsData || []}
          onEditStudent={(s) => setAdminDetailSheet(s)}
          refetch={invalidate}
        />
      )}

      {/* ─── Student Action Sheet ─── */}
      <BottomSheet open={!!studentActionSheet} onClose={() => setStudentActionSheet(null)} title={studentActionSheet?.name}>
        {studentActionSheet && (
          <div className="space-y-1">
            <a
              href={`mailto:${studentActionSheet.email}`}
              className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500"><Mail className="w-4 h-4" /></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Send Email</span>
            </a>

            {canManage && (
              <button
                onClick={() => { const s = studentActionSheet; setStudentActionSheet(null); setTimeout(() => setAdminDetailSheet(s), 300); }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500"><FileText className="w-4 h-4" /></div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Edit Details</span>
              </button>
            )}

            {isForumClass && canManage && !studentActionSheet.is_forum_member && (
              <button
                onClick={() => { const s = studentActionSheet; setStudentActionSheet(null); setTimeout(() => setForumSheet(s), 300); }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500"><MessageSquarePlus className="w-4 h-4" /></div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Add to Forum</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={() => { const s = studentActionSheet; setStudentActionSheet(null); setTimeout(() => setRemoveTarget(s), 300); }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500"><Trash2 className="w-4 h-4" /></div>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">Remove Student</span>
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ─── Forum Assign Sheet ─── */}
      <BottomSheet open={!!forumSheet} onClose={() => setForumSheet(null)} title="Assign Forum Role">
        {forumSheet && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
              <Avatar src={forumSheet.profile_picture} name={forumSheet.name} size="sm" className="w-9 h-9 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{forumSheet.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{forumSheet.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FORUM_ROLES.map(r => (
                <button key={r} onClick={() => setForumRole(r)}
                  className={`mobile-tappable px-2 py-2 rounded-xl text-xs font-bold border text-center ${
                    forumRole === r ? "bg-primary-600 text-white border-primary-600" : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-800"
                  }`}
                >{r}</button>
              ))}
            </div>
            <button
              onClick={() => forumMutation.mutate({ studentId: forumSheet.id, role: forumRole })}
              disabled={forumMutation.isPending}
              className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold disabled:opacity-50"
            >
              {forumMutation.isPending ? "Assigning..." : `Assign as ${forumRole}`}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ─── My Details Sheet (Student) ─── */}
      <BottomSheet open={detailSheetOpen} onClose={() => setDetailSheetOpen(false)} title="My Details">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {STUDENT_CORE_FIELDS.map(field => (
            <div key={field.name}>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{field.label}</label>
              {field.type === "select" ? (
                <select
                  value={studentDetailsForm[field.name] || ""}
                  onChange={(e) => setStudentDetailsForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="">Select...</option>
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={studentDetailsForm[field.name] || ""}
                  onChange={(e) => setStudentDetailsForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  value={studentDetailsForm[field.name] || ""}
                  onChange={(e) => setStudentDetailsForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
                />
              )}
            </div>
          ))}
          <button
            onClick={() => saveDetailsMutation.mutate(studentDetailsForm)}
            disabled={saveDetailsMutation.isPending}
            className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 sticky bottom-0"
          >
            {saveDetailsMutation.isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
            Save Details
          </button>
        </div>
      </BottomSheet>

      {/* ─── Admin Edit Details Sheet ─── */}
      <AdminDetailSheet
        student={adminDetailSheet}
        className={className}
        customColumns={studentsData?.custom_columns || []}
        onClose={() => setAdminDetailSheet(null)}
        onSave={(studentId, details) => saveAdminDetailsMutation.mutate({ studentId, details })}
        isPending={saveAdminDetailsMutation.isPending}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeMutation.mutate(removeTarget.id)}
        title="Remove Student"
        message={removeTarget ? `Remove ${removeTarget.name} from ${meta.label}? This deletes their account permanently.` : ""}
        confirmText="Remove"
        danger
      />
    </div>
  );
}

// ─── Admin Detail Sheet ────────────────────────────────────────────────────────

function AdminDetailSheet({ student, className, customColumns, onClose, onSave, isPending }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (student) {
      setForm(student.details || {});
    }
  }, [student]);

  if (!student) return null;

  return (
    <BottomSheet open={!!student} onClose={onClose} title={`Edit: ${student.name}`}>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {STUDENT_CORE_FIELDS.map(field => (
          <div key={field.name}>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{field.label}</label>
            {field.type === "select" ? (
              <select value={form[field.name] || ""} onChange={e => setForm(p => ({ ...p, [field.name]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none">
                <option value="">Select...</option>
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : field.type === "textarea" ? (
              <textarea value={form[field.name] || ""} onChange={e => setForm(p => ({ ...p, [field.name]: e.target.value }))} rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none" />
            ) : (
              <input type={field.type || "text"} value={form[field.name] || ""} onChange={e => setForm(p => ({ ...p, [field.name]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none" />
            )}
          </div>
        ))}
        <button onClick={() => onSave(student.id, form)} disabled={isPending}
          className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] text-white text-sm font-bold disabled:opacity-50 sticky bottom-0">
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </BottomSheet>
  );
}

// ─── Active Forms Tab (Student view) ───────────────────────────────────────────

function ActiveFormsTab({ className, forms, studentId, user, refetch }) {
  const [fillForm, setFillForm] = useState(null);
  const [responses, setResponses] = useState({});
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: ({ formId, data }) => submitFormResponse(className, formId, data),
    onSuccess: () => { setFillForm(null); setResponses({}); refetch(); },
  });

  const activeForms = forms.filter(f => !f.is_expired);

  return (
    <div className="space-y-3">
      {activeForms.length === 0 ? (
        <MobileEmptyState icon={FileText} title="No active forms" description="There are no forms to fill out right now." />
      ) : (
        activeForms.map(form => (
          <MobileCard key={form.id}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{form.title}</h3>
            {form.description && <p className="text-xs text-gray-500 mt-1">{form.description}</p>}
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-400">{form.response_count || 0} responses</span>
              {form.has_responded ? (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted</span>
              ) : (
                <button onClick={() => setFillForm(form)}
                  className="mobile-tappable px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold">
                  Fill Form
                </button>
              )}
            </div>
          </MobileCard>
        ))
      )}

      <BottomSheet open={!!fillForm} onClose={() => setFillForm(null)} title={fillForm?.title || "Form"}>
        {fillForm && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {(fillForm.fields || []).map((field, idx) => (
              <div key={idx}>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  {field.label || field.name} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "select" ? (
                  <select value={responses[field.name] || ""} onChange={e => setResponses(p => ({ ...p, [field.name]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none">
                    <option value="">Select...</option>
                    {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea value={responses[field.name] || ""} onChange={e => setResponses(p => ({ ...p, [field.name]: e.target.value }))} rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none" />
                ) : (
                  <input type="text" value={responses[field.name] || ""} onChange={e => setResponses(p => ({ ...p, [field.name]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none" />
                )}
              </div>
            ))}
            <button onClick={() => submitMutation.mutate({ formId: fillForm.id, data: responses })}
              disabled={submitMutation.isPending}
              className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-bold disabled:opacity-50">
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

// ─── Students Data Tab (Admin view) ────────────────────────────────────────────

function StudentsDataTab({ className, stats, students, forms, onEditStudent, refetch }) {
  const queryClient = useQueryClient();
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [viewResponsesForm, setViewResponsesForm] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFields, setFormFields] = useState([{ name: "", label: "", type: "text", required: false }]);

  // Export column selection
  const [selectedCols, setSelectedCols] = useState({});

  useEffect(() => {
    if (exportSheetOpen) {
      const defaultSel = { roll_number: true, name: true, register_number: true };
      STUDENT_CORE_FIELDS.forEach(f => { defaultSel[f.name] = true; });
      setSelectedCols(defaultSel);
    }
  }, [exportSheetOpen]);

  const handleSelectAll = () => {
    const updated = { roll_number: true, name: true, register_number: true };
    STUDENT_CORE_FIELDS.forEach(f => { updated[f.name] = true; });
    setSelectedCols(updated);
  };

  const handleSelectNone = () => {
    const updated = { roll_number: false, name: false, register_number: false };
    STUDENT_CORE_FIELDS.forEach(f => { updated[f.name] = false; });
    setSelectedCols(updated);
  };

  const createFormMutation = useMutation({
    mutationFn: (data) => createForm(className, data),
    onSuccess: () => { setCreateFormOpen(false); setFormTitle(""); setFormDesc(""); setFormFields([{ name: "", label: "", type: "text", required: false }]); refetch(); },
  });

  const deleteFormMutation = useMutation({
    mutationFn: (formId) => deleteForm(className, formId),
    onSuccess: () => refetch(),
  });

  const handleExport = async () => {
    const activeCols = Object.keys(selectedCols).filter(k => selectedCols[k]);
    if (activeCols.length === 0) return;
    try {
      const response = await api.get(`/classes/${className}/export-students-data`, {
        params: { columns: activeCols.join(",") },
        responseType: "blob",
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
      setExportSheetOpen(false);
    } catch (err) { console.error("Export failed", err); }
  };

  const handleExportFormResponses = async (form) => {
    try {
      const response = await api.get(`/classes/${className}/forms/${form.id}/export`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_${form.title.replace(/\s+/g, '_')}_responses.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error("Export form responses failed", err); }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <MobileCard><span className="text-lg font-black text-gray-900 dark:text-white">{stats.total_students ?? 0}</span><span className="text-[10px] font-semibold text-gray-400 uppercase block mt-0.5">Total Students</span></MobileCard>
          <MobileCard><span className="text-lg font-black text-gray-900 dark:text-white">{stats.details_filled ?? 0}</span><span className="text-[10px] font-semibold text-gray-400 uppercase block mt-0.5">Details Filled</span></MobileCard>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setExportSheetOpen(true)} className="mobile-tappable flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300">
          <Download className="w-3.5 h-3.5" /> Export Excel
        </button>
        <button onClick={() => setCreateFormOpen(true)} className="mobile-tappable flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300">
          <Plus className="w-3.5 h-3.5" /> Create Form
        </button>
      </div>

      {/* Forms */}
      {forms.length > 0 && (
        <div>
          <MobileSectionHeader title="Forms" count={forms.length} />
          <div className="space-y-2 mt-2">
            {forms.map(form => (
              <MobileCard key={form.id}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{form.title}</h4>
                    <p className="text-[10px] text-gray-400">{form.response_count || 0} responses</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setViewResponsesForm(form)}
                      className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-blue-500">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleExportFormResponses(form)}
                      className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-green-500">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (window.confirm("Delete this form?")) deleteFormMutation.mutate(form.id); }}
                      className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </div>
      )}

      {/* Student List */}
      <div>
        <MobileSectionHeader title="Student Details" count={students.length} />
        <div className="space-y-2 mt-2">
          {students.slice(0, 30).map(s => (
            <MobileCard key={s.id} onClick={() => onEditStudent(s)}>
              <div className="flex items-center gap-3">
                <Avatar src={s.profile_picture} name={s.name} size="sm" className="w-8 h-8 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{s.roll_number || "No roll"}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.has_details ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-gray-100 text-gray-400 dark:bg-slate-800"}`}>
                  {s.has_details ? "Filled" : "Pending"}
                </span>
              </div>
            </MobileCard>
          ))}
        </div>
      </div>

      {/* Export Columns Sheet */}
      <BottomSheet open={exportSheetOpen} onClose={() => setExportSheetOpen(false)} title="Configure Export Columns">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="flex gap-2">
            <button onClick={handleSelectAll} className="mobile-tappable px-3 py-1.5 text-[10px] font-bold border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300">
              Select All
            </button>
            <button onClick={handleSelectNone} className="mobile-tappable px-3 py-1.5 text-[10px] font-bold border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300">
              Deselect All
            </button>
          </div>

          <div className="space-y-1 border-t border-b border-gray-100 dark:border-slate-800 py-3">
            {[{ name: "roll_number", label: "Roll Number" }, { name: "name", label: "Name" }, { name: "register_number", label: "Register Number" },
              ...STUDENT_CORE_FIELDS.map(f => ({ name: f.name, label: f.label }))
            ].map(col => (
              <label key={col.name} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40">
                <input
                  type="checkbox"
                  checked={!!selectedCols[col.name]}
                  onChange={() => setSelectedCols(prev => ({ ...prev, [col.name]: !prev[col.name] }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{col.label}</span>
              </label>
            ))}
          </div>

          <button onClick={handleExport}
            disabled={Object.values(selectedCols).filter(Boolean).length === 0}
            className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold disabled:opacity-50 sticky bottom-0">
            Export ({Object.values(selectedCols).filter(Boolean).length} columns)
          </button>
        </div>
      </BottomSheet>

      {/* View Responses Sheet */}
      <ViewResponsesSheet form={viewResponsesForm} className={className} onClose={() => setViewResponsesForm(null)} />

      {/* Create Form Sheet */}
      <BottomSheet open={createFormOpen} onClose={() => setCreateFormOpen(false)} title="Create Form">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Form title"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none" />
          <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description (optional)" rows={2}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none" />

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fields</p>
          {formFields.map((field, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <input type="text" value={field.label} onChange={e => { const f = [...formFields]; f[idx].label = e.target.value; f[idx].name = e.target.value.toLowerCase().replace(/\s+/g, "_"); setFormFields(f); }}
                placeholder="Field label" className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none" />
              <select value={field.type} onChange={e => { const f = [...formFields]; f[idx].type = e.target.value; setFormFields(f); }}
                className="px-2 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none w-20">
                <option value="text">Text</option>
                <option value="textarea">Long</option>
                <option value="select">Select</option>
              </select>
            </div>
          ))}
          <button onClick={() => setFormFields(p => [...p, { name: "", label: "", type: "text", required: false }])}
            className="text-xs font-bold text-primary-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Field</button>

          <button onClick={() => createFormMutation.mutate({ title: formTitle, description: formDesc, fields: formFields })}
            disabled={createFormMutation.isPending || !formTitle.trim()}
            className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] text-white text-sm font-bold disabled:opacity-50 sticky bottom-0">
            {createFormMutation.isPending ? "Creating..." : "Create Form"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── View Responses Sheet ───────────────────────────────────────────────────────

function ViewResponsesSheet({ form, className, onClose }) {
  const { data: responsesData } = useQuery({
    queryKey: ["responses", className, form?.id],
    queryFn: () => getFormResponses(className, form?.id).then(r => r.data.responses),
    enabled: !!form?.id,
  });

  if (!form) return null;

  const responses = responsesData || [];
  const fields = form.metadata?.fields || [];

  return (
    <BottomSheet open={!!form} onClose={onClose} title={`Responses — ${form.title}`}>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        <p className="text-xs text-gray-400">{responses.length} submission{responses.length !== 1 ? "s" : ""}</p>

        {responses.length === 0 ? (
          <MobileEmptyState icon={FileText} title="No submissions" description="No students have submitted this form yet." />
        ) : (
          responses.map((resp, idx) => (
            <MobileCard key={idx}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
                  <Avatar src={resp.profile_picture} name={resp.student_name} size="sm" className="w-7 h-7 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{resp.student_name}</p>
                    <p className="text-[10px] text-gray-400">{resp.roll_number}</p>
                  </div>
                </div>
                {fields.map(field => (
                  <div key={field.name}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{field.label || field.name}</span>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{resp.data?.[field.name] || "—"}</p>
                  </div>
                ))}
              </div>
            </MobileCard>
          ))
        )}
      </div>
    </BottomSheet>
  );
}

