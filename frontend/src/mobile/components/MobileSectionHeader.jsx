import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Sticky section header with optional count badge and "View All" link.
 */
export default function MobileSectionHeader({ title, subtitle, count, viewAllTo, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-2 py-1.5 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-base font-bold text-gray-900 tracking-tight leading-snug">{title}</h2>
        {count !== undefined && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {count}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      )}
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="mobile-tappable flex items-center gap-0.5 text-xs font-semibold text-primary-600 shrink-0 min-h-[44px] px-1 py-2"
        >
          View All
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
