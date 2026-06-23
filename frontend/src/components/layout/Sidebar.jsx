import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import {
  LayoutDashboard, FolderKanban, Users, GraduationCap,
  MessageSquare, Megaphone, Settings,
  X, HelpCircle, BookOpen, ChevronRight, Grid3X3,
  PanelLeftClose, LogOut
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
  { to: "/settings",   label: "Settings",       icon: Settings,        roles: ["HOD", "FACULTY", "STUDENT"] },
];

export function Sidebar({ open, onClose, isCollapsed, onToggleCollapse }) {
  const { unreadCount } = useNotificationContext();
  const { user, logout } = useAuth();

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
        }}
        className={clsx(
          // Base mobile layout: behaves like a slide-over overlay drawer
          "fixed inset-y-0 left-0 z-50 flex flex-col h-full w-[240px] border-r border-[var(--sidebar-border)] transition-transform duration-300 ease-in-out lg:z-30",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop layout: static position with smooth width collapse transitions
          "lg:static lg:translate-x-0 lg:transition-all lg:duration-300 lg:ease-in-out",
          isCollapsed ? "lg:w-0 lg:border-r-0 lg:overflow-hidden" : "lg:w-[240px]"
        )}
      >
        {/* Inner wrapper with fixed width prevents squishing during collapse animations */}
        <div className="flex flex-col h-full w-[240px] flex-shrink-0">
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
            className="text-base font-bold truncate flex-1"
            style={{ color: "var(--text-primary)" }}
          >
            Department Hub
          </span>
          {/* Desktop Collapse Button (ChatGPT style) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150 active:scale-95"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-[18px] h-[18px]" />
          </button>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg lg:hidden hover:bg-[var(--sidebar-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150 active:scale-95"
            title="Close menu"
          >
            <X className="w-[18px] h-[18px]" />
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

        {/* ── Footer Logout Block ── */}
        <div
          className="p-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <div
            className="rounded-xl p-4 relative overflow-hidden transition-all duration-300 group hover:shadow-sm"
            style={{
              background: "linear-gradient(135deg, var(--primary-light) 0%, rgba(99, 102, 241, 0.08) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.15)",
            }}
          >
            {/* Decorative circles */}
            <div
              className="absolute -top-3 -right-3 w-16 h-16 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-110"
              style={{ background: "var(--primary)" }}
            />
            <LogOut
              className="w-5 h-5 mb-2 relative z-10 text-[var(--primary)] transition-transform duration-300 group-hover:translate-x-0.5"
            />
            <p
              className="text-sm font-semibold mb-0.5 relative z-10"
              style={{ color: "var(--text-primary)" }}
            >
              Session active
            </p>
            <p
              className="text-xs mb-3 relative z-10"
              style={{ color: "var(--text-secondary)" }}
            >
              Sign out from Department Hub
            </p>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg relative z-10 w-full justify-center transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-95 shadow-sm text-white"
              style={{
                background: "var(--primary)",
              }}
            >
              Log Out
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        </div>
      </aside>
    </>
  );
}
