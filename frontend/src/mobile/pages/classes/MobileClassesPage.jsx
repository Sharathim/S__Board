import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listClasses, toggleStudentRegistration, assignIncharge } from "../../../api/classes";
import { listFaculty } from "../../../api/faculty";
import { listForumMembers, listEligibleStudents, assignForumMember, removeForumMember, toggleForumCoordinator } from "../../../api/forum";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { Switch } from "../../../components/ui/Switch";
import { SearchPicker } from "../../../components/shared/SearchPicker";
import MobileCard from "../../components/MobileCard";
import MobileSectionHeader from "../../components/MobileSectionHeader";
import MobileEmptyState from "../../components/MobileEmptyState";
import BottomSheet from "../../layout/BottomSheet";
import { useNavigate, Navigate } from "react-router-dom";
import {
  GraduationCap, Users, ShieldCheck, BookOpen,
  ChevronRight, Crown, UserCog, Plus, X,
  Trash2, Sparkles, Search,
} from "lucide-react";
import { useState, useMemo } from "react";

const CLASS_META = {
  UG_1A: { label: "UG 1A", level: "UG", year: 1 },
  UG_1B: { label: "UG 1B", level: "UG", year: 1 },
  UG_2A: { label: "UG 2A", level: "UG", year: 2 },
  UG_2B: { label: "UG 2B", level: "UG", year: 2 },
  UG_3A: { label: "UG 3A", level: "UG", year: 3 },
  UG_3B: { label: "UG 3B", level: "UG", year: 3 },
  PG_1A: { label: "PG 1A", level: "PG", year: 1 },
  PG_2A: { label: "PG 2A", level: "PG", year: 2 },
};

const FORUM_ROLE_COLORS = {
  President:"bg-orange-100 text-orange-700",
"Vice President":"bg-amber-100 text-amber-700",
  Secretary:"bg-emerald-100 text-emerald-700",
  Member:"bg-slate-100 text-slate-650",
};

export default function MobileClassesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [inchargeSheet, setInchargeSheet] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [rolePreset, setRolePreset] = useState("President");
  const [customRole, setCustomRole] = useState("");

  const { data: raw, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then(r => r.data),
  });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
    enabled: isHOD,
  });

  const { data: forumMembers } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
  });

  const toggleRegMutation = useMutation({
    mutationFn: toggleStudentRegistration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  const assignInchargeMutation = useMutation({
    mutationFn: ({ className, facultyId }) => assignIncharge(className, facultyId),
    onSuccess: () => {
      setInchargeSheet(null);
      setSelectedFacultyId(null);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeForumMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-members"] }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setPendingStudent(null);
      setRolePreset("President");
      setCustomRole("");
    },
  });

  const memberList = forumMembers || [];
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return memberList;
    const q = memberSearch.toLowerCase();
    return memberList.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  }, [memberList, memberSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  let classes = raw?.classes || [];
  const regOpen = raw?.student_registration_open || false;
  const facultyList = facultyData || [];
  const eligibleFaculty = facultyList.filter(f => !f.class_incharge_of);

  if (user?.role === "STUDENT") {
    const studentClassName = user?.student_profile?.class_name || classes.find(c => c.can_view_details)?.class_name;
    if (studentClassName) {
      return <Navigate to={`/classes/${studentClassName}`} replace />;
    }
    classes = classes.filter(c => c.can_view_details);
  }

  const ugList = classes.filter(c => c.class_name.startsWith("UG"));
  const pgList = classes.filter(c => c.class_name.startsWith("PG"));

  return (
    <div className="mobile-fade-in pb-6 space-y-4">
      {/* HOD Controls */}
      {isHOD && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Forum Members */}
          <button
            onClick={() => setMembersSheetOpen(true)}
            className="mobile-tappable flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200/60 text-xs font-bold text-gray-700"
          >
            <Users className="w-3.5 h-3.5 text-[#F05A2B]" />
            Forum
            {isHOD && (
              <span
                onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
                className="w-5 h-5 rounded-full bg-gradient-to-r from-[#FF8365] to-[#F05A2B] text-white flex items-center justify-center ml-1"
              >
                <Plus className="w-3 h-3" />
              </span>
            )}
          </button>

          {/* Registration Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200/60">
            <span className="text-xs font-bold text-gray-500">New Student</span>
            <Switch
              checked={regOpen}
              onChange={() => toggleRegMutation.mutate()}
              loading={toggleRegMutation.isPending}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Non-HOD forum button */}
      {!isHOD && (
        <button
          onClick={() => setMembersSheetOpen(true)}
          className="mobile-tappable flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200/60 text-xs font-bold text-gray-700"
        >
          <Users className="w-3.5 h-3.5 text-[#F05A2B]" />
          View Forum Members
        </button>
      )}

      {/* UG Classes */}
      {ugList.length > 0 && (
        <div>
          <MobileSectionHeader title="Undergraduate" count={ugList.length} />
          <div className="space-y-2.5 mt-2">
            {ugList.map(c => (
              <ClassCard
                key={c.class_name}
                c={c}
                meta={CLASS_META[c.class_name]}
                isHOD={isHOD}
                onAssignIncharge={() => setInchargeSheet(c.class_name)}
                onNavigate={() => c.can_view_details && navigate(`/classes/${c.class_name}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* PG Classes */}
      {pgList.length > 0 && (
        <div>
          <MobileSectionHeader title="Postgraduate" count={pgList.length} />
          <div className="space-y-2.5 mt-2">
            {pgList.map(c => (
              <ClassCard
                key={c.class_name}
                c={c}
                meta={CLASS_META[c.class_name]}
                isHOD={isHOD}
                onAssignIncharge={() => setInchargeSheet(c.class_name)}
                onNavigate={() => c.can_view_details && navigate(`/classes/${c.class_name}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assign Incharge Bottom Sheet */}
      <BottomSheet open={!!inchargeSheet} onClose={() => { setInchargeSheet(null); setSelectedFacultyId(null); }} title="">
        {inchargeSheet && (
          <div className="space-y-4">
            {/* Professional Header */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">Assign Class Incharge</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {CLASS_META[inchargeSheet]?.label || inchargeSheet} class
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Select a faculty member to manage and oversee <span className="font-bold text-gray-700">{CLASS_META[inchargeSheet]?.label || inchargeSheet}</span>
            </p>

            {/* Faculty list */}
            <div className="space-y-2 max-h-[48vh] overflow-y-auto mobile-hide-scrollbar">
              {eligibleFaculty.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <UserCog className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-600">No eligible faculty</p>
                  <p className="text-xs text-gray-400 mt-1">All faculty are already assigned as incharge.</p>
                </div>
              ) : (
                eligibleFaculty.map(f => {
                  const isSelected = selectedFacultyId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFacultyId(f.id)}
                      className={`mobile-tappable w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ?"border-orange-500 bg-orange-50 shadow-sm shadow-orange-500/10"
                          :"border-gray-100 bg-white hover:border-orange-200"
                      }`}
                    >
                      <Avatar src={f.profile_picture} name={f.name} size="sm" className={`w-10 h-10 shrink-0 ring-2 transition-all ${isSelected ? "ring-orange-500/40" : "ring-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-extrabold truncate transition-colors ${isSelected ?"text-orange-600":"text-gray-900"}`}>
                          {f.name}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{f.designation}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-500 scale-110"
                          :"border-gray-300"
                      }`}>
                        {isSelected && <span className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Action Buttons */}
            {eligibleFaculty.length > 0 && (
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => { setInchargeSheet(null); setSelectedFacultyId(null); }}
                  className="mobile-tappable flex-1 py-3 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-600 bg-white">
                  Cancel
                </button>
                <button
                  onClick={() => assignInchargeMutation.mutate({ className: inchargeSheet, facultyId: selectedFacultyId })}
                  disabled={!selectedFacultyId || assignInchargeMutation.isPending}
                  className="mobile-tappable flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-black shadow-lg shadow-orange-500/25 disabled:opacity-40 active:scale-[0.98] transition-all">
                  {assignInchargeMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Assigning...
                    </span>
                  ) : "Confirm"}
                </button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Forum Members Bottom Sheet */}
      <BottomSheet open={membersSheetOpen} onClose={() => setMembersSheetOpen(false)} title="Forum Members">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none"
          />
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No forum members found.</p>
          ) : (
            filteredMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                <Avatar src={m.profile_picture} name={m.name} size="sm" className="w-8 h-8 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{m.name}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${FORUM_ROLE_COLORS[m.role] || FORUM_ROLE_COLORS.Member}`}>
                    {m.role}
                  </span>
                </div>
                {isHOD && (
                  <button
                    onClick={() => removeMutation.mutate(m.id)}
                    className="mobile-tappable p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </BottomSheet>

      {/* Student Picker for Forum Assignment */}
      {pickerOpen && (
        <SearchPicker
          title="Add Forum Member"
          queryKey="eligible-students"
          queryFn={() => listEligibleStudents().then(r => r.data.students)}
          onSelect={(s) => { setPickerOpen(false); setPendingStudent(s); }}
          onClose={() => setPickerOpen(false)}
          placeholder="Search students..."
          renderItem={(s) => (
            <div className="flex items-center gap-2">
              <Avatar src={s.profile_picture} name={s.name} size="sm" className="w-7 h-7" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400">{s.email}</p>
              </div>
            </div>
          )}
        />
      )}

      {/* Role selection for pending student */}
      <BottomSheet open={!!pendingStudent} onClose={() => setPendingStudent(null)} title="Assign Role">
        {pendingStudent && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Assign a role to <span className="font-bold">{pendingStudent.name}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["President", "Vice President", "Secretary", "Joint Secretary", "Treasurer", "Member"].map(role => (
                <button
                  key={role}
                  onClick={() => setRolePreset(role)}
                  className={`mobile-tappable px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    rolePreset === role
                      ? "bg-[#F05A2B] text-white border-[#F05A2B]"
                      :"bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <button
              onClick={() => assignMutation.mutate({ studentId: pendingStudent.id, role: rolePreset })}
              disabled={assignMutation.isPending}
              className="mobile-tappable w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] text-white text-sm font-bold disabled:opacity-50"
            >
              {assignMutation.isPending ? "Assigning..." : "Confirm"}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function ClassCard({ c, meta, isHOD, onAssignIncharge, onNavigate }) {
  const hasIncharge = !!c.incharge;
  const activeMeta = meta || { label: c.class_name, level: c.class_name.startsWith("PG") ? "PG" : "UG", year: 1 };

  return (
    <MobileCard onClick={c.can_view_details ? onNavigate : undefined}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8365] to-[#F05A2B] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-orange-500/20">
            {activeMeta.level}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {activeMeta.label}
            </h3>
            <p className="text-[11px] text-gray-400">
              {activeMeta.level === "UG" ? "Undergraduate" : "Postgraduate"} · Year {activeMeta.year}
            </p>
          </div>
        </div>
        {c.can_view_details && (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0"/>
        )}
      </div>

      {/* Incharge */}
      <div
        onClick={(e) => {
          if (isHOD) {
            e.preventDefault();
            e.stopPropagation();
            onAssignIncharge();
          }
        }}
        className={`flex items-center gap-3 mt-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100 ${
          isHOD ?"cursor-pointer active:bg-gray-100":""
        }`}
      >
        {hasIncharge ? (
          <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="w-8 h-8 ring-2 ring-primary/20 shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Class Incharge</span>
          <span className={`text-sm font-semibold truncate block ${hasIncharge ?"text-gray-800":"text-gray-400 italic"}`}>
            {hasIncharge ? c.incharge.name : "Not Assigned"}
          </span>
        </div>
        {isHOD && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
      </div>

      {/* Stats */}
      <div className="flex gap-3 mt-3">
        <div className="flex items-center gap-2 flex-1 p-2 rounded-xl bg-gray-50 border border-gray-100">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <div>
            <span className="text-sm font-bold text-gray-800 block leading-none">{c.student_count ?? 0}</span>
            <span className="text-[9px] font-semibold text-gray-400 uppercase block mt-0.5">Students</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 p-2 rounded-xl bg-gray-50 border border-gray-100">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          <div>
            <span className="text-sm font-bold text-gray-800 block leading-none">Year {activeMeta.year}</span>
            <span className="text-[9px] font-semibold text-gray-400 uppercase block mt-0.5">Level</span>
          </div>
        </div>
      </div>
    </MobileCard>
  );
}
