const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'cards.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- Simple JSON-file storage (swap for a real DB in production) ----
function loadCards() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}
let cards = loadCards();
function saveCards() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cards, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// ---- Allowed choices ----
const RELATIONSHIPS = ['love', 'family', 'parents', 'friend', 'coworker', 'teacher', 'other'];
const OCCASIONS = [
  'love', 'birthday', 'anniversary', 'congrats', 'thankyou',
  'celebration', 'getwell', 'justbecause',
];

const MEDIA_TYPES = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime))$/;
const VOICE_TYPES = /^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|aac)/;

const EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
  'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a', 'audio/mpeg': '.mp3',
  'audio/wav': '.wav', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const base = file.mimetype.split(';')[0];
      cb(null, crypto.randomBytes(12).toString('hex') + (EXT[base] || ''));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === 'media' ? MEDIA_TYPES.test(file.mimetype)
      : file.fieldname === 'voice' ? VOICE_TYPES.test(file.mimetype)
      : false;
    cb(ok ? null : new Error(`Unsupported file type: ${file.mimetype}`), ok);
  },
});

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const newId = () => crypto.randomBytes(6).toString('base64url');

// Public view of a card (never expose the edit token)
function publicCard(c) {
  const { editToken, ...rest } = c;
  return rest;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.post('/api/cards', upload.fields([{ name: 'media', maxCount: 1 }, { name: 'voice', maxCount: 1 }]), (req, res) => {
  const b = req.body;
  const removeUploads = () => Object.values(req.files || {}).flat().forEach(f => fs.unlink(f.path, () => {}));

  const card = {
    id: newId(),
    editToken: crypto.randomBytes(16).toString('hex'),
    to: clean(b.to, 60),
    from: clean(b.from, 60),
    relationship: RELATIONSHIPS.includes(b.relationship) ? b.relationship : 'other',
    occasion: OCCASIONS.includes(b.occasion) ? b.occasion : 'justbecause',
    message: clean(b.message, 2000),
    isPublic: b.isPublic === 'true' || b.isPublic === 'on',
    media: null,
    voice: null,
    hearts: 0,
    createdAt: new Date().toISOString(),
  };

  if (!card.to) {
    removeUploads();
    return res.status(400).json({ error: 'Please tell us who this is for.' });
  }

  const media = req.files?.media?.[0];
  const voice = req.files?.voice?.[0];
  if (media) card.media = { url: '/uploads/' + media.filename, kind: media.mimetype.startsWith('video') ? 'video' : 'image' };
  if (voice) card.voice = { url: '/uploads/' + voice.filename };

  if (!card.message && !card.media && !card.voice) {
    removeUploads();
    return res.status(400).json({ error: 'Add a message, a photo/video, or a voice note.' });
  }

  cards[card.id] = card;
  saveCards();
  res.status(201).json({ id: card.id, url: `/c/${card.id}`, editToken: card.editToken });
});

app.get('/api/cards/:id', (req, res) => {
  const c = cards[req.params.id];
  if (!c) return res.status(404).json({ error: 'Card not found' });
  res.json(publicCard(c));
});

app.post('/api/cards/:id/heart', (req, res) => {
  const c = cards[req.params.id];
  if (!c) return res.status(404).json({ error: 'Card not found' });
  c.hearts = Math.min((c.hearts || 0) + 1, 1e9);
  saveCards();
  res.json({ hearts: c.hearts });
});

app.delete('/api/cards/:id', (req, res) => {
  const c = cards[req.params.id];
  if (!c) return res.status(404).json({ error: 'Card not found' });
  if (req.get('x-edit-token') !== c.editToken) return res.status(403).json({ error: 'Not allowed' });
  [c.media, c.voice].filter(Boolean).forEach(f => fs.unlink(path.join(UPLOAD_DIR, path.basename(f.url)), () => {}));
  delete cards[c.id];
  saveCards();
  res.json({ ok: true });
});

// Public wall: only cards the sender chose to share
app.get('/api/wall', (req, res) => {
  const list = Object.values(cards)
    .filter(c => c.isPublic)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60)
    .map(publicCard);
  res.json(list);
});

app.get('/c/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'card.html')));
app.get('/wall', (req, res) => res.sendFile(path.join(__dirname, 'public', 'wall.html')));

app.use((err, req, res, next) => {
  Object.values(req.files || {}).flat().forEach(f => fs.unlink(f.path, () => {}));
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 50 MB).' : err.message;
  res.status(400).json({ error: msg });
});

app.listen(PORT, () => console.log(`Heartfelt running at http://localhost:${PORT}`));
