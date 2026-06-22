import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllRead, markRead } from "../../api/notifications";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/shared/Pagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { Bell, CheckCheck, Mail, MailOpen } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

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

  if (isLoading) return <Spinner />;

  const notifications = data?.notifications || [];
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markMutation.mutate(n.id); }}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                n.is_read
                  ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  : "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
              }`}
            >
              <div className="mt-0.5 text-lg">
                {notificationIcons[n.type] || "🔔"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${n.is_read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-gray-100 font-medium"}`}>
                    {n.title}
                  </p>
                  {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(n.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
              {n.is_read ? <MailOpen className="w-4 h-4 text-gray-300" /> : <Mail className="w-4 h-4 text-primary-500" />}
            </div>
          ))}
          <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
