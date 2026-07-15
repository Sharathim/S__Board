import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDeveloperTelemetry, listDeveloperUsers, grantHodAccess,
  setUserRole, deleteDeveloperUser, getDeveloperAllData
} from "../../api/developer";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  ShieldAlert, Database, Users, Crown, Sparkles, Server,
  Cpu, Activity, Search, Trash2, CheckCircle2, AlertTriangle,
  UserCheck, Terminal, Layers, ArrowUpRight, Lock, RefreshCw,
  FolderKanban, FileText, Megaphone, Radio
} from "lucide-react";

const DEVELOPER_EMAILS = ["rathisha273@gmail.com", "ashok.j2346@gmail.com"];

export default function GoatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isDevAuthorized = user && DEVELOPER_EMAILS.includes(user.email?.toLowerCase());

  const [activeTab, setActiveTab] = useState("telemetry");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Grant HOD state
  const [hodEmail, setHodEmail] = useState("");
  const [grantHodSuccessMsg, setGrantHodSuccessMsg] = useState("");
  const [grantHodErrorMsg, setGrantHodErrorMsg] = useState("");

  // Delete confirm
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);

  // Queries
  const { data: telemetryData, isLoading: telemetryLoading, refetch: refetchTelemetry } = useQuery({
    queryKey: ["developer-telemetry"],
    queryFn: () => getDeveloperTelemetry().then(r => r.data),
    enabled: isDevAuthorized,
    refetchInterval: 15000,
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["developer-users", roleFilter, userSearch],
    queryFn: () => listDeveloperUsers({
      role: roleFilter === "ALL" ? undefined : roleFilter,
      search: userSearch || undefined,
    }).then(r => r.data),
    enabled: isDevAuthorized && activeTab === "users",
  });

  const { data: omniData, isLoading: omniLoading, refetch: refetchOmni } = useQuery({
    queryKey: ["developer-omni"],
    queryFn: () => getDeveloperAllData().then(r => r.data),
    enabled: isDevAuthorized && activeTab === "omni",
  });

  // Mutations
  const grantHodMutation = useMutation({
    mutationFn: (email) => grantHodAccess(email),
    onSuccess: (res) => {
      setGrantHodSuccessMsg(res.data.message);
      setGrantHodErrorMsg("");
      setHodEmail("");
      refetchTelemetry();
      refetchUsers();
    },
    onError: (err) => {
      setGrantHodErrorMsg(err.response?.data?.error || "Failed to grant HOD access.");
      setGrantHodSuccessMsg("");
    }
  });

  const setRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => setUserRole(userId, role),
    onSuccess: () => {
      refetchUsers();
      refetchTelemetry();
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => deleteDeveloperUser(userId),
    onSuccess: () => {
      setDeleteTargetUser(null);
      refetchUsers();
      refetchTelemetry();
    }
  });

  // Access Denied Screen if unauthorized
  if (!isDevAuthorized) {
    return (
      <div className="min-h-screen bg-[#030712] text-amber-500 flex flex-col items-center justify-center p-6 relative overflow-hidden font-mono">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 backdrop-blur-2xl text-center space-y-6 shadow-2xl shadow-amber-500/10 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-block">
              RESTRICTED // GOAT DIRECTIVE 9
            </span>
            <h1 className="text-2xl font-black text-white tracking-wider uppercase">ACCESS DENIED</h1>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              This terminal is reserved exclusively for system developers. Unauthorized access attempts are logged.
            </p>
          </div>
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-left text-[11px] text-amber-400/80 space-y-1 font-mono">
            <div>&gt; CURRENT_USER: {user?.email || "ANONYMOUS"}</div>
            <div>&gt; STATUS: UNAUTHORIZED</div>
            <div>&gt; ACCESS_KEYS: [rathisha273@gmail.com, ashok.j2346@gmail.com]</div>
          </div>
        </div>
      </div>
    );
  }

  const telemetry = telemetryData || {};
  const metrics = telemetry.metrics || {};
  const tables = telemetry.tables || [];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 sm:p-6 md:p-8 font-sans relative overflow-x-hidden">
      {/* Background Cyber Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[160px]" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">

        {/* Top Developer Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-slate-900/80 border border-amber-500/30 rounded-3xl backdrop-blur-xl shadow-2xl shadow-amber-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">GOAT PANEL</h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  GOD LEVEL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Developer Console // Active User: <span className="text-amber-400 font-bold">{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SYSTEM: {telemetry.status || "ACTIVE"}</span>
            </div>
            <button
              onClick={() => {
                refetchTelemetry();
                if (activeTab === "users") refetchUsers();
                if (activeTab === "omni") refetchOmni();
              }}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-x-auto scrollbar-none">
          {[
            { id: "telemetry", label: "DB Telemetry", icon: Database },
            { id: "provision", label: "HOD Elevator", icon: Crown },
            { id: "users", label: "User Directory", icon: Users },
            { id: "omni", label: "Omni Control", icon: ShieldAlert },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: DB Telemetry */}
        {activeTab === "telemetry" && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900/60 border border-amber-500/20 rounded-2xl backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>DATABASE STORAGE</span>
                  <Database className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white tracking-tight font-mono">
                  {telemetry.db_size_mb ? `${telemetry.db_size_mb} MB` : telemetry.db_size_pretty || "Calculating..."}
                </div>
                <p className="text-[10px] text-amber-400/80 font-mono">PostgreSQL Data Footprint</p>
              </div>

              <div className="p-5 bg-slate-900/60 border border-indigo-500/20 rounded-2xl backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>TOTAL USERS</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-black text-white tracking-tight font-mono">
                  {metrics.total_users || 0}
                </div>
                <p className="text-[10px] text-indigo-400/80 font-mono">
                  HOD: {metrics.hod_users || 0} | Faculty: {metrics.faculty_users || 0} | Students: {metrics.student_users || 0}
                </p>
              </div>

              <div className="p-5 bg-slate-900/60 border border-emerald-500/20 rounded-2xl backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>ACTIVE PROJECTS</span>
                  <FolderKanban className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white tracking-tight font-mono">
                  {metrics.total_projects || 0}
                </div>
                <p className="text-[10px] text-emerald-400/80 font-mono">Monitored Student Projects</p>
              </div>

              <div className="p-5 bg-slate-900/60 border border-rose-500/20 rounded-2xl backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>NOTES & ASSETS</span>
                  <FileText className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-3xl font-black text-white tracking-tight font-mono">
                  {metrics.total_notes_files || 0}
                </div>
                <p className="text-[10px] text-rose-400/80 font-mono">Uploaded Documents & Files</p>
              </div>
            </div>

            {/* Table Distribution & System Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tables Breakdown */}
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" /> Database Table Record Distribution
                  </h3>
                </div>

                <div className="space-y-3">
                  {tables.map(t => (
                    <div key={t.table} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300 font-bold">{t.table}</span>
                        <span className="text-amber-400 font-black">{t.count} rows</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (t.count / Math.max(1, metrics.total_users || 1)) * 50)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Server Activity & Telemetry Summary */}
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" /> Platform System Telemetry
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block mb-1">Department Updates</span>
                    <span className="text-lg font-bold text-slate-200">{metrics.total_updates || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block mb-1">Forum Posts</span>
                    <span className="text-lg font-bold text-slate-200">{metrics.total_forum_posts || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block mb-1">Total Notifications</span>
                    <span className="text-lg font-bold text-slate-200">{metrics.total_notifications || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block mb-1">Server UTC Time</span>
                    <span className="text-[11px] font-bold text-amber-400 truncate block">
                      {telemetry.server_time ? new Date(telemetry.server_time).toLocaleTimeString() : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase font-mono">
                    <Sparkles className="w-4 h-4" /> Developer Note
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    As Developer GODs, all platform endpoints enforce real-time checks for <span className="font-mono text-amber-300">rathisha273@gmail.com</span> and <span className="font-mono text-amber-300">ashok.j2346@gmail.com</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOD Provisioning & Elevator */}
        {activeTab === "provision" && (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="p-8 bg-slate-900/90 border border-amber-500/30 rounded-3xl backdrop-blur-2xl space-y-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white font-mono uppercase">Direct HOD Provisioning</h2>
                  <p className="text-xs text-slate-400">Instantly grant straight HOD authority to any user email.</p>
                </div>
              </div>

              {grantHodSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{grantHodSuccessMsg}</span>
                </div>
              )}

              {grantHodErrorMsg && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{grantHodErrorMsg}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!hodEmail.trim()) return;
                  grantHodMutation.mutate(hodEmail.trim());
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                    Target User Email Address
                  </label>
                  <input
                    type="email"
                    value={hodEmail}
                    onChange={(e) => setHodEmail(e.target.value)}
                    placeholder="e.g. hod.department@gmail.com"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    The user must have logged in at least once via Google authentication to initialize their user entry.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={grantHodMutation.isPending || !hodEmail.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-[0.99] text-slate-950 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>{grantHodMutation.isPending ? "PROVISIONING..." : "GRANT HOD ACCESS NOW"}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: Master User Directory */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-fade-in">
            {/* Controls Header */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search user name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {["ALL", "HOD", "FACULTY", "STUDENT"].map(r => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      roleFilter === r
                        ? "bg-amber-500 text-slate-950 font-black"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="py-20 text-center"><Spinner /></div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 text-[10px] uppercase font-mono tracking-widest text-slate-400 border-b border-slate-800">
                        <th className="p-4">User</th>
                        <th className="p-4">Current Role</th>
                        <th className="p-4">Metadata</th>
                        <th className="p-4 text-right">Role Elevation / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                      {(usersData?.users || []).map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {u.profile_picture ? (
                                <img src={u.profile_picture} alt={u.name} className="w-8 h-8 rounded-full ring-1 ring-slate-700 object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                                  {u.name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white">{u.name}</div>
                                <div className="text-[10px] text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              u.role === "HOD"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : u.role === "FACULTY"
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-slate-800 text-slate-300"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-[11px] text-slate-400">
                            {u.student && (
                              <div>Class: <span className="text-slate-200">{u.student.class_name || "N/A"}</span> | Reg: <span className="text-slate-200">{u.student.register_number || "N/A"}</span></div>
                            )}
                            {u.faculty && (
                              <div>Dept: <span className="text-slate-200">{u.faculty.department || "N/A"}</span></div>
                            )}
                            {!u.student && !u.faculty && <span className="italic">N/A</span>}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Quick Role Elevation */}
                              <select
                                value={u.role}
                                onChange={(e) => setRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/50"
                              >
                                <option value="HOD">Set HOD</option>
                                <option value="FACULTY">Set FACULTY</option>
                                <option value="STUDENT">Set STUDENT</option>
                              </select>

                              {/* Delete User */}
                              {!DEVELOPER_EMAILS.includes(u.email?.toLowerCase()) && (
                                <button
                                  onClick={() => setDeleteTargetUser(u)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Omni Control */}
        {activeTab === "omni" && (
          <div className="space-y-6 animate-fade-in">
            {omniLoading ? (
              <div className="py-20 text-center"><Spinner /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Global Projects Overview */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-emerald-400" /> Platform Projects Directory
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 font-mono text-xs">
                    {(omniData?.projects || []).map(p => (
                      <div key={p.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-500">By {p.created_by} | {p.members_count} members</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Global Updates Overview */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" /> Recent Department Announcements
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 font-mono text-xs">
                    {(omniData?.updates || []).map(u => (
                      <div key={u.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                        <div className="text-slate-300 font-medium">{u.content}</div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>Author: {u.author}</span>
                          <span>{u.created_at ? new Date(u.created_at).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Delete User Confirm Modal */}
      <ConfirmDialog
        open={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        onConfirm={() => deleteUserMutation.mutate(deleteTargetUser?.id)}
        title="GOD LEVEL USER DELETION"
        message={`Are you sure you want to permanently delete user '${deleteTargetUser?.name}' (${deleteTargetUser?.email})? This action is irreversible.`}
        confirmText="HARD DELETE"
        danger
      />
    </div>
  );
}
