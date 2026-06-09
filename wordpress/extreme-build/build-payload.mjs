// Builds the WordPress page-201 content payload:
//  - keeps the structural nav/header chrome blocks from the live page
//  - swaps the old extreme-build body + design CSS for the new .xb-extreme block
//  - minifies CSS/JS to single lines (wpautop-safe) and wraps in one wp:html block
import fs from 'node:fs';

const ORIG = fs.readFileSync('wordpress/extreme-build/backup/page-201.original.html', 'utf8');
const SRC  = fs.readFileSync('wordpress/extreme-build/extreme-build.html', 'utf8');

// ---- extract the paste block from the standalone preview file ----
const start = SRC.indexOf('PASTE FROM HERE INTO WORDPRESS');
const end   = SRC.indexOf('PASTE TO HERE');
let block = SRC.slice(SRC.indexOf('-->', start) + 3, SRC.lastIndexOf('<!--', end)).trim();

// ---- minifiers ----
const minCss = css => css
  .replace(/\/\*[\s\S]*?\*\//g, '')      // strip comments
  .replace(/\s*([{}:;,>])\s*/g, '$1')    // tighten around punctuation
  .replace(/;}/g, '}')
  .replace(/\s+/g, ' ')
  .trim();

const minJs = js => js
  .split('\n')
  .map(l => l.replace(/(^|[^:])\/\/.*$/, '$1')) // strip line comments (leave http:// style untouched – none here)
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')             // strip block comments
  .replace(/\s+/g, ' ')                          // collapse to single line
  .trim();

// operate on the single <style> and <script> inside the block
function replaceTag(html, tag, fn) {
  const re = new RegExp(`(<${tag}[^>]*>)([\\s\\S]*?)(</${tag}>)`);
  return html.replace(re, (_, a, body, c) => a + fn(body) + c);
}
block = replaceTag(block, 'style', minCss);
block = replaceTag(block, 'script', minJs);

// pack HTML whitespace OUTSIDE style/script (split so we never touch their interiors)
function packHtml(b) {
  const parts = b.split(/(<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>)/);
  return parts.map(p =>
    /^<(style|script)/.test(p) ? p : p.replace(/>\s+</g, '><').replace(/\s+/g, ' ')
  ).join('');
}
block = packHtml(block).trim();

// ---- validate the minified JS parses ----
const scriptBody = block.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
fs.writeFileSync('/tmp/xb-script-check.js', scriptBody);

// ---- pull the structural chrome blocks to KEEP from the original ----
const keepStyle = id => {
  const m = ORIG.match(new RegExp(`<style id="${id}"[\\s\\S]*?</style>`));
  if (!m) throw new Error('missing keep-block: ' + id);
  return m[0].replace(/\n\s*\n/g, '\n').trim();
};
const nav = ORIG.match(/<nav class="eb-mobile-nav-strip"[\s\S]*?<\/nav>/)[0]
  .replace(/>\s+</g, '><').trim();

const leadStyles = [
  keepStyle('extreme-build-page-shell'),
  keepStyle('extreme-build-mobile-nav-strip'),
  keepStyle('extreme-remove-theme-mobile-menu'),
].join('');
const tailStyles = [
  keepStyle('ae-vintage-shared-chrome'),
  keepStyle('ae-header-polish-20260603'),
  keepStyle('ae-mobile-menu-layer-fix-201'),
].join('');

// minify the kept CSS blocks too (single-line, blank-line-free)
const minStyleBlock = s => s.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_, a, css, c) => a + minCss(css) + c);

// ---- assemble: one wp:html block, raw render, no blank lines ----
let out =
  '<!-- wp:html -->' +
  minStyleBlock(leadStyles) +
  '<main class="extreme-build-page" id="extreme-build">' +
  nav +
  block +
  '</main>' +
  minStyleBlock(tailStyles) +
  '<!-- /wp:html -->';

out = out.replace(/\n\s*\n+/g, '\n');  // belt-and-braces: kill any blank lines

fs.writeFileSync('wordpress/extreme-build/page-201.payload.html', out);
console.log('payload bytes:', out.length, '(was', ORIG.length, ')');
console.log('script bytes :', scriptBody.length);
console.log('keep-blocks  : shell, mobile-nav-strip, remove-theme-mobile-menu, vintage-shared-chrome, header-polish, mobile-menu-layer-fix-201');
console.log('contains .xb-extreme:', /class="xb-extreme"/.test(out));
console.log('contains nav strip  :', /eb-mobile-nav-strip/.test(out));
