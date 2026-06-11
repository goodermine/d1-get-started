# aaronellis.co.network — static rebuild

Lean static version of the site (was WordPress + Hello Elementor). Built with
[Eleventy](https://www.11ty.dev/). No PHP, no Elementor, no Contact Form 7, no theme JS.

## Layout

```
site/
  .eleventy.js          Eleventy config (trailing-slash URLs, passthrough assets)
  src/
    _includes/          base.njk layout + header.njk / footer.njk (our own chrome)
    _data/site.json     site title, tagline, logo, nav menus
    css/site.css        shared design tokens + header/footer/mobile-menu styles
    <path>/index.html   one page per URL (front matter: layout/title/permalink/wpId)
  assets/               logo + (downloaded) /assets/uploads images
  _site/                build output (gitignored)
```

Each page's `<style>` + content section is self-contained and carries its own scoped
`.ae-*` styles; the layout only adds the global header/footer.

## Build

```sh
cd site
npx @11ty/eleventy            # one-off build -> _site/
npx @11ty/eleventy --serve    # local dev server with live reload
```

## Regenerating pages from WordPress (migration tooling, in ../tools)

These read the live WP REST API and need a credential in the environment:

```sh
export WP_AUTH="user:application password"
node ../tools/inventory.mjs    # list every page/post + menus -> tools/inventory.json
node ../tools/extract.mjs      # dump rendered content -> tools/extracted/ (gitignored)
node ../tools/build-src.mjs    # turn extracted content into site/src/**/index.html
```

`tools/extracted/` is gitignored — it also contains the password-gated pages' plaintext.

## Done

- All 48 public pages build with our own header/footer chrome (no theme JS).
- `sitemap.xml`, `robots.txt`, and `.htaccess` 301s generated at build time.
- Client-side resource search (`assets/resource-search.js`) replaces the WP search
  box on the Wiki / Prompt Library indexes.
- Reusable client-side crypto gate (`assets/gate.js`) + `tools/encrypt-gate.mjs`.
- Contact: the site never used Contact Form 7 — "Contact" is a plain
  `mailto:` link, which works unchanged. No form service needed.

## Still TODO

- **Two private song-guide pages** (`/alex-private-song-guide/`, `/rilda-song-guide/`):
  build with `assets/gate.js` once the page passwords are provided (encrypt the
  guide HTML with `tools/encrypt-gate.mjs`). Plaintext is never committed.
- **Deploy** to the current host (Apache) — needs SFTP/control-panel access + docroot.
  Keep the existing `/wp-content/uploads/` directory in place so image URLs keep working.
- **Optional polish:** self-host the Inter/Oswald/Cinzel fonts the wiki/prompt pages
  `@import` from Google, and rewrite absolute `wp-content/uploads` URLs to root-relative.
