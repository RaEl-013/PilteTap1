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
  var CFG = window.PLITE_CFG || {};
  var CROPS_N = CFG.CROPS_N != null ? CFG.CROPS_N : 2;
  var MAX_SHOTS = CFG.MAX_SHOTS != null ? CFG.MAX_SHOTS : 3;
  var ALL_ROT = CFG.ALL_ROT != null ? CFG.ALL_ROT : false;
  window.PLITE_MAX_SHOTS = MAX_SHOTS;

  // 1) Kataloq üçün az kəsim
  window.itemEmbs = async function (c) {
    var o = [];
    for (var i = 0; i < CROPS_N; i++) o.push(await dino(c, 0, CROPS[i]));
    return o;
  };

  // 2) Eyni şəkil + eyni kəsim bir dəfə hesablanır (axtarışda 4 çevirmə üçün təkrar hesablama olmur)
  var origDino = window.dino, cache = new WeakMap();
  window.dino = function (src, rot, cr) {
    if (ALL_ROT) return origDino(src, rot, cr);
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
    if (ci) ci.textContent = n >= MAX_SHOTS ? n + ' şəkil tamam. Bitir bas.' : (n + 1) + '/' + MAX_SHOTS + ': ' + SHOT_HINTS[n];
  };
})();
