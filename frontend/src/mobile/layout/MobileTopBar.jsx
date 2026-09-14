import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { useState } from "react";
import MailComposerModal from "../../pages/dashboard/MailComposerModal";
import { Logo } from "../../components/ui/Logo";


const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/faculty": "Faculty",
  "/classes": "Classes",
  "/forum": "Forum",
  "/updates": "Updates",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

// Routes that show back button instead of logo
const DETAIL_PATTERNS = ["/projects/", "/classes/"];

function getRoleColor(role) {
  const map = {
    HOD: { from: "#7C3AED", to: "#5B21B6" },
    FACULTY: { from: "#3B82F6", to: "#1D4ED8" },
    STUDENT: { from: "#10B981", to: "#059669" },
  };
  return map[role] || map.HOD;
}

export default function MobileTopBar({ title: titleProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotificationContext();
  const isDetail = DETAIL_PATTERNS.some((p) => location.pathname.startsWith(p) && location.pathname !== p.slice(0, -1));
  const rc = getRoleColor(user?.role);
  const [isMailOpen, setIsMailOpen] = useState(false);
  const canComposeMail = user?.role === "HOD";

  return (
    <>
      <header
        className="relative w-full shrink-0 z-30 bg-[#FFFFFF] flex items-center justify-between px-3 select-none"
        style={{ height: "56px", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Left: Back button (if detail) + Logo + "Hive" */}
        <div className="flex items-center gap-2 min-w-0">
          {isDetail && (
            <button
              onClick={() => navigate(-1)}
              className="mobile-tappable w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600"/>
            </button>
          )}
          <div className="flex items-center gap-2">
            <Logo
              variant="icon"
              alt="Hive"
              className="w-8 h-8 object-contain shrink-0"
            />
            <span className="font-bold text-base text-gray-900 tracking-tight">
              Hive
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Compose Mail Button - HOD & Faculty only */}
          {canComposeMail && (
            <button
              onClick={() => setIsMailOpen(true)}
              className="mobile-tappable relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-50 transition-colors"
              aria-label="Compose Mail"
              title="Compose Mail"
            >
              <Mail className="w-4.5 h-4.5 text-indigo-500"/>
            </button>
          )}

          {/* Bell */}
          <button
            onClick={() => navigate("/notifications")}
            className="mobile-tappable relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Bell className={`w-5 h-5 text-gray-500 ${unreadCount > 0 ?"animate-[wiggle_1s_ease-in-out_infinite]":""}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full flex items-center justify-center text-white font-bold bg-rose-500 text-[8px] px-0.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <button
            onClick={() => navigate("/settings")}
            className="mobile-tappable w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          >
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${rc.from}, ${rc.to})` }}
              >
                {(user?.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Mail Composer Modal */}
      {canComposeMail && (
        <MailComposerModal isOpen={isMailOpen} onClose={() => setIsMailOpen(false)} />
      )}
    </>
  );
}
