import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllRead, markRead, deleteNotification } from "../../api/notifications";
import { useNotificationContext } from "../../context/NotificationContext";
import { Bell, CheckCheck, X, Mail, MailOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { parseUpdateContent } from "../../utils/updateContent";

const notificationIcons = {
  project_assigned: "📋",
  class_incharge_assigned: "🎓",
  new_update: "📢",
  forum_assigned: "💬",
};

/**
 * Upgraded, floating glassmorphic + neomorphic notifications dropdown card.
 * Positioned under the TopBar bell icon and closes via clicking outside.
 */
export function NotificationsPanel({ open, onClose }) {
  const queryClient = useQueryClient();
  const { refreshCount } = useNotificationContext();
  const panelRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", 1],
    queryFn: () => listNotifications({ page: 1, per_page: 20 }).then(r => r.data),
    enabled: open,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshCount();
    },
  });

  const markMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshCount();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      refreshCount();
    },
  });

  const notifications = data?.notifications || [];
  const unread = notifications.filter(n => !n.is_read).length;


  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open && unread > 0) {
      markAllMutation.mutate();
    }
  }, [open, unread]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest("#navbar-notif-btn")
      ) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  return (
    <div
      ref={panelRef}
      className={`notifications-glass-panel ${open ? "open" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Notifications</h2>
          {unread > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              {unread} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {unread > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-2 py-1.5 rounded-lg hover:bg-purple-500/10 transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-400">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.is_read) markMutation.mutate(n.id); }}
                className={`flex items-start gap-3.5 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  n.is_read
                    ? "bg-white/40 dark:bg-slate-900/20 border-gray-200/50 dark:border-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/30"
                    : "bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/20 dark:border-purple-500/30 hover:bg-purple-500/10"
                }`}
              >
                <div className="mt-0.5 text-lg shrink-0 select-none">{notificationIcons[n.type] || "🔔"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${n.is_read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-gray-100 font-bold"}`}>
                      {n.title}
                    </p>
                    {!n.is_read && <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shrink-0 animate-pulse" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words leading-relaxed">
                    {n.type === "new_update"
                      ? (parseUpdateContent(n.body).description || n.body)
                      : n.body}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-mono">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2 self-center">
                  {n.is_read
                    ? <MailOpen className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    : <Mail className="w-4 h-4 text-purple-500" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(n.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
