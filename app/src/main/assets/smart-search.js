// smart-search.js — ölçü filtri, rəng çaları, tekstura növü, yenilənmiş axtarış
//
// 1) HƏR KAFEL avtomatik etiketlənir və kataloqda SAXLANIR: rəng çaları (məs. "bej · orta"),
//    tekstura növü (düz / damarlı / naxışlı), ölçü (kameradakı ölçü seçimindən), həm də Kafel/Metlax növü.
//    Köhnə kataloq şəkilləri də proqram açılanda avtomatik etiketlənir.
// 2) ÖLÇÜ FİLTRİ: Axtar bölməsində ölçü düymələri (60×120, 60×60, 50×50 ...). Heç biri seçilməyibsə hamısında axtarır.
//    Kameradan axtarışda kameradakı ölçü ilə yalnız o ölçüdə axtarılır ("Ölçü filtri" düyməsi ilə söndürülür);
//    nəticələrdə "Bütün ölçülərdə axtar" düyməsi var. Ölçüsü bilinməyən köhnə şəkillər həmişə axtarışa daxildir.
// 3) AXTARIŞ: oxşarlığa çalar və tekstura fərqi kiçik cərimə kimi əlavə olunur (plite-config.js: W_COLOR, W_TEX, W_TONE).
// 4) KATALOQ: çalar / tekstura / ölçü filtrləri və hər şəkildə etiketlər.
//
// QURAŞDIRMA: assets/ içinə at; index.html-də sticker-ocr.js-dən SONRA, label-shot.js-dən ƏVVƏL:
//     <script src="smart-search.js"></script>

(function () {
  var P = window.PLITE_P || function (k, d) { return d; };
  function $(id) { return document.getElementById(id); }

  /* ================= Ölçü köməkçiləri ================= */
  var SIZE_LABEL = { '60x120': '120×60', '30x60': '60×30', '60x60': '60×60', '50x50': '50×50', '40x40': '40×40', '20x60': '60×20' };
  var SIZE_KEYS = ['60x120', '30x60', '60x60', '50x50', '40x40', '20x60'];
  function canon(s) {
    if (!s) return null;
    var m = String(s).toLowerCase().replace(/[×x]/g, 'x').split('x').map(Number).filter(Boolean);
    if (m.length !== 2) return null;
    m.sort(function (a, b) { return a - b; });
    return m[0] + 'x' + m[1];
  }
  function prettySize(c) { return c ? (SIZE_LABEL[c] || c.replace('x', '×')) : ''; }
  window.PLITE_CANON_SIZE = canon;

  /* ================= Rəng çaları və tekstura (piksel məntiqi) ================= */
  function srgb2lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function rgb2lab(r, g, b) {
    var R = srgb2lin(r), G = srgb2lin(g), B = srgb2lin(b);
    var X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
    var Y = (0.2126729 * R + 0.7151522 * G + 0.0721750 * B);
    var Z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / 1.08883;
    function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    var fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function median(arr) {
    var a = Float64Array.from(arr).sort(), n = a.length;
    return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
  }
  function shadeOf(L, a, b) {
    var C = Math.hypot(a, b), h = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, name;
    var tone = L >= 68 ? 'açıq' : (L >= 58 ? 'orta' : 'tünd');
    if (L < 22) name = 'qara';
    else if (C < 4) name = L >= 85 ? 'ağ' : 'boz';
    else if (h >= 35 && h <= 115) name = C < 9 ? 'krem' : (C < 15 ? 'bej' : 'qəhvəyi');
    else if (h > 115 && h < 190) name = 'yaşıl';
    else if (h >= 190 && h < 290) name = 'göy';
    else name = C < 10 ? 'çəhrayı' : 'qırmızı';
    return { name: name, tone: tone, L: +L.toFixed(1), a: +a.toFixed(1), b: +b.toFixed(1) };
  }
  // e40 = güclü kənarların (parlaqlıq sıçrayışı > 40) payı: naxış/dekor güclü kənarlar verir, damar isə yumşaq keçidlər.
  // Hədlər 20 şəkillik kataloqda təmiz ayrıldı (düz <= 0.001, damarlı 0.007-0.056, naxışlı >= 0.096); orta aralıq seçildi.
  function texOf(e40, grad) {
    var kind = (e40 < 0.004 && grad < 9) ? 'düz' : (e40 > 0.075 ? 'naxışlı' : 'damarlı');
    return { kind: kind, e40: +e40.toFixed(3), grad: +grad.toFixed(1) };
  }

  // d: RGBA massivi, W x H. Letterbox zolaqları (#c8c8c8) çıxarılır, mərkəzin 70%-i götürülür.
  function tagsFromRGBA(d, W, H) {
    var colBar = new Array(W).fill(0), rowBar = new Array(H).fill(0), x, y, k;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      k = (y * W + x) * 4;
      if (Math.abs(d[k] - 200) < 6 && Math.abs(d[k + 1] - 200) < 6 && Math.abs(d[k + 2] - 200) < 6) { colBar[x]++; rowBar[y]++; }
    }
    var x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
    while (x0 < W && colBar[x0] / H > 0.97) x0++;
    while (x1 >= 0 && colBar[x1] / H > 0.97) x1--;
    while (y0 < H && rowBar[y0] / W > 0.97) y0++;
    while (y1 >= 0 && rowBar[y1] / W > 0.97) y1--;
    if (x1 <= x0 || y1 <= y0) { x0 = 0; x1 = W - 1; y0 = 0; y1 = H - 1; }
    var cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    var rx0 = x0 + Math.floor(cw * 0.15), rx1 = x0 + Math.floor(cw * 0.85);
    var ry0 = y0 + Math.floor(ch * 0.15), ry1 = y0 + Math.floor(ch * 0.85);
    var N = 96, rw = rx1 - rx0, rh = ry1 - ry0;
    var px = new Float32Array(N * N * 3), i, j, c;
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var sx0 = rx0 + Math.floor(i * rw / N), sx1 = Math.max(sx0 + 1, rx0 + Math.floor((i + 1) * rw / N));
      var sy0 = ry0 + Math.floor(j * rh / N), sy1 = Math.max(sy0 + 1, ry0 + Math.floor((j + 1) * rh / N));
      var s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (y = sy0; y < sy1; y++) for (x = sx0; x < sx1; x++) { k = (y * W + x) * 4; s0 += d[k]; s1 += d[k + 1]; s2 += d[k + 2]; n++; }
      c = (j * N + i) * 3; px[c] = s0 / n; px[c + 1] = s1 / n; px[c + 2] = s2 / n;
    }
    var Ls = [], As = [], Bs = [], g = new Float32Array(N * N);
    for (i = 0; i < N * N; i++) {
      c = i * 3; var lab = rgb2lab(px[c], px[c + 1], px[c + 2]);
      Ls.push(lab[0]); As.push(lab[1]); Bs.push(lab[2]);
      g[i] = 0.299 * px[c] + 0.587 * px[c + 1] + 0.114 * px[c + 2];
    }
    var strong = 0, gsum = 0, m = 0;
    for (y = 0; y < N - 1; y++) for (x = 0; x < N - 1; x++) {
      var gx = g[y * N + x + 1] - g[y * N + x], gy = g[(y + 1) * N + x] - g[y * N + x], mag = Math.hypot(gx, gy);
      if (mag > 40) strong++; gsum += mag; m++;
    }
    return {
      shade: shadeOf(median(Ls), median(As), median(Bs)),
      tex: texOf(strong / m, gsum / m),
      ar: +(Math.min(cw, ch) / Math.max(cw, ch)).toFixed(2)
    };
  }
  window.PLITE_TAGS_FROM_RGBA = tagsFromRGBA;

  function tagsFromCanvas(c) {
    var g = c.getContext('2d');
    var id = g.getImageData(0, 0, c.width, c.height);
    return tagsFromRGBA(id.data, c.width, c.height);
  }
  function tagsFromThumb(url) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
          c.getContext('2d').drawImage(im, 0, 0);
          res(tagsFromCanvas(c));
        } catch (e) { res(null); }
      };
      im.onerror = function () { res(null); };
      im.src = url;
    });
  }
  function tagLine(it) {
    var p = [];
    if (it.shade) p.push(it.shade.name + ' · ' + it.shade.tone);
    if (it.tex) p.push(it.tex.kind);
    if (it.size) p.push(prettySize(canon(it.size)));
    return p.join(' · ');
  }

  /* ================= Yeni şəkillər: etiket + ölçü saxla ================= */
  function sizeForNewItem() {
    if (window.PLITE_CAT_SESSION && $('tsz')) return canon($('tsz').value);
    return window.PLITE_LAST_SEARCH_SIZE || null;
  }
  var origPut = window.put;
  if (typeof origPut === 'function') {
    window.put = async function (o) {
      try {
        if (o && o.thumb && (!o.shade || !o.tex)) {
          var t = await tagsFromThumb(o.thumb);
          if (t) { o.shade = t.shade; o.tex = t.tex; if (o.ar == null) o.ar = t.ar; }
        }
        if (o && o.size === undefined) o.size = sizeForNewItem();
      } catch (e) {}
      return origPut.apply(this, arguments);
    };
  }

  // köhnə şəkilləri etiketlə
  async function backfill() {
    var items = [];
    try { items = await window.all(); } catch (e) { return; }
    var todo = items.filter(function (it) { return it.thumb && (!it.shade || !it.tex); });
    if (!todo.length) return;
    var mig = $('mig');
    for (var i = 0; i < todo.length; i++) {
      if (mig) { mig.hidden = false; mig.textContent = 'Çalar və tekstura analizi: ' + (i + 1) + ' / ' + todo.length; }
      try {
        var t = await tagsFromThumb(todo[i].thumb);
        if (t) { todo[i].shade = t.shade; todo[i].tex = t.tex; if (todo[i].ar == null) todo[i].ar = t.ar; await upd(todo[i]); }
      } catch (e) {}
    }
    if (mig) mig.hidden = true;
    if (typeof render === 'function') render();
  }
  setTimeout(backfill, 4000);

  /* ================= Ölçü filtri (Axtar bölməsi) ================= */
  var selSizes = new Set();
  try { JSON.parse(localStorage.getItem('plite_sizes') || '[]').forEach(function (s) { selSizes.add(s); }); } catch (e) {}
  function saveSizes() { try { localStorage.setItem('plite_sizes', JSON.stringify(Array.from(selSizes))); } catch (e) {} }
  function sizeOnly() {
    try { var v = localStorage.getItem('plite_sizeonly'); return v == null ? P('SIZE_ONLY_DEFAULT', true) !== false : v !== '0'; } catch (e) { return true; }
  }

  var chipBtns = {}, chipRow = null, chipAll = null;
  function paintChips() {
    SIZE_KEYS.forEach(function (k) {
      var b = chipBtns[k]; if (!b) return;
      var on = selSizes.has(k);
      b.style.background = on ? 'var(--acc)' : ''; b.style.color = on ? 'var(--acc-ink)' : '';
    });
    if (chipAll) {
      var none = selSizes.size === 0;
      chipAll.style.background = none ? 'var(--acc)' : ''; chipAll.style.color = none ? 'var(--acc-ink)' : '';
    }
  }
  function addChip(k) {
    if (!chipRow || chipBtns[k]) return;
    var b = document.createElement('button');
    b.className = 'btn alt'; b.textContent = prettySize(k);
    b.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:.85rem';
    b.onclick = function () { if (selSizes.has(k)) selSizes.delete(k); else selSizes.add(k); saveSizes(); paintChips(); };
    chipBtns[k] = b; chipRow.insertBefore(b, chipAll);
  }
  (function buildChips() {
    var ft = $('ft'); if (!ft) return;
    chipRow = document.createElement('div');
    chipRow.className = 'row'; chipRow.style.cssText = 'margin-bottom:12px;gap:6px';
    var lb = document.createElement('span'); lb.className = 'msg'; lb.style.margin = '0'; lb.textContent = 'Ölçü:';
    chipRow.appendChild(lb);
    chipAll = document.createElement('button');
    chipAll.className = 'btn alt'; chipAll.textContent = 'Hamısı';
    chipAll.style.cssText = 'width:auto;margin:0;padding:6px 10px;font-size:.85rem';
    chipAll.onclick = function () { selSizes.clear(); saveSizes(); paintChips(); };
    chipRow.appendChild(chipAll);
    SIZE_KEYS.slice().forEach(addChip);
    ft.parentNode.parentNode.insertBefore(chipRow, ft.parentNode.nextSibling);
    window.PLITE_PAINT_SIZES = paintChips; paintChips();
  })();

  // kataloqda rast gəlinən, standart siyahıda olmayan ölçüləri (məs. 80×80) də düymələrə və filtrə əlavə et
  function registerSize(c) {
    if (!c || SIZE_KEYS.indexOf(c) >= 0) return;
    SIZE_KEYS.push(c); SIZE_LABEL[c] = c.split('x').reverse().join('×');
    addChip(c);
    if (fSel.size) { var o = document.createElement('option'); o.value = c; o.textContent = prettySize(c); fSel.size.insertBefore(o, fSel.size.lastChild); }
    paintChips();
  }

  // kamerada ölçü siyahısında da 120×60 yazılsın
  (function relabelCam() {
    var sz = $('tsz'); if (!sz || !sz.options) return;
    for (var i = 0; i < sz.options.length; i++) if (sz.options[i].value === '60x120') sz.options[i].textContent = '120×60 sm';
  })();

  // kamera: "Ölçü filtri" düyməsi (yalnız axtarış kamerasında görünür)
  var sizeBtn = null;
  (function buildCamBtn() {
    var sz = $('tsz'); if (!sz) return;
    sizeBtn = document.createElement('button');
    sizeBtn.className = 'btn alt';
    sizeBtn.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:.9rem;color:#fff;border-color:#fff';
    function txt() { sizeBtn.textContent = sizeOnly() ? 'Ölçü filtri: açıq' : 'Ölçü filtri: bağlı'; }
    sizeBtn.onclick = function () { try { localStorage.setItem('plite_sizeonly', sizeOnly() ? '0' : '1'); } catch (e) {} txt(); };
    txt(); sizeBtn.hidden = true;
    sz.parentNode.appendChild(sizeBtn);
  })();

  var origOpen = window.openCamFor;
  if (typeof origOpen === 'function') {
    window.openCamFor = function (mode) {
      window.PLITE_CAT_SESSION = (mode === 'catalog') && !window.PLITE_LABEL_FOR_SEARCH;
      var r = origOpen.apply(this, arguments);
      if (sizeBtn) sizeBtn.hidden = !(mode === 'search');
      return r;
    };
  }
  ['ccx'].forEach(function (id) { var e = $(id); if (e) e.addEventListener('click', function () { window.PLITE_CAT_SESSION = false; }); });
  var addIn = $('add'); if (addIn) addIn.addEventListener('change', function () { window.PLITE_CAT_SESSION = false; window.PLITE_LAST_SEARCH_SIZE = null; }, true);
  var pickIn = $('pick'); if (pickIn) pickIn.addEventListener('change', function () { window.PLITE_FROM_FILE = true; }, true);

  function effectiveSizes(fromCam) {
    if (window.PLITE_ALL_SIZES) return null;
    if (selSizes.size) return Array.from(selSizes);
    if (fromCam && sizeOnly() && $('tsz')) { var c = canon($('tsz').value); return c ? [c] : null; }
    return null;
  }
  function sizeLabels(list) { return list.map(prettySize).join(', '); }

  /* ================= Axtarış (çalar / tekstura / ölçü ilə) ================= */
  function penalty(q, it) {
    if (!q || !it || !it.shade || !it.tex) return 0;
    var wc = P('W_COLOR', 0.01), wt = P('W_TEX', 0.02), wl = P('W_TONE', 0.01);
    var dab = Math.hypot(q.shade.a - it.shade.a, q.shade.b - it.shade.b), dl = Math.abs(q.shade.L - it.shade.L);
    return wc * Math.max(0, dab - 2) / 10 + wt * (q.tex.kind !== it.tex.kind ? 1 : 0) + wl * dl / 10;
  }
  window.PLITE_PENALTY = penalty;

  function el(tag, cls, text, css) {
    var e = document.createElement(tag);
    if (cls) e.className = cls; if (text != null) e.textContent = text; if (css) e.style.cssText = css; return e;
  }
  function allSizesBtn(rs, nx) {
    var b = el('button', 'btn alt', 'Bütün ölçülərdə axtar', 'padding:8px;font-size:.9rem;margin:0 0 10px');
    b.onclick = function () {
      if (!lastQ) return;
      lastQ.toBlob(function (bl) { window.PLITE_ALL_SIZES = true; window.search(new File([bl], 'q.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', .92);
    };
    return b;
  }

  window.search = async function (file) {
    if (!file) return;
    var fromCam = !window.PLITE_FROM_FILE; window.PLITE_FROM_FILE = false;
    var forced = !!window.PLITE_ALL_SIZES;
    var sizes = effectiveSizes(fromCam); window.PLITE_ALL_SIZES = false;
    window.PLITE_CAT_SESSION = false;
    window.PLITE_LAST_SEARCH_SIZE = sizes && sizes.length === 1 ? sizes[0] : null;

    var out = $('out'), rs = $('rs'); out.hidden = false; rs.innerHTML = ''; $('qs').textContent = 'Axtarılır...';
    try {
      var pool = (await window.all()).filter(function (x) { return x.v2 && (!$('ft').value || x.type === $('ft').value); });
      var items = sizes ? pool.filter(function (x) { var c = canon(x.size); return !c || sizes.indexOf(c) >= 0; }) : pool;
      var img = await load(file), c = squareCanvas(img, 320); lastQ = c; $('qi').src = c.toDataURL('image/jpeg', .8);
      if (!items.length) {
        $('qs').textContent = '';
        rs.innerHTML = '<p class="msg">' + (pool.length ? sizeLabels(sizes) + ' ölçüsündə model yoxdur.' : 'Kataloq boşdur. Əvvəlcə şəkil əlavə et.') + '</p>';
        if (pool.length && sizes) rs.appendChild(allSizesBtn(rs));
        return;
      }
      var qf = [0, 1, 2, 3].map(function (r) { return feat(c, r); });
      var qe = []; for (var r0 = 0; r0 < 4; r0++) qe.push([await dino(c, r0, CROPS[0]), await dino(c, r0, CROPS[1])]);
      var qT = null; try { qT = tagsFromCanvas(c); } catch (e) {}

      var best = new Map();
      items.forEach(function (it) {
        var s = -1, bd = 0, bc = 0, bo = 0;
        for (var r = 0; r < 4; r++) {
          var dd = -1, cc = -1;
          for (var a = 0; a < 2; a++) for (var b = 0; b < it.v2.length; b++) {
            var p = a === b ? 0 : .04, x1 = dot(qe[r][a].d, it.v2[b].d) - p, x2 = dot(qe[r][a].c, it.v2[b].c) - p;
            if (x1 > dd) dd = x1; if (x2 > cc) cc = x2;
          }
          var oo = sim(qf[r], it.f), v = W.d * dd + W.c * cc + W.o * oo;
          if (v > s) { s = v; bd = dd; bc = cc; bo = oo; }
        }
        s -= penalty(qT, it);
        var key = it.type + '|' + it.name, cur = best.get(key);
        if (!cur) best.set(key, { it: it, s: s, n: 1, d: bd, c: bc, o: bo });
        else { cur.n++; if (s > cur.s) { cur.it = it; cur.s = s; cur.d = bd; cur.c = bc; cur.o = bo; } }
      });
      var sc = Array.from(best.values()).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
      var info = best.size + ' model tapıldı';
      if (qT) info += ' · çalar: ' + qT.shade.name + ' (' + qT.shade.tone + ') · tekstura: ' + qT.tex.kind;
      if (sizes) info += ' · ölçü: ' + sizeLabels(sizes);
      $('qs').textContent = info;

      var nx = el('button', 'btn alt', 'Növbəti şəkli çək', 'padding:8px;font-size:.9rem;margin:0 0 10px');
      nx.onclick = function () { openCamFor('search'); }; rs.append(nx);
      if (sizes && !forced) rs.append(allSizesBtn(rs, nx));

      sc.forEach(function (r, i) {
        var d = el('div', 'res' + (i === 0 ? ' top' : ''));
        var im = new Image(); im.src = r.it.thumb; im.alt = r.it.name; im.style.cursor = 'pointer'; im.onclick = function () { openLightbox(r.it.thumb); };
        var t = el('div'); t.appendChild(el('b', null, r.it.name));
        t.appendChild(el('span', 'tag', (r.it.type === 'kafel' ? 'Kafel' : 'Metlax') + ' · ' + r.n + ' şəkil'));
        t.insertAdjacentHTML('beforeend', whyHtml(r.d, r.c, r.o));
        var tl = tagLine(r.it); if (tl) t.appendChild(el('div', 'why', tl));
        var ok = el('button', 'btn alt', 'Düzgündür, əlavə et', 'padding:8px;font-size:.9rem;margin-top:8px');
        ok.onclick = function () { addQuery(r.it.name, r.it.type, ok); };
        t.appendChild(ok);
        d.appendChild(im); d.appendChild(t); d.appendChild(el('div', 'pct', Math.round(r.s * 100) + '%'));
        rs.append(d);
      });
      pushHist(c, sc);
      var names = Array.from(best.values()).map(function (v) { return v.it; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      var w = el('div', 'row', null, 'margin-top:12px;padding-top:12px;border-top:1px solid var(--line)');
      var lb = el('span', 'msg', 'Başqadırsa:', 'margin:0');
      var selx = document.createElement('select');
      names.forEach(function (n, i) { var o = document.createElement('option'); o.value = i; o.textContent = n.name + ' (' + (n.type === 'kafel' ? 'Kafel' : 'Metlax') + ')'; selx.appendChild(o); });
      var bt = el('button', 'btn alt', 'Bu modelə əlavə et', 'width:auto;margin:0;padding:8px 14px;font-size:.9rem');
      bt.onclick = function () { var n = names[selx.value]; addQuery(n.name, n.type, bt); };
      w.appendChild(lb); w.appendChild(selx); w.appendChild(bt); rs.append(w);
    } catch (e) { $('qs').textContent = ''; rs.innerHTML = '<p class="msg">Xəta: ' + e.message + '</p>'; }
  };

  /* ================= Kataloq: çalar / tekstura / ölçü filtrləri + etiketlər ================= */
  var SHADES = ['qara', 'boz', 'ağ', 'krem', 'bej', 'qəhvəyi', 'yaşıl', 'göy', 'qırmızı', 'çəhrayı'];
  var TEXS = ['düz', 'damarlı', 'naxışlı'];
  var TONES = ['açıq', 'orta', 'tünd'];
  var fSel = {};
  (function buildCatalogFilters() {
    var cq = $('cq'); if (!cq) return;
    var row = document.createElement('div'); row.className = 'row'; row.style.cssText = 'margin-top:10px';
    function mk(key, label, opts) {
      var s = document.createElement('select'); s.title = label;
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = label + ': hamısı'; s.appendChild(o0);
      opts.forEach(function (o) { var e = document.createElement('option'); e.value = o[0]; e.textContent = o[1]; s.appendChild(e); });
      s.onchange = function () { if (typeof render === 'function') render(); };
      fSel[key] = s; row.appendChild(s);
    }
    mk('shade', 'Çalar', SHADES.map(function (x) { return [x, x]; }));
    mk('tone', 'Ton', TONES.map(function (x) { return [x, x]; }));
    mk('tex', 'Tekstura', TEXS.map(function (x) { return [x, x]; }));
    mk('size', 'Ölçü', SIZE_KEYS.map(function (k) { return [k, SIZE_LABEL[k]]; }).concat([['none', 'ölçüsü yoxdur']]));
    var base = cq.parentNode; base.parentNode.insertBefore(row, base.nextSibling);
  })();
  function passCat(it) {
    var f = fSel; if (!f.shade) return true;
    if (f.shade.value && !(it.shade && it.shade.name === f.shade.value)) return false;
    if (f.tone.value && !(it.shade && it.shade.tone === f.tone.value)) return false;
    if (f.tex.value && !(it.tex && it.tex.kind === f.tex.value)) return false;
    if (f.size.value) {
      var c = canon(it.size);
      if (f.size.value === 'none') { if (c) return false; } else if (c !== f.size.value) return false;
    }
    return true;
  }
  function anyCatFilter() { return !!(fSel.shade && (fSel.shade.value || fSel.tone.value || fSel.tex.value || fSel.size.value)); }

  var origRender = window.render;
  if (typeof origRender === 'function') {
    window.render = async function () {
      var oa = window.all, filtered = anyCatFilter();
      if (filtered) window.all = async function () { return (await oa()).filter(passCat); };
      try { await origRender.apply(this, arguments); } finally { window.all = oa; }
      try { await decorate(oa); } catch (e) {}
    };
  }
  async function decorate(oa) {
    var q = ($('cq').value || '').trim().toLowerCase(), tf = $('cf').value;
    var every = await oa();
    every.forEach(function (it) { registerSize(canon(it.size)); });
    var vis = every.filter(passCat).filter(function (it) { return (!tf || it.type === tf) && (!q || it.name.toLowerCase().includes(q)); });
    var cards = document.querySelectorAll('#list .it');
    if (cards.length !== vis.length) return;
    cards.forEach(function (card, i) {
      var old = card.querySelector('.ptag'); if (old) old.remove();
      var tl = tagLine(vis[i]); if (!tl) return;
      var d = document.createElement('div'); d.className = 'why ptag'; d.style.cssText = 'padding:0 8px 6px'; d.textContent = tl;
      card.appendChild(d);
    });
  }
})();
