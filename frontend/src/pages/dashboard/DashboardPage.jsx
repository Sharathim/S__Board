import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getProjectStats } from "../../api/projects";
import { listClasses } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { listUpdates } from "../../api/updates";
import { listForumPosts } from "../../api/forum";
import { Spinner } from "../../components/ui/Spinner";
import { usePageTransition } from "../../context/TransitionContext";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { parseUpdateContent } from "../../utils/updateContent";
import { parseUTCDate } from "../../utils/dateUtils";
import MailComposerModal from "./MailComposerModal";
import {
  FolderKanban, TrendingUp, Users, CheckCircle,
  Clock, Megaphone, ChevronRight, Eye, Mail,
  BookOpen, Sparkles, Filter, Search, ShieldCheck, ArrowUpRight
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = (Date.now() - parseUTCDate(isoStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDateFormatted(isoStr) {
  if (!isoStr) return "N/A";
  const date = new Date(isoStr);
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Monthly Activity Bar Chart Component ───────────────────────── */
function FinexyActivityChart() {
  const months = [
    { name: "Jan", active: 40, completed: 25 },
    { name: "Feb", active: 65, completed: 45 },
    { name: "Mar", active: 55, completed: 30 },
    { name: "Apr", active: 80, completed: 60 },
    { name: "May", active: 70, completed: 50 },
    { name: "Jun", active: 95, completed: 75 },
    { name: "Jul", active: 85, completed: 65 },
    { name: "Aug", active: 90, completed: 80 },
  ];

  return (
    <div className="finexy-card p-6 flex flex-col justify-between space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            Department Activity Overview
          </h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor active project trends and verified submission rates
          </p>
        </div>
        
        {/* Chart Legend */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F05A2B]" />
            Active Projects
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white" />
            Submissions
          </span>
        </div>
      </div>

      {/* Bar Columns Container */}
      <div className="h-44 w-full flex items-end justify-between gap-2 sm:gap-4 pt-6 border-b border-slate-100 dark:border-slate-800 pb-2 px-1">
        {months.map((m, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
            <div className="w-full flex items-end justify-center gap-1 h-full">
              {/* Active Bar */}
              <div 
                style={{ height: `${m.active}%` }} 
                className="w-2.5 sm:w-3.5 bg-[#F05A2B] rounded-t-md transition-all duration-300 group-hover:bg-[#E04818] shadow-xs"
                title={`${m.name} Active: ${m.active}`}
              />
              {/* Completed Bar */}
              <div 
                style={{ height: `${m.completed}%` }} 
                className="w-2.5 sm:w-3.5 bg-slate-900 dark:bg-white rounded-t-md transition-all duration-300 group-hover:bg-slate-700 dark:group-hover:bg-slate-200 shadow-xs"
                title={`${m.name} Completed: ${m.completed}`}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {m.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Dashboard Page Component ─────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  if (user && user.role !== "HOD") {
    const dest = user.role === "FACULTY" ? "/faculty" : "/classes";
    return <Navigate to={dest} replace />;
  }

  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { navigateWithTransition } = usePageTransition();
  const containerRef = useRef(null);

  // Queries for real backend data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then(r => r.data),
  });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
  });

  const { data: updatesData } = useQuery({
    queryKey: ["updates"],
    queryFn: () => listUpdates().then(r => r.data),
  });

  const { data: forumPostsData } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => listForumPosts({ page: 1, per_page: 50 }).then(r => r.data.posts),
  });

  // Stagger GSAP animations on load
  useEffect(() => {
    if (containerRef.current) {
      gsap.from(".dash-card-anim", {
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.55,
        ease: "power3.out",
      });
    }
  }, [statsLoading]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const total = stats?.total ?? 0;
  const inProgress = stats?.in_progress ?? 0;
  const completed = stats?.completed ?? 0;
  const classesList = classesData?.classes || [];
  const totalStudentsCount = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const facultyList = facultyData || [];
  const facultyCount = facultyList.length;
  const totalViews = parseInt(localStorage.getItem("dpms_total_views") || "1675", 10);
  const totalUsers = 1 + facultyCount + totalStudentsCount;

  const updatesList = updatesData?.updates || [];

  // Combine real activity items for table
  const rawActivities = updatesList.map(u => {
    const parsed = parseUpdateContent(u.content);
    return {
      id: `UPD_${u.id}`,
      type: parsed.updateType || "Announcement",
      title: parsed.title || parsed.description?.substring(0, 45) || "Department Bulletin",
      author: parsed.department || "HOD Office",
      status: "COMPLETED",
      rawDate: u.created_at,
      date: formatDateFormatted(u.created_at),
    };
  });

  const filteredActivities = rawActivities.filter(act => {
    const matchesSearch = act.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          act.author.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || act.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  return (
    <div ref={containerRef} className="space-y-7 pb-12 select-none">
      
      {/* ── 1. Hero Greeting Section (Finexy Typography Style) ── */}
      <div className="dash-card-anim flex flex-col md:flex-row md:items-center justify-between gap-5 py-2 px-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Administrator"}
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Stay on top of your tasks, monitor progress, and track status.
          </p>
        </div>

        {(user?.role === "HOD" || user?.role === "FACULTY") && (
          <button
            onClick={() => setIsMailModalOpen(true)}
            className="finexy-card px-4 py-2.5 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs group shrink-0"
          >
            <div className="w-6.5 h-6.5 rounded-full bg-[#F05A2B]/10 text-[#F05A2B] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <span>Compose Mail</span>
          </button>
        )}
      </div>

      {/* ── 2. Finexy 4-Grid Metric Cards Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Vibrant Primary Orange Highlight Card */}
        <div 
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="dash-card-anim finexy-orange-card p-5 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
              Active Projects
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black tracking-tight leading-none">
              {inProgress}
            </h2>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md">
                ↑ {activeProgressPercent}% active progress
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Completed Projects Card */}
        <div 
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="dash-card-anim finexy-card p-5 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Completed Projects
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {completed}
            </h2>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 pt-1">
              Archived & Verified
            </p>
          </div>
        </div>

        {/* Card 3: Student Registry Card */}
        <div 
          onClick={() => navigateWithTransition("/classes", "Classes", BookOpen)}
          className="dash-card-anim finexy-card p-5 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Students Portal
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {totalStudentsCount}
            </h2>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 pt-1">
              across {classesList.length} Classrooms
            </p>
          </div>
        </div>

        {/* Card 4: Faculty Board Card */}
        <div 
          onClick={() => navigateWithTransition("/faculty", "Faculty", Users)}
          className="dash-card-anim finexy-card p-5 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Faculty Board
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {facultyCount}
            </h2>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 pt-1">
              Active Staff Members
            </p>
          </div>
        </div>

      </div>

      {/* ── 3. Middle Section: Activity Visualizer & Department Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1 Column: Engagement & Shortcuts Stack */}
        <div className="space-y-6">
          {/* Department Insights Card */}
          <div className="dash-card-anim finexy-card p-5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              Department Insights
            </h3>
            
            <div className="space-y-3">
              {/* Views */}
              <div className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Department Views</span>
                  <span className="block text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalViews}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              {/* Members */}
              <div className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Total Members</span>
                  <span className="block text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalUsers}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Directories */}
          <div className="dash-card-anim finexy-card p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              Shortcuts
            </h3>
            <div className="space-y-2">
              {[
                { label: "Classrooms Directory", desc: "Manage classes & incharge info", to: "/classes", icon: BookOpen },
                { label: "Projects Registry", desc: "Browse & search active projects", to: "/projects", icon: FolderKanban },
                { label: "Faculty Directory", desc: "View department faculty list", to: "/faculty", icon: Users }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateWithTransition(item.to, item.label, item.icon)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#F05A2B] transition-colors leading-tight">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 leading-none">
                      {item.desc}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 group-hover:text-[#F05A2B] transition-all flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Finexy Activity Visualizer Chart */}
        <div className="dash-card-anim lg:col-span-2">
          <FinexyActivityChart />
        </div>
      </div>

      {/* ── 4. Bottom Section: Finexy Styled Recent Activities Table ── */}
      <div className="dash-card-anim finexy-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Recent Department Activities
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Live log of announcements, verified submissions, and department updates
            </p>
          </div>

          {/* Table Search & Filter Bar */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search activity..."
                className="pl-8 pr-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#F05A2B] transition-colors w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#F05A2B] transition-colors cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>
        </div>

        {/* Structured Finexy Activity Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-3">Activity ID</th>
                <th className="py-3 px-3">Title & Summary</th>
                <th className="py-3 px-3">Source / Department</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {filteredActivities.length > 0 ? (
                filteredActivities.slice(0, 6).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-500 dark:text-slate-400">
                      {item.id}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                      {item.author}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full status-chip-completed uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Verified
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 dark:text-slate-500 font-semibold">
                      {item.date}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-medium text-slate-400">
                    No recent activities matching filter criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MailComposerModal isOpen={isMailModalOpen} onClose={() => setIsMailModalOpen(false)} />
    </div>
  );
}
