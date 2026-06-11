/* Client-side content gate — generalized from the /magnetic/ audio gate.
 *
 * A password (never stored, never sent anywhere) is run through PBKDF2
 * (SHA-256) to derive an AES-GCM key that decrypts a payload. Two modes:
 *
 *   data-mode="download"  decrypt a fetched encrypted file -> trigger a download
 *                         attrs: data-src, data-filename, data-mime
 *   data-mode="inject"    decrypt an inline base64 ciphertext -> innerHTML
 *                         attrs: data-payload (base64), data-target (selector)
 *
 * Shared crypto attrs on the .gate element: data-salt (b64), data-iv (b64),
 * data-iterations. Markup hooks (by data-gate-* attribute within the gate):
 *   input[data-gate-input], button[data-gate-button],
 *   [data-gate-error], [data-gate-success]
 *
 * This is obfuscation-grade protection (the ciphertext is public), so the
 * password must be high-entropy. It matches the protection level the site's
 * /magnetic/ download already relies on.
 */
(function () {
  if (!window.crypto || !window.crypto.subtle) return;

  function b64ToBuf(b64) {
    var bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function deriveKey(password, saltBuf, iterations) {
    var enc = new TextEncoder();
    var baseKey = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuf, iterations: iterations, hash: 'SHA-256' },
      baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
  }

  function wire(gate) {
    var input = gate.querySelector('[data-gate-input]');
    var button = gate.querySelector('[data-gate-button]');
    var errorEl = gate.querySelector('[data-gate-error]');
    var successEl = gate.querySelector('[data-gate-success]');
    if (!input || !button) return;

    var mode = gate.dataset.mode || 'download';
    var iv = new Uint8Array(b64ToBuf(gate.dataset.iv));
    var salt = b64ToBuf(gate.dataset.salt);
    var iterations = Number(gate.dataset.iterations) || 250000;

    async function unlock() {
      var candidate = input.value.replace(/^\s+|\s+$/g, '');
      if (errorEl) errorEl.style.display = 'none';
      if (successEl) successEl.style.display = 'none';
      button.disabled = true;
      var label = button.textContent;
      button.textContent = 'Unlocking…';
      try {
        var key = await deriveKey(candidate, salt, iterations);
        var cipherBuf;
        if (mode === 'inject') {
          cipherBuf = b64ToBuf(gate.dataset.payload);
        } else {
          var res = await fetch(gate.dataset.src, { cache: 'no-store' });
          if (!res.ok) throw new Error('fetch failed');
          cipherBuf = await res.arrayBuffer();
        }
        var plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, cipherBuf);

        if (mode === 'inject') {
          var html = new TextDecoder().decode(plainBuf);
          var target = document.querySelector(gate.dataset.target || '[data-gate-content]');
          if (target) { target.innerHTML = html; target.removeAttribute('hidden'); }
          gate.setAttribute('hidden', '');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          var blob = new Blob([plainBuf], { type: gate.dataset.mime || 'application/octet-stream' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = gate.dataset.filename || 'download';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
          if (successEl) successEl.style.display = 'block';
        }
      } catch (err) {
        if (errorEl) errorEl.style.display = 'block';
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    }

    button.addEventListener('click', unlock);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); unlock(); }
    });
  }

  document.querySelectorAll('[data-gate]').forEach(wire);
})();
