# Retiring WordPress on aaronellis.co.network

The site is now fully static. WordPress, PHP, the theme, and all plugins are no
longer used. Retirement happens in three phases — the first is automatic.

## Phase 1 — Neutralize (automatic, on deploy)

The `.htaccess` shipped in the deploy bundle (see `DEPLOY.md`) immediately:

- **Blocks all PHP execution** (`wp-login.php`, `xmlrpc.php`, `wp-cron.php`,
  `index.php`, and any shell that might be uploaded into `wp-content/`).
- **Blocks** `/wp-admin/`, `/wp-includes/`, and the `/wp-json/` REST API
  (this closes the `…/wp-json/wp/v2/users` username leak).
- **Blocks** `readme.html` / `license.txt` (which broadcast the WP version).
- Adds baseline security headers.

After deploying, confirm these now fail (403/404) while the site + media still work:

```
curl -I https://aaronellis.co.network/wp-login.php        # expect 403
curl -I https://aaronellis.co.network/wp-json/wp/v2/users # expect 403
curl -I https://aaronellis.co.network/readme.html         # expect 403
curl -I https://aaronellis.co.network/                    # expect 200 (static home)
curl -I https://aaronellis.co.network/wp-content/uploads/2026/06/4af19770308a475d8fe78e757bdaa888.mp3  # expect 200
```

## Phase 2 — Delete WordPress files (after a few days of the static site running fine)

In StackCP **File Manager** (web root, e.g. `public_html`), delete:

- `wp-admin/`            (directory)
- `wp-includes/`         (directory)
- `wp-content/plugins/`  (directory)
- `wp-content/themes/`   (directory)
- `wp-content/upgrade/`, `wp-content/cache/`, `wp-content/mu-plugins/` if present
- `index.php`, `wp-login.php`, `wp-cron.php`, `xmlrpc.php`, `wp-signup.php`,
  `wp-trackback.php`, `wp-activate.php`, `wp-blog-header.php`, `wp-comments-post.php`,
  `wp-links-opml.php`, `wp-load.php`, `wp-mail.php`, `wp-settings.php`, `wp-config.php`,
  `wp-config-sample.php`, `readme.html`, `license.txt`, `xmlrpc.php`

**KEEP:**

- `wp-content/uploads/`  — still serves images/audio (the Magnetic mp3 lives here)
- Everything from the static bundle: `index.html`, `assets/`, `css/`,
  every page directory, `sitemap.xml`, `robots.txt`, `.htaccess`

> Tip: the safe order is to **rename** `wp-admin` → `wp-admin_OLD` etc. first,
> confirm the site is unaffected for a day, then delete. Easy to undo.

## Phase 3 — Decommission the rest

- **Database:** once you're confident (give it a week or two), the WordPress
  MySQL database can be dropped/removed in StackCP. **Export a backup first** and
  keep it somewhere safe — it's your only copy of the original post content.
- **Cron:** remove any WordPress/wp-cron scheduled task in the StackCP panel.
- **Plugins/services:** cancel anything WP-specific (security plugin licenses,
  backup plugins, etc.). Mailchimp and Amazon links are external and unaffected.
- **Credentials:** delete the `azonixx` WordPress application password (it's the
  one committed in the old `wordpress/*/deploy.mjs` scripts and in git history).
  Nothing static needs it anymore.
- **SSH key:** the `claude-deploy` key can be removed from StackCP.

## Rollback

WordPress isn't gone until Phase 2/3. To revert during Phase 1, restore the
original `.htaccess` (and remove the static `index.html`) from the backup you
took before deploying.
