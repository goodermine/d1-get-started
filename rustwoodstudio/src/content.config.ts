import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Rustwood Journal. Drop a Markdown file into src/content/journal/ with this
// front-matter and it auto-appears on /journal and gets its own page.
const journal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/journal" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tag: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal };
