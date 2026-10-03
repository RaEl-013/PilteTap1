// ort-fix.js
// Xəta: "no available backend found. ERR: [wasm] RuntimeError: Aborted([object ProgressEvent])"
//
// QURAŞDIRMA:
//  1) Bu faylı repoya index.html ilə eyni qovluğa at.
//  2) index.html-də bu sətri SİL:   <script src="ort-config.js"></script>
//     və ort-config.js faylını repodan sil.
//  3) index.html-də, əsas <script>...</script> blokundan SONRA, </body>-dən əvvəl bu sətri əlavə et:
//       <script src="ort-fix.js"></script>
//  4) ORT_VERSION dəyərini öz onnxruntime-web versiyanla əvəz et (aşağıda).
//
// İş qaydası: əvvəl ort/ qovluğundakı wasm faylı yoxlanılır; yoxdursa CDN-dən yüklənir
// (CDN üçün internet lazımdır).

(function () {
  // !!! Versiyanı öz versiyanla əvəz et
  var ORT_VERSION = '1.20.1';
  var WASM_FILE = 'ort/ort-wasm-simd-threaded.wasm';
  var CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/';

  // Fayl var? file:// və http üçün işləyir (başlıqlar gələn kimi dayandırır, 10 MB endirmir)
  function exists(url) {
    return new Promise(function (resolve) {
      try {
        var x = new XMLHttpRequest();
        var done = false;
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

  var pathP = null;
  function wasmPath() {
    if (!pathP) pathP = exists(WASM_FILE).then(function (ok) { return ok ? 'ort/' : CDN; });
    return pathP;
  }

  async function setupOrt() {
    if (typeof ort === 'undefined') throw new Error('ONNX Runtime Web tapılmadı (ort/ qovluğu yoxdur)');
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.wasmPaths = await wasmPath();
  }

  // index.html-dəki eyni adlı funksiyaları əvəz edir
  window.ensureOrt = async function () {
    if (sdSess) return sdSess;
    await setupOrt();
    sdSess = await ort.InferenceSession.create('model/model_quantized.onnx');
    return sdSess;
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
