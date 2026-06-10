// @ts-check
import { defineConfig } from "astro/config";

// Served from the host's standard address until a custom domain is pointed.
export default defineConfig({
  site: "https://rapid-trust.startcp.com",
  output: "static",
  build: { format: "directory" },
});
