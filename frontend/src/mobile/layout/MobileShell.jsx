import { Outlet } from "react-router-dom";
import MobileTopBar from "./MobileTopBar";
import BottomTabBar from "./BottomTabBar";

/**
 * Authenticated mobile shell: top app bar + scrollable content + bottom tab bar.
 */
export default function MobileShell() {
  return (
    <div className="min-h-screen bg-[#fbfbff] dark:bg-[#020617] transition-colors duration-300">
      <MobileTopBar />

      {/* Page content — padded to clear fixed bars */}
      <main
        className="mobile-page-enter"
        style={{
          paddingTop: "calc(56px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          minHeight: "100vh",
        }}
      >
        <div className="px-4 py-4">
          <Outlet />
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
