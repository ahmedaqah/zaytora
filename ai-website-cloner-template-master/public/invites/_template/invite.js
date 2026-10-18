/* ZAYTORA private invitation renderer.
   One shared script for every hand-built invitation: the page only carries its <head> (title and
   link-preview tags) and loads this file; every text, date, colour, image, video and song comes from
   the invitation's own config.json (see /admin/invite-builder). In the builder's preview the config
   arrives by postMessage instead (?preview=1). */
(function () {
  'use strict';

  var TPL = '/invites/_template/';
  var PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
  var BASE = location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');

  /* ---------- defaults (labels only; a config may override any of them) ---------- */
  var DEF = {
    meta: { title: '', description: '' },
    theme: { paper: '#f0e3d3', gold: '#a8832f', goldBright: '#c8a24a', olive: '#3b5233', brown: '#5b4636' },
    style: { nameScale: 1, textScale: 1 },
    media: {
      coverType: 'video', cover: '', coverPoster: '', bg: '', bgWebm: '', bgPoster: '',
      music: '', musicEnabled: true, musicVolume: 0.5, customFont: ''
    },
    ui: { coverHint: 'اضغط لفتح الدعوة', scrollHint: 'اسحب للأسفل', musicLabel: 'تشغيل أو إيقاف الموسيقى', ctaText: 'أعجبتك الدعوة؟ اصنع دعوتك الرقمية' },
    hero: {
      bismillah: '', eyebrow: '', name1: '', name2: '', connector: '&', occasion: '',
      dateText: '', quote: '', verse: '', intro: ''
    },
    event: { start: '', end: '', utcOffset: '+00:00' },
    countdown: { enabled: true, title: 'يبدأ الاحتفال بعد', labels: ['يوم', 'ساعة', 'دقيقة', 'ثانية'] },
    schedule: { enabled: true, title: 'موعد الحفل', tip: 'اضغط على أي فقرة لمعرفة التفاصيل', items: [] },
    location: { enabled: true, title: 'الموقع', venue: '', venueLang: '', venueEn: '', address: '', mapUrl: '', mapLabel: 'افتح الخريطة' },
    notes: { enabled: true, title: 'تعليمات خاصة', items: [] },
    rsvp: {
      enabled: true, title: 'تأكيد الحضور', intro: '', whatsapp: '', whatsapp2: '', maxGuests: 6, showGuests: true,
      nameLabel: 'الاسم', attendLabel: 'هل ستحضر؟', yesLabel: 'يشرفني الحضور', noLabel: 'أعتذر عن الحضور',
      guestsLabel: 'عدد الحضور', noteLabel: 'كلمة لأصحاب الدعوة (اختياري)', button: 'تأكيد عبر واتساب',
      nameError: 'اكتب اسمك أولاً.', thanksYes: 'شكراً {name}، سعدنا بتأكيدك.',
      thanksNo: 'شكراً {name}، سنفتقدك ونقدّر ردّك.', thanksHint: 'رسالتك جاهزة في واتساب، اضغط «إرسال» هناك لتصلنا.',
      openWhatsapp: 'افتح واتساب', messageHeader: 'تأكيد حضور — {occasion} {names}',
      msgName: 'الاسم', msgAttend: 'الحضور', msgYes: 'سأحضر', msgNo: 'أعتذر عن الحضور',
      msgGuests: 'عدد الحضور', msgNote: 'كلمة'
    },
    closing: { latin: '', text: '', sign: '', card: { enabled: false, frame: '', letter: '', letterX: 50, letterY: 21.6, letterSize: 1, img: '', imgX: 50, imgY: 21.6, imgW: 22, name1: '', name2: '', amp: '&', date: '', color: '#a8832f' } },
    footer: '',
    layout: { mode: 'classic' },
    royal: {
      bismillah: 'بسم الله الرحمن الرحيم', invite: '', middle: '',
      right: { title: 'السيد', father: '', rel: 'نجله', extra: '', name: '' },
      left: { title: 'السيد', father: '', rel: 'ابنته', extra: '', name: '' },
      showDate: true,
      fonts: { bismillah: 'katibeh', invite: 'amiri', middle: 'katibeh', titles: 'katibeh', father: 'katibeh', names: 'katibeh' },
      scales: { bismillah: 1, invite: 1, middle: 1, family: 1, names: 1 },
      colors: { text: '#4a3b30', names: '#2a1d15' },
      anim: { type: 'rise', duration: 1.8, gap: 0.55, delay: 0.5 },
      paperOpacity: 1, paperStyle: 'columns', customFonts: [], useImages: true, day: '', papers: {},
      customPaper: { top: '', mid: '', bot: '', t: 48.8, b: 46.5, mt: 54.7, padX: 18, padY: 17 },
      veil: { on: false, color: '#120608', top: 0.42, mid: 0.22, bot: 0.38 },
      deco: {
        enabled: false,
        mono: { on: true, kind: 'letter', letter: '', font: 'katibeh', color: '#a8832f', size: 1, src: '' },
        orn: { on: true, under: true, src: '' },
        swan: { on: true, w: 38, src: '' },
        secs: { countdown: true, schedule: true, location: true, notes: true, rsvp: true, closing: true }
      },
      fx: { strokeW: 0, strokeColor: '#ffffff', shadowType: 'none', shadowColor: '#000000', shadowSize: 6, shadowOpacity: 0.35 }
    },
    stickers: []
  };

  /* font choices for the royal opening scene (keys are what the builder stores) */
  var FONTS = {
    katibeh: "'Katibeh','Aref Ruqaa','Amiri',serif",
    aref: "'Aref Ruqaa','Amiri',serif",
    amiri: "'Amiri','Georgia',serif",
    lateef: "'Lateef','Amiri',serif",
    scheherazade: "'Scheherazade New','Amiri',serif",
    mirza: "'Mirza','Amiri',serif",
    reem: "'Reem Kufi','Amiri',sans-serif",
    cinzel: "'Cinzel','Georgia',serif",
    custom: "'ZInvCustom','Katibeh','Amiri',serif"
  };
  var ROYAL = false;
  function fontOf(v) { if (/^cf:[\w-]+$/.test(v || '')) return "'ZF_" + v.slice(3) + "','Katibeh','Amiri',serif"; return FONTS[v] || FONTS.katibeh; }
  var CARD = {};

  var NOTE_ICONS = {
    'camera-off': '<path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9z"/><circle cx="12" cy="12.5" r="3.6"/><path class="slash" d="M3 3 21 21"/>',
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    gift: '<path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2z"/><path d="M12 21V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    dress: '<path d="M8 3 3 7l3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0z"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>',
    car: '<path d="M5 16l1.5-6h11L19 16"/><path d="M3 16h18v3H3z"/><path d="M7 19v2"/><path d="M17 19v2"/><path d="M7.5 13.2h.01"/><path d="M16.5 13.2h.01"/>',
    heart: '<path d="M12 20.5C5 15 3 11.5 3 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 1.5c0 3-2 6.5-9 12z"/>'
  };

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl(s) { return esc(s).replace(/\r?\n/g, '<br>'); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(def, src) {
    var out = {};
    Object.keys(def).forEach(function (k) {
      var d = def[k], s = src ? src[k] : undefined;
      if (isObj(d)) out[k] = merge(d, isObj(s) ? s : {});
      else if (Array.isArray(d)) out[k] = Array.isArray(s) ? s : d.slice();
      else out[k] = (s === undefined || s === null) ? d : s;
    });
    // keep unknown keys the config carries (forward compatibility)
    if (src) Object.keys(src).forEach(function (k) { if (!(k in out)) out[k] = src[k]; });
    return out;
  }
  function hex2rgb(h) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function css(a) { return 'rgb(' + a.join(',') + ')'; }
  function resolve(v, def) {
    v = String(v || '').trim();
    if (!v) return def ? TPL + 'media/' + def : '';
    if (/^(https?:|blob:|data:|\/)/i.test(v)) return v;
    return BASE + v.replace(/^\.?\//, '');
  }
  function fmt(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }
  function parseStart(ev) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String((ev && ev.start) || ''));
    if (!m) return null;
    var off = /^[+-]\d{2}:\d{2}$/.test(ev.utcOffset || '') ? ev.utcOffset : '+00:00';
    var ms = Date.parse(m[1] + '-' + m[2] + '-' + m[3] + 'T' + (m[4] || '00') + ':' + (m[5] || '00') + ':00' + off);
    return { y: m[1], mo: m[2], d: m[3], ms: isNaN(ms) ? null : ms };
  }

  /* ---------- rendering ---------- */
  var live = { timers: [], unbind: [], aud: null };
  function teardown() {
    live.timers.forEach(function (t) { clearInterval(t); clearTimeout(t); });
    live.unbind.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
    live.timers = []; live.unbind = [];
    if (live.aud) { try { live.aud.pause(); } catch (e) { /* ignore */ } live.aud = null; }
  }
  function on(el, ev, fn, opts) {
    el.addEventListener(ev, fn, opts);
    live.unbind.push(function () { el.removeEventListener(ev, fn, opts); });
  }
  function title(t) {
    return '<h2 class="title"><svg aria-hidden="true"><use href="#swirl"/></svg>' + esc(t) + '<svg aria-hidden="true"><use href="#swirl"/></svg></h2>' + decoUnder();
  }
  /* section decoration (royal mode, opt-in): monogram letter + ornament above, swan + ornament below, every piece switchable */
  var DECO = null;
  function decoImg(src, def) { return src ? resolve(src) : TPL + 'img/' + def; }
  function decoOn(key) { return !!(DECO && DECO.enabled && DECO.secs && DECO.secs[key] !== false); }
  function decoUnder() {
    if (!ROYAL || !DECO || !DECO.enabled || !DECO.orn || DECO.orn.on === false || DECO.orn.under === false) return '';
    return '<img class="dc-o2" src="' + esc(decoImg(DECO.orn.src, 'deco-orn.webp')) + '" alt="" draggable="false">';
  }
  function decoTop(key, firstLetter) {
    if (!ROYAL || !decoOn(key)) return '';
    var D = DECO, h = '';
    if (D.mono && D.mono.on !== false) {
      if (D.mono.kind === 'image' && D.mono.src) h += '<img class="dc-mi" src="' + esc(resolve(D.mono.src)) + '" alt="" draggable="false">';
      else {
        var L = String(D.mono.letter || firstLetter || '').trim().slice(0, 3);
        if (L) h += '<span class="dc-m" style="font-family:' + fontOf(D.mono.font) + ';color:' + (hex2rgb(D.mono.color) ? D.mono.color : '#a8832f') + ';font-size:calc(' + (18 * num(D.mono.size, 1, 0.4, 2.5)).toFixed(2) + 'cqw)">' + esc(L) + '</span>';
      }
    }
    if (D.orn && D.orn.on !== false) h += '<img class="dc-o" src="' + esc(decoImg(D.orn.src, 'deco-orn.webp')) + '" alt="" draggable="false">';
    return h ? '<div class="dc dc-top" aria-hidden="true">' + h + '</div>' : '';
  }
  function decoBottom(key) {
    if (!ROYAL || !decoOn(key)) return '';
    var D = DECO, h = '';
    if (D.swan && D.swan.on !== false) h += '<img class="dc-s" src="' + esc(decoImg(D.swan.src, 'deco-swan.webp')) + '" alt="" draggable="false" style="width:' + num(D.swan.w, 38, 8, 90) + 'cqw">';
    if (D.orn && D.orn.on !== false) h += '<img class="dc-o" src="' + esc(decoImg(D.orn.src, 'deco-orn.webp')) + '" alt="" draggable="false">';
    return h ? '<div class="dc dc-bot" aria-hidden="true">' + h + '</div>' : '';
  }
  function fl(cls, img, w, h) {
    if (ROYAL) return '';
    return '<img class="fl ' + cls + '" src="' + TPL + 'img/' + img + '" alt="" width="' + w + '" height="' + h + '">';
  }

  function applyTheme(t) {
    var r = document.documentElement.style;
    var paper = hex2rgb(t.paper), gold = hex2rgb(t.gold), gb = hex2rgb(t.goldBright), ol = hex2rgb(t.olive), br = hex2rgb(t.brown);
    if (paper) { r.setProperty('--paper', t.paper); r.setProperty('--pp', paper.join(',')); }
    if (gold) { r.setProperty('--gold', t.gold); r.setProperty('--gd', gold.join(',')); }
    if (gb) { r.setProperty('--gold-bright', t.goldBright); r.setProperty('--gb', gb.join(',')); r.setProperty('--goldlt', css(mix(gb, [255, 255, 255], 0.28))); }
    if (ol) { r.setProperty('--olive', t.olive); r.setProperty('--ol', ol.join(',')); r.setProperty('--btn1', css(mix(ol, [160, 190, 90], 0.45))); }
    if (br) r.setProperty('--brown', t.brown);
  }

  /* font size: 1 = the designed size; names and texts scale separately (CSS reads --ns / --ts) */
  function applyScale(st) {
    var r = document.documentElement.style;
    function k(v, lo, hi) { v = parseFloat(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 1; }
    st = st || {};
    r.setProperty('--ns', String(k(st.nameScale, 0.6, 1.6)));
    r.setProperty('--ts', String(k(st.textScale, 0.7, 1.5)));
  }

  function num(v, d, lo, hi) { v = parseFloat(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
  function wings(t) { return '<span class="r-w"><svg aria-hidden="true"><use href="#rwing"/></svg><span>' + esc(t) + '</span><svg aria-hidden="true"><use href="#rwing"/></svg></span>'; }
  /* stickers: free images / GIFs / transparent PNGs / short videos placed by percentage inside the scene or the paper sheet */
  function stickersHtml(list, anchor) {
    return list.map(function (s, i) {
      if (!s || !s.src || (s.anchor === 'page' ? 'page' : 'scene') !== anchor) return '';
      var url = resolve(s.src); if (!url) return '';
      var st = 'left:' + num(s.x, 50, -30, 130) + '%;top:' + num(s.y, 20, -30, 130) + '%;width:' + num(s.w, 30, 3, 200) + 'cqw;opacity:' + num(s.op, 1, 0.05, 1) +
        ';--rot:' + num(s.rot, 0, -180, 180) + 'deg;z-index:' + (s.layer === 'back' ? 1 : 3);
      var inner = s.kind === 'video'
        ? '<video src="' + esc(url) + '" autoplay muted loop playsinline preload="auto"></video>'
        : '<img src="' + esc(url) + '" alt="" draggable="false">';
      return '<div class="stk' + (s.float ? ' flo' : '') + '" data-i="' + i + '" style="' + st + '">' + inner + '</div>';
    }).join('');
  }
  function fontCss(M, list) {
    function face(fam, src) {
      var u = resolve(src); if (!u) return '';
      return '@font-face{font-family:"' + fam + '";src:url("' + u.replace(/["\\\n]/g, '') + '");font-display:swap}';
    }
    var css = face('ZInvCustom', M.customFont);
    (Array.isArray(list) ? list : []).forEach(function (f) { if (f && /^[\w-]+$/.test(f.id || '')) css += face('ZF_' + f.id, f.src); });
    return css ? '<style>' + css + '</style>' : '';
  }
  /* outline + shadow for the opening scene's texts */
  function fxVars(fx) {
    fx = fx || {};
    var w = num(fx.strokeW, 0, 0, 10), S = num(fx.shadowSize, 6, 0, 30), ty = fx.shadowType || 'none';
    var rgb = hex2rgb(fx.shadowColor) || [0, 0, 0], col = 'rgba(' + rgb.join(',') + ',' + num(fx.shadowOpacity, 0.35, 0, 1) + ')';
    var sh = 'none';
    if (S > 0) {
      if (ty === 'soft') sh = '0 ' + (S * 0.3) + 'px ' + S + 'px ' + col;
      else if (ty === 'glow') sh = '0 0 ' + S + 'px ' + col + ',0 0 ' + (S * 2) + 'px ' + col;
      else if (ty === 'hard') sh = (S * 0.3) + 'px ' + (S * 0.3) + 'px 0 ' + col;
      else if (ty === 'double') sh = (S * 0.25) + 'px ' + (S * 0.25) + 'px 0 ' + col + ',' + (S * 0.6) + 'px ' + (S * 0.6) + 'px ' + (S * 0.4) + 'px ' + col;
      else if (ty === 'long') { var a = []; for (var i = 1; i <= Math.round(S); i++) a.push(i * 0.5 + 'px ' + i * 0.5 + 'px 0 ' + col); sh = a.join(','); }
    }
    return ';--fx-sh:' + sh + ';--fx-w:' + w + 'px;--fx-c:' + (hex2rgb(fx.strokeColor) ? fx.strokeColor : '#ffffff');
  }
  function sceneHtml(c, dateText, names) {
    var R = c.royal, H = c.hero, F = R.fonts || {}, SC = R.scales || {}, CO = R.colors || {}, A = R.anim || {};
    var types = ['rise', 'fade', 'drop', 'zoom', 'blur', 'slide'];
    var ty = types.indexOf(A.type) >= 0 ? A.type : 'rise';
    function ff(k) { var v = F[k]; if (/^cf:[\w-]+$/.test(v || '')) return "'ZF_" + v.slice(3) + "','Katibeh','Amiri',serif"; return FONTS[v] || FONTS.katibeh; }
    var vars = '--f-b:' + ff('bismillah') + ';--f-i:' + ff('invite') + ';--f-m:' + ff('middle') + ';--f-t:' + ff('titles') + ';--f-f:' + ff('father') + ';--f-n:' + ff('names') +
      ';--sb:' + num(SC.bismillah, 1, 0.5, 1.8) + ';--si:' + num(SC.invite, 1, 0.5, 1.8) + ';--sm:' + num(SC.middle, 1, 0.5, 1.8) + ';--sf:' + num(SC.family, 1, 0.5, 1.8) + ';--sn:' + num(SC.names, 1, 0.5, 1.8) +
      ';--r-text:' + (hex2rgb(CO.text) ? CO.text : '#4a3b30') + ';--r-names:' + (hex2rgb(CO.names) ? CO.names : '#2a1d15') +
      fxVars(R.fx) + ';--ad:' + num(A.duration, 1.8, 0.3, 6) + 's;--rg:' + num(A.gap, 0.55, 0, 3) + 's;--rd:' + num(A.delay, 0.5, 0, 6) + 's';
    var i = 0;
    function el(cls, inner, tag) { var n = i++; return '<' + (tag || 'p') + ' class="r-el ' + cls + '" style="--i:' + n + '">' + inner + '</' + (tag || 'p') + '>'; }
    /* the two family columns share one grid: every row (title, father, ornament, [middle text], relation, extra, name)
       lines up across both columns, and the middle text pushes everything under it down together */
    function fam() {
      var D = [R.right || {}, R.left || {}], cls = ['rc-r', 'rc-l'], fb = [H.name1, H.name2], idx = [i++, i++];
      function row(fn, extra) {
        return D.map(function (d, k) { return '<div class="r-el r-c ' + cls[k] + (extra || '') + '" style="--i:' + idx[k] + '">' + fn(d, k) + '</div>'; }).join('');
      }
      var g = row(function (d) { return d.title ? '<p class="r-t">' + wings(d.title) + '</p>' : ''; });
      g += row(function (d) { return d.father ? '<p class="r-f">' + nl(d.father) + '</p>' : ''; });
      g += row(function () { return '<svg class="r-orn" aria-hidden="true"><use href="#rorn"/></svg>'; });
      if (R.middle) g += '<div class="r-el r-mid" style="--i:' + (i++) + '"><p class="r-m">' + nl(R.middle) + '</p></div>';
      g += row(function (d) { return d.rel ? '<p class="r-t r-rel">' + wings(d.rel) + '</p>' : ''; });
      if (D[0].extra || D[1].extra) g += row(function (d) { return d.extra ? '<p class="r-x">' + nl(d.extra) + '</p>' : ''; });
      g += row(function (d, k) { return '<p class="r-n">' + esc(d.name || fb[k]) + '</p>'; });
      return '<div class="r-fam">' + g + '</div>';
    }
    var h = '<section class="r-scene an-' + ty + '" id="rscene" style="' + vars + '">' + stickersHtml(c.stickers, 'scene') + '<div class="r-sc">';
    if (R.bismillah) h += el('r-bis', nl(R.bismillah));
    if (R.invite) h += el('r-inv', nl(R.invite));
    h += fam();
    if (R.showDate !== false && dateText) h += el('r-date', esc(dateText));
    return h + '</div></section>';
  }
  function layers() {
    if (CARD.custom) {
      var P = CARD.custom, bg = function (u) { return u ? ' style="background-image:url(\'' + esc(resolve(u)).replace(/'/g, '%27') + '\')"' : ''; };
      return '<div class="rl rl-p" aria-hidden="true"><i class="t"' + bg(P.top) + '></i><i class="m"' + bg(P.mid) + '></i><i class="b"' + bg(P.bot) + '></i></div>';
    }
    return ['rl-p', 'rl-f'].map(function (cls) { return '<div class="rl ' + cls + '" aria-hidden="true"><i class="t"></i><i class="m"></i><i class="b"></i></div>'; }).join('');
  }
  function paperStyle(R) {
    var st = ['columns', 'rose', 'gold', 'blank', 'custom'].indexOf(R.paperStyle) >= 0 ? R.paperStyle : 'columns';
    var P = R.customPaper || {};
    if (st === 'custom' && !(P.top && P.bot)) st = 'blank'; /* no paper uploaded yet: fall back to the blank one */
    return st;
  }
  function sheetOpen(c) {
    var R = c.royal, st = paperStyle(R), v = '--rpo:' + num(R.paperOpacity, 1, 0.1, 1);
    /* "columns" = one long continuous sheet; "rose" / "gold" = every section on its own card */
    if (st === 'columns') return '<div class="r-sheet rs-columns" style="' + v + '">' + layers() + stickersHtml(c.stickers, 'page') + '<div class="r-in">';
    if (st === 'custom') {
      var P = R.customPaper;
      v += ';--t:' + num(P.t, 48.8, 5, 150) + 'cqw;--b:' + num(P.b, 46.5, 5, 150) + 'cqw;--mt:' + num(P.mt, 54.7, 3, 300) + 'cqw;--px:' + num(P.padX, 18, 4, 40) + 'cqw;--py:' + num(P.padY, 17, 4, 50) + 'cqw';
    }
    return '<div class="r-cards rs-' + st + '" style="' + v + '">' + stickersHtml(c.stickers, 'page');
  }
  function sheetClose(c) { return paperStyle(c.royal) === 'columns' ? '</div></div>' : '</div>'; }
  function cardify(html) {
    return html.replace(/<section class="rsec"[\s\S]*?<\/section>/g, function (m) { return '<div class="r-card">' + layers() + '<div class="r-cin">' + m + '</div></div>'; });
  }

  /* closing card: frame image + monogram letter, two Latin names, date. Names shrink as they get longer. */
  function cardHtml(K, FL, start, dateText) {
    var rgb = hex2rgb(K.color) || [168, 131, 47];
    var g = 'linear-gradient(180deg,' + css(mix(rgb, [255, 255, 255], 0.3)) + ',' + css(rgb) + ' 55%,' + css(mix(rgb, [0, 0, 0], 0.28)) + ')';
    var frame = K.frame ? resolve(K.frame) : TPL + 'img/card-frame.webp';
    function nm(t) { var n = String(t || '').trim(); if (!n) return ''; var k = n.length <= 8 ? 1 : Math.max(0.5, 8 / n.length); return '<span class="cc-n" style="--k:' + k.toFixed(3) + '">' + esc(n) + '</span>'; }
    /* the top letter is optional (empty = none); it can also be a picture. Both can be moved and resized. */
    var L = String(K.letter || '').trim().slice(0, 3);
    var pos = function (x, y, dx, dy) { return 'left:' + num(x, dx, 0, 100) + '%;top:' + num(y, dy, 0, 100) + '%'; };
    var mono = L ? '<span class="cc-m" style="' + pos(K.letterX, K.letterY, 50, 21.6) + ';font-size:' + (34 * num(K.letterSize, 1, 0.3, 3)).toFixed(2) + 'cqw;font-family:' + fontOf((DECO && DECO.mono && DECO.mono.font) || 'katibeh') + '">' + esc(L) + '</span>' : '';
    if (K.img) mono += '<img class="cc-mi" src="' + esc(resolve(K.img)) + '" alt="" draggable="false" style="' + pos(K.imgX, K.imgY, 50, 21.6) + ';width:' + num(K.imgW, 22, 3, 100) + 'cqw">';
    var amp = (K.name1 && K.name2) ? '<span class="cc-amp">' + esc(K.amp || '&') + '</span>' : '';
    var d = String(K.date || '').trim();
    return '<div class="ccard" style="--cg:' + g + '"><img class="cc-fr" src="' + esc(frame) + '" alt="" draggable="false">' + mono +
      '<div class="cc-names">' + nm(K.name1) + amp + nm(K.name2) + '</div>' + (d ? '<span class="cc-d">' + esc(d) + '</span>' : '') + '</div>';
  }

  /* ===== "swans" look (layout.mode = 'swans'): a faithful rebuild of the original swan-lake invitation.
     The markup mirrors the reference design and swans.css carries its exact styling; every text, picture,
     colour and paper below is still read from the config so the builder can edit all of it. ===== */
  var SW = TPL + 'img/';
  function swansLook() { return document.body.classList.contains('swans'); }
  function swPx(n, d) { return (Math.round(n * 100) / 100) + (d || 'cqw'); }
  function swPiece(useImg, t, def, file, imgSt, txtSt, font) {
    t = String(t == null ? '' : t).trim(); if (!t) return '';
    if (useImg && t === def) return '<img class="cimg" src="' + SW + file + '" alt="' + esc(t) + '" style="' + imgSt + '" decoding="async">';
    return '<div style="font-family:' + font + ';' + txtSt + '">' + esc(t) + '</div>';
  }
  function swScene(c, dateText) {
    var R = c.royal, H = c.hero, F = R.fonts || {}, SC = R.scales || {}, CO = R.colors || {}, A = R.anim || {};
    var useImg = R.useImages !== false;
    var txt = hex2rgb(CO.text) ? CO.text : '#fbf3e6', nmc = hex2rgb(CO.names) ? CO.names : '#fbf3e6';
    var sb = num(SC.bismillah, 1, 0.5, 1.8), si = num(SC.invite, 1, 0.5, 1.8), sm = num(SC.middle, 1, 0.5, 1.8), sf = num(SC.family, 1, 0.5, 1.8), sn = num(SC.names, 1, 0.5, 1.8);
    function ff(k, d) { return fontOf(F[k] || d); }
    var h = '', bis = String(R.bismillah || '').trim();
    if (bis) {
      h += (useImg && bis === 'بسم الله الرحمن الرحيم')
        ? '<img class="cimg r-open a" style="--i:0;width:60cqw;margin-bottom:5cqw" src="' + SW + 'sw-bismillah.webp" alt="' + esc(bis) + '" decoding="async">'
        : '<div class="r-open a" style="--i:0;margin-bottom:5cqw;font-family:' + ff('bismillah', 'amiri') + ';font-size:' + swPx(8 * sb) + ';color:' + txt + '">' + nl(bis) + '</div>';
    }
    var lines = String(R.invite || '').split(/\r?\n/).filter(function (x) { return x.trim(); });
    if (lines.length) {
      h += '<div class="r-lines a" style="--i:1;margin-bottom:5cqw">' + lines.map(function (t, k) {
        var last = lines.length > 1 && k === lines.length - 1;
        return '<span style="font-family:' + ff('invite', 'amiri') + ';font-weight:700;font-size:' + swPx((last ? 7.6 : 5.6) * si) + ';color:' + (last ? '#f1dcc0' : txt) + (last ? ';margin-top:3.5cqw' : '') + '">' + esc(t) + '</span>';
      }).join('') + '</div>';
    }
    var D = [R.right || {}, R.left || {}], side = ['r', 'l'], defRel = ['نجله', 'ابنته'], fb = [H.name1, H.name2], tf = ff('titles', 'katibeh');
    var cols = D.map(function (d, k) {
      return '<div class="r-col" style="flex:0 0 41cqw">' +
        swPiece(useImg, d.title, 'السيد', 'sw-sayyid-' + side[k] + '.webp', 'width:29.52cqw', 'font-size:' + swPx(5.4 * sf) + ';color:' + txt, tf) +
        (d.father ? '<div style="margin-top:1.2cqw;font-family:' + ff('father', 'katibeh') + ';font-size:' + swPx(7 * sf) + ';color:' + txt + ';line-height:1.35;overflow-wrap:anywhere">' + nl(d.father) + '</div>' : '') +
        '<img class="cimg" src="' + SW + 'sw-div-' + side[k] + '.webp" alt="" style="width:33.62cqw;margin-top:2cqw" decoding="async"></div>';
    }).join('');
    h += '<div class="r-cols a" style="--i:2;gap:2cqw">' + cols + '</div>';
    if (R.middle) h += '<div class="r-mid a" style="--i:3;font-family:' + ff('middle', 'amiri') + ';font-size:' + swPx(6 * sm) + ';font-weight:700;color:' + txt + ';margin:5cqw 0">' + nl(R.middle) + '</div>';
    var cols2 = D.map(function (d, k) {
      return '<div class="r-col" style="flex:0 0 41cqw">' +
        swPiece(useImg, d.rel, defRel[k], 'sw-rel-' + side[k] + '.webp', 'height:4.4cqw;width:auto', 'font-size:' + swPx(4.4 * sf) + ';color:' + txt, tf) +
        '<div style="margin-top:2.5cqw;font-family:' + ff('names', 'katibeh') + ';font-size:' + swPx(11 * sn) + ';color:' + nmc + ';line-height:1.25;overflow-wrap:anywhere">' + esc(d.name || fb[k] || '') + '</div>' +
        (d.extra ? '<div class="r-x" style="margin-top:1cqw">' + nl(d.extra) + '</div>' : '') + '</div>';
    }).join('');
    h += '<div class="r-cols2 a" style="--i:4;gap:2cqw">' + cols2 + '</div>';
    if (R.showDate !== false && (dateText || R.day)) {
      h += '<div class="r-date2 a" style="--i:5;margin-top:6cqw">' + (R.day ? '<div class="r-day">' + esc(R.day) + '</div>' : '') + '<div class="r-dt" style="font-size:' + swPx(9) + '">' + esc(dateText) + '</div></div>';
    }
    var map = { rise: ['rise', 'up'], drop: ['rise', 'down'], slide: ['rise', 'left'], fade: ['fade'], zoom: ['soft'], blur: ['soft'], soft: ['soft'] };
    var m = map[A.type] || map.soft, dist = 18, tx = '0', ty = '0', sc = 1, bl = '0px';
    if (m[0] === 'soft') { sc = 0.96; bl = '6px'; ty = '8px'; }
    if (m[0] === 'rise') { if (m[1] === 'up') ty = dist + 'px'; else if (m[1] === 'down') ty = -dist + 'px'; else tx = dist + 'px'; }
    var vars = '--tx:' + tx + ';--ty:' + ty + ';--sc:' + sc + ';--bl:' + bl + ';--dur:' + num(A.duration, 1.2, 0.3, 6) + 's;--step:' + num(A.gap, 0.5, 0, 3) + 's;--start:' + num(A.delay, 0.4, 0, 6) + 's' + (R.fx && R.fx.shadowType && R.fx.shadowType !== 'none' ? fxVars(R.fx) : '');
    var hint = '<div class="r-scroll a" style="--i:6" aria-hidden="true"><span class="mouse"><i></i></span><span class="st">' + esc(c.ui.scrollHint) + '</span><span class="chev"></span></div>';
    return '<section class="royal" id="royal" aria-label="الدعوة" style="' + vars + '"><div class="stage" id="stage"><div class="mlayer ml-behind"></div>' +
      '<div class="mlayer ml-between">' + stickersHtml(c.stickers, 'scene') + '</div><div class="rcontent" id="rcontent" style="left:5%;right:5%;top:7%;bottom:12%">' + h + '</div><div class="mlayer ml-front"></div>' + hint + '</div></section>';
  }
  /* which paper each card sits on: the reference mix, or one kind for all (frame / blank / torn / your own upload) */
  function swKinds(R) {
    var ps = R.paperStyle, P = R.customPaper || {}, k = { countdown: 'frame', schedule: 'blank', location: 'torn', notes: 'torn', rsvp: 'torn' };
    if (['blank', 'frame', 'torn'].indexOf(ps) >= 0) Object.keys(k).forEach(function (x) { k[x] = ps; });
    else if (ps === 'custom' && P.top && P.bot) Object.keys(k).forEach(function (x) { k[x] = 'custom'; });
    var o = R.papers || {};
    Object.keys(k).forEach(function (x) { if (['frame', 'blank', 'torn', 'custom'].indexOf(o[x]) >= 0 && (o[x] !== 'custom' || (P.top && P.bot))) k[x] = o[x]; });
    return k;
  }
  function swMono(key, FL) {
    if (!decoOn(key)) return '';
    var D = DECO, h = '';
    if (D.mono && D.mono.on !== false) {
      if (D.mono.kind === 'image' && D.mono.src) h += '<img class="m" src="' + esc(resolve(D.mono.src)) + '" alt="" draggable="false">';
      else {
        var L = String(D.mono.letter || FL || '').trim().slice(0, 3);
        if (L) h += '<span class="m m-t" style="font-family:' + fontOf(D.mono.font) + ';color:' + (hex2rgb(D.mono.color) ? D.mono.color : '#111') + ';font-size:' + swPx(25 * num(D.mono.size, 1, 0.4, 2.5)) + '">' + esc(L) + '</span>';
      }
    }
    if (D.orn && D.orn.on !== false) h += '<img class="o" src="' + esc(decoImg(D.orn.src, 'deco-orn.webp')) + '" alt="" width="455" height="58" draggable="false">';
    return h ? '<div class="pmono" aria-hidden="true">' + h + '</div>' : '';
  }
  function swSwan(key) {
    if (!decoOn(key)) return '';
    var D = DECO, h = '';
    if (D.swan && D.swan.on !== false) h += '<img class="s" src="' + esc(decoImg(D.swan.src, 'deco-swan.webp')) + '" alt="" width="900" height="487" draggable="false" style=""width:' + swPx(num(D.swan.w, 38, 8, 90)) + '">';
    if (D.orn && D.orn.on !== false) h += '<img class="o" src="' + esc(decoImg(D.orn.src, 'deco-orn.webp')) + '" alt="" width="455" height="58" draggable="false">';
    return h ? '<div class="pswan" aria-hidden="true">' + h + '</div>' : '';
  }
  function swTitle(key, t) {
    var u = (decoOn(key) && DECO.orn && DECO.orn.on !== false && DECO.orn.under !== false) ? '<img class="o2" src="' + esc(decoImg(DECO.orn.src, 'deco-orn.webp')) + '" alt="" width="455" height="58" draggable="false">' : '';
    return '<h2 class="title"><svg aria-hidden="true"><use href="#swirl"/></svg>' + esc(t) + '<svg aria-hidden="true"><use href="#swirl"/></svg></h2>' + u;
  }
  var SW_RZ = {
    'rz-tr': ['sw-rz-tr.webp', 277, 404], 'rz-bl': ['sw-rz-bl.webp', 317, 379], 'rz-tl': ['sw-rz-tl.webp', 317, 379]
  };
  function swSec(key, kind, label, rz, inner, FL, CP) {
    var cls = 'paper' + (kind === 'torn' ? '' : ' fc') + (kind === 'blank' ? ' pk-blank' : '') + (kind === 'custom' ? ' pk-custom' : '') + ' sec-' + key;
    var st = '';
    if (kind === 'custom') st = ' style="--t:' + swPx(num(CP.t, 48.8, 5, 150)) + ';--b:' + swPx(num(CP.b, 46.5, 5, 150)) + ';--mt:' + swPx(num(CP.mt, 54.7, 3, 300)) + ';--px:' + swPx(num(CP.padX, 18, 4, 40)) + ';--py:' + swPx(num(CP.padY, 17, 4, 50)) + '"';
    function pc(u) { return u ? ' style="background-image:url(\'' + esc(resolve(u)).replace(/'/g, '%27') + '\')"' : ''; }
    var bg = kind === 'torn' ? '<div class="pbg" aria-hidden="true"></div>'
      : '<div class="fbg" aria-hidden="true"><div class="ft"' + (kind === 'custom' ? pc(CP.top) : '') + '></div><div class="fm"' + (kind === 'custom' ? pc(CP.mid || CP.top) : '') + '></div><div class="fb"' + (kind === 'custom' ? pc(CP.bot) : '') + '></div></div>';
    var fls = '';
    if (kind === 'torn' && !(DECO && DECO.rz === false)) fls = rz.map(function (r) { var f = SW_RZ[r]; return '<img class="fl rz ' + r + '" src="' + SW + f[0] + '" alt="" width="' + f[1] + '" height="' + f[2] + '">'; }).join('');
    return '<section class="' + cls + '" aria-label="' + esc(label) + '"' + st + '>' + bg + swMono(key, FL) + fls + inner.replace('<!--SWAN-->', swSwan(key)) + '</section>';
  }
  /* the map button is always shown: your link if there is one, otherwise a Google Maps search for the venue and address */
  function swMapBtn(L2) {
    var u = /^https?:\/\//i.test(L2.mapUrl) ? L2.mapUrl : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([L2.venueEn || L2.venue, L2.address].filter(Boolean).join(' '));
    return '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(L2.mapLabel || 'افتح الخريطة') + '</a>';
  }
  function swansBody(c, start, dateText, FL) {
    var R = c.royal, kinds = swKinds(R), CP = R.customPaper || {}, h = stickersHtml(c.stickers, 'page'), SEC = '';
    h += swScene(c, dateText);
    if (c.countdown.enabled && start && start.ms) {
      var L = c.countdown.labels;
      h += swSec('countdown', kinds.countdown, c.countdown.title, [], swTitle('countdown', c.countdown.title) +
        '<div class="count" id="count" role="timer" aria-live="off">' + ['d', 'h', 'm', 's'].map(function (id, i) { return '<div class="cell"><b id="' + id + '">00</b><span>' + esc(L[i] || '') + '</span></div>'; }).join('') + '</div><!--SWAN-->', FL, CP);
    }
    var items = c.schedule.items.filter(function (it) { return it && (it.title || it.time); });
    if (c.schedule.enabled && items.length) {
      h += swSec('schedule', kinds.schedule, c.schedule.title, ['rz-tr', 'rz-bl'], swTitle('schedule', c.schedule.title) + '<ul class="tl">' + items.map(function (it) {
        var d = !!it.detail;
        return '<li' + (it.rose ? ' class="rose"' : '') + '><span class="t">' + esc(it.time) + '</span><button class="e' + (d ? '' : ' nd') + '" type="button"' + (d ? ' aria-expanded="false"' : ' tabindex="-1"') + '><span class="nm">' + esc(it.title) + '</span>' +
          (d ? '<span class="dt"><span>' + nl(it.detail) + '</span></span>' : '') + '</button></li>';
      }).join('') + '</ul>' + (items.some(function (it) { return it.detail; }) && c.schedule.tip ? '<p class="tip">' + esc(c.schedule.tip) + '</p>' : '') + '<!--SWAN-->', FL, CP);
    }
    var L2 = c.location;
    if (L2.enabled && (L2.venue || L2.address || L2.mapUrl)) {
      h += swSec('location', kinds.location, L2.title, ['rz-tr', 'rz-bl'], swTitle('location', L2.title) + '<div class="card"><svg class="pin" aria-hidden="true"><use href="#pinicon"/></svg>' +
        (L2.venue ? '<p class="venue"' + (L2.venueLang ? ' dir="ltr" lang="' + esc(L2.venueLang) + '"' : '') + '>' + esc(L2.venue) + '</p>' : '') +
        (L2.venueEn ? '<p class="venue-en" dir="ltr" lang="en">' + esc(L2.venueEn) + '</p>' : '') +
        (L2.address ? '<p class="addr">' + nl(L2.address) + '</p>' : '') +
        swMapBtn(L2) + '</div><!--SWAN-->', FL, CP);
    }
    var notes = c.notes.items.filter(function (n) { return n && n.text; });
    if (c.notes.enabled && notes.length) {
      h += swSec('notes', kinds.notes, c.notes.title, ['rz-tr'], swTitle('notes', c.notes.title) + notes.map(function (n) { return '<p class="note">' + nl(n.text) + '</p>'; }).join('') + '<!--SWAN-->', FL, CP);
    }
    var R2 = c.rsvp;
    if (R2.enabled) {
      var max = Math.max(1, Math.min(30, parseInt(R2.maxGuests, 10) || 6)), opt = '';
      for (var i = 1; i <= max; i++) opt += '<option>' + i + '</option>';
      h += swSec('rsvp', kinds.rsvp, R2.title, ['rz-tl'], swTitle('rsvp', R2.title) + (R2.intro ? '<p class="note">' + nl(R2.intro) + '</p>' : '') +
        '<form id="rsvp" novalidate>' +
        '<div><label for="name">' + esc(R2.nameLabel) + '</label><input type="text" id="name" name="name" autocomplete="name" required></div>' +
        '<div><span class="lbl" id="att-l">' + esc(R2.attendLabel) + '</span><div class="choice" role="radiogroup" aria-labelledby="att-l">' +
        '<input type="radio" name="att" id="yes" value="yes" checked><label for="yes">' + esc(R2.yesLabel) + '</label>' +
        '<input type="radio" name="att" id="no" value="no"><label for="no">' + esc(R2.noLabel) + '</label></div></div>' +
        (R2.showGuests !== false ? '<div id="guestsWrap"><label for="guests">' + esc(R2.guestsLabel) + '</label><select id="guests" name="guests">' + opt + '</select></div>' : '') +
        '<div><label for="msg">' + esc(R2.noteLabel) + '</label><textarea id="msg" rows="3"></textarea></div>' +
        '<button class="btn gold" type="submit" style="align-self:center">' + esc(R2.button) + '</button>' +
        '<p id="err" role="alert" style="color:#8a2b1a;text-align:center;font-size:17px" hidden>' + esc(R2.nameError) + '</p></form>' +
        '<p class="thanks" id="thanks" hidden></p>' +
        '<div class="cta" id="cta" hidden><p>' + esc(c.ui.ctaText) + '</p><a class="credit" href="https://www.zaytorainvites.com/" target="_blank" rel="noopener">MADE BY ZAYTORA</a></div><!--SWAN-->', FL, CP);
    }
    var CL = c.closing, names = c.hero.name1 + (c.hero.name2 ? ' ' + c.hero.name2 : '');
    h += '<section class="paper sec-closing" aria-label="' + esc(CL.sign || names) + '">' + cardHtml(CL.card && CL.card.enabled ? CL.card : { name1: c.hero.name1, name2: c.hero.name2, amp: '&', date: '' }, FL, start, dateText) + '</section>';
    return h;
  }
  function swansShare(c, names) {
    return '<button id="share" type="button" aria-label="مشاركة الدعوة" hidden><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3"/></svg></button><div id="toast" role="status" aria-live="polite"></div>';
  }

  function render(raw, opts) {
    opts = opts || {};
    teardown();
    var c = merge(DEF, raw || {});
    var H = c.hero, R = c.rsvp, M = c.media;
    var swans = c.layout.mode === 'swans';
    var royal = c.layout.mode === 'royal'; ROYAL = royal;
    DECO = (royal || swans) ? c.royal.deco : null;
    CARD.custom = royal && paperStyle(c.royal) === 'custom' ? c.royal.customPaper : null;
    document.body.classList.toggle('swans', swans);
    var FL = (H.name1 || '').trim().charAt(0);
    var SEC = 'paper';
    document.body.classList.toggle('royal', royal);
    if (!Array.isArray(c.stickers)) c.stickers = [];
    applyTheme(c.theme);
    applyScale(c.style);
    var start = parseStart(c.event);
    var dateText = H.dateText || (start ? start.d + ' · ' + start.mo + ' · ' + start.y : '');
    var names = H.name1 + (H.name2 ? ' ' + H.connector + ' ' + H.name2 : '');

    var coverUrl = resolve(M.cover), poster = resolve(M.coverPoster);
    var useVideo = M.coverType === 'video' && !!coverUrl;
    var bgMp4 = resolve(M.bg), bgWebm = resolve(M.bgWebm), bgPoster = resolve(M.bgPoster);
    var musicUrl = M.musicEnabled ? resolve(M.music) : '';

    var h = '';
    h += '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<symbol id="swirl" viewBox="0 0 54 22"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 12 C10 4 18 4 24 11 S38 19 44 10 C47 6 52 7 51 11 C50 14 46 13 47 10"/><path d="M24 11 C28 8 31 9 32 12" opacity=".7"/></g><circle cx="3" cy="12" r="1.4" fill="currentColor"/></symbol>' +
      '<symbol id="rwing" viewBox="0 0 60 14"><g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M1 8 C8 8 12 3 20 5 S30 10 38 7 C44 5 48 2 58 4"/><path d="M14 7 C17 11 22 11 24 8"/></g><circle cx="58" cy="4" r="1.2" fill="currentColor"/></symbol>' +
      '<symbol id="rorn" viewBox="0 0 120 14"><g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M2 7H48"/><path d="M72 7H118"/><path d="M60 1.5 66 7 60 12.5 54 7z" fill="currentColor"/><path d="M50 7c2-3 5-3 7 0M70 7c-2-3-5-3-7 0"/></g><circle cx="2" cy="7" r="1.4" fill="currentColor"/><circle cx="118" cy="7" r="1.4" fill="currentColor"/></symbol>' +
      '<symbol id="pinicon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></symbol>' +
      '</defs></svg>';

    if (bgMp4 || bgWebm || bgPoster) {
      h += '<video id="bg" autoplay muted loop playsinline preload="auto" aria-hidden="true"' + (bgPoster ? ' poster="' + esc(bgPoster) + '"' : '') + '>' +
        (bgMp4 ? '<source src="' + esc(bgMp4) + '" type="video/mp4">' : '') +
        (bgWebm ? '<source src="' + esc(bgWebm) + '" type="video/webm">' : '') + '</video>';
    } else {
      h += '<div id="bg" aria-hidden="true"></div>';
    }
    var VL = (royal || swans) && c.royal.veil && c.royal.veil.on ? c.royal.veil : null, veilCss = swans ? ' style="background:none"' : ''; /* swans: its own stylesheet paints a veil, so "off" must clear it */
    if (VL) {
      var vr = (hex2rgb(VL.color) || [18, 6, 8]).join(',');
      veilCss = ' style="background:linear-gradient(180deg,rgba(' + vr + ',' + num(VL.top, 0.42, 0, 1) + '),rgba(' + vr + ',' + num(VL.mid, 0.22, 0, 1) + ') 45%,rgba(' + vr + ',' + num(VL.bot, 0.38, 0, 1) + '))"';
    }
    h += '<div id="veil"' + veilCss + '></div>';
    if (royal || swans) h += fontCss(M, c.royal.customFonts);

    if (!opts.skipCover) {
      /* the poster also paints the button itself, so phones that hold back the video (low-power mode, slow network) still show the cover picture */
      h += '<button id="cover" type="button" class="' + (useVideo ? '' : 'simple') + '" aria-label="' + esc(c.ui.coverHint) + '"' +
        (useVideo && poster ? ' style="background:#e9dfcb url(\'' + esc(poster).replace(/'/g, '%27') + '\') center/cover no-repeat"' : '') + '>';
      if (useVideo) {
        h += '<video id="cv" src="' + esc(coverUrl) + '" muted playsinline preload="auto"' + (poster ? ' poster="' + esc(poster) + '"' : '') + '></video>';
      } else {
        h += '<span class="sc">' + (H.eyebrow ? '<span class="latin">' + esc(H.eyebrow) + '</span>' : '') +
          '<span class="sn"><span>' + esc(H.name1) + '</span>' +
          (H.name2 ? '<span class="amp">' + esc(H.connector) + '</span><span>' + esc(H.name2) + '</span>' : '') + '</span>' +
          (dateText ? '<span class="sd">' + esc(dateText) + '</span>' : '') + '</span>';
      }
      h += '<span class="hint"><svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true"><path d="M1 9 L9 1 L17 9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' + esc(c.ui.coverHint) + '</span></button>';
    }

    if (musicUrl) {
      h += '<audio id="aud" src="' + esc(musicUrl) + '" loop preload="' + (opts.noAutoMusic ? 'none' : 'auto') + '"></audio>' +
        '<button id="music" type="button" aria-pressed="true" aria-label="' + esc(c.ui.musicLabel) + '" hidden>' +
        '<svg class="on" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>' +
        '<svg class="off" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.6 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4z"/></svg></button>';
    }

    if (!swans) h += '<div id="scrollhint" aria-hidden="true"><span class="mouse"></span><span class="chev"><i></i><i></i></span><span class="tx">' + esc(c.ui.scrollHint) + '</span></div>';

    if (swans) h += swansShare(c, names);
    h += '<main' + (royal ? ' class="royal"' : '') + '>';
    var secAt = 0;
    if (swans) h += swansBody(c, start, dateText, FL);
    else {
    if (royal) { h += sceneHtml(c, dateText, names) + sheetOpen(c); secAt = h.length; }
    SEC = royal ? 'rsec' : 'paper';
    /* hero (classic mode) */
    if (!royal) {
    h += '<section class="' + SEC + '" aria-label="' + esc(names) + '">' + fl('fl-tl', 'f-tl-rose.webp', 282, 283) + fl('fl-tr', 'f-tr-vine.webp', 420, 618) +
      '<div class="hero-top"></div>';
    if (H.bismillah) h += '<p class="bismillah">' + esc(H.bismillah) + '</p>';
    if (H.eyebrow) h += '<p class="latin">' + esc(H.eyebrow) + '</p>';
    h += '<h1 class="names"><span>' + esc(H.name1) + '</span>' +
      (H.name2 ? '<span class="amp">' + esc(H.connector) + '</span><span>' + esc(H.name2) + '</span>' : '') + '</h1>';
    if (H.occasion) h += '<p class="kind">' + esc(H.occasion) + '</p>';
    if (dateText) h += '<p class="date">' + esc(dateText) + '</p>';
    if (H.quote || H.verse) h += '<p class="quote poem">' + nl(H.quote) + (H.verse ? '<small>' + esc(H.verse) + '</small>' : '') + '</p>';
    if (H.intro) h += '<p class="inv">' + nl(H.intro) + '</p>';
    h += '</section>';
    }

    /* countdown */
    if (c.countdown.enabled && start && start.ms) {
      var L = c.countdown.labels;
      h += '<section class="' + SEC + '" aria-label="' + esc(c.countdown.title) + '">' + decoTop('countdown', FL) + title(c.countdown.title) +
        '<div class="count" id="count" role="timer" aria-live="off">' +
        ['d', 'h', 'm', 's'].map(function (id, i) { return '<div class="cell"><b id="' + id + '">00</b><span>' + esc(L[i] || '') + '</span></div>'; }).join('') +
        '</div>' + decoBottom('countdown') + '</section>';
    }

    /* schedule */
    var items = c.schedule.items.filter(function (it) { return it && (it.title || it.time); });
    if (c.schedule.enabled && items.length) {
      h += '<section class="' + SEC + '" aria-label="' + esc(c.schedule.title) + '">' + decoTop('schedule', FL) + title(c.schedule.title) + '<ul class="tl">' +
        items.map(function (it) {
          return '<li' + (it.rose ? ' class="rose"' : '') + '><span class="t">' + esc(it.time) + '</span><button class="e" type="button" aria-expanded="false"><span class="nm">' + esc(it.title) + '</span>' +
            (it.detail ? '<span class="dt"><span>' + nl(it.detail) + '</span></span>' : '') + '</button></li>';
        }).join('') + '</ul>' +
        (items.some(function (it) { return it.detail; }) && c.schedule.tip ? '<p class="tip">' + esc(c.schedule.tip) + '</p>' : '') + decoBottom('schedule') + '</section>';
    }

    /* location */
    var L2 = c.location;
    if (L2.enabled && (L2.venue || L2.address || L2.mapUrl)) {
      h += '<section class="' + SEC + '" aria-label="' + esc(L2.title) + '">' + decoTop('location', FL) + title(L2.title) + '<div class="card"><svg class="pin" aria-hidden="true"><use href="#pinicon"/></svg>' +
        (L2.venue ? '<p class="venue"' + (L2.venueLang ? ' dir="ltr" lang="' + esc(L2.venueLang) + '"' : '') + '>' + esc(L2.venue) + '</p>' : '') +
        (L2.venueEn ? '<p class="venue-en" dir="ltr" lang="en">' + esc(L2.venueEn) + '</p>' : '') +
        (L2.address ? '<p class="addr">' + nl(L2.address) + '</p>' : '') +
        (/^https?:\/\//i.test(L2.mapUrl) ? '<a class="btn" href="' + esc(L2.mapUrl) + '" target="_blank" rel="noopener">' + esc(L2.mapLabel) + '</a>' : '') +
        '</div>' + decoBottom('location') + '</section>';
    }

    /* notes */
    var notes = c.notes.items.filter(function (n) { return n && n.text; });
    if (c.notes.enabled && notes.length) {
      h += '<section class="' + SEC + '" aria-label="' + esc(c.notes.title) + '">' + decoTop('notes', FL) + fl('fl-side', 'f-side.webp', 194, 682) + title(c.notes.title) + '<div class="rules">' +
        notes.map(function (n) {
          return '<div class="rule-item"><svg viewBox="0 0 24 24" aria-hidden="true">' + (NOTE_ICONS[n.icon] || NOTE_ICONS.info) + '</svg><p>' + nl(n.text) + '</p></div>';
        }).join('') + '</div>' + decoBottom('notes') + '</section>';
    }

    /* rsvp */
    if (R.enabled) {
      var max = Math.max(1, Math.min(30, parseInt(R.maxGuests, 10) || 6)), opt = '';
      for (var i = 1; i <= max; i++) opt += '<option>' + i + '</option>';
      h += '<section class="' + SEC + '" aria-label="' + esc(R.title) + '">' + decoTop('rsvp', FL) + title(R.title) + (R.intro ? '<p class="note">' + nl(R.intro) + '</p>' : '') +
        '<form id="rsvp" novalidate>' +
        '<div><label for="name">' + esc(R.nameLabel) + '</label><input type="text" id="name" name="name" autocomplete="name" required></div>' +
        '<div><span class="lbl" id="att-l">' + esc(R.attendLabel) + '</span><div class="choice" role="radiogroup" aria-labelledby="att-l">' +
        '<input type="radio" name="att" id="yes" value="yes" checked><label for="yes">' + esc(R.yesLabel) + '</label>' +
        '<input type="radio" name="att" id="no" value="no"><label for="no">' + esc(R.noLabel) + '</label></div></div>' +
        (R.showGuests !== false ? '<div id="guestsWrap"><label for="guests">' + esc(R.guestsLabel) + '</label><select id="guests" name="guests">' + opt + '</select></div>' : '') +
        '<div><label for="msg">' + esc(R.noteLabel) + '</label><textarea id="msg" rows="3"></textarea></div>' +
        '<button class="btn gold" type="submit" style="align-self:center">' + esc(R.button) + '</button>' +
        '<p id="err" role="alert" style="color:#8a2b1a;text-align:center;font-size:17px" hidden>' + esc(R.nameError) + '</p></form>' +
        '<p class="thanks" id="thanks" hidden></p>' +
        '<div class="cta" id="cta" hidden><p>' + esc(c.ui.ctaText) + '</p><a class="credit" href="https://www.zaytorainvites.com/" target="_blank" rel="noopener">MADE BY ZAYTORA</a></div>' + decoBottom('rsvp') + '</section>';
    }

    /* closing */
    var CL = c.closing;
    if (royal && CL.card && CL.card.enabled) {
      /* the closing card stands on its own (no paper behind it): a frame picture with live text on top */
      h += '<section class="rsec rsec-card" aria-label="' + esc(CL.sign || names) + '">' + cardHtml(CL.card, FL, start, dateText) + '</section>';
    } else
    h += '<section class="' + SEC + '" aria-label="' + esc(CL.sign || names) + '">' + decoTop('closing', FL) + fl('fl-bl', 'f-bl-big.webp', 560, 657) + fl('fl-br', 'f-br.webp', 437, 659) +
      (CL.latin ? '<p class="latin" style="margin-top:6px">' + esc(CL.latin) + '</p>' : '') +
      (CL.text ? '<p class="quote" style="font-size:30px">' + esc(CL.text) + '</p>' : '') +
      (CL.sign ? '<p class="sign">' + esc(CL.sign) + '</p>' : '') + decoBottom('closing') + '<div class="closing-space"></div></section>';
    if (royal) { if (paperStyle(c.royal) !== 'columns') h = h.slice(0, secAt) + cardify(h.slice(secAt)); h += sheetClose(c); }
    }
    /* "MADE BY ZAYTORA" always closes the page and links to the site's home page. It does not depend on the stored
       footer text, so every invitation (saved earlier or later) gets it. A custom footer line, if any, sits above it;
       the old default text "ZAYTORA INVITES" is not repeated. */
    var note = c.footer && !/zaytora/i.test(c.footer) ? '<p class="foot-note">' + esc(c.footer) + '</p>' : '';
    h += '<footer>' + note + '<a class="credit" href="https://www.zaytorainvites.com/" target="_blank" rel="noopener">MADE BY ZAYTORA</a></footer>';
    h += '</main>';

    var root = document.getElementById('inv-root');
    var keep = opts.keepScroll ? window.scrollY : 0;
    if (opts.keepScroll) root.style.minHeight = root.offsetHeight + 'px';
    root.innerHTML = h;
    document.title = c.meta.title || names || document.title;
    document.documentElement.style.overflow = opts.skipCover ? '' : 'hidden';
    window.scrollTo(0, keep);
    if (opts.keepScroll) setTimeout(function () { root.style.minHeight = ''; }, 60);

    wire(c, { start: start, names: names, dateText: dateText, opts: opts });
  }

  /* ---------- behaviour ---------- */
  function wire(c, ctx) {
    var $ = function (id) { return document.getElementById(id); };
    if ($('cv')) { var cv0 = $('cv'); on(cv0, 'loadedmetadata', function () { try { if (!cv0.currentTime) cv0.currentTime = 0.01; } catch (e) { /* ignore */ } }); } /* paints the first frame instead of the phone's play glyph */
    var cover = $('cover'), cv = $('cv'), aud = $('aud'), mbtn = $('music'), sh = $('scrollhint'), bg = $('bg');
    var fade = null, opened = false;
    live.aud = aud;

    /* scroll-down hint */
    function showHint() { if (!sh) return; live.timers.push(setTimeout(function () { if (window.scrollY < 60) sh.classList.add('show'); }, 900)); }
    if (sh) on(window, 'scroll', function () { if (window.scrollY > 60) { sh.classList.remove('show'); sh.classList.add('hide'); } }, { passive: true });

    /* music: never relies on audio.volume (iPhones ignore it); the button pauses/plays directly */
    var vol = Math.max(0.05, Math.min(1, Number(c.media.musicVolume) || 0.5));
    function setUI(v) { if (mbtn) mbtn.setAttribute('aria-pressed', v ? 'true' : 'false'); }
    function setVol(v) { try { aud.volume = Math.max(0, Math.min(1, v)); } catch (e) { /* ignore */ } }
    function fadeIn(v, ms) {
      clearInterval(fade); var t0 = Date.now();
      fade = setInterval(function () { var k = Math.min(1, (Date.now() - t0) / ms); setVol(v * k); if (k >= 1) clearInterval(fade); }, 50);
      live.timers.push(fade);
    }
    function playMusic() {
      if (!aud) return;
      aud.muted = false; try { aud.currentTime = 0; } catch (e) { /* ignore */ } setVol(0);
      var p = aud.play();
      if (p && p.then) p.then(function () { fadeIn(vol, 3500); }).catch(function () { setUI(false); });
    }
    if (aud && mbtn) {
      on(aud, 'play', function () { setUI(true); });
      on(aud, 'pause', function () { setUI(false); });
      on(mbtn, 'click', function () {
        clearInterval(fade);
        if (aud.paused) {
          aud.muted = false; setVol(0);
          var p = aud.play();
          if (p && p.then) p.then(function () { fadeIn(vol, 800); }).catch(function () { setUI(false); });
        } else aud.pause();
      });
    }

    /* gentle auto-scroll: starts once the cover is open and stops for good as soon as the guest
       scrolls by hand (wheel, touch, drag, keys) or the page moves by anything other than us */
    var autoOn = false;
    function startAutoScroll() {
      if (autoOn || PREVIEW || ctx.opts.skipCover) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      autoOn = true;
      var SPEED = 38; /* px per second */
      var pos = window.scrollY, last = 0, raf = 0, startT = 0;
      var stopEvents = [['wheel', window], ['touchstart', window], ['touchmove', window], ['mousedown', window], ['keydown', window]];
      function stop() {
        if (!autoOn) return;
        autoOn = false;
        if (raf) cancelAnimationFrame(raf);
        stopEvents.forEach(function (p) { p[1].removeEventListener(p[0], onInput, true); });
        window.removeEventListener('scroll', onScroll);
      }
      function onInput(e) {
        if (e.type === 'keydown' && [32, 33, 34, 35, 36, 38, 40].indexOf(e.keyCode) < 0) return;
        stop();
      }
      function onScroll() {
        /* a jump we did not make (scrollbar drag, anchor, momentum fling) means the guest took over */
        if (Math.abs(window.scrollY - pos) > 3) stop();
      }
      function frame(t) {
        if (!autoOn) return;
        if (!last) last = t;
        var dt = Math.min(64, t - last); last = t;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (pos >= max - 1) { stop(); return; }
        pos = Math.min(max, pos + SPEED * dt / 1000);
        window.scrollTo(0, pos);
        raf = requestAnimationFrame(frame);
      }
      stopEvents.forEach(function (p) { p[1].addEventListener(p[0], onInput, { capture: true, passive: true }); });
      window.addEventListener('scroll', onScroll, { passive: true });
      live.unbind.push(stop);
      live.timers.push(setTimeout(function () { pos = window.scrollY; if (autoOn) raf = requestAnimationFrame(frame); }, 1800));
    }

    var shb = $('share'), toast = $('toast');
    if (shb) {
      var say = function (m) { toast.textContent = m; toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 2200); };
      on(shb, 'click', function () {
        var url = location.href.split('#')[0], data = { title: ctx.names, text: c.meta.description || ctx.names, url: url };
        if (navigator.share) { navigator.share(data).catch(function () { /* ignore */ }); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { say('تم نسخ رابط الدعوة'); }, function () { say(url); });
        else say(url);
      });
    }
    if (swansLook()) {
      document.documentElement.classList.add('anim2');
      on(window, 'scroll', function () { document.documentElement.classList.toggle('scrolled', window.scrollY > 60); }, { passive: true });
      live.unbind.push(function () { document.documentElement.classList.remove('anim2', 'scrolled'); });
    }

    function reveal() {
      if (shb) shb.hidden = false;
      if (cover) {
        if (cover.classList.contains('gone')) return;
        cover.classList.add('gone');
        live.timers.push(setTimeout(function () { cover.hidden = true; }, 1200));
      }
      var sr = swansLook() ? $('royal') : null;
      if (sr) {
        if (!cover && !ctx.opts.replay) { sr.classList.add('still'); sr.classList.add('play'); }
        else live.timers.push(setTimeout(function () { sr.classList.add('play'); }, 250));
        live.timers.push(setTimeout(function () { var hh = document.querySelector('.r-scroll'); if (hh) hh.classList.add('off'); }, 7000));
      }
      var rs = $('rscene');
      if (rs) { if (!cover && !ctx.opts.replay) rs.classList.add('still'); rs.classList.add('go'); }
      document.documentElement.style.overflow = ''; if (cover) window.scrollTo(0, 0);
      if (bg && bg.play) { var bp = bg.play(); if (bp && bp.catch) bp.catch(function () { /* ignore */ }); }
      if (mbtn) mbtn.hidden = false;
      showHint();
      startAutoScroll();
    }
    if (cover) {
      on(cover, 'click', function () {
        if (opened) return; opened = true;
        cover.classList.add('playing');
        if (!ctx.opts.noAutoMusic) playMusic();
        if (cv) {
          cv.muted = true;
          var p = cv.play();
          if (p && p.catch) p.catch(function () { reveal(); });
          var d = (cv.duration && isFinite(cv.duration)) ? cv.duration : 8;
          live.timers.push(setTimeout(reveal, (d + 0.4) * 1000));
          on(cv, 'ended', reveal);
        } else {
          live.timers.push(setTimeout(reveal, 700));
        }
      });
    } else {
      reveal();
    }

    /* scroll reveal */
    var papers = [].slice.call(document.querySelectorAll('.paper, .rsec'));
    papers.forEach(function (p) {
      var kids = [].slice.call(p.children).filter(function (k) { return !k.classList.contains('fl') && !k.classList.contains('hero-top') && !k.classList.contains('pbg') && !k.classList.contains('closing-space'); }), i = 0;
      kids.forEach(function (k) {
        if (k.classList.contains('tl')) { [].forEach.call(k.children, function (li) { li.classList.add('rv'); li.style.setProperty('--d', (0.25 + i * 0.14) + 's'); i++; }); }
        else { k.classList.add('rv'); k.style.setProperty('--d', (0.15 + i * 0.12) + 's'); i++; }
      });
    });
    if ('IntersectionObserver' in window) {
      document.documentElement.classList.add('anim');
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.18 });
      papers.forEach(function (p) { io.observe(p); });
      live.unbind.push(function () { io.disconnect(); document.documentElement.classList.remove('anim'); });
      live.timers.push(setTimeout(function () { papers.forEach(function (p) { p.classList.add('in'); }); }, 12000));
    } else papers.forEach(function (p) { p.classList.add('in'); });

    /* preview only: drag a sticker with the mouse/finger and report its new position to the builder */
    if (PREVIEW) {
      [].forEach.call(document.querySelectorAll('.stk[data-i]'), function (st) {
        on(st, 'pointerdown', function (e) {
          e.preventDefault();
          var box = st.parentNode.getBoundingClientRect(), pos = null;
          try { st.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
          function mv(ev) {
            var x = (ev.clientX - box.left) / box.width * 100, y = (ev.clientY - box.top) / box.height * 100;
            pos = { x: Math.round(Math.max(-30, Math.min(130, x)) * 10) / 10, y: Math.round(Math.max(-30, Math.min(130, y)) * 10) / 10 };
            st.style.left = pos.x + '%'; st.style.top = pos.y + '%';
          }
          function up() {
            st.removeEventListener('pointermove', mv); st.removeEventListener('pointerup', up); st.removeEventListener('pointercancel', up);
            if (pos && window.parent !== window) window.parent.postMessage({ type: 'zaytora-sticker-move', index: +st.dataset.i, x: pos.x, y: pos.y }, location.origin);
          }
          st.addEventListener('pointermove', mv); st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
        });
      });
    }

    /* interactive schedule */
    var tl = document.querySelector('.tl');
    if (tl) {
      var lis = [].slice.call(tl.querySelectorAll('li'));
      var fill = document.createElement('div'); fill.className = 'fill'; tl.appendChild(fill);
      lis.forEach(function (li) {
        var b = li.querySelector('.e');
        if (b.classList.contains('nd')) return;
        function toggle() {
          var open = b.getAttribute('aria-expanded') === 'true';
          lis.forEach(function (o) { o.classList.remove('open'); o.querySelector('.e').setAttribute('aria-expanded', 'false'); });
          if (!open && li.querySelector('.dt')) { li.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
        }
        on(b, 'click', toggle); on(li.querySelector('.t'), 'click', toggle);
      });
      var raf = 0;
      var upd = function () {
        raf = 0;
        var r = tl.getBoundingClientRect(), y = window.innerHeight * 0.62;
        fill.style.height = Math.max(0, Math.min(r.height - 20, y - r.top - 10)) + 'px';
        lis.forEach(function (li) { var lr = li.getBoundingClientRect(); li.classList.toggle('lit', lr.top + lr.height / 2 < y); });
      };
      var sched = function () { if (!raf) raf = requestAnimationFrame(upd); };
      on(window, 'scroll', sched, { passive: true }); on(window, 'resize', sched); upd();
    }

    /* countdown */
    if ($('count') && ctx.start && ctx.start.ms) {
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var setC = function (id, v) { var el = $(id); if (el && el.textContent !== v) { el.textContent = v; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); } };
      var tick = function () {
        var s = Math.floor(Math.max(0, ctx.start.ms - Date.now()) / 1000);
        setC('d', pad(Math.floor(s / 86400))); setC('h', pad(Math.floor(s % 86400 / 3600))); setC('m', pad(Math.floor(s % 3600 / 60))); setC('s', pad(s % 60));
      };
      tick(); live.timers.push(setInterval(tick, 1000));
    }

    /* rsvp -> WhatsApp */
    var form = $('rsvp');
    if (form) {
      var R = c.rsvp, gw = $('guestsWrap');
      on(form, 'change', function () { if (gw) gw.hidden = form.att.value === 'no'; });
      on(form, 'submit', function (e) {
        e.preventDefault();
        var n = $('name').value.trim(), err = $('err');
        if (!n) { err.hidden = false; $('name').focus(); return; }
        err.hidden = true;
        var yes = form.att.value === 'yes';
        var lines = [fmt(R.messageHeader, { occasion: c.hero.occasion, names: ctx.names }).trim(), R.msgName + ': ' + n, R.msgAttend + ': ' + (yes ? R.msgYes : R.msgNo)];
        if (yes && $('guests')) lines.push(R.msgGuests + ': ' + $('guests').value);
        var note = $('msg').value.trim();
        if (note) lines.push(R.msgNote + ': ' + note);
        var msg = encodeURIComponent(lines.join('\n'));
        var urls = [R.whatsapp, R.whatsapp2].map(function (v) { return String(v || '').replace(/\D/g, ''); }).filter(Boolean).map(function (d) { return 'https://wa.me/' + d + '?text=' + msg; });
        var url = urls[0] || '';
        var th = $('thanks'); th.textContent = '';
        var t1 = document.createElement('span'); t1.style.display = 'block';
        t1.textContent = fmt(yes ? R.thanksYes : R.thanksNo, { name: n });
        th.appendChild(t1);
        if (urls.length) {
          var t2 = document.createElement('span'); t2.style.cssText = 'display:block;font-family:var(--body);font-size:19px;margin-top:6px';
          t2.textContent = R.thanksHint; th.appendChild(t2);
          urls.forEach(function (u, i) {
            var a = document.createElement('a'); a.className = 'btn gold'; a.href = u; a.target = '_blank'; a.rel = 'noopener';
            a.textContent = urls.length > 1 ? R.openWhatsapp + ' (' + (i + 1) + ')' : R.openWhatsapp;
            if (i) a.style.marginInlineStart = '8px';
            th.appendChild(a);
          });
        }
        form.hidden = true; th.hidden = false;
        if ($('cta')) $('cta').hidden = false; /* the call-to-action appears under the thank-you, for yes and no alike */
        if (urls.length === 1 && !ctx.opts.noAutoMusic) window.open(url, '_blank', 'noopener'); /* with two numbers the guest picks which one */
      });
    }
  }

  /* ---------- boot ---------- */
  function fail(msg) {
    var root = document.getElementById('inv-root');
    root.innerHTML = '<p id="inv-error">' + esc(msg) + '</p>';
  }
  function boot() {
    var root = document.createElement('div'); root.id = 'inv-root'; document.body.appendChild(root);
    if (PREVIEW) {
      document.documentElement.classList.add('pv');
      window.addEventListener('message', function (e) {
        if (e.origin !== location.origin || !e.data || e.data.type !== 'zaytora-invite-config') return;
        render(e.data.config, { skipCover: !!e.data.skipCover, keepScroll: !!e.data.skipCover && !e.data.replay, noAutoMusic: true, replay: !!e.data.replay });
      });
      if (window.parent !== window) window.parent.postMessage({ type: 'zaytora-invite-ready' }, location.origin);
      return;
    }
    if (window.__ZAYTORA_INVITE__ && window.__ZAYTORA_INVITE__.config) { render(window.__ZAYTORA_INVITE__.config, {}); return; }
    fetch(BASE + 'config.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('config ' + r.status); return r.json(); })
      .then(function (cfg) { render(cfg, {}); })
      .catch(function () { fail('تعذّر تحميل الدعوة. يرجى إعادة المحاولة لاحقاً.'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
