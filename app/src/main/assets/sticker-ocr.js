// sticker-ocr.js — stikerdəki koddan (məs. "NEPAL LİGHT", "VHP 600052") avtomatik ad
// Kataloq çəkilişi bitəndə şəkillərdəki stikerin ƏN BÖYÜK yazısını oxuyur və "Model adı" xanasına yazır.
// Kiçik yazılar (30x60, VEİNS AURA və s.) ad kimi götürülmür, amma "Başqa variantlar" düymələri kimi göstərilir.
//
// QURAŞDIRMA:
//  1) Bu faylı app/src/main/assets/ içinə at.
//  2) index.html-də ƏN SONDA (speed-fix.js-dən SONRA), </body>-dən əvvəl:
//       <script src="sticker-ocr.js"></script>
//  3) frame-fix.js (v5) və main.yml (OCR addımı düzəlib) də yenilənməlidir.

(function () {
  var BASE = new URL('ocr', location.href).href;   // mütləq ünvan (worker üçün lazımdır)
  var CFG = window.PLITE_CFG || {};
  var MIN_CONF = CFG.MIN_CONF != null ? CFG.MIN_CONF : 55;      // oxunmuş yazının minimal inamı (%)
  var MAIN_RATIO = CFG.MAIN_RATIO != null ? CFG.MAIN_RATIO : 0.7;   // əsas yazı = ən böyük yazının hündürlüyünün ən azı 70%-i
  var TIME_CAP = CFG.TIME_CAP != null ? CFG.TIME_CAP : 25000;   // ms: bütün şəkillər üçün ümumi limit

  var worker = null, wp = null;
  function getWorker() {
    if (worker) return Promise.resolve(worker);
    if (wp) return wp;
    wp = (async function () {
      if (typeof Tesseract === 'undefined') throw new Error('OCR modulu tapılmadı');
      var w = await Tesseract.createWorker('eng', 1, {
        workerPath: BASE + '/worker.min.js', corePath: BASE, langPath: BASE, gzip: false, workerBlobURL: false
      });
      try {
        await w.setParameters({
          tessedit_pageseg_mode: '11', // səpələnmiş yazı (foto üçün)
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-./ '
        });
      } catch (e) {}
      worker = w; return w;
    })();
    wp.catch(function () { wp = null; });
    return wp;
  }

  /* ---------- OCR nəticəsindən sətirləri çıxar ---------- */
  function linesOf(data) {
    var out = [];
    function push(l) {
      var bb = l && l.bbox; if (!bb) return;
      out.push({ t: String(l.text || '').trim(), x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1, c: l.confidence });
    }
    if (data.lines && data.lines.length) data.lines.forEach(push);
    else if (data.blocks && data.blocks.length) {
      data.blocks.forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(push); }); });
    } else if (data.tsv) {
      var map = {};
      String(data.tsv).split('\n').forEach(function (ln) {
        var f = ln.split('\t'); if (f.length < 12 || f[0] !== '5') return;
        var k = f[2] + '_' + f[3] + '_' + f[4], x0 = +f[6], y0 = +f[7], x1 = x0 + +f[8], y1 = y0 + +f[9], c = +f[10];
        var m = map[k] || (map[k] = { w: [], x0: 1e9, y0: 1e9, x1: 0, y1: 0, cs: [] });
        m.w.push(f.slice(11).join('\t')); m.x0 = Math.min(m.x0, x0); m.y0 = Math.min(m.y0, y0);
        m.x1 = Math.max(m.x1, x1); m.y1 = Math.max(m.y1, y1); m.cs.push(c);
      });
      Object.keys(map).forEach(function (k) {
        var m = map[k];
        out.push({ t: m.w.join(' '), x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1, c: m.cs.reduce(function (a, b) { return a + b; }, 0) / m.cs.length });
      });
    }
    return out;
  }

  function cleanText(s) {
    s = String(s).toUpperCase().replace(/[^A-Z0-9\-\.\/ ]/g, ' ').replace(/\s+/g, ' ').trim();
    // rəqəmlərin arasında qalan hərf səhvləri: 6OO052 -> 600052
    var map = { O: '0', I: '1', L: '1', S: '5', B: '8', Z: '2' };
    s = s.replace(/(?<=\d)[OILSBZ]+(?=\d)/g, function (m) { return m.split('').map(function (ch) { return map[ch]; }).join(''); });
    return s.replace(/^[\-\.\/ ]+|[\-\.\/ ]+$/g, '');
  }

  // Ən böyük yazını (stikerin adı) və başqa variantları tap
  function pickName(rawLines) {
    var L = [];
    rawLines.forEach(function (l) {
      var t = cleanText(l.t), n = t.replace(/[^A-Z0-9]/g, '').length;
      if (n >= 2 && l.c >= 45) L.push({ t: t, h: l.y1 - l.y0, x0: l.x0, x1: l.x1, y0: l.y0, y1: l.y1, c: l.c, n: n });
    });
    if (!L.length) return null;
    var anchor = L[0];
    L.forEach(function (l) { if (l.h * l.c * Math.min(l.n, 8) > anchor.h * anchor.c * Math.min(anchor.n, 8)) anchor = l; });
    var aw = anchor.x1 - anchor.x0, main = L.filter(function (l) {
      if (l.h < MAIN_RATIO * anchor.h) return false;
      var cy = (l.y0 + l.y1) / 2, ay = (anchor.y0 + anchor.y1) / 2;
      if (Math.abs(cy - ay) > 3 * anchor.h) return false;
      return l.x1 >= anchor.x0 - aw * .5 && l.x0 <= anchor.x1 + aw * .5;
    });
    main.sort(function (a, b) { return a.y0 - b.y0; });
    var name = main.map(function (l) { return l.t; }).join(' ').replace(/\s+/g, ' ').trim();
    var avg = main.reduce(function (a, l) { return a + l.c; }, 0) / main.length;
    var total = name.replace(/[^A-Z0-9]/g, '').length;
    if (total < 3 || avg < MIN_CONF) return null;
    var cands = [], seen = {}; seen[name] = 1;
    L.filter(function (l) { return main.indexOf(l) < 0 && l.n >= 3 && l.c >= MIN_CONF; })
      .sort(function (a, b) { return b.h - a.h; })
      .forEach(function (l) { if (!seen[l.t] && cands.length < 4) { seen[l.t] = 1; cands.push(l.t); } });
    return { name: name, cands: cands, conf: avg };
  }
  window.PLITE_PICK_NAME = pickName; // yoxlama üçün

  /* ---------- Şəkli oxu ---------- */
  async function ocrOne(src) {
    var w = await getWorker(), res;
    try { res = await w.recognize(src, {}, { blocks: true, text: true, tsv: true }); }
    catch (e) { res = await w.recognize(src); }
    return pickName(linesOf(res.data || {}));
  }

  /* ---------- "Başqa variantlar" düymələri ---------- */
  var chips = null;
  function chipsBox() {
    var inp = document.getElementById('ccn');
    if (!inp) return null;
    if (!chips) {
      chips = document.createElement('div');
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:6px 0';
    }
    if (chips.parentNode !== inp.parentNode) inp.parentNode.insertBefore(chips, inp.nextSibling);
    return chips;
  }
  function showChips(list) {
    var box = chipsBox(); if (!box) return;
    box.innerHTML = '';
    (list || []).forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'btn alt'; b.textContent = t;
      b.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:.8rem';
      b.onclick = function () { document.getElementById('ccn').value = t; };
      box.appendChild(b);
    });
  }

  // Hər şəkil yalnız bir dəfə oxunur (nəticə yadda qalır)
  var cache = new WeakMap();
  function ocrCached(c) {
    var p = cache.get(c);
    if (!p) { p = ocrOne(c._hi || c.hires || c).catch(function () { return null; }); cache.set(c, p); }
    return p;
  }

  // frame-fix.js: ilk şəkil çəkiləndə çağırır -> OCR arxa planda artıq başlayır
  window.PLITE_PREOCR = function (c) { try { return ocrCached(c); } catch (e) { return null; } };

  // index.html-dəki readLabel əvəz olunur: kataloq çəkilişi bitəndə çağırılır
  window.readLabel = async function (canvas) {
    showChips([]);
    try {
      var all = [];
      if (window.PLITE_LABEL_SHOT) all.push(window.PLITE_LABEL_SHOT); // ayrıca çəkilmiş etiket şəkli əvvəl oxunur
      all.push(canvas);
      (typeof catalogShots !== 'undefined' ? catalogShots : []).forEach(function (x) { if (all.indexOf(x) < 0) all.push(x); });
      var t0 = Date.now();
      for (var i = 0; i < all.length; i++) {
        if (i > 0 && Date.now() - t0 > TIME_CAP) break;
        var r = await ocrCached(all[i]);
        if (r && r.name) { showChips(r.cands); return r.name; }
      }
    } catch (e) {}
    return '';
  };

  // ilk şəkil üçün göstəriş
  try { if (typeof SHOT_HINTS !== 'undefined') SHOT_HINTS[0] = 'Stiker (kod yazısı) görünsün, düz qarşıdan çək'; } catch (e) {}
})();
