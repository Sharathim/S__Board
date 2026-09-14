/**
 * Centered empty state for mobile, matching the desktop EmptyState.jsx tone.
 */
export default function MobileEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6 mobile-fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-gray-300"/>
        </div>
      )}
      {title && (
        <h3 className="text-sm font-bold text-gray-700 mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed">{description}</p>
      )}
    </div>
  );
}
