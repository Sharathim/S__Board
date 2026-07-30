import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, UploadCloud, CheckCircle2, AlertTriangle, FileText,
  BookOpen, Rocket, Award, Download, Users, Plus, RefreshCw,
  Search, ExternalLink, ChevronRight, Sparkles, Filter, Check, AlertCircle, Loader2
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getJobRoles, submitResumeScan, getLatestScan, getStudentScans,
  getFacultyClassSummary, assignLearningResource, getHODMatrix, exportPlacementReport
} from "../../../api/placement";
import BottomSheet from "../../layout/BottomSheet";

export default function MobilePlacementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStudent = user?.role === "STUDENT";
  const isFaculty = user?.role === "FACULTY";
  const isHOD = user?.role === "HOD";
  const inchargeClass = user?.faculty_profile?.class_incharge_of;
  const isClassIncharge = Boolean(inchargeClass);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState("courses");
  const [selectedClassFilter, setSelectedClassFilter] = useState(inchargeClass || "UG_3B");
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isFaculty && inchargeClass) {
      setSelectedClassFilter(inchargeClass);
    }
  }, [isFaculty, inchargeClass]);

  // Fetch Roles
  const { data: rolesData } = useQuery({
    queryKey: ["placement-roles"],
    queryFn: getJobRoles,
  });

  const roles = rolesData?.roles || [];

  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id.toString());
    }
  }, [roles, selectedRoleId]);

  // Latest Scan Query
  const { data: latestScanData, isLoading: scanLoading, refetch: refetchLatestScan } = useQuery({
    queryKey: ["placement-latest-scan", selectedRoleId],
    queryFn: () => getLatestScan(selectedRoleId),
    enabled: isStudent && Boolean(selectedRoleId),
    refetchInterval: (query) => {
      const status = query.state.data?.scan?.status;
      return status === "PENDING" || status === "PROCESSING" ? 3000 : false;
    }
  });

  const currentScan = latestScanData?.scan;

  // Faculty Summary Query
  const { data: facultySummaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["placement-faculty-summary", selectedClassFilter],
    queryFn: () => getFacultyClassSummary(selectedClassFilter),
    enabled: isFaculty || isHOD,
  });

  // HOD Matrix Query
  const { data: hodMatrixData } = useQuery({
    queryKey: ["placement-hod-matrix"],
    queryFn: getHODMatrix,
    enabled: isHOD,
  });

  const handleResumeSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile || !selectedRoleId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("role_id", selectedRoleId);

      await submitResumeScan(formData);
      setResumeFile(null);
      setUploadSheetOpen(false);

      setTimeout(() => {
        refetchLatestScan();
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportPlacementReport();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Hive_Placement_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed.");
    }
  };

  return (
    <div className="space-y-4 pb-20 px-4 pt-4">
      {/* Mobile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F05A2B] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Placement AI</h1>
            <p className="text-[11px] text-slate-400 font-bold">Skill Gap & Readiness</p>
          </div>
        </div>

        {isStudent && (
          <button
            onClick={() => setUploadSheetOpen(true)}
            className="px-3 py-2 rounded-xl bg-[#F05A2B] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <UploadCloud className="w-4 h-4" /> Scan Resume
          </button>
        )}

        {isHOD && (
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-xl bg-[#F05A2B] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        )}
      </div>

      {/* ─── STUDENT MOBILE VIEW ────────────────────────────────────────────── */}
      {isStudent && (
        <div className="space-y-4">
          {/* Target Role Selector Pills */}
          <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] p-2 rounded-2xl flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {roles.map((r) => {
              const isSelected = selectedRoleId === r.id.toString();
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id.toString())}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-[#F05A2B] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-[#202024] text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>

          {scanLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#F05A2B]" /></div>
          ) : currentScan ? (
            <div className="space-y-4">
              {/* Score Display Card */}
              <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] p-5 rounded-3xl text-center space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Role Match Score</span>
                <div className="text-4xl font-black text-[#F05A2B]">{currentScan.match_score || 0}%</div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">{currentScan.role_name}</p>
              </div>

              {/* Skills Evidenced vs Missing */}
              <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] p-4 rounded-3xl space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-500 uppercase tracking-wider mb-2">Skills Evidenced</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(currentScan.matched_skills || []).map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-500">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#26262B]">
                  <h4 className="text-xs font-extrabold text-red-500 uppercase tracking-wider mb-2">Missing Skill Gaps</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(currentScan.missing_skills || []).map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-500">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Plan */}
              {currentScan.action_plan && (
                <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] p-4 rounded-3xl space-y-3">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">AI Action Plan</h3>
                  <div className="space-y-2">
                    {(currentScan.action_plan.recommended_courses || []).map((c, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-[#202024] text-xs font-bold text-slate-800 dark:text-slate-200">
                        🎓 {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center bg-white dark:bg-[#18181B] border border-dashed border-gray-200 dark:border-[#26262B] rounded-3xl p-6 space-y-3">
              <UploadCloud className="w-10 h-10 mx-auto text-[#F05A2B]" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">No Resume Evaluation Yet</h3>
              <p className="text-xs text-slate-400">Tap 'Scan Resume' above to upload your PDF resume and get AI placement guidance.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── FACULTY & HOD MOBILE VIEW ────────────────────────────────────────── */}
      {isFaculty && !isClassIncharge ? (
        <div className="py-12 text-center bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#26262B] rounded-3xl p-6 space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto text-[#F05A2B]" />
          <h3 className="font-black text-slate-900 dark:text-white text-sm">Access Restricted</h3>
          <p className="text-xs text-slate-400">Placement AI analytics is reserved for Class Incharges and HOD.</p>
        </div>
      ) : (isFaculty || isHOD) && (
        <div className="space-y-4">
          {/* Class Filter Bar */}
          <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] p-2 rounded-2xl flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {isHOD ? (
              ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedClassFilter(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedClassFilter === c
                      ? "bg-[#F05A2B] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-[#202024] text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {c.replace("_", " ")}
                </button>
              ))
            ) : (
              <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#F05A2B] text-white shadow-xs">
                Incharge Class: {selectedClassFilter.replace("_", " ")}
              </span>
            )}
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] p-3.5 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-slate-400">Total Students</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{facultySummaryData?.total_students || 0}</p>
            </div>
            <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] p-3.5 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-emerald-500">Job Ready (≥70%)</span>
              <p className="text-xl font-black text-emerald-500 mt-0.5">{facultySummaryData?.job_ready_count || 0}</p>
            </div>
          </div>

          {/* Student Cards List */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider px-1">
              Students Scorecards ({selectedClassFilter.replace("_", " ")})
            </h3>

            {(facultySummaryData?.students || []).map((s) => (
              <div key={s.student_id} className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#26262B] flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{s.target_role || "Not evaluated"}</p>
                </div>
                {s.latest_score !== null ? (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                    s.latest_score >= 70 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {s.latest_score}%
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px]">Pending</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── UPLOAD BOTTOM SHEET ─────────────────────────────────────────────── */}
      <BottomSheet open={uploadSheetOpen} onClose={() => setUploadSheetOpen(false)} title="Scan Resume for Placement AI">
        <form onSubmit={handleResumeSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Role</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#26262B] bg-slate-50 dark:bg-[#202024] text-xs font-bold text-slate-900 dark:text-white"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Resume PDF File</label>
            <input
              type="file"
              accept=".pdf"
              required
              onChange={(e) => setResumeFile(e.target.files[0] || null)}
              className="w-full mt-1 p-2 rounded-xl border border-gray-200 dark:border-[#26262B] bg-slate-50 dark:bg-[#202024] text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={!resumeFile || uploading}
            className="w-full py-3.5 rounded-xl bg-[#F05A2B] text-white text-xs font-extrabold shadow-sm active:scale-98 transition-all disabled:opacity-50"
          >
            {uploading ? "Analyzing Resume..." : "Run AI Evaluation"}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
