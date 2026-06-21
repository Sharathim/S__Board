import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listUpdates } from "../../api/updates";
import { formatDistanceToNow } from "date-fns";
import { Megaphone, Calendar, FileText, Users, ArrowRight, BellOff } from "lucide-react";

const CARD_ICONS  = [Calendar, FileText, Users];
const CARD_COLORS = [
  { bg: "bg-violet-50",  icon: "text-violet-500"  },
  { bg: "bg-emerald-50", icon: "text-emerald-600" },
  { bg: "bg-blue-50",    icon: "text-blue-500"    },
];

/* ── Individual announcement card ── */
function AnnouncementCard({ icon: Icon, iconBg, iconColor, title, description, timeAgo }) {
  return (
    <div
      className="group bg-white rounded-xl border border-gray-100 p-5 flex flex-col
        hover:shadow-card-hover hover:-translate-y-1
        transition-all duration-200 ease-out cursor-pointer"
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      {/* Content */}
      <h3 className="text-[13px] font-semibold text-gray-800 mb-2 line-clamp-2 leading-snug">{title}</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-3 flex-1 mb-4">{description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
        <span className="text-[11px] text-gray-400 font-medium">{timeAgo}</span>
        <ArrowRight
          className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all duration-150"
        />
      </div>
    </div>
  );
}

/* ── Loading skeleton ── */
function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-gray-100 p-5">
      <div className="w-10 h-10 rounded-xl bg-gray-100 mb-4" />
      <div className="h-3 bg-gray-100 rounded-full mb-2.5 w-3/4" />
      <div className="h-3 bg-gray-100 rounded-full mb-2 w-full" />
      <div className="h-3 bg-gray-100 rounded-full w-2/3" />
    </div>
  );
}

/* ── Professional empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 bg-white rounded-xl border border-gray-100 border-dashed">
      {/* Illustrated icon container */}
      <div className="relative mb-5">
        {/* Soft glow ring */}
        <div className="absolute inset-0 rounded-2xl bg-primary-100/40 blur-md scale-125" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-50 to-violet-50 border border-primary-100/60 flex items-center justify-center shadow-sm">
          <BellOff className="w-8 h-8 text-primary-300" />
        </div>
      </div>

      {/* Message */}
      <h3 className="text-sm font-semibold text-gray-600 mb-2">
        No announcements yet
      </h3>
      <p className="text-[12px] text-gray-400 text-center max-w-[200px] leading-relaxed">
        Department updates and notices from the HOD will appear here.
      </p>

      {/* Subtle link prompt */}
      <Link
        to="/updates"
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors group"
      >
        Check back later
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
      </Link>
    </div>
  );
}

/* ── Section ── */
export function AnnouncementSection() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUpdates({ page: 1, per_page: 3 })
      .then((res) => setUpdates(res.data.updates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Latest Announcements</h2>
        </div>
        <Link
          to="/updates"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors group"
        >
          View all updates
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
        </Link>
      </div>

      <p className="text-sm text-gray-400 mb-7 leading-relaxed">
        Stay updated with the latest news and important updates from the department.
      </p>

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : updates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          {updates.slice(0, 3).map((update, i) => (
            <AnnouncementCard
              key={update.id}
              icon={CARD_ICONS[i % CARD_ICONS.length]}
              iconBg={CARD_COLORS[i % CARD_COLORS.length].bg}
              iconColor={CARD_COLORS[i % CARD_COLORS.length].icon}
              title={update.content.slice(0, 60)}
              description={update.content}
              timeAgo={formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
