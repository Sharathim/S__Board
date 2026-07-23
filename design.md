# Universal Design System & UX Standards Guide
### Cross-Platform Architecture for Enterprise Web & Native Mobile/PWA/APK

---

## 1. Core Design Philosophy & Principles

Building a world-class cross-platform application requires **100% Functional Parity** combined with **Platform-Native UX Adaptation**. 

* **Rule of Functional Parity**: Never drop or disable a desktop feature on mobile due to screen space constraints. Adapt the UI paradigm (e.g., convert a desktop modal into a native bottom sheet), but preserve 100% of the capability.
* **Native App Feeling**: A PWA or Web View APK should feel completely indistinguishable from a native Swift/Kotlin application. Eliminate web-like quirks (blue tap highlights, unintended page rubber-banding, text selection during gestures).
* **Fluid Feedback & Motion**: Every user touch or click must give instant visual, physical (haptic where supported), or animated feedback within 16ms (60-120fps).

---

## 2. Mobile (PWA & Native APK) Design Guidelines

### 2.1 Touch Ergonomics & The Thumb Zone
* **Minimum Tap Target**: All interactive elements (buttons, icons, menu options) must be at least **44×44px** (or `min-h-[44px]` in CSS).
* **Natural Reach**: Primary actions and bottom tab bars must remain in the lower 1/3 of the screen ("Natural Thumb Zone"). Destructive or secondary actions should sit at top corners or behind secondary action sheets.
* **Touch Highlight Lock**: Disable default browser highlight highlights using `-webkit-tap-highlight-color: transparent;` and `touch-action: manipulation;`.

### 2.2 Viewport & Safe Area Management
* **Dynamic Viewport Height**: Always use `100dvh` (Dynamic Viewport Height) instead of `100vh` or `100%` to prevent the browser address bar collapse from pushing layout content off-screen.
* **Safe Area Insets**: Always incorporate hardware safe area padding for notch devices and native gesture navigation bars:
  ```css
  padding-bottom: env(safe-area-inset-bottom, 16px);
  padding-top: env(safe-area-inset-top, 0px);
  ```
* **Overscroll Lock**: Prevent browser page bounce and accidental page reloads by setting:
  ```css
  html, body {
    overscroll-behavior-y: contain;
    overflow-x: hidden;
  }
  ```

### 2.3 Mobile Navigation Architecture
* **Bottom Tab Bar**:
  * Fixed at the bottom with backdrop blur (`backdrop-filter: blur(18px)`).
  * Maximum 4 to 5 main items. Use a dedicated **"More"** tab or bottom sheet for secondary navigation paths.
  * Active indicators should use clear visual state changes (color accent + top bar dot indicator).
* **Top Header Bar**:
  * Minimal height (52px to 56px).
  * Left side: Back arrow or branding avatar. Center: Page title (truncated). Right side: Notifications / Quick Action.

### 2.4 Bottom Sheets vs. Modals
* **Never use centered popups on mobile screens.** Replace all desktop modals with **Bottom Sheets** sliding up from the screen base.
* **Sheet Mechanics**:
  * Include a centered visual drag handle bar (`36px × 4px` with rounded edges).
  * Max height of `85vh` with inner scrollable body (`overflow-y: auto`).
  * Dismissible via backdrop tap or downward swipe gesture (>80px delta).

### 2.5 Native Mobile Gestures & Patterns
* **Pull-to-Refresh**:
  * Intercept top-of-page touch drags (`scrollTop <= 0`).
  * Render a custom animated circular progress gauge and spinner that triggers API invalidation/refresh without reloading the full web document.
* **Swipe Actions**:
  * Use horizontal swipe gestures for quick inline item actions (e.g., swipe left on a notification card to delete/archive).
* **Horizontal Filter Chips**:
  * Place filter choices in single-line horizontally scrollable chip containers (`overflow-x: auto`) with hidden scrollbars (`scrollbar-width: none`).

### 2.6 Mobile Typography & Density Scale
| Element | Font Size | Line Height | Weight | Style / Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Screen Title** | 20px - 22px | 1.2 | 800 (ExtraBold/Black) | Page headers |
| **Section Heading** | 15px - 16px | 1.3 | 700 (Bold) | Card titles, sheet titles |
| **Body Text** | 13px - 14px | 1.4 | 400 - 500 | Main content |
| **Subtext / Meta** | 11px - 12px | 1.4 | 400 | Dates, secondary labels |
| **Badge / Overline**| 9px - 10px | 1.0 | 800 | Uppercase tracking-widest |

---

## 3. Desktop Design Guidelines

### 3.1 Spatial Density & Grid Architecture
* **Container Max-Widths**: Standardize layout bounds across desktop viewports:
  * Compact Desktop: `1280px`
  * Wide Canvas / Dashboard: `1440px` or `1600px` max-width.
* **Multi-Column Workspaces**:
  * Use persistent 2-column or 3-column split layouts (e.g., Left Filter/Navigation Sidebar [260px] + Center Primary Feed [1fr] + Right Detail Panel [320px]).

### 3.2 Desktop Navigation & Controls
* **Persistent Left Sidebar**:
  * Icon + Label layout with active highlight fill.
  * Collapsible mode option for high-density workspaces.
* **Header & Toolbar**:
  * Breadcrumb trails for nested navigation depth (`Home / Classes / UG_3A`).
  * Global Search Bar (`Ctrl + K` / `Cmd + K` shortcut listener).

### 3.3 Desktop Data Tables & Modals
* **Dense Data Tables**:
  * Table rows with hover highlight feedback (`hover:bg-slate-50`).
  * Explicit column sorting indicators, column selection modals, and bulk checkbox actions.
  * Right-aligned Kebab (`...`) action dropdowns.
* **Centered Modals**:
  * Centered dialog boxes with explicit backdrop overlay (`bg-black/50`).
  * `Escape` key close listener and keyboard focus trapping.

---

## 4. Cross-Platform Feature Parity & Engineering Standards

### 4.1 Responsive Pattern Transformation Mapping
To ensure **100% feature parity**, use this exact pattern translation rule:

| Feature / UI Element | Desktop UI Implementation | Mobile PWA / APK Implementation |
| :--- | :--- | :--- |
| **Main Navigation** | Persistent Left Sidebar | Fixed Bottom Tab Bar + "More" Sheet |
| **Forms / Actions** | Centered Floating Modal | Bottom Sheet sliding up from base |
| **Item Options** | Kebab Dropdown (`...`) | Action Sheet with full-width tap rows |
| **Data Lists** | Multi-column HTML Table | Stacked Mobile Cards with key badges |
| **Data Export** | Column Selector Modal | Column Selector Bottom Sheet |
| **Filters** | Left Sidebar Accordions | Horizontal Scrollable Filter Chips |
| **Page Refresh** | Browser Refresh Button | Drag-down Pull-to-Refresh Spinner |

### 4.2 State Management & Performance
* **Optimistic UI Updates**: Instantly reflect user actions (likes, deletes, status toggles) in local UI state prior to API network completion, rolling back only on server error.
* **Caching & Invalidation**: Use React Query or SWR with unified key schemes (`["projects", id]`) to allow seamless pull-to-refresh invalidation.
* **Real-time WebSockets**: Gracefully fall back to polling if WebSocket connections drop on mobile cellular networks.

### 4.3 Color Palette & Theme Tokens
* **Primary Accent**: Tailored vibrant colors (e.g., Brand Orange `#F05A2B`, Indigo `#4F46E5`). Avoid pure `rgb(255,0,0)` or `rgb(0,0,255)`.
* **Dark Mode Strategy**: Use true black `#000000` or deep slate `#0F172A` for mobile OLED battery efficiency, with elevated card surfaces at `#1E293B`.

---

## 5. Implementation Quality Checklist

Before declaring any feature complete for cross-platform deployment:

- [ ] **Feature Parity Audit**: Are all desktop buttons, options, export filters, and modal inputs available on mobile?
- [ ] **Touch Target Check**: Are all tappable mobile items at least 44px high?
- [ ] **No Page Overflow**: Is horizontal scroll eliminated on all mobile screens?
- [ ] **Pull-to-Refresh**: Does dragging down at scroll top pull down the circular spinner and refresh page data without reloading HTML?
- [ ] **Safe Area Alignment**: Is there sufficient bottom padding (`env(safe-area-inset-bottom)`) so the bottom tab bar doesn't overlap phone navigation bars?
- [ ] **Modal to Sheet Transition**: Do all popups transform into smooth bottom sheets on screens under `< 768px`?
- [ ] **Clean Build**: Does `npm run build` or `vite build` complete with zero errors?
