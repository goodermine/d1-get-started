"use strict";

// ---------------------------------------------------------------------------
// Element refs
// ---------------------------------------------------------------------------
const form = document.getElementById("gen-form");
const promptEl = document.getElementById("prompt");
const generateBtn = document.getElementById("generate-btn");
const errorEl = document.getElementById("error");
const loadingEl = document.getElementById("loading");
const promptStep = document.getElementById("prompt-step");
const resultEl = document.getElementById("result");
const nameEl = document.getElementById("ext-name");
const descEl = document.getElementById("ext-desc");
const fileListEl = document.getElementById("file-list");
const fileViewEl = document.querySelector("#file-view code");
const previewEl = document.getElementById("preview");
const downloadBtn = document.getElementById("download-btn");
const restartBtn = document.getElementById("restart-btn");
const examplesEl = document.getElementById("examples");

let currentExtension = null;

// ---------------------------------------------------------------------------
// Example prompts (click to fill)
// ---------------------------------------------------------------------------
const EXAMPLES = [
  "A dark-mode toggle for any website",
  "Count and show how many words are on the current page",
  "A button to copy the current page's URL and title",
  "Highlight every link that opens in a new tab",
];
for (const text of EXAMPLES) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = text;
  chip.addEventListener("click", () => {
    promptEl.value = text;
    promptEl.focus();
  });
  examplesEl.appendChild(chip);
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = promptEl.value.trim();
  if (!prompt) return;

  setError("");
  promptStep.hidden = true;
  resultEl.hidden = true;
  loadingEl.hidden = false;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Generation failed.");
    currentExtension = data;
    renderResult(data);
  } catch (err) {
    loadingEl.hidden = true;
    promptStep.hidden = false;
    setError(err.message || "Something went wrong. Please try again.");
  }
});

restartBtn.addEventListener("click", () => {
  resultEl.hidden = true;
  promptStep.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

downloadBtn.addEventListener("click", () => {
  if (!currentExtension) return;
  const blob = buildZip(currentExtension.files);
  const slug = (currentExtension.name || "extension")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "extension";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.zip`;
  a.click();
  URL.revokeObjectURL(url);
});

function setError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = !msg;
}

// ---------------------------------------------------------------------------
// Render result
// ---------------------------------------------------------------------------
function renderResult(ext) {
  loadingEl.hidden = true;
  nameEl.textContent = ext.name || "Your extension";
  descEl.textContent = ext.description || "";

  // File tabs — show manifest.json first if present
  const files = [...ext.files].sort((a, b) =>
    a.path === "manifest.json" ? -1 : b.path === "manifest.json" ? 1 : a.path.localeCompare(b.path)
  );
  fileListEl.innerHTML = "";
  files.forEach((file, i) => {
    const li = document.createElement("li");
    li.textContent = file.path;
    li.addEventListener("click", () => selectFile(li, file));
    fileListEl.appendChild(li);
    if (i === 0) selectFile(li, file);
  });

  renderPreview(ext);

  resultEl.hidden = false;
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectFile(li, file) {
  for (const el of fileListEl.children) el.classList.remove("active");
  li.classList.add("active");
  fileViewEl.textContent = file.content;
}

// ---------------------------------------------------------------------------
// Popup preview (best-effort): inline local css/js into the popup html and
// render it in a sandboxed iframe with a tiny chrome.* stub so it doesn't throw.
// ---------------------------------------------------------------------------
function renderPreview(ext) {
  let manifest = {};
  const manifestFile = ext.files.find((f) => f.path === "manifest.json");
  if (manifestFile) {
    try { manifest = JSON.parse(manifestFile.content); } catch { /* ignore */ }
  }

  const popupPath =
    manifest?.action?.default_popup ||
    manifest?.browser_action?.default_popup ||
    "popup.html";

  const byPath = (p) => {
    const clean = p.replace(/^\.?\//, "");
    return ext.files.find((f) => f.path === clean || f.path.endsWith("/" + clean));
  };

  let popup = byPath(popupPath) || ext.files.find((f) => f.path.endsWith(".html"));
  if (!popup) {
    previewEl.srcdoc =
      "<body style='font:14px sans-serif;color:#666;padding:16px'>This extension has no popup UI to preview.</body>";
    return;
  }

  let html = popup.content;
  // Inline <link rel="stylesheet" href="x.css">
  html = html.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (m, href) => {
    const css = byPath(href);
    return css ? `<style>${css.content}</style>` : m;
  });
  // Inline <script src="x.js"></script>
  html = html.replace(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, (m, src) => {
    const js = byPath(src);
    return js ? `<script>${js.content}<\/script>` : m;
  });

  const chromeStub = `<script>window.chrome={
    storage:{local:{get:(k,cb)=>cb&&cb({}),set:(o,cb)=>cb&&cb()},sync:{get:(k,cb)=>cb&&cb({}),set:(o,cb)=>cb&&cb()}},
    runtime:{sendMessage:()=>{},onMessage:{addListener:()=>{}},getURL:p=>p,id:'preview'},
    tabs:{query:(q,cb)=>cb&&cb([{id:0,url:'https://example.com',title:'Example'}]),sendMessage:()=>{}}
  };<\/script>`;

  previewEl.srcdoc = chromeStub + html;
}

// ---------------------------------------------------------------------------
// Minimal store-only ZIP writer (no dependencies, works offline)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}

function buildZip(files) {
  const enc = new TextEncoder();
  const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
  const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.path);
    const data = enc.encode(f.content);
    const crc = crc32(data);

    const localHeader = [].concat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0)
    );
    localParts.push(new Uint8Array(localHeader), nameBytes, data);

    const centralHeader = [].concat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset)
    );
    centralParts.push(new Uint8Array(centralHeader), nameBytes);

    offset += localHeader.length + nameBytes.length + data.length;
  }

  let centralSize = 0;
  for (const p of centralParts) centralSize += p.length;

  const end = [].concat(
    u32(0x06054b50), u16(0), u16(0),
    u16(files.length), u16(files.length),
    u32(centralSize), u32(offset), u16(0)
  );

  return new Blob([...localParts, ...centralParts, new Uint8Array(end)], {
    type: "application/zip",
  });
}
