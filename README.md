# PlitÉ™ tap â€” bÃ¼tÃ¼n dÉ™yiÅŸikliklÉ™r bir yerdÉ™

Qovluq quruluÅŸu repo ilÉ™ eynidir (PilteTap1/). FayllarÄ± eyni yerlÉ™rÉ™ at, kÃ¶hnÉ™lÉ™rin Ã¼zÉ™rinÉ™ yaz.

## Fayllar vÉ™ nÉ™ edir
| Fayl | Hara | NÉ™ edir |
|---|---|---|
| .github/workflows/build.yml | repo | Build APK. Sabit imza aÃ§arÄ± (Secrets), dÃ¼zgÃ¼n OCR fayllarÄ±, xÉ™ta olsa sÉ™bÉ™bi yazÄ±r |
| .github/workflows/create-keystore.yml | repo | Ä°mza aÃ§arÄ±nÄ± BÄ°R DÆFÆ yaradÄ±r |
| app/build.gradle.kts | repo | androidx.webkit É™lavÉ™ olunub (dÃ¼zgÃ¼n .kts sintaksisi) |
| app/src/main/java/az/plite/tap/MainActivity.kt | repo | WebViewAssetLoader (wasm xÉ™tasÄ±nÄ±n hÉ™lli), ekran sÃ¶nmÉ™sin |
| app/src/main/assets/plite-config.js | assets | BÃœTÃœN Ã§É™kiliÅŸ/tanÄ±ma parametrlÉ™ri bir yerdÉ™ |
| .../assets/ort-fix.js | assets | ONNX wasm yolu + xÉ™ta olsa DIAG mÉ™lumatÄ± |
| .../assets/frame-fix.js | assets | Ramka (Ã¶lÃ§Ã¼, ÅŸaquli/Ã¼fÃ¼qi), maqnit, avto-Ã§É™kiliÅŸ, parÄ±ltÄ±, sÉ™viyyÉ™, fÉ™nÉ™r, zoom, titrÉ™mÉ™ |
| .../assets/speed-fix.js | assets | SÃ¼rÉ™tlÉ™ndirmÉ™ (az hesablama) |
| .../assets/sticker-ocr.js | assets | StikerdÉ™n É™n bÃ¶yÃ¼k yazÄ±nÄ± (ad) oxuyur |
| .../assets/label-shot.js | assets | AyrÄ±ca etiket ÅŸÉ™kli + axtarÄ±ÅŸÄ± etiketlÉ™ dÉ™qiqlÉ™ÅŸdirmÉ™ |

## SilinmÉ™li kÃ¶hnÉ™ fayllar
- .github/workflows/main.yml  (Build APK artÄ±q build.yml-dÉ™dir)
- app/src/main/assets/ort-config.js vÉ™ index.html-dÉ™ki <script src="ort-config.js"></script> sÉ™tri

## index.html
index-html-skriptler.txt faylÄ±ndakÄ± 6 sÉ™tri gÃ¶stÉ™rilÉ™n sÄ±ra ilÉ™ É™lavÉ™ et.

## Birinci dÉ™fÉ™ qurmaq (imza aÃ§arÄ±)
1. Actions -> "Create Keystore (bir dÉ™fÉ™)" -> Run workflow (bir dÉ™fÉ™!).
2. Run -> Artifacts -> keystore-secrets -> secrets.txt.
3. Settings -> Secrets and variables -> Actions: yalnÄ±z bu 2 secret lazÄ±mdÄ±r (eyni secrets.txt-dÉ™n):
   KERAMO_KEYSTORE_B64 (uzun sÉ™tir), KERAMO_KEYSTORE_PASSWORD (32 simvol).
   Alias avtomatik "keramo"-dur, KERAMO_KEY_ALIAS / KERAMO_KEY_PASSWORD artÄ±q lazÄ±m deyil.
4. Create Keystore run-unu sil. Sonra Actions -> Build APK -> Run workflow.
5. Artifacts-dan APK-nÄ± endir. Ä°lk dÉ™fÉ™ kÃ¶hnÉ™ proqramÄ± SÄ°L, yenisini qur.
   Bundan sonrakÄ± yenilÉ™mÉ™lÉ™r Ã¼stÃ¼ndÉ™n qurulur.

## Kataloqu bÉ™rpa etmÉ™k
Ãœnvan vÉ™ aÃ§ar dÉ™yiÅŸdiyi Ã¼Ã§Ã¼n kÃ¶hnÉ™ kataloq yeni proqramda gÃ¶rÃ¼nmÃ¼r.
Kataloq -> "BÉ™rpa et" -> keramo-backup-2026-10-04.json faylÄ±nÄ± seÃ§.

## Ä°stifadÉ™
- Kataloq -> "Kamera ilÉ™ Ã§É™k": 1) etiket (stiker) ÅŸÉ™kli -> 2) kafel ÅŸÉ™killÉ™ri (3 É™dÉ™d, avto-Ã§É™kiliÅŸ) -> Bitir.
  "Model adÄ±" etiketdÉ™n avtomatik dolur.
- Axtar: nÉ™ticÉ™lÉ™rin Ã¼stÃ¼ndÉ™ "ðŸ· EtiketlÉ™ dÉ™qiqlÉ™ÅŸdir" (nÉ™ticÉ™lÉ™r yaxÄ±ndÄ±rsa xÉ™bÉ™rdarlÄ±q).
- Ramka yaÅŸÄ±l yananda kafelin kÉ™narlarÄ± tapÄ±lÄ±b (maqnit), "Avto: aÃ§Ä±q" olanda Ã¶zÃ¼ Ã§É™kir.

## TÉ™nzimlÉ™mÉ™
BÃ¼tÃ¼n rÉ™qÉ™mlÉ™r plite-config.js-dÉ™dir (maqnit hÉ™ssaslÄ±ÄŸÄ±, avto-Ã§É™kiliÅŸ, sÃ¼rÉ™t/dÉ™qiqlik, etiket, xÉ™bÉ™rdarlÄ±q hÉ™ddi).
Etiket addÄ±mÄ±nÄ± sÃ¶ndÃ¼rmÉ™k: LABEL_PHASE: false.

## BilinÉ™n mÉ™hdudiyyÉ™tlÉ™r
- Kod telefonda tam sÄ±naqdan keÃ§mÉ™yib; xÉ™ta olsa ekran gÃ¶rÃ¼ntÃ¼sÃ¼ / Actions xÉ™ta mÉ™tni gÃ¶ndÉ™r.
- OCR yalnÄ±z ingilis hÉ™rflÉ™ri ilÉ™: "Ä°" -> "I". KiÃ§ik yazÄ± vÉ™ ya parÄ±ltÄ± oxumanÄ± pozur.
- Maqnit kafelin kÉ™narÄ± gÃ¶rÃ¼nÉ™ndÉ™ iÅŸlÉ™yir (fuqa xÉ™tti vÉ™ ya fonla fÉ™rq).
- TitrÉ™mÉ™ Ã¼Ã§Ã¼n lazÄ±m olsa AndroidManifest.xml-É™ VIBRATE icazÉ™si É™lavÉ™ et.
