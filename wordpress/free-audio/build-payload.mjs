// Builds the WordPress content payload for the Free Audio capture page.
//  - extracts the paste block from free-audio.html
//  - minifies CSS; base64-wraps the logic JS (WordPress HTML-encodes bare '&',
//    which would break '&&') and leaves the tiny &-free arm script plain
//  - prepends a page-id shell that hides the theme header/footer (distraction-free)
//  - wraps everything in one wp:html block with no blank lines (wpautop-safe)
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);

export function buildPayload(pageId) {
  if (!pageId) throw new Error('buildPayload requires a numeric pageId');
  const SRC = fs.readFileSync(path.join(DIR, 'free-audio.html'), 'utf8');

  const start = SRC.indexOf('PASTE FROM HERE INTO WORDPRESS');
  const end   = SRC.indexOf('PASTE TO HERE');
  let block = SRC.slice(SRC.indexOf('-->', start) + 3, SRC.lastIndexOf('<!--', end)).trim();

  const minCss = css => css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s+/g, ' ')
    .trim();
  const minJs = js => js
    .split('\n').map(l => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // style → minify
  block = block.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/, (_, a, css, c) => a + minCss(css) + c);

  // scripts → base64-wrap the logic one, minify the arm one
  let mainCode = '';
  block = block.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (_, body) => {
    const code = minJs(body);
    if (/addEventListener\('submit'/.test(code)) {
      mainCode = code;
      return '<script>(new Function(atob("' + Buffer.from(code, 'utf8').toString('base64') + '")))()</script>';
    }
    return '<script>' + code + '</script>';
  });

  // pack HTML whitespace outside style/script
  block = block.split(/(<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>)/)
    .map(p => /^<(style|script)/.test(p) ? p : p.replace(/>\s+</g, '><').replace(/\s+/g, ' '))
    .join('').trim();

  // page-id shell — hide theme chrome so the capture page is distraction-free
  const shell = '<style id="mpp-page-shell">'
    + `body.page-id-${pageId} #site-header,body.page-id-${pageId} #site-footer,`
    + `body.page-id-${pageId} .site-header,body.page-id-${pageId} .site-footer,`
    + `body.page-id-${pageId} .page-header,body.page-id-${pageId} .entry-title,`
    + `body.page-id-${pageId} .post-thumbnail{display:none!important}`
    + `body.page-id-${pageId} .site-main,body.page-id-${pageId} .page-content,`
    + `body.page-id-${pageId} .entry-content{max-width:none!important;width:100%!important;margin:0!important;padding:0!important}`
    + '</style>';

  let out = ('<!-- wp:html -->' + shell + block + '<!-- /wp:html -->').replace(/\n\s*\n+/g, '\n');

  fs.writeFileSync(path.join(DIR, 'page.payload.html'), out);
  fs.writeFileSync('/tmp/mpp-script-check.js', mainCode);
  return { out, mainCode };
}

// allow standalone run: MPP_PAGE_ID=123 node build-payload.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const { out, mainCode } = buildPayload(process.env.MPP_PAGE_ID);
  console.log('payload bytes:', out.length, '| main JS bytes:', mainCode.length);
  console.log('no && in payload:', !/&&/.test(out), '| base64 bootstrap:', /new Function\(atob\(/.test(out));
}
