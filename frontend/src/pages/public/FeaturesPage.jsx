import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, Users, BookOpen, Lightbulb,
  Target, Award, TrendingUp, Code2, Cpu,
  FlaskConical, Globe2, ChevronRight, CheckCircle2,
  Zap, Shield, ArrowRight, BarChart2, ClipboardList,
  MessageSquare, Lock, Settings, Plus, Play,
  Send, FileText, Smartphone, Bell, Moon, Sun,
  Sparkles, Check, Info, Trash2, Database
} from "lucide-react";

export default function FeaturesPage() {
  // Simulator states
  const [activeSimTab, setActiveSimTab] = useState("projects"); // projects, classes, monitor, forum
  const [simTheme, setSimTheme] = useState("light"); // light, dark
  const [inviteToggle, setInviteToggle] = useState(true);
  const [likesCount, setLikesCount] = useState({ update: 42, forum1: 18, forum2: 24 });
  const [hasLiked, setHasLiked] = useState({ update: false, forum1: false, forum2: false });
  
  // Custom message simulation
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: "Dr. Sarah Jenkins", role: "Faculty", content: "Hi team, please share the database schema for review by this afternoon.", time: "10:15 AM", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
    { id: 2, sender: "Arjun Mehta", role: "Student", content: "Working on it, Dr. Sarah. We finished the ER diagram and are mapping PostgreSQL tables now. I'll upload the schema PDF here in 10 mins.", time: "10:28 AM", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
    { id: 3, sender: "Neha Rao", role: "Forum Coordinator", content: "Great progress! I've scheduled our internal milestone demo for Friday. HOD has been notified.", time: "10:35 AM", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" }
  ]);
  const [typedMessage, setTypedMessage] = useState("");
  const chatEndRef = useRef(null);

  // Auto-scroll chat simulation
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSendMessage = (text = "") => {
    const msgText = text || typedMessage;
    if (!msgText.trim()) return;
    
    const newMsg = {
      id: Date.now(),
      sender: "You (Simulated Student)",
      role: "Student",
      content: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"
    };
    
    setChatMessages(prev => [...prev, newMsg]);
    if (!text) setTypedMessage("");

    // Simulate faculty auto-reply after 1.5s
    if (msgText.toLowerCase().includes("schema") || msgText.toLowerCase().includes("upload") || msgText.toLowerCase().includes("done")) {
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "Dr. Sarah Jenkins",
            role: "Faculty",
            content: "Received! Clean layout. Let's make sure the primary keys are indexed for efficiency.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
          }
        ]);
      }, 1500);
    }
  };

  const handleLike = (id) => {
    setHasLiked(prev => {
      const updatedLike = !prev[id];
      setLikesCount(likes => ({
        ...likes,
        [id]: updatedLike ? likes[id] + 1 : likes[id] - 1
      }));
      return { ...prev, [id]: updatedLike };
    });
  };

  // Role section state
  const [activeRole, setActiveRole] = useState("hod"); // hod, faculty, student

  // ROI states
  const [studentsCount, setStudentsCount] = useState(350);
  const [projectsCount, setProjectsCount] = useState(65);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white pt-[72px]">
      
      {/* ── BACKGROUND AMBIENT GLOWS ── */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-50/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-40 left-1/4 w-[350px] h-[350px] bg-indigo-200/30 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute top-80 right-1/4 w-[400px] h-[400px] bg-violet-200/30 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />

      {/* ── HERO SECTION ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 shadow-sm mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-700 tracking-wider uppercase">Interactive Experience</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto mb-6">
          Everything you need to orchestrate{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
            Academic Projects
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-8">
          A premium, real-time portal bridging students, faculty coordinators, and HODs. Monitor timelines, centralize feedback, and scale academic research securely.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#sandbox"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <Play className="w-4 h-4 fill-white" />
            Try Interactive Sandbox
          </a>
          <a
            href="#roi"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Calculate Time Saved
          </a>
        </div>
      </section>

      {/* ── SANDBOX CONTAINER (THE CORE WORKSPACE SIMULATOR) ── */}
      <section id="sandbox" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Sandbox Simulator</h2>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">
            Interact with this simulated mockup of the DPMS dashboard to explore our key modules in real-time.
          </p>
        </div>

        {/* ── MOCK DESKTOP INTERFACE ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[580px] max-w-6xl mx-auto transition-all duration-300">
          
          {/* Mock Side Navbar */}
          <div className="w-full lg:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
            {/* Header controls & Brand */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-sm">
                  DP
                </div>
                <div>
                  <span className="font-bold text-white text-sm tracking-wide block">DPMS Portal</span>
                  <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Department Workspace</span>
                </div>
              </div>
              
              {/* Window Controls */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              </div>
            </div>

            {/* Simulated Sidebar tabs */}
            <div className="p-3 space-y-1.5 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 py-2">
                Core Modules
              </div>
              
              <button
                onClick={() => setActiveSimTab("projects")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                  activeSimTab === "projects"
                    ? "bg-slate-800 text-white shadow-inner border-l-4 border-indigo-500"
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <ClipboardList className={`w-4 h-4 ${activeSimTab === "projects" ? "text-indigo-400" : "text-slate-400"}`} />
                <span>Projects Hub</span>
                {activeSimTab === "projects" && <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />}
              </button>

              <button
                onClick={() => setActiveSimTab("classes")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                  activeSimTab === "classes"
                    ? "bg-slate-800 text-white shadow-inner border-l-4 border-indigo-500"
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <Users className={`w-4 h-4 ${activeSimTab === "classes" ? "text-indigo-400" : "text-slate-400"}`} />
                <span>Classes &amp; Access</span>
                <span className="ml-auto bg-indigo-900/60 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold">8</span>
              </button>

              <button
                onClick={() => setActiveSimTab("monitor")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                  activeSimTab === "monitor"
                    ? "bg-slate-800 text-white shadow-inner border-l-4 border-indigo-500"
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${activeSimTab === "monitor" ? "text-indigo-400" : "text-slate-400"}`} />
                <span>Progress Monitor</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </button>

              <button
                onClick={() => setActiveSimTab("forum")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                  activeSimTab === "forum"
                    ? "bg-slate-800 text-white shadow-inner border-l-4 border-indigo-500"
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <Globe2 className={`w-4 h-4 ${activeSimTab === "forum" ? "text-indigo-400" : "text-slate-400"}`} />
                <span>Forum Board</span>
              </button>

              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 pt-6 pb-2">
                Simulated Controls
              </div>
              <div className="px-3 py-2 space-y-3">
                {/* Simulator theme toggler */}
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                  <span>Theme Preview:</span>
                  <button
                    onClick={() => setSimTheme(t => t === "light" ? "dark" : "light")}
                    className="p-1.5 rounded-md bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
                    title="Toggle Theme of this simulated UI"
                  >
                    {simTheme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  </button>
                </div>
                
                <div className="text-[11px] text-slate-400 leading-normal bg-indigo-950/40 border border-indigo-900/40 p-3 rounded-lg">
                  <div className="flex gap-1.5 mb-1 font-semibold text-indigo-400">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Try Toggling!</span>
                  </div>
                  Clicking the buttons, toggle switches, or typing messages alters the live mockup.
                </div>
              </div>
            </div>

            {/* Simulated Admin Profile Card */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md">
                HOD
              </div>
              <div>
                <span className="font-bold text-white text-xs block">Dr. A. K. Shastri</span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block animate-pulse" />
                  HOD Account
                </span>
              </div>
            </div>
          </div>

          {/* ── Simulated Main Dashboard Workspace Content ── */}
          <div className={`flex-1 flex flex-col min-h-[500px] transition-colors duration-300 ${
            simTheme === "light" ? "bg-slate-50 text-slate-800" : "bg-slate-950 text-slate-200"
          }`}>
            {/* Top Workspace Bar */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  simTheme === "light" ? "bg-indigo-50 text-indigo-600" : "bg-indigo-900/60 text-indigo-300"
                }`}>
                  Live Preview
                </span>
                <span className="text-slate-400 text-xs">/</span>
                <span className="text-xs font-semibold capitalize text-slate-500">{activeSimTab}</span>
              </div>

              {/* Mock search */}
              <div className="relative max-w-xs hidden sm:block">
                <input
                  type="text"
                  placeholder="Search project, students..."
                  disabled
                  className={`w-48 text-[11px] py-1.5 pl-3 pr-8 rounded-lg border focus:outline-none cursor-not-allowed ${
                    simTheme === "light"
                      ? "bg-slate-100/50 border-slate-200 text-slate-400"
                      : "bg-slate-800 border-slate-700 text-slate-500"
                  }`}
                />
              </div>
            </div>

            {/* Dashboard Workspace Inner viewport */}
            <div className="flex-1 p-6 relative">
              
              {/* ── SUB-TAB: PROJECTS HUB ── */}
              {activeSimTab === "projects" && (
                <div className="animate-fade-in space-y-5">
                  {/* Cards Strip */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Projects", val: "28", icon: ClipboardList, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                      { label: "In Progress", val: "19", icon: Cpu, color: "text-amber-500", bg: "bg-amber-500/10" },
                      { label: "Completed", val: "9", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                      { label: "Low Activity", val: "3", icon: AlertWarningIcon, color: "text-rose-500", bg: "bg-rose-500/10" }
                    ].map((stat, idx) => {
                      const Icon = stat.icon;
                      return (
                        <div key={idx} className={`p-3 rounded-xl border ${
                          simTheme === "light" ? "bg-white border-slate-200/80 shadow-sm" : "bg-slate-900 border-slate-800/80"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">{stat.label}</span>
                            <span className={`p-1 rounded-md ${stat.bg} ${stat.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                          </div>
                          <div className="text-xl font-bold mt-1.5">{stat.val}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Projects Table */}
                  <div className={`rounded-xl border overflow-hidden ${
                    simTheme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"
                  }`}>
                    <div className={`p-4 border-b flex items-center justify-between ${
                      simTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                    }`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Active Department Projects</h4>
                      <button className="text-[10px] px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 flex items-center gap-1 shadow-sm">
                        <Plus className="w-3 h-3" /> Create Project
                      </button>
                    </div>

                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className={`border-b ${simTheme === "light" ? "border-slate-100 bg-slate-50/50 text-slate-400" : "border-slate-800 bg-slate-900/40 text-slate-500"}`}>
                            <th className="p-3 font-semibold">Title &amp; Desc</th>
                            <th className="p-3 font-semibold">Lead Faculty</th>
                            <th className="p-3 font-semibold">Team Size</th>
                            <th className="p-3 font-semibold">Status</th>
                            <th className="p-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {[
                            { title: "Autonomous Quadcopter", desc: "ArduPilot integration for obstacle detection", faculty: "Dr. Sarah Jenkins", team: 4, status: "In Progress", pill: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
                            { title: "Smart Crop Irrigation", desc: "IoT sensor grid tracking soil moisture", faculty: "Prof. Rajesh Kumar", team: 3, status: "Low Activity", pill: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
                            { title: "Campus Attendance Hub", desc: "Facial recognition using thermal cameras", faculty: "Dr. Sarah Jenkins", team: 5, status: "Completed", pill: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
                          ].map((proj, index) => (
                            <tr key={index} className={`hover:bg-indigo-500/5 transition-colors ${simTheme === "light" ? "text-slate-700" : "text-slate-300"}`}>
                              <td className="p-3 max-w-[200px]">
                                <div className="font-semibold text-slate-900 dark:text-white truncate">{proj.title}</div>
                                <div className="text-[10px] text-slate-400 truncate">{proj.desc}</div>
                              </td>
                              <td className="p-3 font-medium">{proj.faculty}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{proj.team} Students</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${proj.pill}`}>
                                  {proj.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setActiveSimTab("monitor")}
                                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                                >
                                  View Monitor
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: CLASSES & ACCESS ── */}
              {activeSimTab === "classes" && (
                <div className="animate-fade-in space-y-6">
                  {/* Explanation card */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                    simTheme === "light" ? "bg-indigo-50/50 border-indigo-100" : "bg-indigo-950/20 border-indigo-900/40"
                  }`}>
                    <Shield className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1">Interactive Sandbox Controls</h4>
                      <p className="text-slate-500 dark:text-slate-400 leading-normal">
                        Each class card has its own **invite toggle**. Turn off the toggle to disable student signups for that class instantly, preventing unauthorized entries. Try clicking the toggle below!
                      </p>
                    </div>
                  </div>

                  {/* Class cards grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Simulated card: UG 3A */}
                    <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                      simTheme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Class Profile</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            inviteToggle
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                          }`}>
                            {inviteToggle ? "Invite Active" : "Invite Disabled"}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold">UG — 3A</h3>
                        <p className="text-[11px] text-slate-400 mt-1">Class Incharge: **Dr. Sarah Jenkins**</p>
                        
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className={`p-2 rounded-lg border text-center ${simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"}`}>
                            <div className="text-[10px] text-slate-400">Students</div>
                            <div className="text-sm font-bold">58</div>
                          </div>
                          <div className={`p-2 rounded-lg border text-center ${simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"}`}>
                            <div className="text-[10px] text-slate-400">Forum Members</div>
                            <div className="text-sm font-bold">4</div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive toggle control */}
                      <div className={`mt-5 pt-4 border-t flex items-center justify-between ${
                        simTheme === "light" ? "border-slate-100" : "border-slate-800"
                      }`}>
                        <span className="text-[10px] font-semibold text-slate-400">Student Invite Link:</span>
                        <button
                          onClick={() => setInviteToggle(!inviteToggle)}
                          className={`w-11 h-6 rounded-full transition-all duration-200 relative p-0.5 ${
                            inviteToggle ? "bg-indigo-600" : "bg-slate-400"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full bg-white block shadow-md transform transition-all duration-200 ${
                            inviteToggle ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>
                    </div>

                    {/* Standard Mock cards */}
                    {[
                      { name: "UG — 3B", incharge: "Prof. Rajesh Kumar", students: 56, forum: 3 },
                      { name: "UG — 2A", incharge: "Dr. M. S. Pillai", students: 60, forum: "N/A" }
                    ].map((cls, idx) => (
                      <div key={idx} className={`p-5 rounded-xl border opacity-75 ${
                        simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Class Profile</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                            Invites Disabled
                          </span>
                        </div>
                        <h3 className="text-lg font-bold">{cls.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">Class Incharge: **{cls.incharge}**</p>
                        
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className={`p-2 rounded-lg border text-center ${simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"}`}>
                            <div className="text-[10px] text-slate-400">Students</div>
                            <div className="text-sm font-bold">{cls.students}</div>
                          </div>
                          <div className={`p-2 rounded-lg border text-center ${simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"}`}>
                            <div className="text-[10px] text-slate-400">Forum Members</div>
                            <div className="text-sm font-bold">{cls.forum}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: PROGRESS MONITOR CHAT ── */}
              {activeSimTab === "monitor" && (
                <div className="animate-fade-in flex flex-col h-[400px] border rounded-xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800">
                  {/* Chat Header */}
                  <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                    simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse" />
                      <span className="text-xs font-bold">Progress Chat: Autonomous Quadcopter</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">4 Members Online</span>
                  </div>

                  {/* Scrollable messages container */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-none min-h-0">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className="flex items-start gap-2.5">
                        <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200 dark:border-slate-800" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{msg.sender}</span>
                            <span className="text-[9px] text-indigo-500 font-semibold bg-indigo-500/5 px-1 rounded">{msg.role}</span>
                            <span className="text-[8px] text-slate-400 font-medium">{msg.time}</span>
                          </div>
                          <div className={`mt-1 p-2 rounded-lg text-xs leading-relaxed max-w-[85%] border shadow-sm ${
                            msg.sender.startsWith("You")
                              ? "bg-indigo-600 text-white border-indigo-700 rounded-tl-none"
                              : simTheme === "light"
                                ? "bg-white text-slate-700 border-slate-200/80 rounded-tl-none"
                                : "bg-slate-800 text-slate-300 border-slate-700/80 rounded-tl-none"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Simulator Typing Helpers */}
                  <div className={`px-4 py-2 border-t flex flex-wrap gap-1.5 ${
                    simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  }`}>
                    <span className="text-[9px] text-slate-400 font-bold uppercase self-center mr-1">Predefined Answers:</span>
                    {[
                      "Hi Dr. Sarah, upload database schema draft.",
                      "Milestone 2 completed. Core hardware tested.",
                      "Requesting access grant for junior students."
                    ].map((text, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(text)}
                        className={`text-[9px] px-2 py-1 rounded-md border font-medium transition-colors ${
                          simTheme === "light"
                            ? "bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                        }`}
                      >
                        {text}
                      </button>
                    ))}
                  </div>

                  {/* Input form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className={`p-3 border-t flex gap-2 ${
                      simTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <input
                      type="text"
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      placeholder="Type simulated message..."
                      className={`flex-1 text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        simTheme === "light"
                          ? "bg-white border-slate-200 text-slate-700"
                          : "bg-slate-850 border-slate-750 text-slate-200"
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* ── SUB-TAB: FORUM BOARD ── */}
              {activeSimTab === "forum" && (
                <div className="animate-fade-in space-y-4">
                  {[
                    {
                      id: "forum1",
                      author: "Rahul Varma (UG-3A Student)",
                      title: "Optimized Database Indexing Guidelines for Semester Projects",
                      content: "Hey teams! If you're designing application APIs, remember to index your ForeignKey fields like `student_id` or `class_id`. It drops query latency from O(N) to O(log N) as DB records scale.",
                      tag: "Research & Development",
                      hasDoc: true
                    },
                    {
                      id: "forum2",
                      author: "Dr. Sarah Jenkins (Faculty Advisor)",
                      title: "Call for Research Project Nominations: IEEE AI/ML Expo",
                      content: "The IEEE chapter has announced nominations for regional student projects. Submissions are open for autonomous hardware and agricultural IoT models.",
                      tag: "Notification",
                      hasDoc: false
                    }
                  ].map((post, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${
                      simTheme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-indigo-500" : "bg-amber-500"}`} />
                          <span className="text-[10px] text-slate-400 font-bold tracking-wide">{post.author}</span>
                        </div>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                          simTheme === "light" ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400"
                        }`}>{post.tag}</span>
                      </div>

                      <h4 className="text-sm font-bold mb-1.5">{post.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3.5">{post.content}</p>

                      {post.hasDoc && (
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between mb-3.5 max-w-sm ${
                          simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"
                        }`}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-500" />
                            <div>
                              <div className="text-[11px] font-bold">indexing_guide_v2.pdf</div>
                              <div className="text-[9px] text-slate-400">1.2 MB — Cloudinary Secure Storage</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 cursor-not-allowed">Download</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 text-[11px] font-bold py-1 px-2.5 rounded-full transition-colors ${
                            hasLiked[post.id]
                              ? "bg-rose-500/10 text-rose-500"
                              : simTheme === "light"
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-500"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          <span>{likesCount[post.id]} Likes</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* ── ROLE-BASED WORKFLOWS (HOD, FACULTY, STUDENT) ── */}
      <section className="bg-slate-100/60 border-y border-slate-200/80 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-2 block">Personalized Experience</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customized Workflows for Every Role</h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              DPMS adapts to who you are, serving the specific dashboard features and tools you need.
            </p>

            {/* Role switchers */}
            <div className="flex items-center justify-center p-1 bg-slate-200/80 border border-slate-200 rounded-xl max-w-md mx-auto mt-8">
              {[
                { key: "hod", label: "HOD / Admin", icon: Shield },
                { key: "faculty", label: "Faculty Mentor", icon: Users },
                { key: "student", label: "Student Team", icon: GraduationCap }
              ].map(role => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.key}
                    onClick={() => setActiveRole(role.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                      activeRole === role.key
                        ? "bg-white text-indigo-600 shadow-md"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workflow details rendering */}
          <div className="max-w-5xl mx-auto mt-12 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-10 flex flex-col md:flex-row items-center gap-10">
            
            <div className="flex-1 space-y-6">
              {activeRole === "hod" && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Total Department Orchestration</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">
                    As the Head of Department, you retain administrative authority over the workspace structure. Generate project allocations, coordinate guides, and view overall analytics in real-time.
                  </p>
                  
                  <ul className="space-y-3.5 text-xs text-slate-600">
                    {[
                      "Global toggle to enable/disable faculty signups instantly.",
                      "Allocate project structures and assign student groups with cross-role exclusivity checking.",
                      "Approve and restrict visibility on forum posts to keep communications professional.",
                      "Review auto-flagged 'Low Activity' projects that have stalled for over 3 days."
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {activeRole === "faculty" && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-violet-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Mentor &amp; Guide Classroom Portals</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">
                    Keep your student teams aligned. Faculty members manage their designated classes and coordinate specific projects, reducing overhead updates and centralizing reports.
                  </p>

                  <ul className="space-y-3.5 text-xs text-slate-600">
                    {[
                      "Toggle invite link permission per-class if assigned as Class Incharge.",
                      "Grant direct class list review access to other faculty members instantly.",
                      "Contribute reviews and download technical logs/materials directly from project timelines.",
                      "Appointed Update Coordinators can post official public feed notifications."
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {activeRole === "student" && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Seamless Student Teamwork Hub</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">
                    No more lost emails, WhatsApp groups, or misplaced documentation. Students use secure Google Sign-In linked directly to their class and register details.
                  </p>

                  <ul className="space-y-3.5 text-xs text-slate-600">
                    {[
                      "Locked class onboarding ensures zero errors on signup data entry.",
                      "Post progress logs, PDF schemas, zip codes, and files safely in the Progress Monitor chat.",
                      "Receive real-time push alerts via Firebase on updates and team announcements.",
                      "Qualified 3rd-year students can act as Forum Members, writing technical articles."
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="flex-1 w-full max-w-sm">
              <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Interface Module</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block animate-pulse" />
                </div>
                
                {/* Visual interface details based on role */}
                {activeRole === "hod" && (
                  <div className="space-y-3 text-xs text-slate-400">
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Faculty Invite Toggles:</span>
                      <span className="font-bold text-emerald-400">ON</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Database Connections:</span>
                      <span className="font-bold text-slate-300">AWS PostgreSQL</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Project Audit Reports:</span>
                      <span className="text-xs text-indigo-400 font-semibold cursor-not-allowed">Download CSV</span>
                    </div>
                  </div>
                )}

                {activeRole === "faculty" && (
                  <div className="space-y-3 text-xs text-slate-400">
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Class Assigned:</span>
                      <span className="font-bold text-violet-400">UG - 3A (Incharge)</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Class Invite Toggles:</span>
                      <span className="font-bold text-emerald-400">Active</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Student Approvals:</span>
                      <span className="font-bold text-slate-300">2 Pending Review</span>
                    </div>
                  </div>
                )}

                {activeRole === "student" && (
                  <div className="space-y-3 text-xs text-slate-400">
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Assigned Projects:</span>
                      <span className="font-bold text-amber-400">Autonomous Quadcopter</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Classroom Locked to:</span>
                      <span className="font-bold text-slate-300">UG - 3A (Register Only)</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                      <span>Push Token Status:</span>
                      <span className="font-bold text-emerald-400">Active FCM</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 leading-normal text-center">
                  Live database records sync permissions instantly in backend Flask routes.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── INTERACTIVE ROI / PRODUCTIVITY CALCULATOR ── */}
      <section id="roi" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-2 block font-mono">Calculator</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Calculate Your Department's ROI</h2>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">
            Adjust the sliders below to estimate the productivity hours gained and thread counts reduced using the DPMS portal.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto grid md:grid-cols-12 gap-0">
          {/* Sliders Area */}
          <div className="md:col-span-7 p-6 sm:p-10 space-y-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              Adjust Metrics
            </h3>

            {/* Slider 1 */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Students</label>
                <span className="text-lg font-extrabold text-indigo-600">{studentsCount} students</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={studentsCount}
                onChange={(e) => setStudentsCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>50 Students</span>
                <span>1,000 Students</span>
              </div>
            </div>

            {/* Slider 2 */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Projects</label>
                <span className="text-lg font-extrabold text-indigo-600">{projectsCount} projects</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={projectsCount}
                onChange={(e) => setProjectsCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>5 Projects</span>
                <span>200 Projects</span>
              </div>
            </div>
          </div>

          {/* Outputs Area */}
          <div className="md:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-6">Weekly Time &amp; Sync Savings</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="text-slate-400 text-xs font-medium">Estimated Coordination Hours Saved</div>
                  <div className="text-3xl font-extrabold tracking-tight text-white mt-1">
                    ~{(projectsCount * 2.5).toFixed(0)} <span className="text-sm font-normal text-slate-300">hrs/week</span>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-xs font-medium">Redundant Message Threads Stopped</div>
                  <div className="text-3xl font-extrabold tracking-tight text-white mt-1">
                    ~{(studentsCount * 11.5).toFixed(0)} <span className="text-sm font-normal text-slate-300">threads</span>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-xs font-medium">Status Latency Reduction</div>
                  <div className="text-3xl font-extrabold tracking-tight text-emerald-400 mt-1">
                    100% Instant <span className="text-xs font-normal text-slate-300">via Progress Monitor</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-indigo-800 text-[10px] text-slate-400 leading-normal">
              Based on empirical department workflows shifting from scattered channels to unified DPMS databases.
            </div>
          </div>
        </div>
      </section>

      {/* ── TECH STACK DETAILS (GRID OF MODERN TOKENS) ── */}
      <section className="bg-slate-100/60 border-t border-slate-200/80 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-2 block font-mono">Architecture</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Production-Grade Infrastructure</h2>
            <p className="text-slate-500 mt-2 max-w-lg mx-auto">
              DPMS isn't a prototype. It's built with high-throughput backend models, solid database normalization, and robust push delivery engines.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Code2, title: "React & Tailwind CSS", desc: "A client application with unified, atomic CSS variables supporting instant theme toggles and crisp layouts.", tech: "Vite + PostCSS" },
              { icon: Cpu, title: "Flask REST API", desc: "Python-powered endpoint controller using SQLAlchemy ORM and Alembic migrations. Secure cookie-based JWT sessions.", tech: "Python Flask" },
              { icon: Database, title: "PostgreSQL Database", desc: "Highly indexed tables storing account profiles, class invite states, project listings, and roles.", tech: "Postgres 16" },
              { icon: Bell, title: "Firebase & FCM", desc: "Uses Cloud Messaging for push notices and cloud Firestore for Progress Monitor chats to bypass WebSocket overhead.", tech: "FCM SDK" },
              { icon: FileText, title: "Cloudinary Media Service", desc: "Automated encryption and optimized storage of image mockups, source codes, and PDF semester reports.", tech: "Cloudinary API" },
              { icon: Shield, title: "AWS Fargate Deployment", desc: "Production containerization scaling automatically through Application Load Balancers (ALB) and CloudFront CDNs.", tech: "Docker + ECS" }
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <div key={idx} className="group bg-white rounded-xl border border-slate-200/85 p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-sm font-bold text-slate-900">{st.title}</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{st.tech}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CALL-TO-ACTION (CTA) ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl p-10 sm:p-14 text-center">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-6">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[11px] font-semibold text-white/95 tracking-wide">Enterprise Setup</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight leading-snug">
              Boost your Academic Quality today
            </h2>
            
            <p className="text-indigo-200/80 text-xs sm:text-sm leading-relaxed mb-8 max-w-md mx-auto">
              Empower your students, guide your mentors, and manage project milestones with confidence. Setup requires zero custom infrastructure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold text-xs hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 transition-all duration-200"
              >
                <Shield className="w-3.5 h-3.5" />
                Go to Portal Login
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 backdrop-blur-sm"
              >
                Read About Us
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 bg-white text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>
            &copy; {new Date().getFullYear()} DPMS — Department Project Management System. All rights reserved.
          </p>
          <p className="tracking-wide">Built for excellence in computer science education.</p>
        </div>
      </footer>

    </div>
  );
}

// Temporary internal component for simulated warning icon to avoid missing packages
function AlertWarningIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
