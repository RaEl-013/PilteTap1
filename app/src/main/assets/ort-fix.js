// ort-fix.js (v3)
// Səbəb: səhifə file:///android_asset/index.html kimi açılır, Android WebView bu halda
// ort/ qovluğundakı .wasm faylını yükləyə bilmir (fayllar var, amma yüklənmir).
// Həll: file:// olduqda wasm faylları CDN-dən yüklənir (internet lazımdır).
// Versiya avtomatik tapılır, əl ilə yazmaq lazım deyil.
//
// QURAŞDIRMA:
//  1) Repoda ort-fix.js-in üzərinə yaz.
//  2) index.html-də </body>-dən əvvəl olmalıdır: <script src="ort-fix.js"></script>
//  3) Build et, yeni APK-nı telefona qur.

(function () {
  if (typeof window.ensureOrt !== 'function') return; // əsas skript hələ yüklənməyib
  var FILES = ['ort/ort-wasm-simd-threaded.wasm', 'ort/ort-wasm-simd-threaded.mjs', 'ort/ort.wasm.min.js'];
  var chosen = '?';

  function exists(url) {
    return new Promise(function (resolve) {
      try {
        var x = new XMLHttpRequest(), done = false;
        var fin = function (v) { if (!done) { done = true; try { x.abort(); } catch (e) {} resolve(v); } };
        x.open('GET', url, true);
        x.onreadystatechange = function () {
          if (x.readyState >= 2) fin(x.status === 0 || (x.status >= 200 && x.status < 400));
        };
        x.onerror = function () { fin(false); };
        setTimeout(function () { fin(false); }, 4000);
        x.send();
      } catch (e) { resolve(false); }
    });
  }

  function ortVersion() {
    try { return ort.env.versions.web || ort.env.versions.common; } catch (e) { return null; }
  }

  function readBinary(url) {
    return new Promise(function (resolve) {
      try {
        var x = new XMLHttpRequest();
        x.open('GET', url, true);
        x.responseType = 'arraybuffer';
        x.onload = function () { resolve(x.response && x.response.byteLength > 1000 ? x.response : null); };
        x.onerror = function () { resolve(null); };
        x.send();
      } catch (e) { resolve(null); }
    });
  }

  var setupP = null;
  function setupOrt() {
    if (setupP) return setupP;
    setupP = (async function () {
      if (typeof ort === 'undefined') throw new Error('ONNX Runtime Web tapılmadı (ort/ qovluğu yoxdur)');
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      var isFile = location.protocol === 'file:';
      var ver = ortVersion();
      if (isFile && navigator.onLine && ver) {
        chosen = 'CDN';
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ver + '/dist/';
      } else if (isFile) {
        // internet yoxdur: wasm faylını özümüz oxuyub verməyə çalışırıq
        var bin = await readBinary(FILES[0]);
        chosen = bin ? 'local-binary' : 'local';
        if (bin) ort.env.wasm.wasmBinary = bin;
        ort.env.wasm.wasmPaths = 'ort/';
      } else {
        chosen = 'ort/';
        ort.env.wasm.wasmPaths = 'ort/';
      }
    })();
    return setupP;
  }

  async function diag() {
    var r = [];
    for (var i = 0; i < FILES.length; i++) r.push(FILES[i].split('/').pop() + '=' + ((await exists(FILES[i])) ? 'var' : 'YOX'));
    return 'sehife=' + location.protocol + '//' + location.pathname + ' | yol=' + chosen +
      ' | ort=' + ortVersion() + ' | internet=' + navigator.onLine + ' | ' + r.join(', ');
  }

  window.ensureOrt = async function () {
    if (sdSess) return sdSess;
    try {
      await setupOrt();
      sdSess = await ort.InferenceSession.create('model/model_quantized.onnx');
      return sdSess;
    } catch (e) {
      var d = ''; try { d = await diag(); } catch (e2) {}
      throw new Error(String(e && e.message || e).slice(0, 160) + ' || DIAG: ' + d);
    }
  };

  window.ensureClip = function () {
    if (clipSess || clipP) return clipP;
    clipP = (async function () {
      try {
        await setupOrt();
        clipSess = await ort.InferenceSession.create('model/clip_vision_quantized.onnx');
      } catch (e) { clipP = null; }
    })();
    return clipP;
  };
  (window.PLITE_READY = window.PLITE_READY || {})['ort-fix'] = true;
})();
