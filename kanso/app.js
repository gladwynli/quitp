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

  const STONES = [
    { d: 7, name: 'Tender Sprout', sub: 'Grounded', icon: 'eco', desc: 'A sprout breaks the surface. The first week is the steepest, and getting through it is the root of everything after.' },
    { d: 30, name: 'Young Bamboo', sub: 'Flexible will', icon: 'psychiatry', desc: 'Bamboo bends in wind and does not break. A month in, the will becomes flexible instead of rigid.' },
    { d: 90, name: 'Pine Resilience', sub: 'Steady in wind', icon: 'forest', desc: 'The pine survives dry mountain winds without yielding. Ninety days is a full season of practice.' },
    { d: 365, name: 'Ancient Cedar', sub: 'Unshakable Ma', icon: 'nature_people', desc: 'A cedar measures time in rings. After a year the practice has stopped being an effort and become a way of standing.' },
  ];

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
    '46': [['Inhale through the nose', 4, 'in'], ['Exhale slowly through parted lips', 6, 'out']],
    box: [['Inhale through the nose', 4, 'in'], ['Hold, lungs full', 4, 'hold'], ['Exhale slowly', 4, 'out'], ['Hold, lungs empty', 4, 'hold']],
  };
  const CUE = { in: 'Filling from the belly upward', out: 'Releasing all tension into the floor', hold: 'Resting in the pause' };

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

  /* For screenshots: ?days=42.3 or ?since=2026-09-28T21:40 shows that count without saving it. */
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
  const ringTarget = (exact) => {
    for (const d of [90, 180, 365]) if (exact < d) return d;
    return (Math.floor(exact / 365) + 1) * 365;
  };

  /* ─────────────── Sanctuary ─────────────── */
  const RING_C = 490.09;
  function renderSanctuary(m) {
    $('havenPart').textContent = `${m.part} haven`;
    $('havenDay').textContent = m.dayNo <= ARC_DAYS ? `Day ${m.dayNo} of ${ARC_DAYS} reset` : `Day ${m.dayNo}`;
    $('contemplationLabel').textContent = `${m.part} contemplation • Presence`;
    $('daysNum').textContent = m.done;
    $('daysWord').textContent = m.done === 1 ? 'Day of Clarity' : 'Days of Clarity';

    const target = ringTarget(m.exact);
    const p = clamp(m.exact / target, 0, 1);
    $('ringArc').style.strokeDashoffset = RING_C * (1 - p);
    const a = p * 2 * Math.PI;
    $('ringHead').setAttribute('cx', (100 + 78 * Math.sin(a)).toFixed(2));
    $('ringHead').setAttribute('cy', (100 - 78 * Math.cos(a)).toFixed(2));
    $('ringImg').setAttribute('aria-label', `${plural(m.done, 'day')} of clarity, ${Math.round(p * 100)}% of the way to ${target} days`);

    const left = Math.ceil(target - m.exact);
    $('heroCap').textContent = m.done === 0
      ? `The first dawn is still ahead. Stay with today. ${plural(left, 'day')} to the ${target}-day marker.`
      : `${plural(m.done, 'dawn')} rooted in sovereignty. ${plural(left, 'day')} to the ${target}-day marker.`;

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
  function renderClock(m) {
    const into = m.elapsed - m.done * DAY;
    const hh = Math.floor(into / HOUR), mm = Math.floor((into % HOUR) / MIN), ss = Math.floor((into % MIN) / SEC);
    $('clock').textContent = `${pad(hh)}h ${pad(mm)}m ${pad(ss)}s into day ${m.dayNo}`;
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
  const WAVE_C = 263.89;
  const wave = { state: 'idle', mode: '46', remaining: WAVE_MS, deadline: 0, timer: 0, step: -1, did: new Set() };

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
    $('waveArc').style.strokeDashoffset = WAVE_C * p;
    $('waveTime').textContent = mmss(Math.ceil(wave.remaining / SEC));

    const running = wave.state === 'running';
    const phase = wave.state === 'done' ? 'Passed' : wave.state === 'idle' ? 'Still water' : p < 0.3 ? 'Rising' : p < 0.65 ? 'Cresting' : 'Receding';
    $('wavePhase').textContent = phase;
    $('waveKicker').textContent = wave.state === 'idle' ? 'Ready' : wave.state === 'paused' ? 'Paused' : wave.state === 'done' ? 'Wave passed' : `Wave ${phase.toLowerCase()}`;
    $('waveBtnIcon').textContent = running ? 'pause' : wave.state === 'done' ? 'replay' : 'play_arrow';
    $('waveBtnText').textContent = running ? 'Pause Wave' : wave.state === 'paused' ? 'Resume Wave' : wave.state === 'done' ? 'Ride Another' : 'Begin Wave';

    const halo = $('halo');
    if (running) {
      const pattern = BREATH[wave.mode];
      const cycle = pattern.reduce((s, x) => s + x[1], 0);
      let t = ((WAVE_MS - wave.remaining) / SEC) % cycle, i = 0;
      while (t >= pattern[i][1]) { t -= pattern[i][1]; i++; }
      if (i !== wave.step) {
        wave.step = i;
        const [label, secs, kind] = pattern[i];
        $('breathTag').textContent = `${label} (${secs}s)`;
        $('breathCue').textContent = CUE[kind];
        halo.style.transitionDuration = `${secs}s`;
        if (kind === 'in') { halo.style.transform = 'scale(1.3)'; halo.style.opacity = '.8'; }
        if (kind === 'out') { halo.style.transform = 'scale(.85)'; halo.style.opacity = '.3'; }
      }
    } else {
      wave.step = -1;
      halo.style.transitionDuration = '1.2s';
      halo.style.transform = 'scale(.85)';
      halo.style.opacity = wave.state === 'done' ? '.5' : '.3';
      if (wave.state === 'idle') {
        $('breathTag').textContent = 'Press begin, then follow the breath';
        $('breathCue').textContent = 'Ninety seconds. That is all.';
        $('waveNote').textContent = 'Keep your gaze softly on the ring. Let thoughts rise and recede like driftwood on the tide.';
      } else if (wave.state === 'paused') {
        $('breathTag').textContent = 'Paused';
        $('breathCue').textContent = 'The wave waits for you.';
      } else {
        const n = data.events.filter((e) => e.kind === 'wave').length;
        $('breathTag').textContent = 'The wave has passed';
        $('breathCue').textContent = 'You stayed. That is the whole practice.';
        $('waveNote').textContent = `Logged on this device. ${plural(n, 'wave')} ridden so far.`;
      }
    }
  }
  $('waveBtn').addEventListener('click', () => (wave.state === 'running' ? wavePause() : waveBegin()));
  $('waveReset').addEventListener('click', waveReset);
  function setMode(mode) {
    wave.mode = BREATH[mode] ? mode : '46';
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

  /* ─────────────── Journey & Reflection ─────────────── */
  let stonePick = null;
  let showAllEntries = false;
  const HEAT_ROWS = [['Morning', 5, 12], ['Afternoon', 12, 18], ['Evening', 18, 23], ['Night', 23, 5]];
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    const pi = phaseIndex(m.dayNo);
    $('jPhase').textContent = `Phase ${ROMAN[pi]}: ${PHASES[pi].name}`;
    $('jDays').textContent = m.done;
    $('jDaysWord').textContent = m.done === 1 ? 'sunrise' : 'sunrises';
    const cur = STONES.findIndex((s) => m.exact < s.d);
    $('jStage').textContent = cur < 0 ? 'Ancient Cedar standing' : `${STONES[cur].name} emerging`;

    const count = (kind) => data.events.filter((e) => e.kind === kind).length;
    const days = Object.values(data.days);
    $('lWaves').textContent = count('wave');
    $('lVows').textContent = days.filter((d) => d.vow).length;
    $('lSits').textContent = count('sit');
    $('lNotes').textContent = count('journal') + count('note') + days.filter((d) => d.sealed).length;

    // Garden markers
    if (stonePick == null) stonePick = cur < 0 ? STONES.length - 1 : cur;
    const stones = $('stones');
    stones.textContent = '';
    STONES.forEach((s, i) => {
      const state = cur < 0 || i < cur ? 'reached' : i === cur ? 'current' : 'future';
      const b = h('button', `stone is-${state}`);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === stonePick));
      if (state === 'current') b.append(h('span', 'badge pill coral strong caps', 'Current stand'));
      const ic = h('span', 'stone-ic');
      ic.append(icon(s.icon, state === 'future' ? '' : 'fill'));
      b.append(ic, h('span', 'h-sm', `${s.d} Days`), h('span', `label-sm ${state === 'current' ? 'coral-text' : state === 'future' ? 'dim' : 'sage'}`, s.name),
        h('span', 'label-sm dim', state === 'reached' ? 'Reached' : state === 'current' ? `Day ${m.dayNo} in progress` : s.sub));
      b.addEventListener('click', () => { stonePick = i; renderJourney(moment()); });
      stones.append(b);
    });
    const s = STONES[stonePick];
    const where = cur < 0 || stonePick < cur ? 'You have passed this marker.'
      : stonePick === cur ? `You are on day ${m.dayNo}; ${plural(Math.ceil(s.d - m.exact), 'day')} to go.`
        : `${plural(Math.ceil(s.d - m.exact), 'day')} from here.`;
    $('stoneTitle').textContent = `Stage ${stonePick + 1}: ${s.name} (${s.d} days)`;
    $('stoneDesc').textContent = `${s.desc} ${where}`;

    // The four phases
    const phases = $('phases');
    phases.textContent = '';
    PHASES.forEach((p, i) => {
      const state = m.dayNo > p.to ? 'done' : m.dayNo >= p.from ? 'active' : 'future';
      const card = h('article', `phase is-${state}`);
      const top = h('div', 'phase-top'), left = h('span', 'row gap8');
      left.append(h('i', 'dot'), h('span', `label-sm caps ${state === 'active' ? 'coral-text strong' : 'dim'}`,
        `Days ${p.from} – ${p.to}${i === PHASES.length - 1 ? '+' : ''}${state === 'active' ? ' • Active horizon' : ''}`));
      top.append(left, h('span', `pill ${state === 'active' ? 'coral strong' : state === 'done' ? 'sage' : ''}`,
        state === 'active' ? `Day ${m.dayNo} of ${p.to}` : state === 'done' ? 'Completed phase' : 'Upcoming'));
      card.append(top, h('h3', `h-sm ${state === 'future' ? 'dim2' : ''}`, p.name), h('p', 'body-sm dim2', p.text));
      if (state === 'active') {
        const span = p.to - p.from + 1, inPhase = m.dayNo - p.from + 1;
        const meter = h('div', 'phase-meter'), track = h('div', 'track'), fill = h('i'), line = h('div', 'label-sm');
        fill.style.width = `${(inPhase / span) * 100}%`;
        track.append(fill);
        line.append(h('span', '', `Day ${inPhase} of ${span} in this phase`), h('span', '', `${plural(p.to - m.dayNo, 'day')} remaining`));
        meter.append(track, line);
        card.append(meter);
      }
      phases.append(card);
    });

    // Heatmap from what was actually logged
    const since = m.now - 28 * DAY;
    const grid = HEAT_ROWS.map(() => Array(7).fill(0));
    let total = 0;
    for (const e of data.events) {
      if ((e.kind !== 'wave' && e.kind !== 'note') || e.t < since) continue;
      const d = new Date(e.t), hr = d.getHours();
      const row = HEAT_ROWS.findIndex(([, a, b]) => (a < b ? hr >= a && hr < b : hr >= a || hr < b));
      grid[row][(d.getDay() + 6) % 7]++;
      total++;
    }
    const max = Math.max(1, ...grid.flat());
    const heat = $('heat');
    heat.textContent = '';
    heat.append(h('span'));
    'MTWTFSS'.split('').forEach((c) => heat.append(h('span', 'hd', c)));
    let best = { c: 0 };
    HEAT_ROWS.forEach(([label], r) => {
      heat.append(h('span', 'lb', label));
      grid[r].forEach((c, col) => {
        const cell = h('i', 'heat-cell');
        if (c) cell.style.background = `rgb(232 93 74 / ${(0.2 + 0.7 * (c / max)).toFixed(2)})`;
        cell.title = `${WEEKDAYS[col]} ${label.toLowerCase()}: ${c} logged`;
        heat.append(cell);
        if (c > best.c) best = { c, r, col };
      });
    });
    $('heatPattern').textContent = total < 3
      ? 'Not enough logged yet. Each wave you ride and each note you save on the Urge SOS page lands here.'
      : `${WEEKDAYS[best.col]} ${HEAT_ROWS[best.r][0].toLowerCase()} holds ${Math.round((best.c / total) * 100)}% of what you have logged (${best.c} of ${total}). Plan something gentle for that window: a walk, a shower, an early night.`;

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

    const latest = list.find((e) => !e.repair);
    $('latestText').textContent = latest ? `“${latest.text}”` : 'Your latest reflection will rest here.';
    if (latest) {
      const gap = Math.round((new Date(dayKey(m.now)) - new Date(dayKey(latest.t))) / DAY);
      const day = gap === 0 ? 'today' : gap === 1 ? 'yesterday' : new Date(latest.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      $('latestWhen').textContent = `Logged ${day} at ${watchOf(latest.t).toLowerCase()}`;
    } else $('latestWhen').textContent = 'Nothing written yet';
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
  }
  setInterval(() => {
    if (!startMs() || document.hidden) return;
    const m = moment();
    if (m.done !== lastDone) renderAll(); else renderClock(m);
  }, SEC);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });
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
    stonePick = null;
    settings.close();
    renderAll();
  });
  $('beginAgain').addEventListener('click', (e) => confirmTwice(e.currentTarget, () => {
    const m = moment();
    data.events.push({ t: m.now, n: 1, kind: 'reset', held: m.done });
    data.start = m.now;
    preview = null;
    save();
    stonePick = null; gateKey = null;
    settings.close();
    renderAll();
  }));
  $('eraseAll').addEventListener('click', (e) => confirmTwice(e.currentTarget, () => {
    try { localStorage.removeItem(KEY); } catch {}
    audioStop();
    waveReset();
    data = blank();
    preview = null; stonePick = null; gateKey = null; showAllEntries = false;
    settings.close();
    showSetup();
  }));
  [settings, ritualDlg].forEach((dlg) => dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }));

  /* ─────────────── Go ─────────────── */
  if (startMs()) showApp(); else showSetup();
})();
