const $ = id => document.getElementById(id);
const t = (k, v) => i18n.t(k, v);
const state = { relationship: 'love', occasion: 'love', design: 'classic', media: null, mediaUrl: null, voice: null, voiceUrl: null, error: '' };
const MAX_REC_MS = 3 * 60 * 1000;

i18n.apply();

// ---- Chips (occasion, relationship) ----
function chips(container, items, key, label) {
  const draw = () => {
    container.innerHTML = items.map(i =>
      `<button type="button" class="chip" data-id="${i.id}" aria-pressed="${i.id === state[key]}">${HF.esc(label(i.id))}</button>`
    ).join('');
  };
  container.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state[key] = btn.dataset.id;
    container.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === btn));
    if (key === 'occasion') drawSuggest();
    render();
  });
  draw();
  i18n.onChange(draw);
}
chips($('occChips'), HF.occasions, 'occasion', id => HF.occLabel(id));
chips($('relChips'), HF.relationships, 'relationship', id => HF.relLabel(id));

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
  if (!btn) return;
  state.design = btn.dataset.id;
  designTiles.querySelectorAll('.design-tile').forEach(c => c.setAttribute('aria-pressed', c === btn));
  render();
});
drawDesigns();
i18n.onChange(drawDesigns);

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
});

// ---- Live preview ----
function render() {
  HF.applyTheme(document.documentElement, HF.occasion(state.occasion));
  $('preview').innerHTML = HF.renderCard({
    lang: i18n.lang,
    to: $('to').value.trim(),
    from: $('from').value.trim(),
    message: $('message').value.trim() || (state.media || state.voice ? '' : t('create.previewMessage')),
    occasion: state.occasion,
    design: state.design,
    relationship: state.relationship,
    media: state.media ? { url: state.mediaUrl, kind: state.media.type.startsWith('video') ? 'video' : 'image' } : null,
    voice: state.voice ? { url: state.voiceUrl } : null,
  });
  $('count').textContent = $('message').value.length;
}
['to', 'from', 'message'].forEach(id => $(id).addEventListener('input', render));

// Phones: the preview opens as a full-screen sheet
function drawPreviewButtons() {
  $('openPreview').innerHTML = HF.icon('eye') + `<span>${HF.esc(t('create.showPreview'))}</span>`;
  $('closePreview').innerHTML = HF.icon('close') + `<span>${HF.esc(t('create.closePreview'))}</span>`;
}
function setSheet(open) {
  document.body.classList.toggle('sheet-open', open);
  if (open) $('closePreview').focus(); else $('openPreview').focus();
}
$('openPreview').addEventListener('click', () => setSheet(true));
$('closePreview').addEventListener('click', () => setSheet(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('sheet-open')) setSheet(false); });

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

// ---- Voice recording ----
let recorder = null, chunks = [], recTimer = null, recStart = 0;

function isRecording() { return recorder && recorder.state === 'recording'; }

function drawRecStatus() {
  const recording = isRecording();
  const btn = $('recBtn');
  btn.classList.toggle('recording', !!recording);
  btn.innerHTML = HF.icon(recording ? 'stop' : 'mic');
  btn.setAttribute('aria-label', t(recording ? 'create.recStop' : 'create.recStart'));
  btn.hidden = !!state.voice && !recording;
  $('recActions').hidden = !state.voice || recording;
  if (recording) {
    const s = Math.floor((Date.now() - recStart) / 1000);
    $('recStatus').textContent = t('create.recRunning', { time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` });
  } else {
    $('recStatus').textContent = t(state.voice ? 'create.recDone' : 'create.recIdle');
  }
}

function setVoice(blob) {
  if (state.voiceUrl) URL.revokeObjectURL(state.voiceUrl);
  state.voice = blob;
  state.voiceUrl = blob ? URL.createObjectURL(blob) : null;
  $('recPlayback').hidden = !blob;
  if (blob) $('recPlayback').src = state.voiceUrl;
  drawRecStatus();
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
      setVoice(new Blob(chunks, { type: (recorder.mimeType || 'audio/webm').split(';')[0] }));
    };
    if (state.voice) setVoice(null);
    recorder.start();
    recStart = Date.now();
    showError('');
    drawRecStatus();
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

// ---- Submit ----
// Errors are stored as keys so they re-translate when the language changes
function showError(key) {
  state.error = key;
  $('error').textContent = key ? t(key) : '';
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
  fd.append('lang', i18n.lang);
  fd.append('isPublic', $('isPublic').checked);
  if (state.media) fd.append('media', state.media);
  if (state.voice) {
    const ext = { 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }[state.voice.type] || 'webm';
    fd.append('voice', state.voice, `voice.${ext}`);
  }

  $('submit').disabled = true;
  $('submit').textContent = t('create.submitting');
  showError('');
  try {
    const res = await fetch('/api/cards', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.code ? 'err.' + data.code : 'err.generic');
    try { localStorage.setItem('hf-edit-' + data.id, data.editToken); } catch {}
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
  $('form').hidden = true;
  $('done').hidden = false;
  document.querySelector('.intro').hidden = true;
  setSheet(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('doneTitle').setAttribute('tabindex', '-1');
  $('doneTitle').focus({ preventScroll: true });
  const occ = HF.occasion(state.occasion);
  HF.confetti([occ.a, occ.b, '#ffffff']);
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
  if (doneTo) drawDone();
  showError(state.error);
  render();
});

drawMedia();
drawRecStatus();
drawSuggest();
drawPreviewButtons();
render();
