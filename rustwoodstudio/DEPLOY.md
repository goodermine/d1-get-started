# Deploying Rustwood Studio

The site auto-deploys to the StartCP host via GitHub Actions
(`.github/workflows/deploy-rustwood.yml`). On every push that changes
`rustwoodstudio/`, the workflow builds the static site and uploads `dist/`
over FTP. You can also run it manually from the **Actions** tab → *Deploy
Rustwood Studio* → **Run workflow**.

Your FTP credentials live only in **GitHub encrypted Secrets** — never in the
repo, never in the code.

## One-time setup: add the secrets

On GitHub: **Settings → Secrets and variables → Actions → New repository
secret**. Add these:

| Secret name      | Value | Example |
| ---------------- | ----- | ------- |
| `FTP_SERVER`     | FTP host from your panel | `ftp.sg.rapid-trust.startcp.com` |
| `FTP_USERNAME`   | FTP username | `rapid-trust.startcp.com` |
| `FTP_PASSWORD`   | FTP password | *(the password from your panel)* |
| `FTP_SERVER_DIR` | The web root for `rustwoodstudio.au`, **with a trailing slash** | `./public_html/` |

Optional secrets (only if needed):

| Secret name    | Default | When to set it |
| -------------- | ------- | -------------- |
| `FTP_PROTOCOL` | `ftp`   | Set to `ftps` if your host supports encrypted FTP (recommended) |
| `FTP_PORT`     | `21`    | Set if your host uses a non-standard port |

### Finding `FTP_SERVER_DIR`

This is the folder the web server serves `rustwoodstudio.au` from. On
StartCP/cPanel-style hosting it's commonly:

- `./public_html/` — primary domain
- `./public_html/rustwoodstudio.au/` — if it's an addon/secondary domain
- a path under your home dir like `./<homepath>/public_html/`

If you're unsure, log into the host's File Manager and note where
`index.html` should go — that's the directory. The first deploy will tell you
quickly if it's wrong (files land in the wrong place); just update the secret
and re-run.

## Security notes

- **Plain FTP (port 21) sends the password in clear text.** Prefer `ftps` by
  setting `FTP_PROTOCOL=ftps` if the host allows it.
- The workflow uses `dangerous-clean-slate: false`, so it **won't delete files
  it didn't upload** — safe to point at an existing web root.
- After the first successful deploy, consider rotating the FTP password (it was
  visible in the original screenshot) and updating `FTP_PASSWORD`.

## How the domain connects

`rustwoodstudio.au` must point (DNS) at this StartCP host for the uploaded
files to show. `app.rustwoodstudio.au` stays separate (Cloudflare Tunnel /
Access) and is untouched by this workflow.
