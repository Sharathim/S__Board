import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import {
  LayoutDashboard, FolderKanban, Users, GraduationCap,
  MessageSquare, Megaphone, BarChart2, Calendar, Settings,
  X, HelpCircle, BookOpen, ChevronRight, Grid3X3,
} from "lucide-react";
import clsx from "clsx";

const allNavItems = [
  { to: "/dashboard",  label: "Dashboard",     icon: LayoutDashboard, roles: ["HOD"] },
  { to: "/projects",   label: "Projects",       icon: FolderKanban,    roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/classes",    label: "Students",       icon: Users,           roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/faculty",    label: "Faculty",        icon: GraduationCap,   roles: ["HOD", "FACULTY"] },
  { to: "/classes",    label: "Classes",        icon: BookOpen,        roles: ["HOD", "FACULTY", "STUDENT"], exact: true },
  { to: "/forum",      label: "Forum",          icon: MessageSquare,   roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/updates",    label: "Announcements",  icon: Megaphone,       roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/reports",    label: "Reports",        icon: BarChart2,       roles: ["HOD"], disabled: true },
  { to: "/calendar",   label: "Calendar",       icon: Calendar,        roles: ["HOD", "FACULTY", "STUDENT"], disabled: true },
  { to: "/settings",   label: "Settings",       icon: Settings,        roles: ["HOD", "FACULTY", "STUDENT"] },
];

export function Sidebar({ open, onClose }) {
  const { unreadCount } = useNotificationContext();
  const { user } = useAuth();

  const navItems = allNavItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  // Deduplicate: if "Students" and "Classes" both map to /classes, remove duplicate
  const seen = new Set();
  const uniqueNavItems = navItems.filter(item => {
    const key = `${item.label}-${item.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          width: "240px",
          flexShrink: 0,
        }}
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col h-full transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* ── Brand / Logo ── */}
        <div
          className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          {/* Icon mark */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            <Grid3X3 className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-base font-bold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            Department Hub
          </span>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-md lg:hidden"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {uniqueNavItems.map(item => {
            const Icon = item.icon;
            const showBadge = item.to === "/forum" && unreadCount > 0;

            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-not-allowed select-none"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                  title="Coming soon"
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.exact}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                    isActive ? "nav-active" : "hover:bg-[var(--sidebar-hover)]"
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? {}
                    : { color: "var(--text-secondary)" }
                }
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span
                    className="text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none"
                    style={{ background: "var(--primary)", color: "#fff" }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer Help Block ── */}
        <div
          className="p-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <div
            className="rounded-xl p-4 relative overflow-hidden"
            style={{ background: "var(--primary-light)" }}
          >
            {/* Decorative circles */}
            <div
              className="absolute -top-3 -right-3 w-16 h-16 rounded-full opacity-20"
              style={{ background: "var(--primary)" }}
            />
            <div
              className="absolute top-6 -right-1 w-8 h-8 rounded-full opacity-10"
              style={{ background: "var(--primary)" }}
            />
            <HelpCircle
              className="w-5 h-5 mb-2 relative z-10"
              style={{ color: "var(--primary)" }}
            />
            <p
              className="text-sm font-semibold mb-0.5 relative z-10"
              style={{ color: "var(--primary)" }}
            >
              Need help getting started?
            </p>
            <p
              className="text-xs mb-3 relative z-10"
              style={{ color: "var(--text-secondary)" }}
            >
              Check our quick start guide
            </p>
            <a
              href="mailto:support@dpms.com"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg relative z-10 transition-all duration-150 hover:opacity-90"
              style={{
                background: "var(--primary)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              View Guide
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
