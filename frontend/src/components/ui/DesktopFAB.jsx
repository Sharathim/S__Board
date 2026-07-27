import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

/**
 * Portalled Floating Action Button for Desktop.
 * Renders directly onto document.body to ensure `position: fixed` stays 100% fixed
 * at the bottom-right corner of the viewport regardless of parent container scrolling
 * or transform/animation contexts.
 */
export function DesktopFAB({ onClick, icon: Icon = Plus, label = "Create", className = "" }) {
  return createPortal(
    <button
      onClick={onClick}
      className={`fixed right-8 bottom-8 z-[100] w-14 h-14 rounded-full bg-gradient-to-br from-[#F05A2B] to-orange-600 text-white shadow-2xl shadow-orange-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
      title={label}
    >
      <Icon className="w-6 h-6" />
    </button>,
    document.body
  );
}

export default DesktopFAB;
