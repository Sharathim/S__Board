import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Generic bottom sheet primitive. Slides up from the bottom with backdrop.
 * Modeled on Modal.jsx's createPortal + escape + body-scroll-lock pattern.
 */
export default function BottomSheet({ open, onClose, title, children }) {
  const overlayRef = useRef(null);
  const sheetRef = useRef(null);
  const [closing, setClosing] = useState(false);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape key
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape") handleClose(); };
    if (open) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose?.();
    }, 280);
  };

  // Swipe-down gesture
  const touchStartY = useRef(0);
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80) handleClose();
  };

  if (!open && !closing) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[9999] flex items-end justify-center ${closing ? "mobile-backdrop-out" : "mobile-backdrop-enter"}`}
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
    >
      <div
        ref={sheetRef}
        className={`w-full max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-[20px] shadow-2xl flex flex-col overflow-hidden ${closing ? "mobile-sheet-exit" : "mobile-sheet-enter"}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="mobile-drag-handle" />

        {/* Header */}
        {title && (
          <div className="px-5 pt-2 pb-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
