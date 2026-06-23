// Cloudflare Worker for d1-get-started.
//
//  /api/beverages        — original D1 tutorial route (unchanged)
//  /api/detect-music     — "Is this song AI-made?" provenance & metadata scanner
//
// The detector is FREE-TIER (no paid API): it inspects the uploaded audio file
// for provenance signals that AI music generators leave behind —
//   • C2PA / Content Credentials manifests and AI assertions
//   • SynthID / known watermark markers
//   • Generator fingerprints in container metadata (ID3 / MP4 / Vorbis tags)
// It returns a CONFIDENCE-BASED LIKELIHOOD, never absolute proof. Absence of
// signals does NOT prove a track is human-made (metadata can be stripped or the
// audio re-recorded) — that gap is what a paid acoustic classifier would close.
//
// To add the acoustic tier later: implement runAcousticClassifier() to POST the
// bytes to a detection API and merge its score in mergeVerdict(). The response
// shape and front end already accommodate it.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Filename",
};

// Distinctive generator / watermark fingerprints. Kept brand-specific to avoid
// matching ordinary words. Scanned within the file's metadata regions.
const GENERATOR_FINGERPRINTS: { name: string; re: RegExp }[] = [
  { name: "Suno",                 re: /\bsuno\b/i },
  { name: "Udio",                 re: /\budio\b/i },
  { name: "Riffusion",            re: /riffusion/i },
  { name: "MusicGen / AudioCraft (Meta)", re: /musicgen|audiocraft/i },
  { name: "Stable Audio",         re: /stable[\s_-]?audio/i },
  { name: "AIVA",                 re: /\baiva\b/i },
  { name: "Boomy",                re: /\bboomy\b/i },
  { name: "Soundraw",             re: /soundraw/i },
  { name: "Mubert",               re: /\bmubert\b/i },
  { name: "Loudly",               re: /\bloudly\b/i },
  { name: "Beatoven",             re: /beatoven/i },
  { name: "Udio/Suno SynthID",    re: /synthid/i },
];

// C2PA / Content Credentials presence markers.
const C2PA_MARKERS: { name: string; re: RegExp }[] = [
  { name: "C2PA manifest (JUMBF)", re: /jumbf|c2pa/i },
  { name: "Content Credentials",   re: /content[\s_]?credentials/i },
  { name: "C2PA URN",              re: /urn:[^\s"]*c2pa/i },
];

// C2PA assertion values that explicitly declare AI / generative origin.
const C2PA_AI_ASSERTIONS: { name: string; re: RegExp }[] = [
  { name: "C2PA: trained-algorithmic media", re: /trainedalgorithmicmedia|compositewithtrainedalgorithmic/i },
  { name: "C2PA: generative AI source",       re: /digitalsourcetype[^"]{0,40}(trainedalgorithmic|algorithmicmedia)/i },
  { name: "Explicit AI-generated tag",        re: /\bai[\s_-]?generated\b|generative[\s_-]?ai/i },
];

export interface Signal {
  type: "watermark" | "c2pa" | "metadata";
  label: string;
  weight: "high" | "medium" | "info";
}

export interface DetectResult {
  verdict: "Likely AI-generated" | "Possibly AI-generated" | "Inconclusive";
  confidence: "high" | "medium" | "low";
  signals: Signal[];
  source: "provenance-scan";
  notes: string[];
}

/** Decode a byte slice as latin1 so ASCII tokens inside binary are searchable. */
function asText(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

/**
 * Pure, testable scan. Metadata usually sits at the head of an audio file
 * (ID3v2, MP4 ftyp/moov, Vorbis comments) and sometimes the tail (ID3v1,
 * trailing moov / C2PA box), so we scan both ends rather than the whole file.
 */
export function scanForAISignals(bytes: Uint8Array): DetectResult {
  const head = bytes.subarray(0, Math.min(bytes.length, 768 * 1024));
  const tail = bytes.length > 768 * 1024
    ? bytes.subarray(Math.max(0, bytes.length - 256 * 1024))
    : new Uint8Array(0);
  const hay = (asText(head) + "\n" + asText(tail)).toLowerCase();

  const signals: Signal[] = [];
  const seen = new Set<string>();
  const push = (s: Signal) => { if (!seen.has(s.label)) { seen.add(s.label); signals.push(s); } };

  for (const f of C2PA_AI_ASSERTIONS) if (f.re.test(hay)) push({ type: "c2pa", label: f.name, weight: "high" });
  for (const f of GENERATOR_FINGERPRINTS) if (f.re.test(hay)) {
    const isWatermark = /synthid/i.test(f.name);
    push({ type: isWatermark ? "watermark" : "metadata", label: `Generator fingerprint: ${f.name}`, weight: isWatermark ? "high" : "medium" });
  }
  const c2paPresent = C2PA_MARKERS.some(f => f.re.test(hay));
  const c2paAI = signals.some(s => s.type === "c2pa");
  // Provenance present without an AI claim is informational only — it does not
  // push the verdict toward AI (it often indicates human-captured content).
  if (c2paPresent && !c2paAI) push({ type: "c2pa", label: "C2PA / Content Credentials present (no explicit AI claim)", weight: "info" });

  const highCount = signals.filter(s => s.weight === "high").length;
  const mediumCount = signals.filter(s => s.weight === "medium").length;
  const hasProvenanceNoAI = signals.some(s => s.weight === "info");

  let verdict: DetectResult["verdict"];
  let confidence: DetectResult["confidence"];
  const notes: string[] = [];

  if (highCount > 0) {
    verdict = "Likely AI-generated"; confidence = "high";
    notes.push("Found a watermark or signed Content Credential that declares AI origin. This is a strong, high-precision signal.");
  } else if (mediumCount > 0) {
    verdict = "Possibly AI-generated"; confidence = "medium";
    notes.push("Found an AI-generator fingerprint in the file's metadata. Metadata can be edited, so treat this as a strong hint rather than proof.");
  } else {
    verdict = "Inconclusive"; confidence = "low";
    if (hasProvenanceNoAI) {
      notes.push("This file carries signed Content Credentials but no AI-generation claim — which often points to human-captured or human-edited content. It is not conclusive on its own.");
    } else {
      notes.push("No AI provenance signals were found. This does NOT mean the track is human-made — metadata can be stripped and re-recorded audio loses watermarks.");
    }
    notes.push("Detecting AI from the raw audio alone (when there is no metadata) needs the acoustic-classifier tier, which isn't enabled in this free version.");
  }
  notes.push("This is a probabilistic likelihood, not a guarantee. Don't use it to definitively accuse anyone.");

  return { verdict, confidence, signals, source: "provenance-scan", notes };
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (pathname === "/api/detect-music") {
      if (request.method !== "POST") {
        return Response.json({ error: "POST an audio file as the request body." }, { status: 405, headers: CORS });
      }
      try {
        const buf = await request.arrayBuffer();
        if (!buf || buf.byteLength < 256) {
          return Response.json({ error: "That file looks empty or too small to analyze." }, { status: 400, headers: CORS });
        }
        // ~100MB guard (Workers free-plan body limit territory)
        if (buf.byteLength > 100 * 1024 * 1024) {
          return Response.json({ error: "File is too large (max ~100MB)." }, { status: 413, headers: CORS });
        }
        const result = scanForAISignals(new Uint8Array(buf));
        const filename = request.headers.get("X-Filename") || "";
        return Response.json({ ...result, filename }, { headers: CORS });
      } catch (e: any) {
        return Response.json({ error: "Could not analyze that file.", detail: String(e?.message || e) }, { status: 500, headers: CORS });
      }
    }

    if (pathname === "/api/beverages") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM Customers WHERE CompanyName = ?"
      )
        .bind("Bs Beverages")
        .all();
      return Response.json(results);
    }

    return new Response(
      "Call /api/beverages to see everyone who works at Bs Beverages"
    );
  },
} satisfies ExportedHandler<Env>;
