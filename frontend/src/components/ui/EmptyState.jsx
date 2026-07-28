import { Inbox } from "lucide-react";
import clsx from "clsx";

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={clsx("flex flex-col items-center justify-center py-16 px-4 rounded-[22px] bg-gray-50/50 dark:bg-[#131C2E]/60 border border-dashed border-gray-200 dark:border-white/10 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800/90 shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-center mb-4 text-[#F05A2B] dark:text-[#FF8365]">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  );
}

export default EmptyState;
