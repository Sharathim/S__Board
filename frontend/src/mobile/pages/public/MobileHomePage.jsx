import { useState } from "react";
import {
  FolderKanban, Users, BarChart3, Zap, ChevronRight, ArrowRight,
  Sparkles, Shield, MessageSquare
} from "lucide-react";
import BottomSheet from "../../layout/BottomSheet";
import MobileLoginSheetContent from "./MobileLoginSheetContent";

const FEATURES = [
  { icon: FolderKanban, title: "Project Tracking", desc: "End-to-end lifecycle management", gradient: "from-violet-500 to-purple-600" },
  { icon: Users, title: "Collaboration", desc: "Real-time teamwork and messaging", gradient: "from-blue-500 to-indigo-600" },
  { icon: BarChart3, title: "Smart Analytics", desc: "Department-wide insights at a glance", gradient: "from-emerald-500 to-teal-600" },
  { icon: Zap, title: "Instant Updates", desc: "Live forum posts and announcements", gradient: "from-amber-500 to-orange-500" },
];

export default function MobileHomePage() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="mobile-fade-in">
      {/* Hero */}
      <div className="px-5 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold mb-4">
          <Sparkles className="w-3 h-3" />
          Department Project Management System
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
          Manage Projects,<br />
          <span className="bg-gradient-to-r from-primary-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Empower Teams
          </span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
          A complete ecosystem for your computer science department to track, collaborate, and deliver.
        </p>
        <button
          onClick={() => setLoginOpen(true)}
          className="mobile-tappable mt-6 mx-auto w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-bold shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-2"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Features 2x2 Grid */}
      <div className="px-5 py-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 text-center">Features</h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 rounded-2xl p-4 text-center">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mx-auto mb-2.5 shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">{f.title}</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Building photo */}
      <div className="px-5 py-3">
        <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-lg">
          <img
            src="/building.jpg"
            alt="Department building"
            className="w-full h-44 object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      </div>

      {/* Trust indicators */}
      <div className="px-5 py-6 text-center">
        <div className="flex items-center justify-center gap-6">
          <div>
            <span className="text-lg font-black text-gray-900 dark:text-white">100%</span>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">Secure</p>
          </div>
          <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" />
          <div>
            <span className="text-lg font-black text-gray-900 dark:text-white">24/7</span>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">Available</p>
          </div>
          <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" />
          <div>
            <span className="text-lg font-black text-gray-900 dark:text-white">3</span>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">Roles</p>
          </div>
        </div>
      </div>

      {/* Login Sheet */}
      <BottomSheet open={loginOpen} onClose={() => setLoginOpen(false)} title="Sign In">
        <MobileLoginSheetContent onClose={() => setLoginOpen(false)} />
      </BottomSheet>
    </div>
  );
}
