# Extreme Build — WordPress page (ID 201)

Rebuilt, compact + feature-rich version of `https://aaronellis.co.network/extreme-build/`.
The long, mostly-static 8-module scroll was replaced with a short page that holds the
same content behind a **tabbed module deck** and adds **real interactivity**.

## What changed
- **~Half the content size** (47KB vs 94KB) and far less scrolling — modules
  (Capabilities / Pipeline / Telemetry / Verification / Deploy) are now tabs.
- **Genuine animated features** (vanilla JS, no plugins, `prefers-reduced-motion` aware):
  - constellation canvas background + cursor glow
  - count-up hero stats, typewriter command line
  - live build cockpit (progress ring + rotating log)
  - animated telemetry feed + meters, signal bars, scroll reveals
- Fully **scoped under `.xb-extreme`** so it can't leak into / be broken by the theme.
- **Preserved** the structural nav/header chrome already on the page:
  `extreme-build-page-shell`, `extreme-build-mobile-nav-strip`,
  `extreme-remove-theme-mobile-menu`, the `<nav class="eb-mobile-nav-strip">`,
  `ae-vintage-shared-chrome`, `ae-header-polish-20260603`, `ae-mobile-menu-layer-fix-201`.

## Files
- `extreme-build.html` — standalone, **previewable** source (open in a browser). The
  WordPress block lives between the two `PASTE … INTO WORDPRESS` markers.
- `build-payload.mjs` — minifies the block (single-line CSS/JS, wpautop-safe), splices
  in the preserved chrome blocks, and wraps it in one `wp:html` block.
- `page-201.payload.html` — the exact content POSTed to page 201.
- `backup/page-201.original.html` — the previous live content (**rollback source**).

## Deploy / re-deploy
```bash
node wordpress/extreme-build/build-payload.mjs          # regenerate payload
# then POST page-201.payload.html as {"content": ...} to
# https://aaronellis.co.network/wp-json/wp/v2/pages/201  (Basic auth, app password)
```

## Rollback
POST the contents of `backup/page-201.original.html` back to page 201's `content`.

## Gotchas (important for re-deploys)
- The `azonixx` REST user lacks `unfiltered_html`, so WordPress HTML-encodes bare
  `&` in saved content (`&&` → `&#038;&#038;`), which **breaks inline JS** and left
  the page blank. Fix: `build-payload.mjs` **base64-wraps the main script**
  (`(new Function(atob("…")))()`) — base64 has no `& < >`, so it survives the
  sanitiser. Keep any new logic in that script (don't add raw `&&` elsewhere).
- Reveal animations are gated on `.xb-extreme.is-armed`, added by a tiny `&`-free
  inline script. If JS ever fails to run, the page degrades to fully visible
  rather than blank.

> Note: the site's CDN/origin (StackCDN → nginx) returned intermittent 502/500s during
> deploy; retries with backoff succeed. The REST API and rendered output were verified.
