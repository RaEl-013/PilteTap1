# Plitə tap — bütün dəyişikliklər bir yerdə (son versiya)

Qovluq quruluşu repo ilə eynidir (PilteTap1/). Faylları eyni yerlərə at, köhnələrin üzərinə yaz.

## Bu versiyada YENİ
- index.html-də HEÇ NƏ əlavə etmək lazım deyil. MainActivity.kt səhifə yüklənəndən sonra bütün plite modullarını
  (frame-fix, smart-search, label-shot ...) özü yükləyir. index.html-ə səhvən yapışdırılmış izah mətni ("index.html (app/src/main/...",
  "BU SIRA ilə", "Silinməlidir" ...) ekranda göstərilmir. Yenə də onu index.html-dən silmək məsləhətdir.
- Nəticədə şəklə toxun -> MÜQAYİSƏ: ekranda 2 şəkil (çəkdiyin + kataloqdakı), ‹ Əvvəlki / Növbəti ›, "Digər şəkli", "Düzgündür, əlavə et".
  Nəticələr siyahısında çəkdiyin şəkil yuxarıda sabit qalır (sürüşdürəndə də görünür).
- Kataloqa şəkil əlavə edəndə (Şəkilləri əlavə et) AD və ÖLÇÜ fayl adından götürülür:
  "20X60 WOOD ASH MİX.jpg" -> ölçü 20×60, ad "WOOD ASH MİX"; "ad (2).jpg" -> eyni model.
  WhatsApp/IMG kimi mənasız fayl adı olsa, etiketdən oxunur (OCR). Excel faylındakı F sütunu bu formatda fayl adları verir.
- Nəticədə "DINO ... CLIP ... Rəng" izahı HTML kod kimi görünürdü, düzəldildi.
- Ölçü axtarışı: 120×60, 60×60, 30×60, 30×30, 50×50, 40×40, 60×20 (çoxlu seçim); kameradan axtarışda kameradakı ölçü.
- ETİKET ÇƏRÇİVƏSİ 7×4 sm (nisbət 7:4): etiketi çərçivəyə sığdır, şəkil yalnız çərçivənin içindən kəsilir (OCR daha dəqiq və tez).
  Ölçü Ayarlar-da dəyişir (8×5, 10×5, 6×3) və ya plite-config.js: LABEL_CM_W / LABEL_CM_H.
- Çəkilişdən sonra NƏTİCƏ PANELİ: "✅ Etiket oxundu: AD" (Təsdiq et / Yenidən çək) və ya "❌ Etiket oxunmadı" (Yenidən çək /
  Etiketsiz davam et). Axtarışda etiket oxunmasa "Ləğv et". Təsdiq etmədən ad xanasına yazılmır.
- ÖLÇÜ: "120×60" yazılışı (60×120 ilə eynidir), seçilmiş axtarış şəklinə görə seçilmiş ölçülərdə axtarış (çoxlu seçim),
  kataloqda olan istənilən başqa ölçü (məs. 80×80) avtomatik düymə kimi əlavə olunur.
- 90° çevrilmiş şəkil LƏĞV olundu. Kataloq çəkilişi 5 şəkildir: 1 düz · 2 yaxın · 3 uzaq · 4 yan bucaq · 5 zəif işıq.
- AYARLAR (⚙) bölməsi: başlıqda 🌙 düyməsinin yanında. Şəkil sayı, maqnit və tərpənmə həssaslığı, avto işıq/fənər,
  kamera ayırdetməsi, tanıma dəqiqliyi, çalar/tekstura təsiri, ölçü filtri, etiket addımı, titrəmə. "Standartlara qayıt" var.
- Avto kamera (auto-camera.js): qaranlıqda işığı artırır, çatmasa fənəri (flash) yandırır; çox işıqlıda azaldır;
  yan bucaqdan çəkəndə fokus mərkəzə. Kamera düzəldə bilmirsə, çox qaranlıq/işıqlı şəkli proqram düzəldir.
- Ölçü filtri: Axtar-da ölçü düymələri; kameradan axtarışda seçilmiş ölçüdə axtarır; "Bütün ölçülərdə axtar" düyməsi.
- Hər kafel avtomatik etiketlənir və saxlanır: rəng çaları, tekstura (düz/damarlı/naxışlı), ölçü, Kafel/Metlax.
  Kataloqda çalar/ton/tekstura/ölçü filtrləri var. Köhnə şəkillər proqram açılanda avtomatik etiketlənir.
- Çəkiliş və axtarış üçün AYRI parametr profilləri + kataloqda hər şəklin öz parametrləri (plite-config.js).
- Yeni parametrlər: MOTION_MAX (tərpənmə nəzarəti), CAM_WIDTH/HEIGHT (kamera ayırdetməsi), VIBRATE.
- Axtarış nəticəsində izah sətri düzəldildi (əvvəl HTML kod kimi görünə bilərdi).

## Fayllar
| Fayl | Hara | Nə edir |
|---|---|---|
| .github/workflows/build.yml | repo | Build APK (sabit imza açarı) |
| .github/workflows/create-keystore.yml | repo | İmza açarını bir dəfə yaradır |
| app/build.gradle.kts | repo | androidx.webkit |
| app/src/main/java/az/plite/tap/MainActivity.kt | repo | WebViewAssetLoader, ekran sönməsin |
| assets/plite-config.js | assets | BÜTÜN parametrlər, profillər, istifadəçi ayarı üstünlüyü |
| assets/ort-fix.js | assets | ONNX wasm yolu, DIAG |
| assets/frame-fix.js | assets | Ramka, maqnit, avto-çəkiliş, parıltı, səviyyə, tərpənmə, fənər, zoom |
| assets/speed-fix.js | assets | Sürət; 90° göstərişini çıxarır; şəkil sayı dinamik |
| assets/sticker-ocr.js | assets | Stikerdən ad oxuma |
| assets/smart-search.js | assets | Çalar/tekstura/ölçü etiketləri, ölçü filtri, yeni axtarış, kataloq filtrləri |
| assets/auto-camera.js | assets | Avto işıq/fənər/yan bucaq |
| assets/settings-panel.js | assets | ⚙ Ayarlar |
| assets/label-shot.js | assets | Ayrıca etiket şəkli, axtarışı etiketlə dəqiqləşdirmə |

## index.html
Dəyişiklik lazım deyil. Əvvəl yapışdırdığın izah mətni və <script> sətirləri varsa, silə bilərsən; qalsalar da zərəri yoxdur.

## Parametr üstünlük sırası (avtomatik)
Ayarlar (⚙) -> kataloqda şəklin öz sırası -> rejim profili (catalog / search) -> plite-config.js ümumi -> standart.

## İmza açarı (bir dəfəlik)
Create Keystore işlət -> secrets.txt -> yalnız 2 secret: KERAMO_KEYSTORE_B64, KERAMO_KEYSTORE_PASSWORD.
İlk dəfə köhnə proqramı sil, sonra hamısı üstündən qurulur. Kataloqu "Bərpa et" ilə geri yüklə.

## Bilinən məhdudiyyətlər
- Kod telefonda tam sınaqdan keçməyib (məntiq simulyasiya ilə yoxlanıb). Xəta olsa ekran görüntüsü göndər.
- Etiket çərçivəsi real santimetri bilmir, yalnız 7:4 nisbətini göstərir; etiketi çərçivənin eninə yaxın doldurmaq lazımdır.
- Fənər, işıq (exposure), fokus nöqtəsi və ayırdetmə telefondan və WebView-dan asılıdır; dəstəklənməyən hissə sakitcə keçilir.
- Çalar və tekstura kiçik cərimə kimi işləyir. 20 şəkillik kataloqda nəticəni cəmi 1 halda yaxşılaşdırdı; əsas ayırıcı etiketdir.
- Avto-işıq ton fərqini (DARK/LIGHT) azalda bilər; ona görə yalnız ifrat qaranlıq/işıqda müdaxilə edir.
- Titrəmə üçün lazım olsa AndroidManifest.xml-ə VIBRATE icazəsi əlavə et.
