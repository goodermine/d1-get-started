# Mobile nav + header polish

Fixes the mobile header/menu across the site: compact one-row header (logo left,
burger right, tagline hidden on mobile), logo capped at 160px (138px mobile),
and the open dropdown restyled to the brand (dark panel, cream links, gold
current-page highlight) instead of Hello Elementor's default white boxes.
Also enforces the aria-hidden show/hide fix so the menu can't spill open.

## Deployed via REST (per-page blocks)
`deploy.mjs` appends `<style id="ae-mobile-nav-polish-{id}">` (from `polish.css`)
to pages 453, 15, 448, 232*, 194, 189, 355, 356, 327. Idempotent — re-running
replaces the block. Originals saved in `backup-before-polish.json`.

*232 (Articles) is the **posts page** (`page_for_posts`), so WordPress never
renders its content — the per-page block cannot reach it, and no REST route
exposes the Customizer CSS. Page 201 (Extreme Build) keeps its own nav strip;
page 562 (free-audio) hides the header entirely.

## To also fix /articles/ (one manual step)
Paste `customizer-additional-css.css` at the END of
**wp-admin → Appearance → Customize → Additional CSS**. It is the same rules
without page scoping; it is safe alongside the per-page blocks and makes the
fix truly global (future pages included).
