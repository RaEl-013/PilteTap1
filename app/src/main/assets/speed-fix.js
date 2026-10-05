// speed-fix.js — sürətləndirmə
// Yavaşlığın əsas səbəbi: hər şəkil üçün çox sayda neyron şəbəkə hesablaması (DINO + CLIP).
//   Kataloqa əlavə: 6 şəkil x 6 kəsim = 36 hesablama  ->  indi 3 şəkil x 2 kəsim = 6
//   Axtarış:        4 çevirmə x 2 kəsim = 8 hesablama  ->  indi 2
// Əlavə: OCR yalnız ingilis dilində və 6 san. limitlə; kataloq çəkilişində canlı tanıma söndürülür.
//
// QURAŞDIRMA: bu faylı app/src/main/assets/ içinə at, index.html-də ƏN SONDA (digər fayllardan sonra)
// </body>-dən əvvəl əlavə et:   <script src="speed-fix.js"></script>
//
// Tənzimləmə (aşağıdakı rəqəmlər):
//   CROPS_N    kataloq üçün kəsim sayı (1-6). Az = sürətli, çox = dəqiq.
//   MAX_SHOTS  kataloq çəkilişində avtomatik bitmə sayı (1-6).
//   ALL_ROT    true etsən axtarışda 4 çevirmə yenidən yoxlanılır (dəqiq, amma 4 dəfə yavaş).

(function () {
  // Hamısı hər dəfə yenidən oxunur (plite-config.js profilləri və proqramdakı Ayarlar)
  var P = window.PLITE_P || function (k, d) { return d; };
  function MAX_SHOTS() { return P('MAX_SHOTS', 5); }
  Object.defineProperty(window, 'PLITE_MAX_SHOTS', { get: MAX_SHOTS, configurable: true });

  // 90° çevrilmiş şəkil ləğv olunub: göstərişlər siyahısından çıxar
  try {
    if (typeof SHOT_HINTS !== 'undefined') {
      var ix = SHOT_HINTS.findIndex(function (h) { return /90/.test(h); });
      if (ix >= 0) SHOT_HINTS.splice(ix, 1);
    }
  } catch (e) {}

  // 1) Kataloq üçün az kəsim
  window.itemEmbs = async function (c) {
    var o = [];
    var n = Math.max(1, Math.min(CROPS.length, P('CROPS_N', 2)));
    for (var i = 0; i < n; i++) o.push(await dino(c, 0, CROPS[i]));
    return o;
  };

  // 2) Eyni şəkil + eyni kəsim bir dəfə hesablanır (axtarışda 4 çevirmə üçün təkrar hesablama olmur)
  var origDino = window.dino, cache = new WeakMap();
  window.dino = function (src, rot, cr) {
    if (P('ALL_ROT', false)) return origDino(src, rot, cr);
    var key = cr ? cr.join(',') : '0', m = cache.get(src);
    if (!m) { m = {}; cache.set(src, m); }
    if (!m[key]) m[key] = origDino(src, 0, cr);
    return m[key];
  };

  // 3) OCR yüngül: yalnız ingilis dili, 6 san. limit
  var ocrW = null;
  window.ensureOcr = async function () {
    if (ocrW) return ocrW;
    if (typeof Tesseract === 'undefined') throw new Error('OCR modulu tapılmadı');
    ocrW = await Tesseract.createWorker(['eng'], 1, { workerPath: 'ocr/worker.min.js', corePath: 'ocr/tesseract-core-simd-lstm.js', langPath: 'ocr/', gzip: false });
    return ocrW;
  };
  var origRead = window.readLabel;
  window.readLabel = function (c) {
    return Promise.race([origRead(c), new Promise(function (r) { setTimeout(function () { r(''); }, 6000); })]);
  };

  // 4) Kataloq çəkilişində canlı tanıma lazım deyil (CPU-nu boş yerə yeyir)
  var origLive = window.liveMatch;
  window.liveMatch = function (v, z) {
    if (camMode === 'catalog') return Promise.resolve();
    return origLive(v, z);
  };

  // 5) Kataloq çəkilişində şəkil sayı mətni
  var origShots = window.renderShots;
  window.renderShots = function () {
    origShots();
    var n = catalogShots.length, ci = document.getElementById('csinfo');
    var mx = MAX_SHOTS();
    if (ci) ci.textContent = n >= mx ? n + ' şəkil tamam. Bitir bas.' : (n + 1) + '/' + mx + ': ' + (SHOT_HINTS[n] || '');
  };
})();
