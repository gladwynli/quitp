(() => {
  'use strict';

  /* ─────────────── Config ─────────────── */
  const KEY = 'sovereign:v2';
  const V1_START = 'streak:start';
  const V1_WHY = 'streak:why';

  const SEC = 1e3, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

  /* Ring targets in days. After the last one, every further year is a target. */
  const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

  /* The four phases of the ninety-day arc. Day numbers are inclusive. */
  const PHASES = [
    { from: 1, to: 7, name: 'Acute Stabilization' },
    { from: 8, to: 21, name: 'Receptor Restoration' },
    { from: 22, to: 60, name: 'Synaptic Pruning' },
    { from: 61, to: 90, name: 'Baseline Reset' },
  ];
  const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];
  const ARC_DAYS = 90;

  /* One line a day, shown on Present. */
  const NOTES = [
    'Observe the wave until it recedes.',
    'You are observing an impulse, not inhabiting it.',
    'Nothing is owed to the impulse. Let it pass unanswered.',
    'Between the urge and the act there is a room. Stay in it.',
    'What you do not feed grows quiet.',
    'Boredom is not an emergency.',
    'Stillness is not the absence of the wave. It is your seat above it.',
    'Tonight’s restraint is tomorrow’s clarity.',
    'The urge is an echo of an old pathway. Echoes fade.',
    'Hold the line for ninety seconds. Then look again.',
  ];

  const MODES = {
    '478': {
      label: 'Breath Hold',
      steps: [
        { name: 'Inhale', secs: 4, scale: 1.1, guide: 'Inhale deeply through your nose.' },
        { name: 'Hold', secs: 7, scale: 1.1, guide: 'Suspend breath. Relax shoulders.' },
        { name: 'Exhale', secs: 8, scale: 0.9, guide: 'Long, soft exhale through lips.' },
      ],
    },
    sigh: {
      label: 'Double Sigh',
      steps: [
        { name: 'Inhale', secs: 3, scale: 1, guide: 'Inhale most of the way through your nose.' },
        { name: 'Top off', secs: 1, scale: 1.1, guide: 'A sharp second sip of air.' },
        { name: 'Long sigh', secs: 6, scale: 0.85, guide: 'Let it all go in one long sigh.' },
      ],
    },
  };

  const TECH_ICON = {
    'Breath Hold': 'air',
    'Double Sigh': 'air',
    'Cold Reset': 'water_drop',
    'Clench & Drain': 'sports_mma',
    'Horizon Shift': 'panorama_photosphere',
  };

  const WAVE_MS = 90 * SEC;
  const SCREENS = ['present', 'anchor', 'clarity', 'reflect'];

  /* ─────────────── Elements ─────────────── */
  const $ = (id) => document.getElementById(id);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

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

  /* ─────────────── Storage (device only) ─────────────── */
  const blank = () => ({
    start: null,
    name: '',
    why: '',
    contact: { name: '', phone: '' },
    minutesPerDay: 60,
    events: [],   // { t, kind: 'wave' | 'note', tech, tags, note }
    days: {},     // 'YYYY-MM-DD' → { n, vow, seal, deficit, deficitAt, joy, joyAt }
    saved: [],    // indexes into NOTES
    deferUntil: 0,
  });

  function load() {
    const base = blank();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        Object.assign(base, raw);
        base.contact = Object.assign({ name: '', phone: '' }, raw.contact);
        if (!Array.isArray(base.events)) base.events = [];
        if (!Array.isArray(base.saved)) base.saved = [];
        if (!base.days || typeof base.days !== 'object') base.days = {};
        if (!(Number.isFinite(base.start) && base.start > 0)) base.start = null;
      }
    } catch {}
    return base;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }
  /* The v1 counter keeps its own keys. We only ever read them. */
  function v1Start() {
    try {
      const n = Number(localStorage.getItem(V1_START));
      return Number.isFinite(n) && n > 0 && n <= Date.now() ? n : null;
    } catch { return null; }
  }

  let data = load();

  /* ─────────────── Time helpers ─────────────── */
  const pad = (n) => String(n).padStart(2, '0');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const dayKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const keyToDate = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const shiftDays = (ms, n) => {
    const d = new Date(ms);
    d.setDate(d.getDate() + n);
    return d.getTime();
  };
  const clockTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const longDate = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const shortDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const hourLabel = (hr) => new Date(2000, 0, 1, hr).toLocaleTimeString([], { hour: 'numeric' });
  const mmss = (secs) => `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
  const mss = (secs) => `${Math.floor(secs / 60)}:${pad(secs % 60)}`;

  const toInputValue = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const parseLocal = (str) => {
    if (!str) return NaN;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) str += 'T00:00'; // date-only would otherwise parse as UTC
    return new Date(str).getTime();
  };

  /* For screen recordings: ?days=14.3 or ?since=2026-09-28T21:40 shows that streak without saving it. */
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

  /* Everything the screens need to know about "now". */
  function moment() {
    const now = Date.now();
    const elapsed = Math.max(0, now - startMs());
    const exact = elapsed / DAY;
    const done = Math.floor(exact);       // whole days held
    const dayNo = done + 1;               // the day you are living
    const hour = new Date(now).getHours();
    const part = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'day' : hour >= 18 && hour < 22 ? 'evening' : 'night';
    return { now, elapsed, exact, done, dayNo, hour, part, key: dayKey(now) };
  }

  function nextTarget(exact) {
    for (const m of MILESTONES) if (exact < m) return m;
    return (Math.floor(exact / 365) + 1) * 365;
  }
  const targetLabel = (d) => (d >= 365 && d % 365 === 0 ? `${d / 365}Y target` : `${d}D target`);

  /* Index of the phase a day falls in; PHASES.length once the arc is complete. */
  function phaseIndex(dayNo) {
    const i = PHASES.findIndex((p) => dayNo <= p.to);
    return i < 0 ? PHASES.length : i;
  }
  const phaseProgress = (p, exact) => clamp((exact - (p.from - 1)) / (p.to - p.from + 1), 0, 1);

  function dayRecord(key, dayNo) {
    if (!data.days[key]) data.days[key] = { n: dayNo };
    return data.days[key];
  }
  const waves = () => data.events.filter((e) => e.kind === 'wave');
  const sealedCount = () => Object.values(data.days).filter((d) => d && d.seal).length;
  const hoursSaved = (exact) => (exact * (Number(data.minutesPerDay) || 0)) / 60;
  const fmtHours = (x) => (x < 100 ? x.toFixed(1) : Math.round(x).toLocaleString());

  /* ─────────────── Present ─────────────── */
  const HALO_C = 552.92;

  function renderPresent(m) {
    $('todayDate').textContent = longDate(m.now);
    const hello = m.part === 'morning' ? 'Good morning' : m.part === 'day' ? 'Good afternoon' : 'Good evening';
    $('greeting').textContent = data.name ? `${hello}, ${data.name}.` : `${hello}.`;

    const pi = phaseIndex(m.dayNo);
    $('phaseChip').textContent = `Phase ${pi + 1}`;

    const target = nextTarget(m.exact);
    const p = clamp(m.exact / target, 0, 1);
    $('haloArc').style.strokeDashoffset = String(HALO_C * (1 - p));
    $('halo').setAttribute('aria-valuenow', String(Math.floor(p * 100)));
    $('halo').setAttribute('aria-label', `${plural(m.done, 'day')} held, ${Math.floor(p * 100)} percent of the way to ${plural(target, 'day')}`);
    $('targetLabel').textContent = targetLabel(target);
    $('targetPct').textContent = `${Math.floor(p * 100)}%`;

    // Vow
    const rec = data.days[m.key];
    const kept = !!(rec && rec.vow);
    const vow = $('vow');
    vow.classList.toggle('is-kept', kept);
    vow.disabled = kept;
    $('vowLabel').textContent = kept ? 'Today’s vow' : m.part === 'morning' ? 'Morning vow' : 'Today’s vow';
    $('vowTitle').textContent = kept ? 'Sovereignty Upheld' : 'Take today’s vow';
    $('vowTime').textContent = kept ? clockTime(rec.vow) : 'Tap to vow';

    // Daily note
    const qi = m.dayNo % NOTES.length;
    $('quoteText').textContent = `“${NOTES[qi]}”`;
    $('quoteMeta').textContent = `Day ${m.dayNo} • Daily note`;
    const saved = data.saved.includes(qi);
    $('quoteSave').setAttribute('aria-pressed', String(saved));
    $('quoteSave').dataset.i = String(qi);
    $('quoteSaveLabel').textContent = saved ? 'Saved' : 'Save';

    // Ledger
    $('weekLabel').textContent = `Week ${Math.ceil(m.dayNo / 7)}`;
    const w = waves();
    $('mWaves').textContent = String(w.length);
    const perDay = [];
    for (let i = 6; i >= 0; i--) {
      const k = dayKey(shiftDays(m.now, -i));
      perDay.push(w.filter((e) => dayKey(e.t) === k).length);
    }
    const top = Math.max(1, ...perDay);
    $('mSpark').setAttribute('points', perDay.map((c, i) => `${i * 10},${(12 - (c / top) * 10).toFixed(1)}`).join(' '));

    const hrs = hoursSaved(m.exact);
    $('mHours').textContent = fmtHours(hrs);
    let goal = 10;
    for (const g of [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) { goal = g; if (hrs < g) break; }
    $('mHoursBar').style.width = `${clamp((hrs / goal) * 100, 0, 100).toFixed(1)}%`;

    $('mSealed').textContent = String(sealedCount());
    [...$('mPips').children].forEach((pip, i) => {
      const rec2 = data.days[dayKey(shiftDays(m.now, i - 3))];
      pip.classList.toggle('on', !!(rec2 && rec2.seal));
    });

    // Time-of-day card
    const sanct = {
      morning: ['Morning ground', 'Begin slowly. The day is unclaimed.', 'wb_sunny'],
      day: ['Day watch', 'Keep your hands busy and your gaze wide.', 'wb_sunny'],
      evening: ['Evening descent', 'Dim the lights. Let the pace fall.', 'wb_twilight'],
      night: ['Night sanctuary', 'Screens down. Let the day close.', 'bedtime'],
    }[m.part];
    $('sanctLabel').textContent = sanct[0];
    $('sanctLine').textContent = sanct[1];
    $('sanctIcon').textContent = sanct[2];

    // Evening closeout
    const sealed = !!(rec && rec.seal);
    const deferred = !sealed && m.now < data.deferUntil;
    const canDefer = !sealed && !deferred && m.hour < 22;
    $('closeActions').hidden = sealed;
    $('closeActions').classList.toggle('solo', !canDefer);
    $('closeDefer').hidden = !canDefer;
    $('closeMeta').textContent = sealed ? 'Sealed' : '3 min';
    const note = $('closeNote');
    note.hidden = !(sealed || deferred);
    note.textContent = sealed ? `Day ${m.dayNo} is sealed. Rest.` : deferred ? 'Deferred until 10 PM.' : '';
  }

  function renderClock(m) {
    const rest = m.elapsed - m.done * DAY;
    $('daysText').textContent = `${m.done} ${m.done === 1 ? 'DAY' : 'DAYS'}`;
    $('clock').textContent = `${pad(Math.floor(rest / HOUR))}h ${pad(Math.floor((rest % HOUR) / MIN))}m ${pad(Math.floor((rest % MIN) / SEC))}s`;
    $('dayChip').textContent = `Day ${m.dayNo}`;
  }

  $('sos').addEventListener('click', () => {
    if (wave.state === 'idle' || wave.state === 'done') { waveReset(); waveBegin(); }
    go('anchor');
  });

  $('vow').addEventListener('click', () => {
    const m = moment();
    dayRecord(m.key, m.dayNo).vow = m.now;
    save();
    renderAll();
  });

  $('quoteSave').addEventListener('click', () => {
    const i = Number($('quoteSave').dataset.i);
    const at = data.saved.indexOf(i);
    if (at >= 0) data.saved.splice(at, 1); else data.saved.push(i);
    save();
    renderAll();
  });

  $('closeDefer').addEventListener('click', () => {
    const d = new Date();
    d.setHours(22, 0, 0, 0);
    data.deferUntil = d.getTime();
    save();
    renderAll();
  });
  $('closeBegin').addEventListener('click', () => go('reflect'));

  /* ─────────────── Anchor: breathing pacer ─────────────── */
  const pacer = { mode: '478', i: 0, left: 0, cycle: 1, timer: 0 };

  function pacerShow() {
    const step = MODES[pacer.mode].steps[pacer.i];
    $('pacerPhase').textContent = step.name;
    $('pacerCount').textContent = `${pacer.left}s`;
    $('pacerGuide').textContent = step.guide;
    $('cycleCount').textContent = `Cycle ${pacer.cycle} of 4`;
    const orb = $('orb');
    orb.style.setProperty('--t', `${step.secs}s`);
    orb.style.setProperty('--s', String(step.scale));
  }
  function pacerTick() {
    pacer.left--;
    if (pacer.left <= 0) {
      const steps = MODES[pacer.mode].steps;
      pacer.i = (pacer.i + 1) % steps.length;
      if (pacer.i === 0) pacer.cycle = (pacer.cycle % 4) + 1;
      pacer.left = steps[pacer.i].secs;
    }
    pacerShow();
  }
  function pacerStart() {
    clearInterval(pacer.timer);
    pacer.i = 0;
    pacer.cycle = 1;
    pacer.left = MODES[pacer.mode].steps[0].secs;
    pacerShow();
    pacer.timer = setInterval(pacerTick, SEC);
  }
  function pacerStop() {
    clearInterval(pacer.timer);
    pacer.timer = 0;
    $('orb').style.setProperty('--t', '1s');
    $('orb').style.setProperty('--s', '.9');
  }
  for (const btn of [$('mode478'), $('modeSigh')]) {
    btn.addEventListener('click', () => {
      pacer.mode = btn.dataset.mode;
      for (const b of [$('mode478'), $('modeSigh')]) {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      }
      pacerStart();
    });
  }

  /* ─────────────── Anchor: the ninety-second wave ─────────────── */
  const wave = { state: 'idle', total: WAVE_MS, left: WAVE_MS, endAt: 0, tech: null, tags: new Set(), logged: null };

  function waveBegin() {
    wave.state = 'running';
    wave.total = WAVE_MS;
    wave.endAt = Date.now() + WAVE_MS;
    renderWave();
  }
  function waveReset() {
    wave.state = 'idle';
    wave.total = wave.left = WAVE_MS;
    wave.tech = null;
    wave.logged = null;
    wave.tags.clear();
    document.querySelectorAll('#tags .tag').forEach((t) => t.setAttribute('aria-pressed', 'false'));
    document.querySelectorAll('#interventions .tact').forEach((t) => {
      t.classList.remove('is-done');
      t.querySelector('.tact-body').hidden = true;
      t.querySelector('.tact-head').setAttribute('aria-expanded', 'false');
    });
    renderWave();
  }
  function waveFinish() {
    wave.state = 'done';
    wave.left = 0;
    wave.logged = { t: Date.now(), kind: 'wave', tech: wave.tech || MODES[pacer.mode].label, tags: [...wave.tags] };
    data.events.push(wave.logged);
    save();
    renderAll();
  }
  function renderWave() {
    const now = Date.now();
    if (wave.state === 'running') {
      wave.left = Math.max(0, wave.endAt - now);
      if (wave.left <= 0) { waveFinish(); return; }
    }
    const secs = Math.ceil(wave.left / SEC);
    $('waveTime').textContent = mmss(secs);
    $('waveFill').style.width = `${clamp((wave.left / wave.total) * 100, 0, 100).toFixed(2)}%`;
    const gone = 1 - wave.left / wave.total;
    $('wavePhase').textContent =
      wave.state === 'idle' ? 'Ready'
      : wave.state === 'paused' ? 'Paused'
      : wave.state === 'done' ? 'Dissolved'
      : gone < 0.35 ? 'Rising' : gone < 0.7 ? 'Crest phase' : 'Dissolving';
    $('waveIdle').hidden = wave.state !== 'idle';
    $('waveRun').hidden = !(wave.state === 'running' || wave.state === 'paused');
    $('waveDone').hidden = wave.state !== 'done';
    const pauseBtn = $('wavePause');
    pauseBtn.firstElementChild.textContent = wave.state === 'paused' ? 'play_arrow' : 'pause';
    pauseBtn.setAttribute('aria-label', wave.state === 'paused' ? 'Resume' : 'Pause');
  }

  $('waveBegin').addEventListener('click', waveBegin);
  $('waveExtend').addEventListener('click', () => {
    wave.total += MIN;
    if (wave.state === 'running') wave.endAt += MIN; else wave.left += MIN;
    renderWave();
  });
  $('wavePause').addEventListener('click', () => {
    if (wave.state === 'running') { wave.left = Math.max(0, wave.endAt - Date.now()); wave.state = 'paused'; }
    else if (wave.state === 'paused') { wave.endAt = Date.now() + wave.left; wave.state = 'running'; }
    renderWave();
  });
  $('waveAgain').addEventListener('click', () => { waveReset(); waveBegin(); });
  $('waveBack').addEventListener('click', () => go('present'));

  // Tactile interventions: one open at a time; "Done" notes which one carried you
  document.querySelectorAll('#interventions .tact').forEach((card) => {
    const head = card.querySelector('.tact-head');
    const body = card.querySelector('.tact-body');
    head.addEventListener('click', () => {
      const open = body.hidden;
      document.querySelectorAll('#interventions .tact').forEach((other) => {
        other.querySelector('.tact-body').hidden = true;
        other.querySelector('.tact-head').setAttribute('aria-expanded', 'false');
      });
      body.hidden = !open;
      head.setAttribute('aria-expanded', String(open));
    });
    body.querySelector('button').addEventListener('click', () => {
      card.classList.add('is-done');
      body.hidden = true;
      head.setAttribute('aria-expanded', 'false');
      wave.tech = card.dataset.tech;
      if (wave.logged) { wave.logged.tech = wave.tech; save(); }
    });
  });

  // Trigger tags travel with the wave they were chosen during
  document.querySelectorAll('#tags .tag').forEach((tag) => {
    tag.addEventListener('click', () => {
      const name = tag.dataset.tag;
      const on = !wave.tags.has(name);
      if (on) wave.tags.add(name); else wave.tags.delete(name);
      tag.setAttribute('aria-pressed', String(on));
      if (wave.logged) { wave.logged.tags = [...wave.tags]; save(); }
    });
  });

  function renderAnchor() {
    const why = (new URLSearchParams(location.search).get('why') ?? data.why).trim().slice(0, 140);
    $('whyLine').hidden = !why;
    $('whyLine').textContent = why ? `You wrote: “${why}”` : '';

    const { name, phone } = data.contact;
    const has = !!phone.trim();
    $('contactName').textContent = has ? (name.trim() || 'Trusted contact') : 'Add a trusted contact';
    $('contactRole').textContent = has ? (name.trim() ? 'Trusted contact' : phone.trim()) : 'Someone you can call';
    $('contactCall').hidden = !has;
    $('contactAdd').hidden = has;
    if (has) $('contactCall').href = `tel:${phone.replace(/[^\d+]/g, '')}`;
    renderWave();
  }
  $('contactAdd').addEventListener('click', () => openSettings($('contactNameInput')));

  function enterAnchor() { pacerStart(); }
  function leaveAnchor() {
    pacerStop();
    // Tags chosen without surfing a wave are still worth keeping
    if (wave.state === 'idle' && wave.tags.size) {
      data.events.push({ t: Date.now(), kind: 'note', note: 'Trigger noted', tags: [...wave.tags] });
      save();
    }
    if (wave.state === 'idle' || wave.state === 'done') waveReset();
  }

  /* ─────────────── Sound: generated in the browser, nothing is downloaded ─────────────── */
  function binaural(base, beat, vol, hush) {
    return (ctx, out) => {
      const merger = ctx.createChannelMerger(2);
      const nodes = [merger];
      [base, base + beat].forEach((freq, ch) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = vol;
        osc.connect(gain);
        gain.connect(merger, 0, ch);
        osc.start();
        nodes.push(osc, gain);
      });
      merger.connect(out);
      if (hush) nodes.push(...noise(ctx, out, 320, hush, 0));
      return nodes;
    };
  }
  /* Brown noise through a low-pass; `swell` adds a slow tide to the level. */
  function noise(ctx, out, cutoff, level, swell) {
    const len = ctx.sampleRate * 8;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const edge = Math.floor(ctx.sampleRate * 0.25); // soften the loop seam
    for (let i = 0; i < edge; i++) { const k = i / edge; d[i] *= k; d[len - 1 - i] *= k; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = level;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start();
    const nodes = [src, filter, gain];
    if (swell) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 0.09;
      depth.gain.value = swell;
      lfo.connect(depth);
      depth.connect(gain.gain);
      lfo.start();
      nodes.push(lfo, depth);
    }
    return nodes;
  }
  const TRACKS = {
    reset: { secs: 120, build: binaural(174, 6, 0.1, 0) },
    tide: { secs: 240, build: (ctx, out) => noise(ctx, out, 620, 0.5, 0.3) },
    night: { secs: 480, build: binaural(110, 4, 0.09, 0.12) },
  };
  const BARS = {
    gold: [8, 20, 12, 28, 16, 24, 8, 20, 12, 24, 16, 8, 20, 12, 16, 8],
    tan: [8, 16, 24, 12, 28, 16, 20, 12, 8, 20, 24, 12, 16, 8, 12, 8],
  };
  document.querySelectorAll('[data-track-bars]').forEach((holder) => {
    for (const px of BARS[holder.dataset.color]) {
      const bar = document.createElement('i');
      bar.style.height = `${px}px`;
      holder.append(bar);
    }
  });

  const audio = { ctx: null, id: null, paused: false, master: null, nodes: [], t0: 0, timer: 0 };

  function audioStop() {
    clearInterval(audio.timer);
    for (const n of audio.nodes) {
      try { if (n.stop) n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    }
    if (audio.master) { try { audio.master.disconnect(); } catch {} }
    audio.nodes = [];
    audio.master = null;
    audio.id = null;
    audio.paused = false;
    renderAudio();
  }
  function audioToggle(id) {
    if (audio.id === id) {
      audio.paused = !audio.paused;
      if (audio.paused) audio.ctx.suspend(); else audio.ctx.resume();
      renderAudio();
      return;
    }
    audioStop();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audio.ctx) audio.ctx = new Ctx();
    const ctx = audio.ctx;
    ctx.resume();
    const track = TRACKS[id];
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(1, t0 + 3);
    master.gain.setValueAtTime(1, t0 + track.secs - 4);
    master.gain.linearRampToValueAtTime(0, t0 + track.secs);
    master.connect(ctx.destination);
    audio.master = master;
    audio.nodes = track.build(ctx, master);
    audio.id = id;
    audio.t0 = t0;
    audio.timer = setInterval(() => {
      if (audio.ctx.currentTime - audio.t0 >= TRACKS[audio.id].secs) audioStop(); else renderAudio();
    }, 250);
    renderAudio();
  }
  function renderAudio() {
    const gone = audio.id ? Math.max(0, audio.ctx.currentTime - audio.t0) : 0;
    document.querySelectorAll('[data-track]').forEach((btn) => {
      const mine = audio.id === btn.dataset.track;
      const playing = mine && !audio.paused;
      const glyph = btn.querySelector('.ms');
      if (btn.dataset.style === 'pill') {
        btn.classList.toggle('is-playing', playing);
        glyph.textContent = playing ? 'graphic_eq' : 'play_arrow';
        btn.querySelector('[data-track-label]').textContent = playing ? 'Playing' : mine ? 'Resume' : 'Play';
        $('toneMeta').textContent = mine ? `${mss(Math.floor(gone))} / 2:00` : '2 min · Headphones';
      } else {
        glyph.textContent = playing ? 'pause' : 'play_arrow';
        const name = btn.getAttribute('aria-label').replace(/^(Play|Pause) /, '');
        btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${name}`);
      }
    });
    document.querySelectorAll('[data-track-card]').forEach((card) => {
      const id = card.dataset.trackCard;
      const mine = audio.id === id;
      const frac = mine ? clamp(gone / TRACKS[id].secs, 0, 1) : 0;
      card.querySelector('[data-track-time]').textContent = mss(Math.floor(mine ? gone : 0));
      const bars = card.querySelector('[data-track-bars]').children;
      const lit = mine ? Math.max(1, Math.ceil(frac * bars.length)) : 0;
      [...bars].forEach((bar, i) => bar.classList.toggle('on', i < lit));
    });
  }
  document.querySelectorAll('[data-track]').forEach((btn) => btn.addEventListener('click', () => audioToggle(btn.dataset.track)));

  /* ─────────────── Clarity ─────────────── */
  const arcX = (t) => 8 + 304 * (t / ARC_DAYS);
  const arcY = (t) => 98 - (78 * (1 - Math.exp(-t / 32))) / (1 - Math.exp(-ARC_DAYS / 32));
  function arcPath(from, to) {
    const pts = [];
    for (let t = from; t < to; t += 1.5) pts.push(t);
    pts.push(to);
    return pts.map((t, i) => `${i ? 'L' : 'M'}${arcX(t).toFixed(2)} ${arcY(t).toFixed(2)}`).join('');
  }

  function renderClarity(m) {
    const pi = phaseIndex(m.dayNo);
    const complete = pi >= PHASES.length;

    // The arc
    const t = clamp(m.exact, 0, ARC_DAYS);
    const x = arcX(t), y = arcY(t);
    $('arcLabel').textContent = `Recovery arc • Day ${m.dayNo}`;
    $('arcPct').textContent = `${Math.floor((t / ARC_DAYS) * 100)}%`;
    $('arcLine').setAttribute('d', arcPath(0, t));
    $('arcArea').setAttribute('d', `${arcPath(0, t)}L${x.toFixed(2)} 100L8 100Z`);
    $('arcAhead').setAttribute('d', t < ARC_DAYS ? arcPath(t, ARC_DAYS) : '');
    for (const id of ['arcHalo', 'arcDot']) { $(id).setAttribute('cx', x.toFixed(2)); $(id).setAttribute('cy', y.toFixed(2)); }
    const drop = $('arcDrop');
    drop.setAttribute('x1', x.toFixed(2)); drop.setAttribute('x2', x.toFixed(2));
    drop.setAttribute('y1', y.toFixed(2)); drop.setAttribute('y2', '100');
    const nowLabel = $('arcNow');
    nowLabel.textContent = m.dayNo > 1 ? `DAY ${m.dayNo}` : '';
    if (complete) {
      nowLabel.setAttribute('text-anchor', 'end');
      nowLabel.setAttribute('x', '312');
    } else {
      nowLabel.setAttribute('text-anchor', 'middle');
      nowLabel.setAttribute('x', clamp(x, 66, 244).toFixed(1));
    }
    $('arcEnd').style.display = complete ? 'none' : '';
    $('arcPhase').textContent = complete ? 'Arc complete' : `Phase ${NUMERALS[pi]} • Active`;
    $('tlActive').textContent = complete ? 'Baseline held' : `Phase ${NUMERALS[pi]} active`;

    // Timeline
    const rows = PHASES.map((p, i) => {
      const state = i < pi ? 'done' : i === pi ? 'now' : i === pi + 1 ? 'next' : 'far';
      const row = h('div', `tl ${state}`);
      const head = h('div', 'row between');
      const left = h('div');
      const when = h('div', 'row gap-2');
      when.append(h('span', 'label-sm when wider', `Days ${p.from} – ${p.to}`));
      if (state === 'now') when.append(h('span', 'label-sm soft plain', `• Day ${m.dayNo}`));
      left.append(when, h('p', 'title-md', p.name));
      head.append(left);
      const pct = Math.floor(phaseProgress(p, m.exact) * 100);
      if (state === 'done' || state === 'now') head.append(h('span', 'pct', `${state === 'done' ? 100 : pct}%`));
      else head.append(h('span', 'label-sm state wider', i === PHASES.length - 1 ? 'Target' : 'Upcoming'));
      const track = h('span', 'bar-track');
      const fill = h('span', 'bar-fill');
      fill.style.width = `${state === 'done' ? 100 : state === 'now' ? pct : 0}%`;
      track.append(fill);
      row.append(head, track);
      return row;
    });
    $('timeline').replaceChildren(...rows);

    // Reclaimed capacity
    const hrs = hoursSaved(m.exact);
    $('cHours').textContent = `${fmtHours(hrs)} ${hrs === 1 ? 'Hour' : 'Hours'}`;
    $('cHoursNote').textContent = `${Number(data.minutesPerDay) || 0} min / day`;
    const w = waves();
    $('cWaves').textContent = w.length.toLocaleString();
    const weekAgo = m.now - 7 * DAY;
    const recent = w.filter((e) => e.t >= weekAgo).length;
    const wn = $('cWavesNote');
    wn.replaceChildren();
    if (recent) wn.append(icon('trending_up'), h('span', '', `+${recent} this week`));
    $('cSealed').textContent = sealedCount().toLocaleString();
    let run = 0;
    for (let i = data.days[m.key] && data.days[m.key].seal ? 0 : 1; ; i++) {
      const rec = data.days[dayKey(shiftDays(m.now, -i))];
      if (rec && rec.seal) run++; else break;
    }
    $('cSealedNote').textContent = run >= 2 ? `${run} in a row` : '';

    // Resilience matrix: four weeks of streak days, lined up with the real calendar
    const first = Math.floor((m.dayNo - 1) / 28) * 28 + 1;
    $('matrixSub').textContent = `Days ${first} – ${first + 27}`;
    const dateOf = (n) => shiftDays(m.now, n - m.dayNo);
    const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const startDow = new Date(dateOf(first)).getDay();
    $('matrixHead').replaceChildren(...Array.from({ length: 7 }, (_, i) => h('span', '', letters[(startDow + i) % 7])));
    const cells = [];
    for (let n = first; n < first + 28; n++) {
      const state = n < m.dayNo ? 'held' : n === m.dayNo ? 'today' : n <= m.dayNo + 7 ? 'soon' : 'later';
      const rec = data.days[dayKey(dateOf(n))];
      cells.push(h('div', `cell ${state}${rec && rec.seal ? ' sealed' : ''}`, String(n)));
    }
    $('matrix').replaceChildren(...cells);

    // Vulnerability profile, drawn only from what has been logged
    const vuln = $('vuln');
    if (!data.events.length) {
      vuln.replaceChildren(h('p', 'body-sm soft', 'Surf a wave or log a close call, and your pattern will surface here.'));
    } else {
      const byHour = new Array(24).fill(0);
      for (const e of data.events) byHour[new Date(e.t).getHours()]++;
      const peak = byHour.indexOf(Math.max(...byHour));
      const rowsV = [vulnRow('bedtime', 'gold', 'Peak risk', hourLabel(peak), Math.round((byHour[peak] / data.events.length) * 100))];
      const tagged = data.events.filter((e) => Array.isArray(e.tags) && e.tags.length);
      if (tagged.length) {
        const count = {};
        for (const e of tagged) for (const tg of e.tags) count[tg] = (count[tg] || 0) + 1;
        const [name, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
        const share = Math.round((n / tagged.length) * 100);
        rowsV.push(vulnRow('psychology_alt', 'sage', String(name), `${share}%`, share));
      }
      vuln.replaceChildren(...rowsV);
    }
  }
  function vulnRow(glyph, tone, label, value, pct) {
    const row = h('div', 'vrow');
    const head = h('div', 'row between');
    const left = h('span', 'row gap-2');
    left.append(icon(glyph, `${tone} sm2`), h('span', 'label-sm soft', label));
    head.append(left, h('span', `headline-sm ${tone}`, value));
    const track = h('span', 'bar-track thick');
    const fill = h('span', `bar-fill ${tone}-bg`);
    fill.style.width = `${clamp(pct, 0, 100)}%`;
    track.append(fill);
    row.append(head, track);
    return row;
  }

  $('reanchor').addEventListener('click', () => {
    const btn = $('reanchor');
    if (btn.classList.contains('is-settled')) return;
    const label = btn.textContent;
    btn.textContent = 'Anchored in Stillness';
    btn.classList.add('is-settled');
    setTimeout(() => { btn.textContent = label; btn.classList.remove('is-settled'); }, 2500);
  });

  /* ─────────────── Reflect ─────────────── */
  const drafting = new Set();
  const draftTimers = {};
  const JOURNAL = { deficit: $('jDeficit'), joy: $('jJoy') };

  function renderReflect(m) {
    const words = {
      morning: ['Morning horizon', 'Daily Protocol & Reflection', 'Dawn anchoring', 'Sovereignty intact since sunrise', 'wb_sunny', 'Morning entry'],
      day: ['Midday horizon', 'Daily Protocol & Reflection', 'Day anchoring', 'Sovereignty intact through midday', 'wb_sunny', 'Midday entry'],
      evening: ['Evening horizon', 'Evening Protocol & Reflection', 'Dusk anchoring', 'Sovereignty intact through sunset', 'wb_twilight', 'Evening entry'],
      night: ['Night horizon', 'Evening Protocol & Reflection', 'Night anchoring', 'Sovereignty intact into the night', 'bedtime', 'Night entry'],
    }[m.part];
    $('refDay').textContent = `Day ${m.dayNo}`;
    $('refHorizon').textContent = words[0];
    $('refTitle').textContent = words[1];
    $('refDate').textContent = `${longDate(m.now)} • ${words[2]}`;
    $('refState').textContent = words[3];
    $('refIcon').textContent = words[4];
    $('entryLabel').textContent = words[5];

    // Today's log
    const today = data.events.filter((e) => dayKey(e.t) === m.key);
    const n = today.length;
    $('logCount').textContent = n ? `${n} dissolved` : 'Still water';
    $('logRing').style.strokeDashoffset = n ? '0' : '125.6';
    $('logPct').textContent = n ? '100%' : '—';
    $('logTitle').textContent = n ? `${n} / ${n} Anchored` : 'Nothing logged today';
    $('logSub').textContent = n ? 'Zero concessions' : 'Quiet waters';
    $('logChips').replaceChildren(...today.map((e) => {
      const chip = h('div', 'log-chip');
      const isWave = e.kind === 'wave';
      chip.append(
        icon(isWave ? (TECH_ICON[e.tech] || 'air') : 'edit_note', `${isWave ? 'gold' : 'sage'} sm`),
        h('span', 'label-sm', clockTime(e.t)),
        h('span', 'sep'),
        h('span', 'body-sm', String(isWave ? (e.tech || 'Wave surfed') : (e.note || 'Close call'))),
      );
      return chip;
    }));

    // Journal
    const rec = data.days[m.key] || {};
    for (const [field, box] of Object.entries(JOURNAL)) {
      if (document.activeElement !== box) box.value = rec[field] || '';
      journalStatus(field, rec);
    }

    // Seal
    const sealed = !!rec.seal;
    $('sealLine').textContent = sealed ? `Day ${m.dayNo} is closed.` : `Close Day ${m.dayNo} in stillness.`;
    const btn = $('sealBtn');
    btn.disabled = sealed;
    btn.firstElementChild.textContent = sealed ? 'task_alt' : 'lock';
    $('sealBtnLabel').textContent = sealed ? `Day ${m.dayNo} sealed` : 'Seal today’s sovereignty';
    $('sealIcon').textContent = sealed ? 'verified_user' : 'workspace_premium';
    $('sealIcon').classList.toggle('gold', !sealed);
    $('sealIcon').classList.toggle('sage', sealed);
    $('sealDone').hidden = !sealed;
    $('sealDoneLabel').textContent = `Day ${m.dayNo} inscribed in ledger`;

    // Archive
    const past = pastEntries(m.key).length;
    $('archiveLabel').textContent = past ? `View previous ${past} ${past === 1 ? 'entry' : 'entries'}` : 'No earlier entries yet';
    $('openArchive').disabled = !past;
    $('sinceLine').textContent = `Continuous sovereignty • Since ${shortDate(startMs())}`;
  }

  function journalStatus(field, rec) {
    const label = document.querySelector(`[data-status="${field}"]`);
    const glyph = document.querySelector(`[data-status-icon="${field}"]`);
    const text = (rec[field] || '').trim();
    const state = drafting.has(field) ? 'draft' : text ? 'logged' : 'empty';
    label.textContent = state === 'draft' ? 'Drafting' : state === 'logged' ? `Logged ${clockTime(rec[`${field}At`] || Date.now())}` : 'Unwritten';
    label.className = `label-sm ${state === 'logged' ? 'sage' : 'soft'}`;
    glyph.textContent = state === 'logged' ? 'check_circle' : 'edit_note';
    glyph.className = `ms sm ${state === 'logged' ? 'sage' : 'tan'}`;
  }
  for (const [field, box] of Object.entries(JOURNAL)) {
    box.addEventListener('input', () => {
      const m = moment();
      const rec = dayRecord(m.key, m.dayNo);
      rec[field] = box.value;
      rec[`${field}At`] = m.now;
      drafting.add(field);
      journalStatus(field, rec);
      clearTimeout(draftTimers[field]);
      draftTimers[field] = setTimeout(() => {
        drafting.delete(field);
        save();
        journalStatus(field, data.days[m.key] || {});
      }, 900);
    });
    box.addEventListener('blur', () => {
      clearTimeout(draftTimers[field]);
      drafting.delete(field);
      save();
      journalStatus(field, data.days[moment().key] || {});
    });
  }

  $('noteToggle').addEventListener('click', () => {
    const box = $('noteBox');
    box.hidden = !box.hidden;
    $('noteToggle').setAttribute('aria-expanded', String(!box.hidden));
    if (!box.hidden) $('noteInput').focus();
  });
  let noteTimer = 0;
  $('noteBox').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('noteInput');
    const text = input.value.trim();
    if (!text) return;
    data.events.push({ t: Date.now(), kind: 'note', note: text.slice(0, 120), tags: [] });
    save();
    input.value = '';
    $('noteBox').hidden = true;
    const toggle = $('noteToggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.add('is-done');
    toggle.firstElementChild.textContent = 'check';
    $('noteToggleLabel').textContent = 'Close call inscribed';
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      toggle.classList.remove('is-done');
      toggle.firstElementChild.textContent = 'add_circle';
      $('noteToggleLabel').textContent = 'Log another note';
    }, 3000);
    renderAll();
  });

  $('sealBtn').addEventListener('click', () => {
    const m = moment();
    dayRecord(m.key, m.dayNo).seal = m.now;
    save();
    renderAll();
  });

  function pastEntries(todayKey) {
    return Object.entries(data.days)
      .filter(([key, d]) => key !== todayKey && d && (d.seal || d.vow || (d.deficit || '').trim() || (d.joy || '').trim()))
      .sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }
  $('openArchive').addEventListener('click', () => {
    const entries = pastEntries(moment().key);
    $('archiveList').replaceChildren(...entries.map(([key, d]) => {
      const card = h('div', 'entry');
      const head = h('div', 'row between gap-2');
      const when = keyToDate(key).getTime();
      head.append(h('span', 'label-sm tan wider', `${d.n ? `Day ${d.n} • ` : ''}${shortDate(when)}`));
      const marks = h('span', 'row gap-2');
      if (d.vow) marks.append(h('span', 'label-sm soft', 'Vow'));
      if (d.seal) marks.append(h('span', 'label-sm sage', 'Sealed'));
      head.append(marks);
      card.append(head);
      if ((d.deficit || '').trim()) card.append(h('p', 'body-sm q', 'What I was trying to numb'), h('p', 'body-md', d.deficit.trim()));
      if ((d.joy || '').trim()) card.append(h('p', 'body-sm q', 'Where I found real joy'), h('p', 'body-md', d.joy.trim()));
      const surfed = data.events.filter((e) => e.kind === 'wave' && dayKey(e.t) === key).length;
      if (surfed) card.append(h('p', 'label-sm muted', `${plural(surfed, 'wave')} surfed`));
      return card;
    }));
    $('archive').showModal();
  });
  $('closeArchive').addEventListener('click', () => $('archive').close());
  $('archive').addEventListener('click', (e) => { if (e.target === $('archive')) $('archive').close(); });

  /* ─────────────── Screens ─────────────── */
  let current = null;
  let lastMinute = -1;
  let ticker = 0;

  function renderAll() {
    if (startMs() == null) return;
    const m = moment();
    renderClock(m);
    renderPresent(m);
    renderAnchor();
    renderClarity(m);
    renderReflect(m);
    renderAudio();
    lastMinute = Math.floor(m.now / MIN);
  }

  function tick() {
    clearTimeout(ticker);
    if (startMs() == null) return;
    const m = moment();
    if (Math.floor(m.now / MIN) !== lastMinute) renderAll(); else renderClock(m);
    if (wave.state === 'running') renderWave();
    ticker = setTimeout(tick, SEC - (Date.now() % SEC) + 4); // land just after each second turns
  }

  function show(name) {
    if (!SCREENS.includes(name)) name = 'present';
    if (name === current) return;
    if (current === 'anchor') leaveAnchor();
    current = name;
    for (const id of SCREENS) $(id).hidden = id !== name;
    document.querySelectorAll('.tab').forEach((tab) => {
      if (tab.dataset.tab === name) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
    });
    if (name === 'anchor') enterAnchor();
    scrollTo(0, 0);
    renderAll();
  }
  function go(name) {
    if (location.hash === `#${name}`) show(name); else location.hash = name;
  }
  addEventListener('hashchange', () => { if (startMs() != null) show(location.hash.slice(1)); });

  function showApp() {
    $('setup').hidden = true;
    $('app').hidden = false;
    $('tabs').hidden = false;
    $('dayChip').hidden = false;
    $('openSettings').hidden = false;
    current = null;
    // Start the ring empty so it draws itself in
    const arc = $('haloArc');
    arc.style.strokeDashoffset = String(HALO_C);
    void arc.getBoundingClientRect();
    show(location.hash.slice(1));
    tick();
  }

  function showSetup() {
    clearTimeout(ticker);
    if (current === 'anchor') pacerStop();
    current = null;
    $('app').hidden = true;
    $('tabs').hidden = true;
    $('dayChip').hidden = true;
    $('openSettings').hidden = true;
    $('setup').hidden = false;
    $('earlierForm').hidden = true;
    $('startEarlier').hidden = false;
    $('startEarlier').setAttribute('aria-expanded', 'false');
    $('setupHint').textContent = '';
    const old = v1Start();
    $('carryOver').hidden = old == null;
    if (old != null) $('carryOver').textContent = `Carry over my count • ${plural(Math.floor((Date.now() - old) / DAY), 'day')}`;
    scrollTo(0, 0);
  }

  function setStart(ms) {
    data.start = ms;
    save();
    preview = null;
    if (location.search) history.replaceState(null, '', location.pathname + location.hash); // leave preview mode
    showApp();
  }

  /* ─────────────── First visit ─────────────── */
  $('startNow').addEventListener('click', () => setStart(Date.now()));
  $('carryOver').addEventListener('click', () => {
    const old = v1Start();
    if (old == null) return;
    try { if (!data.why) data.why = localStorage.getItem(V1_WHY) || ''; } catch {}
    setStart(old);
  });
  $('startEarlier').addEventListener('click', () => {
    const now = Date.now();
    $('earlierInput').max = toInputValue(now);
    $('earlierInput').value = toInputValue(now - DAY);
    $('startEarlier').hidden = true;
    $('startEarlier').setAttribute('aria-expanded', 'true');
    $('earlierForm').hidden = false;
    $('earlierInput').focus();
  });
  $('earlierForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = parseLocal($('earlierInput').value);
    if (!Number.isFinite(t)) { $('setupHint').textContent = 'Choose a date and time.'; return; }
    if (t > Date.now()) { $('setupHint').textContent = 'That time is still ahead. Pick a moment that has passed.'; return; }
    setStart(t);
  });

  /* ─────────────── Settings ─────────────── */
  const settings = $('settings');
  const confirmables = [$('beginAgain'), $('erase')];

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

  function openSettings(focusOn) {
    $('nameInput').value = data.name;
    $('startInput').max = toInputValue(Date.now());
    $('startInput').value = toInputValue(startMs());
    $('whyInput').value = data.why;
    $('minutesInput').value = String(Number(data.minutesPerDay) || 0);
    $('contactNameInput').value = data.contact.name;
    $('contactPhoneInput').value = data.contact.phone;
    $('settingsHint').textContent = '';
    confirmables.forEach(disarm);
    settings.showModal();
    if (focusOn) focusOn.focus();
  }
  $('openSettings').addEventListener('click', () => openSettings());
  $('closeSettings').addEventListener('click', () => settings.close());
  settings.addEventListener('click', (e) => { if (e.target === settings) settings.close(); });
  settings.addEventListener('close', () => { confirmables.forEach(disarm); renderAll(); });
  $('settingsForm').addEventListener('submit', (e) => { e.preventDefault(); saveStartTime(); }); // Enter in a field

  $('nameInput').addEventListener('input', (e) => { data.name = e.target.value.trim().slice(0, 40); save(); });
  $('whyInput').addEventListener('input', (e) => { data.why = e.target.value.trim().slice(0, 140); save(); });
  $('minutesInput').addEventListener('input', (e) => {
    const n = Math.round(Number(e.target.value));
    data.minutesPerDay = Number.isFinite(n) ? clamp(n, 0, 1440) : 0;
    save();
  });
  $('contactNameInput').addEventListener('input', (e) => { data.contact.name = e.target.value.trim().slice(0, 60); save(); });
  $('contactPhoneInput').addEventListener('input', (e) => { data.contact.phone = e.target.value.trim().slice(0, 30); save(); });

  $('saveStart').addEventListener('click', saveStartTime);
  function saveStartTime() {
    const value = $('startInput').value;
    if (value === toInputValue(startMs())) { settings.close(); return; } // unchanged: keep the exact second
    const t = parseLocal(value);
    if (!Number.isFinite(t)) { $('settingsHint').textContent = 'Choose a date and time.'; return; }
    if (t > Date.now()) { $('settingsHint').textContent = 'That time is still ahead. Pick a moment that has passed.'; return; }
    settings.close();
    setStart(t);
  }

  confirmTwice($('beginAgain'), () => {
    settings.close();
    setStart(Date.now());
  });
  confirmTwice($('erase'), () => {
    settings.close();
    audioStop();
    waveReset();
    try { localStorage.removeItem(KEY); } catch {}
    data = blank();
    preview = null;
    if (location.search || location.hash) history.replaceState(null, '', location.pathname);
    showSetup();
  });

  /* ─────────────── Boot ─────────────── */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && startMs() != null) tick();
  });

  if (startMs() == null) showSetup(); else showApp();
})();
