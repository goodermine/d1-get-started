// Eleventy config for the lean static rebuild of aaronellis.co.network.
// - HTML pages are passed through literally (no Liquid/Nunjucks parsing of page
//   bodies) so inline gate JS / prompt examples with {{ }} or {% %} never break.
// - Layout (base.njk) still renders via Nunjucks and injects {{ content }}.
// - Trailing-slash directory URLs are produced by each page's explicit `permalink`
//   (generated from the live WP `link` field) to preserve every existing URL.
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/css': 'css' });

  // Mark the active top-level nav item by comparing the current URL to each link.
  eleventyConfig.addFilter('isActive', (navUrl, pageUrl) => {
    if (!navUrl || !pageUrl) return false;
    const n = navUrl.split('#')[0];
    if (n === '/') return pageUrl === '/';
    return pageUrl === n || pageUrl.startsWith(n);
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
    templateFormats: ['html', 'njk'],
  };
}
