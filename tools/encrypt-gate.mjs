// Encrypt a plaintext file for the client-side gate (assets/gate.js).
// Produces the salt / iv / iterations / base64 ciphertext to embed in a page.
// Matches the PBKDF2(SHA-256) -> AES-GCM-256 scheme used by /magnetic/.
//
// Usage:
//   node tools/encrypt-gate.mjs <plaintext-file> "<password>" [iterations]
// Prints a JSON object: { salt, iv, iterations, payload }  (all base64 / number).
import fs from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const [file, password, iterArg] = process.argv.slice(2);
if (!file || !password) {
  console.error('Usage: node tools/encrypt-gate.mjs <plaintext-file> "<password>" [iterations]');
  process.exit(1);
}
const iterations = Number(iterArg) || 250000;
const data = fs.readFileSync(file); // bytes (works for HTML text or binary like mp3)

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const enc = new TextEncoder();
const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
  baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
);
const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

const b64 = buf => Buffer.from(buf).toString('base64');
console.log(JSON.stringify({
  salt: b64(salt), iv: b64(iv), iterations, payload: b64(cipher),
  bytesIn: data.length, bytesOut: cipher.byteLength,
}, null, 2));
