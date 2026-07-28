import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, size = "md", hideHeader = false }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    xxl: "max-w-7xl",
    full: "max-w-[95vw] w-full",
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div className={`w-full ${sizes[size]} bg-white dark:bg-[#1A2438] border border-gray-200/80 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-200 overflow-hidden`}>
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="px-6 py-5 max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
