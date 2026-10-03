// ort-config.js  (hamısı bir faylda)
// Xəta: "no available backend found. ERR: [wasm] RuntimeError: Aborted([object ProgressEvent])"
//
// QURAŞDIRMA (2 addım):
//  1) Bu faylı repoya index.html ilə eyni qovluğa at.
//  2) index.html-də onnxruntime-web script-indən SONRA bu sətri əlavə et:
//       <script src="ort-config.js"></script>
//
// workflow addımı lazım deyil, wasm faylları CDN-dən yüklənir.
// Qeyd: kod "import * as ort from 'onnxruntime-web'" ilə yazılıbsa, bu fayl işləməz,
// o halda import sətrini göndər, uyğunlaşdırım.

// !!! Versiyanı öz versiyanla əvəz et (index.html-dəki script sətrində onnxruntime-web@X.Y.Z)
const ORT_VERSION = '1.20.1';

(function () {
  if (typeof ort === 'undefined') {
    console.error('ort-config: ort tapılmadı. Bu faylı onnxruntime-web-dən sonra yüklə.');
    return;
  }

  // GitHub Pages SharedArrayBuffer başlıqlarını vermir -> tək axın
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;

  // wasm faylları CDN-dən
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/';
})();

// SONRA: telefonda sayt məlumatını sil (Chrome -> Sayt parametrləri -> Məlumatı sil)
// və səhifəni yenidən aç. Xətadan sonra səhifəni yeniləmək vacibdir.
