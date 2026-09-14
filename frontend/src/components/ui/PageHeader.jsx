/**
 * Consistent page header: title, optional subtitle, and an actions slot.
 * Used across all dashboard pages for a uniform top section.
 */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm font-medium text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-[10px] shrink-0">{children}</div>}
    </div>
  );
}

export default PageHeader;
