import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Blog/articles collection. Drop a Markdown file into src/content/articles/
// with this front-matter and it auto-appears in /articles and gets its own page.
const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
