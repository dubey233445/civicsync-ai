```markdown
# Design System Strategy: The Tactical Sentinel

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Tactical Sentinel."** 

Field work is often chaotic, high-stakes, and physically demanding. Most utility apps feel like spreadsheets crammed into a screen; this design system rejects that. It is a high-precision instrument that feels like a premium piece of gear. We achieve this by moving away from "template" layouts in favor of an **Editorial Utility** aesthetic. By utilizing intentional asymmetry, oversized typography scales for legibility in sunlight, and layered depth, we create a tool that is as authoritative as a blueprint and as intuitive as a consumer app.

## 2. Colors
Our palette is anchored in a deep slate "Obsidian" base to reduce eye strain, punctuated by high-vibrancy "Electric Blue" and "Active Emerald."

*   **The "No-Line" Rule:** We do not use 1px solid borders to define sections. Borders are a crutch for poor spatial planning. Boundaries must be defined through background color shifts. For example, a `surface_container_low` card should sit on a `surface` background. The eye will naturally find the edge through the tonal shift.
*   **Surface Hierarchy & Nesting:** Think of the UI as a physical stack.
    *   **Base Layer:** `surface` (#0b1326).
    *   **Sectional Layer:** `surface_container_low` (#131b2e) for grouping broad content.
    *   **Component Layer:** `surface_container` (#171f33) for interactive elements like cards.
*   **The "Glass & Gradient" Rule:** To avoid a flat, "Material-Lite" look, use Glassmorphism for floating UI elements (like bottom navigation or sticky headers). Use `surface_bright` at 60% opacity with a `16px` backdrop blur.
*   **Signature Textures:** For primary actions, do not use flat hex codes. Apply a subtle 15-degree linear gradient from `primary_container` (#2563EB) to `primary` (#B4C5FF). This creates a "light-source" effect that makes buttons feel tactile and pressed from physical material.

## 3. Typography: The Manrope Technicality
Manrope is our voice. It is geometric enough to feel technical and precise, but its open terminals keep it approachable for daily use.

*   **The Power Scale:** 
    *   **Display/Headline:** Use `headline-lg` for dashboard summaries. This isn't just a label; it’s a statement of data.
    *   **Title:** Use `title-lg` for task names. 
    *   **Body:** `body-lg` is the workhorse. Never go below `body-md` for field-critical data to ensure readability under direct sunlight.
*   **Tactical Tracking:** For all `label-sm` and `label-md` tokens (used in metadata or tags), increase letter spacing by 5% and use All Caps. This distinguishes "Instructional" text from "Content" text.

## 4. Elevation & Depth
In this design system, elevation is conveyed through light and tone, not just shadows.

*   **The Layering Principle:** Depth is achieved by "stacking" container tiers. Place a `surface_container_highest` element over a `surface_container_low` background to create a natural, soft lift.
*   **Ambient Shadows:** If a floating action button (FAB) or modal requires a shadow, it must be an "Ambient Shadow." Use the `on_surface` color at 8% opacity with a blur of `24px` and a `Y-offset` of `8px`. This mimics natural light rather than a digital drop-shadow.
*   **The "Ghost Border" Fallback:** If a border is required for extreme high-contrast accessibility, use a "Ghost Border." Apply the `outline_variant` token at 15% opacity. It should be felt, not seen.
*   **Tactile Roundness:** Every container follows the **12px (0.75rem)** "Tactile" rule. This specific radius makes the app feel friendly to the touch while maintaining enough corner-sharpness to look professional.

## 5. Components

### Buttons & Inputs
*   **Primary Action:** A gradient-filled container (`primary_container`) with `on_primary_container` text. 12px corner radius. 
*   **Input Fields:** Use `surface_container_highest` as the fill. No bottom line. The label should use `label-md` and sit above the field, not inside it, to ensure the field’s purpose is never hidden during data entry.

### Chips & Badges
*   **Status Chips:** For status like "Complete," use a "Glow State." Use `secondary_container` (#00a572) for the background, but add a 2px inner glow of `secondary` (#4edea3) to make the emerald "pop" against the dark slate.

### Cards & Lists
*   **The "No Divider" Mandate:** Forbid the use of 1px divider lines in lists. Use `spacing-4` (1rem) of vertical whitespace to separate items, or alternating tonal shifts between `surface_container_low` and `surface_container_lowest`.
*   **Tactical Metadata:** In list items, use the emerald `secondary` color for "Live" data (e.g., a ticking clock or GPS signal) to draw the eye immediately to what is changing.

### Custom Component: The "Active Horizon"
For field workers, the bottom 25% of the screen is the most accessible. We use a floating, glassmorphic "Horizon Bar" for primary navigation. This uses `surface_bright` at 70% opacity with an `8px` ghost border to separate it from the content flowing beneath it.

## 6. Do's and Don'ts

### Do
*   **Do** use the `secondary` emerald green for success and "Go" actions only. It is a high-signal color.
*   **Do** lean into asymmetry. For example, a "Summary Card" might have a large `display-sm` number on the left and `title-sm` text stacked on the right.
*   **Do** prioritize high contrast. Ensure `on_surface` text always sits against a background that meets a minimum 7:1 contrast ratio for outdoor visibility.

### Don't
*   **Don't** use pure black (#000000). It creates "ghosting" on mobile screens and feels unrefined. Use our `surface` (#0b1326).
*   **Don't** use standard "Material Design" shadows. They look like "out-of-the-box" software. Stick to tonal layering.
*   **Don't** use icons without labels for critical field actions. A worker in the rain shouldn't have to guess what a "hamburger" menu does. Use `label-sm` text.

---
*Design System Document — High-End Utility Standards*```