import { Award, Trophy, GraduationCap, Calendar, ExternalLink, Pencil, Trash2, ShieldCheck, FileCheck } from "lucide-react";

const CATEGORY_META = {
  HACKATHON: { label:"Hackathon", icon: Trophy, bg:"bg-amber-50 text-amber-600 border-amber-200"},
  COURSE_CERTIFICATION: { label:"Course Certification", icon: GraduationCap, bg:"bg-emerald-50 text-emerald-600 border-emerald-200"},
  WORKSHOP: { label:"Workshop", icon: Award, bg:"bg-blue-50 text-blue-600 border-blue-200"},
  SPORTS: { label:"Sports & Athletics", icon: Trophy, bg:"bg-rose-50 text-rose-600 border-rose-200"},
  PAPER_PRESENTATION: { label:"Paper Presentation", icon: FileCheck, bg:"bg-violet-50 text-violet-600 border-violet-200"},
  VOLUNTEERING: { label:"Volunteering", icon: ShieldCheck, bg:"bg-purple-50 text-purple-600 border-purple-200"},
  OTHER: { label:"Achievement", icon: Award, bg:"bg-gray-50 text-gray-600 border-gray-200"}
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
    <div className="group relative p-4 rounded-2xl bg-white border border-gray-150 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all space-y-3">
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-primary-50 text-primary-600 border border-primary-200">
                  🏆 {accomplishment.position_achieved}
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-gray-900 mt-1 truncate">
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
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(accomplishment)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Organizer & Date line */}
      <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-500">
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
        <p className="text-xs text-gray-600 leading-relaxed font-medium line-clamp-3">
          {accomplishment.description}
        </p>
      )}

      {/* Footer info: Student name & Certificate link */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px]">
        <span className="font-bold text-gray-500">
          Student: {accomplishment.student_name} ({accomplishment.student_roll || accomplishment.student_register})
        </span>

        {accomplishment.certificate_url && (
          <a
            href={accomplishment.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-primary-600 hover:underline"
          >
            Certificate <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
