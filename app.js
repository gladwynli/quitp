(() => {
  'use strict';

  /* ─────────────── Config: set the brand name here (empty = no name shown) ─────────────── */
  const CONFIG = {
    name: '',
    storageKey: 'streak:start',
    whyKey: 'streak:why',
  };

  /* Milestones in days. After the last one, every further year is a milestone. */
  const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

  /* Tick scale: [step in days, a major mark every N steps].
     The finest step that keeps the scale at or under MAX_TICKS wins. */
  const TICK_STEPS = [
    [1 / 24, 6], [1 / 12, 12], [1 / 6, 6], [1 / 4, 4],
    [1, 7], [2, 5], [3, 10], [5, 6], [7, 4], [14, 4], [30, 3],
  ];
  const MAX_TICKS = 32;

  const SEC = 1e3, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

  /* ─────────────── Elements ─────────────── */
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const el = {
    brand: $('brand'),
    countView: $('countView'), setupView: $('setupView'),
    daysWrap: $('daysWrap'), days: $('days'), daysUnit: $('daysUnit'),
    hh: $('hh'), mm: $('mm'), ss: $('ss'),
    gauge: $('gauge'), ringTrack: $('ringTrack'), ringSegs: $('ringSegs'),
    remaining: $('remaining'),
    openOptions: $('openOptions'), sheet: $('sheet'),
    startInput: $('startInput'), saveStart: $('saveStart'), sheetHint: $('sheetHint'),
    beginAgain: $('beginAgain'), erase: $('erase'),
    startNow: $('startNow'), startEarlier: $('startEarlier'),
    earlierForm: $('earlierForm'), earlierInput: $('earlierInput'), setupHint: $('setupHint'),
    whyInput: $('whyInput'),
    panic: $('panic'), panicScreen: $('panicScreen'),
    panicIntro: $('panicIntro'), panicBreathe: $('panicBreathe'), panicDone: $('panicDone'),
    panicStreak: $('panicStreak'), panicWhy: $('panicWhy'), panicKept: $('panicKept'),
    tide: $('tide'), breathLabel: $('breathLabel'), panicTimer: $('panicTimer'),
  };

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => motion.matches;

  /* ─────────────── Storage (device only) ─────────────── */
  const store = {
    get() {
      try {
        const n = Number(localStorage.getItem(CONFIG.storageKey));
        return Number.isFinite(n) && n > 0 ? n : null;
      } catch { return null; }
    },
    set(ms) { try { localStorage.setItem(CONFIG.storageKey, String(ms)); } catch {} },
    clear() {
      try {
        localStorage.removeItem(CONFIG.storageKey);
        localStorage.removeItem(CONFIG.whyKey);
      } catch {}
    },
    getWhy() { try { return localStorage.getItem(CONFIG.whyKey) || ''; } catch { return ''; } },
    setWhy(text) {
      try {
        if (text) localStorage.setItem(CONFIG.whyKey, text);
        else localStorage.removeItem(CONFIG.whyKey);
      } catch {}
    },
  };

  /* ─────────────── Time helpers ─────────────── */
  const pad = (n) => String(n).padStart(2, '0');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function milestoneLabel(d) {
    if (d === 0) return 'Start';
    if (d === 7) return '1 week';
    if (d === 14) return '2 weeks';
    if (d === 180) return '6 months';
    if (d >= 365 && d % 365 === 0) return plural(d / 365, 'year');
    return plural(d, 'day');
  }

  function segmentFor(days) {
    let prev = 0;
    for (const m of MILESTONES) {
      if (days < m) return [prev, m];
      prev = m;
    }
    const y = Math.floor(days / 365);
    return [y * 365, (y + 1) * 365];
  }

  function formatRemaining(ms, target) {
    const d = Math.floor(ms / DAY), h = Math.floor(ms / HOUR), m = Math.floor(ms / MIN);
    const left = d >= 1 ? plural(d, 'day') : h >= 1 ? plural(h, 'hour') : m >= 1 ? plural(m, 'minute') : 'Under a minute';
    return `${left} until ${target}`;
  }

  const toInputValue = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const parseLocal = (str) => {
    if (!str) return NaN;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) str += 'T00:00'; // date-only would otherwise parse as UTC
    return new Date(str).getTime();
  };


  /* For screen recordings: ?days=47.3 or ?since=2026-09-28T21:40 shows that streak without saving it. */
  function startFromURL() {
    const q = new URLSearchParams(location.search);
    if (q.has('days')) {
      const d = parseFloat(q.get('days'));
      if (Number.isFinite(d) && d >= 0) return Date.now() - d * DAY;
    }
    if (q.has('since')) {
      const t = parseLocal(q.get('since'));
      if (Number.isFinite(t) && t <= Date.now()) return t;
    }
    return null;
  }

  /* ─────────────── Easing ─────────────── */
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const x = (t) => ((ax * t + bx) * t + cx) * t;
    const y = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (target) => {
      let t = target;
      for (let i = 0; i < 8; i++) {
        const err = x(t) - target;
        if (Math.abs(err) < 1e-6) break;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      return y(Math.min(1, Math.max(0, t)));
    };
  }
  const FILL_EASE = cubicBezier(0.5, 0, 0.12, 1); // eases in, then a long, settling glide

  /* ─────────────── Digits that roll softly when they change ─────────────── */
  let digitsLive = false;

  function setDigits(node, text, rise = '0.32em') {
    const prev = node.dataset.v ?? '';
    if (prev === text) return;
    node.dataset.v = text;

    if (prev.length !== text.length) {
      node.replaceChildren(...[...text].map((ch) => {
        const s = document.createElement('span');
        s.className = 'dg';
        s.textContent = ch;
        return s;
      }));
      return;
    }
    [...text].forEach((ch, i) => {
      if (ch === prev[i]) return;
      const s = node.children[i];
      s.textContent = ch;
      if (digitsLive && !calm()) {
        s.animate(
          [
            { opacity: 0, transform: `translateY(${rise})` },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 360, easing: 'cubic-bezier(.16, 1, .3, 1)' },
        );
      }
    });
  }

  /* ─────────────── Gauge ─────────────── */
  const gauge = {
    seg: null,      // [fromDay, toDay] currently drawn
    shown: 0,       // progress currently painted (0..1)
    ticks: [],
    busy: false,    // true while an intro or milestone sequence owns the bar
    raf: 0,
    settle: null,
    reachedUntil: 0,
    reachedText: '',
  };

  function paint(p) {
    gauge.shown = p;
    root.style.setProperty('--p', p.toFixed(5));
    for (const s of gauge.ticks) {
      const frac = Math.min(1, Math.max(0, (p - s.x0) / (s.x1 - s.x0)));
      if (frac !== s.frac) { s.frac = frac; s.node.style.strokeDashoffset = String(1 - frac); }
    }
  }

  function animateTo(to, duration) {
    cancelAnimationFrame(gauge.raf);
    if (gauge.settle) { gauge.settle(); gauge.settle = null; }
    if (calm() || duration <= 0) { paint(to); return Promise.resolve(); }

    const from = gauge.shown;
    const t0 = performance.now();
    return new Promise((resolve) => {
      gauge.settle = resolve;
      const frame = (now) => {
        const k = Math.min(1, (now - t0) / duration);
        paint(from + (to - from) * FILL_EASE(k));
        if (k < 1) gauge.raf = requestAnimationFrame(frame);
        else { gauge.settle = null; resolve(); }
      };
      gauge.raf = requestAnimationFrame(frame);
    });
  }

  function flare() {
    if (calm()) return;
    el.gauge.classList.remove('flare');
    void el.gauge.offsetWidth; // restart the animation
    el.gauge.classList.add('flare');
  }

  function buildScale([a, b]) {
    gauge.seg = [a, b];
    const span = b - a;
    const [step, every] = TICK_STEPS.find(([s]) => span / s <= MAX_TICKS) ?? TICK_STEPS[TICK_STEPS.length - 1];

    const marks = [];
    const n = Math.floor(span / step + 1e-9);
    for (let i = 0; i <= n; i++) marks.push({ x: (i * step) / span, major: i % every === 0 });
    const last = marks[marks.length - 1];
    if (last.x < 1 - 1e-9) {
      if (1 - last.x < (0.5 * step) / span) marks.pop(); // avoid a cramped final pair
      marks.push({ x: 1, major: true });
    } else {
      last.major = true;
    }

    // One arc per mark-to-mark step, drawn clockwise from the top of the ring.
    const NS = 'http://www.w3.org/2000/svg';
    const R = 88, C = 100, TAU = Math.PI * 2;
    const count = marks.length - 1;
    const gap = Math.min(2.4, (360 / count) * 0.2) * (Math.PI / 180);
    const pt = (a) => `${(C + R * Math.sin(a)).toFixed(3)} ${(C - R * Math.cos(a)).toFixed(3)}`;
    const arc = (d) => {
      const node = document.createElementNS(NS, 'path');
      node.setAttribute('d', d);
      return node;
    };

    const tracks = [];
    gauge.ticks = [];
    for (let i = 0; i < count; i++) {
      const x0 = marks[i].x, x1 = marks[i + 1].x;
      const a0 = x0 * TAU + gap / 2, a1 = x1 * TAU - gap / 2;
      const d = `M${pt(a0)}A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)}`;
      tracks.push(arc(d));
      const node = arc(d);
      node.setAttribute('pathLength', '1');
      node.style.strokeDashoffset = '1';
      gauge.ticks.push({ x0, x1, node, frac: 0 });
    }
    el.ringTrack.replaceChildren(...tracks);
    el.ringSegs.replaceChildren(...gauge.ticks.map((s) => s.node));
    el.gauge.setAttribute('aria-label', 'Hours completed in the current day');
  }

  const progressIn = ([a, b], days) => Math.min(1, Math.max(0, (days - a) / (b - a)));
  const elapsedDays = () => Math.max(0, Date.now() - state.start) / DAY;

  async function playFill() {
    gauge.busy = true;
    digitsLive = false;
    paint(0);
    await wait(calm() ? 0 : 560);
    const target = progressIn(gauge.seg, elapsedDays());
    await animateTo(target, 1500 + 1100 * target);
    flare();
    gauge.busy = false;
    digitsLive = true;
    render();
  }

  async function reachMilestone(nextSeg) {
    gauge.busy = true;
    await animateTo(1, 1100);
    flare();
    const day = nextSeg[0];
    if (MILESTONES.includes(day) || (day >= 365 && day % 365 === 0)) {
      gauge.reachedText = `${milestoneLabel(day)} reached.`;
      gauge.reachedUntil = Date.now() + 9000;
    }
    render();
    await wait(calm() ? 0 : 1600);
    buildScale(nextSeg);
    paint(0);
    await animateTo(progressIn(nextSeg, elapsedDays()), 1400);
    gauge.busy = false;
    render();
  }

  /* ─────────────── State + render ─────────────── */
  const state = { start: null, timer: 0 };

  function render() {
    if (state.start == null) return;
    const now = Date.now();
    const elapsed = Math.max(0, now - state.start);
    const days = Math.floor(elapsed / DAY);
    const rest = elapsed - days * DAY;

    setDigits(el.days, String(days), '0.14em');
    el.daysUnit.textContent = days === 1 ? 'day' : 'days';
    el.daysWrap.classList.toggle('is-long', days >= 1000);
    setDigits(el.hh, pad(Math.floor(rest / HOUR)));
    setDigits(el.mm, pad(Math.floor((rest % HOUR) / MIN)));
    setDigits(el.ss, pad(Math.floor((rest % MIN) / SEC)));

    const d = elapsed / DAY;
    // The ring shows the current day: 24 segments, one per hour.
    const seg = [Math.floor(d), Math.floor(d) + 1];
    const nextMilestone = segmentFor(d)[1];
    if (!gauge.seg) buildScale(seg);
    else if (!gauge.busy && seg[0] !== gauge.seg[0]) {
      if (seg[0] > gauge.seg[0]) reachMilestone(seg);
      else buildScale(seg);
    }

    const p = progressIn(gauge.seg, d);
    if (!gauge.busy) paint(p);

    const reached = now < gauge.reachedUntil;
    el.remaining.classList.toggle('reached', reached);
    el.remaining.textContent = reached
      ? gauge.reachedText
      : formatRemaining(Math.max(0, nextMilestone * DAY - elapsed), milestoneLabel(nextMilestone));

    el.gauge.setAttribute('aria-valuenow', String(Math.floor(p * 100)));
    el.gauge.setAttribute('aria-valuetext', `${Math.floor(p * 24)} of 24 hours`);
  }

  function tick() {
    clearTimeout(state.timer);
    render();
    state.timer = setTimeout(tick, SEC - (Date.now() % SEC) + 4); // land just after each second turns
  }

  /* ─────────────── Views ─────────────── */
  function replayEntrance() {
    root.classList.remove('is-ready');
    void root.offsetWidth; // forced reflow restarts the transitions
    root.classList.add('is-ready');
  }

  function showCount() {
    el.setupView.hidden = true;
    el.countView.hidden = false;
    el.openOptions.hidden = false;
    gauge.seg = null;
    gauge.reachedUntil = 0;
    digitsLive = false;
    render();
    replayEntrance();
    playFill();
    tick();
  }

  function showSetup() {
    clearTimeout(state.timer);
    el.countView.hidden = true;
    el.setupView.hidden = false;
    el.openOptions.hidden = true;
    el.earlierForm.hidden = true;
    el.startEarlier.hidden = false;
    el.startEarlier.setAttribute('aria-expanded', 'false');
    el.setupHint.textContent = '';
    replayEntrance();
  }

  function setStart(ms) {
    state.start = ms;
    store.set(ms);
    if (location.search) history.replaceState(null, '', location.pathname); // leave preview mode
    showCount();
  }

  /* ─────────────── Setup interactions ─────────────── */
  el.startNow.addEventListener('click', () => setStart(Date.now()));

  el.startEarlier.addEventListener('click', () => {
    const now = Date.now();
    el.earlierInput.max = toInputValue(now);
    el.earlierInput.value = toInputValue(now - DAY);
    el.startEarlier.hidden = true;
    el.startEarlier.setAttribute('aria-expanded', 'true');
    el.earlierForm.hidden = false;
    el.earlierInput.focus();
  });

  el.earlierForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = parseLocal(el.earlierInput.value);
    if (!Number.isFinite(t)) { el.setupHint.textContent = 'Choose a date and time.'; return; }
    if (t > Date.now()) { el.setupHint.textContent = 'That time is still ahead. Pick a moment that has passed.'; return; }
    setStart(t);
  });

  /* ─────────────── Options sheet ─────────────── */
  const confirmables = [el.beginAgain, el.erase];

  function disarm(btn) {
    if (!btn.dataset.armed) return;
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
    clearTimeout(btn._timer);
  }

  function confirmTwice(btn, action) {
    btn.dataset.label = btn.textContent;
    btn.addEventListener('click', () => {
      if (btn.dataset.armed) { disarm(btn); action(); return; }
      confirmables.forEach(disarm);
      btn.dataset.armed = '1';
      btn.textContent = btn.dataset.confirm;
      btn._timer = setTimeout(() => disarm(btn), 4000);
    });
  }

  el.openOptions.addEventListener('click', () => {
    el.startInput.max = toInputValue(Date.now());
    el.startInput.value = toInputValue(state.start);
    el.whyInput.value = store.getWhy();
    el.sheetHint.textContent = '';
    confirmables.forEach(disarm);
    el.sheet.showModal();
  });

  el.sheet.addEventListener('click', (e) => { if (e.target === el.sheet) el.sheet.close(); });
  el.sheet.addEventListener('close', () => confirmables.forEach(disarm));
  $('closeSheet').addEventListener('click', () => el.sheet.close());
  $('sheetForm').addEventListener('submit', (e) => { e.preventDefault(); saveStartTime(); }); // Enter in the field

  el.saveStart.addEventListener('click', saveStartTime);
  function saveStartTime() {
    const value = el.startInput.value;
    if (value === toInputValue(state.start)) { el.sheet.close(); return; } // unchanged: keep the exact second
    const t = parseLocal(value);
    if (!Number.isFinite(t)) { el.sheetHint.textContent = 'Choose a date and time.'; return; }
    if (t > Date.now()) { el.sheetHint.textContent = 'That time is still ahead. Pick a moment that has passed.'; return; }
    el.sheet.close();
    setStart(t);
  }

  confirmTwice(el.beginAgain, () => {
    el.sheet.close();
    setStart(Date.now());
  });

  confirmTwice(el.erase, () => {
    el.sheet.close();
    store.clear();
    state.start = null;
    if (location.search) history.replaceState(null, '', location.pathname);
    showSetup();
  });

  /* ─────────────── Panic button ─────────────── */
  const BREATH = { total: 60, inhale: 4, exhale: 6 }; // seconds
  const panic = { raf: 0, timer: 0 };

  /* For screen recordings: ?why=... shows that reason without saving it. */
  function currentWhy() {
    const fromURL = new URLSearchParams(location.search).get('why');
    return (fromURL ?? store.getWhy()).trim().slice(0, 140);
  }

  function streakText() {
    const elapsed = Math.max(0, Date.now() - state.start);
    const d = Math.floor(elapsed / DAY), h = Math.floor(elapsed / HOUR), m = Math.floor(elapsed / MIN);
    return d >= 1 ? plural(d, 'day') : h >= 1 ? plural(h, 'hour') : m >= 1 ? plural(m, 'minute') : 'a few seconds';
  }

  function panicStage(stage) {
    for (const node of [el.panicIntro, el.panicBreathe, el.panicDone]) node.hidden = node !== stage;
    el.tide.hidden = stage !== el.panicBreathe;
  }

  function openPanic() {
    if (state.start == null) return;
    const r = el.panic.getBoundingClientRect();
    const ps = el.panicScreen;
    ps.style.setProperty('--ox', `${r.left + r.width / 2}px`);
    ps.style.setProperty('--oy', `${r.top + r.height / 2}px`);
    ps.style.setProperty('--settle', '0');

    el.panicStreak.textContent = streakText();
    const why = currentWhy();
    el.panicWhy.hidden = !why;
    el.panicWhy.textContent = why ? `You wrote: “${why}”` : '';

    panicStage(el.panicIntro);
    ps.showModal();
    panic.timer = setTimeout(startBreathing, calm() ? 3000 : why ? 4200 : 3200);
  }

  function startBreathing() {
    const { total, inhale, exhale } = BREATH;
    const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
    const t0 = performance.now();
    let label = '';
    panicStage(el.panicBreathe);

    const frame = (now) => {
      const t = (now - t0) / 1000;
      if (t >= total) { finishPanic(); return; }

      const phase = t % (inhale + exhale);
      const breathingIn = phase < inhale;
      const k = breathingIn ? phase / inhale : 1 - (phase - inhale) / exhale;
      // The tide fills the screen from 14% to 76% and back
      if (!calm()) el.tide.style.transform = `translateY(${(86 - 62 * ease(k)).toFixed(3)}%)`;

      const next = breathingIn ? 'Breathe in' : 'Breathe out';
      if (next !== label) { label = next; el.breathLabel.textContent = next; }

      const left = Math.ceil(total - t);
      el.panicTimer.textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
      el.panicScreen.style.setProperty('--settle', (t / total).toFixed(3)); // red drains to blue
      panic.raf = requestAnimationFrame(frame);
    };
    panic.raf = requestAnimationFrame(frame);
  }

  function finishPanic() {
    el.panicScreen.style.setProperty('--settle', '1');
    el.panicKept.textContent = streakText();
    panicStage(el.panicDone);
  }

  el.panic.addEventListener('click', openPanic);
  $('panicClose').addEventListener('click', () => el.panicScreen.close());
  $('panicBack').addEventListener('click', () => el.panicScreen.close());
  el.panicScreen.addEventListener('close', () => {
    cancelAnimationFrame(panic.raf);
    clearTimeout(panic.timer);
    el.tide.style.transform = '';
  });

  el.whyInput.addEventListener('input', () => store.setWhy(el.whyInput.value.trim()));

  /* ─────────────── Boot ─────────────── */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.start != null) tick();
  });

  el.brand.textContent = CONFIG.name;
  document.querySelectorAll('[data-brand]').forEach((n) => { n.textContent = CONFIG.name; });
  // Design-only links and buttons: not wired to anything yet
  document.querySelectorAll('[data-placeholder]').forEach((n) => n.addEventListener('click', (e) => e.preventDefault()));
  document.title = CONFIG.name || 'Streak';

  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, wait(1200)]) : Promise.resolve();
  fontsReady.then(() => {
    state.start = startFromURL() ?? store.get();
    if (state.start == null) showSetup();
    else showCount();
  });
})();
