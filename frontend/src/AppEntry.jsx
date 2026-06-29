import React, { Suspense } from "react";
import { useIsMobile } from "./hooks/useIsMobile";
import { SessionLoader } from "./components/ui/SessionLoader";

// Lazy-load both shells so the unused one is never bundled on the other viewport
const App = React.lazy(() => import("./App"));
const MobileApp = React.lazy(() => import("./mobile/MobileApp"));

/**
 * Root component that switches between desktop (App) and mobile (MobileApp)
 * based on viewport width. The existing provider tree in main.jsx wraps this,
 * so both shells share the same auth/theme/notification/query context.
 */
export default function AppEntry() {
  const { isMobile } = useIsMobile();

  return (
    <Suspense fallback={<SessionLoader />}>
      {isMobile ? <MobileApp /> : <App />}
    </Suspense>
  );
}
