// auto-camera.js — kameranın avtomatik tənzimlənməsi
//  - Qaranlıqda: əvvəl işığı (exposure) artırır, çatmasa fənəri (flash) özü yandırır.
//  - Çox işıqlıda: işığı azaldır, avto yandırılmış fənəri söndürür.
//  - Yan bucaqdan çəkəndə (telefon əyiləndə): fokus və işıq ölçməsi mərkəzə, davamlı avto rejim.
//  - Kamera özü düzəldə bilmirsə: çox qaranlıq/işıqlı çəkilmiş şəkil proqramla düzəldilir (SOFT_FIX).
// Hər şeyin dəyəri plite-config.js-dədir; kataloqda şəklin sırasına görə fərqli ola bilər
// (məs. 6-cı şəkil məqsədli zəif işıqdadır, orada avto-işıq söndürülür).
//
// QURAŞDIRMA: assets/ içinə at, index.html-də frame-fix.js və speed-fix.js-dən SONRA, label-shot.js-dən ƏVVƏL:
//     <script src="auto-camera.js"></script>

(function () {
  if (typeof window.render !== 'function') return; // əsas skript hələ yüklənməyib (yanlış yerə qoyulubsa heç nə etmir; proqram sonradan özü yükləyir)
  var P = window.PLITE_P || function (k, d) { return d; };
  function $(id) { return document.getElementById(id); }
  var V = $('cv'), CM = $('cm'), FR = $('fr');
  if (!V || !CM || !FR) return;
  var wrap = FR.parentNode;

  var badge = document.createElement('div');
  badge.style.cssText = 'position:absolute;right:6px;top:6px;max-width:60%;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.55);color:#fff;font-size:.72rem;font-weight:700;display:none;pointer-events:none;text-align:right';
  wrap.appendChild(badge);
  function setBadge(t) { badge.textContent = t || ''; badge.style.display = t ? 'block' : 'none'; }

  var track = null, cap = {}, comp = 0, torchOn = false, torchAuto = false, torchManual = false;
  var lastAdj = 0, lastSide = 0, timer = null, msgExposure = '', msgSide = '';

  var cvs = document.createElement('canvas'); cvs.width = 64; cvs.height = 48;
  var ctx = cvs.getContext('2d', { willReadFrequently: true });

  function getTrack() { var s = V.srcObject; return s && s.getVideoTracks ? s.getVideoTracks()[0] : null; }
  async function apply(adv) {
    if (!track) return false;
    try { await track.applyConstraints({ advanced: [adv] }); return true; } catch (e) { return false; }
  }
  function has(list, v) { return !!list && list.indexOf && list.indexOf(v) >= 0; }

  /* ---------- Telefonun bucağı ---------- */
  var beta = null, gamma = null, tAt = 0;
  window.addEventListener('deviceorientation', function (e) {
    if (e.beta == null || e.gamma == null) return;
    beta = e.beta; gamma = e.gamma; tAt = Date.now();
  });
  function tilt() {
    if (beta == null || Date.now() - tAt > 2000) return null;
    return Math.min(Math.hypot(beta, gamma), Math.hypot(beta - 90, gamma));
  }

  /* ---------- Ölçmə ---------- */
  function measure() {
    var w = 64, h = 48;
    ctx.drawImage(V, 0, 0, w, h);
    var d = ctx.getImageData(0, 0, w, h).data, sum = 0, wsum = 0, blown = 0, dark = 0, n = w * h;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var k = (y * w + x) * 4, Y = .299 * d[k] + .587 * d[k + 1] + .114 * d[k + 2];
      var center = x > w * .25 && x < w * .75 && y > h * .25 && y < h * .75, wt = center ? 1 : .5;
      sum += Y * wt; wsum += wt;
      if (Y >= 245) blown++; else if (Y <= 30) dark++;
    }
    return { y: sum / wsum, blown: blown / n, dark: dark / n };
  }
  window.PLITE_MEASURE = measure;

  /* ---------- İdarəetmə ---------- */
  async function step() {
    if (CM.hidden || document.hidden || !track || !V.videoWidth) return;
    var now = Date.now(), m = measure();
    var autoExp = P('AUTO_EXPOSURE', true) !== false, autoTorch = P('AUTO_TORCH', true) !== false;
    var DARK = P('DARK_Y', 80), BRIGHT = P('BRIGHT_Y', 190), BLOWN = P('BLOWN', 0.12);
    var ec = cap.exposureCompensation, hasEC = !!(ec && typeof ec.max === 'number' && ec.max > ec.min);
    var st = hasEC ? (ec.step || (ec.max - ec.min) / 8) : 0;
    var canTorch = !!cap.torch && autoTorch && !torchManual;

    if (!autoExp) { msgExposure = ''; }
    else if (now - lastAdj >= 900) {
      if (m.y < DARK) {
        if (hasEC && comp < ec.max - 1e-6) {
          comp = Math.min(ec.max, comp + 2 * st);
          if (await apply({ exposureCompensation: comp })) { lastAdj = now; msgExposure = '💡 qaranlıq: işıq artırıldı'; }
        }
        if ((!hasEC || comp >= ec.max * 0.6) && canTorch && !torchOn) {
          torchOn = true; torchAuto = true;
          if (await apply({ torch: true })) { lastAdj = now; msgExposure = '🔦 qaranlıq: fənər avto yandı'; }
          else { torchOn = false; torchAuto = false; }
        }
        if (!hasEC && !canTorch) msgExposure = '💡 qaranlıq: işıq əlavə et (proqram şəkli düzəldəcək)';
      } else if (m.y > BRIGHT || m.blown > BLOWN) {
        if (torchOn && torchAuto) {
          torchOn = false; torchAuto = false; await apply({ torch: false }); lastAdj = now; msgExposure = '🌤 çox işıqlı: fənər söndü';
        } else if (hasEC && comp > ec.min + 1e-6) {
          comp = Math.max(ec.min, comp - 2 * st);
          if (await apply({ exposureCompensation: comp })) { lastAdj = now; msgExposure = '🌤 çox işıqlı: işıq azaldıldı'; }
        } else msgExposure = '🌤 çox işıqlı: kölgə yarat və ya bucağı dəyiş';
      } else {
        msgExposure = comp !== 0 || torchAuto ? '✓ işıq avto tənzimləndi' : '';
      }
    }

    // yan bucaq
    var tl = tilt(), SIDE = P('SIDE_TILT', 20);
    if (tl != null && tl >= SIDE) {
      if (now - lastSide > 4000) {
        lastSide = now;
        if (has(cap.focusMode, 'continuous')) apply({ focusMode: 'continuous' });
        if (has(cap.exposureMode, 'continuous')) apply({ exposureMode: 'continuous' });
        if (has(cap.whiteBalanceMode, 'continuous')) apply({ whiteBalanceMode: 'continuous' });
        apply({ pointsOfInterest: [{ x: 0.5, y: 0.5 }] });
      }
      msgSide = '📐 yan bucaq: fokus mərkəzə';
    } else msgSide = '';

    setBadge([msgExposure, msgSide].filter(Boolean).join(' · '));
  }

  function setup() {
    track = getTrack(); cap = {}; comp = 0; torchOn = false; torchAuto = false; torchManual = false;
    msgExposure = msgSide = ''; setBadge('');
    if (track && track.getCapabilities) { try { cap = track.getCapabilities() || {}; } catch (e) {} }
    // daha yüksək ayırdetmə: etiket oxuma və detal üçün (yalnız hazırkı ayırdetmə xeyli aşağıdırsa)
    try {
      var W0 = P('CAM_WIDTH', 1920), H0 = P('CAM_HEIGHT', 1080), cur = (track.getSettings && track.getSettings().width) || 0;
      if (W0 && cap.width && cap.width.max >= W0 * 0.9 && cur && cur < W0 * 0.9) {
        track.applyConstraints({ width: { ideal: W0 }, height: { ideal: H0 } }).catch(function () {});
      } else if (W0 && cap.width && cur > W0 * 1.1) {
        track.applyConstraints({ width: { ideal: W0 }, height: { ideal: H0 } }).catch(function () {});
      }
    } catch (e) {}
    if (has(cap.focusMode, 'continuous')) apply({ focusMode: 'continuous' });
    if (has(cap.exposureMode, 'continuous')) apply({ exposureMode: 'continuous' });
    if (has(cap.whiteBalanceMode, 'continuous')) apply({ whiteBalanceMode: 'continuous' });
    if (timer) clearInterval(timer);
    timer = setInterval(function () { try { step(); } catch (e) {} }, 700);
  }
  V.addEventListener('playing', setup);

  // əl ilə fənər düyməsinə basılıbsa, avto fənər dayansın
  document.addEventListener('click', function (e) {
    var t = e.target; if (t && t.textContent === '🔦') { torchManual = true; torchAuto = false; }
  }, true);

  try {
    new MutationObserver(function () {
      if (CM.hidden && timer) { clearInterval(timer); timer = null; setBadge(''); }
    }).observe(CM, { attributes: true, attributeFilter: ['hidden'] });
  } catch (e) {}

  /* ---------- Proqramla düzəliş (çox qaranlıq / çox işıqlı çəkilmiş şəkil) ---------- */
  // Tək-tük pikselləri yox, orta parlaqlığı düzəldir. Yalnız ifrat hallarda (orta < 60 və ya > 200).
  window.PLITE_POST = function (c) {
    if (P('SOFT_FIX', true) === false) return null;
    var g = c.getContext('2d'), w = c.width, h = c.height;
    var img = g.getImageData(0, 0, w, h), d = img.data, sum = 0, n = 0, i;
    function isBar(k) { return Math.abs(d[k] - 200) < 4 && Math.abs(d[k + 1] - 200) < 4 && Math.abs(d[k + 2] - 200) < 4; }
    for (i = 0; i < d.length; i += 16) { if (isBar(i)) continue; sum += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; n++; }
    if (!n) return null;
    var mean = sum / n;
    if (mean >= 60 && mean <= 200) return { changed: false, mean: mean };
    var gamma = Math.log(115 / 255) / Math.log(Math.max(8, Math.min(247, mean)) / 255);
    gamma = Math.max(0.45, Math.min(2.2, gamma));
    var lut = new Uint8ClampedArray(256);
    for (i = 0; i < 256; i++) lut[i] = 255 * Math.pow(i / 255, gamma);
    for (i = 0; i < d.length; i += 4) {
      if (isBar(i)) continue;
      d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]];
    }
    g.putImageData(img, 0, 0);
    return { changed: true, mean: mean, gamma: gamma };
  };
  (window.PLITE_READY = window.PLITE_READY || {})['auto-camera'] = true;
})();
