/* Kanso. Everything is kept in this browser (localStorage key "kanso:v1"); nothing is sent anywhere. */
(() => {
  'use strict';

  const KEY = 'kanso:v1';
  const OLD_V2 = 'sovereign:v2';   // read-only, to offer carrying a start date over
  const OLD_V1 = 'streak:start';   // read-only
  const SEC = 1e3, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const ARC_DAYS = 90;
  const WAVE_MS = 90 * SEC;
  const PAGES = ['sanctuary', 'sos', 'zen', 'journey'];
  const ROMAN = ['I', 'II', 'III', 'IV'];

  /* A general picture of how a reset tends to feel. Not a measurement of the person using this. */
  const PHASES = [
    { from: 1, to: 7, name: 'The Acute Peak', text: 'The first days are the loudest. Urges come often and sleep can be uneven. Slow breathing and cold water are the tools that matter most here.' },
    { from: 8, to: 21, name: 'Flat Days, Returning Colour', text: 'The noise drops and a flatness can follow. Small things begin to register again: warm tea, a page of a book, wind.' },
    { from: 22, to: 60, name: 'Widening the Gap', text: 'The space between an impulse and an action gets longer. What was a split-second reflex becomes something you can watch before choosing.' },
    { from: 61, to: 90, name: 'Settling In', text: 'Attention rests more easily on the people and work in front of you. The practice becomes ordinary life rather than effort.' },
  ];

  const STAGES = [
    { from: 1, to: 10, name: 'Eliminating Hyper-Stimulation', text: 'No short-form infinite feeds, no recommendation rabbit holes, no late-night screens. Take the sharpest spikes away first.', list: ['Feeds and autoplay off', 'Phone sleeps outside the bedroom'], foot: 'Focus: fewer spikes' },
    { from: 11, to: 20, name: 'Boredom Tolerance & Natural Baseline', text: 'Welcome unoccupied stillness without reaching for a device. Let subtle pleasures register again: tea, handwriting, quiet walks.', list: ['45 minutes a day fully offline', 'Meals without media'], foot: 'Focus: comfort with quiet' },
    { from: 21, to: 30, name: 'Deep Focus & Reconnection', text: 'Unbroken ninety-minute blocks of real work. Eye contact and conversation with no screen in between.', list: ['One 24-hour day offline', 'An evening check-in with someone you trust'], foot: 'Focus: depth and connection' },
  ];

  const PROMPTS = [
    'Where in your body did you feel restlessness today, and what happened when you simply watched it leave?',
    'What were you actually hungry for the last time an urge arrived?',
    'Which hour of today felt most like your own?',
    'What did boredom feel like today, before you named it boredom?',
    'What small, ordinary thing gave you a moment of quiet pleasure?',
    'If today’s strongest urge could speak, what would it say it was protecting you from?',
    'Where did you move slowly today, and what did you notice because of it?',
    'What would you tell a friend who had the day you just had?',
    'What did you reach for today instead of your phone?',
    'What is one thing you want tomorrow morning to begin with?',
  ];

  const BREATH = {
    '44': [['Breathe in', 4, 'in'], ['Breathe out', 4, 'out']],
    '46': [['Inhale through the nose', 4, 'in'], ['Exhale slowly through parted lips', 6, 'out']],
    box: [['Inhale through the nose', 4, 'in'], ['Hold, lungs full', 4, 'hold'], ['Exhale slowly', 4, 'out'], ['Hold, lungs empty', 4, 'hold']],
  };
  const WAVE_C = 263.89;   // circumference of the ritual timer ring
  const TIDE_CUE = { in: 'The ink draws in', out: 'The ink spreads out', hold: 'Rest in the pause' };
  const BREATH_WORD = { in: 'In', out: 'Out', hold: 'Hold' };

  const RITUALS = {
    kintsugi: { title: 'Kintsugi of the Soul', kind: 'Self-compassion', mins: 8, lines: [
      'Sit comfortably. Bring to mind a recent slip or a hard moment, without the story around it.',
      'Notice where it sits in the body. Let the breath move around that place.',
      'Name what you needed in that moment: rest, comfort, company, relief.',
      'Picture the crack filled with gold. It is part of the bowl now, and the bowl still holds water.',
      'Choose one small thing you will do differently next time. Then let it rest.',
    ] },
    shinrin: { title: 'Shinrin-yoku', kind: 'Sensory grounding', mins: 15, lines: [
      'Walk slowly, slower than feels natural. Leave the phone in your pocket.',
      'Let your eyes go soft. Count five shades of green, or of grey.',
      'Listen for the furthest sound you can hear, then the nearest.',
      'Touch bark, a leaf, a railing, cold air. Notice its temperature.',
      'Stand still for one minute before you turn back.',
    ] },
    zazen: { title: 'Zazen', kind: 'Pure presence', mins: 20, lines: [
      'Spine upright, hands resting, eyes soft and lowered.',
      'Rest your attention on the breath in the lower belly.',
      'When a thought arrives, notice it and return. Nothing else is required.',
      'Just sitting.',
    ] },
  };

  const SIT_SECS = 10 * 60;
  const MOSS_SECS = 24 * 60;
  const SOUND_NAME = { wind: 'Temple wind', rain: 'Monastery rain' };
  const BAR_PX = [12, 20, 32, 24, 40, 28, 16, 36, 44, 24, 12, 32, 40, 48, 36, 28, 16, 44, 20, 32, 40, 24, 12, 20, 28, 36, 16, 8];

  /* ─────────────── Small helpers ─────────────── */
  const $ = (id) => document.getElementById(id);
  const all = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mmss = (secs) => `${pad(Math.floor(secs / 60))}:${pad(Math.floor(secs % 60))}`;

  function h(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name, cls) {
    const n = h('span', `ms ${cls || ''}`.trim(), name);
    n.setAttribute('aria-hidden', 'true');
    return n;
  }
  const dayKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const toInputValue = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const parseLocal = (str) => {
    if (!str) return NaN;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) str += 'T00:00';
    return new Date(str).getTime();
  };
  const clockTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const partOf = (hour) => (hour >= 5 && hour < 11 ? 'Morning' : hour >= 11 && hour < 17 ? 'Midday' : hour >= 17 && hour < 22 ? 'Evening' : 'Night');
  const watchOf = (ms) => ({ Morning: 'Dawn', Midday: 'Midday', Evening: 'Twilight', Night: 'Night' })[partOf(new Date(ms).getHours())];

  /* ─────────────── Storage (this device only) ─────────────── */
  const blank = () => ({
    start: null,
    contact: { name: '', phone: '' },
    events: [],   // { t, n, kind: 'wave' | 'note' | 'sit' | 'journal' | 'reset', ... }
    days: {},     // 'YYYY-MM-DD' → { n, vow, unease, peace, mind, sealed }
  });
  function load() {
    const base = blank();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        Object.assign(base, raw);
        base.contact = Object.assign({ name: '', phone: '' }, raw.contact);
        if (!Array.isArray(base.events)) base.events = [];
        if (!base.days || typeof base.days !== 'object') base.days = {};
        if (!(Number.isFinite(base.start) && base.start > 0)) base.start = null;
      }
    } catch {}
    return base;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }
  function earlierStart() {
    const ok = (n) => (Number.isFinite(n) && n > 0 && n <= Date.now() ? n : null);
    try {
      const v2 = JSON.parse(localStorage.getItem(OLD_V2) || 'null');
      if (v2 && ok(v2.start)) return v2.start;
    } catch {}
    try { return ok(Number(localStorage.getItem(OLD_V1))); } catch { return null; }
  }
  let data = load();

  /* For screenshots and recording: ?days=42.3 or ?since=2026-09-28T21:40 shows that count without saving it.
     Add &rankup to also play the rank-up moment for that day's rank. */
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
    if (q.has('demo')) return Date.now() - 11.4 * DAY;
    return null;
  }
  let preview = startFromURL();
  const startMs = () => preview ?? data.start;

  function moment() {
    const now = Date.now();
    const elapsed = Math.max(0, now - startMs());
    const exact = elapsed / DAY;
    const done = Math.floor(exact);   // whole days held
    const hour = new Date(now).getHours();
    return { now, elapsed, exact, done, dayNo: done + 1, hour, part: partOf(hour), key: dayKey(now) };
  }
  function dayRecord(m) {
    if (!data.days[m.key]) data.days[m.key] = { n: m.dayNo };
    return data.days[m.key];
  }
  function logEvent(kind, extra) {
    const m = moment();
    data.events.push(Object.assign({ t: m.now, n: m.dayNo, kind }, extra));
    save();
  }
  const phaseIndex = (dayNo) => {
    const i = PHASES.findIndex((p) => dayNo <= p.to);
    return i < 0 ? PHASES.length - 1 : i;
  };

  /* ─────────────── Sanctuary ─────────────── */
  /* Rank by whole days held. `ja` is the Japanese word shown under the English name (needs a native check before launch). */
  const RANKS = [
    { from: 0, name: 'Wanderer', ja: '旅人', color: '#a3a5a0' }, { from: 1, name: 'Novice', ja: '初心', color: '#8fb0c4' },
    { from: 3, name: 'Seeker', ja: '求道', color: '#d1a96a' }, { from: 7, name: 'Student', ja: '学徒', color: '#d98e6c' },
    { from: 14, name: 'Disciple', ja: '弟子', color: '#b8cdaa' }, { from: 30, name: 'Monk', ja: '僧', color: '#74bfa6' },
    { from: 60, name: 'Sage', ja: '賢者', color: '#e3c55c' }, { from: 90, name: 'Master', ja: '老師', color: '#b9a4ec' },
  ];
  const rankOf = (done) => RANKS.findLast((r) => done >= r.from);
  /* Draws the stroke in a 200×200 box: starts lower-left with a loaded brush, runs clockwise,
     thins and breaks into dry bristles at the tail. Returns path data for ink, dry gaps, strands. */
  function ensoPaths(sweep) {
    const START = 212, R = 76, W = 13;
    const pt = (deg, rad) => {
      const a = (START + deg) * Math.PI / 180;
      return `${(100 + rad * Math.sin(a)).toFixed(2)} ${(100 - rad * Math.cos(a)).toFixed(2)}`;
    };
    const mid = (d) => R + 1.3 * Math.sin(d * 0.03 + 0.6) - d * 0.006;
    const taper = Math.min(46, sweep * 0.55);
    const width = (d) => {
      const head = Math.min(1, Math.sqrt(d / 7)) * (1 + 0.22 * Math.exp(-d / 16));
      const tail = Math.min(1, Math.pow((sweep - d) / taper, 0.7));
      return W * head * (0.2 + 0.8 * tail) * (1 + 0.07 * Math.sin(d * 0.09 + 2));
    };
    const outer = [], inner = [];
    for (let d = 0; d <= sweep; d += 1) {
      const w = width(d) / 2;
      outer.push(pt(d, mid(d) + w));
      inner.push(pt(d, mid(d) - w - 0.4 * Math.sin(d * 0.23)));
    }
    const arc = (from, to, off) => {
      const p = [];
      for (let d = Math.max(0, from); d <= to; d += 2) p.push(pt(d, mid(Math.min(d, sweep)) + off));
      return p.length > 1 ? `M${p.join('L')}` : '';
    };
    return {
      ink: `M${outer.join('L')}L${inner.reverse().join('L')}Z`,
      dry: arc(sweep - taper * 1.5, sweep - 3, 2.1) + arc(sweep - taper * 1.1, sweep - 2, -1.6) + arc(sweep - taper * 0.7, sweep - 1, 0.3),
      strands: arc(sweep - 4, sweep + 9, 1.4) + arc(sweep - 6, sweep + 5, -1.3) + arc(sweep - 3, sweep + 13, 0.1),
    };
  }

  function renderSanctuary(m) {
    $('contemplationLabel').textContent = `${m.part} contemplation • Presence`;
    const rank = rankOf(m.done), next = RANKS[RANKS.indexOf(rank) + 1];
    $('rankBig').textContent = rank.name;
    $('rankJa').textContent = rank.ja;
    $('rankJa').classList.toggle('is-two', [...rank.ja].length > 1);
    $('rankNext').textContent = next ? `${next.name} in ${plural(Math.ceil(next.from - m.exact), 'day')}` : 'The path is walked';
    $('ringImg').closest('.hero').style.setProperty('--rank', rank.color);
    const at = RANKS.indexOf(rank);
    if (!preview) {
      /* Remember the highest rank already shown, so reaching a new one plays the rank-up moment once. */
      const seen = data.rankSeen;
      if (seen !== at) { data.rankSeen = at; save(); }
      if (Number.isInteger(seen) && at > seen) playRankUp(firstPaint ? INTRO_MS + 500 : 400);
    }
    $('rankPath').replaceChildren(...RANKS.map((r, i) => {
      const li = h('li', i === at ? 'is-now' : i < at ? 'is-past' : '');
      li.style.setProperty('--c', r.color);
      const dot = h('i', 'rk-dot');
      dot.setAttribute('aria-hidden', 'true');
      li.append(dot, h('span', 'rk-name', r.name), h('small', 'rk-day', r.from ? `Day ${r.from}` : 'Start'));
      if (i === at) li.setAttribute('aria-current', 'step');
      return li;
    }));
    const part = next ? clamp((m.exact - rank.from) / (next.from - rank.from), 0, 1) : 0;
    $('rankPath').style.setProperty('--p', ((at + part) / (RANKS.length - 1)).toFixed(4));
    $('ringImg').setAttribute('aria-label', `${plural(m.done, 'day')} clean.`);
    $('rankImg').setAttribute('aria-label', `Your rank: ${rank.name}.` + (next ? ` ${next.name} at day ${next.from}.` : ''));

    const pi = phaseIndex(m.dayNo);
    $('arcPhase').textContent = `Phase ${ROMAN[pi]}: ${PHASES[pi].name}`;
    const ap = clamp(m.exact / ARC_DAYS, 0, 1);
    $('arcPct').textContent = `${Math.round(ap * 100)}% of the arc walked`;
    $('arcToday').textContent = `Day ${m.dayNo} (today)`;
    $('arcClipRect').setAttribute('width', (ap * 400).toFixed(1));
    placeArcMarker(ap);

    const vow = (data.days[m.key] || {}).vow;
    $('vowBtn').classList.toggle('is-done', !!vow);
    $('vowBtn').classList.toggle('primary', !vow);
    $('vowText').textContent = vow ? 'Sealed today' : 'Seal Intention';
    $('vowLine').textContent = vow
      ? `Sealed at ${clockTime(vow)}. I choose stillness over transient compulsion today.`
      : 'I choose stillness over transient compulsion today.';
    renderClock(m);
  }
  /* The hero is two screens you swipe between.
     First: the ensō brushes round over the 24 hours of the current day, with days clean inside.
     A faint full circle always sits behind the ink.
     Second: the rank ring and the eight-step path, filled in by renderSanctuary. */
  function renderClock(m) {
    const into = m.elapsed - m.done * DAY;
    $('cleanH').textContent = pad(Math.floor(into / HOUR));
    $('cleanM').textContent = pad(Math.floor((into % HOUR) / MIN));
    $('cleanS').textContent = pad(Math.floor((into % MIN) / SEC));
    /* While the opening animation runs, the stroke and the day count are scaled by its progress. */
    const k = 1 - Math.pow(1 - intro.t, 3);
    $('ringBig').textContent = `${Math.round(m.done * k)}d`;

    const sweep = Math.max(3, (8 + 360 * (into / DAY)) * k), enso = ensoPaths(sweep), fine = sweep > 34;
    if (!$('ensoGhost').hasAttribute('d')) $('ensoGhost').setAttribute('d', ensoPaths(368).ink);
    $('ensoInk').setAttribute('d', enso.ink);
    $('ensoDry').setAttribute('d', fine ? enso.dry : '');
    $('ensoStrands').setAttribute('d', fine ? enso.strands : '');
  }
  /* Opening animation: the ensō brushes itself round to where today has reached while the day
     count rolls up from zero. Plays once when the page first shows, and again if the circle is clicked.
     The clock starts on the first painted frame, so a page opened in a background tab still plays it. */
  const calmMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const INTRO_MS = 2200;
  const intro = { t: 1, raf: 0 };
  function playIntro() {
    if (calmMotion.matches || !startMs()) return;
    cancelAnimationFrame(intro.raf);
    intro.t = 0;
    renderClock(moment());
    let t0 = 0;
    const step = (now) => {
      t0 = t0 || now;
      intro.t = Math.min(1, (now - t0) / INTRO_MS);
      renderClock(moment());
      intro.raf = intro.t < 1 ? requestAnimationFrame(step) : 0;
    };
    intro.raf = requestAnimationFrame(step);
  }
  $('ringImg').addEventListener('click', playIntro);

  /* Rank-up moment: slide to the rank screen, then let the CSS draw the ring and stamp the Japanese in.
     Runs when a new rank is reached, and on demand with ?rankup in the URL (for recording). */
  let goSlide = () => {};
  let rankUpTimer = 0;
  function playRankUp(delay) {
    clearTimeout(rankUpTimer);
    rankUpTimer = setTimeout(() => {
      goSlide(1);
      if (calmMotion.matches) return;
      const ring = $('rankImg');
      ring.classList.remove('is-rankup');
      void ring.offsetWidth;   // restart the animation
      ring.classList.add('is-rankup');
    }, delay);
  }
  {
    const track = $('heroSwipe'), dots = all('#heroDots button');
    const calm = calmMotion;
    const slideNow = () => Math.round(track.scrollLeft / track.clientWidth);
    const markDot = (i) => dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    goSlide = (i) => {
      i = clamp(i, 0, dots.length - 1);
      markDot(i);
      track.scrollTo({ left: i * track.clientWidth, behavior: calm.matches ? 'auto' : 'smooth' });
    };
    track.addEventListener('scroll', () => markDot(slideNow()), { passive: true });
    dots.forEach((d, k) => d.addEventListener('click', () => goSlide(k)));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') goSlide(slideNow() + 1);
      if (e.key === 'ArrowLeft') goSlide(slideNow() - 1);
    });
    /* Touch swipes scroll natively; this adds click-and-drag for a mouse. */
    let drag = null;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, from: slideNow() };
      try { track.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      track.classList.add('is-dragging');
    });
    track.addEventListener('pointermove', (e) => { if (drag) track.scrollLeft = drag.left - (e.clientX - drag.x); });
    const drop = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, from = drag.from;
      drag = null;
      track.classList.remove('is-dragging');
      goSlide(Math.abs(dx) > 50 ? from + (dx < 0 ? 1 : -1) : from);
    };
    track.addEventListener('pointerup', drop);
    track.addEventListener('pointercancel', drop);
  }

  /* Put the "today" dot on the curve. Needs layout, so it is redone on resize and when the page is shown. */
  function placeArcMarker(ap) {
    const line = $('arcLine'), dot = $('arcNow');
    const svg = line.ownerSVGElement, box = svg.getBoundingClientRect(), host = dot.parentElement.getBoundingClientRect();
    if (!box.width) return;
    const x = ap * 400, total = line.getTotalLength();
    let lo = 0, hi = total;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (line.getPointAtLength(mid).x < x) lo = mid; else hi = mid;
    }
    const y = line.getPointAtLength(lo).y;
    dot.style.left = `${box.left - host.left + (x / 400) * box.width}px`;
    dot.style.top = `${box.top - host.top + (y / 80) * box.height}px`;
  }
  $('vowBtn').addEventListener('click', () => {
    const m = moment();
    const rec = dayRecord(m);
    if (rec.vow) return;
    rec.vow = m.now;
    save();
    renderAll();
  });

  /* ─────────────── Urge SOS: the 90-second wave ─────────────── */
  const wave = { state: 'idle', mode: '44', remaining: WAVE_MS, deadline: 0, timer: 0, step: -1, did: new Set() };

  function waveBegin() {
    if (wave.state === 'done') waveReset();
    wave.state = 'running';
    wave.deadline = Date.now() + wave.remaining;
    clearInterval(wave.timer);
    wave.timer = setInterval(waveTick, 200);
    waveTick();
  }
  function wavePause() {
    wave.remaining = Math.max(0, wave.deadline - Date.now());
    wave.state = 'paused';
    clearInterval(wave.timer);
    renderWave();
  }
  function waveReset() {
    clearInterval(wave.timer);
    wave.state = 'idle';
    wave.remaining = WAVE_MS;
    wave.step = -1;
    wave.did.clear();
    all('#ground button').forEach((b) => setGround(b, false));
    all('[data-disruptor]').forEach((b) => { b.classList.remove('is-done'); b.textContent = 'Complete'; });
    $('groundCount').textContent = '0 of 5 anchored';
    renderWave();
  }
  function waveTick() {
    wave.remaining = Math.max(0, wave.deadline - Date.now());
    if (wave.remaining <= 0) {
      clearInterval(wave.timer);
      wave.state = 'done';
      logEvent('wave', { mode: wave.mode, ground: all('#ground button[aria-pressed="true"]').length, did: [...wave.did] });
      renderJourney(moment());
    }
    renderWave();
  }
  function renderWave() {
    const p = 1 - wave.remaining / WAVE_MS; // 0 → 1 as the wave passes
    $('waveCard').dataset.state = wave.state;
    $('waveBar').style.width = `${p * 100}%`;
    $('waveTime').textContent = mmss(Math.ceil(wave.remaining / SEC));

    const running = wave.state === 'running';
    const phase = wave.state === 'done' ? 'Passed' : wave.state === 'idle' ? 'Still water' : p < 0.3 ? 'Rising' : p < 0.65 ? 'Cresting' : 'Receding';
    $('wavePhase').textContent = phase;
    $('waveKicker').textContent = wave.state === 'idle' ? 'Ready' : wave.state === 'paused' ? 'Paused' : wave.state === 'done' ? 'Wave passed' : `Wave ${phase.toLowerCase()}`;
    $('waveBtnIcon').textContent = running ? 'pause' : wave.state === 'done' ? 'replay' : 'play_arrow';
    $('waveBtnText').textContent = running ? 'Pause Wave' : wave.state === 'paused' ? 'Resume Wave' : wave.state === 'done' ? 'Ride Another' : 'Begin Wave';

    if (running) {
      const pattern = BREATH[wave.mode];
      const cycle = pattern.reduce((s, x) => s + x[1], 0);
      let t = ((WAVE_MS - wave.remaining) / SEC) % cycle, i = 0;
      while (t >= pattern[i][1]) { t -= pattern[i][1]; i++; }
      if (i !== wave.step) {
        wave.step = i;
        const [label, secs, kind] = pattern[i];
        $('breathTag').textContent = `${label} (${secs}s)`;
        $('breathCue').textContent = TIDE_CUE[kind];
        $('breathWord').textContent = BREATH_WORD[kind];
      }
    } else {
      wave.step = -1;
      $('breathWord').textContent = wave.state === 'idle' ? 'Ready' : wave.state === 'paused' ? 'Paused' : 'Passed';
      if (wave.state === 'idle') {
        $('breathTag').textContent = 'Breathe with the circle';
        $('breathCue').textContent = 'In as the ink draws in, out as it spreads.';
        $('waveNote').textContent = 'Ninety seconds. Let thoughts rise and recede like driftwood on the tide.';
      } else if (wave.state === 'paused') {
        $('breathTag').textContent = 'Paused';
        $('breathCue').textContent = 'The circle waits for you.';
      } else {
        const n = data.events.filter((e) => e.kind === 'wave').length;
        $('breathTag').textContent = 'The wave has passed';
        $('breathCue').textContent = 'You stayed. That is the whole practice.';
        $('waveNote').textContent = `Logged on this device. ${plural(n, 'wave')} ridden so far.`;
      }
    }
    sceneWake();
  }
  $('waveBtn').addEventListener('click', () => (wave.state === 'running' ? wavePause() : waveBegin()));
  $('waveReset').addEventListener('click', waveReset);
  function setMode(mode) {
    wave.mode = BREATH[mode] ? mode : '44';
    wave.step = -1;
    all('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === wave.mode)));
  }
  all('[data-mode]').forEach((b) => b.addEventListener('click', () => { setMode(b.dataset.mode); renderWave(); }));

  function setGround(btn, on) {
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.state').textContent = on ? 'check_circle' : 'radio_button_unchecked';
  }
  all('#ground button').forEach((btn) => btn.addEventListener('click', () => {
    setGround(btn, btn.getAttribute('aria-pressed') !== 'true');
    $('groundCount').textContent = `${all('#ground button[aria-pressed="true"]').length} of 5 anchored`;
  }));
  all('[data-disruptor]').forEach((btn) => btn.addEventListener('click', () => {
    const on = !btn.classList.contains('is-done');
    btn.classList.toggle('is-done', on);
    btn.textContent = on ? 'Done' : 'Complete';
    if (on) wave.did.add(btn.dataset.disruptor); else wave.did.delete(btn.dataset.disruptor);
  }));

  /* ─────────────── Urge SOS: the two scenes ─────────────── */
  /* Shown side by side. "ink": a wet ink circle draws in on the in-breath and spreads out on the out-breath.
     "sand":  a tray of sand that is raked wherever the pointer moves. */
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = { raf: 0, last: 0, level: 0.2, sound: false, hush: null, surf: null };
  const easeIO = (x) => (1 - Math.cos(Math.PI * clamp(x, 0, 1))) / 2;

  function grainTile(base, spread, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() - 0.5) * spread + (Math.random() < 0.04 ? -spread : 0);
      img.data[i] = base[0] + v; img.data[i + 1] = base[1] + v; img.data[i + 2] = base[2] + v * 0.9; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function fit(canvas) {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(r.width), hgt = Math.round(r.height);
    if (!w || !hgt) return null;
    const changed = canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr);
    if (changed) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr); }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h: hgt, changed };
  }

  /* How full the lungs are, 0 (out) → 1 (in), from where the breath is right now.
     The circle is at its smallest when this is 1 and at its widest when it is 0. */
  function tideTarget(now) {
    if (wave.state === 'running') {
      const pattern = BREATH[wave.mode];
      const cycle = pattern.reduce((s, x) => s + x[1], 0);
      let t = ((WAVE_MS - Math.max(0, wave.deadline - Date.now())) / SEC) % cycle, i = 0;   // the timer runs on the wall clock, not the frame clock
      while (t >= pattern[i][1]) { t -= pattern[i][1]; i++; }
      const [, secs, kind] = pattern[i];
      if (kind === 'in') return easeIO(t / secs);
      if (kind === 'out') return 1 - easeIO(t / secs);
      return pattern[(i + pattern.length - 1) % pattern.length][2] === 'in' ? 1 : 0;
    }
    if (wave.state === 'paused') return scene.level;
    const u = (now / 1000) % 8;   // idle or finished: keep breathing 4 in, 4 out so there is always something to follow
    return u < 4 ? easeIO(u / 4) : 1 - easeIO((u - 4) / 4);
  }

  /* The ink circle. Three layers, back to front:
     bleed  – soft blots where the ink has soaked outward into the paper
     wash   – a wide, half-transparent ring under the stroke
     stroke – many thin strands, each a slightly different ring, some running dry and breaking up */
  const paperGrain = grainTile([218, 208, 188], 20, 160);
  const INK = Array.from({ length: 60 }, () => {
    const r = Math.random;
    return { o: (r() + r() + r()) / 1.5 - 1, w: 0.6 + r() * 2.8, a: 0.07 + r() * 0.3, p: r() * 6.283, dry: r() < 0.45, dash: 30 + r() * 160, gap: 6 + r() * 46, spin: (r() - 0.5) * 0.1 };
  });
  const BLOTS = Array.from({ length: 22 }, (_, i) => ({ a: (i + Math.random()) / 22 * 6.283, o: Math.random() * 2.4 - 0.9, r: 0.04 + Math.random() * 0.075, d: 0.16 + Math.random() * 0.24, p: Math.random() * 6.283 }));
  function drawInk(now) {
    const f = fit($('inkCanvas'));
    if (!f) return;
    const { g, w, h: H } = f, t = calm ? 0 : now / 1000, S = Math.min(w, H), cx = w / 2, cy = H * 0.52;
    const dt = Math.min(0.1, (now - (scene.last || now)) / 1000);
    scene.last = now;
    scene.level += (tideTarget(now) - scene.level) * Math.min(1, dt * 8);
    const open = 1 - scene.level;   // widest with empty lungs

    g.fillStyle = g.createPattern(paperGrain, 'repeat'); g.fillRect(0, 0, w, H);
    const edge = g.createRadialGradient(cx, cy, S * 0.3, cx, cy, S * 0.78);
    edge.addColorStop(0, 'rgb(60 44 22 / 0)'); edge.addColorStop(1, 'rgb(60 44 22 / .26)');
    g.fillStyle = edge; g.fillRect(0, 0, w, H);

    const R = S * (0.13 + 0.25 * open), T = S * (0.034 + 0.03 * open);
    // The ring is never a perfect circle: it leans and shifts a little as a whole
    const lean = (a) => S * 0.009 * (Math.sin(a * 2 + t * 0.21) + 0.6 * Math.sin(a * 3 - t * 0.33 + 1.1));
    const ring = (radius) => {
      g.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * 6.2832, r = radius(a);
        if (i) g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.closePath();
    };
    g.lineCap = 'round'; g.lineJoin = 'round';

    // Bleed: the ink feathers outward, more as the circle spreads
    const soak = 0.55 + 0.45 * open;
    for (const b of BLOTS) {
      const rr = R + lean(b.a) + b.o * T * 0.6, x = cx + Math.cos(b.a) * rr, y = cy + Math.sin(b.a) * rr;
      const size = S * b.r * soak * (1 + 0.12 * Math.sin(t * 0.4 + b.p));
      const blot = g.createRadialGradient(x, y, 0, x, y, size);
      blot.addColorStop(0, `rgb(34 32 36 / ${b.d})`); blot.addColorStop(0.55, `rgb(40 38 42 / ${b.d * 0.45})`); blot.addColorStop(1, 'rgb(40 38 42 / 0)');
      g.fillStyle = blot; g.beginPath(); g.arc(x, y, size, 0, 6.2832); g.fill();
    }
    g.save();
    g.shadowColor = 'rgb(30 28 32 / .6)'; g.shadowBlur = S * 0.085 * soak;
    ring((a) => R + lean(a)); g.strokeStyle = 'rgb(30 28 32 / .28)'; g.lineWidth = T * 1.15; g.stroke();
    g.restore();

    // Wash, then the stroke itself, in one even black
    const load = 'rgb(20 18 16)';
    g.globalAlpha = 0.55;
    ring((a) => R + lean(a)); g.strokeStyle = load; g.lineWidth = T * 1.5; g.stroke();

    for (const s of INK) {
      const turn = t * s.spin + s.p;
      ring((a) => R + lean(a) + s.o * T * 0.56 * (1 + 0.3 * Math.sin(a * 2 + s.p)) + S * 0.004 * Math.sin(a * 5 + turn * 3));
      g.setLineDash(s.dry ? [s.dash, s.gap] : []);
      g.lineDashOffset = turn * 60;
      g.globalAlpha = s.a;
      g.lineWidth = s.w * (S / 420) * (0.85 + 0.4 * open);
      g.stroke();
    }
    g.setLineDash([]); g.globalAlpha = 1;

    if (scene.surf) {   // a soft rush of air that swells with the in-breath
      const at = audio.ctx.currentTime;
      scene.surf.gain.gain.setTargetAtTime(0.03 + 0.2 * scene.level, at, 0.25);
      scene.surf.tone.frequency.setTargetAtTime(350 + 1500 * scene.level, at, 0.25);
    }
  }
  function sceneFrame(now) {
    scene.raf = 0;
    if (current !== 'sos' || document.hidden) { scene.last = 0; return; }
    drawInk(now);
    scene.raf = requestAnimationFrame(sceneFrame);
  }
  function sceneWake() {
    if (!scene.raf && current === 'sos' && !document.hidden) scene.raf = requestAnimationFrame(sceneFrame);
  }

  /* The sand tray. The sand is a height map and the picture is that map lit from the upper left.
     Each tine of the rake cuts its own thin groove, so old marks stay visible between new ones, and
     the rake head swings round gradually, so the grooves bunch together through a turn. */
  const TINES = 4, TINE_GAP = 6.8, GROOVE = 1.0;   // css px; GROOVE is the softness (sigma) of one groove
  const HANDLE = 46;   // css px from the head to the hand
  const GRAINS_MAX = 90, grains = [];   // loose grains flicked up by the tines: { x, y, z, vx, vy, vz, r, tone }
  const SAND_RGB = [234, 221, 196];
  const sand = { g: null, w: 0, pw: 0, ph: 0, dpr: 1, hgt: null, noise: null,
    at: null, tips: null, dx: 1, dy: 0, run: 0, down: false, t: 0, quiet: 0, hover: null, raf: 0, last: 0,
    tool: 'rake', rocks: [], next: null };   // rocks: { fx, fy, r, rot, squash } with fx/fy as fractions of the tray

  function sandReset() {
    const cv = $('sandCanvas'), f = fit(cv), top = fit($('rakeCanvas'));
    if (!f || !top) return;
    const W = cv.width, H = cv.height, dpr = W / f.w;
    if (!sand.noise || sand.noise.length !== W * H) {
      // Fine grain over soft, cloudy patches a few millimetres across
      const cell = Math.round(7 * dpr), cw = Math.ceil(W / cell) + 2, ch = Math.ceil(H / cell) + 2, cloud = new Float32Array(cw * ch);
      for (let n = 0; n < cloud.length; n++) cloud[n] = (Math.random() - 0.5) * 5;
      sand.noise = new Int8Array(W * H);
      for (let y = 0; y < H; y++) {
        const gy = y / cell, y0 = Math.floor(gy), fy = gy - y0;
        for (let x = 0; x < W; x++) {
          const gx = x / cell, x0 = Math.floor(gx), fx = gx - x0, n = y0 * cw + x0;
          const soft = (cloud[n] * (1 - fx) + cloud[n + 1] * fx) * (1 - fy) + (cloud[n + cw] * (1 - fx) + cloud[n + cw + 1] * fx) * fy;
          sand.noise[y * W + x] = soft + (Math.random() + Math.random() - 1) * 6;
        }
      }
    }
    Object.assign(sand, { g: f.g, w: f.w, pw: W, ph: H, dpr, hgt: new Float32Array(W * H), at: null, tips: null, down: false });
    grains.length = 0;
    sandShade(0, 0, W, H);
    drawRake();
  }
  function sandShade(x0, y0, x1, y1) {
    const W = sand.pw, H = sand.ph, hg = sand.hgt, noise = sand.noise;
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    if (x1 <= x0 || y1 <= y0) return;
    const img = sand.g.createImageData(x1 - x0, y1 - y0), d = img.data, pit = 0.1 / sand.dpr;
    let o = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++, o += 4) {
        const n = y * W + x;
        const slope = hg[x < W - 1 ? n + 1 : n] - hg[x ? n - 1 : n] + hg[y < H - 1 ? n + W : n] - hg[y ? n - W : n];
        const k = 1 - slope * 0.06 + hg[n] * pit, g = noise[n];   // lit by slope, and a little darker down in a groove
        d[o] = SAND_RGB[0] * k + g; d[o + 1] = SAND_RGB[1] * k + g; d[o + 2] = SAND_RGB[2] * k + g * 0.9; d[o + 3] = 255;
      }
    }
    sand.g.putImageData(img, x0, y0);
  }
  /* One tine drawn from a to b (device pixels): a thin groove, only ever cutting deeper */
  function sandGroove(ax, ay, bx, by, depth, box) {
    const W = sand.pw, H = sand.ph, hg = sand.hgt, sig = GROOVE * sand.dpr, reach = sig * 3, two = 2 * sig * sig, deep = depth * 1.15 * sand.dpr;
    const ex = bx - ax, ey = by - ay, len2 = ex * ex + ey * ey || 1;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - reach)), x1 = Math.min(W, Math.ceil(Math.max(ax, bx) + reach) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - reach)), y1 = Math.min(H, Math.ceil(Math.max(ay, by) + reach) + 1);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const u = clamp(((x - ax) * ex + (y - ay) * ey) / len2, 0, 1), px = x - ax - ex * u, py = y - ay - ey * u, d2 = px * px + py * py;
        if (d2 > reach * reach) continue;
        const n = y * W + x, cut = -deep * Math.exp(-d2 / two);
        if (cut < hg[n]) hg[n] = cut;
      }
    }
    box[0] = Math.min(box[0], x0); box[1] = Math.min(box[1], y0); box[2] = Math.max(box[2], x1); box[3] = Math.max(box[3], y1);
  }
  /* The pointer holds the END OF THE HANDLE and the head is towed behind it, like a trailer: it
     stays one handle-length from the hand, pulled along or pushed ahead. That is what makes
     long lines come out straight (a wobble of the hand barely moves the head) and what makes the
     head swing round naturally. `carve` is false while just hovering. */
  function rakeTo(x, y, now, carve) {
    if (!sand.hgt) sandReset();
    if (!sand.hgt) return;
    if (!sand.at) Object.assign(sand, { at: { x: x - sand.dx * HANDLE, y: y - sand.dy * HANDLE }, tips: null, t: now });
    const a = sand.at, vx = x - a.x, vy = y - a.y, reach = Math.hypot(vx, vy);
    if (reach < 6) return;   // hand right on top of the head: nothing to steer by
    const dx = vx / reach, dy = vy / reach, pull = reach - HANDLE, d = sand.dpr;   // the handle is rigid: pulled when the hand moves away, pushed when it moves in
    const tx = a.x + dx * pull, ty = a.y + dy * pull;
    const tips = [];
    for (let tine = 0; tine < TINES; tine++) {
      const o = (tine - (TINES - 1) / 2) * TINE_GAP;
      tips.push([(tx - dy * o) * d, (ty + dx * o) * d]);
    }
    const swing = sand.tips ? Math.hypot(tips[0][0] - sand.tips[0][0], tips[0][1] - sand.tips[0][1]) / d : 0;   // how far the outermost tine moved
    if (carve && sand.tips && swing > 0.3) {
      sand.run += Math.max(Math.abs(pull), swing);
      const depth = Math.min(1, sand.run / 22) ** 1.4, box = [Infinity, Infinity, -1, -1];   // the tines sink in over the first couple of centimetres
      tips.forEach((p, tine) => sandGroove(sand.tips[tine][0], sand.tips[tine][1], p[0], p[1], depth, box));
      sandShade(box[0] - 1, box[1] - 1, box[2] + 1, box[3] + 1);
      // Now and then a grain flicks up off a tine and drops back
      if (!calm && grains.length < GRAINS_MAX && Math.random() < Math.abs(pull) * 0.1) {
        const p = tips[Math.floor(Math.random() * TINES)], side = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 20), along = -4 + Math.random() * 14;
        grains.push({ x: p[0] / d, y: p[1] / d, z: 0.3, vx: -dy * side + dx * along, vy: dx * side + dy * along, vz: 26 + Math.random() * 44, r: 0.4 + Math.random() * 0.4, tone: Math.random() });
        if (!sand.raf) { sand.last = 0; sand.raf = requestAnimationFrame(grainFrame); }
      }
      if (scene.hush) {   // the hiss of the rake follows how fast it is pulled
        const speed = Math.abs(pull) / Math.max(8, now - sand.t);
        scene.hush.gain.gain.setTargetAtTime(clamp(speed * 0.16, 0.015, 0.16), audio.ctx.currentTime, 0.06);
        clearTimeout(sand.quiet);
        sand.quiet = setTimeout(() => scene.hush && scene.hush.gain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.12), 90);
      }
    }
    Object.assign(sand, { at: { x: tx, y: ty }, tips, dx, dy, t: now });
  }
  function grainFrame(now) {
    const dt = Math.min(0.05, (now - (sand.last || now)) / 1000);
    sand.last = now;
    for (let n = grains.length - 1; n >= 0; n--) {
      const p = grains[n];
      p.vz -= 420 * dt; p.z += p.vz * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.z <= 0) grains.splice(n, 1);
    }
    drawRake();
    sand.raf = grains.length ? requestAnimationFrame(grainFrame) : 0;
  }
  const ROCK_TONES = [['#a9aaa3', '#74766f', '#42443f'], ['#b0a696', '#7d7364', '#4a4237'], ['#99a2a8', '#667178', '#3b4349'], ['#8f8f8b', '#5c5d59', '#30312f']];
  const newRock = () => ({ r: 12 + Math.random() * 14, rot: Math.random() * Math.PI, squash: 0.66 + Math.random() * 0.26, seed: 1 + Math.floor(Math.random() * 1e6) });
  /* A rock is painted once onto its own small canvas and then stamped: an uneven pebble outline,
     lit from the upper left, speckled, with a soft cast shadow and a tight one where it meets the sand */
  function rockSprite(rock) {
    if (rock.img) return rock.img;
    let seed = rock.seed;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const r = rock.r, scale = 2, half = Math.ceil(r * 1.9), c = document.createElement('canvas');
    c.width = c.height = half * 2 * scale;
    const g = c.getContext('2d');
    g.scale(scale, scale); g.translate(half, half);
    // Outline: a squashed circle pushed in and out by a few slow waves
    const waves = [[2, 0.05 + rnd() * 0.07, rnd() * 6.28], [3, 0.03 + rnd() * 0.06, rnd() * 6.28], [5, 0.01 + rnd() * 0.03, rnd() * 6.28]];
    const pts = [];
    for (let n = 0; n < 28; n++) {
      const a = (n / 28) * 6.2832, rad = r * (1 + waves.reduce((sum, [f, amp, ph]) => sum + amp * Math.sin(a * f + ph), 0));
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad * rock.squash;
      pts.push([x * Math.cos(rock.rot) - y * Math.sin(rock.rot), x * Math.sin(rock.rot) + y * Math.cos(rock.rot)]);
    }
    const outline = () => {
      g.beginPath();
      pts.forEach((p, n) => { const q = pts[(n + 1) % pts.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (n) g.quadraticCurveTo(p[0], p[1], mx, my); else g.moveTo(mx, my); });
      g.closePath();
    };
    const tone = ROCK_TONES[Math.floor(rnd() * ROCK_TONES.length)];
    g.save();   // cast shadow, falling down and to the right
    g.shadowColor = 'rgb(66 46 18 / .42)'; g.shadowBlur = r * 0.5 * scale; g.shadowOffsetX = r * 0.22 * scale; g.shadowOffsetY = r * 0.3 * scale;
    g.fillStyle = tone[1]; outline(); g.fill();
    g.restore();
    g.save();   // contact shadow, tight against the base
    g.shadowColor = 'rgb(40 28 10 / .55)'; g.shadowBlur = 2.5 * scale; g.shadowOffsetX = 0.8 * scale; g.shadowOffsetY = 1.2 * scale;
    g.fillStyle = tone[1]; outline(); g.fill();
    g.restore();
    const body = g.createRadialGradient(-r * 0.4, -r * 0.45, r * 0.05, -r * 0.1, -r * 0.1, r * 1.35);
    body.addColorStop(0, tone[0]); body.addColorStop(0.5, tone[1]); body.addColorStop(1, tone[2]);
    g.fillStyle = body; outline(); g.fill();
    g.save();
    outline(); g.clip();
    for (let n = Math.round(r * r * 0.5); n > 0; n--) {   // mineral flecks
      const light = rnd() < 0.45;
      g.fillStyle = light ? `rgb(255 252 244 / ${0.05 + rnd() * 0.14})` : `rgb(20 20 18 / ${0.06 + rnd() * 0.16})`;
      g.beginPath(); g.arc((rnd() * 2 - 1) * r * 1.2, (rnd() * 2 - 1) * r * 1.2, 0.25 + rnd() * 0.7, 0, 6.2832); g.fill();
    }
    if (rnd() < 0.6) {   // a pale vein across it
      const a = rnd() * 3.14, o = (rnd() - 0.5) * r * 0.8;
      g.strokeStyle = 'rgb(255 250 238 / .14)'; g.lineWidth = 0.6 + rnd() * 0.9;
      g.beginPath(); g.moveTo(-Math.cos(a) * r * 1.4 - Math.sin(a) * o, -Math.sin(a) * r * 1.4 + Math.cos(a) * o);
      g.quadraticCurveTo((rnd() - 0.5) * r * 0.6, (rnd() - 0.5) * r * 0.6, Math.cos(a) * r * 1.4 - Math.sin(a) * o, Math.sin(a) * r * 1.4 + Math.cos(a) * o); g.stroke();
    }
    const sheen = g.createRadialGradient(-r * 0.38, -r * 0.42, 0, -r * 0.38, -r * 0.42, r * 0.75);   // light catching the top
    sheen.addColorStop(0, 'rgb(255 255 250 / .3)'); sheen.addColorStop(1, 'rgb(255 255 250 / 0)');
    g.fillStyle = sheen; g.fillRect(-half, -half, half * 2, half * 2);
    const under = g.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.8, r * 0.9);                      // the far side falling into shade
    under.addColorStop(0.45, 'rgb(0 0 0 / 0)'); under.addColorStop(1, 'rgb(0 0 0 / .42)');
    g.fillStyle = under; g.fillRect(-half, -half, half * 2, half * 2);
    g.restore();
    g.strokeStyle = 'rgb(20 18 14 / .28)'; g.lineWidth = 0.7; outline(); g.stroke();
    rock.img = c; rock.half = half;
    return c;
  }
  function drawRock(g, x, y, rock, ghost) {
    const img = rockSprite(rock);
    g.save();
    g.globalAlpha = ghost ? 0.55 : 1;
    g.drawImage(img, x - rock.half, y - rock.half, rock.half * 2, rock.half * 2);
    g.restore();
  }
  /* The overlay: rocks, grains in the air, and the wooden rake — head on the sand, handle up to the hand */
  function drawRake() {
    const top = fit($('rakeCanvas'));
    if (!top) return;
    const g = top.g, p = sand.at, hand = sand.hover;
    g.clearRect(0, 0, top.w, top.h);
    for (const rock of sand.rocks) drawRock(g, rock.fx * top.w, rock.fy * top.h, rock, false);
    for (const q of grains) {
      g.fillStyle = 'rgb(96 74 40 / .16)';                                   // its shadow on the sand
      g.beginPath(); g.arc(q.x + q.z * 0.4, q.y + q.z * 0.4, q.r, 0, 6.2832); g.fill();
      g.fillStyle = q.tone < 0.6 ? '#f1e6cd' : '#d3c4a2';
      g.beginPath(); g.arc(q.x, q.y - q.z * 0.6, q.r, 0, 6.2832); g.fill();
    }
    if (sand.tool === 'rock') {   // show the rock that a click would set down
      if (hand) drawRock(g, hand.x, hand.y, sand.next || (sand.next = newRock()), true);
      return;
    }
    if (!p || !hand) return;
    const head = (TINES - 1) * TINE_GAP + 9, grip = Math.min(HANDLE, Math.hypot(hand.x - p.x, hand.y - p.y));
    // Seen from above, x runs along the handle. Each piece is a rounded bar of wood shaded across
    // its width like a pole: pale along the top, darker toward the edges.
    const wood = (x, y, w, hgt, alongX, pale, mid, dark) => {
      const grad = alongX ? g.createLinearGradient(0, y, 0, y + hgt) : g.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, dark); grad.addColorStop(0.32, pale); grad.addColorStop(0.62, mid); grad.addColorStop(1, dark);
      g.fillStyle = grad;
      g.beginPath(); g.roundRect(x, y, w, hgt, Math.min(w, hgt) / 2); g.fill();
    };
    g.save();
    g.translate(p.x, p.y); g.rotate(Math.atan2(sand.dy, sand.dx));
    g.save();   // one shadow for the whole rake, thrown down and to the right whichever way it is turned
    g.shadowColor = 'rgb(62 42 14 / .38)'; g.shadowBlur = 6; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
    g.fillStyle = '#7a5a34';
    g.beginPath(); g.roundRect(-3.6, -head / 2, 7.2, head, 3.2); g.roundRect(2, -2.4, grip + 4, 4.8, 2.4); g.fill();
    g.restore();
    for (let tine = 0; tine < TINES; tine++) {   // tines: short pegs, tapering to a blunt point
      const y = (tine - (TINES - 1) / 2) * TINE_GAP;
      const peg = g.createLinearGradient(0, y - 1.9, 0, y + 1.9);
      peg.addColorStop(0, '#6e4f2b'); peg.addColorStop(0.35, '#d6b07a'); peg.addColorStop(1, '#7c5a32');
      g.fillStyle = peg;
      g.beginPath(); g.moveTo(-2, y - 1.9); g.lineTo(-9.5, y - 1.2); g.quadraticCurveTo(-12, y, -9.5, y + 1.2); g.lineTo(-2, y + 1.9); g.closePath(); g.fill();
    }
    wood(2, -2.4, grip + 4, 4.8, true, '#dcb983', '#b78d57', '#75552f');                    // handle
    g.strokeStyle = 'rgb(84 58 28 / .22)'; g.lineWidth = 0.5;                               // grain along the handle
    [-0.9, 0.4, 1.3].forEach((y, n) => { g.beginPath(); g.moveTo(8 + n * 5, y); g.lineTo(grip - 4 - n * 3, y + (n - 1) * 0.3); g.stroke(); });
    wood(-3.6, -head / 2, 7.2, head, false, '#cfa871', '#a47c49', '#6b4c28');               // head, across the handle
    g.strokeStyle = 'rgb(70 48 22 / .25)';
    [-1.4, 0.2, 1.6].forEach((x) => { g.beginPath(); g.moveTo(x, -head / 2 + 3); g.lineTo(x + 0.4, head / 2 - 3); g.stroke(); });
    g.fillStyle = 'rgb(52 36 16 / .55)'; g.beginPath(); g.arc(0, 0, 1.2, 0, 6.2832); g.fill();   // the peg that joins them
    wood(grip - 9, -3, 15, 6, true, '#c69b63', '#9c7443', '#5f4323');                        // grip at the hand
    g.restore();
  }
  {
    const cv = $('sandCanvas');
    const at = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      e.preventDefault();
      const [x, y] = at(e);
      if (sand.tool === 'rock') {   // click a rock to lift it, click bare sand to set one down
        const r = cv.getBoundingClientRect();
        const hit = sand.rocks.findLastIndex((k) => Math.hypot(k.fx * r.width - x, k.fy * r.height - y) < k.r);
        if (hit >= 0) sand.rocks.splice(hit, 1);
        else { sand.rocks.push(Object.assign(sand.next || newRock(), { fx: x / r.width, fy: y / r.height })); sand.next = null; }
        sand.hover = e.pointerType === 'mouse' ? { x, y } : null;
        drawRake();
        return;
      }
      try { cv.setPointerCapture(e.pointerId); } catch {}
      if (e.pointerType !== 'mouse') sand.at = null;   // a finger has no hover: set the rake down behind it
      Object.assign(sand, { down: true, run: 0, hover: { x, y } });
      rakeTo(x, y, e.timeStamp, false);
      drawRake();
    });
    cv.addEventListener('pointermove', (e) => {
      const [x, y] = at(e);
      sand.hover = { x, y };
      const list = sand.down && e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      if (sand.tool === 'rake') for (const ev of (list.length ? list : [e])) rakeTo(...at(ev), ev.timeStamp || e.timeStamp, sand.down);
      drawRake();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => cv.addEventListener(name, (e) => {
      if (name === 'pointerleave' && sand.down) return;   // still dragging, captured
      sand.down = false;
      if (name !== 'pointerup' || e.pointerType !== 'mouse') { sand.hover = null; sand.at = null; }
      drawRake();
    }));
    $('sandSmooth').addEventListener('click', sandReset);
    all('[data-sand-tool]').forEach((b) => b.addEventListener('click', () => {
      Object.assign(sand, { tool: b.dataset.sandTool, down: false, at: null, hover: null });
      all('[data-sand-tool]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      $('sandHint').textContent = sand.tool === 'rock'
        ? 'Click the sand to set a rock down. Click a rock to lift it away.'
        : 'Hold and pull the rake across the sand. There is nothing to finish and nothing to get right.';
      drawRake();
    }));
    new ResizeObserver(() => { const r = cv.getBoundingClientRect(); if (r.width && Math.round(r.width) !== sand.w) sandReset(); }).observe($('sandScene'));
  }

  /* Sound for both scenes: filtered noise, quiet until the breath or the rake moves */
  function sceneVoice(brown, type, freq, q) {
    const ctx = audioCtx(), src = noiseSource(ctx, brown), tone = ctx.createBiquadFilter(), gain = ctx.createGain();
    tone.type = type; tone.frequency.value = freq; tone.Q.value = q;
    gain.gain.value = 0;
    src.connect(tone); tone.connect(gain); gain.connect(ctx.destination);
    return { src, tone, gain };
  }
  function sceneSound(on) {
    scene.sound = on;
    for (const key of ['surf', 'hush']) {
      if (scene[key]) { try { scene[key].src.stop(); } catch {} scene[key].gain.disconnect(); scene[key] = null; }
    }
    if (on) {
      scene.surf = sceneVoice(true, 'lowpass', 500, 0.4);
      scene.hush = sceneVoice(false, 'bandpass', 3200, 0.7);
    }
    all('[data-scene-sound]').forEach((b) => { b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Sound on' : 'Sound off'; });
  }
  all('[data-scene-sound]').forEach((b) => b.addEventListener('click', () => sceneSound(!scene.sound)));

  function renderAlly() {
    const { name, phone } = data.contact;
    const who = name.trim() || 'your ally';
    const msg = 'Riding a wave now. No need to reply, just hold space.';
    const btn = $('allyBtn'), call = $('callAlly');
    if (phone.trim()) {
      const num = phone.replace(/[^\d+]/g, '');
      btn.href = `sms:${num}?&body=${encodeURIComponent(msg)}`;
      btn.textContent = 'Send Silent Ping';
      $('allyLine').textContent = `Send ${who} a plain message: “${msg}” This opens your messages app.`;
      call.href = `tel:${num}`;
      $('callAllyText').textContent = `Call ${who}`;
      call.hidden = false;
    } else {
      btn.href = '#sos';
      btn.textContent = 'Choose an ally';
      $('allyLine').textContent = `Send a plain message to someone you trust: “${msg}”`;
      call.hidden = true;
    }
  }
  $('allyBtn').addEventListener('click', (e) => {
    if (data.contact.phone.trim()) return;
    e.preventDefault();
    openSettings('setAllyName');
  });

  $('sosNoteSave').addEventListener('click', () => {
    const box = $('sosNote'), text = box.value.trim();
    if (!text) { $('sosNoteStatus').textContent = 'Write a line first, even a short one.'; box.focus(); return; }
    logEvent('note', { text });
    box.value = '';
    $('sosNoteStatus').textContent = 'Saved to your journal on this device.';
    renderJourney(moment());
  });

  const blankEl = $('blank');
  $('blankBtn').addEventListener('click', () => { blankEl.hidden = false; $('blankClose').focus(); });
  $('blankClose').addEventListener('click', () => { blankEl.hidden = true; $('blankBtn').focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !blankEl.hidden) blankEl.hidden = true; });

  /* ─────────────── Sound: generated in the browser, nothing is downloaded ─────────────── */
  const audio = { ctx: null, id: null, paused: false, master: null, nodes: [], t0: 0, secs: 0, timer: 0, onDone: null };

  function audioCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audio.ctx) audio.ctx = new Ctx();
    return audio.ctx;
  }
  function noiseSource(ctx, brown) {
    const len = ctx.sampleRate * 6;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; d[i] = last * 3.5; } else d[i] = white;
    }
    const edge = Math.floor(ctx.sampleRate * 0.25); // soften the loop seam
    for (let i = 0; i < edge; i++) { const k = i / edge; d[i] *= k; d[len - 1 - i] *= k; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    return src;
  }
  /* source → filters → gain → out, with an optional slow swell on the level */
  function layer(ctx, out, brown, filters, level, swell, rate) {
    const src = noiseSource(ctx, brown);
    const nodes = [src];
    let tail = src;
    for (const [type, freq, q] of filters) {
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      tail.connect(f); tail = f; nodes.push(f);
    }
    const gain = ctx.createGain();
    gain.gain.value = level;
    tail.connect(gain); gain.connect(out); nodes.push(gain);
    if (swell) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = rate || 0.08; depth.gain.value = swell;
      lfo.connect(depth); depth.connect(gain.gain); lfo.start();
      nodes.push(lfo, depth);
    }
    return nodes;
  }
  const SOUNDS = {
    rain: (ctx, out) => [
      ...layer(ctx, out, false, [['highpass', 1200], ['lowpass', 7500]], 0.05, 0.012, 0.11),
      ...layer(ctx, out, true, [['lowpass', 420]], 0.3, 0.06, 0.05),
    ],
    wind: (ctx, out) => [
      ...layer(ctx, out, true, [['bandpass', 420, 0.6]], 0.55, 0.3, 0.07),
      ...layer(ctx, out, true, [['lowpass', 160]], 0.22, 0.08, 0.03),
    ],
  };
  function bell(ctx, when) {
    [1, 2.76, 5.4].forEach((mult, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 196 * mult;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.2 / (i + 1), when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 7 - i * 1.6);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(when); osc.stop(when + 7.2);
    });
  }
  function killNodes() {
    for (const n of audio.nodes) {
      try { if (n.stop) n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    }
    audio.nodes = [];
  }
  function audioStop() {
    clearInterval(audio.timer);
    killNodes();
    if (audio.master) { try { audio.master.disconnect(); } catch {} }
    if (audio.ctx && audio.paused) audio.ctx.resume();
    audio.master = null; audio.id = null; audio.paused = false; audio.onDone = null;
    renderAudio();
  }
  function audioPlay(id, secs, sound, opts) {
    audioStop();
    const ctx = audioCtx();
    if (!ctx) return;
    ctx.resume();
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(1, t0 + 3);
    master.gain.setValueAtTime(1, t0 + secs - 5);
    master.gain.linearRampToValueAtTime(0, t0 + secs);
    master.connect(ctx.destination);
    Object.assign(audio, { master, id, t0, secs, onDone: (opts && opts.onDone) || null, nodes: SOUNDS[sound](ctx, master) });
    if (opts && opts.bells) { bell(ctx, t0 + 0.15); bell(ctx, t0 + secs - 7); }
    audio.timer = setInterval(() => {
      if (audio.ctx.currentTime - audio.t0 >= audio.secs) {
        const done = audio.onDone;
        audioStop();
        if (done) done();
      } else renderAudio();
    }, 250);
    renderAudio();
  }
  function audioPauseToggle() {
    audio.paused = !audio.paused;
    if (audio.paused) audio.ctx.suspend(); else audio.ctx.resume();
    renderAudio();
  }
  const audioElapsed = () => (audio.id ? clamp(audio.ctx.currentTime - audio.t0, 0, audio.secs) : 0);

  let sitSound = 'wind';
  let sitDone = false;
  function renderAudio() {
    const playing = (id) => audio.id === id && !audio.paused;
    // Ambient card on Sanctuary
    const gone = audio.id === 'moss' ? audioElapsed() : 0;
    all('[data-track="moss"]').forEach((btn) => {
      btn.classList.toggle('is-playing', playing('moss'));
      btn.firstElementChild.textContent = playing('moss') ? 'pause' : 'play_arrow';
      btn.setAttribute('aria-label', `${playing('moss') ? 'Pause' : 'Play'} Moss Garden Rain`);
    });
    all('[data-track-time="moss"]').forEach((el) => { el.textContent = mmss(gone); });
    all('[data-track-fill="moss"]').forEach((el) => { el.style.width = `${(gone / MOSS_SECS) * 100}%`; });
    // Session of the day
    const sat = audio.id === 'sit' ? audioElapsed() : 0;
    const btn = $('sitPlay');
    btn.classList.toggle('is-playing', playing('sit'));
    btn.firstElementChild.textContent = playing('sit') ? 'pause' : 'play_arrow';
    btn.setAttribute('aria-label', playing('sit') ? 'Pause session' : 'Play session');
    $('sitTime').textContent = `${mmss(sat)} / ${mmss(SIT_SECS)}`;
    const state = audio.id !== 'sit' ? (sitDone ? 'Complete • Logged to your journey' : `Ready • ${SOUND_NAME[sitSound]}`) : `${audio.paused ? 'Paused' : 'Sitting'} • ${SOUND_NAME[sitSound]}`;
    $('sitState').textContent = state;
    const bars = $('sitBars').children, at = Math.floor((sat / SIT_SECS) * bars.length);
    for (let i = 0; i < bars.length; i++) {
      bars[i].className = audio.id === 'sit' ? (i < at ? 'on' : i === at ? 'head' : '') : sitDone ? 'on' : '';
    }
  }
  for (const px of BAR_PX) { const bar = document.createElement('i'); bar.style.height = `${px}px`; $('sitBars').append(bar); }

  all('[data-track="moss"]').forEach((btn) => btn.addEventListener('click', () => {
    if (audio.id === 'moss') audioPauseToggle(); else audioPlay('moss', MOSS_SECS, 'rain');
  }));
  function sitStart() {
    sitDone = false;
    audioPlay('sit', SIT_SECS, sitSound, { bells: true, onDone: () => {
      sitDone = true;
      logEvent('sit', { name: 'Chishin', mins: SIT_SECS / 60 });
      renderAudio();
      renderJourney(moment());
    } });
  }
  $('sitPlay').addEventListener('click', () => { if (audio.id === 'sit') audioPauseToggle(); else sitStart(); });
  $('sitRestart').addEventListener('click', () => { if (audio.id === 'sit') sitStart(); else { sitDone = false; renderAudio(); } });
  all('[data-sound]').forEach((b) => b.addEventListener('click', () => {
    sitSound = b.dataset.sound;
    all('[data-sound]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (audio.id === 'sit') { killNodes(); audio.nodes = SOUNDS[sitSound](audio.ctx, audio.master); }
    renderAudio();
  }));

  /* ─────────────── Daily Zen ─────────────── */
  let gateKey = null;
  function renderZen(m) {
    $('zenDay').textContent = `Daily Zen • Day ${m.dayNo}`;
    $('zenPart').textContent = `${m.part} stillness`;
    const pct = Math.round(clamp(m.exact / ARC_DAYS, 0, 1) * 100);
    $('meterArc').style.strokeDashoffset = 100 - pct;
    $('meterText').textContent = `Day ${m.dayNo} • ${pct}% walked`;

    const holder = $('stages');
    holder.textContent = '';
    STAGES.forEach((s, i) => {
      const state = m.dayNo > s.to ? 'done' : m.dayNo >= s.from ? 'active' : 'future';
      const card = h('article', `card stage is-${state}`);
      const top = h('div', 'stage-top');
      top.append(h('span', `label-sm caps ${state === 'active' ? 'coral-text' : 'dim'}`, `Stage 0${i + 1} • Days ${s.from}–${s.to}`));
      top.append(h('span', `pill ${state === 'active' ? 'coral strong' : state === 'done' ? 'sage' : ''}`,
        state === 'active' ? 'Active' : state === 'done' ? 'Complete' : `Unlocks in ${plural(s.from - m.dayNo, 'day')}`));
      card.append(top, h('h3', 'h-sm', s.name), h('p', 'body-sm dim2', s.text));
      if (state === 'active') {
        const span = s.to - s.from + 1, inStage = m.dayNo - s.from + 1;
        const bar = h('div', 'stage-bar'), line = h('div', 'label-sm');
        line.append(h('span', 'dim', 'Stage completion'), h('span', 'strong', `${inStage} / ${span} days`));
        const track = h('div', 'track'), fill = h('i');
        fill.style.width = `${(inStage / span) * 100}%`;
        track.append(fill);
        bar.append(line, track);
        card.append(bar);
      }
      const list = h('ul');
      s.list.forEach((item) => list.append(h('li', '', item)));
      const foot = h('div', 'stage-foot label-sm');
      foot.append(h('span', '', s.foot), icon(state === 'future' ? 'lock' : state === 'done' ? 'check_circle' : 'arrow_forward', state === 'done' ? 'sage' : ''));
      card.append(list, foot);
      holder.append(card);
    });

    // Fill today's reflection once per day, so typing is never overwritten by a re-render
    if (gateKey !== m.key) {
      gateKey = m.key;
      const rec = data.days[m.key] || {};
      $('gateUnease').value = rec.unease || '';
      $('gatePeace').value = rec.peace || '';
      all('[data-mind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mind === rec.mind)));
      $('gateBtnText').textContent = rec.sealed ? 'Update Reflection' : 'Seal Reflection';
      $('gateStatus').textContent = rec.sealed ? `Sealed at ${clockTime(rec.sealed)}` : '';
    }
  }
  function single(group, attr) {
    all(`[${attr}]`, group).forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      all(`[${attr}]`, group).forEach((x) => x.setAttribute('aria-pressed', String(on && x === b)));
    }));
  }
  const picked = (group, attr, key) => { const b = group.querySelector(`[${attr}][aria-pressed="true"]`); return b ? b.dataset[key] : ''; };
  single($('gateMind'), 'data-mind');
  single($('journalState'), 'data-state');

  $('gateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const unease = $('gateUnease').value.trim(), peace = $('gatePeace').value.trim();
    if (!unease && !peace) { $('gateStatus').textContent = 'Write a line in either box first.'; return; }
    const m = moment(), rec = dayRecord(m);
    Object.assign(rec, { unease, peace, mind: picked($('gateMind'), 'data-mind', 'mind'), sealed: m.now });
    save();
    $('gateStatus').textContent = 'Saved to this device';
    $('gateBtnText').textContent = 'Update Reflection';
    renderJourney(m);
  });

  /* Ritual timer */
  const ritual = { id: null, state: 'idle', remaining: 0, deadline: 0, timer: 0 };
  const ritualDlg = $('ritual');
  function ritualOpen(id) {
    const r = RITUALS[id];
    clearInterval(ritual.timer);
    Object.assign(ritual, { id, state: 'idle', remaining: r.mins * MIN });
    $('ritualKind').textContent = r.kind;
    $('ritualTitle').textContent = r.title;
    renderRitual();
    ritualDlg.showModal();
  }
  function renderRitual() {
    const r = RITUALS[ritual.id], total = r.mins * MIN, p = 1 - ritual.remaining / total;
    $('ritualArc').style.strokeDashoffset = WAVE_C * p;
    $('ritualTime').textContent = mmss(Math.ceil(ritual.remaining / SEC));
    $('ritualSub').textContent = { idle: `${r.mins} minutes`, running: 'In practice', paused: 'Paused', done: 'Complete' }[ritual.state];
    $('ritualLine').textContent = ritual.state === 'done'
      ? 'Complete. Logged to your journey on this device.'
      : r.lines[Math.min(r.lines.length - 1, Math.floor(p * r.lines.length))];
    $('ritualBtnIcon').textContent = ritual.state === 'running' ? 'pause' : ritual.state === 'done' ? 'check' : 'play_arrow';
    $('ritualBtnText').textContent = { idle: 'Begin', running: 'Pause', paused: 'Resume', done: 'Done' }[ritual.state];
  }
  function ritualTick() {
    ritual.remaining = Math.max(0, ritual.deadline - Date.now());
    if (ritual.remaining <= 0) {
      clearInterval(ritual.timer);
      ritual.state = 'done';
      const r = RITUALS[ritual.id], ctx = audioCtx();
      if (ctx) { ctx.resume(); bell(ctx, ctx.currentTime + 0.05); }
      logEvent('sit', { name: r.title, mins: r.mins });
      renderJourney(moment());
    }
    renderRitual();
  }
  $('ritualBtn').addEventListener('click', () => {
    if (ritual.state === 'done') { ritualDlg.close(); return; }
    if (ritual.state === 'running') {
      ritual.remaining = Math.max(0, ritual.deadline - Date.now());
      ritual.state = 'paused';
      clearInterval(ritual.timer);
    } else {
      if (ritual.state === 'idle') {
        audioStop(); // one sound at a time
        const ctx = audioCtx();
        if (ctx) { ctx.resume(); bell(ctx, ctx.currentTime + 0.1); }
      }
      ritual.state = 'running';
      ritual.deadline = Date.now() + ritual.remaining;
      ritual.timer = setInterval(ritualTick, 250);
    }
    renderRitual();
  });
  $('ritualClose').addEventListener('click', () => ritualDlg.close());
  ritualDlg.addEventListener('close', () => { clearInterval(ritual.timer); ritual.state = 'idle'; });
  all('[data-ritual]').forEach((b) => b.addEventListener('click', () => ritualOpen(b.dataset.ritual)));

  /* ─────────────── The year in dots ─────────────── */
  /* One dot per calendar day of this year. A day is dim ("watched") when a fresh start was logged on
     it, lit ("clean") otherwise, and "before" when it predates the earliest start this device knows of.
     Add ?demo to the address to see a filled-in sample year without touching what is saved. */
  const DEMO = new URLSearchParams(location.search).has('demo');
  const MD = { month: 'short', day: 'numeric' };
  const STATE_WORD = { clean: 'Clean', watched: 'Watched', future: 'To come', before: 'Before you began' };
  let showAllEntries = false;
  let dotsSig = '';

  function dayStates(m) {
    const todayKey = dayKey(m.now), start = startMs();
    const resets = data.events.filter((e) => e.kind === 'reset');
    const origin = dayKey(Math.min(start, ...resets.map((e) => e.t - (e.held || 0) * DAY)));
    const watched = new Set(resets.map((e) => dayKey(e.t)));
    if (dayKey(start) > origin) watched.add(dayKey(start));   // the start was moved to a later day
    if (!DEMO) return (key) => (key > todayKey ? 'future' : key < origin ? 'before' : watched.has(key) ? 'watched' : 'clean');
    // Sample year: slips thin out as the months go by, and the last twelve days are clean
    const year = new Date(m.now).getFullYear(), jan1 = new Date(year, 0, 1), sample = new Map();
    let seed = 20261, dim = false;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const span = Math.max(1, Math.round((new Date(todayKey) - new Date(dayKey(jan1.getTime()))) / DAY));
    for (let d = new Date(jan1), i = 0; dayKey(d.getTime()) <= todayKey; d.setDate(d.getDate() + 1), i++) {
      const p = 0.62 - 0.5 * (i / span);
      dim = span - i < 12 ? false : span - i === 12 || rnd() < (dim ? p + 0.18 : p);
      sample.set(dayKey(d.getTime()), dim ? 'watched' : 'clean');
    }
    return (key) => (key > todayKey ? 'future' : sample.get(key) || 'before');
  }

  function renderYear(m) {
    const stateOf = dayStates(m), todayKey = dayKey(m.now), year = new Date(m.now).getFullYear();
    const days = [];
    for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
      const key = dayKey(d.getTime());
      days.push({ key, state: stateOf(key), first: d.getDate() === 1, t: d.getTime() });
    }
    const n = (state) => days.filter((d) => d.state === state).length;
    const clean = n('clean'), dimmed = n('watched');
    let streak = 0;
    for (let d = new Date(m.now); streak < 36500 && stateOf(dayKey(d.getTime())) === 'clean'; d.setDate(d.getDate() - 1)) streak++;

    $('yClean').textContent = clean;
    $('yCleanWord').textContent = `clean ${clean === 1 ? 'day' : 'days'} in ${year}`;
    $('yStreak').textContent = streak;

    const sig = year + days.map((d) => d.state[0]).join('') + todayKey;
    if (sig === dotsSig) return;
    dotsSig = sig;
    // Laid out like a contribution calendar: one column per week (Monday on top), months along the top
    const grid = $('dots');
    const lead = (new Date(year, 0, 1).getDay() + 6) % 7;
    grid.textContent = '';
    grid.style.setProperty('--weeks', Math.ceil((lead + days.length) / 7));
    grid.setAttribute('aria-label', `${year}, one dot per day: ${plural(clean, 'clean day')}, ${dimmed} watched, ${plural(streak, 'day')} in a row.`);
    [['Mon', 2], ['Wed', 4], ['Fri', 6]].forEach(([name, row]) => {
      const lb = h('span', 'wd', name);
      lb.style.gridRow = row;
      grid.append(lb);
    });
    days.forEach((d, i) => {
      d.col = Math.floor((lead + i) / 7) + 2;
      d.row = ((lead + i) % 7) + 2;
    });
    for (const d of days) {
      if (d.first) {
        const mo = h('span', 'mo', new Date(d.t).toLocaleDateString(undefined, { month: 'short' }).slice(0, 3));
        mo.style.gridColumn = `${d.row === 2 ? d.col : d.col + 1} / span 3`;   // first full week of the month
        grid.append(mo);
      }
      const empty = d.state === 'future' || d.state === 'before';
      const dot = h('i', `yd is-${empty ? 'empty' : d.state}${d.key === todayKey ? ' is-today' : ''}`);
      dot.style.setProperty('--c', d.col);
      dot.style.setProperty('--r', d.row);
      dot.title = `${new Date(d.t).toLocaleDateString(undefined, MD)} • ${d.key === todayKey ? 'Today, ' + STATE_WORD[d.state].toLowerCase() : STATE_WORD[d.state]}`;
      grid.append(dot);
    }
  }

  function entries() {
    const list = [];
    for (const e of data.events) {
      if (e.kind === 'journal') list.push({ t: e.t, n: e.n, text: e.text, chip: e.state || 'Journal', tone: e.state === 'Tender' ? 'gold' : 'sage' });
      if (e.kind === 'note') list.push({ t: e.t, n: e.n, text: e.text, chip: 'After a wave', tone: 'coral' });
      if (e.kind === 'reset') list.push({ t: e.t, n: e.n, repair: true, chip: 'Kintsugi Repair', tone: 'solid-gold',
        text: `Began again after ${plural(e.held || 0, 'day')}. No self-punishment. The bowl is not ruined; it is entering its second life.` });
    }
    for (const rec of Object.values(data.days)) {
      if (!rec.sealed || !(rec.unease || rec.peace)) continue;
      const parts = [];
      if (rec.unease) parts.push(`Friction: ${rec.unease}`);
      if (rec.peace) parts.push(`Anchor: ${rec.peace}`);
      list.push({ t: rec.sealed, n: rec.n, text: parts.join('\n'), chip: rec.mind || 'Closing the gate', tone: rec.mind === 'Agitated' ? 'coral' : 'sage' });
    }
    return list.sort((a, b) => b.t - a.t);
  }

  function renderJourney(m) {
    renderYear(m);

    // Journal
    $('promptLabel').textContent = `Mindful prompt of day ${m.dayNo}`;
    $('promptText').textContent = PROMPTS[(m.dayNo - 1) % PROMPTS.length];
    const list = entries();
    const holder = $('entries');
    holder.textContent = '';
    if (!list.length) holder.append(h('p', 'entry-empty body-sm', 'Nothing inscribed yet. What you write here, in Closing the Gate, and after a wave will gather in this column.'));
    (showAllEntries ? list : list.slice(0, 4)).forEach((e) => {
      const b = h('button', `entry ${e.repair ? 'is-repair' : ''}`.trim());
      b.type = 'button';
      b.setAttribute('aria-expanded', 'false');
      const top = h('span', 'entry-top label-sm');
      top.append(h('span', e.repair ? 'gold strong' : '', `Day ${e.n} • ${e.repair ? 'Pause & Return' : watchOf(e.t)}`), h('span', `pill ${e.tone}`, e.chip));
      b.append(top, h('span', 'entry-text body-sm', e.text));
      b.addEventListener('click', () => b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true')));
      holder.append(b);
    });
    $('entriesMore').hidden = list.length <= 4;
    $('entriesMore').textContent = showAllEntries ? 'Show fewer' : `Show all ${list.length} inscriptions`;
  }
  $('entriesMore').addEventListener('click', () => { showAllEntries = !showAllEntries; renderJourney(moment()); });
  $('journalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const box = $('journalText'), text = box.value.trim();
    if (!text) { $('journalStatus').textContent = 'Write a line first, even a short one.'; box.focus(); return; }
    logEvent('journal', { text, state: picked($('journalState'), 'data-state', 'state'), prompt: $('promptText').textContent });
    box.value = '';
    all('[data-state]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('journalStatus').textContent = 'Engraved. It stays on this device.';
    renderJourney(moment());
  });

  /* ─────────────── Everything together ─────────────── */
  let lastDone = -1;
  let firstPaint = true;
  function renderAll() {
    if (!startMs()) return;
    const m = moment();
    lastDone = m.done;
    renderSanctuary(m);
    renderZen(m);
    renderJourney(m);
    renderAlly();
    renderWave();
    renderAudio();
    if (firstPaint) {
      firstPaint = false;
      playIntro();
      if (new URLSearchParams(location.search).has('rankup')) playRankUp(INTRO_MS + 500);
    }
  }
  setInterval(() => {
    if (!startMs() || document.hidden) return;
    const m = moment();
    if (m.done !== lastDone) renderAll(); else renderClock(m);
  }, SEC);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderAll(); sceneWake(); } });
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (startMs()) placeArcMarker(clamp(moment().exact / ARC_DAYS, 0, 1)); }, 120);
  });

  /* ─────────────── Pages ─────────────── */
  let current = null;
  const pageFromHash = () => { const name = location.hash.slice(1); return PAGES.includes(name) ? name : 'sanctuary'; };
  function show(name) {
    const changed = name !== current;
    current = name;
    all('[data-page]').forEach((s) => { s.hidden = s.id !== name; });
    all('[data-nav]').forEach((a) => { if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (changed) scrollTo(0, 0);
    if (name === 'sos') { sceneWake(); if (!sand.w) sandReset(); } else if (scene.sound) sceneSound(false);
    if (name === 'sanctuary' && startMs()) placeArcMarker(clamp(moment().exact / ARC_DAYS, 0, 1));
  }
  function go(name) {
    if (location.hash !== `#${name}`) history.pushState(null, '', `#${name}`);
    show(name);
  }
  addEventListener('hashchange', () => show(pageFromHash()));
  addEventListener('popstate', () => show(pageFromHash()));

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-wave], a[data-scroll]');
    if (!link || !startMs()) return;
    e.preventDefault();
    go(link.getAttribute('href').slice(1));
    if (link.dataset.wave) {
      setMode(link.dataset.wave);
      if (wave.state !== 'running') waveBegin(); else renderWave();
    }
    if (link.dataset.scroll) requestAnimationFrame(() => $(link.dataset.scroll).scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });

  /* ─────────────── First run ─────────────── */
  function showApp() {
    $('setup').hidden = true;
    $('main').hidden = false;
    $('foot').hidden = false;
    $('tabs').hidden = false;
    show(pageFromHash());
    renderAll();
  }
  function showSetup() {
    $('main').hidden = true;
    $('foot').hidden = true;
    $('tabs').hidden = true;
    $('setup').hidden = false;
    const old = earlierStart(), carry = $('carryOver');
    carry.hidden = !old;
    if (old) {
      carry.textContent = `Carry over ${plural(Math.floor((Date.now() - old) / DAY), 'day')} from my earlier counter`;
      carry.onclick = () => setStart(old);
    }
    $('earlierInput').max = toInputValue(Date.now());
  }
  function setStart(ms) {
    data.start = ms;
    preview = null;
    save();
    showApp();
  }
  $('startNow').addEventListener('click', () => setStart(Date.now()));
  $('startEarlier').addEventListener('click', () => { $('earlierForm').hidden = !$('earlierForm').hidden; if (!$('earlierForm').hidden) $('earlierInput').focus(); });
  $('earlierForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = parseLocal($('earlierInput').value);
    const bad = !Number.isFinite(t) || t > Date.now();
    $('earlierHint').hidden = !bad;
    if (!bad) setStart(t);
  });

  /* ─────────────── Settings ─────────────── */
  const settings = $('settings');
  function disarm(btn) {
    clearTimeout(btn._t);
    if (btn.dataset.label) { btn.textContent = btn.dataset.label; delete btn.dataset.label; }
  }
  function confirmTwice(btn, action) {
    if (btn.dataset.label) { disarm(btn); action(); return; }
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Press again to confirm';
    btn._t = setTimeout(() => disarm(btn), 4000);
  }
  function openSettings(focusId) {
    if (!startMs()) return;
    $('setStart').value = toInputValue(startMs());
    $('setStart').max = toInputValue(Date.now());
    $('setStartHint').hidden = true;
    $('setAllyName').value = data.contact.name;
    $('setAllyPhone').value = data.contact.phone;
    disarm($('beginAgain')); disarm($('eraseAll'));
    settings.showModal();
    if (focusId) $(focusId).focus();
  }
  $('openSettings').addEventListener('click', () => openSettings());
  $('footData').addEventListener('click', () => openSettings());
  $('settingsClose').addEventListener('click', () => settings.close());
  $('settingsSave').addEventListener('click', () => {
    const t = parseLocal($('setStart').value);
    if (!Number.isFinite(t) || t > Date.now()) { $('setStartHint').hidden = false; return; }
    if (Math.abs(t - startMs()) >= MIN) { data.start = t; preview = null; }
    data.contact = { name: $('setAllyName').value.trim(), phone: $('setAllyPhone').value.trim() };
    save();
    settings.close();
    renderAll();
  });
  $('beginAgain').addEventListener('click', (e) => confirmTwice(e.currentTarget, () => {
    const m = moment();
    data.events.push({ t: m.now, n: 1, kind: 'reset', held: m.done });
    data.start = m.now;
    preview = null;
    save();
    gateKey = null;
    settings.close();
    renderAll();
  }));
  $('eraseAll').addEventListener('click', (e) => confirmTwice(e.currentTarget, () => {
    try { localStorage.removeItem(KEY); } catch {}
    audioStop();
    waveReset();
    data = blank();
    preview = null; gateKey = null; showAllEntries = false;
    settings.close();
    showSetup();
  }));
  [settings, ritualDlg].forEach((dlg) => dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }));

  /* ─────────────── Go ─────────────── */
  if (startMs()) showApp(); else showSetup();
})();
