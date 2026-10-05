// frame-fix.js (v4 — hamısı bir faylda)
// 1) Düzgün nisbətli çərçivə + şaquli/üfüqi düyməsi
// 2) Maqnit: kafelin 4 kənarını tapır, yaşıl xətt çəkir, şəkli kafelə kəsir
// 3) Avtomatik çəkiliş: yaşıl + sabit olanda özü çəkir (Avto düyməsi ilə söndürülür)
// 4) Parıltı xəbərdarlığı
// 5) Səviyyə göstəricisi (telefonun bucağı, sensor varsa)
// 6) Avtomatik istiqamət: kafel digər istiqamətdə düz oturursa özü dəyişir
// 7) Fənər düyməsi (telefon dəstəkləyirsə)
// 8) Zoom sürüşdürücüsü (telefon dəstəkləyirsə)
// 9) Çərçivədə köməkçi xətlər (üçdə bir + mərkəz)
// 10) Yaşıl yananda və çəkəndə titrəmə (icazə varsa)
//
// QURAŞDIRMA: repoda frame-fix.js-in üzərinə yaz (app/src/main/assets/).
// index.html-də dəyişiklik lazım deyil.

(function () {
  var SZ = document.getElementById('tsz');
  var FR = document.getElementById('fr');
  var CS = document.getElementById('cs');
  var V = document.getElementById('cv');
  if (!SZ || !FR || !CS || !V) return;

  var CFG = window.PLITE_CFG || {};
  function cfg(k, d) { return CFG[k] != null ? CFG[k] : d; }
  var MIN_S = cfg('MIN_S', 6);        // kənarın minimal gücü (az = həssas)
  var RANGE = cfg('RANGE', 0.15);     // maqnit məsafəsi (çərçivə tərəfinin faizi)
  var INSET = cfg('INSET', 0.01);     // fuqa xəttini kənarda saxlamaq üçün kəsmə payı
  var GLARE = cfg('GLARE', 0.01);     // parlaq piksellərin payı bundan çoxdursa -> parıltı xəbərdarlığı
  var TILT_MAX = cfg('TILT_MAX', 12);    // dərəcə: bundan çox əyridirsə -> xəbərdarlıq, avto-çəkiliş gözləyir
  var STABLE = cfg('STABLE', 2);       // avto-çəkiliş üçün ardıcıl uğurlu yoxlama sayı (~0.6 san. hər biri)
  var COOLDOWN = cfg('COOLDOWN', 2500);  // ms: iki avto-çəkiliş arası minimum fasilə

  // Rejimə (kataloq/axtarış) və kataloqda şəklin sırasına görə parametrləri hər dəfə yenidən oxu (plite-config.js profilləri)
  var D = { MIN_S: MIN_S, RANGE: RANGE, INSET: INSET, GLARE: GLARE, TILT_MAX: TILT_MAX, STABLE: STABLE, COOLDOWN: COOLDOWN };
  function refreshParams() {
    var P = window.PLITE_P; if (!P) return;
    MIN_S = P('MIN_S', D.MIN_S); RANGE = P('RANGE', D.RANGE); INSET = P('INSET', D.INSET);
    GLARE = P('GLARE', D.GLARE); TILT_MAX = P('TILT_MAX', D.TILT_MAX);
    STABLE = P('STABLE', D.STABLE); COOLDOWN = P('COOLDOWN', D.COOLDOWN);
  }

  function vib(ms) {
    try { if (window.PLITE_P && window.PLITE_P('VIBRATE', true) === false) return; if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }
  function ratio() { return typeof getRatio === 'function' ? getRatio() : 1; }
  function msg(t) { var ce = document.getElementById('ce'); if (ce) ce.textContent = t; }

  /* ---------- Ölçü / istiqamət ---------- */
  function key() { return 'plite_ori_' + SZ.value; }
  function getOri() { try { return localStorage.getItem(key()) || 'p'; } catch (e) { return 'p'; } }
  function setOri(v) { try { localStorage.setItem(key(), v); } catch (e) {} }
  function getAuto() { try { var v = localStorage.getItem('plite_auto'); return v == null ? (window.PLITE_P ? window.PLITE_P('AUTO_DEFAULT', true) : cfg('AUTO_DEFAULT', true)) !== false : v !== '0'; } catch (e) { return true; } }
  function setAuto(on) { try { localStorage.setItem('plite_auto', on ? '1' : '0'); } catch (e) {} }

  function computeFrame(cw, ch, r, ori) {
    cw *= 0.92; ch *= 0.92;
    if (r >= 0.999) { var s = Math.min(cw, ch); return { w: s, h: s }; }
    if (ori === 'l') {
      var w = cw, h = w * r;
      if (h > ch) { h = ch; w = h / r; }
      return { w: w, h: h };
    }
    var h2 = ch, w2 = h2 * r;
    if (w2 > cw) { w2 = cw; h2 = w2 / r; }
    return { w: w2, h: h2 };
  }
  window.frameSize = function (cw, ch, r) { return computeFrame(cw, ch, r, getOri()); };

  /* ---------- Elementlər ---------- */
  var wrap = FR.parentNode;
  var row = SZ.parentNode;

  // köməkçi xətlər (üçdə bir + mərkəz xaç)
  var guides = document.createElement('div');
  guides.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none';
  guides.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:100%">' +
    '<path d="M33.3 0V100M66.6 0V100M0 33.3H100M0 66.6H100" stroke="rgba(255,255,255,.3)" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/>' +
    '<path d="M47 50H53M50 47V53" stroke="#fff" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  FR.appendChild(guides);

  var lab = document.createElement('div');
  lab.style.cssText = 'position:absolute;left:6px;right:6px;bottom:4px;color:#fff;font-size:.75rem;font-weight:700;text-shadow:0 1px 3px #000;line-height:1.3';
  FR.appendChild(lab);

  var mg = document.createElement('div');
  mg.style.cssText = 'position:absolute;border:3px solid #2ecc71;box-sizing:border-box;pointer-events:none;display:none;border-radius:3px';
  wrap.appendChild(mg);

  var lvl = document.createElement('div');
  lvl.style.cssText = 'position:absolute;left:6px;top:6px;padding:2px 8px;border-radius:99px;background:rgba(0,0,0,.55);color:#fff;font-size:.75rem;font-weight:700;display:none;pointer-events:none';
  wrap.appendChild(lvl);

  var BTN = 'width:auto;margin:0;padding:8px 12px;font-size:.9rem;color:#fff;border-color:#fff';
  function mkBtn(txt) {
    var x = document.createElement('button');
    x.className = 'btn alt'; x.style.cssText = BTN; x.textContent = txt; row.appendChild(x); return x;
  }
  var b = mkBtn('');     // şaquli / üfüqi
  var ab = mkBtn('');    // avto-çəkiliş
  var tb = mkBtn('🔦'); tb.hidden = true; // fənər

  // zoom sırası
  var zr = document.createElement('div');
  zr.className = 'row'; zr.style.cssText = 'width:100%;max-width:420px;gap:10px;align-items:center'; zr.hidden = true;
  var zs = document.createElement('input');
  zs.type = 'range'; zs.style.cssText = 'flex:1;min-width:120px';
  var zl = document.createElement('span'); zl.style.cssText = 'color:#fff;font-size:.85rem;min-width:44px';
  var zi = document.createElement('span'); zi.textContent = '🔍'; zi.style.color = '#fff';
  zr.appendChild(zi); zr.appendChild(zs); zr.appendChild(zl);
  row.parentNode.insertBefore(zr, row.nextSibling);

  var baseLabel = '';
  function sync() {
    var p = SZ.value.split('x');
    b.hidden = p[0] === p[1];
    b.textContent = getOri() === 'l' ? '▭ Üfüqi' : '▯ Şaquli';
    ab.textContent = getAuto() ? 'Avto: açıq' : 'Avto: bağlı';
    var o = SZ.options[SZ.selectedIndex];
    baseLabel = (o ? o.textContent : '') + (b.hidden ? '' : (getOri() === 'l' ? ' · üfüqi' : ' · şaquli'));
    lab.textContent = baseLabel;
    mg.style.display = 'none';
    if (typeof placeFrame === 'function') placeFrame();
  }
  b.onclick = function () { setOri(getOri() === 'l' ? 'p' : 'l'); sync(); };
  ab.onclick = function () { setAuto(!getAuto()); sync(); };
  SZ.addEventListener('change', sync);
  sync();

  /* ---------- Səviyyə (telefonun bucağı) ---------- */
  var lastBeta = null, lastGamma = null, lastT = 0;
  window.addEventListener('deviceorientation', function (e) {
    if (e.beta == null || e.gamma == null) return;
    lastBeta = e.beta; lastGamma = e.gamma; lastT = Date.now();
  });
  function tilt() { // yerə paralel (0°) və ya şaquli divar (90°) vəziyyətindən sapma
    if (lastBeta == null || Date.now() - lastT > 2000) return null;
    return Math.min(Math.hypot(lastBeta, lastGamma), Math.hypot(lastBeta - 90, lastGamma));
  }
  function showLevel(tl) {
    if (tl == null) { lvl.style.display = 'none'; return; }
    lvl.style.display = 'block';
    lvl.textContent = '⌀ ' + Math.round(tl) + '°';
    lvl.style.background = tl <= 6 ? 'rgba(46,204,113,.85)' : tl <= TILT_MAX ? 'rgba(243,156,18,.85)' : 'rgba(231,76,60,.85)';
  }

  /* ---------- Fənər və zoom ---------- */
  var torchOn = false;
  function track() { var s = V.srcObject; return s && s.getVideoTracks ? s.getVideoTracks()[0] : null; }
  var armed = true, readyCount = 0, altCount = 0, lastShot = 0, prevOk = false;

  function setupTrack() {
    armed = true; readyCount = 0; altCount = 0; lastShot = 0; prevOk = false; torchOn = false; prevM = null;
    tb.style.background = ''; tb.style.color = '#fff';
    var t = track();
    if (!t || !t.getCapabilities) { tb.hidden = true; zr.hidden = true; return; }
    var caps = {}; try { caps = t.getCapabilities() || {}; } catch (e) {}
    tb.hidden = !caps.torch;
    if (caps.zoom) {
      zs.min = caps.zoom.min; zs.max = caps.zoom.max; zs.step = caps.zoom.step || 0.1;
      var cur = (t.getSettings && t.getSettings().zoom) || caps.zoom.min;
      zs.value = cur; zl.textContent = '×' + (+cur).toFixed(1); zr.hidden = false;
    } else zr.hidden = true;
  }
  V.addEventListener('playing', setupTrack);
  V.addEventListener('loadedmetadata', setupTrack);

  tb.onclick = async function () {
    var t = track(); if (!t) return;
    try {
      torchOn = !torchOn;
      await t.applyConstraints({ advanced: [{ torch: torchOn }] });
      tb.style.background = torchOn ? '#f1c40f' : ''; tb.style.color = torchOn ? '#222' : '#fff';
    } catch (e) { torchOn = false; tb.hidden = true; msg('Fənər bu telefonda dəstəklənmir.'); }
  };
  zs.oninput = function () {
    var t = track(); if (!t) return;
    zl.textContent = '×' + (+zs.value).toFixed(1);
    try { t.applyConstraints({ advanced: [{ zoom: +zs.value }] }).catch(function () {}); } catch (e) {}
  };

  /* ---------- Tərpənmə (iki yoxlama arası kadr fərqi) ---------- */
  var mcv = document.createElement('canvas'); mcv.width = 32; mcv.height = 24;
  var mctx = mcv.getContext('2d', { willReadFrequently: true }), prevM = null;
  function motion() {
    mctx.drawImage(V, 0, 0, 32, 24);
    var d = mctx.getImageData(0, 0, 32, 24).data, g = new Float32Array(768), i, diff = 0;
    for (i = 0; i < 768; i++) g[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2];
    if (prevM) { for (i = 0; i < 768; i++) diff += Math.abs(g[i] - prevM[i]); diff /= 768; }
    prevM = g;
    return diff;
  }

  /* ---------- Kənar tapma ("maqnit") ---------- */
  var cvs = document.createElement('canvas'), ctx = cvs.getContext('2d', { willReadFrequently: true });

  function snap(v, ori) {
    var cw = v.clientWidth, ch = v.clientHeight;
    if (!v.videoWidth || !cw || !ch) return null;
    var f = computeFrame(cw, ch, ratio(), ori || getOri());
    var W = 320, H = Math.round(W * ch / cw), k = W / cw;
    cvs.width = W; cvs.height = H;
    ctx.drawImage(v, 0, 0, W, H);
    var d = ctx.getImageData(0, 0, W, H).data, Y = new Float32Array(W * H);
    for (var i = 0; i < W * H; i++) Y[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2];

    var FW = f.w * k, FH = f.h * k, L = (W - FW) / 2, T = (H - FH) / 2, R = L + FW, B = T + FH;

    function sx(x, y0, y1) {
      x = Math.round(x); if (x < 4 || x > W - 5) return -1;
      var s = 0, rg = 0, n = 0;
      for (var y = Math.round(y0); y <= y1; y += 2) {
        var o = y * W, a = Y[o + x - 3], c = Y[o + x], e = Y[o + x + 3];
        s += e - a; rg += 2 * c - a - e; n++;
      }
      return n ? Math.max(Math.abs(s / n), Math.abs(rg / n) / 2) : -1;
    }
    function sy(y, x0, x1) {
      y = Math.round(y); if (y < 4 || y > H - 5) return -1;
      var s = 0, rg = 0, n = 0;
      for (var x = Math.round(x0); x <= x1; x += 2) {
        var a = Y[(y - 3) * W + x], c = Y[y * W + x], e = Y[(y + 3) * W + x];
        s += e - a; rg += 2 * c - a - e; n++;
      }
      return n ? Math.max(Math.abs(s / n), Math.abs(rg / n) / 2) : -1;
    }
    function best(fn, c, range) {
      var bp = null, bs = 0;
      for (var p = Math.round(c - range); p <= Math.round(c + range); p++) {
        var s = fn(p); if (s > bs) { bs = s; bp = p; }
      }
      return bs >= MIN_S ? bp : null;
    }
    var y0 = T + .15 * FH, y1 = B - .15 * FH, x0 = L + .15 * FW, x1 = R - .15 * FW;
    var l = best(function (x) { return sx(x, y0, y1); }, L, RANGE * FW);
    var r = best(function (x) { return sx(x, y0, y1); }, R, RANGE * FW);
    var t = best(function (y) { return sy(y, x0, x1); }, T, RANGE * FH);
    var bt = best(function (y) { return sy(y, x0, x1); }, B, RANGE * FH);

    var n = (l != null) + (r != null) + (t != null) + (bt != null);
    var rl = l != null ? l : L, rr = r != null ? r : R, rt = t != null ? t : T, rb = bt != null ? bt : B;
    var ok = n === 4 && (rr - rl) > .6 * FW && (rb - rt) > .6 * FH &&
      Math.abs(((rr - rl) / (rb - rt)) / (FW / FH) - 1) < .15;

    // parıltı: çərçivə daxilində demək olar ki, ağ (yanmış) piksellərin payı
    var gl = 0, tot = 0;
    for (var yy = Math.max(0, Math.round(T)); yy < Math.min(H, Math.round(B)); yy += 3)
      for (var xx = Math.max(0, Math.round(L)); xx < Math.min(W, Math.round(R)); xx += 3) {
        if (Y[yy * W + xx] >= 245) gl++; tot++;
      }
    return { l: rl, t: rt, r: rr, b: rb, W: W, H: H, k: k, n: n, ok: ok, glare: tot ? gl / tot : 0 };
  }

  function setState(color, text, ok) {
    FR.style.borderColor = color;
    lab.textContent = baseLabel + (text ? ' · ' + text : '');
    if (ok) { CS.style.background = '#2ecc71'; CS.style.color = '#04210f'; }
    else { CS.style.background = ''; CS.style.color = ''; }
  }

  function check() {
    var cm = document.getElementById('cm');
    if (!cm || cm.hidden || document.hidden) return;
    if (window.PLITE_LABEL_PHASE) return; // etiket şəkli çəkilərkən ramka/avto-çəkiliş işləmir
    refreshParams();
    var s = snap(V); if (!s) return;
    var tl = tilt(); showLevel(tl);

    var warn = [];
    if (s.glare > GLARE) warn.push('parıltı var, bucağı dəyiş');
    if (tl != null && tl > TILT_MAX) warn.push('telefonu düz tut');
    var mo = motion();
    if (mo > (window.PLITE_P ? window.PLITE_P('MOTION_MAX', 10) : 10)) warn.push('tərpənmə var, sabit saxla');

    // avtomatik istiqamət: digər istiqamətdə düz oturursa dəyiş
    if (!s.ok && s.n < 4 && ratio() < 0.999) {
      var alt = getOri() === 'l' ? 'p' : 'l', s2 = snap(V, alt);
      if (s2 && s2.ok) {
        altCount++;
        if (altCount >= 2) { altCount = 0; setOri(alt); sync(); lab.textContent = baseLabel + ' · istiqamət dəyişdi'; return; }
      } else altCount = 0;
    } else altCount = 0;

    if (s.ok) {
      mg.style.display = 'block';
      mg.style.left = (s.l / s.k) + 'px'; mg.style.top = (s.t / s.k) + 'px';
      mg.style.width = ((s.r - s.l) / s.k) + 'px'; mg.style.height = ((s.b - s.t) / s.k) + 'px';
      if (!prevOk) vib(40);
      var ready = !warn.length;
      readyCount = ready ? readyCount + 1 : 0;
      var txt = '✓ Tutuldu';
      if (warn.length) txt += ' · ' + warn.join(', ');
      else if (getAuto() && armed) txt += ' · sabit saxla (' + Math.min(readyCount, STABLE) + '/' + STABLE + ')';
      setState('#2ecc71', txt, true);
      prevOk = true;
      if (getAuto() && armed && readyCount >= STABLE && Date.now() - lastShot > COOLDOWN) {
        armed = false; lastShot = Date.now(); readyCount = 0;
        capture();
      }
    } else {
      mg.style.display = 'none';
      prevOk = false; readyCount = 0; armed = true;
      var t0 = s.n >= 2 ? 'kənarlar tam tapılmadı (' + s.n + '/4)' : 'kafeli çərçivəyə yaxınlaşdır';
      if (warn.length) t0 += ' · ' + warn.join(', ');
      setState(s.n >= 2 ? '#f39c12' : '#e74c3c', t0, false);
    }
  }

  var orig = window.analyze;
  if (typeof orig === 'function') {
    window.analyze = function () {
      orig.apply(this, arguments);
      try { check(); } catch (e) {}
    };
  }

  /* ---------- Çəkiliş: tapılan kafelə kəs ---------- */
  function drawRect(v, sx0, sy0, sw, sh, out) {
    var c = document.createElement('canvas'); c.width = c.height = out;
    var x = c.getContext('2d'); x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, out, out);
    var sc = Math.min(out / sw, out / sh), dw = sw * sc, dh = sh * sc;
    x.drawImage(v, sx0, sy0, sw, sh, (out - dw) / 2, (out - dh) / 2, dw, dh);
    return c;
  }

  function capture() {
    if (!V.videoWidth) return;
    refreshParams();
    var vw = V.videoWidth, vh = V.videoHeight, c = null, s = null, rc = null;
    try { s = snap(V); } catch (e) {}
    if (s && s.ok) {
      var sw = (s.r - s.l) * vw / s.W, sh = (s.b - s.t) * vh / s.H;
      rc = [s.l * vw / s.W + sw * INSET, s.t * vh / s.H + sh * INSET, sw * (1 - 2 * INSET), sh * (1 - 2 * INSET)];
    } else {
      var cr = videoCropRect(V, 1);
      rc = [(vw - cr.w) / 2, (vh - cr.h) / 2, cr.w, cr.h];
    }
    c = drawRect(V, rc[0], rc[1], rc[2], rc[3], 320);
    try { if (window.PLITE_POST) window.PLITE_POST(c); } catch (e) {} // çox qaranlıq/işıqlı şəkli proqramla düzəlt
    vib(80);
    if (camMode === 'catalog') {
      // etiket (stiker) oxumaq üçün yüksək ayırdetməli nüsxə
      try {
        var sc = Math.min(1, 1200 / Math.max(rc[2], rc[3])), hi = document.createElement('canvas');
        hi.width = Math.round(rc[2] * sc); hi.height = Math.round(rc[3] * sc);
        hi.getContext('2d').drawImage(V, rc[0], rc[1], rc[2], rc[3], 0, 0, hi.width, hi.height);
        c._hi = hi;
      } catch (e) {}
      catalogShots.push(c); renderShots();
      if (catalogShots.length === 1 && window.PLITE_PREOCR && !window.PLITE_LABEL_SHOT) window.PLITE_PREOCR(c);
      if (catalogShots.length >= (window.PLITE_MAX_SHOTS || 6)) finishCatalogCapture();
      return;
    }
    c.toBlob(function (bl) { closeCam(); search(new File([bl], 'kamera.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', .92);
  }
  CS.onclick = capture;
  var lv = document.getElementById('lv'); if (lv) lv.onclick = capture;
})();
