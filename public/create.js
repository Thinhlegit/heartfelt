const $ = id => document.getElementById(id);
const state = { relationship: 'love', occasion: 'love', media: null, mediaUrl: null, voice: null, voiceUrl: null };
const MAX_REC_MS = 3 * 60 * 1000;

// ---- Chips ----
function chips(container, items, key) {
  container.innerHTML = items.map(i =>
    `<button type="button" class="chip" data-id="${i.id}" aria-pressed="${i.id === state[key]}">${i.emoji} ${i.label}</button>`
  ).join('');
  container.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state[key] = btn.dataset.id;
    container.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === btn));
    render();
  });
}
chips($('relChips'), HF.relationships, 'relationship');
chips($('occChips'), HF.occasions, 'occasion');

// ---- Live preview ----
function render() {
  const occ = HF.occasion(state.occasion);
  HF.applyTheme(document.documentElement, occ);
  $('preview').innerHTML = HF.renderCard({
    to: $('to').value.trim(),
    from: $('from').value.trim(),
    message: $('message').value.trim() || (state.media || state.voice ? '' : 'Your message will appear here…'),
    occasion: state.occasion,
    relationship: state.relationship,
    media: state.media ? { url: state.mediaUrl, kind: state.media.type.startsWith('video') ? 'video' : 'image' } : null,
    voice: state.voice ? { url: state.voiceUrl } : null,
  });
  $('count').textContent = $('message').value.length;
}
['to', 'from', 'message'].forEach(id => $(id).addEventListener('input', render));

// ---- Media ----
function setMedia(file) {
  if (state.mediaUrl) URL.revokeObjectURL(state.mediaUrl);
  state.media = file;
  state.mediaUrl = file ? URL.createObjectURL(file) : null;
  $('dropInner').innerHTML = !file ? '📷 Tap to choose, or drag a photo/video here'
    : file.type.startsWith('video')
      ? `<video src="${state.mediaUrl}" muted playsinline></video>${HF.esc(file.name)}`
      : `<img src="${state.mediaUrl}" alt="">${HF.esc(file.name)}`;
  $('removeMedia').hidden = !file;
  render();
}
function pickMedia(file) {
  if (!file) return;
  if (!/^(image|video)\//.test(file.type)) return showError('Please choose a photo or video.');
  if (file.size > 50 * 1024 * 1024) return showError('That file is over 50 MB.');
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

function setVoice(blob) {
  if (state.voiceUrl) URL.revokeObjectURL(state.voiceUrl);
  state.voice = blob;
  state.voiceUrl = blob ? URL.createObjectURL(blob) : null;
  $('recPlayback').hidden = !blob;
  if (blob) $('recPlayback').src = state.voiceUrl;
  $('removeVoice').hidden = !blob;
  $('recStatus').textContent = blob ? 'Recorded! Listen back below, or record again.' : 'Tap to record a voice message (up to 3 minutes)';
  render();
}

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    return showError('Recording is not supported in this browser. You can upload an audio file instead.');
  }
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
      $('recBtn').setAttribute('aria-label', 'Start recording');
      setVoice(new Blob(chunks, { type: (recorder.mimeType || 'audio/webm').split(';')[0] }));
    };
    recorder.start();
    recStart = Date.now();
    $('recBtn').classList.add('recording');
    $('recBtn').textContent = '⏹';
    $('recBtn').setAttribute('aria-label', 'Stop recording');
    showError('');
    recTimer = setInterval(() => {
      const ms = Date.now() - recStart;
      const s = Math.floor(ms / 1000);
      $('recStatus').textContent = `Recording… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}  (tap to stop)`;
      if (ms >= MAX_REC_MS) recorder.stop();
    }, 250);
  } catch {
    showError('Microphone access was blocked. Allow it in your browser settings, or upload an audio file.');
  }
}
$('recBtn').addEventListener('click', () => {
  if (recorder && recorder.state === 'recording') recorder.stop();
  else startRecording();
});
$('removeVoice').addEventListener('click', () => { $('voiceFile').value = ''; setVoice(null); });
$('voiceFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 50 * 1024 * 1024) return showError('That audio file is over 50 MB.');
  setVoice(f);
});

// ---- Submit ----
function showError(msg) { $('error').textContent = msg; }

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const to = $('to').value.trim();
  const message = $('message').value.trim();
  if (!to) { showError('Please tell us who this is for.'); $('to').focus(); return; }
  if (!message && !state.media && !state.voice) return showError('Add a message, a photo/video, or a voice note.');
  if (recorder && recorder.state === 'recording') return showError('Stop the recording first.');

  const fd = new FormData();
  fd.append('to', to);
  fd.append('from', $('from').value.trim());
  fd.append('message', message);
  fd.append('relationship', state.relationship);
  fd.append('occasion', state.occasion);
  fd.append('isPublic', $('isPublic').checked);
  if (state.media) fd.append('media', state.media);
  if (state.voice) {
    const ext = { 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }[state.voice.type] || 'webm';
    fd.append('voice', state.voice, `voice.${ext}`);
  }

  $('submit').disabled = true;
  $('submit').textContent = 'Creating…';
  showError('');
  try {
    const res = await fetch('/api/cards', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
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
    showError(err.message);
  } finally {
    $('submit').disabled = false;
    $('submit').textContent = 'Create my card 💌';
  }
});

$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('shareUrl').value); } catch { $('shareUrl').select(); document.execCommand('copy'); }
  $('copyBtn').textContent = 'Copied!';
  setTimeout(() => ($('copyBtn').textContent = 'Copy'), 1500);
});
$('nativeShare').addEventListener('click', () => {
  navigator.share({ title: 'A card for you 💌', text: `${$('from').value.trim() || 'Someone'} made you a card`, url: $('shareUrl').value }).catch(() => {});
});
$('another').addEventListener('click', () => location.reload());

render();
