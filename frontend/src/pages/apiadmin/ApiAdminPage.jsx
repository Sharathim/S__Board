import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { listApiKeys, createApiKey, deleteApiKey, toggleApiKey } from "../../api/apiAdmin";
import { Spinner } from "../../components/ui/Spinner";
import {
  Key, Shield, ShieldAlert, Sparkles, Copy, Check, Trash2, 
  Terminal, FileText, CheckCircle2, AlertTriangle, Lock, 
  ExternalLink, LogOut, ArrowLeft, RefreshCw, Eye, EyeOff, BookOpen, Layers
} from "lucide-react";

const AUTHORIZED_EMAIL = "ashok.j2346@gmail.com";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function ApiAdminPage() {
  const { user, firebaseUser, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const queryClient = useQueryClient();

  const [keyName, setKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState(null); // { raw_key, key }
  const [copiedKey, setCopiedKey] = useState(false);
  const [showRawKey, setShowRawKey] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("keys"); // "keys" | "claude" | "docs"
  const [loginPending, setLoginPending] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const currentEmail = (firebaseUser?.email || user?.email || "").toLowerCase();
  const isAuthorized = currentEmail === AUTHORIZED_EMAIL.toLowerCase();

  // Fetch API keys
  const { data, isLoading: keysLoading, refetch } = useQuery({
    queryKey: ["api-admin-keys"],
    queryFn: () => listApiKeys().then((r) => r.data),
    enabled: isAuthorized,
  });

  const keys = data?.keys || [];

  // Create Key Mutation
  const createMutation = useMutation({
    mutationFn: (name) => createApiKey({ name }),
    onSuccess: (res) => {
      setCreatedKey(res.data);
      setKeyName("");
      setErrorMsg("");
      queryClient.invalidateQueries(["api-admin-keys"]);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || "Failed to generate API Key.");
    },
  });

  // Delete Key Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteApiKey(id),
    onSuccess: () => {
      setDeleteConfirmId(null);
      queryClient.invalidateQueries(["api-admin-keys"]);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || "Failed to delete API Key.");
    },
  });

  // Toggle Key Mutation
  const toggleMutation = useMutation({
    mutationFn: (id) => toggleApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["api-admin-keys"]);
    },
  });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleGoogleLogin = async () => {
    try {
      setLoginPending(true);
      setErrorMsg("");
      await loginWithGoogle();
    } catch (err) {
      setErrorMsg(err?.message || "Failed to sign in with Google.");
    } finally {
      setLoginPending(false);
    }
  };

  // ─── 1. Loading State ───
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Spinner className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-medium tracking-wide text-slate-400">Verifying administrator authorization...</p>
      </div>
    );
  }

  // ─── 2. Not Logged In Screen ───
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 tracking-wider uppercase">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Secure Admin Portal</span>
          </div>
        </header>

        {/* Login Box */}
        <main className="relative z-10 max-w-md w-full mx-auto px-6 py-8">
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl shadow-indigo-950/50 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
              <Key className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block">
                RESTRICTED // NOTES API GATEWAY
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">API Admin Portal</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate and manage API keys for Claude Code and automated notes publishing.
              </p>
            </div>

            {/* Email restriction callout */}
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl text-left space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px] uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Access Requirement
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This endpoint is exclusively restricted to <span className="font-mono text-indigo-200 font-bold bg-indigo-900/60 px-1 py-0.5 rounded">{AUTHORIZED_EMAIL}</span>.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-200 text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loginPending}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 active:scale-[0.99] transition-all shadow-md shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginPending ? (
                <>
                  <Spinner className="w-4 h-4 text-slate-900 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-600">
          S-DESK Hive Academic Gateway &bull; Notes API Controller
        </footer>
      </div>
    );
  }

  // ─── 3. Logged In But Unauthorized Screen ───
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

        <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </header>

        <main className="relative z-10 max-w-md w-full mx-auto px-6 py-8">
          <div className="bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 inline-block">
                ACCESS DENIED
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">Unauthorized Account</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are signed in with an account that is not permitted to generate Notes API keys.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-left space-y-1.5 text-xs font-mono">
              <div className="text-slate-400 text-[11px]">&gt; Signed In As:</div>
              <div className="text-red-300 font-bold break-all">{currentEmail || "Unknown"}</div>
              <div className="text-slate-400 text-[11px] pt-1">&gt; Authorized Administrator:</div>
              <div className="text-emerald-400 font-bold">{AUTHORIZED_EMAIL}</div>
            </div>

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Switch Account
            </button>
          </div>
        </main>

        <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-600">
          S-DESK Hive Academic Gateway &bull; Access Policy Enforced
        </footer>
      </div>
    );
  }

  // ─── 4. Authorized Admin Dashboard (ashok.j2346@gmail.com) ───
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Key className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm tracking-tight">S-DESK</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">
                  Notes API Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Scoped API Keys for Claude Code</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-medium">{AUTHORIZED_EMAIL}</span>
              <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded font-mono">ADMIN</span>
            </div>

            <Link
              to="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
            >
              Portal Dashboard
            </Link>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 text-red-300 border border-red-900/40 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 relative z-10">
        
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900/90 to-slate-900/80 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal Access Token Generator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Automate Notes Publishing with Claude Code
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Generate secure API keys that allow Claude Code to organize syllabus resources, create subject blocks, add units, and upload lecture notes and PDFs directly into S-DESK.
            </p>

            {/* Scope Callout Badge */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scope: <strong className="text-white font-mono">notes_management</strong></span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Allowed Paths: <strong className="text-white font-mono">/api/classes/*/notes/*</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Newly Created Key Alert Banner */}
        {createdKey && (
          <div className="relative rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 p-6 space-y-4 shadow-xl shadow-emerald-950/20 animate-slide-up">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">API Key Generated Successfully!</h3>
                  <p className="text-xs text-slate-400">
                    Copy your API key now. For your security, it will <strong className="text-amber-300">never be shown again</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                Dismiss
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 overflow-hidden font-mono text-xs sm:text-sm">
                <span className="text-slate-500 select-none">API_KEY:</span>
                <span className="text-emerald-400 font-bold truncate">
                  {showRawKey ? createdKey.raw_key : "•".repeat(40)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowRawKey(!showRawKey)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 flex items-center gap-1.5"
                  title={showRawKey ? "Hide key" : "Show key"}
                >
                  {showRawKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showRawKey ? "Hide" : "Show"}</span>
                </button>
                <button
                  onClick={() => handleCopy(createdKey.raw_key)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Key</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generate Key Form */}
        <div className="rounded-3xl bg-slate-900/70 border border-slate-800/80 p-6 sm:p-7 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Generate New Notes API Key</span>
          </div>
          <p className="text-xs text-slate-400">
            Create an API key with specific label so you can track which client or device is using it.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(keyName);
            }}
            className="flex flex-col sm:flex-row items-center gap-3 pt-2"
          >
            <input
              type="text"
              placeholder="e.g. Claude Code - Notes Agent (MacBook / Office PC)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 shrink-0"
            >
              {createMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Key</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Tab switcher: Keys list vs Claude Code guide vs Endpoints documentation */}
        <div className="flex border-b border-slate-800 gap-2">
          {[
            { id: "keys", label: `Active Keys (${keys.length})`, icon: Key },
            { id: "claude", label: "How to Use with Claude Code", icon: Terminal },
            { id: "docs", label: "Notes API Documentation", icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === id
                  ? "border-indigo-500 text-white bg-indigo-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: Keys List */}
        {activeTab === "keys" && (
          <div className="space-y-4">
            {keysLoading ? (
              <div className="p-12 text-center text-slate-500">
                <Spinner className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-500" />
                <p className="text-xs">Loading active API keys...</p>
              </div>
            ) : keys.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-slate-400 space-y-3">
                <Key className="w-8 h-8 mx-auto text-slate-600" />
                <div className="text-sm font-semibold text-slate-300">No API Keys Generated Yet</div>
                <p className="text-xs max-w-sm mx-auto text-slate-500">
                  Generate your first key above to give Claude Code access to upload and organize lecture notes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Key Name</th>
                      <th className="py-3.5 px-4 font-semibold">Key Identifier</th>
                      <th className="py-3.5 px-4 font-semibold">Scope</th>
                      <th className="py-3.5 px-4 font-semibold">Created At</th>
                      <th className="py-3.5 px-4 font-semibold">Last Used</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white">
                          {k.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-300">
                          {k.key_prefix}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Notes Management
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {k.created_at ? new Date(k.created_at).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never used"}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => toggleMutation.mutate(k.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                              k.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {k.is_active ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {deleteConfirmId === k.id ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[11px] text-red-400">Revoke?</span>
                              <button
                                onClick={() => deleteMutation.mutate(k.id)}
                                className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(k.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                              title="Revoke / Delete Key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Claude Code Instructions */}
        {activeTab === "claude" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>How to Give This Key to Claude Code</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You can configure Claude Code with your S-DESK API Key using your shell environment or directly within your prompt session.
              </p>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Option 1: Export Environment Variable in Terminal
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-indigo-300 flex items-center justify-between">
                  <code>export SDESK_API_KEY="your_api_key_here"</code>
                  <button
                    onClick={() => handleCopy('export SDESK_API_KEY="your_api_key_here"')}
                    className="text-slate-400 hover:text-white p-1"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-3">
                  Option 2: Tell Claude Code Directly
                </div>
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-sans text-xs text-slate-300 space-y-2">
                  <div className="text-slate-500 font-mono text-[11px]">// Example prompt in Claude Code:</div>
                  <p className="italic text-slate-200">
                    &ldquo;I have an S-DESK Notes API key: <span className="font-mono text-indigo-300">sdesk_notes_...</span>.
                    Please upload the files inside the folder <span className="font-mono text-emerald-300">./course_materials/unit2</span> into S-DESK under Class <span className="font-mono text-amber-300">UG_2A</span>, Subject <span className="font-mono text-amber-300">Operating Systems</span>, Unit <span className="font-mono text-amber-300">Unit 2: CPU Scheduling</span>.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Workflow steps */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div className="text-xs font-bold text-white">Subject Check / Create</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Claude Code lists existing subjects via <code className="text-indigo-300">GET /api/classes/:class/notes/subjects</code> or creates one if missing.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div className="text-xs font-bold text-white">Unit Hierarchy</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Claude Code adds or finds the specific Unit chapter under that subject.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div className="text-xs font-bold text-white">Multi-File Upload</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Claude Code posts the PDFs / PPTs via multipart/form-data to the unit files endpoint.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Notes API Documentation */}
        {activeTab === "docs" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Notes Management REST Endpoints</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Include your API key in every request using the <code className="text-indigo-300 font-mono">X-API-Key</code> or <code className="text-indigo-300 font-mono">Authorization: Bearer sdesk_notes_...</code> header.
              </p>

              <div className="space-y-4 pt-2">
                {/* Endpoint 1 */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">POST</span>
                    <span className="text-slate-200">/api/classes/{`{class_name}`}/notes/subjects</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Creates a new subject block (e.g. for class UG_2A).</p>
                  <pre className="text-[11px] font-mono bg-slate-900 p-2.5 rounded-lg text-slate-300 overflow-x-auto">
{`curl -X POST https://shive.ddns.net/api/classes/UG_2A/notes/subjects \\
  -H "X-API-Key: sdesk_notes_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Computer Networks", "academic_year": "2024-25", "semester": 1}'`}
                  </pre>
                </div>

                {/* Endpoint 2 */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">POST</span>
                    <span className="text-slate-200">/api/classes/{`{class_name}`}/notes/subjects/{`{subject_id}`}/units</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Creates a unit chapter inside a subject.</p>
                  <pre className="text-[11px] font-mono bg-slate-900 p-2.5 rounded-lg text-slate-300 overflow-x-auto">
{`curl -X POST https://shive.ddns.net/api/classes/UG_2A/notes/subjects/14/units \\
  -H "X-API-Key: sdesk_notes_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Unit 1: Introduction to OSI Model"}'`}
                  </pre>
                </div>

                {/* Endpoint 3 */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">POST</span>
                    <span className="text-slate-200">/api/classes/{`{class_name}`}/notes/subjects/{`{subject_id}`}/units/{`{unit_id}`}/files</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Uploads PDF, PPT, PPTX, DOC, or DOCX files into a unit.</p>
                  <pre className="text-[11px] font-mono bg-slate-900 p-2.5 rounded-lg text-slate-300 overflow-x-auto">
{`curl -X POST https://shive.ddns.net/api/classes/UG_2A/notes/subjects/14/units/25/files \\
  -H "X-API-Key: sdesk_notes_..." \\
  -F "files=@lecture_notes_unit1.pdf"`}
                  </pre>
                </div>

                {/* Endpoint 4 */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">GET</span>
                    <span className="text-slate-200">/api/classes/notes/all</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Returns all subjects, units, and files across all classes.</p>
                  <pre className="text-[11px] font-mono bg-slate-900 p-2.5 rounded-lg text-slate-300 overflow-x-auto">
{`curl -X GET https://shive.ddns.net/api/classes/notes/all \\
  -H "X-API-Key: sdesk_notes_..."`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
