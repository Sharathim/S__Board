import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllRead, markRead } from "../../api/notifications";
import { useNotificationContext } from "../../context/NotificationContext";
import { Bell, CheckCheck, X, Mail, MailOpen } from "lucide-react";
import { format } from "date-fns";

const notificationIcons = {
  project_assigned: "📋",
  class_incharge_assigned: "🎓",
  new_update: "📢",
  forum_assigned: "💬",
};

/**
 * Full-width notifications sheet that slides down from under the top bar.
 * Triggered by the nav-bar bell.
 */
export function NotificationsPanel({ open, onClose }) {
  const queryClient = useQueryClient();
  const { refreshCount } = useNotificationContext();

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

  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const notifications = data?.notifications || [];
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Dim backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 top-16 z-30 bg-black/30 backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Top sheet */}
      <div
        className={`fixed left-0 right-0 top-16 z-40 origin-top bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-xl transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-600" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
              {unread > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" /> Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {isLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2 pb-1">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.is_read) markMutation.mutate(n.id); }}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      n.is_read
                        ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        : "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
                    }`}
                  >
                    <div className="mt-0.5 text-lg shrink-0">{notificationIcons[n.type] || "🔔"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${n.is_read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-gray-100 font-medium"}`}>
                          {n.title}
                        </p>
                        {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                    </div>
                    {n.is_read
                      ? <MailOpen className="w-4 h-4 text-gray-300 shrink-0" />
                      : <Mail className="w-4 h-4 text-primary-500 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
