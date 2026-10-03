// ort-fix.js  (diaqnostikalı versiya)
// QURAŞDIRMA:
//  1) Repoda köhnə ort-fix.js varsa üzərinə yaz (və ort-config.js-i sil, index.html-dən də onun sətrini çıxar).
//  2) index.html-də əsas <script>...</script> blokundan SONRA, </body>-dən əvvəl:
//       <script src="ort-fix.js"></script>
//  3) ORT_VERSION dəyərini öz versiyanla əvəz et.
//  4) APK/tətbiq istifadə edirsənsə: yenidən BUILD et və telefonda yenidən QURAŞDIR.
// Xəta çıxsa, ekrandakı "DIAG:" hissəsini göndər.

(function () {
  var ORT_VERSION = '1.20.1'; // !!! öz versiyanla əvəz et
  var FILES = ['ort/ort-wasm-simd-threaded.wasm', 'ort/ort-wasm-simd-threaded.mjs', 'ort/ort.wasm.min.js'];
  var CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/';

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

  var chosen = '?', pathP = null;
  function wasmPath() {
    if (!pathP) pathP = exists(FILES[0]).then(function (ok) { chosen = ok ? 'ort/' : 'CDN'; return ok ? 'ort/' : CDN; });
    return pathP;
  }

  async function diag() {
    var r = [];
    for (var i = 0; i < FILES.length; i++) r.push(FILES[i].split('/').pop() + '=' + ((await exists(FILES[i])) ? 'var' : 'YOX'));
    var ver = '?'; try { ver = ort.env.versions.web || ort.env.versions.common || '?'; } catch (e) {}
    return 'sehife=' + location.protocol + '//' + location.pathname + ' | yol=' + chosen +
      ' | ort=' + ver + ' | internet=' + navigator.onLine + ' | ' + r.join(', ');
  }

  async function setupOrt() {
    if (typeof ort === 'undefined') throw new Error('ONNX Runtime Web tapılmadı (ort/ qovluğu yoxdur)');
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.wasmPaths = await wasmPath();
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
})();
