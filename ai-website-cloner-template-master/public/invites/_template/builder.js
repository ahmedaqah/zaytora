/* ZAYTORA invitation builder (admin). Edits one config object, previews it live in an iframe of the
   real renderer (postMessage), and exports <slug>/ as a ZIP to be placed under public/invites/. */
(function () {
  'use strict';
  var TPL = '/invites/_template/';
  var SITE = 'https://www.zaytorainvites.com';
  var DRAFT = 'zaytora-invite-draft-v1';
  var $ = function (id) { return document.getElementById(id); };
  var state = { slug: '', cfg: null, sample: null, editing: '' };
  var host = false, pending = {}, reqId = 0;
  var files = {}, urls = {}; // zip path -> Blob / blob: URL
  var drawStickers = null;

  var ICONS = [['info', 'معلومة'], ['camera-off', 'ممنوع التصوير'], ['home', 'الأقسام / المكان'], ['car', 'مواقف / وصول'], ['gift', 'هدايا'], ['dress', 'الزي'], ['heart', 'قلب']];

  /* ---------- utils ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function get(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function set(o, path, v) { var ks = path.split('.'), l = ks.pop(); var t = ks.reduce(function (a, k) { if (!a[k] || typeof a[k] !== 'object') a[k] = {}; return a[k]; }, o); t[l] = v; }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function status(msg, bad) { var s = $('status'); s.textContent = msg || ''; s.className = bad ? 'err' : ''; }
  function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }

  /* ---------- preview ---------- */
  var ifr = $('preview'), ready = false, pt = 0;
  function previewCfg() {
    var c = clone(state.cfg);
    Object.keys(c.media).forEach(function (k) { var v = c.media[k]; if (typeof v === 'string' && urls[v]) c.media[k] = urls[v]; });
    (c.stickers || []).forEach(function (s) { if (s && urls[s.src]) s.src = urls[s.src]; });
    return c;
  }
  function pushPreview(replay) {
    if (!ready) return;
    ifr.contentWindow.postMessage({ type: 'zaytora-invite-config', config: previewCfg(), skipCover: $('skip-cover').checked, replay: replay === true }, location.origin);
  }
  function schedule() { clearTimeout(pt); pt = setTimeout(pushPreview, 250); saveDraft(); }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'zaytora-sticker-move') { /* a sticker was dragged inside the preview */
      var st = state.cfg && (state.cfg.stickers || [])[e.data.index];
      if (st) { st.x = e.data.x; st.y = e.data.y; saveDraft(); if (drawStickers) drawStickers(); }
      return;
    }
    if (e.data.type !== 'zaytora-invite-ready') return;
    ready = true; pushPreview();
  });
  $('skip-cover').addEventListener('change', function () { pushPreview(); });
  $('btn-reload').addEventListener('click', function () { $('skip-cover').checked = false; pushPreview(); });

  /* ---------- draft ---------- */
  function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify({ slug: state.slug, cfg: state.cfg })); } catch (e) { /* ignore */ } }
  function sanitize(cfg) {
    // uploaded files do not survive a reload: drop media that pointed at them
    var m = cfg.media || {};
    ['cover', 'coverPoster', 'bg', 'bgWebm', 'bgPoster', 'music', 'customFont'].forEach(function (k) { if (typeof m[k] === 'string' && /^media\//.test(m[k]) && !files[m[k]]) m[k] = ''; });
    cfg.stickers = (Array.isArray(cfg.stickers) ? cfg.stickers : []).filter(function (s) { return s && s.src && !(/^media\//.test(s.src) && !files[s.src]); });
    return cfg;
  }
  function deepMerge(a, b) {
    if (Array.isArray(a) || typeof a !== 'object' || a === null) return b === undefined ? a : b;
    var o = {}; Object.keys(a).forEach(function (k) { o[k] = deepMerge(a[k], b ? b[k] : undefined); });
    if (b && typeof b === 'object') Object.keys(b).forEach(function (k) { if (!(k in o)) o[k] = b[k]; });
    return o;
  }

  /* ---------- form controls ---------- */
  function wrap(label, input, hint) {
    return el('label', { class: 'f' }, [el('span', { text: label }), input, hint ? el('span', { class: 'hint', text: hint }) : null]);
  }
  function bind(input, path, kind) {
    var v = get(state.cfg, path);
    if (kind === 'check') input.checked = !!v; else input.value = v == null ? '' : v;
    input.addEventListener('input', function () {
      var nv = kind === 'check' ? input.checked : kind === 'num' ? (parseFloat(input.value) || 0) : input.value;
      set(state.cfg, path, nv); schedule();
    });
    return input;
  }
  function text(label, path, hint, attrs) { return wrap(label, bind(el('input', Object.assign({ type: 'text' }, attrs || {})), path), hint); }
  function area(label, path, hint, rows) { return wrap(label, bind(el('textarea', { rows: rows || 3 }), path), hint); }
  function color(label, path) { return wrap(label, bind(el('input', { type: 'color' }), path)); }
  function check(label, path) { return el('label', { class: 'chk' }, [bind(el('input', { type: 'checkbox' }), path, 'check'), el('span', { text: label })]); }
  function num(label, path, min, max, step) { return wrap(label, bind(el('input', { type: 'number', min: min, max: max, step: step || 1 }), path, 'num')); }
  /* font-size control: "−" / slider / "+" and the current size in percent (100% = the designed size) */
  function scale(label, path, min, max, step) {
    var cur = parseFloat(get(state.cfg, path)); if (!isFinite(cur)) cur = 1;
    var out = el('output', { class: 'pct' }), rng = el('input', { type: 'range', min: min, max: max, step: step });
    var minus = el('button', { type: 'button', class: 'sm', text: '−', 'aria-label': 'تصغير' }), plus = el('button', { type: 'button', class: 'sm', text: '+', 'aria-label': 'تكبير' });
    function apply(v, push) {
      v = Math.round(Math.max(min, Math.min(max, v)) * 100) / 100;
      rng.value = v; out.textContent = Math.round(v * 100) + '%';
      if (push) { set(state.cfg, path, v); schedule(); }
    }
    apply(cur, false);
    rng.addEventListener('input', function () { apply(parseFloat(rng.value), true); });
    minus.addEventListener('click', function () { apply(parseFloat(rng.value) - step, true); });
    plus.addEventListener('click', function () { apply(parseFloat(rng.value) + step, true); });
    return el('div', { class: 'f' }, [el('span', { text: label }), el('div', { class: 'scalebox' }, [minus, rng, plus, out])]);
  }
  function section(title, kids, open) {
    var d = el('details', open ? { open: '' } : {}, [el('summary', { text: title }), el('div', { class: 'sec' }, kids)]);
    return d;
  }

  /* repeater of objects */
  function repeater(path, mk, blank, addLabel) {
    var box = el('div', { class: 'sec', style: 'padding:0' });
    function draw() {
      box.innerHTML = '';
      var arr = get(state.cfg, path);
      arr.forEach(function (it, i) {
        var h = el('div', { class: 'h' }, [el('b', { text: '#' + (i + 1) })]);
        var ctl = el('div', { class: 'row' });
        [['↑', -1], ['↓', 1]].forEach(function (d) {
          var b = el('button', { type: 'button', class: 'sm', text: d[0] });
          b.addEventListener('click', function () { var j = i + d[1]; if (j < 0 || j >= arr.length) return; arr.splice(j, 0, arr.splice(i, 1)[0]); draw(); schedule(); });
          ctl.appendChild(b);
        });
        var del = el('button', { type: 'button', class: 'sm del', text: 'حذف' });
        del.addEventListener('click', function () { arr.splice(i, 1); draw(); schedule(); });
        ctl.appendChild(del); h.appendChild(ctl);
        box.appendChild(el('div', { class: 'item' }, [h].concat(mk(it, function () { schedule(); }))));
      });
      var add = el('button', { type: 'button', text: addLabel });
      add.addEventListener('click', function () { arr.push(clone(blank)); draw(); schedule(); });
      box.appendChild(add);
    }
    draw();
    return box;
  }
  function itemText(it, key, label, cb, multi) {
    var i = multi ? el('textarea', { rows: 2 }) : el('input', { type: 'text' });
    i.value = it[key] || '';
    i.addEventListener('input', function () { it[key] = i.value; cb(); });
    return wrap(label, i);
  }

  /* media control */
  function media(label, key, accept, hint, onFile) {
    var nm = el('div', { class: 'nm' });
    function show() {
      var v = state.cfg.media[key];
      nm.textContent = !v ? 'لا يوجد' : /^\/invites\/_template\//.test(v) ? 'ملف النموذج التجريبي' : v;
    }
    var inp = el('input', { type: 'file', accept: accept });
    inp.addEventListener('change', function () {
      var f = inp.files[0]; if (!f) return;
      if (f.size > 25 * 1024 * 1024) status('الملف كبير (' + Math.round(f.size / 1048576) + ' MB). يفضّل أقل من 10 MB لسرعة التحميل على الجوال.', true);
      onFile(f, show); inp.value = '';
    });
    var rm = el('button', { type: 'button', class: 'sm del', text: 'إزالة' });
    rm.addEventListener('click', function () { clearMedia(key); show(); schedule(); });
    show();
    return el('div', { class: 'media' }, [el('b', { text: label }), hint ? el('p', { class: 'hint', text: hint }) : null, nm, inp, rm]);
  }
  function putFile(key, name, blob) {
    var old = state.cfg.media[key];
    if (old && files[old]) { URL.revokeObjectURL(urls[old]); delete files[old]; delete urls[old]; }
    files[name] = blob; urls[name] = URL.createObjectURL(blob); state.cfg.media[key] = name;
  }
  function clearMedia(key) {
    var old = state.cfg.media[key];
    if (old && files[old]) { URL.revokeObjectURL(urls[old]); delete files[old]; delete urls[old]; }
    state.cfg.media[key] = '';
  }
  function framePoster(blob, cb) {
    var v = document.createElement('video'), u = URL.createObjectURL(blob), done = false;
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = u;
    function fin(b) { if (done) return; done = true; URL.revokeObjectURL(u); cb(b); }
    v.addEventListener('loadeddata', function () { try { v.currentTime = Math.min(0.3, (v.duration || 1) / 2); } catch (e) { fin(null); } });
    v.addEventListener('seeked', function () {
      var w = Math.min(720, v.videoWidth || 720), h = Math.round(w * (v.videoHeight || 1280) / (v.videoWidth || 720));
      var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h);
      c.toBlob(fin, 'image/jpeg', 0.82);
    });
    v.addEventListener('error', function () { fin(null); });
    setTimeout(function () { fin(null); }, 8000);
  }


  /* ---------- royal layout panels ---------- */
  var FONT_OPTS = [['katibeh', 'كتيبة (الأقرب لخط الثلث)'], ['aref', 'عارف رقعة'], ['amiri', 'أميري (نسخ)'], ['lateef', 'لطيف'], ['scheherazade', 'شهرزاد'], ['mirza', 'ميرزا'], ['reem', 'ريم كوفي'], ['cinzel', 'Cinzel (لاتيني)'], ['custom', 'الخط المرفوع (مثلاً خط الثلث)']];
  var FONT_MIME = { ttf: 'font/ttf', otf: 'font/otf', woff2: 'font/woff2', woff: 'font/woff' };
  function sel(label, path, opts) {
    var s = el('select', {}, opts.map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    s.value = get(state.cfg, path) || opts[0][0];
    s.addEventListener('input', function () { set(state.cfg, path, s.value); schedule(); });
    return wrap(label, s);
  }
  function slider(label, obj, key, min, max, step, unit, cb) {
    var out = el('output', { class: 'pct' }), r = el('input', { type: 'range', min: min, max: max, step: step });
    function show() { out.textContent = r.value + unit; }
    r.value = obj[key]; show();
    r.addEventListener('input', function () { obj[key] = parseFloat(r.value); show(); cb(); });
    return el('div', { class: 'f' }, [el('span', { text: label }), el('div', { class: 'scalebox' }, [r, out])]);
  }
  function stickerPanel() {
    var box = el('div', { class: 'sec', style: 'padding:0' });
    function draw() {
      box.innerHTML = '';
      var list = state.cfg.stickers;
      list.forEach(function (s, i) {
        var thumb = s.kind === 'video' ? el('b', { text: 'فيديو' }) : el('img', { src: urls[s.src] || s.src, alt: '', style: 'height:42px;max-width:90px;object-fit:contain;background:#ddd' });
        var h = el('div', { class: 'h' }, [el('span', { class: 'row' }, [thumb, el('b', { text: ' ملصق ' + (i + 1) })])]);
        var ctl = el('div', { class: 'row' });
        var del = el('button', { type: 'button', class: 'sm del', text: 'حذف' });
        del.addEventListener('click', function () {
          if (files[s.src]) { URL.revokeObjectURL(urls[s.src]); delete files[s.src]; delete urls[s.src]; }
          list.splice(i, 1); draw(); schedule();
        });
        ctl.appendChild(del); h.appendChild(ctl);
        var anchor = el('select', {}, [el('option', { value: 'scene', text: 'على الواجهة الافتتاحية' }), el('option', { value: 'page', text: 'على الورقة (بقية الدعوة)' })]); anchor.value = s.anchor || 'scene';
        anchor.addEventListener('input', function () { s.anchor = anchor.value; schedule(); });
        var layer = el('select', {}, [el('option', { value: 'front', text: 'أمام النصوص' }), el('option', { value: 'back', text: 'خلف النصوص' })]); layer.value = s.layer || 'front';
        layer.addEventListener('input', function () { s.layer = layer.value; schedule(); });
        var fl = el('input', { type: 'checkbox' }); fl.checked = !!s.float; fl.addEventListener('input', function () { s.float = fl.checked; schedule(); });
        var cb = function () { schedule(); };
        box.appendChild(el('div', { class: 'item' }, [h, wrap('مكان الملصق', anchor), wrap('الطبقة', layer),
          slider('أفقياً (يمين ↔ يسار الصفحة)', s, 'x', 0, 100, 0.5, '%', cb), slider('عمودياً (أعلى ↔ أسفل)', s, 'y', 0, 100, 0.5, '%', cb),
          slider('الحجم', s, 'w', 5, 150, 1, '', cb), slider('التدوير', s, 'rot', -180, 180, 1, '°', cb), slider('الشفافية', s, 'op', 0.1, 1, 0.05, '', cb),
          el('label', { class: 'chk' }, [fl, el('span', { text: 'حركة طفو هادئة' })])]));
      });
      var inp = el('input', { type: 'file', accept: 'image/png,image/webp,image/gif,image/jpeg,video/mp4,video/webm' });
      inp.addEventListener('change', function () {
        var f = inp.files[0]; if (!f) return; inp.value = '';
        if (f.size > 20 * 1024 * 1024) { status('الملف كبير جداً (' + Math.round(f.size / 1048576) + ' MB). استخدم أقل من 20 MB.', true); return; }
        var name = 'media/sticker-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4) + '.' + (ext(f.name) || 'png');
        files[name] = f; urls[name] = URL.createObjectURL(f);
        list.push({ src: name, kind: /^video\//.test(f.type) ? 'video' : 'image', anchor: 'scene', x: 50, y: 12, w: 30, rot: 0, op: 1, layer: 'front', float: false });
        draw(); schedule();
      });
      box.appendChild(el('div', { class: 'media' }, [el('b', { text: 'إضافة ملصق / صورة مفرغة / GIF / فيديو' }),
        el('p', { class: 'hint', text: 'PNG أو WebP بخلفية شفافة، أو GIF، أو فيديو MP4/WebM قصير. بعد الإضافة اسحب الملصق بالماوس أو الإصبع داخل المعاينة لتحريكه، أو استخدم المنزلقات.' }), inp]));
    }
    drawStickers = draw; draw();
    return box;
  }
  function royalPanels() {
    var R = state.cfg.royal;
    var fam = function (side, label) {
      return el('div', { class: 'item' }, [el('div', { class: 'h' }, [el('b', { text: label })]),
        el('div', { class: 'g2' }, [text('اللقب', 'royal.' + side + '.title'), text('اسم الأب / العائلة', 'royal.' + side + '.father')]),
        el('div', { class: 'g2' }, [text('الصلة (نجله / ابنته…)', 'royal.' + side + '.rel'), text('الاسم الكبير', 'royal.' + side + '.name', 'فارغ = الاسم الأول/الثاني من القسم 2')])]);
    };
    var replay = el('button', { type: 'button', text: '▶ إعادة تشغيل الحركة في المعاينة' });
    replay.addEventListener('click', function () { $('skip-cover').checked = true; pushPreview(true); });
    var wrapEl = el('div', { id: 'royal-panels' }, [
      section('الوضع الملكي — الواجهة الافتتاحية', [
        area('الجملة العليا (البسملة أو أي عبارة)', 'royal.bismillah', '', 2), area('نص الدعوة تحتها', 'royal.invite', '', 2),
        fam('right', 'العمود الأيمن (العريس عادةً)'), fam('left', 'العمود الأيسر (العروس عادةً)'),
        check('إظهار التاريخ أسفل الأسماء', 'royal.showDate')
      ], true),
      section('الوضع الملكي — الخطوط والألوان', [
        sel('خط الجملة العليا', 'royal.fonts.bismillah', FONT_OPTS), sel('خط نص الدعوة', 'royal.fonts.invite', FONT_OPTS),
        sel('خط الألقاب (السيد / نجله)', 'royal.fonts.titles', FONT_OPTS), sel('خط أسماء الآباء', 'royal.fonts.father', FONT_OPTS), sel('خط أسماء العروسين', 'royal.fonts.names', FONT_OPTS),
        media('خط مرفوع (مثل خط الثلث)', 'customFont', '.ttf,.otf,.woff2,.woff', 'ارفع ملف الخط إن كان لديك خط ثلث بترخيص مناسب، ثم اخترْ «الخط المرفوع» في القوائم أعلاه. الخطوط الجاهزة هنا لا تتضمن ثلثاً حقيقياً، وكتيبة هي الأقرب.', function (f, show) {
          var e = ext(f.name); if (!FONT_MIME[e]) { status('نوع الخط غير مدعوم. استخدم TTF أو OTF أو WOFF2.', true); return; }
          putFile('customFont', 'media/font.' + e, new Blob([f], { type: FONT_MIME[e] })); show(); schedule();
        }),
        scale('حجم الجملة العليا', 'royal.scales.bismillah', 0.5, 1.8, 0.05), scale('حجم نص الدعوة', 'royal.scales.invite', 0.5, 1.8, 0.05),
        scale('حجم الألقاب وأسماء الآباء', 'royal.scales.family', 0.5, 1.8, 0.05), scale('حجم أسماء العروسين', 'royal.scales.names', 0.5, 1.8, 0.05),
        el('div', { class: 'g2' }, [color('لون النصوص', 'royal.colors.text'), color('لون أسماء العروسين (أغمق)', 'royal.colors.names')])
      ]),
      section('الوضع الملكي — حركة الظهور', [
        sel('نوع الحركة', 'royal.anim.type', [['rise', 'صعود هادئ'], ['fade', 'ظهور تدريجي'], ['drop', 'نزول هادئ'], ['zoom', 'تقريب ناعم'], ['blur', 'من الضبابية إلى الوضوح'], ['slide', 'انزلاق الأعمدة من الجانبين']]),
        num('مدة ظهور كل عنصر (ثانية)', 'royal.anim.duration', 0.3, 6, 0.1), num('الفاصل بين العناصر (ثانية)', 'royal.anim.gap', 0, 3, 0.05), num('التأخير بعد فتح الغلاف (ثانية)', 'royal.anim.delay', 0, 6, 0.1),
        replay, el('p', { class: 'hint', text: 'تبدأ الحركة عند فتح الغلاف. زر الإعادة يعرضها في المعاينة دون الحاجة لفتح الغلاف.' })
      ]),
      section('الوضع الملكي — الورقة', [
        scale('درجة وضوح الورقة (100% معتمة، أقل = أشفّ)', 'royal.paperOpacity', 0.1, 1, 0.05),
        el('p', { class: 'hint', text: 'الأعمدة والورود تبقى واضحة دائماً، والورقة وحدها تصبح شفافة فتظهر الخلفية من خلالها.' })
      ]),
      section('الوضع الملكي — الملصقات والصور والفيديو', [stickerPanel()])
    ]);
    wrapEl.hidden = state.cfg.layout.mode !== 'royal';
    return wrapEl;
  }

  /* ---------- build the form ---------- */
  function buildForm() {
    var F = $('form'); F.innerHTML = '';
    var cfg = state.cfg;

    /* layout mode: keeps the current look or switches to the royal one */
    var panels = royalPanels();
    var modeSel = el('select', {}, [el('option', { value: 'classic', text: 'الوضع الحالي (الأوراق الممزقة)' }), el('option', { value: 'royal', text: 'الوضع الجديد (ملكي: أعمدة وورود)' })]);
    modeSel.value = cfg.layout.mode === 'royal' ? 'royal' : 'classic';
    modeSel.addEventListener('input', function () { state.cfg.layout.mode = modeSel.value; panels.hidden = modeSel.value !== 'royal'; schedule(); });
    F.appendChild(el('div', { class: 'modebox' }, [wrap('شكل الدعوة', modeSel, 'الدعوات المحفوظة سابقاً تبقى كما هي ما لم تغيّر هذا الخيار وتعيد حفظها.')]));
    F.appendChild(panels);

    /* 1 basics */
    var slug = el('input', { type: 'text', dir: 'ltr', placeholder: 'ahmed-and-sara', maxlength: 40 });
    slug.value = state.slug; if (state.editing) slug.readOnly = true;
    slug.addEventListener('input', function () { state.slug = slug.value.trim().toLowerCase(); saveDraft(); });
    F.appendChild(section('1) الرابط والعنوان', [
      wrap('اسم الرابط (إنجليزي صغير وأرقام وشرطة فقط)', slug, 'الرابط النهائي: ' + SITE + (host ? '/invites/p/' : '/invites/') + 'ثم الاسم' + (state.editing ? ' (لا يمكن تغيير الرابط أثناء تعديل دعوة محفوظة)' : '')),
      text('عنوان الصفحة / معاينة الرابط', 'meta.title', 'يظهر في تبويب المتصفح وعند مشاركة الرابط'),
      text('وصف قصير لمعاينة الرابط', 'meta.description', 'اتركه فارغاً ليُبنى تلقائياً من التاريخ والقاعة')
    ], true));

    /* 2 hero */
    F.appendChild(section('2) الأسماء والنصوص الرئيسية', [
      text('البسملة', 'hero.bismillah'), text('سطر لاتيني صغير', 'hero.eyebrow', 'مثال: WEDDING INVITATION'),
      el('div', { class: 'g3' }, [text('الاسم الأول', 'hero.name1'), text('الفاصل', 'hero.connector'), text('الاسم الثاني', 'hero.name2')]),
      text('المناسبة', 'hero.occasion', 'مثال: حفل زفاف / حفل خطوبة / مولود جديد'),
      text('نص التاريخ', 'hero.dateText', 'فارغ = يُبنى تلقائياً من التاريخ (20 · 05 · 2027)'),
      area('العبارة الرئيسية', 'hero.quote'), text('آية / تعليق صغير تحت العبارة', 'hero.verse'),
      area('نص الدعوة', 'hero.intro')
    ]));

    /* 3 event date */
    var ev = cfg.event;
    function evDom() {
      var d = el('input', { type: 'date' }), st = el('input', { type: 'time' }), en = el('input', { type: 'time' }), off = el('input', { type: 'text', dir: 'ltr', list: 'offs' });
      d.value = (ev.start || '').slice(0, 10); st.value = (ev.start || '').slice(11, 16); en.value = (ev.end || '').slice(11, 16); off.value = ev.utcOffset || '+00:00';
      function upd() {
        var date = d.value;
        state.cfg.event.start = date ? date + 'T' + (st.value || '00:00') : '';
        state.cfg.event.end = date && en.value ? date + 'T' + en.value : '';
        state.cfg.event.utcOffset = /^[+-]\d{2}:\d{2}$/.test(off.value) ? off.value : state.cfg.event.utcOffset;
        schedule();
      }
      [d, st, en, off].forEach(function (i) { i.addEventListener('input', upd); });
      var dl = el('datalist', { id: 'offs' }, ['+00:00', '+01:00', '+02:00', '+03:00', '+04:00', '+05:00', '+05:30', '+08:00', '-05:00', '-08:00'].map(function (o) { return el('option', { value: o }); }));
      return [wrap('تاريخ الحفل', d), el('div', { class: 'g2' }, [wrap('وقت البدء', st), wrap('وقت الانتهاء', en)]),
        wrap('فرق التوقيت عن UTC لمدينة الحفل', off, 'مثال: السعودية/الأردن +03:00 ، النرويج الشتاء +01:00 والصيف +02:00 ، تركيا +03:00. يُستخدم للعدّ التنازلي.'), dl];
    }
    F.appendChild(section('3) التاريخ والعدّ التنازلي', evDom().concat([check('إظهار العدّ التنازلي', 'countdown.enabled'), text('عنوان العدّ التنازلي', 'countdown.title')])));

    /* 4 schedule */
    F.appendChild(section('4) برنامج الحفل', [
      check('إظهار البرنامج', 'schedule.enabled'), text('العنوان', 'schedule.title'), text('تلميح تحت البرنامج', 'schedule.tip'),
      repeater('schedule.items', function (it, cb) {
        var rose = el('input', { type: 'checkbox' }); rose.checked = !!it.rose; rose.addEventListener('input', function () { it.rose = rose.checked; cb(); });
        return [el('div', { class: 'g2' }, [itemText(it, 'time', 'الوقت', cb), itemText(it, 'title', 'الفقرة', cb)]), itemText(it, 'detail', 'التفاصيل عند الضغط (اختياري)', cb, true),
          el('label', { class: 'chk' }, [rose, el('span', { text: 'علامة وردة' })])];
      }, { time: '', title: '', detail: '' }, '+ إضافة فقرة')
    ]));

    /* 5 location */
    F.appendChild(section('5) الموقع', [
      check('إظهار الموقع', 'location.enabled'), text('العنوان', 'location.title'), text('اسم القاعة / المكان', 'location.venue'),
      text('لغة اسم القاعة إن كان بغير العربية', 'location.venueLang', 'مثال: tr أو en، يُعرض من اليسار لليمين', { dir: 'ltr' }),
      area('العنوان التفصيلي', 'location.address'), text('رابط الخريطة (Google Maps)', 'location.mapUrl', 'اتركه فارغاً لإخفاء الزر', { dir: 'ltr' }), text('نص زر الخريطة', 'location.mapLabel')
    ]));

    /* 6 notes */
    F.appendChild(section('6) تعليمات خاصة', [
      check('إظهار التعليمات', 'notes.enabled'), text('العنوان', 'notes.title'),
      repeater('notes.items', function (it, cb) {
        var sel = el('select', {}, ICONS.map(function (i) { return el('option', { value: i[0], text: i[1] }); })); sel.value = it.icon || 'info';
        sel.addEventListener('input', function () { it.icon = sel.value; cb(); });
        return [wrap('الأيقونة', sel), itemText(it, 'text', 'النص', cb, true)];
      }, { icon: 'info', text: '' }, '+ إضافة تعليمة')
    ]));

    /* 7 rsvp */
    F.appendChild(section('7) تأكيد الحضور', [
      check('إظهار نموذج تأكيد الحضور', 'rsvp.enabled'),
      text('رقم واتساب لاستقبال الردود', 'rsvp.whatsapp', 'بالصيغة الدولية مع الرمز، مثال: +962791234567. بدونه لن يصلك الرد!', { dir: 'ltr', inputmode: 'tel' }),
      check('إظهار خانة عدد الحضور (أزل العلامة لحذفها من النموذج)', 'rsvp.showGuests'),
      num('أكبر عدد حضور في القائمة', 'rsvp.maxGuests', 1, 30),
      text('العنوان', 'rsvp.title'), area('نص تمهيدي', 'rsvp.intro', '', 2),
      text('تسمية الاسم', 'rsvp.nameLabel'), text('خيار الحضور', 'rsvp.yesLabel'), text('خيار الاعتذار', 'rsvp.noLabel'), text('نص الزر', 'rsvp.button')
    ]));

    /* 8 closing */
    F.appendChild(section('8) الختام', [
      text('سطر لاتيني', 'closing.latin'), text('عبارة الختام', 'closing.text'), text('التوقيع (الأسماء)', 'closing.sign'), text('نص أسفل الصفحة', 'footer', 'اختياري. شعار «MADE BY ZAYTORA» يظهر دائماً تحته.')
    ]));

    /* 9 theme */
    F.appendChild(section('9) الألوان وحجم الخط', [
      scale('حجم خط الأسماء', 'style.nameScale', 0.6, 1.6, 0.05),
      scale('حجم خط النصوص', 'style.textScale', 0.7, 1.5, 0.05),
      el('p', { class: 'hint', text: '100% هو الحجم الافتراضي. تغيير حجم الأسماء لا يؤثر على النصوص، والعكس صحيح.' }),
      el('div', { class: 'g2' }, [color('لون الورق', 'theme.paper'), color('لون الذهب (الخطوط)', 'theme.gold'), color('ذهبي فاتح', 'theme.goldBright'), color('لون الأزرار والأسماء', 'theme.olive'), color('لون النص', 'theme.brown')]),
      el('p', { class: 'hint', text: 'ستُطبّق الألوان على الأوراق والأزرار والنصوص. أوراق الزهور (الصور) تبقى بألوانها الأصلية.' })
    ]));

    /* 10 media */
    var coverType = el('select', {}, [el('option', { value: 'video', text: 'فيديو الغلاف (ظرف أو ختم)' }), el('option', { value: 'simple', text: 'بطاقة بسيطة (بدون فيديو)' })]);
    coverType.value = cfg.media.coverType; coverType.addEventListener('input', function () { state.cfg.media.coverType = coverType.value; schedule(); });
    F.appendChild(section('10) الصور والفيديو والموسيقى', [
      el('p', { class: 'warn', text: 'الملفات المرفوعة هنا تُدمج في ملف ZIP عند التنزيل. حافظ على الأحجام صغيرة (فيديو الغلاف أقل من 5 MB، الموسيقى أقل من 5 MB).' }),
      wrap('شكل الغلاف', coverType),
      media('فيديو الغلاف', 'cover', 'video/mp4,video/webm', 'يفضّل MP4 (H.264) عمودي بدون صوت، 4–8 ثوانٍ. تُؤخذ صورة الغلاف من أول لقطة تلقائياً.', function (f, show) {
        clearMedia('coverPoster'); /* a failed frame grab must never leave the previous cover's image behind */
        putFile('cover', 'media/cover.' + (ext(f.name) || 'mp4'), f);
        framePoster(f, function (b) { if (b) putFile('coverPoster', 'media/cover-poster.jpg', b); else status('تعذّر استخراج صورة من الفيديو، سيعمل الغلاف بدونها.', true); show(); schedule(); });
        state.cfg.media.coverType = 'video'; coverType.value = 'video'; show(); schedule();
      }),
      media('خلفية الصفحة (فيديو أو صورة)', 'bg', 'video/mp4,video/webm,image/*', 'فيديو خفيف يتكرر خلف الأوراق، أو صورة ثابتة.', function (f, show) {
        clearMedia('bg'); clearMedia('bgWebm'); clearMedia('bgPoster');
        if (/^image\//.test(f.type)) { putFile('bgPoster', 'media/bg-poster.' + (ext(f.name) || 'jpg'), f); show(); schedule(); return; }
        putFile('bg', 'media/bg.' + (ext(f.name) || 'mp4'), f);
        framePoster(f, function (b) { if (b) putFile('bgPoster', 'media/bg-poster.jpg', b); show(); schedule(); });
        show(); schedule();
      }),
      media('الموسيقى (MP3)', 'music', 'audio/*', 'تبدأ مع أول نقرة على الغلاف. تأكد من أن لديك حق استخدامها.', function (f, show) {
        putFile('music', 'media/music.' + (ext(f.name) || 'mp3'), f); state.cfg.media.musicEnabled = true; show(); schedule();
      }),
      check('تشغيل الموسيقى', 'media.musicEnabled'),
      num('مستوى الصوت (0.1 – 1)', 'media.musicVolume', 0.1, 1, 0.05)
    ]));
    return F;
  }

  /* ---------- ZIP (store only) ---------- */
  var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(entries) { // entries: [{name, data:Uint8Array}]
    var enc = new TextEncoder(), parts = [], cd = [], off = 0, d = new Date();
    var dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    entries.forEach(function (e) {
      var nm = enc.encode(e.name), crc = crc32(e.data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
      h.setUint32(14, crc, true); h.setUint32(18, e.data.length, true); h.setUint32(22, e.data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, nm, e.data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
      c.setUint32(16, crc, true); c.setUint32(20, e.data.length, true); c.setUint32(24, e.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cd.push(c.buffer, nm);
      off += 30 + nm.length + e.data.length;
    });
    var cdLen = cd.reduce(function (a, b) { return a + b.byteLength; }, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cdLen, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [end.buffer]), { type: 'application/zip' });
  }
  function blobBytes(b) { return b.arrayBuffer().then(function (a) { return new Uint8Array(a); }); }
  function strBytes(s) { return new TextEncoder().encode(s); }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ---------- export ---------- */
  function names(c) { return c.hero.name1 + (c.hero.name2 ? ' ' + c.hero.connector + ' ' + c.hero.name2 : ''); }
  function dateLabel(c) {
    if (c.hero.dateText) return c.hero.dateText;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(c.event.start || ''); return m ? m[3] + ' · ' + m[2] + ' · ' + m[1] : '';
  }
  function loadImg(src) { return new Promise(function (res) { var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  /* Link-preview image: the middle band of the cover (full width, 1200x630) with the title at the bottom,
     the same look as the hand-built /invites/kamal preview. Falls back to the page background, then plain paper. */
  function makeOg(c, coverSrc) {
    return Promise.all([loadImg(coverSrc), (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 80px Amiri')]).catch(function () { }) : Promise.resolve())]).then(function (r) {
      var W = 1200, H = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d'), img = r[0];
      x.fillStyle = c.theme.paper; x.fillRect(0, 0, W, H);
      if (img) {
        /* cover-fit by width, then show the vertical middle of it (a landscape cover simply fills the frame) */
        var s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
        x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      }
      var title = c.meta.title || ((c.hero.occasion ? c.hero.occasion + ' ' : '') + names(c)).trim();
      if (title) {
        var g = x.createLinearGradient(0, H - 190, 0, H); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, c.theme.paper); g.addColorStop(1, c.theme.paper);
        x.fillStyle = g; x.fillRect(0, H - 190, W, 190);
        x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = c.theme.olive; var fs = 72; x.font = '700 ' + fs + 'px Amiri, serif';
        while (x.measureText(title).width > W - 160 && fs > 36) { fs -= 4; x.font = '700 ' + fs + 'px Amiri, serif'; }
        x.fillText(title, W / 2, H - 62);
      }
      return new Promise(function (res) { cv.toBlob(res, 'image/jpeg', 0.86); });
    });
  }
  function indexHtml(c, slug) {
    var title = c.meta.title || ((c.hero.occasion ? c.hero.occasion + ' ' : '') + names(c)).trim() || 'دعوة';
    var desc = c.meta.description || [dateLabel(c), c.location.venue].filter(Boolean).join(' · ') || title;
    var url = SITE + '/invites/' + slug, img = url + '/og-image.jpg';
    return '<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
      '<title>' + esc(title) + '</title>\n<meta name="robots" content="noindex,nofollow">\n<meta name="description" content="' + esc(desc) + '">\n' +
      '<meta property="og:type" content="website">\n<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n' +
      '<meta property="og:image" content="' + img + '">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:url" content="' + url + '">\n' +
      '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="' + img + '">\n' +
      '<style>html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Cinzel:wght@400;600&family=Katibeh&family=Lateef:wght@400;700&family=Reem+Kufi:wght@400;700&family=Mirza:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">\n' +
      '<link rel="stylesheet" href="/invites/_template/invite.css">\n</head>\n<body>\n<noscript>يتطلب عرض الدعوة تفعيل JavaScript.</noscript>\n<script src="/invites/_template/invite.js"></script>\n</body>\n</html>\n';
  }
  function readme(slug) {
    return 'دعوة: ' + slug + '\n\nطريقة النشر:\n1) فكّ هذا الملف داخل المجلد public/invites/ في مستودع الموقع ليصبح المسار public/invites/' + slug + '/index.html\n' +
      '2) ارفع التغيير إلى GitHub (commit + push) وادمجه في الفرع الرئيسي.\n3) بعد نشر Vercel يعمل الرابط: ' + SITE + '/invites/' + slug + '\n\n' +
      'ملاحظات:\n- لا تحذف المجلد public/invites/_template فجميع الدعوات تعتمد عليه في التصميم.\n- لتعديل الدعوة لاحقاً عدّل ملف config.json أو افتحه في المنشئ (فتح إعدادات) ثم أعد التصدير.\n' +
      '- إن غيّرت الصورة بعد مشاركة الرابط، قد تحتاج واتساب وقتاً لتحديث المعاينة.\n';
  }
  function precheck() {
    var slug = state.slug;
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) { status('اسم الرابط غير صالح: استخدم حروفاً إنجليزية صغيرة وأرقاماً وشرطة (حرفان على الأقل).', true); $('form').querySelector('details').open = true; return null; }
    var c = clone(state.cfg), warns = [], m = c.media;
    if (/^\/invites\/_template\/media\/cover/.test(m.cover || '') && m.coverType === 'video') warns.push('غلاف الدعوة هو الفيديو التجريبي (يحمل أحرف R & Z). ارفع غلافاً خاصاً بالعميل أو اختر «بطاقة بسيطة».');
    if (!String(c.rsvp.whatsapp || '').replace(/\D/g, '') && c.rsvp.enabled) warns.push('لم تُدخل رقم واتساب: لن تصلك ردود الحضور.');
    if (!c.hero.name1) warns.push('الاسم الأول فارغ.');
    if (!c.event.start) warns.push('لم تحدد تاريخ الحفل.');
    if (c.hero.name1 === 'ريما' || c.hero.name1 === 'زياد') warns.push('ما زالت الأسماء التجريبية (ريما وزياد).');
    if (warns.length && !confirm('تنبيهات قبل المتابعة:\n\n• ' + warns.join('\n• ') + '\n\nهل تريد المتابعة؟')) return null;
    return c;
  }
  function exportZip() {
    var c = precheck(); if (!c) return;
    var slug = state.slug, m = c.media;
    status('جاري تجهيز الملفات…');
    var entries = [], jobs = [], bundled = {};
    c.stickers = (c.stickers || []).filter(function (s) {
      if (!s || !s.src) return false;
      if (files[s.src]) { var nm = s.src; jobs.push(blobBytes(files[nm]).then(function (b) { if (!bundled[nm]) { bundled[nm] = 1; entries.push({ name: slug + '/' + nm, data: b }); } })); return true; }
      return !/^media\//.test(s.src);
    });
    ['cover', 'coverPoster', 'bg', 'bgWebm', 'bgPoster', 'music', 'customFont'].forEach(function (k) {
      var v = m[k]; if (typeof v !== 'string' || !v) return;
      if (/^\/invites\/_template\/media\//.test(v)) {
        var rel = 'media/' + v.split('/').pop();
        jobs.push(fetch(v).then(function (r) { if (!r.ok) throw new Error(v); return r.blob(); }).then(blobBytes).then(function (b) { if (!bundled[rel]) { bundled[rel] = 1; entries.push({ name: slug + '/' + rel, data: b }); } m[k] = rel; }));
      } else if (files[v]) {
        jobs.push(blobBytes(files[v]).then(function (b) { if (!bundled[v]) { bundled[v] = 1; entries.push({ name: slug + '/' + v, data: b }); } }));
      } else if (!/^https?:\/\//i.test(v)) m[k] = '';
    });
    Promise.all(jobs).then(function () {
      var bgSrc = urls[state.cfg.media.coverPoster] || state.cfg.media.coverPoster || urls[state.cfg.media.bgPoster] || state.cfg.media.bgPoster;
      return makeOg(c, bgSrc);
    }).then(function (og) {
      return blobBytes(og).then(function (ob) {
        entries.push({ name: slug + '/og-image.jpg', data: ob });
        entries.push({ name: slug + '/index.html', data: strBytes(indexHtml(c, slug)) });
        entries.push({ name: slug + '/config.json', data: strBytes(JSON.stringify(c, null, 2) + '\n') });
        entries.push({ name: slug + '/README.txt', data: strBytes(readme(slug)) });
        entries.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        download(zip(entries), slug + '.zip');
        status('تم تنزيل ' + slug + '.zip — فكّه داخل public/invites/ (التفاصيل في README داخل الملف).');
      });
    }).catch(function (e) { status('فشل التصدير: ' + (e && e.message || e), true); });
  }

  /* ---------- save straight into the site (when hosted by the admin page) ---------- */
  function saveToSite() {
    var c = precheck(); if (!c) return;
    status('جاري الحفظ ورفع الملفات… قد يستغرق دقيقة');
    var up = {}, m = c.media;
    c.stickers = (c.stickers || []).filter(function (s) {
      if (!s || !s.src) return false;
      if (files[s.src]) { up[s.src] = files[s.src]; return true; }
      return !/^media\//.test(s.src);
    });
    ['cover', 'coverPoster', 'bg', 'bgWebm', 'bgPoster', 'music', 'customFont'].forEach(function (k) {
      var v = m[k]; if (!v) return;
      if (files[v]) up[v] = files[v]; else if (/^media\//.test(v)) m[k] = '';
    });
    var bgSrc = urls[state.cfg.media.coverPoster] || state.cfg.media.coverPoster || urls[state.cfg.media.bgPoster] || state.cfg.media.bgPoster;
    makeOg(c, bgSrc).then(function (og) {
      up['og-image.jpg'] = og; c.ogImage = 'og-image.jpg';
      var id = ++reqId; pending[id] = true;
      window.parent.postMessage({ type: 'zaytora-builder-save', requestId: id, slug: state.slug, title: c.meta.title || ((c.hero.occasion ? c.hero.occasion + ' ' : '') + names(c)).trim(), config: c, files: up }, location.origin);
    }).catch(function (e) { status('فشل التجهيز: ' + (e && e.message || e), true); });
  }
  $('btn-save-site').addEventListener('click', saveToSite);
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    var d = e.data;
    if (d.type === 'zaytora-builder-host') {
      host = true; $('btn-save-site').hidden = false; $('btn-export').classList.remove('primary'); if (state.cfg) buildForm();
    } else if (d.type === 'zaytora-builder-load' && d.config) {
      Object.keys(files).forEach(function (k) { URL.revokeObjectURL(urls[k]); }); files = {}; urls = {};
      state.editing = d.slug || ''; applyCfg(d.slug || '', d.config); status('تم فتح الدعوة للتعديل.');
    } else if (d.type === 'zaytora-builder-saved' && pending[d.requestId]) {
      delete pending[d.requestId];
      if (d.ok) {
        Object.keys(files).forEach(function (k) { URL.revokeObjectURL(urls[k]); }); files = {}; urls = {};
        state.editing = d.slug; applyCfg(d.slug, d.config); status('تم حفظ الدعوة ✓ — الرابط: ' + SITE + '/invites/p/' + d.slug);
      } else status('تعذّر الحفظ: ' + (d.error || 'خطأ غير معروف'), true);
    }
  });

  /* ---------- config save / open / reset ---------- */
  function saveCfg() {
    var c = clone(state.cfg); Object.keys(c.media).forEach(function (k) { if (files[c.media[k]]) c.media[k] = c.media[k]; });
    download(new Blob([JSON.stringify({ slug: state.slug, config: c }, null, 2)], { type: 'application/json' }), (state.slug || 'invite') + '-settings.json');
    status('حُفظت الإعدادات. الصور والفيديو والموسيقى المرفوعة لا تُحفظ فيها، أعد رفعها عند الفتح.');
  }
  function applyCfg(slug, cfg) {
    state.slug = slug || ''; state.cfg = sanitize(deepMerge(clone(state.sample), cfg)); buildForm(); pushPreview(); saveDraft();
  }
  $('btn-export').addEventListener('click', exportZip);
  $('btn-save-cfg').addEventListener('click', saveCfg);
  $('btn-reset').addEventListener('click', function () {
    if (!confirm('بدء دعوة جديدة؟ ستُمسح التعديلات الحالية.')) return;
    Object.keys(files).forEach(function (k) { URL.revokeObjectURL(urls[k]); }); files = {}; urls = {};
    state.editing = ''; /* a new invitation has no locked link, even after editing or saving another one */
    applyCfg('', clone(state.sample)); status('');
  });
  $('file-cfg').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) { var j = JSON.parse(t); applyCfg(j.slug || '', j.config || j); status('تم فتح الإعدادات. أعد رفع الوسائط إن لزم.'); }).catch(function () { status('ملف الإعدادات غير صالح.', true); });
    e.target.value = '';
  });

  /* ---------- init ---------- */
  fetch(TPL + 'config.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (sample) {
    state.sample = sample;
    var draft = null; try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { /* ignore */ }
    if (draft && draft.cfg) { state.slug = draft.slug || ''; state.cfg = sanitize(deepMerge(clone(sample), draft.cfg)); } else { state.cfg = clone(sample); }
    buildForm(); pushPreview();
    if (window.parent !== window) window.parent.postMessage({ type: 'zaytora-builder-hello' }, location.origin);
  }).catch(function () { status('تعذّر تحميل النموذج.', true); });
})();
