# Plitə tap — bütün dəyişikliklər bir yerdə (son versiya)

Qovluq quruluşu repo ilə eynidir (PilteTap1/). Faylları eyni yerlərə at, köhnələrin üzərinə yaz.

## Bu versiyada YENİ
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
index-html-skriptler.txt-dəki 9 sətri göstərilən sıra ilə əlavə et.

## Parametr üstünlük sırası (avtomatik)
Ayarlar (⚙) -> kataloqda şəklin öz sırası -> rejim profili (catalog / search) -> plite-config.js ümumi -> standart.

## İmza açarı (bir dəfəlik)
Create Keystore işlət -> secrets.txt -> yalnız 2 secret: KERAMO_KEYSTORE_B64, KERAMO_KEYSTORE_PASSWORD.
İlk dəfə köhnə proqramı sil, sonra hamısı üstündən qurulur. Kataloqu "Bərpa et" ilə geri yüklə.

## Bilinən məhdudiyyətlər
- Kod telefonda tam sınaqdan keçməyib (məntiq simulyasiya ilə yoxlanıb). Xəta olsa ekran görüntüsü göndər.
- Fənər, işıq (exposure), fokus nöqtəsi və ayırdetmə telefondan və WebView-dan asılıdır; dəstəklənməyən hissə sakitcə keçilir.
- Çalar və tekstura kiçik cərimə kimi işləyir. 20 şəkillik kataloqda nəticəni cəmi 1 halda yaxşılaşdırdı; əsas ayırıcı etiketdir.
- Avto-işıq ton fərqini (DARK/LIGHT) azalda bilər; ona görə yalnız ifrat qaranlıq/işıqda müdaxilə edir.
- Titrəmə üçün lazım olsa AndroidManifest.xml-ə VIBRATE icazəsi əlavə et.
