// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// The permanent production domain (used for sitemap + canonical URLs).
export default defineConfig({
  site: "https://aaronellis.co.network",
  integrations: [sitemap()],
  // Static output drops straight onto the FTP host's web root.
  output: "static",
  build: {
    // Emit /about/index.html style URLs so links work without a server rewriting them.
    format: "directory",
  },
});
