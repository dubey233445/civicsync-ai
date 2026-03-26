# Design System Strategy: The Digital Sentinel

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sentinel."** 

In the high-stakes world of workforce management, software should not feel like a cluttered spreadsheet; it should feel like a high-end command center. We are moving away from the "generic SaaS" aesthetic of flat boxes and harsh lines. Instead, we embrace **Atmospheric Depth**. 

This system breaks the traditional grid by using intentional asymmetry—where data-heavy panels are balanced by expansive negative space—and "The Digital Sentinel" aesthetic. We use overlapping surfaces and high-contrast typography scales to ensure that while the platform is complex, it feels effortless, secure, and cutting-edge. We don't just display data; we curate it.

---

## 2. Colors & Surface Philosophy
The palette is built on a foundation of deep, nocturnal tones, punctuated by a vibrant, "electric" primary blue that signifies action and precision.

### Surface Hierarchy & Nesting
We strictly adhere to a **Tonal Layering** model. To create a "nested" depth that feels high-end, treat the UI as stacked sheets of tinted glass.
*   **Base Level:** `surface` (#060d20) is the canvas.
*   **Sectional Level:** Use `surface-container-low` (#091328) for large secondary areas.
*   **Actionable Level:** Use `surface-container` (#0f1930) or `surface-container-high` (#141f38) for primary cards and interaction zones.
*   **The "No-Line" Rule:** 1px solid borders for sectioning are strictly prohibited. Boundaries are defined solely through these background shifts. If a section needs to stand out, change its token level (e.g., a `surface-container-highest` card sitting on a `surface-container` background).

### The Glass & Gradient Rule
To provide "soul" to the professional atmosphere:
*   **Glassmorphism:** Use semi-transparent `surface-variant` with a 12px to 20px backdrop-blur for floating navigation bars or modal headers.
*   **Signature Gradients:** Main CTAs should not be flat. Use a linear gradient transitioning from `primary_dim` (#316bf3) to `primary` (#90abff) at a 135-degree angle to create a sense of metallic sheen and energy.

---

## 3. Typography: Editorial Authority
We use **Manrope** for its geometric yet approachable character. The hierarchy is designed to feel like a premium editorial piece, where large headlines provide an immediate "at-a-glance" status.

*   **Display Scale:** Use `display-lg` (3.5rem) and `display-md` (2.75rem) sparingly for high-level dashboard metrics. These should have a slight negative letter-spacing (-0.02em) to feel tighter and more "designed."
*   **Headline & Title:** `headline-sm` (1.5rem) and `title-lg` (1.375rem) serve as the primary anchors for modules. Pair these with `on_surface` (#dee5ff) for maximum clarity.
*   **Functional Text:** `body-md` (0.875rem) is the workhorse. For secondary metadata, use `label-md` (0.75rem) with the `on_surface_variant` (#a3aac4) token to create a clear visual hierarchy through color rather than just size.

---

## 4. Elevation & Depth
In this system, "Elevation" is a lighting effect, not a structural one.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` (#000000) card placed on a `surface-container-low` (#091328) section creates a "sunken" utility look, while a `surface-container-highest` card creates a natural lift.
*   **Ambient Shadows:** For floating elements (Modals, Popovers), use extra-diffused shadows.
    *   *Shadow Recipe:* `0px 24px 48px -12px rgba(0, 0, 0, 0.5)`. 
    *   The shadow must feel like an occlusion of the ambient blue light, never a grey "drop shadow."
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline_variant` (#40475d) at **20% opacity**. This creates a "shimmer" rather than a hard line.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary_dim` to `primary`. Roundedness: `md` (0.375rem).
*   **Secondary:** Ghost style. No background, `outline` (#6d758c) at 30% opacity, `on_surface` text.
*   **Tertiary:** No border, no background. Use `primary` (#90abff) for text.

### Refined Form Elements (Inputs)
*   **Standard State:** `surface-container-high` background, no border.
*   **Focus State:** A 1px "Ghost Border" using `primary` at 40% and a subtle `primary` outer glow (4px blur).
*   **Error State:** Background shifts to a subtle tint of `error_container` (#9f0519) at 10% opacity, with `error` (#ff716c) text.

### Cards & Lists
*   **Forbid Dividers:** Horizontal lines are replaced by vertical whitespace (Spacing Scale `6` or `8`).
*   **Interactive Cards:** On hover, a card should shift from `surface-container` to `surface-container-highest`. Do not move the card (no "pop" up); only shift the tonal depth.

### Signature Component: The "Pulse" Chip
*   For workforce status (Active/Away), use a `secondary_container` chip with a soft `secondary` glow. This reinforces the "Sentinel" theme of constant, secure monitoring.

---

## 6. Do's and Don'ts

### Do
*   **DO** use asymmetric layouts. Place a large `display-md` metric on the left balanced by a very "quiet" `body-sm` list on the right.
*   **DO** use `surface-bright` (#1f2b49) sparingly for subtle "internal" highlights within a dark container.
*   **DO** respect the `12` (3rem) and `16` (4rem) spacing tokens between major sections to let the design breathe.

### Don't
*   **DON'T** use 100% white (#ffffff) for text. Always use `on_surface` (#dee5ff) to prevent eye strain against the dark background.
*   **DON'T** use standard 1px borders to separate list items. Use tonal shifts or 12px of vertical space.
*   **DON'T** use "Pure Black" for backgrounds unless it is the `surface-container-lowest` for a specific "sunken" UI element.

### Accessibility Note
While we use a dark, sophisticated palette, always ensure that text using `on_surface_variant` on `surface-container` maintains a 4.5:1 contrast ratio. If in doubt, promote the text to `on_surface`.