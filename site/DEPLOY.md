# Deploying the static site to StackCP (aaronellis.co.network)

The build environment can't reach the host over SSH/FTP (only HTTPS is allowed
out), so deployment is a **File Manager upload** of the build output. The whole
site is static files — there's nothing to run server-side.

## What you're uploading

`npx @11ty/eleventy` produces `site/_site/`. The deploy bundle
(`dist/aaronellis-static-site.zip`) is simply the **contents** of `_site/`:
all the `index.html` pages, `/assets/` (images + fonts + JS), `/css/`,
`sitemap.xml`, `robots.txt`, and `.htaccess`.

## Steps (StackCP File Manager)

1. **Back up first.** In StackCP, take a full backup/snapshot of the current
   site (and the WordPress database) so you can roll back. At minimum, download
   the existing `.htaccess` from the docroot.
2. Open **File Manager** for the **aaronellis.co.network** package and go to the
   web root (usually `public_html`).
3. **Do NOT delete `wp-content/uploads/`.** The large companion audio file
   (`/wp-content/uploads/2026/06/4af1…mp3`, used by the Magnetic download gate)
   stays where it is and is referenced from there. Everything else (images,
   fonts) is bundled.
4. Upload `aaronellis-static-site.zip` into the web root and **Extract** it there.
   When asked, allow it to overwrite `index.html` / `.htaccess`.
   - The new `.htaccess` sets `DirectoryIndex index.html`, so the static pages
     take priority over WordPress's `index.php` immediately, and it carries the
     301 redirects (old `/home/`, `/category/*`, `/tag/*`, `/author/*`, etc.).
5. **Test** (see checklist below).
6. Once happy, you can optionally remove the now-unused WordPress files
   (`wp-admin/`, `wp-includes/`, `index.php`, `wp-login.php`, `xmlrpc.php`, …)
   to fully retire WordPress. **Keep `wp-content/uploads/`.**

## Post-deploy checklist

- Home `/`, a wiki page (e.g. `/knowledge-base/what-is-promptforge/`), Prompt
  Library, Books, Resume, Articles, a blog post — all load with the new header/footer.
- Wiki/Prompt **search box** filters the list as you type.
- **Magnetic** `/magnetic/`: the audio unlock still downloads (book password).
- **Private guides** `/alex-private-song-guide/` and `/rilda-song-guide/`:
  entering the new password reveals the guide; a wrong password shows an error.
- `/home/` redirects to `/`; an old `/tag/...` URL redirects to `/articles/`.
- Contact link opens a `mailto:` to completestrength@gmail.com.
- View source on any page: no `wp-content` plugin/theme scripts, no Elementor,
  no Google Fonts request.

## Alternative: deploy from your own computer over SSH

Your StackCP SSH key is set up, so from a machine that can reach port 22:

```sh
# from the repo root, after `cd site && npx @11ty/eleventy`
rsync -avz --delete-after \
  --exclude 'wp-content' \
  site/_site/ aaronellis.co.network@ssh.us.stackcp.com:public_html/
```

(Adjust `public_html` to the real docroot. `--exclude wp-content` protects the
uploads directory. Drop `--delete-after` if other files must remain.)
