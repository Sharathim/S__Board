import { Award, Trophy, GraduationCap, Calendar, ExternalLink, Pencil, Trash2, ShieldCheck, FileCheck } from "lucide-react";

const CATEGORY_META = {
  HACKATHON: { label: "Hackathon", icon: Trophy, bg: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40" },
  COURSE_CERTIFICATION: { label: "Course Certification", icon: GraduationCap, bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" },
  WORKSHOP: { label: "Workshop", icon: Award, bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" },
  SPORTS: { label: "Sports & Athletics", icon: Trophy, bg: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40" },
  PAPER_PRESENTATION: { label: "Paper Presentation", icon: FileCheck, bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40" },
  VOLUNTEERING: { label: "Volunteering", icon: ShieldCheck, bg: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40" },
  OTHER: { label: "Achievement", icon: Award, bg: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" }
};

export function AccomplishmentCard({ accomplishment, canManage, onEdit, onDelete }) {
  const meta = CATEGORY_META[accomplishment.category] || CATEGORY_META.OTHER;
  const CategoryIcon = meta.icon;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="group relative p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-150 dark:border-gray-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2.5 rounded-xl border shrink-0 ${meta.bg}`}>
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${meta.bg}`}>
                {meta.label}
              </span>
              {accomplishment.position_achieved && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40">
                  🏆 {accomplishment.position_achieved}
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">
              {accomplishment.title}
            </h4>
          </div>
        </div>

        {/* Action buttons */}
        {canManage && (
          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(accomplishment)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(accomplishment)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Organizer & Date line */}
      <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
        {accomplishment.organizer && (
          <span className="truncate">Organizer: {accomplishment.organizer}</span>
        )}
        <span className="flex items-center gap-1 shrink-0 ml-auto text-[10px]">
          <Calendar className="w-3 h-3 text-gray-400" />
          {formatDate(accomplishment.event_date)}
        </span>
      </div>

      {/* Description */}
      {accomplishment.description && (
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium line-clamp-3">
          {accomplishment.description}
        </p>
      )}

      {/* Footer info: Student name & Certificate link */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[10px]">
        <span className="font-bold text-gray-500 dark:text-gray-400">
          Student: {accomplishment.student_name} ({accomplishment.student_roll || accomplishment.student_register})
        </span>

        {accomplishment.certificate_url && (
          <a
            href={accomplishment.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            Certificate <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
