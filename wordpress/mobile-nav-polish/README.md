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

## /articles/ — RESOLVED (2026-06-10)
Page 232 was set as the WordPress posts page, so its hand-designed content
(31KB, including ae-mobile-menu-layer-fix-232 and the polish block) never
rendered — the theme blog archive showed instead, unreachable by content CSS.
Fix: `page_for_posts` was unset (232 → 0) via /wp/v2/settings, so /articles/
now renders its designed page with all fixes. The designed page lists the same
four published posts; individual post URLs are unaffected. Revert anytime by
setting `page_for_posts` back to 232.
NOTE: new blog posts will NOT auto-appear on /articles/ — add them to the
designed page (matches how the rest of the site is maintained).

`customizer-additional-css.css` is now optional: pasting it into
**wp-admin → Appearance → Customize → Additional CSS** makes the polish global
and future-proof, but all 10 current pages are already covered.
