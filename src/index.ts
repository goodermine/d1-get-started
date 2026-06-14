/**
 * Extension Builder — MVP backend.
 *
 * A single Cloudflare Worker that:
 *   - serves the static web app (from ./public via the ASSETS binding), and
 *   - exposes POST /api/generate, which turns a plain-English prompt into a
 *     complete Manifest V3 Chrome extension by calling Claude.
 *
 * The Anthropic API key lives ONLY here, as a Worker secret (ANTHROPIC_API_KEY).
 * The browser never sees it. This is the "you hold the key, users just use the
 * app" model — swap GenerationProvider later if you ever want a BYO-key path.
 */

interface Bindings {
  /** Static assets (the ./public web app). Bound automatically by wrangler. */
  ASSETS: Fetcher;
  /** Anthropic API key — set via `wrangler secret put ANTHROPIC_API_KEY` (or .dev.vars locally). */
  ANTHROPIC_API_KEY?: string;
  /** D1 database from the starter — unused by the MVP, kept for future usage tracking. */
  DB: D1Database;
}

/** The shape Claude must return, enforced via structured outputs. */
const EXTENSION_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Short, human-friendly extension name." },
    description: { type: "string", description: "One-sentence description of what it does." },
    files: {
      type: "array",
      description: "Every file in the extension, including manifest.json.",
      items: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path, e.g. 'manifest.json' or 'popup.js'." },
          content: { type: "string", description: "Full text content of the file." },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "description", "files"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You generate complete, working Google Chrome extensions using Manifest V3, for non-technical users who will load the result as an unpacked extension.

Rules:
- Always include a valid "manifest.json" with "manifest_version": 3, a "name", a "version" of "1.0.0", and a clear "description".
- Request the MINIMUM permissions the feature actually needs. Prefer "activeTab" over broad host permissions when possible.
- Everything must be self-contained. Manifest V3's content security policy forbids remote/CDN scripts, so never load external JavaScript. Inline or bundle all code into local files.
- Do NOT reference icon image files (no "icons" or "default_icon" keys) — the extension must load with text files only.
- If the feature has a UI, provide a "popup.html" wired up via "action": { "default_popup": "popup.html" }, and keep its styles in "popup.css" and logic in "popup.js".
- If the feature changes web pages, include a content script and declare appropriate "matches".
- Write clean, readable, lightly commented code a beginner could follow.
- Return ONLY the structured object: a name, a description, and the full list of files. No prose.`;

interface GeneratedFile {
  path: string;
  content: string;
}
interface GeneratedExtension {
  name: string;
  description: string;
  files: GeneratedFile[];
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function generate(prompt: string, apiKey: string): Promise<GeneratedExtension> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: EXTENSION_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `Build a Chrome extension that does the following:\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    stop_reason?: string;
    content?: Array<{ type: string; text?: string }>;
  };

  if (data.stop_reason === "refusal") {
    throw new Error("The model declined this request. Try rephrasing what the extension should do.");
  }

  const text = data.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("The model returned no content. Please try again.");

  let parsed: GeneratedExtension;
  try {
    parsed = JSON.parse(text) as GeneratedExtension;
  } catch {
    throw new Error("The model returned malformed output. Please try again.");
  }

  if (!parsed.files?.some((f) => f.path === "manifest.json")) {
    throw new Error("The generated extension is missing a manifest.json. Please try again.");
  }
  return parsed;
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/generate") {
      if (request.method !== "POST") {
        return json({ error: "Use POST." }, 405);
      }
      if (!env.ANTHROPIC_API_KEY) {
        return json(
          { error: "Server is missing ANTHROPIC_API_KEY. Add it to .dev.vars (local) or as a Worker secret." },
          500
        );
      }

      let prompt: string;
      try {
        const body = (await request.json()) as { prompt?: string };
        prompt = (body.prompt ?? "").trim();
      } catch {
        return json({ error: "Invalid JSON body." }, 400);
      }
      if (!prompt) return json({ error: "Describe what the extension should do." }, 400);
      if (prompt.length > 4000) return json({ error: "That description is too long (4000 char max)." }, 400);

      try {
        const extension = await generate(prompt, env.ANTHROPIC_API_KEY);
        return json(extension);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generation failed.";
        return json({ error: message }, 502);
      }
    }

    // Anything else is served by the static assets binding (the ./public web app).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Bindings>;
