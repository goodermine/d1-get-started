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

## Still TODO (see /root/.claude/plans plan file)

- Localize `wp-content/uploads` images into `assets/` and self-host the Inter/Oswald/Cinzel
  fonts the wiki/prompt pages use (currently still loaded from the live domain / Google).
- Client-side crypto gate for the two private song guides (reuse the `/magnetic/` pattern).
- Replace the Contact Form 7 form with a static form service.
- 301 redirect map + `sitemap.xml` / `robots.txt`.
- Deploy to the current host (needs SFTP/control-panel access).
