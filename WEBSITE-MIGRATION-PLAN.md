# Aaron Ellis — WordPress → Static Site Migration Plan

**Current site:** https://aaronellis.co.network (WordPress)
**Target:** A static site deployed to StartCP shared hosting via FTP
**Core goal:** A site that is easy to keep clean, where a single change (a colour, a font, a menu item) propagates everywhere automatically.

> Status: Draft for review. Nothing has been built yet. See **§11 Decisions I need from you** before we start Phase 1.

---

## 1. Why static, and the one principle that matters

WordPress is hard to keep clean because **content, design, and structure live tangled together** across a database, a theme, and plugins. To "change a colour once and have it apply everywhere," the new build is organised around a **single source of truth** for three separate concerns:

| Concern | Single source of truth | Change once → applies everywhere |
| --- | --- | --- |
| **Look** (colours, fonts, spacing) | One `tokens.css` file of CSS variables | Edit `--color-accent` → every button/link/heading updates |
| **Structure** (header, nav, footer, page shell) | One `Layout` component + one `nav.ts` data file | Edit the menu array → nav changes on all pages |
| **Content** (articles, books, pages) | Markdown / data files, one per item | Add a book = add one file; no database |

A folder of hand-written HTML files would be **worse** than WordPress for this, because the nav and styles would be copy-pasted into every file. The fix is a **static site generator** that *builds* the final HTML from shared pieces.

---

## 2. Recommended stack

**Astro** (static site generator).

- Purpose-built for content-heavy sites; Markdown and "content collections" are first-class.
- Real components for shared nav/footer/layout (solves the "menu in one place" requirement).
- Outputs **plain static HTML/CSS/JS** — drops straight onto your FTP host, no Node server, no database, nothing to keep patched.
- Tiny JS footprint by default (fast pages, good SEO), but can still do the small interactive bits you have (password gates, form handling) with a sprinkle of vanilla JS.
- Easy to add a blog, tags, and an RSS feed later.

**Alternatives considered**
- **Eleventy (11ty):** also excellent and even lighter; fewer batteries included, a bit more wiring. A fine choice if we want maximum simplicity.
- **Hugo:** fastest builds, but templating is less friendly to edit and theming is fiddlier.
- **Hand-written HTML + a tiny include tool:** rejected — doesn't meet the "change once" goal cleanly.
- **Plain static export of WordPress (e.g. Simply Static):** rejected — it freezes the *current* mess rather than giving you a clean, maintainable base.

Recommendation: **Astro.** The rest of this plan assumes it, but the architecture (tokens / layout / content) is portable to 11ty if you prefer.

---

## 3. Information architecture (page-by-page migration map)

Legend: **Keep** = migrate as-is · **Rebuild** = re-implement cleanly · **Decide** = needs your input (see §11)

| # | Current page | URL to preserve | Type | Plan |
| --- | --- | --- | --- | --- |
| 1 | Home | `/` | Landing | **Rebuild** as static — hero, "Door 01 / Door 02", About. |
| 2 | Magnetic | `/magnetic` | Sales page + gated audio | **Rebuild**; password-gated audio — see §6. |
| 3 | Real Estate Buddy | `/real-estate-buddy` | Marketing | **Keep** (static). |
| 4 | Private Pages | `/private-pages` | Gated directory | **Rebuild**; gating caveats — see §6. |
| 5 | Extreme Build | `/extreme-build` | Marketing + "live" dashboard | **Rebuild**; dashboard becomes static (numbers from a data file) — see §6. |
| 6 | Articles (index) | `/articles` | Blog listing | **Rebuild** as a generated index from Markdown. |
| 6a | Bring Me the Mess | `/bring-me-the-mess` | Article | **Keep** → Markdown. |
| 6b | Stop Prompting, Start Harnessing | `/stop-prompting-start-harnessing` | Article | **Keep** → Markdown. |
| 6c | Synapse_CoR | (existing slug) | Article | **Keep** → Markdown. |
| 6d | PromptForge | (existing slug) | Article | **Keep** → Markdown. |
| 7 | Resume | `/resume` | Profile | **Keep** (static); optional "Download PDF". |
| 8 | Books | `/books` | Product listing | **Rebuild** from a `books` data collection (6 Magnetic + 2 others, with release dates / buy links). |
| 9 | Contact | `/contact` | **404 today** | **Rebuild** — real contact page + form (see §6). |
| 10 | Portfolio | `/portfolio` | **404 today** | **Decide** — build, fold into Resume, or drop from menu. |
| 11 | Wiki | `/wiki` | **404 today** | **Decide** — build, or drop from menu. |
| 12 | Prompts | `/prompts` | **404 today** | **Decide** — build (a prompt library), or drop from menu. |

**Note:** four menu items currently 404. We should not ship a menu that links to dead pages. Phase 1 menu will only include real pages; the four "Decide" items get built or removed based on your answers.

**Private/gated content behind Private Pages:** Alex's Private Song Guide, Rilda's Private Song Guide (+ Magnetic companion audio). See §6 for how gating works on a static host.

---

## 4. Project & folder structure

```
website/
├── astro.config.mjs
├── package.json
├── public/                     # copied verbatim → favicon, robots.txt, audio, PDFs, images
│   ├── audio/
│   └── img/
├── src/
│   ├── styles/
│   │   ├── tokens.css          # ★ SINGLE SOURCE OF TRUTH for colours/fonts/spacing
│   │   └── global.css          # base element styles built on the tokens
│   ├── data/
│   │   ├── nav.ts              # ★ SINGLE SOURCE OF TRUTH for the menu
│   │   ├── site.ts            # site name, tagline, contact email, social
│   │   └── books.ts           # the book catalogue (title, date, cover, buy link)
│   ├── layouts/
│   │   ├── BaseLayout.astro    # <html> shell: head, header, footer, slots
│   │   └── ArticleLayout.astro # blog post wrapper (built on BaseLayout)
│   ├── components/
│   │   ├── Header.astro        # renders nav from data/nav.ts
│   │   ├── Footer.astro
│   │   ├── BookCard.astro
│   │   ├── ArticleCard.astro
│   │   └── PasswordGate.astro  # reusable client-side gate (with caveats)
│   ├── content/
│   │   └── articles/           # one .md per article (the 4 above, + future)
│   │       ├── bring-me-the-mess.md
│   │       └── ...
│   └── pages/                  # file = route
│       ├── index.astro         # /
│       ├── magnetic.astro
│       ├── real-estate-buddy.astro
│       ├── private-pages.astro
│       ├── extreme-build.astro
│       ├── resume.astro
│       ├── books.astro
│       ├── contact.astro
│       └── articles/
│           ├── index.astro     # /articles  (auto-lists content/articles)
│           └── [slug].astro    # /<article-slug>
└── dist/                       # build output → this is what gets uploaded via FTP
```

The `website/` folder keeps the site self-contained inside this repo (which also holds the D1 worker and the ebook manuscript).

---

## 5. The theming system (how "change once" actually works)

**`src/styles/tokens.css`** — every visual decision in one file:

```css
:root {
  /* Brand */
  --color-bg:        #0d0d0f;   /* near-black */
  --color-surface:   #16161a;   /* cards */
  --color-text:      #e8e8ea;
  --color-muted:     #9a9aa2;
  --color-accent:    #c9a24b;   /* the gold */
  --color-accent-2:  #e7c97a;

  /* Type */
  --font-heading: "Cormorant Garamond", serif;
  --font-body:    "Inter", system-ui, sans-serif;

  /* Rhythm */
  --space: 1rem;
  --radius: 12px;
  --maxw: 72rem;
}
```

Every component references `var(--color-accent)` etc. — never a raw hex. So:
- Rebrand the gold → edit **one line**.
- Swap the heading font → edit **one line**.
- (Optional) a light theme later = a second block of variable values, no markup changes.

**`src/data/nav.ts`** — the menu in one place:

```ts
export const nav = [
  { label: "Home", href: "/" },
  { label: "Books", href: "/books" },
  { label: "Articles", href: "/articles" },
  { label: "Real Estate Buddy", href: "/real-estate-buddy" },
  { label: "Resume", href: "/resume" },
  { label: "Contact", href: "/contact" },
];
```

`Header.astro` loops over this array. Add/remove/reorder a menu item → it updates on every page, desktop and mobile, automatically.

---

## 6. Handling the non-static bits

A static host can't run PHP/WordPress, so each interactive feature needs a deliberate decision:

**a) Password-gated content** (Magnetic audio, Private Song Guides)
> ⚠️ **Important honesty note:** *Any* password check that runs in the browser on a static site is **not real security** — a determined visitor can read the page source or network traffic and get the file. WordPress's password protection is server-side, so it's genuinely stronger here.
Options, in order of effort/strength:
1. **"Soft gate"** — client-side password that hides a link/audio. Fine for casual gating (keeps it out of search engines and honest people out). Simple. Not secure.
2. **Static encryption** — encrypt the file; the correct password decrypts it in-browser (e.g. an age/StatiCrypt-style approach). The *encrypted* blob is safe even if downloaded; only the password unlocks it. **Recommended** if the content is genuinely private.
3. **Unguessable URL** — put the file at a long random path and just share the link. No password UI at all.
We'll pick per item. (Which content is "casual" vs "must stay private"? — §11.)

**b) Contact form & Extreme Build waitlist**
No backend means no PHP mail. Use a **static form service** — Formspree, Web3Forms, or Basin. You paste a form `action` URL, submissions are emailed to you, spam-filtered, free tier is plenty. Alternatively a plain `mailto:` link if you want zero dependencies.

**c) Article comments**
WordPress comments can't carry over to static. Options: **drop them** (simplest, recommended for a portfolio), or add **Giscus** (comments backed by GitHub Discussions) / Disqus if you want them.

**d) Extreme Build "live" metrics dashboard**
The numbers (98% REST performance, etc.) become values in a data file and render as static cards. Keeps the look, removes the moving parts. If you want them to *animate* on scroll, that's a few lines of vanilla JS — no backend needed.

**e) Book purchases**
These already link out to Amazon / external vendors — those links migrate unchanged. No e-commerce engine needed on the site.

---

## 7. Build & deploy to your FTP host

**Build:** `npm run build` → produces `dist/` (plain HTML/CSS/JS). That folder's contents go into your host's web root (under `/home/sites/43a/a/a848658f7b/` — likely a `public_html`/`www` subfolder; I'll confirm the exact path on first deploy).

**Two deploy paths:**

1. **Automated (recommended): GitHub Actions → FTP.**
   On every push to the site branch, an Action builds the site and uploads `dist/` via FTP (e.g. `SamKirkland/FTP-Deploy-Action`, which only uploads changed files).
   - Your FTP **username/password are stored as encrypted GitHub Secrets — never in the repo, never in the code.** This is the clean, professional setup and means "edit a file → push → site updates" with zero manual FTP.

2. **Manual:** `npm run build`, then drag `dist/` into your host's File Manager or FileZilla. Good as a fallback / first deploy.

> **Sandbox caveat:** this cloud environment I'm running in may have **outbound FTP (port 21) blocked** by its network policy, so I likely can't push directly to your host from here. The GitHub Actions route sidesteps that entirely (GitHub does the upload). I'll confirm connectivity when we reach deploy.

> **Credential handling:** I will not put the FTP password into any file, commit, or PR. It lives only in (a) your host and (b) GitHub Secrets, both of which you control.

---

## 8. Migration / SEO safety

- **Preserve URLs.** Article slugs (`/bring-me-the-mess`, etc.) and page paths stay identical so existing links and search rankings survive.
- **Redirects.** For any path that *does* change, add redirects (host-level `.htaccess` on StartCP/Apache, or `<meta>` refresh fallbacks).
- **Sitemap + robots.** Astro can auto-generate `sitemap.xml`; add `robots.txt`. Submit to Google Search Console after launch.
- **Metadata.** Each page/article gets proper `<title>`, description, and Open Graph tags from its front-matter (better than the current setup if SEO plugins are inconsistent).
- **Parity check.** Before switching DNS, stage the new site and compare page-by-page against the WordPress original.

---

## 9. Content extraction from WordPress

To get the existing copy/images out cleanly:
- **Articles & pages:** export via WordPress's exporter or pull each page's HTML and convert to Markdown (I can automate this). The 4 articles + page copy are ~13k words total — quick.
- **Images/audio:** download originals into `public/img` and `public/audio`.
- **Book data:** transcribe titles, release dates, and buy links into `data/books.ts` (already largely captured in the inventory).

---

## 10. Phased rollout

- **Phase 0 — Decisions & setup.** You answer §11. I scaffold Astro, tokens, layout, nav, footer, and one finished page (Home) as a vertical slice to lock the look.
- **Phase 1 — Core pages.** Home, Books, Resume, Real Estate Buddy, Contact. Real menu (no dead links).
- **Phase 2 — Blog.** Articles index + the 4 posts migrated to Markdown; RSS + sitemap.
- **Phase 3 — Special pages.** Magnetic (with chosen gating), Private Pages, Extreme Build.
- **Phase 4 — The "Decide" four.** Portfolio / Wiki / Prompts built or removed per your call.
- **Phase 5 — Deploy.** GitHub Actions FTP pipeline + secrets; stage, parity-check, then point the domain.

Each phase is reviewable on its own; we don't touch the live WordPress site until Phase 5.

---

## 11. Decisions I need from you

1. **Stack:** Astro (recommended) — or do you want the lighter 11ty?
2. **The four 404 menu items** — for each of Portfolio, Wiki, Prompts: build it, fold it elsewhere, or drop from the menu?
3. **Gated content** — which items are *casually* gated (soft gate is fine) vs *genuinely private* (use real encryption)? Specifically: Magnetic audio, Alex's guide, Rilda's guide.
4. **Forms** — OK to use a free form service (Formspree/Web3Works) for Contact + Extreme Build waitlist, or prefer a plain `mailto:`?
5. **Comments** — drop them (recommended) or keep via Giscus/Disqus?
6. **Domain** — is `aaronellis.co.network` the permanent domain, and will it point at the StartCP host (IP `46.247.90.193`)? Or is there another domain for this host?
7. **Deploy** — set up the automated GitHub Actions → FTP pipeline (recommended), or manual uploads for now?

---

*Once you've weighed in on §11 — even just "Astro, drop the dead pages, soft-gate everything, use Formspree, drop comments, automated deploy" — I'll start Phase 0 and put a finished Home page in front of you to approve the look before going wide.*
