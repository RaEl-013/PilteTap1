// label-shot.js — etiket (stiker) şəkli: kataloq üçün ad oxuma + axtarışı etiketlə dəqiqləşdirmə
//
// 1) KATALOQ: kamera açılanda əvvəlcə "Etiket" addımı gəlir. Stikeri yaxından çək. Şəkil kataloqa düşmür,
//    yalnız yazını oxumaq üçündür. Oxunan ad "Model adı" xanasına avtomatik yazılır. "Etiketi keç" düyməsi var.
// 2) AXTARIŞ: nəticələrin üstündə "🏷 Etiketlə dəqiqləşdir" düyməsi çıxır. Nəticələr bir-birinə yaxındırsa
//    (1-ci və 2-ci faiz fərqi AMBIG_MARGIN-dən azdırsa) xəbərdarlıq da yazılır. Etiketdən oxunan ad kataloqdakı
//    adlarla müqayisə olunur və uyğun model nəticənin ən üstünə qoyulur.
//
// QURAŞDIRMA: app/src/main/assets/ içinə at, index.html-də ƏN SONDA (sticker-ocr.js-dən sonra):
//     <script src="label-shot.js"></script>

(function () {
  var CFG = window.PLITE_CFG || {};
  if (CFG.LABEL_PHASE === false) return;
  var MAXS = CFG.LABEL_MAX_SIDE || 1600;
  var AMBIG = CFG.AMBIG_MARGIN != null ? CFG.AMBIG_MARGIN : 7;

  function $(id) { return document.getElementById(id); }
  var V = $('cv'), CM = $('cm'), CS = $('cs'), FR = $('fr'), info = $('csinfo'), ce = $('ce'), done = $('csdone');
  if (!V || !CM || !CS || !FR || !info) return;
  var wrap = FR.parentNode, saved = [];

  var skip = document.createElement('button');
  skip.className = 'btn alt';
  skip.style.cssText = 'width:auto;margin:0;padding:12px 16px;color:#fff;border-color:#fff';
  skip.textContent = 'Etiketi keç';
  skip.hidden = true;
  CS.parentNode.insertBefore(skip, CS.nextSibling);

  function forSearch() { return !!window.PLITE_LABEL_FOR_SEARCH; }

  function hideOverlays() {
    saved = [];
    for (var i = 0; i < wrap.children.length; i++) {
      var c = wrap.children[i];
      if (c !== V) { saved.push([c, c.style.display]); c.style.display = 'none'; }
    }
  }
  function restoreOverlays() {
    saved.forEach(function (p) { p[0].style.display = p[1]; });
    saved = [];
  }
  function ui() {
    CS.textContent = '🏷 Etiketi çək';
    CS.style.background = ''; CS.style.color = '';
    info.hidden = false;
    info.textContent = forSearch()
      ? 'Etiket: stikeri yaxından çək, ad oxunub axtarışı dəqiqləşdirəcək.'
      : 'Etiket: stikeri (kod yazısını) yaxından çək. Düz, parıltısız, yazı ekranı doldursun.';
    skip.textContent = forSearch() ? 'Ləğv et' : 'Etiketi keç';
    if (done) done.hidden = true;
  }

  function startLabelPhase() {
    window.PLITE_LABEL_PHASE = true;
    if (!forSearch()) { window.PLITE_LABEL_SHOT = null; window.PLITE_LABEL_RESULT = null; }
    hideOverlays();
    skip.hidden = false;
    ui();
  }
  function endLabelPhase() {
    if (!window.PLITE_LABEL_PHASE) return;
    window.PLITE_LABEL_PHASE = false;
    restoreOverlays();
    skip.hidden = true;
    CS.textContent = 'Çək';
    var cat = typeof camMode !== 'undefined' && camMode === 'catalog';
    if (done && cat) done.hidden = false;
    if (!CM.hidden && cat && typeof renderShots === 'function') renderShots();
  }

  /* ---------- Etiket şəklini çək ---------- */
  function grab() {
    var vw = V.videoWidth, vh = V.videoHeight, sc = Math.min(1, MAXS / Math.max(vw, vh));
    var c = document.createElement('canvas');
    c.width = Math.round(vw * sc); c.height = Math.round(vh * sc);
    c.getContext('2d').drawImage(V, 0, 0, c.width, c.height);
    return c;
  }
  function captureLabel() {
    if (!V.videoWidth) return;
    var c = grab();
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
    if (forSearch()) {                       // axtarışı dəqiqləşdirmə
      window.PLITE_LABEL_FOR_SEARCH = false;
      endLabelPhase();
      if (typeof closeCam === 'function') closeCam();
      refineSearch(c);
      return;
    }
    window.PLITE_LABEL_SHOT = c;             // kataloq üçün ad oxuma
    endLabelPhase();
    if (ce) ce.textContent = 'Etiket oxunur...';
    var p = null;
    try { p = window.PLITE_PREOCR ? window.PLITE_PREOCR(c) : null; } catch (e) {}
    window.PLITE_LABEL_RESULT = p;
    if (p && p.then) {
      p.then(function (r) {
        if (ce && !CM.hidden) ce.textContent = r && r.name ? 'Etiketdən oxundu: ' + r.name : 'Etiket oxunmadı (ad əl ilə yazıla bilər).';
      }, function () { if (ce && !CM.hidden) ce.textContent = 'Etiket oxunmadı (ad əl ilə yazıla bilər).'; });
    } else if (ce) ce.textContent = '';
  }

  /* ---------- Ad müqayisəsi (OCR xətalarına dözümlü) ---------- */
  function norm(s) {
    return String(s).toUpperCase().replace(/İ/g, 'I').replace(/Ə/g, 'E').replace(/Ş/g, 'S').replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/[^A-Z0-9]/g, '');
  }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function simil(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }
  window.PLITE_NAME_SIMIL = function (a, b) { return simil(norm(a), norm(b)); };

  function el(tag, cls, text, css) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (css) e.style.cssText = css;
    return e;
  }
  function typeName(t) { return t === 'kafel' ? 'Kafel' : 'Metlax'; }

  async function refineSearch(c) {
    var qs = $('qs'), rs = $('rs');
    if (!rs) return;
    $('out').hidden = false;
    var old = rs.querySelector('.lbl-box'); if (old) old.remove();
    var box = el('div', 'lbl-box', null, 'margin-bottom:10px;padding:10px;border:1.5px solid var(--acc);border-radius:12px');
    rs.insertBefore(box, rs.firstChild);
    box.appendChild(el('p', 'msg', 'Etiket oxunur...', 'margin:0'));
    var r = null;
    try { r = window.PLITE_PREOCR ? await window.PLITE_PREOCR(c) : null; } catch (e) {}
    box.innerHTML = '';
    function retry(text) {
      var b = el('button', 'btn alt', text || '🏷 Yenidən çək', 'padding:8px;font-size:.9rem;margin-top:8px');
      b.onclick = function () { window.PLITE_LABEL_FOR_SEARCH = true; openCamFor('search'); };
      box.appendChild(b);
    }
    if (!r || !r.name) {
      box.appendChild(el('p', 'msg', 'Etiket oxunmadı. Stikeri yaxından, düz və parıltısız çək.', 'margin:0'));
      retry();
      return;
    }
    box.appendChild(el('p', 'msg', 'Etiketdən oxundu: «' + r.name + '»', 'margin:0 0 6px;font-weight:700'));

    var items = [];
    try { items = await window.all(); } catch (e) {}
    var qList = [{ s: norm(r.name), min: 0.8 }].concat((r.cands || []).map(function (x) { return { s: norm(x), min: 0.9 }; }));
    var byKey = {};
    items.forEach(function (it) {
      var k = it.type + '|' + it.name, ns = norm(it.name), best = 0;
      qList.forEach(function (q) { var v = simil(q.s, ns); if (v >= q.min && v > best) best = v; });
      if (best > 0 && (!byKey[k] || best > byKey[k].best)) byKey[k] = { it: it, best: best };
    });
    var hits = Object.keys(byKey).map(function (k) { return byKey[k]; }).sort(function (a, b) { return b.best - a.best; }).slice(0, 3);

    if (hits.length) {
      hits.forEach(function (h, i) {
        var d = el('div', 'res' + (i === 0 ? ' top' : ''));
        var im = new Image(); im.src = h.it.thumb; im.alt = h.it.name; im.style.cursor = 'pointer';
        im.onclick = function () { if (typeof openLightbox === 'function') openLightbox(h.it.thumb); };
        var t = el('div'); t.appendChild(el('b', null, h.it.name));
        t.appendChild(el('span', 'tag', typeName(h.it.type) + ' · etiketlə uyğun'));
        var p = el('div', 'pct', Math.round(h.best * 100) + '%');
        d.appendChild(im); d.appendChild(t); d.appendChild(p); box.appendChild(d);
      });
    } else {
      box.appendChild(el('p', 'msg', 'Kataloqda bu adla model tapılmadı. Çəkdiyin şəkli bu adla əlavə edə bilərsən:', 'margin:0 0 6px'));
      var rw = el('div', 'row');
      ['kafel', 'metlax'].forEach(function (tp) {
        var b = el('button', 'btn alt', typeName(tp) + ' kimi əlavə et', 'width:auto;margin:0;padding:8px 12px;font-size:.9rem');
        b.onclick = function () { if (typeof addQuery === 'function') addQuery(r.name, tp, b); };
        rw.appendChild(b);
      });
      box.appendChild(rw);
    }
    if (qs) qs.textContent = 'Etiketlə dəqiqləşdirildi.';
  }

  /* ---------- Axtarış nəticəsində "Etiketlə dəqiqləşdir" ---------- */
  function addHint() {
    var rs = $('rs'); if (!rs) return;
    var pcts = [].slice.call(rs.querySelectorAll('.res .pct')).map(function (e) { return parseInt(e.textContent, 10) || 0; });
    if (!pcts.length) return;
    var old = rs.querySelector('.lbl-hint'); if (old) old.remove();
    var margin = pcts.length > 1 ? pcts[0] - pcts[1] : 100, close = margin < AMBIG;
    var row = el('div', 'row lbl-hint', null, 'margin:0 0 10px');
    var tx = el('span', 'msg', close
      ? 'Nəticələr bir-birinə yaxındır (' + pcts[0] + '% / ' + pcts[1] + '%). Dəqiq nəticə üçün etiketi çək.'
      : 'Əmin deyilsənsə:', 'margin:0;' + (close ? 'color:#f39c12;font-weight:700' : ''));
    var b = el('button', 'btn alt', '🏷 Etiketlə dəqiqləşdir', 'width:auto;margin:0;padding:8px 12px;font-size:.9rem');
    b.onclick = function () { window.PLITE_LABEL_FOR_SEARCH = true; openCamFor('search'); };
    row.appendChild(tx); row.appendChild(b);
    rs.insertBefore(row, rs.children[1] || null);
  }
  var origSearch = window.search;
  if (typeof origSearch === 'function') {
    window.search = async function () {
      var out = await origSearch.apply(this, arguments);
      try { addHint(); } catch (e) {}
      return out;
    };
  }

  /* ---------- Düymələr və kamera bağlantısı ---------- */
  var prevCS = CS.onclick;
  CS.onclick = function () {
    if (window.PLITE_LABEL_PHASE) return captureLabel();
    return prevCS && prevCS.apply(this, arguments);
  };
  var lv = $('lv'), prevLV = lv && lv.onclick;
  if (lv) lv.onclick = function () {
    if (window.PLITE_LABEL_PHASE) return;
    return prevLV && prevLV.apply(this, arguments);
  };
  skip.onclick = function () {
    if (forSearch()) { window.PLITE_LABEL_FOR_SEARCH = false; endLabelPhase(); if (typeof closeCam === 'function') closeCam(); }
    else endLabelPhase();
  };

  var origOpen = window.openCamFor;
  if (typeof origOpen === 'function') {
    window.openCamFor = function (mode) {
      origOpen.apply(this, arguments);
      if (mode === 'catalog' || forSearch()) startLabelPhase(); else endLabelPhase();
    };
  }

  var prevA = window.analyze;
  if (typeof prevA === 'function') {
    window.analyze = function () {
      prevA.apply(this, arguments);
      if (window.PLITE_LABEL_PHASE) ui();
    };
  }

  try {
    new MutationObserver(function () {
      if (CM.hidden) { window.PLITE_LABEL_FOR_SEARCH = false; endLabelPhase(); }
    }).observe(CM, { attributes: true, attributeFilter: ['hidden'] });
  } catch (e) {}
})();
