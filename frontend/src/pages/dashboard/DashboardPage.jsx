import { useQuery } from "@tanstack/react-query";
import { getProjectStats } from "../../api/projects";
import { getUnreadCount } from "../../api/notifications";
import { Spinner } from "../../components/ui/Spinner";
import { FolderKanban, Users, CheckCircle, AlertTriangle, Bell } from "lucide-react";
import { Link } from "react-router-dom";

const statCards = [
  { key: "total", label: "Total Projects", icon: FolderKanban, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30", link: "/projects" },
  { key: "in_progress", label: "In Progress", icon: FolderKanban, color: "text-primary-600 bg-primary-100 dark:bg-primary-900/30", link: "/projects" },
  { key: "student_count", label: "Students in Projects", icon: Users, color: "text-green-600 bg-green-100 dark:bg-green-900/30", link: "/projects" },
  { key: "completed", label: "Completed", icon: CheckCircle, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30", link: "/projects" },
  { key: "low_activity", label: "Low Activity", icon: AlertTriangle, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30", link: "/projects" },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });

  const { data: notifData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => getUnreadCount().then(r => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of department activities</p>
        </div>
        {notifData?.count > 0 && (
          <Link to="/notifications" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
            <Bell className="w-4 h-4" />
            {notifData.count} unread
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          const value = stats?.[card.key] ?? 0;
          return (
            <Link key={card.key} to={card.link} className="group">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Welcome to DPMS</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use the sidebar to navigate through the system. Manage faculty, classes, forum members, projects, and more.
        </p>
      </div>
    </div>
  );
}
