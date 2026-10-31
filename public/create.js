const $ = id => document.getElementById(id);
const t = (k, v) => i18n.t(k, v);
const state = {
  relationship: 'love', occasion: 'love', design: 'classic', effect: 'confetti', character: 'none',
  media: null, mediaUrl: null, voice: null, voiceUrl: null, signature: null, signatureUrl: null, error: '',
};
const MAX_REC_MS = 3 * 60 * 1000;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// Morph the preview between states where the browser supports View Transitions
function transition(fn) {
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
  else fn();
}
function announce(key) {
  $('announce').textContent = '';
  setTimeout(() => { $('announce').textContent = t(key); }, 50);
}

// ---- Draft: restore before anything renders ----
const draft = store.get('hf-draft');
if (draft) {
  for (const k of ['relationship', 'occasion', 'design', 'effect', 'character']) if (typeof draft[k] === 'string') state[k] = draft[k];
  $('to').value = draft.to || '';
  $('message').value = draft.message || '';
  $('isPublic').checked = !!draft.isPublic;
}
$('from').value = (draft && draft.from) || store.get('hf-from') || '';

i18n.apply();

// ---- Chip groups (occasion, relationship, effect) ----
function chips(container, items, key, label, onPick) {
  const draw = () => {
    container.innerHTML = items.map(i =>
      `<button type="button" class="chip" data-id="${i.id}" aria-pressed="${i.id === state[key]}">${HF.esc(label(i.id))}</button>`
    ).join('');
  };
  container.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn || state[key] === btn.dataset.id) return;
    state[key] = btn.dataset.id;
    container.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === btn));
    onPick && onPick();
    saveDraft();
  });
  draw();
  i18n.onChange(draw);
}
chips($('occChips'), HF.occasions, 'occasion', id => HF.occLabel(id), () => { drawSuggest(); transition(render); });
chips($('relChips'), HF.relationships, 'relationship', id => HF.relLabel(id));
chips($('effectChips'), HF.effects, 'effect', id => t('effect.' + id), drawPlay);

// ---- Design tiles (CSS mini-previews, themed by --a/--b) ----
const designTiles = $('designTiles');
function drawDesigns() {
  designTiles.innerHTML = HF.designs.map(d =>
    `<button type="button" class="design-tile" data-id="${d.id}" aria-pressed="${d.id === state.design}">` +
    `<span class="swatch sw-${d.id}"><i></i><b></b></span><span class="name">${HF.esc(t('design.' + d.id))}</span></button>`
  ).join('');
}
designTiles.addEventListener('click', e => {
  const btn = e.target.closest('.design-tile');
  if (!btn || state.design === btn.dataset.id) return;
  state.design = btn.dataset.id;
  designTiles.querySelectorAll('.design-tile').forEach(c => c.setAttribute('aria-pressed', c === btn));
  transition(render);
  saveDraft();
});
drawDesigns();
i18n.onChange(drawDesigns);

// ---- Little friend (character) tiles ----
const buddyTiles = $('buddyTiles');
function drawBuddies() {
  buddyTiles.innerHTML = HF.characters.map(ch =>
    `<button type="button" class="buddy-tile" data-id="${ch.id}" aria-pressed="${ch.id === state.character}">` +
    `<span class="buddy-swatch">${HF.buddy(ch.id) || '<span class="buddy-none"></span>'}</span>` +
    `<span class="name">${HF.esc(t('character.' + ch.id))}</span></button>`
  ).join('');
}
buddyTiles.addEventListener('click', e => {
  const btn = e.target.closest('.buddy-tile');
  if (!btn || state.character === btn.dataset.id) return;
  state.character = btn.dataset.id;
  buddyTiles.querySelectorAll('.buddy-tile').forEach(c => c.setAttribute('aria-pressed', c === btn));
  transition(render);
  saveDraft();
});
drawBuddies();
i18n.onChange(drawBuddies);

// ---- Opening effect preview ----
function drawPlay() {
  const btn = $('playEffect');
  btn.innerHTML = HF.icon('play') + `<span>${HF.esc(t('effect.play'))}</span>`;
  btn.hidden = state.effect === 'none';
}
$('playEffect').addEventListener('click', () => {
  const occ = HF.occasion(state.occasion);
  if (state.effect !== 'fold3d') return HF.playEffect(state.effect, occ);
  // The 3D effect plays on the preview card itself; on phones that lives in the sheet
  if (getComputedStyle($('desk')).display === 'none') setSheet(true);
  render();
  HF.playEffect('fold3d', occ, $('preview'), previewCard());
});

// ---- Starter lines for the message ----
function drawSuggest() {
  const lines = [1, 2].map(n => t(`sug.${state.occasion}.${n}`));
  $('suggest').innerHTML = `<span>${HF.esc(t('create.suggest'))}</span>` +
    lines.map(l => `<button type="button" class="starter">${HF.esc(l)}</button>`).join('');
}
$('suggest').addEventListener('click', e => {
  const b = e.target.closest('.starter');
  if (!b) return;
  const m = $('message');
  m.value = m.value.trim() ? m.value.trimEnd() + '\n' + b.textContent : b.textContent;
  m.focus();
  m.setSelectionRange(m.value.length, m.value.length);
  render();
  saveDraft();
});

// ---- Live preview ----
function render() {
  HF.applyTheme(document.documentElement, HF.occasion(state.occasion));
  $('preview').innerHTML = HF.renderCard(previewCard());
  $('count').textContent = $('message').value.length;
}
function previewCard() {
  const hasExtras = state.media || state.voice;
  return {
    lang: i18n.lang,
    to: $('to').value.trim(),
    from: $('from').value.trim(),
    message: $('message').value.trim() || (hasExtras ? '' : t('create.previewMessage')),
    occasion: state.occasion,
    design: state.design,
    relationship: state.relationship,
    media: state.media ? { url: state.mediaUrl, kind: state.media.type.startsWith('video') ? 'video' : 'image' } : null,
    voice: state.voice ? { url: state.voiceUrl } : null,
    signature: state.signature ? { url: state.signatureUrl } : null,
    character: state.character,
  };
}
['to', 'from', 'message'].forEach(id => $(id).addEventListener('input', () => { render(); saveDraft(); }));
$('to').addEventListener('input', () => { if (state.error === 'err.noRecipient' && $('to').value.trim()) showError(''); });

// ---- Draft autosave (text and choices only; files stay in memory) ----
let draftTimer = null, noteTimer = null;
function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    store.set('hf-draft', {
      to: $('to').value, from: $('from').value, message: $('message').value, isPublic: $('isPublic').checked,
      relationship: state.relationship, occasion: state.occasion, design: state.design, effect: state.effect, character: state.character,
    });
    showNote('draft.saved');
  }, 600);
}
function showNote(key) {
  const n = $('draftNote');
  n.textContent = t(key);
  n.classList.add('show');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => n.classList.remove('show'), 2400);
}

// ---- Visibility switch ----
function drawVis() { $('visHint').textContent = t($('isPublic').checked ? 'vis.onHint' : 'vis.offHint'); }
$('isPublic').addEventListener('change', () => { drawVis(); saveDraft(); });

// ---- Phones: the preview opens as a full-screen sheet ----
function drawPreviewButtons() {
  $('openPreview').innerHTML = HF.icon('eye') + `<span>${HF.esc(t('create.showPreview'))}</span>`;
  $('closePreview').innerHTML = HF.icon('close') + `<span>${HF.esc(t('create.closePreview'))}</span>`;
}
function setSheet(open) {
  document.body.classList.toggle('sheet-open', open);
  // Everything behind the sheet is unreachable while it's open
  for (const el of [document.querySelector('.compose'), document.querySelector('.site'), $('openPreview')]) el.inert = open;
  if (open) $('closePreview').focus(); else if (getComputedStyle($('openPreview')).display !== 'none') $('openPreview').focus();
}
$('openPreview').addEventListener('click', () => setSheet(true));
$('closePreview').addEventListener('click', () => setSheet(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('sheet-open')) setSheet(false); });

// ---- Extras: photo, voice, signature fold open on request ----
const EXTRA_ICON = { media: 'image', voice: 'mic', signature: 'pen' };
function drawExtras() {
  document.querySelectorAll('.extra-toggle').forEach(btn => {
    const id = btn.dataset.panel;
    const added = id === 'media' ? !!state.media : id === 'voice' ? !!state.voice : !!state.signature;
    btn.classList.toggle('added', added);
    btn.innerHTML = HF.icon(added ? 'check' : EXTRA_ICON[id]) + `<span>${HF.esc(t('extra.' + id))}</span>`;
  });
}
$('extraToggles').addEventListener('click', e => {
  const btn = e.target.closest('.extra-toggle');
  if (!btn) return;
  const panel = $('panel-' + btn.dataset.panel);
  const open = panel.hidden;
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', open);
  if (open && btn.dataset.panel === 'signature') sizeSignature();
  if (open) panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
});

// ---- Media ----
function drawMedia() {
  const file = state.media;
  $('drop').hidden = !!file;
  $('mediaRow').hidden = !file;
  $('drop').innerHTML = HF.icon('image') +
    `<span><b>${HF.esc(t('create.dropTitle'))}</b><small>${HF.esc(t('create.dropHint'))}</small></span>`;
  if (!file) return;
  const thumb = file.type.startsWith('video')
    ? `<video src="${state.mediaUrl}" muted playsinline></video>`
    : `<img src="${state.mediaUrl}" alt="">`;
  const size = file.size < 1024 * 1024 ? Math.max(1, Math.round(file.size / 1024)) + ' KB' : (file.size / 1024 / 1024).toFixed(1) + ' MB';
  $('mediaRow').innerHTML = `${thumb}<span class="file-name">${HF.esc(file.name)}<small>${size}</small></span>` +
    `<button type="button" class="text-btn" data-act="replace">${HF.esc(t('create.replace'))}</button>` +
    `<button type="button" class="text-btn" data-act="remove">${HF.esc(t('create.remove'))}</button>`;
}
function setMedia(file) {
  if (state.mediaUrl) URL.revokeObjectURL(state.mediaUrl);
  state.media = file;
  state.mediaUrl = file ? URL.createObjectURL(file) : null;
  drawMedia();
  drawExtras();
  render();
}
function pickMedia(file) {
  if (!file) return;
  if (!/^(image|video)\//.test(file.type)) return showError('err.notMedia');
  if (file.size > 50 * 1024 * 1024) return showError('err.tooBig');
  showError('');
  setMedia(file);
}
const drop = $('drop');
drop.addEventListener('click', () => $('mediaInput').click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('mediaInput').click(); } });
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); pickMedia(e.dataTransfer.files[0]); });
$('mediaInput').addEventListener('change', e => { pickMedia(e.target.files[0]); e.target.value = ''; });
$('mediaRow').addEventListener('click', e => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'replace') $('mediaInput').click();
  if (act === 'remove') { setMedia(null); drop.focus(); }
});

// ---- Voice recording, with a live level meter ----
let recorder = null, chunks = [], recTimer = null, recStart = 0, meter = null;
const BARS = 24;
$('meter').innerHTML = '<i></i>'.repeat(BARS);

function isRecording() { return recorder && recorder.state === 'recording'; }

function drawRecStatus() {
  const recording = isRecording();
  const btn = $('recBtn');
  btn.classList.toggle('recording', !!recording);
  btn.innerHTML = HF.icon(recording ? 'stop' : 'mic');
  btn.setAttribute('aria-label', t(recording ? 'create.recStop' : 'create.recStart'));
  btn.hidden = !!state.voice && !recording;
  $('recActions').hidden = !state.voice || recording;
  $('meter').hidden = !recording;
  if (recording) {
    const s = Math.floor((Date.now() - recStart) / 1000);
    $('recStatus').textContent = t('create.recRunning', { time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` });
  } else {
    $('recStatus').textContent = t(state.voice ? 'create.recDone' : 'create.recIdle');
  }
}

function startMeter(stream) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const bars = [...$('meter').children];
  let raf = 0;
  const loop = () => {
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length * 0.7 / BARS);
    bars.forEach((bar, i) => {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += data[i * step + j];
      bar.style.transform = `scaleY(${Math.max(0.08, Math.min(1, sum / step / 170))})`;
    });
    raf = requestAnimationFrame(loop);
  };
  loop();
  meter = { stop() { cancelAnimationFrame(raf); ctx.close().catch(() => {}); } };
}

function setVoice(blob) {
  if (state.voiceUrl) URL.revokeObjectURL(state.voiceUrl);
  state.voice = blob;
  state.voiceUrl = blob ? URL.createObjectURL(blob) : null;
  $('recPlayback').hidden = !blob;
  if (blob) $('recPlayback').src = state.voiceUrl;
  drawRecStatus();
  drawExtras();
  render();
}

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return showError('err.noRecorder');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMime();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      clearInterval(recTimer);
      meter?.stop();
      setVoice(new Blob(chunks, { type: (recorder.mimeType || 'audio/webm').split(';')[0] }));
      announce('create.recSaved');
    };
    if (state.voice) setVoice(null);
    recorder.start();
    recStart = Date.now();
    showError('');
    startMeter(stream);
    drawRecStatus();
    announce('create.recStarted');
    recTimer = setInterval(() => {
      drawRecStatus();
      if (Date.now() - recStart >= MAX_REC_MS) recorder.stop();
    }, 250);
  } catch {
    showError('err.micBlocked');
  }
}
$('recBtn').addEventListener('click', () => {
  if (isRecording()) recorder.stop();
  else startRecording();
});
$('rerecord').addEventListener('click', startRecording);
$('removeVoice').addEventListener('click', () => { $('voiceFile').value = ''; setVoice(null); $('recBtn').focus(); });
$('voiceFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 50 * 1024 * 1024) return showError('err.audioTooBig');
  setVoice(f);
});

// ---- Hand-drawn signature ----
const sig = $('sigCanvas');
const sigCtx = sig.getContext('2d');
let strokes = [], current = null;
const INK = '#2a241e';

function sizeSignature() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = sig.clientWidth, h = sig.clientHeight;
  if (!w) return;
  sig.width = w * dpr; sig.height = h * dpr;
  sigCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw(sigCtx, 0, 0);
}
function drawStroke(ctx, s, dx, dy) {
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0].x - dx, s[0].y - dy, s[0].w / 2, 0, Math.PI * 2); ctx.fill(); return; }
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i], m = s[i + 1];
    ctx.lineWidth = b.w;
    ctx.beginPath();
    ctx.moveTo(a.x - dx, a.y - dy);
    // Smooth through the midpoint to the next point so lines look inked, not jagged
    if (m) ctx.quadraticCurveTo(b.x - dx, b.y - dy, (b.x + m.x) / 2 - dx, (b.y + m.y) / 2 - dy);
    else ctx.lineTo(b.x - dx, b.y - dy);
    ctx.stroke();
  }
}
function redraw(ctx, dx, dy) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  strokes.forEach(s => drawStroke(ctx, s, dx, dy));
}
function point(e, prev) {
  const r = sig.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const speed = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
  // Faster strokes come out thinner, like a real pen
  const w = prev ? prev.w * 0.6 + Math.max(1.4, Math.min(3.4, 3.6 - speed * 0.12)) * 0.4 : 2.6;
  return { x, y, w };
}
sig.addEventListener('pointerdown', e => {
  e.preventDefault();
  sig.setPointerCapture(e.pointerId);
  current = [point(e)];
  strokes.push(current);
  redraw(sigCtx, 0, 0);
});
sig.addEventListener('pointermove', e => {
  if (!current) return;
  const p = point(e, current[current.length - 1]);
  if (Math.hypot(p.x - current[current.length - 1].x, p.y - current[current.length - 1].y) < 1.5) return;
  current.push(p);
  redraw(sigCtx, 0, 0);
});
const endStroke = () => { if (current) { current = null; exportSignature(); } };
sig.addEventListener('pointerup', endStroke);
sig.addEventListener('pointercancel', endStroke);

// Crop to the ink, then turn it into a transparent PNG for the card.
// toDataURL is synchronous, so the preview updates the moment the pen lifts.
function exportSignature() {
  if (!strokes.length) { state.signature = state.signatureUrl = null; afterSignature(); return; }
  const pts = strokes.flat();
  const pad = 8;
  const minX = Math.min(...pts.map(p => p.x)) - pad, minY = Math.min(...pts.map(p => p.y)) - pad;
  const maxX = Math.max(...pts.map(p => p.x)) + pad, maxY = Math.max(...pts.map(p => p.y)) + pad;
  const scale = 2;
  const out = document.createElement('canvas');
  out.width = Math.ceil((maxX - minX) * scale); out.height = Math.ceil((maxY - minY) * scale);
  const ctx = out.getContext('2d');
  ctx.scale(scale, scale);
  redraw(ctx, minX, minY);
  state.signatureUrl = out.toDataURL('image/png');
  state.signature = true;
  afterSignature();
}
function signatureBlob() {
  const bin = atob(state.signatureUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}
function afterSignature() {
  $('sigClear').hidden = !strokes.length;
  $('sigHint').textContent = t(strokes.length ? 'sig.done' : 'sig.hint');
  drawExtras();
  render();
}
$('sigClear').addEventListener('click', () => { strokes = []; redraw(sigCtx, 0, 0); exportSignature(); });
window.addEventListener('resize', () => { if (!$('panel-signature').hidden) sizeSignature(); });

// ---- Submit ----
// Errors are stored as keys so they re-translate when the language changes
function showError(key) {
  state.error = key;
  $('error').textContent = key ? t(key) : '';
  const bad = key === 'err.noRecipient';
  $('to').toggleAttribute('aria-invalid', bad);
  if (bad) $('to').setAttribute('aria-describedby', 'error'); else $('to').removeAttribute('aria-describedby');
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const to = $('to').value.trim();
  const message = $('message').value.trim();
  if (!to) { showError('err.noRecipient'); $('to').focus(); return; }
  if (!message && !state.media && !state.voice) { showError('err.empty'); $('message').focus(); return; }
  if (isRecording()) return showError('err.stopFirst');

  const fd = new FormData();
  fd.append('to', to);
  fd.append('from', $('from').value.trim());
  fd.append('message', message);
  fd.append('relationship', state.relationship);
  fd.append('occasion', state.occasion);
  fd.append('design', state.design);
  fd.append('effect', state.effect);
  fd.append('character', state.character);
  fd.append('lang', i18n.lang);
  fd.append('isPublic', $('isPublic').checked);
  if (state.media) fd.append('media', state.media);
  if (state.voice) {
    const ext = { 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }[state.voice.type] || 'webm';
    fd.append('voice', state.voice, `voice.${ext}`);
  }
  if (state.signature) fd.append('signature', signatureBlob(), 'signature.png');

  $('submit').disabled = true;
  $('submit').textContent = t('create.submitting');
  showError('');
  try {
    const res = await fetch('/api/cards', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.code ? 'err.' + data.code : 'err.generic');
    store.set('hf-edit-' + data.id, data.editToken);
    store.set('hf-from', $('from').value.trim());
    store.del('hf-draft');
    clearTimeout(draftTimer);
    showDone(to, location.origin + data.url, data.url);
  } catch (err) {
    showError(err.message.startsWith('err.') ? err.message : 'err.generic');
  } finally {
    $('submit').disabled = false;
    $('submit').textContent = t('create.submit');
  }
});

// ---- Done screen ----
let doneTo = '';
function drawDone() {
  $('doneTitle').textContent = t('create.doneTitle', { to: doneTo });
  $('copyBtn').innerHTML = HF.icon('link') + `<span>${HF.esc(t('create.copy'))}</span>`;
  $('openCard').innerHTML = `<span>${HF.esc(t('create.openCard'))}</span>` + HF.icon('arrow');
  $('nativeShare').innerHTML = HF.icon('share') + `<span>${HF.esc(t('create.share'))}</span>`;
}
function showDone(to, url, path) {
  doneTo = to;
  $('shareUrl').value = url;
  $('openCard').href = path;
  $('nativeShare').hidden = !navigator.share;
  drawDone();
  setSheet(false);
  transition(() => {
    $('form').hidden = true;
    $('done').hidden = false;
    document.querySelector('.intro').hidden = true;
  });
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  $('doneTitle').setAttribute('tabindex', '-1');
  $('doneTitle').focus({ preventScroll: true });
  HF.playEffect(['none', 'fold3d'].includes(state.effect) ? 'confetti' : state.effect, HF.occasion(state.occasion));
}

$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('shareUrl').value); } catch { $('shareUrl').select(); document.execCommand('copy'); }
  $('copyBtn').querySelector('span').textContent = t('create.copied');
  setTimeout(drawDone, 1600);
});
$('shareUrl').addEventListener('focus', e => e.target.select());
$('nativeShare').addEventListener('click', () => {
  navigator.share({
    title: t('create.shareTitle'),
    text: t('create.shareText', { from: $('from').value.trim() || t('create.someone') }),
    url: $('shareUrl').value,
  }).catch(() => {});
});
$('another').addEventListener('click', () => location.reload());

i18n.onChange(() => {
  drawMedia();
  drawRecStatus();
  drawSuggest();
  drawPreviewButtons();
  drawExtras();
  drawPlay();
  drawVis();
  $('sigHint').textContent = t(strokes.length ? 'sig.done' : 'sig.hint');
  if (doneTo) drawDone();
  showError(state.error);
  render();
});

drawMedia();
drawRecStatus();
drawSuggest();
drawPreviewButtons();
drawExtras();
drawPlay();
drawVis();
render();
if (draft && (draft.to || draft.message)) showNote('draft.restored');
