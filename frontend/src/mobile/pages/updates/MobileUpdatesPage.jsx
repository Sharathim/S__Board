import { useQuery } from "@tanstack/react-query";
import { listUpdates } from "../../../api/updates";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { Megaphone, Calendar, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import MobileCard from "../../components/MobileCard";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileEmptyState from "../../components/MobileEmptyState";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "announcement", label: "Announcements" },
  { value: "event", label: "Events" },
  { value: "achievement", label: "Achievements" },
];

const CATEGORY_COLORS = {
  announcement: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  event: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  achievement: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
};

export default function MobileUpdatesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["updates"],
    queryFn: () => listUpdates({ page: 1, per_page: 50 }).then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const updates = data?.updates || [];
  const filtered = updates.filter(u => {
    if (search && !u.title?.toLowerCase().includes(search.toLowerCase()) && !u.content?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && u.category !== category) return false;
    return true;
  });

  return (
    <div className="space-y-4 mobile-fade-in">
      <MobileSearchBar value={search} onChange={setSearch} placeholder="Search updates..." />

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto mobile-hide-scrollbar pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`mobile-tappable px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all border ${
              category === cat.value
                ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border-primary-200/50 dark:border-primary-800/30"
                : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Updates feed */}
      {filtered.length === 0 ? (
        <MobileEmptyState icon={Megaphone} title="No updates found" description="Check back later for announcements." />
      ) : (
        <div className="space-y-3">
          {filtered.map(update => {
            const catColors = CATEGORY_COLORS[update.category] || { bg: "bg-gray-50 dark:bg-slate-800", text: "text-gray-500", dot: "bg-gray-400" };
            return (
              <MobileCard key={update.id}>
                {/* Category + Time */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${catColors.bg} ${catColors.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${catColors.dot}`} />
                    {update.category || "Update"}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {(() => { try { return formatDistanceToNow(new Date(update.created_at), { addSuffix: true }); } catch { return ""; }})()}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{update.title}</h3>

                {/* Content */}
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{update.content}</p>

                {/* Author */}
                {update.posted_by && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-50 dark:border-slate-800/40">
                    <Avatar src={update.posted_by?.profile_picture} name={update.posted_by?.name} size="sm" className="w-6 h-6" />
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{update.posted_by?.name}</span>
                  </div>
                )}
              </MobileCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
