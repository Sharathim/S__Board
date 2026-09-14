import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllRead, markRead, deleteNotification } from "../../../api/notifications";
import { Spinner } from "../../../components/ui/Spinner";
import { Bell, CheckCheck, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseUTCDate } from "../../../utils/dateUtils";
import { useState, useEffect, useRef } from "react";
import { parseUpdateContent } from "../../../utils/updateContent";
import MobileEmptyState from "../../components/MobileEmptyState";

const NOTIF_ICONS = {
  project_assigned: "📋",
  class_incharge_assigned: "🎓",
  new_update: "📢",
  forum_assigned: "💬",
};

export default function MobileNotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => listNotifications({ page, per_page: 30 }).then(r => r.data),
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

  // Auto-mark all as read when landing on this page
  useEffect(() => {
    if (data?.notifications) {
      const hasUnread = data.notifications.some(n => !n.is_read);
      if (hasUnread) {
        markAllMutation.mutate();
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const notifications = data?.notifications || [];
  const unread = notifications.filter(n => !n.is_read).length;

  // Group by day
  const today = new Date();
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  notifications.forEach(n => {
    const d = parseUTCDate(n.created_at);
    const diffDays = Math.floor((today - d) / 86400000);
    if (diffDays === 0) groups.Today.push(n);
    else if (diffDays === 1) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  });

  return (
    <div className="mobile-fade-in pb-6">
      {/* Header Actions */}
      {unread > 0 && (
        <div className="mb-4">
          <button
            onClick={() => markAllMutation.mutate()}
            className="mobile-tappable flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-50 text-primary-600 text-xs font-bold border border-primary-200/60"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <MobileEmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! New notifications will appear here."
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([label, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
                  {label}
                </p>
                <div className="space-y-2">
                  {items.map(n => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMark={() => { if (!n.is_read) markMutation.mutate(n.id); }}
                      onDelete={() => deleteMutation.mutate(n.id)}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {data?.pages > 1 && page < data.pages && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="mobile-tappable w-full py-3 rounded-xl bg-gray-50 text-xs font-bold text-gray-500 border border-gray-200/60"
            >
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationCard({ notification: n, onMark, onDelete, isDeleting }) {
  const [swiped, setSwiped] = useState(false);
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 80) setSwiped(true);
    else if (diff < -40) setSwiped(false);
  };

  const bodyText = n.type === "new_update"
    ? (parseUpdateContent(n.body).description || n.body)
    : n.body;

  let timeAgo = "";
  try {
    timeAgo = formatDistanceToNow(parseUTCDate(n.created_at), { addSuffix: true });
  } catch {}

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete action behind */}
      {swiped && (
        <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500 rounded-2xl">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            className="mobile-tappable flex items-center gap-1.5 text-white text-xs font-bold"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      <div
        onClick={onMark}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`mobile-tappable relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
          swiped ? "-translate-x-20" : "translate-x-0"
        } ${
          n.is_read
            ?"bg-white border-gray-200/70"
            :"bg-primary-50/50 border-primary-200/60"
        }`}
        style={{ transition: "transform 0.2s ease" }}
      >
        {/* Icon */}
        <div className="text-xl mt-0.5 shrink-0">
          {NOTIF_ICONS[n.type] || "🔔"}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm leading-snug ${
              n.is_read
                ?"text-gray-700"
                :"text-gray-900 font-semibold"
            }`}>
              {n.title}
            </p>
            {!n.is_read && (
              <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />
            )}
          </div>
          {bodyText && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {bodyText}
            </p>
          )}
          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1.5">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </div>
        </div>
      </div>
    </div>
  );
}
