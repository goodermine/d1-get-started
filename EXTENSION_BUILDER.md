# Extension Builder (MVP)

Describe a browser tool in plain English → get a working **Manifest V3 Chrome
extension** you can download and load locally. No Chrome Web Store, no review,
no user account.

This is the lead-magnet slice: **prompt → generate → preview → download → load
unpacked.** "Self-updating / lifecycle management" is intentionally deferred to
a later phase.

## How it works

```
Browser (public/)  ──POST /api/generate──►  Worker (src/index.ts)  ──►  Claude
   prompt UI                                  holds ANTHROPIC_API_KEY      (Opus 4.8,
   file viewer        ◄── extension JSON ───  structured outputs            structured
   .zip download                              (key never sent to browser)   output)
   popup preview
   install steps
```

- **The Anthropic API key lives only in the Worker**, as a secret. The browser
  never sees it. This is the "you hold the key, users just use the app" model we
  chose. The generation call is isolated in `generate()` in `src/index.ts`, so a
  different provider (e.g. a BYO-key path) could drop in later without touching
  the UI.
- The `.zip` is built **in the browser** with a tiny dependency-free ZIP writer,
  so no files are stored server-side.
- D1 (`DB`) from the original starter is left wired up but unused — it's there
  for when you want per-user accounts / usage limits.

## Run it locally

1. Install deps (first time only):
   ```bash
   npm install
   ```
2. Add your Anthropic API key:
   ```bash
   cp .dev.vars.example .dev.vars
   # then edit .dev.vars and paste your key from console.anthropic.com
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the printed `http://localhost:8787`, type a description, and generate.

## Deploy it

```bash
# one time: store the key as a real Worker secret (NOT in wrangler.jsonc)
npx wrangler secret put ANTHROPIC_API_KEY

npm run deploy
```

## Try these prompts

- "A dark-mode toggle for any website"
- "Count and show how many words are on the current page"
- "A button to copy the current page's URL and title"
- "Highlight every link that opens in a new tab"

## Loading a generated extension into Chrome

1. Unzip the download.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the unzipped folder.

## Cost note

Each generation is a single short Claude call (a few thousand tokens), so it
costs a fraction of a cent on your key. That's what makes the free-tier +
paid-plan model viable. To drive free-tier cost near zero, switch the `model` in
`src/index.ts` from `claude-opus-4-8` to `claude-haiku-4-5`.

## Known MVP limitations

- The popup preview is **approximate** — it inlines local CSS/JS and stubs the
  `chrome.*` APIs, so anything that truly depends on a live tab won't fully run
  in the preview (it works fine once loaded into Chrome).
- No accounts, rate limiting, or usage caps yet — add these (via D1) before
  exposing it publicly so nobody can run up your token bill.
- Generated extensions deliberately omit icon files so they're text-only and
  load cleanly.
