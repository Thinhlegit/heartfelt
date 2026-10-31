const $ = id => document.getElementById(id);
const t = (k, v) => i18n.t(k, v);
const state = { relationship: 'love', occasion: 'love', design: 'classic', media: null, mediaUrl: null, voice: null, voiceUrl: null, error: '' };
const MAX_REC_MS = 3 * 60 * 1000;

i18n.apply();

// ---- Chips ----
function chips(container, items, key, label) {
  const draw = () => {
    container.innerHTML = items.map(i =>
      `<button type="button" class="chip" data-id="${i.id}" aria-pressed="${i.id === state[key]}">${i.emoji} ${HF.esc(label(i.id))}</button>`
    ).join('');
  };
  container.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state[key] = btn.dataset.id;
    container.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === btn));
    render();
  });
  draw();
  i18n.onChange(draw);
}
chips($('relChips'), HF.relationships, 'relationship', id => HF.relLabel(id));
chips($('occChips'), HF.occasions, 'occasion', id => HF.occLabel(id));

// ---- Design tiles (CSS mini-previews, themed by the page's --a/--b) ----
const designTiles = $('designTiles');
function drawDesigns() {
  designTiles.innerHTML = HF.designs.map(d =>
    `<button type="button" class="design-tile" data-id="${d.id}" aria-pressed="${d.id === state.design}">` +
    `<span class="swatch sw-${d.id}"><i></i><b></b></span>${HF.esc(t('design.' + d.id))}</button>`
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

// ---- Live preview ----
function render() {
  const occ = HF.occasion(state.occasion);
  HF.applyTheme(document.documentElement, occ);
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

// ---- Media ----
function drawDrop() {
  const file = state.media;
  $('dropInner').innerHTML = !file ? HF.esc(t('create.drop'))
    : file.type.startsWith('video')
      ? `<video src="${state.mediaUrl}" muted playsinline></video>${HF.esc(file.name)}`
      : `<img src="${state.mediaUrl}" alt="">${HF.esc(file.name)}`;
}
function setMedia(file) {
  if (state.mediaUrl) URL.revokeObjectURL(state.mediaUrl);
  state.media = file;
  state.mediaUrl = file ? URL.createObjectURL(file) : null;
  drawDrop();
  $('removeMedia').hidden = !file;
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
$('mediaInput').addEventListener('change', e => pickMedia(e.target.files[0]));
$('removeMedia').addEventListener('click', () => { $('mediaInput').value = ''; setMedia(null); });

// ---- Voice recording ----
let recorder = null, chunks = [], recTimer = null, recStart = 0;

function isRecording() { return recorder && recorder.state === 'recording'; }

function drawRecStatus() {
  const recording = isRecording();
  $('recBtn').setAttribute('aria-label', t(recording ? 'create.recStop' : 'create.recStart'));
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
  $('removeVoice').hidden = !blob;
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
      $('recBtn').classList.remove('recording');
      $('recBtn').textContent = '🎙️';
      setVoice(new Blob(chunks, { type: (recorder.mimeType || 'audio/webm').split(';')[0] }));
    };
    recorder.start();
    recStart = Date.now();
    $('recBtn').classList.add('recording');
    $('recBtn').textContent = '⏹';
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
$('removeVoice').addEventListener('click', () => { $('voiceFile').value = ''; setVoice(null); });
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
  if (!message && !state.media && !state.voice) return showError('err.empty');
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
    const url = location.origin + data.url;
    try { localStorage.setItem('hf-edit-' + data.id, data.editToken); } catch {}
    $('shareUrl').value = url;
    $('openCard').href = data.url;
    $('nativeShare').hidden = !navigator.share;
    $('share').hidden = false;
    $('submit').hidden = true;
    $('share').scrollIntoView({ behavior: 'smooth', block: 'center' });
    HF.burst(document.body, HF.occasion(state.occasion).particles);
  } catch (err) {
    showError(err.message.startsWith('err.') ? err.message : 'err.generic');
  } finally {
    $('submit').disabled = false;
    $('submit').textContent = t('create.submit');
  }
});

$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('shareUrl').value); } catch { $('shareUrl').select(); document.execCommand('copy'); }
  $('copyBtn').textContent = t('create.copied');
  setTimeout(() => ($('copyBtn').textContent = t('create.copy')), 1500);
});
$('nativeShare').addEventListener('click', () => {
  navigator.share({
    title: t('create.shareTitle'),
    text: t('create.shareText', { from: $('from').value.trim() || t('create.someone') }),
    url: $('shareUrl').value,
  }).catch(() => {});
});
$('another').addEventListener('click', () => location.reload());

i18n.onChange(() => {
  drawDrop();
  drawRecStatus();
  showError(state.error);
  render();
});

drawDrop();
drawRecStatus();
render();
