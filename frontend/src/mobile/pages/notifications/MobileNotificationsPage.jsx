import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markRead, markAllRead, deleteNotification } from "../../../api/notifications";
import { Spinner } from "../../../components/ui/Spinner";
import { Bell, CheckCheck, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";

export default function MobileNotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications().then(r => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const notifications = data?.notifications || [];

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

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="space-y-4 mobile-fade-in">
      {/* Mark all read */}
      {hasUnread && (
        <div className="flex justify-end">
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="mobile-tappable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <MobileEmptyState icon={Bell} title="All caught up!" description="You have no notifications." />
      ) : (
        Object.entries(groups).map(([label, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={label}>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">{label}</p>
              <div className="space-y-2">
                {items.map(n => (
                  <MobileCard
                    key={n.id}
                    onClick={() => { if (!n.is_read) markReadMutation.mutate(n.id); }}
                    className={`${!n.is_read ? "!border-primary-200/40 dark:!border-primary-800/30 bg-primary-50/30 dark:bg-primary-950/10" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${!n.is_read ? "font-bold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                            {n.message || n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5 mt-1">
                            <Clock className="w-3 h-3" />
                            {(() => { try { return formatDistanceToNow(new Date(n.created_at), { addSuffix: true }); } catch { return ""; } })()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(n.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="mobile-tappable p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all shrink-0 self-center"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </MobileCard>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
