import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, UploadCloud, CheckCircle2, AlertTriangle, FileText,
  BookOpen, Rocket, Award, Download, Users, Plus, RefreshCw,
  Search, ExternalLink, ChevronRight, Layers, Sparkles, Filter, Check, AlertCircle, Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getJobRoles, submitResumeScan, getLatestScan, getStudentScans,
  getFacultyClassSummary, assignLearningResource, getLearningAssignments,
  getHODMatrix, getCompanyCriteria, createCompanyCriteria, getEligibleStudents,
  exportPlacementReport
} from "../../api/placement";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";

// ─── Score Gauge Component ──────────────────────────────────────────────────
function CircularScoreGauge({ score = 0 }) {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  let strokeColor = "#F05A2B"; // Brand terracotta
  if (normalizedScore >= 70) strokeColor = "#10B981"; // Emerald
  else if (normalizedScore >= 40) strokeColor = "#F59E0B"; // Amber

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-36 h-36 transform -rotate-90">
        <circle
          cx="72"
          cy="72"
          r={radius}
          className="stroke-gray-200 dark:stroke-[#2E2E34]"
          strokeWidth="10"
          fill="transparent"
        />
        <circle
          cx="72"
          cy="72"
          r={radius}
          stroke={strokeColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{normalizedScore}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Job Match</span>
      </div>
    </div>
  );
}

// ─── Main Placement Page ────────────────────────────────────────────────────
export default function PlacementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStudent = user?.role === "STUDENT";
  const isFaculty = user?.role === "FACULTY";
  const isHOD = user?.role === "HOD";
  const inchargeClass = user?.faculty_profile?.class_incharge_of;
  const isClassIncharge = Boolean(inchargeClass);

  // Student State
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState("");
  const [activeActionTab, setActiveActionTab] = useState("courses");
  const fileInputRef = useRef(null);

  // Faculty State
  const [selectedClassFilter, setSelectedClassFilter] = useState(inchargeClass || "UG_3B");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ skill_name: "", resource_title: "", resource_url: "", resource_type: "course", student_id: null });
  const [submittingAssign, setSubmittingAssign] = useState(false);

  useEffect(() => {
    if (isFaculty && inchargeClass) {
      setSelectedClassFilter(inchargeClass);
    }
  }, [isFaculty, inchargeClass]);

  // HOD State
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState({ company_name: "", role_id: "", min_match_score: 70, min_cgpa: "6.5", required_skills_input: "" });
  const [submittingCriteria, setSubmittingCriteria] = useState(false);
  const [selectedCriteriaId, setSelectedCriteriaId] = useState(null);

  // Fetch Roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["placement-roles"],
    queryFn: getJobRoles,
  });

  const roles = rolesData?.roles || [];

  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id.toString());
    }
  }, [roles, selectedRoleId]);

  // Student Latest Scan Query
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

  // Student Scans History Query
  const { data: scansHistoryData } = useQuery({
    queryKey: ["placement-student-scans"],
    queryFn: getStudentScans,
    enabled: isStudent,
  });

  // Faculty Summary Query
  const { data: facultySummaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["placement-faculty-summary", selectedClassFilter],
    queryFn: () => getFacultyClassSummary(selectedClassFilter),
    enabled: isFaculty || isHOD,
  });

  // HOD Matrix Query
  const { data: hodMatrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["placement-hod-matrix"],
    queryFn: getHODMatrix,
    enabled: isHOD,
  });

  // HOD Company Criteria Query
  const { data: criteriaData, refetch: refetchCriteria } = useQuery({
    queryKey: ["placement-company-criteria"],
    queryFn: getCompanyCriteria,
    enabled: isHOD,
  });

  // Eligible Students Query
  const { data: eligibleData, isLoading: eligibleLoading } = useQuery({
    queryKey: ["placement-eligible-students", selectedCriteriaId],
    queryFn: () => getEligibleStudents(selectedCriteriaId),
    enabled: isHOD && Boolean(selectedCriteriaId),
  });

  // Handle Resume Upload & Submission
  const handleResumeSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile) return;
    if (!selectedRoleId) return;

    setUploading(true);
    setScanStatusMsg("Uploading resume and preparing AI evaluation...");

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("role_id", selectedRoleId);

      const res = await submitResumeScan(formData);
      setScanStatusMsg("AI evaluation in progress...");
      setResumeFile(null);

      setTimeout(() => {
        refetchLatestScan();
        queryClient.invalidateQueries({ queryKey: ["placement-student-scans"] });
      }, 1500);
    } catch (err) {
      setScanStatusMsg("");
      alert(err.response?.data?.error || "Failed to submit resume scan.");
    } finally {
      setUploading(false);
    }
  };

  // Handle Learning Assignment Submit
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.skill_name || !assignForm.resource_title) return;

    setSubmittingAssign(true);
    try {
      await assignLearningResource({
        class_name: selectedClassFilter,
        student_id: assignForm.student_id,
        skill_name: assignForm.skill_name,
        resource_title: assignForm.resource_title,
        resource_url: assignForm.resource_url,
        resource_type: assignForm.resource_type
      });
      setAssignModalOpen(false);
      setAssignForm({ skill_name: "", resource_title: "", resource_url: "", resource_type: "course", student_id: null });
      alert("Learning resource assigned successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Assignment failed.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Handle Company Criteria Submit
  const handleCriteriaSubmit = async (e) => {
    e.preventDefault();
    if (!criteriaForm.company_name || !criteriaForm.role_id) return;

    setSubmittingCriteria(true);
    try {
      const skillsArr = criteriaForm.required_skills_input
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      await createCompanyCriteria({
        company_name: criteriaForm.company_name,
        role_id: parseInt(criteriaForm.role_id),
        min_match_score: parseInt(criteriaForm.min_match_score),
        min_cgpa: criteriaForm.min_cgpa,
        required_skills: skillsArr
      });
      setCriteriaModalOpen(false);
      setCriteriaForm({ company_name: "", role_id: "", min_match_score: 70, min_cgpa: "6.5", required_skills_input: "" });
      refetchCriteria();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create company criteria.");
    } finally {
      setSubmittingCriteria(false);
    }
  };

  // Export Excel Report
  const handleExportReport = async () => {
    try {
      const res = await exportPlacementReport();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Hive_Placement_Readiness_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed. Please try again.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F05A2B] to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">AI Placement Guidance</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isStudent
                ? "Evaluate your resume against target job roles and close skill gaps with AI insights"
                : isFaculty
                ? "Class placement readiness analytics & targeted skill gap intervention"
                : "Department placement matrix, recruiter benchmarks, and report exports"}
            </p>
          </div>
        </div>

        {/* Top Header Action Buttons */}
        <div className="flex items-center gap-3">
          {isHOD && (
            <>
              <Button onClick={() => setCriteriaModalOpen(true)} variant="secondary" className="gap-2 shrink-0 text-xs">
                <Plus className="w-4 h-4" /> Add Company Criteria
              </Button>
              <Button onClick={handleExportReport} className="gap-2 shrink-0 text-xs">
                <Download className="w-4 h-4" /> Export Report (Excel)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── STUDENT VIEW ──────────────────────────────────────────────────────── */}
      {isStudent && (
        <div className="space-y-6">
          {/* Target Role Selector & Upload Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Target Role Card */}
            <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#F05A2B] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Step 1: Select Target Career Role
              </div>

              {rolesLoading ? (
                <div className="py-6 flex justify-center"><Spinner size="md" /></div>
              ) : (
                <div className="space-y-2">
                  {roles.map((r) => {
                    const isSelected = selectedRoleId === r.id.toString();
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRoleId(r.id.toString())}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-[#F05A2B]/10 border-[#F05A2B] text-gray-900 dark:text-white shadow-xs"
                            : "bg-gray-50 dark:bg-[#202024] border-gray-100 dark:border-[#26262B] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-[#3F3F46]"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs font-extrabold truncate">{r.name}</h4>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">{r.skills.join(" • ")}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#F05A2B] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resume Upload Box */}
            <div className="lg:col-span-2 bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#F05A2B] uppercase tracking-wider mb-2">
                  <UploadCloud className="w-4 h-4" /> Step 2: Upload Your Resume (PDF)
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Upload your latest PDF resume. Our Groq AI engine parses your technical skills, projects, and certifications against the target role requirements.
                </p>
              </div>

              <form onSubmit={handleResumeSubmit} className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-[#2E2E34] hover:border-[#F05A2B] dark:hover:border-[#F05A2B] p-6 rounded-2xl text-center bg-gray-50/50 dark:bg-[#202024] cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                >
                  <FileText className="w-8 h-8 text-[#F05A2B] opacity-80" />
                  {resumeFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{resumeFile.name}</p>
                      <p className="text-[10px] text-gray-400">{(resumeFile.size / 1024).toFixed(1)} KB PDF</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Click or drag resume PDF here</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Max size 10MB • Text-based PDF only</p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files[0] || null)}
                  className="hidden"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{scanStatusMsg}</span>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!resumeFile || uploading}
                    loading={uploading}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Run AI Evaluation
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* AI Scan Result Dashboard */}
          {scanLoading ? (
            <div className="py-12 flex justify-center"><Spinner size="lg" /></div>
          ) : currentScan ? (
            <div className="space-y-6">
              {/* Scan Status Banner if Processing */}
              {(currentScan.status === "PENDING" || currentScan.status === "PROCESSING") && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-600 dark:text-amber-400">
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold">AI Evaluation in Progress</h4>
                    <p className="text-[11px] opacity-90">Groq AI is analyzing your skills against target requirements. Results will auto-update in seconds.</p>
                  </div>
                </div>
              )}

              {currentScan.status === "FAILED" && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold">Evaluation Error</h4>
                    <p className="text-[11px]">{currentScan.error_message || "Failed to analyze resume. Please re-upload a clear text PDF."}</p>
                  </div>
                </div>
              )}

              {currentScan.status === "COMPLETE" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Gauge Card */}
                  <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                    <CircularScoreGauge score={currentScan.match_score} />
                    <div>
                      <h3 className="font-extrabold text-gray-900 dark:text-white text-base">{currentScan.role_name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Target Role Compatibility Summary
                      </p>
                    </div>
                  </div>

                  {/* Skills Found vs Missing Grid */}
                  <div className="lg:col-span-2 bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-6 rounded-3xl shadow-sm space-y-5">
                    {/* Skills Evidenced */}
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                        <CheckCircle2 className="w-4 h-4" /> Skills Evidenced in Resume ({currentScan.matched_skills.length})
                      </h4>
                      {currentScan.matched_skills.length === 0 ? (
                        <p className="text-xs text-gray-400">No core skills explicitly matched.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentScan.matched_skills.map((skill, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skill Gaps */}
                    <div className="pt-2 border-t border-gray-100 dark:border-[#26262B]">
                      <h4 className="text-xs font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                        <AlertTriangle className="w-4 h-4" /> Missing Skill Gaps ({currentScan.missing_skills.length})
                      </h4>
                      {currentScan.missing_skills.length === 0 ? (
                        <p className="text-xs text-emerald-500 font-bold">Outstanding! You match all target skill requirements.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentScan.missing_skills.map((skill, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Plan Tabs Card */}
              {currentScan.status === "COMPLETE" && currentScan.action_plan && (
                <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-6 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#26262B] pb-3">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-[#F05A2B]" />
                      <h3 className="font-black text-gray-900 dark:text-white text-base">AI Personalized Action Plan</h3>
                    </div>

                    {/* Tabs Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#202024] p-1 rounded-xl">
                      <button
                        onClick={() => setActiveActionTab("courses")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeActionTab === "courses"
                            ? "bg-white dark:bg-[#27272A] text-gray-900 dark:text-white shadow-xs"
                            : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        Courses ({currentScan.action_plan.recommended_courses?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveActionTab("projects")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeActionTab === "projects"
                            ? "bg-white dark:bg-[#27272A] text-gray-900 dark:text-white shadow-xs"
                            : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        Projects ({currentScan.action_plan.suggested_projects?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveActionTab("resume")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeActionTab === "resume"
                            ? "bg-white dark:bg-[#27272A] text-gray-900 dark:text-white shadow-xs"
                            : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        Resume Tips ({currentScan.action_plan.resume_improvements?.length || 0})
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="pt-2">
                    {activeActionTab === "courses" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(currentScan.action_plan.recommended_courses || []).map((course, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#202024] border border-gray-100 dark:border-[#26262B] flex items-start gap-3">
                            <BookOpen className="w-5 h-5 text-[#F05A2B] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-extrabold text-gray-900 dark:text-white">{course}</p>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">Recommended NPTEL / Online Certification</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeActionTab === "projects" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(currentScan.action_plan.suggested_projects || []).map((proj, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#202024] border border-gray-100 dark:border-[#26262B] flex items-start gap-3">
                            <Rocket className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-extrabold text-gray-900 dark:text-white">{proj}</p>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">Practical Portfolio Project</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeActionTab === "resume" && (
                      <div className="space-y-2.5">
                        {(currentScan.action_plan.resume_improvements || []).map((tip, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#202024] border border-gray-100 dark:border-[#26262B] flex items-start gap-3">
                            <Award className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ─── FACULTY & HOD SUMMARY VIEW ───────────────────────────────────────── */}
      {isFaculty && !isClassIncharge ? (
        <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-12 rounded-3xl text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-[#F05A2B] mx-auto opacity-80" />
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto font-medium">
            Placement AI analytics is reserved for Class Incharges and HOD. Contact your department administrator for access.
          </p>
        </div>
      ) : (isFaculty || isHOD) && (
        <div className="space-y-6">
          {/* Class Filter Bar */}
          <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-3 rounded-2xl shadow-sm flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Class:
            </span>
            {isHOD ? (
              ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedClassFilter(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedClassFilter === c
                      ? "bg-[#F05A2B] text-white shadow-sm"
                      : "bg-gray-100 dark:bg-[#202024] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#27272A]"
                  }`}
                >
                  {c.replace("_", " ")}
                </button>
              ))
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#F05A2B] text-white shadow-sm">
                Incharge Class: {selectedClassFilter.replace("_", " ")}
              </span>
            )}
          </div>

          {/* Stat Summary Tiles */}
          {summaryLoading ? (
            <div className="py-8 flex justify-center"><Spinner size="md" /></div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Class Students</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{facultySummaryData?.total_students || 0}</p>
              </div>

              <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Job Ready (≥70%)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{facultySummaryData?.job_ready_count || 0}</p>
              </div>

              <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Moderate (40-69%)</p>
                <p className="text-2xl font-black text-amber-500 mt-1">{facultySummaryData?.moderate_count || 0}</p>
              </div>

              <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-4 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Needs Support (&lt;40%)</p>
                <p className="text-2xl font-black text-red-500 mt-1">{facultySummaryData?.needs_support_count || 0}</p>
              </div>
            </div>
          )}

          {/* Class Skill Deficits & Student Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Skill Deficits Card */}
            <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-5 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F05A2B]" /> Class Skill Deficits
              </h3>
              <div className="space-y-2">
                {(facultySummaryData?.top_skill_gaps || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No skill gaps recorded yet.</p>
                ) : (
                  facultySummaryData.top_skill_gaps.map((gap, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#202024] border border-gray-100 dark:border-[#26262B]">
                      <span className="text-xs font-extrabold text-gray-900 dark:text-white">{gap.skill_name}</span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                        {gap.count} students lack
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Student Scorecards Table */}
            <div className="lg:col-span-2 bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-5 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F05A2B]" /> Student Placement Scorecards ({selectedClassFilter.replace("_", " ")})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-[#26262B] text-gray-400 uppercase tracking-wider font-bold">
                      <th className="pb-3">Student</th>
                      <th className="pb-3">Target Role</th>
                      <th className="pb-3">Match Score</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]">
                    {(facultySummaryData?.students || []).map((s) => (
                      <tr key={s.student_id} className="hover:bg-gray-50/50 dark:hover:bg-[#202024]/50 transition-colors">
                        <td className="py-3 pr-2">
                          <p className="font-bold text-gray-900 dark:text-white">{s.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{s.roll_number || "No Roll"}</p>
                        </td>
                        <td className="py-3 pr-2 text-gray-600 dark:text-gray-300 font-medium">
                          {s.target_role || <span className="text-gray-400 italic">Not evaluated</span>}
                        </td>
                        <td className="py-3 pr-2">
                          {s.latest_score !== null ? (
                            <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                              s.latest_score >= 70
                                ? "bg-emerald-500/10 text-emerald-500"
                                : s.latest_score >= 40
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-red-500/10 text-red-500"
                            }`}>
                              {s.latest_score}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Pending</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="secondary"
                            className="text-[11px] py-1 px-2.5 h-auto rounded-lg"
                            onClick={() => {
                              setAssignForm(p => ({ ...p, student_id: s.student_id }));
                              setAssignModalOpen(true);
                            }}
                          >
                            Assign Course
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── HOD BATCH MATRIX & RECRUITER ELIGIBILITY ─────────────────────────── */}
      {isHOD && (
        <div className="space-y-6 pt-4">
          <div className="border-t border-gray-200 dark:border-[#2E2E34] pt-6">
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">Department Batch Placement Matrix</h2>

            {matrixLoading ? (
              <div className="py-8 flex justify-center"><Spinner size="md" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(hodMatrixData?.matrix || []).map((b) => (
                  <div key={b.class_name} className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-4 rounded-2xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase text-white bg-[#F05A2B] rounded-md">
                        {b.class_name.replace("_", " ")}
                      </span>
                      <span className="text-xs font-black text-gray-900 dark:text-white">{b.avg_match_score}% Avg</span>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                      <span>Students: <b>{b.total_students}</b></span>
                      <span>Job Ready: <b className="text-emerald-500">{b.job_ready_count}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Company Criteria & Eligibility Modal */}
          {criteriaData?.criterias && criteriaData.criterias.length > 0 && (
            <div className="bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
                Recruiter Criteria & Eligible Candidates Filter
              </h3>

              <div className="flex flex-wrap gap-2">
                {criteriaData.criterias.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCriteriaId(c.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedCriteriaId === c.id
                        ? "bg-[#F05A2B] border-[#F05A2B] text-white shadow-sm"
                        : "bg-gray-50 dark:bg-[#202024] border-gray-100 dark:border-[#26262B] text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {c.company_name} ({c.role_name} • Min {c.min_match_score}%)
                  </button>
                ))}
              </div>

              {eligibleLoading ? (
                <div className="py-6 flex justify-center"><Spinner size="md" /></div>
              ) : eligibleData ? (
                <div className="pt-3 border-t border-gray-100 dark:border-[#26262B]">
                  <p className="text-xs font-bold text-[#F05A2B] mb-3">
                    {eligibleData.eligible_students_count} Qualified Student(s) for {eligibleData.criteria?.company_name}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {eligibleData.students.map((st) => (
                      <div key={st.student_id} className="p-3 rounded-2xl bg-gray-50 dark:bg-[#202024] border border-gray-100 dark:border-[#26262B] flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-gray-900 dark:text-white">{st.name}</p>
                          <p className="text-[10px] text-gray-400">{st.class_name.replace("_", " ")} • {st.roll_number || "No Roll"}</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-500">
                          {st.match_score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}
      {/* Assign Learning Resource Modal */}
      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Learning Resource">
        <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Skill Gap Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Docker, TypeScript, System Design"
              value={assignForm.skill_name}
              onChange={(e) => setAssignForm(p => ({ ...p, skill_name: e.target.value }))}
              className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#202024] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Resource / Course Title</label>
            <input
              type="text"
              required
              placeholder="e.g. NPTEL Cloud Computing & DevOps Masterclass"
              value={assignForm.resource_title}
              onChange={(e) => setAssignForm(p => ({ ...p, resource_title: e.target.value }))}
              className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#202024] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Resource URL (Optional)</label>
            <input
              type="url"
              placeholder="https://nptel.ac.in/courses/..."
              value={assignForm.resource_url}
              onChange={(e) => setAssignForm(p => ({ ...p, resource_url: e.target.value }))}
              className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#202024] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submittingAssign}>Assign Resource</Button>
          </div>
        </form>
      </Modal>

      {/* Add Company Criteria Modal */}
      <Modal open={criteriaModalOpen} onClose={() => setCriteriaModalOpen(false)} title="Add Recruiter Eligibility Criteria">
        <form onSubmit={handleCriteriaSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Company Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Zoho, TCS, Accenture"
              value={criteriaForm.company_name}
              onChange={(e) => setCriteriaForm(p => ({ ...p, company_name: e.target.value }))}
              className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#202024] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Role</label>
            <select
              required
              value={criteriaForm.role_id}
              onChange={(e) => setCriteriaForm(p => ({ ...p, role_id: e.target.value }))}
              className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#202024] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]"
            >
              <option value="">Select Target Role</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Min Match Score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={criteriaForm.min_match_score}
                onChange={(e) => setCriteriaForm(p => ({ ...p, min_match_score: e.target.value }))}
                className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#202024] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Min CGPA</label>
              <input
                type="text"
                value={criteriaForm.min_cgpa}
                onChange={(e) => setCriteriaForm(p => ({ ...p, min_cgpa: e.target.value }))}
                className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#202024] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setCriteriaModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submittingCriteria}>Save Company Criteria</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
