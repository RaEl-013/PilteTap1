// settings-panel.js — proqramın içində "Ayarlar" (⚙) bölməsi
// Başlıqdakı 🌙 düyməsinin yanında ⚙ düyməsi çıxır. Buradakı seçimlər telefonda saxlanır və plite-config.js-dəki
// bütün standart dəyərlərdən (kataloq/axtarış/şəkil profillərindən də) üstündür. "Standartlara qayıt" hamısını silir.
// Çoxu dərhal işləyir; kamera ayırdetməsi və avto işıq kameranı yenidən açanda tətbiq olunur.
//
// QURAŞDIRMA: assets/ içinə at; index.html-də label-shot.js-dən ƏVVƏL (plite-config.js-dən sonra):
//     <script src="settings-panel.js"></script>

(function () {
  function $(id) { return document.getElementById(id); }
  var P = window.PLITE_P || function (k, d) { return d; };
  var U = window.PLITE_USER = window.PLITE_USER || {};
  function save() { try { localStorage.setItem('plite_user_cfg', JSON.stringify(U)); } catch (e) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function bool(k) { return [['Açıq', (function () { var o = {}; o[k] = true; return o; })()], ['Bağlı', (function () { var o = {}; o[k] = false; return o; })()]]; }
  function same(a, b) { return typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b; }

  var SETTINGS = [
    { label: 'Kataloq: şəkil sayı', opts: [1, 2, 3, 4, 5].map(function (n) { return [String(n), { MAX_SHOTS: n }]; }) },
    { label: 'Avto-çəkiliş', opts: [['Açıq', { ls: ['plite_auto', '1'] }], ['Bağlı', { ls: ['plite_auto', '0'] }]],
      cur: function () { return lsGet('plite_auto') === '0' ? 1 : (lsGet('plite_auto') === '1' ? 0 : (P('AUTO_DEFAULT', true) === false ? 1 : 0)); } },
    { label: 'Maqnit həssaslığı', opts: [['Az', { MIN_S: 9 }], ['Normal', { MIN_S: 6 }], ['Çox həssas', { MIN_S: 4 }]] },
    { label: 'Tərpənmə həssaslığı', opts: [['Yüngül', { MOTION_MAX: 16 }], ['Normal', { MOTION_MAX: 10 }], ['Ciddi', { MOTION_MAX: 6 }]] },
    { label: 'Avto işıq (qaranlıq / çox işıqlı)', opts: bool('AUTO_EXPOSURE') },
    { label: 'Avto fənər (flash)', opts: bool('AUTO_TORCH') },
    { label: 'Şəkli proqramla düzəlt', opts: bool('SOFT_FIX') },
    { label: 'Kamera ayırdetməsi', opts: [['Aşağı', { CAM_WIDTH: 640, CAM_HEIGHT: 480 }], ['Normal', { CAM_WIDTH: 1280, CAM_HEIGHT: 720 }], ['Yüksək', { CAM_WIDTH: 1920, CAM_HEIGHT: 1080 }]] },
    { label: 'Tanıma dəqiqliyi', opts: [['Sürətli', { CROPS_N: 2, ALL_ROT: false }], ['Orta', { CROPS_N: 3, ALL_ROT: false }], ['Dəqiq (yavaş)', { CROPS_N: 4, ALL_ROT: true }]] },
    { label: 'Çalar və tekstura təsiri', opts: [['Söndür', { W_COLOR: 0, W_TEX: 0, W_TONE: 0 }], ['Normal', { W_COLOR: 0.01, W_TEX: 0.02, W_TONE: 0.01 }], ['Güclü', { W_COLOR: 0.02, W_TEX: 0.04, W_TONE: 0.02 }]] },
    { label: 'Ölçü filtri (kameradan axtarış)', opts: [['Açıq', { ls: ['plite_sizeonly', '1'] }], ['Bağlı', { ls: ['plite_sizeonly', '0'] }]],
      cur: function () { return lsGet('plite_sizeonly') === '0' ? 1 : (lsGet('plite_sizeonly') === '1' ? 0 : (P('SIZE_ONLY_DEFAULT', true) === false ? 1 : 0)); } },
    { label: 'Kataloqda etiket şəkli addımı', opts: bool('LABEL_PHASE') },
    { label: 'Titrəmə', opts: bool('VIBRATE') }
  ];

  function currentIndex(s) {
    if (s.cur) return s.cur();
    for (var i = 0; i < s.opts.length; i++) {
      var patch = s.opts[i][1], ok = true;
      for (var k in patch) if (!same(P(k), patch[k])) { ok = false; break; }
      if (ok) return i;
    }
    return -1;
  }
  function applyOpt(s, i) {
    var patch = s.opts[i][1];
    for (var k in patch) {
      if (k === 'ls') lsSet(patch.ls[0], patch.ls[1]);
      else U[k] = patch[k];
    }
    save();
  }
  function resetAll() {
    Object.keys(U).forEach(function (k) { delete U[k]; });
    try { localStorage.removeItem('plite_user_cfg'); localStorage.removeItem('plite_auto'); localStorage.removeItem('plite_sizeonly'); } catch (e) {}
  }

  /* ---------- Pəncərə ---------- */
  var modal = document.createElement('div');
  modal.hidden = true;
  modal.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:12;display:flex;align-items:center;justify-content:center;padding:16px';
  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.style.cssText = 'max-width:420px;width:100%;max-height:90vh;overflow:auto;margin:0';
  modal.appendChild(panel);
  document.body.appendChild(modal);

  function build() {
    panel.innerHTML = '';
    var h = document.createElement('b'); h.textContent = 'Ayarlar'; panel.appendChild(h);
    var note = document.createElement('p'); note.className = 'msg'; note.style.margin = '4px 0 10px';
    note.textContent = 'Seçimlər telefonda saxlanır. Kamera ayarları kameranı yenidən açanda tətbiq olunur.';
    panel.appendChild(note);
    SETTINGS.forEach(function (s) {
      var row = document.createElement('div'); row.className = 'row'; row.style.cssText = 'margin-bottom:8px;justify-content:space-between';
      var lb = document.createElement('span'); lb.textContent = s.label; lb.style.cssText = 'flex:1;min-width:150px';
      var sel = document.createElement('select');
      s.opts.forEach(function (o, i) { var e = document.createElement('option'); e.value = i; e.textContent = o[0]; sel.appendChild(e); });
      var ci = currentIndex(s);
      if (ci < 0) { var e0 = document.createElement('option'); e0.value = -1; e0.textContent = 'Fərdi'; sel.insertBefore(e0, sel.firstChild); sel.value = -1; }
      else sel.value = ci;
      sel.onchange = function () { var i = +sel.value; if (i >= 0) applyOpt(s, i); };
      row.appendChild(lb); row.appendChild(sel); panel.appendChild(row);
    });
    var br = document.createElement('div'); br.className = 'row'; br.style.marginTop = '10px';
    var reset = document.createElement('button'); reset.className = 'btn alt'; reset.textContent = 'Standartlara qayıt';
    reset.style.cssText = 'width:auto;margin:0;padding:10px 14px;font-size:.9rem';
    reset.onclick = function () { resetAll(); build(); };
    var close = document.createElement('button'); close.className = 'btn'; close.textContent = 'Bağla';
    close.style.cssText = 'flex:1;width:auto;padding:10px';
    close.onclick = function () { modal.hidden = true; };
    br.appendChild(reset); br.appendChild(close); panel.appendChild(br);
  }

  var btn = document.createElement('button');
  btn.id = 'setb'; btn.title = 'Ayarlar'; btn.setAttribute('aria-label', 'Ayarlar'); btn.textContent = '⚙';
  btn.style.cssText = 'position:absolute;right:64px;top:16px;width:40px;height:40px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font-size:18px;cursor:pointer;z-index:5';
  var thm = $('thm');
  if (thm && thm.parentNode) thm.parentNode.insertBefore(btn, thm.nextSibling); else document.body.appendChild(btn);
  btn.onclick = function () { build(); modal.hidden = false; };
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
})();
