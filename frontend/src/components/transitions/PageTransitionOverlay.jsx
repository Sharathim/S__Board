import { usePageTransition } from "../../context/TransitionContext";

/**
 * PageTransitionOverlay
 *
 * A premium 3D folder-based transition screen.
 * Consists of a closed folder whose front cover swings open,
 * letting a document page rise out containing the loading state.
 */
export default function PageTransitionOverlay() {
  const {
    overlayVisible,
    targetLabel,
    TargetIcon,
    overlayRef,
    folderContainerRef,
    folderFrontRef,
    folderPaperRef,
  } = usePageTransition();

  if (!overlayVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{ opacity: 0 }}
    >
      {/* Soft dim backdrop */}
      <div className="absolute inset-0 bg-slate-900/[0.04] dark:bg-black/30 backdrop-blur-[1px]" />

      {/* 3D Folder Container */}
      <div ref={folderContainerRef} className="folder-3d-wrap select-none">
        
        {/* Folder Back Cover */}
        <div className="folder-back-cover">
          {/* Section Tab label */}
          <div className="folder-tab">
            {targetLabel || "Workspace"}
          </div>
        </div>

        {/* Rising Inner Paper Sheet */}
        <div ref={folderPaperRef} className="folder-paper-sheet">
          {/* Section Icon / Logo */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(139, 92, 246, 0.08)",
              color: "#8B5CF6",
            }}
          >
            {TargetIcon ? (
              <TargetIcon className="w-5.5 h-5.5" />
            ) : (
              <img src="/logo-icon.png" alt="Hive" className="w-6 h-6 object-contain" />
            )}
          </div>

          {/* Loading status info */}
          <div className="flex flex-col items-center gap-1 text-center px-4">
            <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Opening {targetLabel || "Workspace"}
            </p>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              Retrieving documents...
            </p>
          </div>
        </div>

        {/* Folder Front Cover (3D opens like book) */}
        <div ref={folderFrontRef} className="folder-front-cover">
          {/* Embossed stamp design */}
          <div className="folder-front-grid">
            <div className="folder-front-dot" />
            <div className="folder-front-dot" style={{ background: "#C084FC" }} />
            <div className="folder-front-dot" style={{ background: "#A78BFA" }} />
            <div className="folder-front-dot" />
          </div>
        </div>

      </div>
    </div>
  );
}
