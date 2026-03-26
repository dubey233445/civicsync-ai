# Design System Specification: The Executive Architect

## 1. Overview & Creative North Star
The "Executive Architect" is the creative North Star for this design system. It moves beyond the utilitarian nature of workforce management to create a digital environment that feels like a high-end, bespoke command center. 

While inspired by the information density of Tableau and the clean canvas of Notion, this system rejects the "boxy" and "grid-locked" nature of enterprise software. Instead, it utilizes **Atmospheric Depth** and **Intentional Asymmetry**. By prioritizing tonal shifts over rigid borders, we create a UI that breathes. The goal is to make complex data feel "curated" rather than merely "displayed," using sophisticated layering to guide the eye toward critical workforce insights.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, nocturnal foundation, utilizing a "Material-Editorial" approach to hierarchy.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Structural boundaries must be defined solely through:
1.  **Background Color Shifts:** Placing a `surface-container-low` component on a `surface` background.
2.  **Tonal Transitions:** Using subtle value changes to imply the start of a new data cluster.

### Surface Hierarchy & Nesting
Treat the interface as a series of physical layers—like stacked sheets of fine, smoked glass.
*   **Base Layer:** `surface` (#0b1326) – The canvas.
*   **Structural Sections:** `surface-container-low` (#131b2e) – For sidebar foundations and secondary panels.
*   **Primary Content Containers:** `surface-container` (#171f33) – For main data tables and KPI groupings.
*   **Active/Elevated Elements:** `surface-container-highest` (#2d3449) – For active states or modal overlays.

### The "Glass & Gradient" Rule
To escape the "flat" look, use Glassmorphism for floating widgets (like the geographic heatmap controls). Use the `surface-variant` color at 60% opacity with a `backdrop-blur` of 20px. 
*   **Signature CTA Texture:** Use a linear gradient for primary actions: `primary-container` (#2563eb) to a slightly darker shift of `primary` (#b4c5ff at 20% opacity) to provide a "lit-from-within" professional polish.

---

## 3. Typography: The Editorial Scale
We utilize two high-performance typefaces: **Manrope** for authoritative structural expression and **Inter** for data-heavy utility.

*   **Display & Headlines (Manrope):** These are the "anchors." Use `display-md` for high-level workforce metrics to create a sense of scale and importance. The geometric nature of Manrope provides the "Premium" feel.
*   **Body & Labels (Inter):** Inter is used for all "work" text. It is optimized for the readability of names, dates, and figures in data tables.
*   **The Hierarchy Strategy:** Establish a high-contrast ratio between `headline-lg` and `body-sm`. This creates an editorial "rhythm" that makes a data-heavy dashboard feel less like a spreadsheet and more like an executive briefing.

---

## 4. Elevation & Depth
Hierarchy is achieved through **Tonal Layering**, not structural lines.

*   **The Layering Principle:** Place a `surface-container-lowest` (#060e20) card inside a `surface-container-high` (#222a3d) section to create a "recessed" look for data inputs, or vice-versa for "lifted" cards.
*   **Ambient Shadows:** For floating elements (Modals, Tooltips), use an extra-diffused shadow: `offset-y: 12px`, `blur: 32px`. The shadow color must be a tinted version of `surface_container_lowest` at 40% opacity—never pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token (#434655) at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components & Data Visualization

### KPI Cards
*   **Style:** No borders. Use `surface-container` and `xl` (1.5rem) corner radius.
*   **Detail:** Title in `label-md` (Inter), value in `headline-lg` (Manrope).
*   **Indicator:** Success metrics use `secondary` (#4edea3) with a 10% opacity glow.

### Data Tables & Lists
*   **Rule:** Forbid divider lines. Separate rows using vertical white space (`spacing-4` / 0.9rem). 
*   **Alternating Tones:** Use a subtle `surface-container-low` background on hover to indicate row selection.
*   **Typography:** Column headers must be `label-sm` in `on-surface-variant` with 0.05em letter spacing for a "Pro" aesthetic.

### Geographic Heatmap Widget
*   **Integration:** The widget should appear "integrated" into the layout via a `xl` corner radius.
*   **Styling:** Use a `surface-container-lowest` base for the map container. Heatmap points should utilize the `primary` (#b4c5ff) to `primary_container` (#2563eb) spectrum.

### Buttons & Inputs
*   **Primary Button:** `primary-container` background, `on-primary-container` text. `xl` corners.
*   **Input Fields:** `surface-container-highest` background. No border, only a 2px `primary` bottom-stroke on focus.
*   **Chips:** Use `surface-variant` with `full` (9999px) rounding. For active filters, use `secondary-container` with `on-secondary-container` text.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use white space as a structural element. The `spacing-16` (3.5rem) token should be used between major dashboard sections.
*   **DO** use "nested rounding." If a card has an `xl` (1.5rem) corner, the buttons inside it should use `md` (0.75rem) to maintain visual harmony.
*   **DO** prioritize "low-contrast" for non-essential data. Use `on-surface-variant` for secondary information to keep the user’s focus on primary KPIs.

### Don't
*   **DON'T** use 1px solid lines to separate menu items or table rows. Use `spacing` and `tonal shifts`.
*   **DON'T** use pure black (#000000) for shadows or backgrounds. Always use the specified `surface` tokens.
*   **DON'T** use the `primary` blue for success states. Always reserve `secondary` (#4edea3) for positive workforce trends.
*   **DON'T** overcrowd the sidebar. Use `spacing-6` between navigation items to maintain the "Premium" editorial feel.