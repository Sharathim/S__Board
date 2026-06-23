import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import {
  LayoutDashboard, FolderKanban, Users, GraduationCap,
  MessageSquare, Megaphone, Settings,
  X, HelpCircle, BookOpen, ChevronRight, Grid3X3,
  PanelLeftClose, PanelLeftOpen, LogOut
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
          isCollapsed ? "lg:w-[70px]" : "lg:w-[240px]"
        )}
      >
        {/* Inner wrapper transition */}
        <div className={clsx("flex flex-col h-full flex-shrink-0 transition-all duration-300", isCollapsed ? "w-[70px]" : "w-[240px]")}>
        {/* ── Brand / Logo ── */}
        <div
          className={clsx(
            "flex items-center h-16 flex-shrink-0 transition-all duration-300",
            isCollapsed ? "justify-center px-4" : "gap-2.5 px-5"
          )}
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          {isCollapsed ? (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg transition-all duration-150 active:scale-95"
              title="Expand sidebar"
            >
              <img
                src="/favicon.svg"
                alt="Logo"
                className="w-8 h-8 rounded-lg object-contain"
              />
            </button>
          ) : (
            <>
              {/* Logo from favicon */}
              <img
                src="/favicon.svg"
                alt="Logo"
                className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
              />
              <span
                className="text-base font-bold truncate flex-1 animate-fade-in"
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
            </>
          )}
          {/* Mobile close */}
          {!isCollapsed && (
            <button
              onClick={onClose}
              className="ml-auto p-1.5 rounded-lg lg:hidden hover:bg-[var(--sidebar-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150 active:scale-95"
              title="Close menu"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          )}
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
                    "flex items-center rounded-lg text-sm font-medium transition-all duration-150 group relative",
                    isCollapsed ? "justify-center p-2.5 mx-2" : "gap-3 px-3 py-2.5 mx-1",
                    isActive ? "nav-active" : "hover:bg-[var(--sidebar-hover)]"
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? {}
                    : { color: "var(--text-secondary)" }
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                {showBadge && (
                  isCollapsed ? (
                    <span
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-[var(--sidebar-bg)]"
                      style={{ background: "var(--primary)" }}
                    />
                  ) : (
                    <span
                      className="text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none"
                      style={{ background: "var(--primary)", color: "#fff" }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer Logout Block ── */}
        <div
          className={clsx(
            "p-4 flex-shrink-0 transition-all duration-300",
            isCollapsed ? "flex justify-center" : ""
          )}
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          {isCollapsed ? (
            <button
              onClick={logout}
              className="p-2.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150 active:scale-95"
              title="Log Out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          ) : (
            <div
              className="rounded-xl p-4 relative overflow-hidden transition-all duration-300 group hover:shadow-sm w-full"
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
          )}
        </div>
        </div>
      </aside>
    </>
  );
}
