import { Plus } from "lucide-react";

/**
 * Circular floating action button, positioned bottom-right above the tab bar.
 */
export default function MobileFAB({ onClick, icon: Icon = Plus, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`mobile-tappable fixed z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-xl shadow-primary-500/25 flex items-center justify-center hover:shadow-primary-500/40 transition-all active:scale-90 ${className}`}
      style={{
        right: "16px",
        bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 16px)",
      }}
      title={label}
    >
      <Icon className="w-6 h-6" />
    </button>
  );
}
