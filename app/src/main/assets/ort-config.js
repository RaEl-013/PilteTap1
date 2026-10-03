// ort-config.js
// Fix for: "no available backend found. ERR: [wasm] RuntimeError: Aborted([object ProgressEvent])"
//
// ISTIFADE:
//  1) Bu faylı repoya əlavə et (məs. kökə və ya js/ qovluğuna).
//  2) ort (onnxruntime-web) yükləndikdən SONRA, amma InferenceSession.create(...) çağırışından ƏVVƏL işə sal:
//       <script src="ort.min.js"></script>        <!-- və ya import * as ort from 'onnxruntime-web' -->
//       <script src="ort-config.js"></script>
//  3) .wasm faylları (ort-wasm-simd-threaded.wasm və .mjs) saytda olmalıdır.
//     Workflow-da build-dən sonra bu addımı əlavə et (yolu öz qovluğuna uyğunla):
//       - name: Copy ORT wasm files
//         run: cp node_modules/onnxruntime-web/dist/*.wasm node_modules/onnxruntime-web/dist/*.mjs dist/
//     (Qovluq "dist" yox "docs" və ya başqadırsa, onu yaz.)

(function () {
  if (typeof ort === 'undefined') {
    console.error('ort-config: ort tapılmadı. Bu faylı onnxruntime-web-dən sonra yüklə.');
    return;
  }

  // GitHub Pages SharedArrayBuffer üçün lazım olan başlıqları vermir -> tək axın
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;

  // wasm fayllarının yeri. Sayt /repo-adi/ altında işləsə də nisbi yol işləyir.
  // Fayllar index.html ilə eyni qovluqdadırsa './' qalsın.
  ort.env.wasm.wasmPaths = './';

  // Ehtiyat variant: lokal fayl tapılmasa CDN-dən yüklə (versiyanı quraşdırdığınla eyni yaz!)
  // ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
})();
