// frame-fix.js (v2)
// 1) Çərçivə seçilən ölçünün dəqiq nisbətində olur, istiqaməti (şaquli/üfüqi) düymə ilə seçilir.
// 2) Kafel çərçivəyə düz oturanda çərçivə YAŞIL yanır, "Çək" düyməsi də yaşıl olur.
//    Düz oturmayanda hansı tərəfin problemi olduğu çərçivənin içində yazılır.
//
// Necə yoxlayır: çərçivənin 4 tərəfinin içindəki və kənarındakı nazik zolaqların rəngini müqayisə edir.
//   - İç zolaq mərkəzlə eyni rəngdə olmalıdır (kafel çərçivənin kənarına çatır),
//   - Kənar zolaq fərqli olmalıdır (kafel çərçivədən çıxmır, arxa fon görünür).
// Qeyd: kafel arxa fonla eyni rəngdədirsə, yoxlama işləmir. Kafeli fərqli rəngli səthə qoy.
//
// QURAŞDIRMA:
//  1) Repoda köhnə frame-fix.js-in üzərinə yaz (app/src/main/assets/ içində).
//  2) index.html-də əsas <script>...</script> blokundan SONRA, </body>-dən əvvəl olmalıdır:
//       <script src="frame-fix.js"></script>

(function () {
  var SZ = document.getElementById('tsz');
  var FR = document.getElementById('fr');
  if (!SZ || !FR) return;

  function key() { return 'plite_ori_' + SZ.value; }
  function getOri() { try { return localStorage.getItem(key()) || 'p'; } catch (e) { return 'p'; } }
  function setOri(v) { try { localStorage.setItem(key(), v); } catch (e) {} }

  // index.html-dəki eyni adlı funksiyanı əvəz edir
  window.frameSize = function (cw, ch, r) {
    cw *= 0.92; ch *= 0.92;
    if (r >= 0.999) { var s = Math.min(cw, ch); return { w: s, h: s }; }
    if (getOri() === 'l') {
      var w = cw, h = w * r;
      if (h > ch) { h = ch; w = h / r; }
      return { w: w, h: h };
    }
    var h2 = ch, w2 = h2 * r;
    if (w2 > cw) { w2 = cw; h2 = w2 / r; }
    return { w: w2, h: h2 };
  };

  // Çərçivənin içində yazı
  var lab = document.createElement('div');
  lab.style.cssText = 'position:absolute;left:6px;right:6px;bottom:4px;color:#fff;font-size:.75rem;font-weight:700;text-shadow:0 1px 3px #000;line-height:1.3';
  FR.appendChild(lab);

  // Şaquli / üfüqi düyməsi
  var b = document.createElement('button');
  b.className = 'btn alt';
  b.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:.9rem;color:#fff;border-color:#fff';
  SZ.parentNode.appendChild(b);

  var baseLabel = '';
  function sync() {
    var p = SZ.value.split('x');
    b.hidden = p[0] === p[1];
    b.textContent = getOri() === 'l' ? '▭ Üfüqi' : '▯ Şaquli';
    var o = SZ.options[SZ.selectedIndex];
    baseLabel = (o ? o.textContent : '') + (b.hidden ? '' : (getOri() === 'l' ? ' · üfüqi' : ' · şaquli'));
    lab.textContent = baseLabel;
    if (typeof placeFrame === 'function') placeFrame();
  }
  b.onclick = function () { setOri(getOri() === 'l' ? 'p' : 'l'); sync(); };
  SZ.addEventListener('change', sync);
  sync();

  /* ---------- Düz oturma yoxlaması ---------- */
  var cvs = document.createElement('canvas'), ctx = cvs.getContext('2d', { willReadFrequently: true });
  var okCount = 0;
  var T_IN = 55;   // iç zolaq mərkəzdən bu qədər fərqlənirsə -> boşluq var (kafel kiçikdir)
  var T_OUT = 25;  // kənar zolaq iç zolaqdan bu qədər fərqlənmirsə -> kafel çərçivədən çıxır

  function mean(d, W, H, x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    if (x0 < 0 || y0 < 0 || x1 > W || y1 > H || x1 <= x0 || y1 <= y0) return null;
    var r = 0, g = 0, bl = 0, n = 0;
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var k = (y * W + x) * 4; r += d[k]; g += d[k + 1]; bl += d[k + 2]; n++;
    }
    return [r / n, g / n, bl / n];
  }
  function dist(a, c) { return Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]); }

  function setState(color, text, ok) {
    FR.style.borderColor = color;
    lab.textContent = baseLabel + (text ? ' · ' + text : '');
    var cs = document.getElementById('cs');
    if (cs) {
      if (ok) { cs.style.background = '#2ecc71'; cs.style.color = '#04210f'; }
      else { cs.style.background = ''; cs.style.color = ''; }
    }
  }

  function check() {
    var v = document.getElementById('cv'), cm = document.getElementById('cm');
    if (!v || !v.videoWidth || cm.hidden || document.hidden) return;
    var cw = v.clientWidth, ch = v.clientHeight, fw = FR.offsetWidth, fh = FR.offsetHeight;
    if (!cw || !ch || !fw || !fh) return;
    var W = 200, H = Math.round(W * ch / cw), k = W / cw;
    cvs.width = W; cvs.height = H;
    ctx.drawImage(v, 0, 0, W, H);
    var d = ctx.getImageData(0, 0, W, H).data;
    var L = (cw - fw) / 2 * k, T = (ch - fh) / 2 * k, FW = fw * k, FH = fh * k, R = L + FW, B = T + FH;

    var center = mean(d, W, H, L + .3 * FW, T + .3 * FH, L + .7 * FW, T + .7 * FH);
    if (!center) return;
    var a = 3, c = 6; // zolaq: kənardan 3 px aralı, qalınlığı 3 px (200 px-lik şəkildə)
    var sides = [
      { n: 'yuxarı', i: mean(d, W, H, L + .1 * FW, T + a, R - .1 * FW, T + c), o: mean(d, W, H, L + .1 * FW, T - c, R - .1 * FW, T - a) },
      { n: 'aşağı',  i: mean(d, W, H, L + .1 * FW, B - c, R - .1 * FW, B - a), o: mean(d, W, H, L + .1 * FW, B + a, R - .1 * FW, B + c) },
      { n: 'sol',    i: mean(d, W, H, L + a, T + .1 * FH, L + c, B - .1 * FH), o: mean(d, W, H, L - c, T + .1 * FH, L - a, B - .1 * FH) },
      { n: 'sağ',    i: mean(d, W, H, R - c, T + .1 * FH, R - a, B - .1 * FH), o: mean(d, W, H, R + a, T + .1 * FH, R + c, B - .1 * FH) }
    ];
    var ok = 0, gap = [], over = [];
    sides.forEach(function (s) {
      if (!s.i) { ok++; return; }
      if (dist(s.i, center) >= T_IN) gap.push(s.n);
      else if (s.o && dist(s.o, s.i) < T_OUT) over.push(s.n);
      else ok++;
    });

    if (ok === 4) {
      okCount++;
      if (okCount >= 2) { setState('#2ecc71', '✓ Ölçü uyğundur', true); return; }
      setState('#f39c12', '', false); return;
    }
    okCount = 0;
    var txt;
    if (over.length >= 3) txt = 'Uzaqlaş';
    else if (gap.length >= 3) txt = 'Yaxınlaş';
    else {
      txt = '';
      if (over.length) txt += over.join(', ') + ': çıxır';
      if (gap.length) txt += (txt ? '; ' : '') + gap.join(', ') + ': boşluq';
    }
    setState(ok === 0 ? '#e74c3c' : '#f39c12', txt, false);
  }

  // Əsas analyze funksiyasının arxasınca işləsin (o da çərçivənin rəngini dəyişir, bizimki sonuncu qalır)
  var orig = window.analyze;
  if (typeof orig === 'function') {
    window.analyze = function () {
      orig.apply(this, arguments);
      try { check(); } catch (e) {}
    };
  }
})();
