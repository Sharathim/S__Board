import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllRead, markRead, deleteNotification } from "../../api/notifications";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/shared/Pagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { Bell, CheckCheck, Mail, MailOpen, Trash2, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { parseUpdateContent } from "../../utils/updateContent";

const notificationIcons = {
  project_assigned: "📋",
  class_incharge_assigned: "🎓",
  new_update: "📢",
  forum_assigned: "💬",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => listNotifications({ page, per_page: 20 }).then(r => r.data),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  useEffect(() => {
    if (data?.notifications) {
      const hasUnread = data.notifications.some(n => !n.is_read);
      if (hasUnread) {
        markAllMutation.mutate();
      }
    }
  }, [data]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const notifications = data?.notifications || [];
  const unread = notifications.filter(n => !n.is_read).length;

  // Group by day
  const today = new Date();
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  notifications.forEach(n => {
    const d = new Date(n.created_at);
    const diffDays = Math.floor((today - d) / 86400000);
    if (diffDays === 0) groups.Today.push(n);
    else if (diffDays === 1) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title="Notifications"
        subtitle={`${data?.total || 0} total${unread > 0 ? ` · ${unread} unread` : ""}`}
      >
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={() => markAllMutation.mutate()} className="gap-1.5">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([label, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={label} className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">{label}</p>
                <div className="space-y-2">
                  {items.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.is_read) markMutation.mutate(n.id); }}
                      className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors relative group ${
                        n.is_read
                          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          : "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
                      }`}
                    >
                      <div className="mt-0.5 text-lg">
                        {notificationIcons[n.type] || "🔔"}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm ${n.is_read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-gray-100 font-medium"}`}>
                            {n.title}
                          </p>
                          {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {n.type === "new_update"
                            ? (parseUpdateContent(n.body).description || n.body)
                            : n.body}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1.5 leading-none">
                          <Clock className="w-3.5 h-3.5" />
                          {(() => { try { return formatDistanceToNow(new Date(n.created_at), { addSuffix: true }); } catch { return ""; } })()}
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          {format(new Date(n.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        {n.is_read ? <MailOpen className="w-4 h-4 text-gray-300 dark:text-gray-600" /> : <Mail className="w-4 h-4 text-primary-500" />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(n.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          <div className="pt-2">
            <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
