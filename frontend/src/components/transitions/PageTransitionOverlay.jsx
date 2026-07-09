import { usePageTransition } from "../../context/TransitionContext";
import { Check } from "lucide-react";

/* Emojis mapped to section names for folder animations */
const EMOJI_MAP = {
  Dashboard: "📊",
  Projects: "📁",
  Faculty: "👨‍🏫",
  Classes: "🏫",
  Forum: "💬",
  Updates: "📢",
  Settings: "⚙️",
  Notifications: "🔔",
};

function getSectionEmoji(label) {
  return EMOJI_MAP[label] || "📄";
}

/**
 * PageTransitionOverlay
 *
 * Upgraded dual-mode transition overlay:
 *   1. FOLDER Mode: Upgraded 3D folder navigation (ruled lines, metallic paper clip, section emojis).
 *   2. PORTAL Mode: Brand entrance/exit screen (concentric hexagons, particles, checkmark pop).
 */
export default function PageTransitionOverlay() {
  const {
    overlayVisible,
    transitionMode,
    portalState,
    targetLabel,
    TargetIcon,
    overlayRef,
    // Folder Mode Refs
    folderContainerRef,
    folderFrontRef,
    folderPaperRef,
    // Portal Mode Refs
    portalHexagonRef,
    portalTextRef,
    portalCheckmarkRef,
    portalParticlesRef,
  } = usePageTransition();

  if (!overlayVisible) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-colors duration-300 ${
        transitionMode === "PORTAL"
          ? "bg-[#fbfbff] dark:bg-[#020617]"
          : "pointer-events-none"
      }`}
      style={{ opacity: 0 }}
    >
      {/* ─── Backdrop overlay (only visible in FOLDER mode) ─── */}
      {transitionMode === "FOLDER" && (
        <div className="absolute inset-0 bg-slate-900/[0.04] dark:bg-black/30 backdrop-blur-[1px]" />
      )}

      {/* ─── MODE A: FOLDER TRANSITION (Internal Navigation) ─── */}
      {transitionMode === "FOLDER" && (
        <div ref={folderContainerRef} className="folder-3d-wrap select-none">
          {/* Back Cover */}
          <div className="folder-back-cover">
            <div className="folder-tab">{targetLabel || "Workspace"}</div>
          </div>

          {/* Upgraded Paper Sheet */}
          <div ref={folderPaperRef} className="folder-paper-sheet">
            {/* Metallic Paper Clip */}
            <div className="paper-clip" />

            {/* Ruled lines pattern */}
            <div className="document-ruled-lines" />

            {/* Icon/Emoji wrapper */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center relative z-10"
              style={{
                background: "rgba(139, 92, 246, 0.08)",
                color: "#8B5CF6",
              }}
            >
              {TargetIcon ? (
                <TargetIcon className="w-5.5 h-5.5" />
              ) : (
                <span className="text-xl">{getSectionEmoji(targetLabel)}</span>
              )}
            </div>

            {/* Loading text with emojis */}
            <div className="flex flex-col items-center gap-1 text-center px-4 relative z-10">
              <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>Opening {targetLabel}</span>
                <span className="text-sm">{getSectionEmoji(targetLabel)}</span>
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Retrieving documents...
              </p>
            </div>
          </div>

          {/* Front Cover */}
          <div ref={folderFrontRef} className="folder-front-cover">
            <div className="folder-front-grid">
              <div className="folder-front-dot" />
              <div className="folder-front-dot" style={{ background: "#C084FC" }} />
              <div className="folder-front-dot" style={{ background: "#A78BFA" }} />
              <div className="folder-front-dot" />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODE B: PORTAL TRANSITION (Loading / Login / Signout) ─── */}
      {transitionMode === "PORTAL" && (
        <div className="flex flex-col items-center justify-center gap-7 select-none relative w-full h-full">
          
          {/* Floating background particles */}
          <div ref={portalParticlesRef} className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="portal-particle" />
            ))}
          </div>

          {/* Concentric Rotating Hexagons */}
          <div ref={portalHexagonRef} className="portal-hexagon-container">
            <div className="portal-hexagon-outer" />
            <div className="portal-hexagon-inner">
              <div className="portal-hexagon-content">
                <img
                  src="/logo-icon.png"
                  alt="Hive Logo"
                  className="w-11 h-11 object-contain filter drop-shadow-[0_4px_10px_rgba(139,92,246,0.25)]"
                />
              </div>
            </div>
          </div>

          {/* Welcome Text block */}
          <div ref={portalTextRef} className="flex flex-col items-center gap-2 text-center relative z-10">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {portalState === "login" && "Welcome to Hive"}
              {portalState === "logout" && "Goodbye!"}
              {portalState === "loading" && "Connecting to Hive"}
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {portalState === "login" && "Your workspace is ready!"}
              {portalState === "logout" && "Your workspace is saved!"}
              {portalState === "loading" && "Restoring secure workspace..."}
            </p>
          </div>

          {/* Pop-up Checkmark (for login / logout completed state) */}
          {(portalState === "login" || portalState === "logout") && (
            <div
              ref={portalCheckmarkRef}
              className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 relative z-10"
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
