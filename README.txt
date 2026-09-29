Plitə tap - Android layihəsi (v2.0: DINOv2 + CLIP, canlı tanıma, kamera)

Bu layihədə tətbiqin bütün son xüsusiyyətləri var: DINOv2 + CLIP ilə axtarış,
kamerada canlı keyfiyyət yoxlaması və canlı tanıma, rəqəmsal yaxınlaşdırma,
axtarış tarixçəsi, kataloqda redaktə/silmə. Modellər telefonun daxilində
ONNX Runtime Web (WASM) ilə işləyir, internet lazım deyil (qurmaq üçün lazımdır,
işləmək üçün yox).

Bu papkanın özü kiçikdir (cəmi bir neçə yüz KB). Böyük AI model faylları GitHub-un
öz kompüterində (Actions) tikinti zamanı avtomatik yüklənir, ona görə sizin heç bir
böyük fayl yükləməyinizə ehtiyac yoxdur.

QURMA UĞURSUZ OLARSA:
   Actions > uğursuz olan iş > qırmızı "Build" addımının üstünə basın, orada dəqiq
   xəta mətni yazılır. O mətni mənə göndərin, dərhal düzəldərəm. Uğursuz olsa belə,
   "plite-tap-apk" faylı yenə görünəcək (indi build hesabatlarını da özündə saxlayır).

QURMA YOLU (GitHub Actions - ƏN ASAN, Android Studio lazım deyil):
   1. github.com-da hesab yoxdursa qeydiyyatdan keçin, yeni repository yaradın.
   2. Bu papkadakı bütün faylları (papkanı deyil, içindəkiləri) o repoya yükləyin:
      Add file > Upload files, hamısını sürüşdürün, Commit changes.
   3. Repoda: Actions > Build APK > Run workflow.
   4. Bir neçə dəqiqəyə iş bitəcək (böyük modelləri özü yükləyib qurur).
      Üstünə basıb "plite-tap-apk" faylını endirin, zip-dən çıxarın,
      içində app-debug.apk olacaq.
   5. app-debug.apk faylını telefona göndərin (Google Drive/e-poçt/USB) və telefonda açın.
      "Naməlum mənbədən qurmağa" icazə verin.

ALTERNATİV: Android Studio ilə (kompüterdə quraşdırılıbsa)
   1. File > Open > PliteTap papkasını seçin.
   2. Terminalda (Android Studio-nun aşağısındakı Terminal sekməsi) bu əmrləri işlədin:
        mkdir app/src/main/assets/model app/src/main/assets/ort
        curl -L -o app/src/main/assets/model/model_quantized.onnx https://huggingface.co/Xenova/dinov2-small/resolve/main/onnx/model_quantized.onnx
        curl -L -o app/src/main/assets/model/clip_vision_quantized.onnx https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/vision_model_quantized.onnx
        npm install onnxruntime-web@1.18.0 --no-save
        cp node_modules/onnxruntime-web/dist/ort.wasm.min.js app/src/main/assets/ort/
        cp node_modules/onnxruntime-web/dist/ort-wasm.wasm app/src/main/assets/ort/
        cp node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm app/src/main/assets/ort/
   3. Gradle sync edin, telefonu USB ilə qoşub Developer options > USB debugging açın.
   4. Yuxarıda cihazı seçib yaşıl Run ▶ düyməsini basın.

QEYDLƏR:
- Telefon kamera icazəsi istəyəcək (Kamera ilə çək düyməsini basanda). İcazə verin.
- Zəif telefonlarda axtarış bir neçə saniyə çəkə bilər (modellər WASM ilə işləyir,
  kompüterdəki qədər sürətli deyil). Canlı tanıma zəif telefonlarda seyrək yenilənə bilər.
- Hazır APK təxminən 130-150 MB olacaq (modellər onun içindədir).
- Kataloq və axtarış tarixçəsi telefonun öz yaddaşında saxlanılır.
