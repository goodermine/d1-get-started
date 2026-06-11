# Mobile nav resize-close fix

## The bug (user report)
On mobile, tapping the burger opens the menu, but the moment you touch it to
scroll, the menu vanishes — while the toggle still shows **X**. Tapping the X
"re-opens" the menu, and the cycle repeats. The menu is effectively unusable.

## Root cause (Hello Elementor 3.4.9, `hello-frontend.js`)
When the menu opens, the theme registers `window.addEventListener('resize',
() => this.closeMenuItems())`. On phones, starting to scroll collapses the
browser URL bar, which **fires a resize event** → the menu closes instantly.

Worse, `closeMenuItems()` only removes `.elementor-active` from the toggle
holder. It never resets `aria-expanded` on the button (so the X stays) nor
`aria-hidden`/`inert` on the dropdown — leaving the widget in a desynced
state. (Its `removeEventListener` also passes a fresh arrow function, so the
rogue listener is never actually removed.)

## The fix (`nav-fix.js` + CSS, injected per page)
Two layers, appended to page/post content as an idempotent
`<!-- wp:html -->` block (`ae-nav-resize-fix-css` / `ae-nav-resize-fix-js`):

1. **CSS** — dropdown visibility follows `aria-hidden` *only*
   (display/opacity/visibility/transform forced). The buggy close path never
   touches `aria-hidden`, so a URL-bar resize can no longer hide an open menu.
2. **JS shim** — a `MutationObserver` on the holder's `class` and the
   dropdown's `aria-hidden`: while the dropdown is genuinely open
   (`aria-hidden="false"`), re-adds a stripped `.elementor-active`; keeps the
   toggle's `aria-expanded` in sync. Real closes (which set
   `aria-hidden="true"`) pass through untouched. Delivered as a base64
   `data:` script so WordPress's content sanitiser can't mangle it.

## Coverage
`deploy.mjs` targets every page/post that renders the standard theme header:
main pages (453, 15, 448, 232, 194, 189, 355, 356, 327), all published
children of 355 (wiki) and 356 (prompt library), and all published posts.
Skipped: elementor_canvas pages (no theme header: 282, 276, 263, 272, 280),
201 (own nav strip), 562 (header hidden).

Idempotent — re-running strips any previous block and appends the current one.
Paced (1.5 s between writes, long 429 backoff) because the host rate-limits
bursts of REST writes.

## Verified
Puppeteer mobile emulation (390×844, touch): open menu → viewport height
change (simulated URL-bar collapse) + explicit `resize` events → menu stays
open, toggle stays in sync → single tap on X closes. Screenshot:
`nav-open-after-resize.png` in session shots.
