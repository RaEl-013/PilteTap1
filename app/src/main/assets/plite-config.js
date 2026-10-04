// plite-config.js — BÜTÜN çəkiliş / tanıma parametrləri bir yerdə
// index.html-də ƏN ƏVVƏL yüklənməlidir (frame-fix.js-dən əvvəl):
//     <script src="plite-config.js"></script>
// Burada dəyər dəyişəndə digər fayllara toxunmaq lazım deyil.

window.PLITE_CFG = {
  // ---- Maqnit (kafelin kənarlarını tapmaq) ----
  MIN_S: 6,            // kənarın minimal gücü: az = həssas (səhv tapa bilər), çox = ciddi
  RANGE: 0.15,         // maqnit məsafəsi (çərçivə tərəfinin faizi)
  INSET: 0.01,         // fuqa xəttini kənarda saxlamaq üçün kəsmə payı

  // ---- Avtomatik çəkiliş və xəbərdarlıqlar ----
  AUTO_DEFAULT: true,  // Avto-çəkiliş ilk açılışda açıq olsun
  STABLE: 2,           // avto-çəkiliş üçün ardıcıl uğurlu yoxlama sayı (~0.6 san. hər biri)
  COOLDOWN: 2500,      // ms: iki avto-çəkiliş arası fasilə
  GLARE: 0.01,         // parlaq piksellərin payı bundan çoxdursa -> parıltı xəbərdarlığı
  TILT_MAX: 12,        // dərəcə: bundan çox əyridirsə -> xəbərdarlıq

  // ---- Sürət / dəqiqlik ----
  CROPS_N: 2,          // kataloq üçün kəsim sayı (1-6)
  MAX_SHOTS: 3,        // kataloq çəkilişində avtomatik bitmə sayı (1-6)
  ALL_ROT: false,      // true = axtarışda 4 çevirmə (dəqiq, 4 dəfə yavaş)

  // ---- Etiket (stiker) ----
  LABEL_PHASE: true,   // kataloq çəkilişində ayrıca etiket şəkli addımı
  LABEL_MAX_SIDE: 1600,// etiket şəklinin uzun tərəfi (px): çox = daha dəqiq oxuma, yavaş
  AMBIG_MARGIN: 7,     // axtarışda 1-ci və 2-ci nəticənin faiz fərqi bundan azdırsa -> "etiketi çək" xəbərdarlığı
  MIN_CONF: 55,        // oxunmuş yazının minimal inamı (%)
  MAIN_RATIO: 0.7,     // əsas yazı = ən böyük yazının hündürlüyünün ən azı bu qədəri
  TIME_CAP: 25000      // ms: OCR ümumi limit
};
