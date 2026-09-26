# ZAMIIGO UI/UX Design System & Component Guide

This guide is created specifically for the **UI/UX Designer** on the team. It provides a map of all frontend component files, styling rules, color tokens, typography scales, layout patterns, and guidelines for customizing the user interface.

---

## 🎨 1. Design System & Brand Identity

The ZAMIIGO Northern Community Logistics UI is designed around a **premium, ultra-clean aviation & logistics light mode theme** inspired by Zamiigo and Wilderness North brand colors:

- **Background (Canvas):** Crisp, refreshing ice blue canvas (`bg-zamiigo-ice-canvas` / `#F4F8FA`).
- **Primary Accent:** Zamiigo Deep Teal (`#0F766E`) and Bright Teal (`#14B8A6`).
- **Secondary Accent:** Northern Gold / Amber (`#F59E0B` / `#D97706`).
- **Container Surfaces:** White cards (`bg-white`) with light slate borders (`border-slate-200`) and soft shadows (`shadow-sm`, `shadow-md`).
- **Typography:** Sans-serif (Inter / System font) for primary UI copy; Monospace (`font-mono`) for metrics, weights, dates, order IDs, and aircraft stats.

---

## 🗺️ 2. Designer's File Map — Which File Controls What?

If you want to edit or redesign a specific section of the website, use this directory map to locate the exact source file:

### 🌐 Global Styling & Design Tokens

| Target UI Area | File Path | What to Edit |
| :--- | :--- | :--- |
| **Tailwind Color Palette & Theme Extensions** | [`tailwind.config.js`](file:///Users/kushmakani/Desktop/hackathon/tailwind.config.js) | Custom brand colors (`zamiigo-teal`, `zamiigo-ice`, `zamiigo-amber`), font families, border radii. |
| **Global CSS & Print Stylesheet** | [`src/index.css`](file:///Users/kushmakani/Desktop/hackathon/src/index.css) | Custom scrollbars, glassmorphism utilities, print layout CSS (`@media print`). |

---

### 📱 Layout Components & Modals

| Target UI Element | File Path | Description / Visual Elements |
| :--- | :--- | :--- |
| **Navigation Header** | [`src/components/Header.tsx`](file:///Users/kushmakani/Desktop/hackathon/src/components/Header.tsx) | Brand logo, Stage 1 / Stage 2 dataset toggle buttons, top action buttons (Upload CSV, Handheld, Settings), active tab navigation bar. |
| **Tab 1: Retailer Order Staging** | [`src/components/tabs/OrderEntryTab.tsx`](file:///Users/kushmakani/Desktop/hackathon/src/components/tabs/OrderEntryTab.tsx) | Superstore batch staging bar, status filter counters (Pending, Submitted, Picking, Packed, Staged, Dispatched), search bar, oversized unpackable items alert banner, household order accordion list. |
| **Tab 2: Order Picking & Totes** | [`src/components/tabs/OrderPickingTab.tsx`](file:///Users/kushmakani/Desktop/hackathon/src/components/tabs/OrderPickingTab.tsx) | Picker cart cards (3 to 8 totes per cart), tote volume & weight fill progress bars, item list per tote, drag/move tote action modal triggers, unassigned totes pool. |
| **Tab 3: Cessna 208 Flight Planner** | [`src/components/tabs/FlightPlannerTab.tsx`](file:///Users/kushmakani/Desktop/hackathon/src/components/tabs/FlightPlannerTab.tsx) | Multi-departure flight tabs (`DEP-01`, `DEP-02`, `DEP-03`), capacity KPI progress cards (Payload lb, Volume cu ft, Tote slots), binding constraint badges, AI Dispatch Brief modal trigger, Stage 2 Rollover Ledger, printable flight manifest table. |
| **Handheld Scanner Modal** | [`src/components/HandheldPickerModal.tsx`](file:///Users/kushmakani/Desktop/hackathon/src/components/HandheldPickerModal.tsx) | Mobile warehouse picker view ($375\text{px}$ width frame), simulated barcode scanner button, active tote picking checklist, item completion progress bar. |
| **CSV Upload Modal** | [`src/components/CsvUploadModal.tsx`](file:///Users/kushmakani/Desktop/hackathon/src/components/CsvUploadModal.tsx) | File dropzone for Orders CSV & Flight Capacity CSV, column mapping hints, strict error report box, dataset load button. |
| **Settings & Health Ledger Modal** | [`src/components/SettingsModal.tsx`](file:///Users/kushmakani/Desktop/hackathon/src/components/SettingsModal.tsx) | Operational limits configuration (editable tote safety weight limit, cart tote capacity), live audit rule health status (error & warning entries). |

---

## 🎨 3. Color Token Guidelines

Use these Tailwind color classes to maintain visual consistency:

```tsx
// Brand Colors
bg-zamiigo-teal    // Primary brand teal (#0F766E)
text-zamiigo-teal  // Brand teal text accent
bg-zamiigo-ice     // Soft icy highlight (#E0F2FE)
bg-zamiigo-amber   // Gold / Amber accent (#F59E0B)

// Alert Variants
// 1. Operational Error / Oversized Cargo (Rose)
bg-rose-50 border-rose-200 text-rose-800

// 2. Operational Warning / Rollover Notice (Amber)
bg-amber-50 border-amber-200 text-amber-800

// 3. Operational Success / Verified Audit (Emerald)
bg-emerald-50 border-emerald-200 text-emerald-800

// 4. Neutral Data Surface (Slate)
bg-slate-50 border-slate-200 text-slate-900
```

---

## 🔤 4. Typography Rules

1. **Section Headers & Titles:** Use `font-bold text-slate-900 tracking-tight`.
2. **Subtitles & Descriptions:** Use `text-slate-400 text-sm` or `text-xs`.
3. **Data Values, Weights, Volumes & IDs:** Always apply `font-mono` (Monospace) to align numbers cleanly (e.g. `HH #1042`, `2,877 lb`, `23.5"`).
4. **Status Badges:** Use `font-mono text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md`.

---

## 🖼️ 5. Icon Library (`lucide-react`)

All icons in the application are imported from `lucide-react`. Commonly used icons:

- `Plane`: Flight management & departures
- `Scale`: Aircraft payload weight metrics
- `Box`: Tote packing & container volume
- `Sparkles`: AI Gemini Dispatch Brief features
- `Printer`: Flight manifest print trigger
- `Smartphone`: Mobile handheld picker scanner
- `Sliders`: Operational settings & config modal
- `AlertTriangle` / `AlertCircle`: Constraint binding & audit notices
- `CheckCircle`: Verification & health confirmation

---

## 🖨️ 6. Print Stylesheet Styling (@media print)

When a dispatcher clicks **Print Flight Manifest** on Tab 3, the browser prints the currently selected departure manifest.

If you edit the print design, check [`src/index.css`](file:///Users/kushmakani/Desktop/hackathon/src/index.css) under `@media print`:
- Element class `.no-print` hides navigation, buttons, and sidebars automatically.
- Ensure text color is set to dark slate (`color: #0f172a`) for crisp printer output.

---

## 💡 7. Tips for UI Modifications

1. **Test Responsiveness:** Test views at $375\text{px}$ (mobile), $768\text{px}$ (tablet), and $1280\text{px}+$ (desktop).
2. **Keep Contrast High:** Ensure text on badge backgrounds meets WCAG accessibility guidelines.
3. **Avoid Unstyled Defaults:** Always wrap new inputs or selects in rounded containers (`rounded-xl border border-slate-200 bg-slate-50`).
