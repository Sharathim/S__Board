import {
  FolderKanban, Users, BarChart3, Zap, Shield,
  MessageSquare, Bell, Settings, Monitor
} from "lucide-react";
import MobileCard from "../../components/MobileCard";

const FEATURES = [
  { icon: FolderKanban, title: "Project Management", desc: "Create, assign, and track projects through their complete lifecycle with status tracking and milestone management.", gradient: "from-violet-500 to-purple-600" },
  { icon: Users, title: "Team Collaboration", desc: "Built-in messaging, team formation, and real-time collaboration tools for faculty and students.", gradient: "from-blue-500 to-indigo-600" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Comprehensive department-wide analytics with project health indicators and performance metrics.", gradient: "from-emerald-500 to-teal-600" },
  { icon: Bell, title: "Smart Notifications", desc: "Stay updated with real-time push notifications for project updates, deadlines, and announcements.", gradient: "from-amber-500 to-orange-500" },
  { icon: MessageSquare, title: "Forum & Updates", desc: "Department-wide forum for announcements, achievements, and community engagement.", gradient: "from-pink-500 to-rose-600" },
  { icon: Shield, title: "Role-Based Access", desc: "Three distinct roles — HOD, Faculty, and Student — each with tailored permissions and views.", gradient: "from-cyan-500 to-sky-600" },
];

export default function MobileFeaturesPage() {
  return (
    <div className="mobile-fade-in px-5 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Features</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
          Everything you need to manage your department's projects and teams effectively.
        </p>
      </div>

      {/* Features list */}
      <div className="space-y-3">
        {FEATURES.map(f => {
          const Icon = f.icon;
          return (
            <MobileCard key={f.title}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shrink-0 shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{f.title}</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </MobileCard>
          );
        })}
      </div>

      {/* Sandbox note */}
      <MobileCard className="!bg-primary-50/50 dark:!bg-primary-950/20 !border-primary-200/30 dark:!border-primary-800/30">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-primary-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Interactive Dashboard Preview</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Experience the full interactive dashboard preview on a larger screen.
            </p>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}
