// plite-config.js — BÜTÜN çəkiliş / axtarış / kamera parametrləri bir yerdə
// index.html-də ƏN ƏVVƏL yüklənməlidir (digər plite fayllarından əvvəl).
//
// Parametr necə seçilir (avtomatik, sən heç nə seçmirsən):
//   1) kataloqda şəklin öz sırası (shots[...]) varsa, o
//   2) yoxsa rejimin profili: catalog (kataloq çəkilişi) və ya search (axtarış çəkilişi)
//   3) yoxsa aşağıdakı ümumi dəyər

window.PLITE_CFG = {
  // ================= ÜMUMİ =================
  // Maqnit (kafelin kənarlarını tapmaq)
  MIN_S: 6,             // kənarın minimal gücü: az = həssas, çox = ciddi
  RANGE: 0.15,          // maqnit məsafəsi (çərçivə tərəfinin faizi)
  INSET: 0.01,          // fuqa xəttini kənarda saxlamaq üçün kəsmə payı
  // Avto-çəkiliş və xəbərdarlıqlar
  AUTO_DEFAULT: true,   // Avto-çəkiliş ilk açılışda açıq olsun
  STABLE: 2,            // avto-çəkiliş üçün ardıcıl uğurlu yoxlama (~0.6 san. hər biri)
  COOLDOWN: 2500,       // ms: iki avto-çəkiliş arası fasilə
  GLARE: 0.01,          // parlaq piksellərin payı bundan çoxdursa -> parıltı xəbərdarlığı
  TILT_MAX: 12,         // dərəcə: bundan çox əyridirsə -> xəbərdarlıq
  MOTION_MAX: 10,       // iki yoxlama arası kadr fərqi (0-255): bundan çoxdursa telefon tərpənir -> avto-çəkiliş gözləyir
  VIBRATE: true,        // yaşıl yananda və çəkəndə titrəmə
  // Sürət / dəqiqlik
  CROPS_N: 2,           // kataloq üçün kəsim sayı (1-6)
  MAX_SHOTS: 5,         // kataloq çəkilişində şəkil sayı (1-5): 1 düz · 2 yaxın · 3 uzaq · 4 yan bucaq · 5 zəif işıq
  ALL_ROT: false,       // true = axtarışda 4 çevirmə (dəqiq, 4 dəfə yavaş)

  // Avto kamera (işıq / fənər / yan bucaq)
  AUTO_EXPOSURE: true,  // qaranlıqda işığı artır, çox işıqlıda azalt
  AUTO_TORCH: true,     // işıq artırmaq çatmasa fənəri (flash) özü yandır
  DARK_Y: 80,           // orta parlaqlıq (0-255) bundan azdırsa -> qaranlıq
  BRIGHT_Y: 190,        // bundan çoxdursa -> çox işıqlı
  BLOWN: 0.12,          // yanıb ağarmış piksel payı bundan çoxdursa -> çox işıqlı
  SIDE_TILT: 20,        // dərəcə: telefon bu qədər əyiləndə "yan bucaq" rejimi (fokus/ölçmə mərkəzə)
  SOFT_FIX: true,       // kamera özü düzəldə bilməsə, çox qaranlıq/işıqlı şəkli proqramla düzəlt
  CAM_WIDTH: 1920,      // kamera ayırdetməsi (en x hündürlük). Yüksək = etiket oxuma və detal yaxşı, amma bir az yavaş
  CAM_HEIGHT: 1080,

  // Axtarışda çalar / tekstura / ölçü
  W_COLOR: 0.01,        // rəng çaları fərqinə cərimə (0 = söndür)
  W_TEX: 0.02,          // tekstura növü fərqinə cərimə (düz / damarlı / naxışlı)
  W_TONE: 0.01,         // açıq-tünd fərqinə cərimə (işıqdan çox asılıdır, kiçik saxla)
  SIZE_ONLY_DEFAULT: true, // kameradan axtarışda seçilmiş ölçü ilə yalnız o ölçüdə axtar

  // Etiket (stiker)
  LABEL_PHASE: true,    // kataloq çəkilişində ayrıca etiket şəkli addımı
  LABEL_MAX_SIDE: 1600, // etiket şəklinin uzun tərəfi (px)
  AMBIG_MARGIN: 7,      // axtarışda 1-ci və 2-ci nəticənin faiz fərqi bundan azdırsa -> "etiketi çək"
  MIN_CONF: 55,         // oxunmuş yazının minimal inamı (%)
  MAIN_RATIO: 0.7,      // əsas yazı = ən böyük yazının hündürlüyünün ən azı bu qədəri
  TIME_CAP: 25000,      // ms: OCR ümumi limit

  // ================= PROFİL: KATALOQ ÇƏKİLİŞİ =================
  catalog: {
    STABLE: 2, GLARE: 0.01, TILT_MAX: 12, MOTION_MAX: 10, CROPS_N: 2
  },

  // ================= PROFİL: AXTARIŞ ÇƏKİLİŞİ =================
  search: {
    STABLE: 1,            // axtarışda daha tez çək
    GLARE: 0.02, TILT_MAX: 25, MOTION_MAX: 10,
    CROPS_N: 2, ALL_ROT: false
  },

  // ================= KATALOQDA HƏR ŞƏKİL ÜÇÜN AYRICA (1-ci, 2-ci, ... 5-ci) =================
  // (90° çevrilmiş şəkil ləğv olunub)
  // 1 düz qarşıdan · 2 yaxından · 3 uzaqdan · 4 yan bucaqdan · 5 zəif işıqda
  shots: [
    {},
    {},
    {},
    { TILT_MAX: 60, GLARE: 0.03, MOTION_MAX: 14 },                   // 4: yan bucaq
    { AUTO_EXPOSURE: false, AUTO_TORCH: false, GLARE: 0.03 }         // 5: zəif işıq (məqsədli qaranlıq)
  ]
};

// İstifadəçinin proqramdakı "Ayarlar" (⚙) bölməsindən seçdikləri (telefonda saxlanır) hər şeydən üstündür
window.PLITE_USER = (function () {
  try { return JSON.parse(localStorage.getItem('plite_user_cfg') || '{}') || {}; } catch (e) { return {}; }
})();

// Cari parametri tapır: istifadəçi ayarı -> şəklin sırası -> rejim profili -> ümumi -> default
window.PLITE_P = function (k, d) {
  var U = window.PLITE_USER || {};
  if (U[k] != null) return U[k];
  var c = window.PLITE_CFG || {};
  var mode = (typeof camMode !== 'undefined' && camMode) ? camMode : 'search';
  if (mode === 'catalog' && typeof catalogShots !== 'undefined' && c.shots) {
    var s = c.shots[catalogShots.length];
    if (s && s[k] != null) return s[k];
  }
  var m = c[mode];
  if (m && m[k] != null) return m[k];
  return c[k] != null ? c[k] : d;
};
