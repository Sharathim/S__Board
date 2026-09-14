import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listStudents, removeStudent,
  getStudentDetails, saveStudentDetails, saveStudentDetailsAdmin,
  getStudentsData, getClassStats,
  createForm, listForms, deleteForm, submitFormResponse, getFormResponses,
  listAccomplishments, createAccomplishment, updateAccomplishment, deleteAccomplishment, getResumeData
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
import { AddAccomplishmentModal } from "../../../pages/classes/components/AddAccomplishmentModal";
import { AccomplishmentCard } from "../../../pages/classes/components/AccomplishmentCard";
import { ResumeModal } from "../../../pages/classes/components/ResumeModal";
import {
  Users, Trash2, Mail, ArrowLeft, MessageSquarePlus, FileText, Eye,
  Download, Plus, Save, CheckCircle2, MoreVertical, Lock, AlertCircle,
  FileSpreadsheet, FileArchive, UploadCloud, CheckCircle, Columns,
  PlusCircle, ChevronRight, X, Award, Trophy, Printer
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
  { name: "mother_mobile", label: "Mother's Mobile Number", type: "tel" },
];

const PERSONAL_FIELDS = STUDENT_CORE_FIELDS.slice(0, 9);
const ACADEMIC_FIELDS = STUDENT_CORE_FIELDS.slice(9, 14);
const PARENT_FIELDS = STUDENT_CORE_FIELDS.slice(14);

// ─── Input renderer helper ────────────────────────────────────────────────────
function FieldInput({ field, value, onChange, disabled = false }) {
  const base =`w-full px-3 py-2.5 text-xs rounded-xl border ${disabled ?"bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed":"bg-gray-50 text-gray-900 border-gray-200"} focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all`;

  if (field.type === "select") return (
    <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)} className={base}>
      <option value="">Select option</option>
      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (field.type === "textarea") return (
    <textarea value={value} disabled={disabled} onChange={e => onChange(e.target.value)} rows={2}
      className={`${base} resize-none`} placeholder={`Enter ${field.label.toLowerCase()}`} />
  );
  return (
    <input type={field.type || "text"} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}`} className={base} />
  );
}

function MobileAccomplishmentsSection({ className, user, canManage, ownStudentId, studentList }) {
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
    <div className="space-y-3">
      <div className="p-3.5 bg-white border border-gray-200/80 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary-500" />
            Accomplishments & Honors
          </h3>
        </div>

        <div className="space-y-2">
          {studentList && studentList.length > 0 && (
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900"
            >
              <option value="">All Students in Class</option>
              {studentList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_number})
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            {isStudent && ownStudentId && (
              <>
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="mobile-tappable flex-1 py-2 px-3 rounded-xl bg-primary-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
                <button
                  onClick={() => setResumeModal({ open: true, studentId: ownStudentId, studentName: user.name })}
                  className="mobile-tappable flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Build Resume
                </button>
              </>
            )}

            {!isStudent && studentFilter && (
              <button
                onClick={() => {
                  const st = studentList.find(s => String(s.id) === String(studentFilter));
                  setResumeModal({ open: true, studentId: studentFilter, studentName: st?.name || "Student" });
                }}
                className="mobile-tappable w-full py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Build Student Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : accomplishments.length === 0 ? (
        <MobileEmptyState
          icon={Award}
          title="No Accomplishments"
          description="No accomplishments recorded for this selection."
        />
      ) : (
        <div className="space-y-3">
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
        message={deleteAcc ? `Delete "${deleteAcc.title}"?` : ""}
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

export default function MobileClassDetailPage() {
  const { className } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHOD = user?.role === "HOD";
  const isStudent = user?.role === "STUDENT";
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

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", className],
    queryFn: () => listStudents(className).then(r => r.data.students),
  });

  const { data: studentsData, refetch: refetchStudentsData } = useQuery({
    queryKey: ["students-data", className],
    queryFn: () => getStudentsData(className).then(r => r.data),
    enabled: canManage && activeTab === "students_data",
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
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
    if (canManage) { refetchStudentsData(); refetchStats(); }
    refetchForms();
  };

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
    { key: "accomplishments", label: "Accomplishments" },
    ...(user?.role === "STUDENT" ? [{ key: "forms", label: "Forms" }] : []),
    ...(canManage ? [{ key: "students_data", label: "Data" }] : []),
  ];

  return (
    <div className="mobile-fade-in pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {!isStudent && (
          <button onClick={() => navigate("/classes")} className="mobile-tappable p-2 -ml-2 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600"/>
          </button>
        )}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md`}>
          {meta.short}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-gray-900 leading-tight">{meta.label}</h1>
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
              if (tab.key === "students_data") { refetchStudentsData(); refetchStats(); refetchForms(); }
              if (tab.key === "forms") refetchForms();
            }}
            className={`mobile-tappable whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.key
                ? "bg-primary-600 text-white shadow-sm"
                :"bg-gray-100 text-gray-600"
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
            <MobileEmptyState icon={Users} title={searchQuery ? "No results" : "No students yet"}
              description={searchQuery ? `No students match "${searchQuery}"` : "Students will appear after they onboard."} />
          ) : (
            <div className="space-y-2">
              {filtered.map(s => {
                const isOwn = s.user_id === user?.id;
                return (
                  <MobileCard key={s.id}
                    onClick={isOwn && user?.role === "STUDENT" ? () => setDetailSheetOpen(true) : undefined}
                    className={isOwn ?"!border-primary-300 !bg-primary-50/30":""}
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
                          <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                          {isOwn && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded-md uppercase">Me</span>}
                          {s.is_forum_member && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-md uppercase">Forum</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {s.roll_number && (
                          <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded block">{s.roll_number}</span>
                        )}
                      </div>
                      {canManage && (
                        <button onClick={e => { e.stopPropagation(); setStudentActionSheet(s); }} className="mobile-tappable p-1.5 rounded-xl text-gray-400">
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

      {/* ─── ACCOMPLISHMENTS TAB ─── */}
      {activeTab === "accomplishments" && (
        <MobileAccomplishmentsSection
          className={className}
          user={user}
          canManage={canManage}
          ownStudentId={ownStudentId}
          studentList={studentList}
        />
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
          customColumns={studentsData?.custom_columns || []}
          forms={formsData || []}
          onEditStudent={s => setAdminDetailSheet(s)}
          refetch={invalidate}
        />
      )}

      {/* ─── Student Action Sheet ─── */}
      <BottomSheet open={!!studentActionSheet} onClose={() => setStudentActionSheet(null)} title={studentActionSheet?.name}>
        {studentActionSheet && (
          <div className="space-y-1">
            <a href={`mailto:${studentActionSheet.email}`}
              className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><Mail className="w-4 h-4"/></div>
              <span className="text-sm font-semibold text-gray-700">Send Email</span>
            </a>

            {canManage && (
              <button onClick={() => { const s = studentActionSheet; setStudentActionSheet(null); setTimeout(() => setAdminDetailSheet(s), 300); }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><FileText className="w-4 h-4"/></div>
                <span className="text-sm font-semibold text-gray-700">Edit Details</span>
              </button>
            )}

            {isForumClass && canManage && !studentActionSheet.is_forum_member && (
              <button onClick={() => { const s = studentActionSheet; setStudentActionSheet(null); setTimeout(() => setForumSheet(s), 300); }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500"><MessageSquarePlus className="w-4 h-4"/></div>
                <span className="text-sm font-semibold text-gray-700">Add to Forum</span>
              </button>
            )}

            {canManage && (
              <button onClick={() => { const s = studentActionSheet; setStudentActionSheet(null); setTimeout(() => setRemoveTarget(s), 300); }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><Trash2 className="w-4 h-4"/></div>
                <span className="text-sm font-semibold text-red-600">Remove Student</span>
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ─── Forum Assign Sheet ─── */}
      <BottomSheet open={!!forumSheet} onClose={() => setForumSheet(null)} title="Assign Forum Role">
        {forumSheet && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Avatar src={forumSheet.profile_picture} name={forumSheet.name} size="sm" className="w-9 h-9 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{forumSheet.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{forumSheet.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {FORUM_ROLES.map(r => (
                <button key={r} onClick={() => setForumRole(r)}
                  className={`mobile-tappable px-2 py-2 rounded-xl text-xs font-bold border text-center ${forumRole === r ?"bg-primary-600 text-white border-primary-600":"bg-white text-gray-600 border-gray-200"}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => forumMutation.mutate({ studentId: forumSheet.id, role: forumRole })}
              disabled={forumMutation.isPending}
              className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold disabled:opacity-50">
              {forumMutation.isPending ? "Assigning..." : `Assign as ${forumRole}`}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ─── My Details Sheet (Student self-edit with immutable lock) ─── */}
      <StudentSelfEditSheet
        open={detailSheetOpen}
        onClose={() => setDetailSheetOpen(false)}
        ownDetails={ownDetails}
        formState={studentDetailsForm}
        setFormState={setStudentDetailsForm}
        onSave={() => saveDetailsMutation.mutate(studentDetailsForm)}
        isPending={saveDetailsMutation.isPending}
      />

      {/* ─── Admin Edit Details Sheet ─── */}
      <AdminDetailSheet
        student={adminDetailSheet}
        className={className}
        customColumns={studentsData?.custom_columns || []}
        onClose={() => setAdminDetailSheet(null)}
        refetch={invalidate}
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

// ─── Student Self-Edit Details Bottom Sheet (with immutable lock) ─────────────

function StudentSelfEditSheet({ open, onClose, ownDetails, formState, setFormState, onSave, isPending }) {
  const [subTab, setSubTab] = useState("personal");

  const subtabs = [
    { key: "personal", label: "Personal" },
    { key: "parents", label: "Parents" },
    { key: "academic", label: "Academic" },
  ];

  const fieldsByTab = {
    personal: PERSONAL_FIELDS,
    parents: PARENT_FIELDS,
    academic: ACADEMIC_FIELDS,
  };

  const isImmutable = (fieldName) => {
    const v = ownDetails?.details?.[fieldName];
    return v !== undefined && v !== null && String(v).trim() !== "";
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="My Registry Details">
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200/50">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 font-medium">
            Once a field is saved, it becomes <strong>locked</strong> and cannot be changed. Verify before saving.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-gray-100 pb-1">
          {subtabs.map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-b-2 transition-all ${subTab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto mobile-hide-scrollbar pb-2">
          {(fieldsByTab[subTab] || []).map(field => {
            const locked = isImmutable(field.name);
            return (
              <div key={field.name} className="space-y-1">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {field.label}
                  {locked && <Lock className="w-2.5 h-2.5 text-amber-500" title="Locked once saved" />}
                </label>
                <FieldInput field={field} value={formState[field.name] || ""}
                  onChange={v => setFormState(prev => ({ ...prev, [field.name]: v }))}
                  disabled={locked} />
              </div>
            );
          })}
        </div>

        <button onClick={onSave} disabled={isPending}
          className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
          Save Details
        </button>
      </div>
    </BottomSheet>
  );
}

// ─── Admin Edit Student Details Bottom Sheet (full fields + custom cols) ──────

function AdminDetailSheet({ student, className, customColumns = [], onClose, refetch }) {
  const [subTab, setSubTab] = useState("personal");
  const [formState, setFormState] = useState({});
  const [extraState, setExtraState] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      const details = student.details || {};
      const stateObj = {};
      STUDENT_CORE_FIELDS.forEach(f => { stateObj[f.name] = details[f.name] || student[f.name] || ""; });
      setFormState(stateObj);
      setExtraState(student.extra_details || {});
      setSubTab("personal");
    }
  }, [student]);

  if (!student) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveStudentDetailsAdmin(className, student.user_id || student.id, formState, extraState);
      refetch?.();
      onClose();
    } catch (err) {
      alert("Failed to save: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const subtabs = [
    { key: "personal", label: "Personal" },
    { key: "parents", label: "Parents" },
    { key: "academic", label: "Academic" },
    ...(customColumns.length > 0 ? [{ key: "custom", label: "Custom" }] : []),
  ];

  const fieldsByTab = { personal: PERSONAL_FIELDS, parents: PARENT_FIELDS, academic: ACADEMIC_FIELDS };

  return (
    <BottomSheet open={!!student} onClose={onClose} title={`Edit — ${student.name}`}>
      <div className="space-y-3">
        {/* Sub-tabs */}
        <div className="flex gap-1 overflow-x-auto mobile-hide-scrollbar border-b border-gray-100 pb-1">
          {subtabs.map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${subTab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto mobile-hide-scrollbar pb-2">
          {subTab !== "custom" ? (
            (fieldsByTab[subTab] || []).map(field => (
              <div key={field.name} className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{field.label}</label>
                <FieldInput field={field} value={formState[field.name] || ""}
                  onChange={v => setFormState(prev => ({ ...prev, [field.name]: v }))} />
              </div>
            ))
          ) : (
            customColumns.map(col => (
              <div key={col.name} className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{col.label}</label>
                <input type="text" value={extraState[col.name] || ""}
                  onChange={e => setExtraState(prev => ({ ...prev, [col.name]: e.target.value }))}
                  placeholder={`Enter ${col.label}`}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-indigo-200 bg-indigo-50/30 text-gray-900 focus:outline-none"/>
              </div>
            ))
          )}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="mobile-tappable w-full py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </BottomSheet>
  );
}

// ─── Active Forms Tab (Student View) ─────────────────────────────────────────

function ActiveFormsTab({ className, forms, studentId, user, refetch }) {
  const [fillForm, setFillForm] = useState(null);
  const [userSubmissions, setUserSubmissions] = useState({});

  useEffect(() => {
    async function checkSubmissions() {
      if (!forms || forms.length === 0) return;
      const subMap = {};
      for (const f of forms) {
        try {
          const r = await getFormResponses(className, f.id);
          const userResp = (r.data?.responses || []).find(
            x => (studentId && (x.student_id === studentId || x.id === studentId)) ||
                 (user?.id && (x.user_id === user.id || x.student_id === user.id))
          );
          if (userResp) subMap[f.id] = userResp;
        } catch (e) {}
      }
      setUserSubmissions(subMap);
    }
    checkSubmissions();
  }, [forms, className, studentId, user]);

  const activeForms = forms.filter(f => !f.is_expired);

  return (
    <div className="space-y-3">
      <MobileSectionHeader title="Academic & Administration Forms" count={activeForms.length} />
      {activeForms.length === 0 ? (
        <MobileEmptyState icon={FileText} title="No active forms" description="No forms to fill right now." />
      ) : (
        activeForms.map(form => {
          const isSubmitted = !!userSubmissions[form.id] || !!form.has_responded;
          return (
            <MobileCard key={form.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900">{form.title}</h3>
                  <p className="text-[10px] text-gray-400 uppercase mt-0.5 font-semibold">Type: {form.form_type}</p>
                  {form.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.description}</p>}
                </div>
                <div className="shrink-0">
                  {isSubmitted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                  ) : (
                    <button onClick={() => setFillForm(form)}
                      className="mobile-tappable px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md">
                      Fill Form
                    </button>
                  )}
                </div>
              </div>
            </MobileCard>
          );
        })
      )}

      {/* Fill Form Sheet */}
      <FillFormSheet
        form={fillForm}
        className={className}
        studentName={user?.name}
        studentRoll={user?.student?.roll_number}
        onClose={() => setFillForm(null)}
        onSuccess={() => { setFillForm(null); refetch(); }}
      />
    </div>
  );
}

// ─── Fill Form Bottom Sheet (Student) ─────────────────────────────────────────

function FillFormSheet({ form, className, studentName, studentRoll, onClose, onSuccess }) {
  const [answers, setAnswers] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, setIsPending] = useState(false);

  const fields = form?.metadata?.fields || form?.fields || form?.data?.fields || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsPending(true);
    try {
      if (form.form_type === "internship") {
        if (!selectedFile) { setErrorMsg("Please upload your internship certificate PDF."); setIsPending(false); return; }
        const formData = new FormData();
        formData.append("answers", JSON.stringify(answers));
        formData.append("certificate", selectedFile);
        await submitFormResponse(className, form.id, formData, true);
      } else {
        await submitFormResponse(className, form.id, { answers });
      }
      onSuccess();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Failed to submit. Try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <BottomSheet open={!!form} onClose={onClose} title={form?.title || "Fill Form"}>
      {form && (
        <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto mobile-hide-scrollbar pb-4">
          {/* Student info */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-xl text-xs">
            <div><span className="text-gray-400 block text-[9px] font-bold uppercase">Name</span>{studentName}</div>
            <div><span className="text-gray-400 block text-[9px] font-bold uppercase">Roll No</span>{studentRoll}</div>
          </div>

          {/* Internship fixed fields */}
          {form.form_type === "internship" && (
            <div className="space-y-2.5">
              {[
                { name: "company_name", label: "Company Name", type: "text", required: true },
                { name: "start_date", label: "Start Date", type: "date", required: true },
                { name: "end_date", label: "End Date", type: "date", required: true },
                { name: "duration", label: "Duration (e.g. 4 weeks)", type: "text", required: true },
                { name: "project_name", label: "Project Name", type: "text", required: true },
                { name: "company_website", label: "Company Website", type: "url", required: true },
              ].map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                  <input type={f.type} required={f.required} value={answers[f.name] || ""}
                    onChange={e => setAnswers(p => ({ ...p, [f.name]: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none"/>
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Company Address <span className="text-red-500">*</span></label>
                <textarea required rows={2} value={answers.company_address || ""} onChange={e => setAnswers(p => ({ ...p, company_address: e.target.value }))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none resize-none"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Certificate PDF <span className="text-red-500">*</span></label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50/30 cursor-pointer">
                  <input type="file" accept=".pdf" onChange={e => {
                    const f = e.target.files[0];
                    if (f && f.type !== "application/pdf") { setErrorMsg("Only PDF files allowed."); } else { setErrorMsg(""); setSelectedFile(f); }
                  }} className="hidden" />
                  <UploadCloud className="w-7 h-7 text-indigo-500 mb-1.5" />
                  <p className="text-xs font-bold text-gray-700">
                    {selectedFile ? selectedFile.name : "Tap to upload certificate PDF"}
                  </p>
                  {selectedFile && <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ready</p>}
                </label>
              </div>
            </div>
          )}

          {/* Custom / Mark Sheet fields */}
          {fields.map((field, idx) => (
            <div key={idx} className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">{field.label || field.name} {field.required && <span className="text-red-500">*</span>}</label>
              <input type={field.type || "text"} required={field.required} value={answers[field.name] || ""}
                onChange={e => setAnswers(p => ({ ...p, [field.name]: e.target.value }))}
                placeholder={`Enter ${(field.label || field.name).toLowerCase()}`}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none"/>
            </div>
          ))}

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl text-xs text-red-600 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}

          <button type="submit" disabled={isPending}
            className="mobile-tappable w-full py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 sticky bottom-0">
            {isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : null}
            {isPending ? "Submitting..." : "Submit Form"}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}

// ─── Students Data Tab (HOD/Incharge View) ────────────────────────────────────

function StudentsDataTab({ className, stats, students, customColumns = [], forms, onEditStudent, refetch }) {
  const [subTab, setSubTab] = useState("main_table");
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [viewResponsesForm, setViewResponsesForm] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");

  const deleteFormMutation = useMutation({
    mutationFn: (formId) => deleteForm(className, formId),
    onSuccess: () => refetch(),
  });

  const handleExportWhole = async () => {
    try {
      const response = await api.get(`/classes/${className}/export-students-data`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_students_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  const handleExportForm = async (form) => {
    try {
      const response = await api.get(`/classes/${className}/forms/${form.id}/export`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${className}_${form.title.replace(/\s+/g, "_")}_responses.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s => s.name?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q));
  }, [students, studentSearch]);

  const subtabs = [
    { key: "main_table", label: "Main Table" },
    { key: "builder", label: "Form Builder" },
    { key: "responses", label: `Submissions (${forms.length})` },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <MobileCard className="!p-3">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-lg font-black text-gray-900">{stats?.total_students ?? 0}</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Total</p>
        </MobileCard>
        <MobileCard className="!p-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-gray-900">{stats?.complete_students ?? 0}</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Completed</p>
        </MobileCard>
        <MobileCard className="!p-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center mb-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-lg font-black text-gray-900">{stats?.incomplete_students ?? 0}</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Pending</p>
        </MobileCard>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto mobile-hide-scrollbar border-b border-gray-100 pb-1 -mx-1 px-1">
        {subtabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`mobile-tappable whitespace-nowrap px-3 py-2 text-xs font-bold border-b-2 transition-all shrink-0 ${subTab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── MAIN TABLE ─── */}
      {subTab === "main_table" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Students Master Registry</span>
            <div className="flex gap-1.5">
              <button onClick={() => setExportSheetOpen(true)}
                className="mobile-tappable flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white">
                <Columns className="w-3 h-3" /> Select
              </button>
              <button onClick={handleExportWhole}
                className="mobile-tappable flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                <FileSpreadsheet className="w-3 h-3" /> Export All
              </button>
            </div>
          </div>

          <MobileSearchBar value={studentSearch} onChange={setStudentSearch} placeholder="Search students..." />

          <div className="space-y-2">
            {filteredStudents.length === 0 ? (
              <MobileEmptyState icon={Users} title="No students yet" description="No student profiles created yet." />
            ) : (
              filteredStudents.map(s => (
                <MobileCard key={s.id} onClick={() => onEditStudent(s)}>
                  <div className="flex items-center gap-3">
                    <Avatar src={s.profile_picture} name={s.name} size="sm" className="w-9 h-9 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{s.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-mono">{s.roll_number || "—"}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400 font-mono">{s.register_number || "—"}</span>
                      </div>
                      {s.details?.gender && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {s.details?.gender && <span className="text-[9px] text-gray-500">{s.details.gender}</span>}
                          {s.details?.blood_group && <span className="text-[9px] text-gray-500">{s.details.blood_group}</span>}
                          {s.details?.mobile_number && <span className="text-[9px] text-gray-500">{s.details.mobile_number}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </div>
                </MobileCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── FORM BUILDER ─── */}
      {subTab === "builder" && (
        <div className="space-y-3">
          <MobileCard>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Create & Publish a Form</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Custom questionnaire, Mark sheets or Internship forms</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Create dynamic forms that can add columns to the student registry or be saved separately as Internship Reports and Exam Mark Sheets.
            </p>
            <button onClick={() => setCreateFormOpen(true)}
              className="mobile-tappable w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-md">
              Open Form Creator Builder
            </button>
          </MobileCard>
        </div>
      )}

      {/* ─── FORM SUBMISSIONS ─── */}
      {subTab === "responses" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-700">Submissions Log</p>
          {forms.length === 0 ? (
            <MobileEmptyState icon={FileText} title="No forms published" description="No forms published for this class yet." />
          ) : (
            forms.map(form => (
              <MobileCard key={form.id}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-900">{form.title}</h4>
                    <div className="flex flex-wrap gap-2 mt-1 text-[9px] text-gray-400 uppercase font-semibold">
                      <span>Type: {form.form_type}</span>
                      <span>·</span>
                      <span>Target: {form.destination === "main_table" ? "Main Table" : "Separate"}</span>
                      <span>·</span>
                      <span className="text-indigo-500">{form.response_count || 0} submissions</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setViewResponsesForm(form)}
                    className="mobile-tappable flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600">
                    <Eye className="w-3.5 h-3.5" /> View Answers
                  </button>
                  <button onClick={() => handleExportForm(form)}
                    className="mobile-tappable flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                  {form.form_type === "internship" && (
                    <button onClick={async () => {
                      try {
                        const r = await api.get(`/classes/${className}/forms/${form.id}/download-certificates`, { responseType: "blob" });
                        const blob = new Blob([r.data], { type: "application/zip" });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url; link.download = `${form.title}_certificates.zip`;
                        document.body.appendChild(link); link.click(); document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (e) { console.error(e); }
                    }} className="mobile-tappable flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-bold">
                      <FileArchive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => { if (window.confirm("Delete this form?")) deleteFormMutation.mutate(form.id); }}
                    className="mobile-tappable px-3 py-2 rounded-xl text-red-400 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </MobileCard>
            ))
          )}
        </div>
      )}

      {/* Export Columns Sheet */}
      <ExportColumnsSheet
        open={exportSheetOpen}
        onClose={() => setExportSheetOpen(false)}
        className={className}
        customColumns={customColumns}
      />

      {/* Create Form Sheet */}
      <CreateFormSheet
        open={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        className={className}
        onSuccess={refetch}
      />

      {/* View Responses Sheet */}
      <ViewResponsesSheet
        form={viewResponsesForm}
        className={className}
        onClose={() => setViewResponsesForm(null)}
      />
    </div>
  );
}

// ─── Export Columns Bottom Sheet ──────────────────────────────────────────────

function ExportColumnsSheet({ open, onClose, className, customColumns = [] }) {
  const [selectedCols, setSelectedCols] = useState({});

  useEffect(() => {
    if (open) {
      const def = { roll_number: true, name: true, register_number: true };
      STUDENT_CORE_FIELDS.forEach(f => { def[f.name] = true; });
      customColumns.forEach(c => { def[c.name] = true; });
      setSelectedCols(def);
    }
  }, [open, customColumns]);

  const allCols = [
    { name: "roll_number", label: "Roll Number" },
    { name: "name", label: "Name" },
    { name: "register_number", label: "Register Number" },
    ...STUDENT_CORE_FIELDS.map(f => ({ name: f.name, label: f.label })),
    ...customColumns.map(c => ({ name: c.name, label: c.label, isCustom: true })),
  ];

  const selectedCount = Object.values(selectedCols).filter(Boolean).length;

  const triggerExport = async () => {
    const activeCols = Object.keys(selectedCols).filter(k => selectedCols[k]);
    if (activeCols.length === 0) return;
    try {
      const response = await api.get(`/classes/${className}/export-students-data`, {
        params: { columns: activeCols.join(",") }, responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${className}_students_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Select Export Columns">
      <div className="space-y-3">
        <div className="flex gap-2">
          <button onClick={() => { const u = {}; allCols.forEach(c => { u[c.name] = true; }); setSelectedCols(u); }}
            className="mobile-tappable px-3 py-1.5 text-[10px] font-bold border border-gray-200 rounded-xl bg-white text-gray-600">
            Select All
          </button>
          <button onClick={() => { const u = {}; allCols.forEach(c => { u[c.name] = false; }); setSelectedCols(u); }}
            className="mobile-tappable px-3 py-1.5 text-[10px] font-bold border border-gray-200 rounded-xl bg-white text-gray-600">
            Deselect All
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto mobile-hide-scrollbar space-y-1 border-t border-b border-gray-100 py-2">
          {allCols.map(col => (
            <label key={col.name} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={!!selectedCols[col.name]}
                onChange={() => setSelectedCols(prev => ({ ...prev, [col.name]: !prev[col.name] }))}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
              <span className={`text-xs font-semibold ${col.isCustom ?"text-indigo-600":"text-gray-700"}`}>
                {col.label}
              </span>
            </label>
          ))}
        </div>

        <button onClick={triggerExport} disabled={selectedCount === 0}
          className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold disabled:opacity-40">
          Download Excel ({selectedCount} columns)
        </button>
      </div>
    </BottomSheet>
  );
}

// ─── Create Form Builder Bottom Sheet ────────────────────────────────────────

function CreateFormSheet({ open, onClose, className, onSuccess }) {
  const [formType, setFormType] = useState("custom");
  const [destination, setDestination] = useState("separate_table");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([{ name: "", label: "", type: "text" }]);
  const [examType, setExamType] = useState("CIA 1");
  const [semesterType, setSemesterType] = useState("odd");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [subjectsList, setSubjectsList] = useState(["English", "Mathematics"]);
  const [internshipQuestions, setInternshipQuestions] = useState([]);

  const createFormMutation = useMutation({
    mutationFn: (payload) => createForm(className, payload),
    onSuccess: () => {
      onSuccess?.(); onClose();
      setTitle(""); setFormType("custom"); setDestination("separate_table");
      setQuestions([{ name: "", label: "", type: "text" }]);
      setSubjectsList(["English", "Mathematics"]); setInternshipQuestions([]);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalTitle = title;
    let finalMetadata = {};

    if (formType === "mark_analysis") {
      finalTitle = `${examType} Mark Sheet`;
      const validSubjs = subjectsList.filter(s => s.trim() !== "");
      if (validSubjs.length === 0) { alert("Add at least one subject."); return; }
      finalMetadata = {
        exam_type: examType, semester_type: semesterType, academic_year: academicYear,
        fields: validSubjs.map(s => ({ name: s.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_"), label: `${s}'s Mark`, type: "number" }))
      };
    } else if (formType === "internship") {
      finalTitle = title.trim() || "Internship Form";
      finalMetadata = { fields: internshipQuestions.filter(q => q.label.trim() !== "") };
    } else {
      const validQ = questions.filter(q => q.label.trim() !== "");
      if (validQ.length === 0) { alert("Add at least one question."); return; }
      finalMetadata = { fields: validQ };
    }

    createFormMutation.mutate({
      title: finalTitle, form_type: formType,
      destination: formType === "custom" ? destination : "separate_table",
      metadata: finalMetadata,
    });
  };

  const templates = [
    { id: "custom", label: "Custom Form Builder" },
    { id: "mark_analysis", label: "CIA/Semester Mark Sheet" },
    { id: "internship", label: "Internship Form" },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Publish a Form / Table">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto mobile-hide-scrollbar pb-4">

        {/* Template Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Form / Table Template</label>
          <div className="grid grid-cols-1 gap-2">
            {templates.map(t => (
              <button key={t.id} type="button" onClick={() => setFormType(t.id)}
                className={`mobile-tappable p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                  formType === t.id ?"bg-indigo-600 text-white border-indigo-600":"bg-gray-50 border-gray-200 text-gray-600"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Form */}
        {formType === "custom" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Form Title <span className="text-red-500">*</span></label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Student Extracurriculars"
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Data Target Destination</label>
              <div className="grid grid-cols-1 gap-2">
                {[{ id: "separate_table", label: "Maintain in Separate Table" }, { id: "main_table", label: "Add to Main Table (Create Columns)" }].map(d => (
                  <button key={d.id} type="button" onClick={() => setDestination(d.id)}
                    className={`mobile-tappable p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      destination === d.id ?"bg-indigo-50 border-indigo-500 text-indigo-700":"bg-gray-50 border-gray-200 text-gray-500"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Dynamic Questions</label>
                <button type="button" onClick={() => setQuestions(p => [...p, { name: "", label: "", type: "text" }])}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {questions.map((q, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" required placeholder="Question label (e.g. Club Name)" value={q.label}
                    onChange={e => {
                      const updated = [...questions]; updated[idx].label = e.target.value;
                      updated[idx].name = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
                      setQuestions(updated);
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900"/>
                  <select value={q.type} onChange={e => { const u = [...questions]; u[idx].type = e.target.value; setQuestions(u); }}
                    className="w-24 px-2 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="tel">Phone</option>
                  </select>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== idx))} className="text-red-400 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mark Sheet */}
        {formType === "mark_analysis" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Exam Type</label>
                <select value={examType} onChange={e => setExamType(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900">
                  <option value="CIA 1">CIA 1</option>
                  <option value="CIA 2">CIA 2</option>
                  <option value="Semester">Semester Examination</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Semester</label>
                  <select value={semesterType} onChange={e => setSemesterType(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900">
                    <option value="odd">Odd Semester</option>
                    <option value="even">Even Semester</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Academic Year</label>
                  <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2024-2025"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900"/>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Subjects</label>
                <button type="button" onClick={() => setSubjectsList(p => [...p, ""])} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Subject
                </button>
              </div>
              {subjectsList.map((subj, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" required placeholder="e.g. Python Programming" value={subj}
                    onChange={e => { const u = [...subjectsList]; u[idx] = e.target.value; setSubjectsList(u); }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900"/>
                  {subjectsList.length > 1 && (
                    <button type="button" onClick={() => setSubjectsList(subjectsList.filter((_, i) => i !== idx))} className="text-red-400 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Internship Form */}
        {formType === "internship" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Form Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Internship Form"
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900"/>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-gray-500 space-y-1">
              <strong className="block text-gray-700 text-xs">Prefilled Fields (Ready-to-Go):</strong>
              <p>Company Name, Start Date, End Date, Duration, Project Name, Website Link, Address, Certificate PDF Upload</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Additional Questions (Optional)</label>
                <button type="button" onClick={() => setInternshipQuestions(p => [...p, { name: "", label: "", type: "text" }])}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {internshipQuestions.map((q, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" required placeholder="e.g. Stipend Amount" value={q.label}
                    onChange={e => {
                      const u = [...internshipQuestions]; u[idx].label = e.target.value;
                      u[idx].name = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
                      setInternshipQuestions(u);
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900"/>
                  <select value={q.type} onChange={e => { const u = [...internshipQuestions]; u[idx].type = e.target.value; setInternshipQuestions(u); }}
                    className="w-24 px-2 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                  <button type="button" onClick={() => setInternshipQuestions(internshipQuestions.filter((_, i) => i !== idx))} className="text-red-400 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" disabled={createFormMutation.isPending}
          className="mobile-tappable w-full py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 sticky bottom-0">
          {createFormMutation.isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : null}
          {createFormMutation.isPending ? "Publishing..." : "Publish Form"}
        </button>
      </form>
    </BottomSheet>
  );
}

// ─── View Responses Bottom Sheet ──────────────────────────────────────────────

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
    <BottomSheet open={!!form} onClose={onClose} title={`Submissions — ${form.title}`}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto mobile-hide-scrollbar pb-4">
        <p className="text-xs text-gray-400 font-medium">
          {responses.length} student submission{responses.length !== 1 ? "s" : ""}
          <span className="ml-2 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{form.form_type}</span>
        </p>

        {responses.length === 0 ? (
          <MobileEmptyState icon={FileText} title="No submissions yet" description="No students have submitted this form yet." />
        ) : (
          responses.map((resp, idx) => (
            <MobileCard key={idx}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Avatar src={resp.profile_picture} name={resp.student_name} size="sm" className="w-7 h-7 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{resp.student_name}</p>
                    <p className="text-[10px] text-gray-400">{resp.roll_number || "No roll number"}</p>
                  </div>
                </div>

                {/* Mark Sheet */}
                {form.form_type === "mark_analysis" && (
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div><span className="text-[9px] text-gray-400 font-bold uppercase block">Exam</span>{form.metadata?.exam_type}</div>
                    <div><span className="text-[9px] text-gray-400 font-bold uppercase block">Year</span>{form.metadata?.academic_year}</div>
                    {fields.map(f => (
                      <div key={f.name}><span className="text-[9px] text-gray-400 font-bold uppercase block">{f.label}</span>{resp.answers?.[f.name] || "—"}</div>
                    ))}
                  </div>
                )}

                {/* Internship */}
                {form.form_type === "internship" && (
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      ["Company", "company_name"], ["Start", "start_date"], ["End", "end_date"],
                      ["Duration", "duration"], ["Project", "project_name"],
                    ].map(([lbl, key]) => (
                      <div key={key}><span className="text-[9px] text-gray-400 font-bold uppercase block">{lbl}</span>{resp.answers?.[key] || "—"}</div>
                    ))}
                    {resp.attachment_url && (
                      <div className="col-span-2">
                        <a href={resp.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-indigo-600 text-xs font-bold">
                          <Eye className="w-3.5 h-3.5" /> View Certificate PDF
                        </a>
                      </div>
                    )}
                    {fields.map(f => (
                      <div key={f.name}><span className="text-[9px] text-gray-400 font-bold uppercase block">{f.label}</span>{resp.answers?.[f.name] || "—"}</div>
                    ))}
                  </div>
                )}

                {/* Custom */}
                {form.form_type === "custom" && (
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {fields.map(f => (
                      <div key={f.name}><span className="text-[9px] text-gray-400 font-bold uppercase block">{f.label || f.name}</span>{resp.answers?.[f.name] || resp.data?.[f.name] || "—"}</div>
                    ))}
                  </div>
                )}
              </div>
            </MobileCard>
          ))
        )}
      </div>
    </BottomSheet>
  );
}
