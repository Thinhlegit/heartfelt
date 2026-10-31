const express = require('express');
const multer = require('multer');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---- Config (all optional, see README "Running in production") ----
const env = process.env;
const PORT = env.PORT || 3000;
const PROD = env.NODE_ENV === 'production';
const TRUST_PROXY = env.TRUST_PROXY ? (/^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY) : false;
const ADMIN_TOKEN = env.ADMIN_TOKEN || '';
const MAX_STORAGE_BYTES = Number(env.MAX_STORAGE_MB || 2048) * 1024 * 1024;
const REPORT_HIDE_AT = Number(env.REPORT_HIDE_AT || 3);
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_SIGNATURE_BYTES = 512 * 1024;

const DATA_FILE = path.join(__dirname, 'data', 'cards.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- Storage: a Map, so ids like "__proto__" can never touch Object.prototype ----
function loadCards() {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))));
  } catch {
    return new Map();
  }
}
const cards = loadCards();
function saveCards() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(cards), null, 2), { mode: 0o600 });
  fs.renameSync(tmp, DATA_FILE);
}

// Running total of upload bytes, so a flood of uploads can't fill the disk
let storageUsed = fs.readdirSync(UPLOAD_DIR).reduce((sum, f) => {
  try { return sum + fs.statSync(path.join(UPLOAD_DIR, f)).size; } catch { return sum; }
}, 0);

// ---- Allowed choices ----
const RELATIONSHIPS = ['love', 'family', 'parents', 'friend', 'coworker', 'teacher', 'other'];
const DESIGNS = ['classic', 'polaroid', 'elegant', 'confetti', 'minimal', 'postcard'];
const LANGS = ['en', 'vi'];
const EFFECTS = ['confetti', 'fireworks', 'none'];
const OCCASIONS = ['love', 'birthday', 'anniversary', 'congrats', 'thankyou', 'celebration', 'getwell', 'justbecause'];

const ID_RE = /^[A-Za-z0-9_-]{8,16}$/;
const newId = () => crypto.randomBytes(9).toString('base64url'); // 72 bits: unlisted links stay unguessable

// ---- Upload type checks ----
// The browser's claimed type is only a first filter; the real type comes from the file's own bytes.
const CLAIMED = {
  media: /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime))$/,
  voice: /^audio\/(webm|ogg|mp4|mpeg|wav|x-wav|wave|x-m4a|aac)(;|$)/,
  signature: /^image\/png$/,
};
const EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
  'audio/webm': '.weba', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/aac': '.aac',
};

function sniff(buf, field) {
  const ascii = (start, end) => buf.toString('latin1', start, end);
  const isFtyp = ascii(4, 8) === 'ftyp';
  const isEbml = buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  if (field === 'media') {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
    if (isFtyp) return ascii(8, 12) === 'qt  ' ? 'video/quicktime' : 'video/mp4';
    if (isEbml) return 'video/webm';
  } else if (field === 'signature') {
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  } else if (field === 'voice') {
    if (isEbml) return 'audio/webm';
    if (isFtyp) return 'audio/mp4';
    if (ascii(0, 4) === 'OggS') return 'audio/ogg';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'audio/wav';
    if (ascii(0, 3) === 'ID3') return 'audio/mpeg';
    if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return 'audio/aac';
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'audio/mpeg';
  }
  return null;
}

// Check an uploaded temp file's real type, then give it its final name. Returns the public URL or null.
function finalizeUpload(file) {
  const head = Buffer.alloc(16);
  const fd = fs.openSync(file.path, 'r');
  try { fs.readSync(fd, head, 0, 16, 0); } finally { fs.closeSync(fd); }
  const type = sniff(head, file.fieldname);
  if (!type) return null;
  const name = crypto.randomBytes(12).toString('hex') + EXT[type];
  fs.renameSync(file.path, path.join(UPLOAD_DIR, name));
  file.path = path.join(UPLOAD_DIR, name);
  return { url: '/uploads/' + name, type };
}

function removeFile(p) {
  fs.stat(p, (err, st) => {
    if (err) return;
    fs.unlink(p, e => { if (!e) storageUsed = Math.max(0, storageUsed - st.size); });
  });
}
const removeUploads = req => Object.values(req.files || {}).flat().forEach(f => removeFile(f.path));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, 'tmp-' + crypto.randomBytes(12).toString('hex')),
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: 3, fields: 14, fieldSize: 16 * 1024, fieldNameSize: 32, parts: 17 },
  fileFilter: (req, file, cb) => {
    if (storageUsed + MAX_FILE_BYTES > MAX_STORAGE_BYTES) return cb(Object.assign(new Error('Storage full'), { code: 'storageFull' }));
    const ok = CLAIMED[file.fieldname]?.test(file.mimetype);
    cb(ok ? null : Object.assign(new Error('Unsupported file type'), { code: 'fileType' }), !!ok);
  },
});

// ---- Text cleanup: strip control and bidi-override characters, normalise ----
const BAD_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const clean = (v, max) => String(v ?? '').normalize('NFC').replace(BAD_CHARS, '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const cleanLine = (v, max) => clean(v, max).replace(/\s+/g, ' ');
const cleanMessage = v => clean(v, 2000).replace(/\n{4,}/g, '\n\n\n');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hashIp = ip => crypto.createHash('sha256').update(String(ip)).update(DATA_FILE).digest('base64url').slice(0, 16);

// What the outside world may see of a card
function publicCard(c) {
  const { editToken, reports, reporters, ...rest } = c;
  return rest;
}
const onWall = c => c.isPublic && (c.reports || 0) < REPORT_HIDE_AT;

function getCard(req, res) {
  const id = req.params.id;
  const c = ID_RE.test(id) ? cards.get(id) : undefined;
  if (!c) res.status(404).json({ code: 'notFound', error: 'Card not found' });
  return c;
}

// ---- App ----
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'blob:', 'data:'],
      mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      ...(PROD ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'same-origin' }, // card links are secret: never leak them to other sites
  strictTransportSecurity: PROD ? { maxAge: 31536000, includeSubDomains: true } : false,
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  next();
});

// Rate limits (per IP). Behind a proxy, set TRUST_PROXY so these see the real client IP.
const limiter = (windowMin, limit, code = 'rateLimited') => rateLimit({
  windowMs: windowMin * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { code, error: 'Too many requests, please slow down.' },
});
const apiLimit = limiter(15, 300);
const createLimit = limiter(15, Number(env.CREATE_LIMIT || 10));
const heartLimit = limiter(1, 30);
const reportLimit = limiter(60, 10);

// Reject state-changing requests sent from other websites
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.get('origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch {}
    if (host !== req.get('host')) return res.status(403).json({ code: 'badOrigin', error: 'Cross-site request blocked' });
  }
  next();
});
app.use('/api', apiLimit, (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  next();
});

// Liveness check for Docker / load balancers
app.get('/healthz', (req, res) => res.set('Cache-Control', 'no-store').json({ ok: true }));

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', dotfiles: 'ignore' }));

// User uploads: never executable, never framed, only served by their generated names
app.use('/uploads', (req, res, next) => {
  if (!/^\/[a-f0-9]{24}\.(jpg|png|gif|webp|mp4|webm|mov|weba|ogg|m4a|mp3|wav|aac)$/.test(req.path)) return res.status(404).end();
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Robots-Tag', 'noindex');
  next();
}, express.static(UPLOAD_DIR, { maxAge: '7d', index: false, dotfiles: 'deny', immutable: true }));

const cardUpload = upload.fields([{ name: 'media', maxCount: 1 }, { name: 'voice', maxCount: 1 }, { name: 'signature', maxCount: 1 }]);

app.post('/api/cards', createLimit, cardUpload, (req, res) => {
  const b = req.body;
  const card = {
    id: newId(),
    editToken: crypto.randomBytes(24).toString('base64url'),
    to: cleanLine(b.to, 60),
    from: cleanLine(b.from, 60),
    relationship: RELATIONSHIPS.includes(b.relationship) ? b.relationship : 'other',
    occasion: OCCASIONS.includes(b.occasion) ? b.occasion : 'justbecause',
    design: DESIGNS.includes(b.design) ? b.design : 'classic',
    effect: EFFECTS.includes(b.effect) ? b.effect : 'confetti',
    message: cleanMessage(b.message),
    lang: LANGS.includes(b.lang) ? b.lang : 'en',
    isPublic: b.isPublic === 'true',
    media: null,
    voice: null,
    signature: null,
    hearts: 0,
    reports: 0,
    createdAt: new Date().toISOString(),
  };

  if (!card.to) {
    removeUploads(req);
    return res.status(400).json({ code: 'noRecipient', error: 'Please tell us who this is for.' });
  }

  try {
    for (const f of Object.values(req.files || {}).flat()) {
      if (f.fieldname === 'signature' && f.size > MAX_SIGNATURE_BYTES) {
        removeUploads(req);
        return res.status(413).json({ code: 'tooBig', error: 'Signature image is too large.' });
      }
      const saved = finalizeUpload(f);
      if (!saved) {
        removeUploads(req);
        return res.status(400).json({ code: 'fileType', error: 'That file is not a supported photo, video or audio file.' });
      }
      if (f.fieldname === 'media') card.media = { url: saved.url, kind: saved.type.startsWith('video') ? 'video' : 'image' };
      else if (f.fieldname === 'signature') card.signature = { url: saved.url };
      else card.voice = { url: saved.url };
    }
  } catch (err) {
    removeUploads(req);
    throw err;
  }
  storageUsed += Object.values(req.files || {}).flat().reduce((s, f) => s + f.size, 0);

  if (!card.message && !card.media && !card.voice) {
    removeUploads(req);
    return res.status(400).json({ code: 'empty', error: 'Add a message, a photo/video, or a voice note.' });
  }
  while (cards.has(card.id)) card.id = newId();

  cards.set(card.id, card);
  saveCards();
  res.status(201).json({ id: card.id, url: `/c/${card.id}`, editToken: card.editToken });
});

app.get('/api/cards/:id', (req, res) => {
  const c = getCard(req, res);
  if (c) res.json(publicCard(c));
});

app.post('/api/cards/:id/heart', heartLimit, (req, res) => {
  const c = getCard(req, res);
  if (!c) return;
  c.hearts = Math.min((c.hearts || 0) + 1, 1e9);
  saveCards();
  res.json({ hearts: c.hearts });
});

// Anyone can report a card; enough distinct reports take it off the public wall
app.post('/api/cards/:id/report', reportLimit, (req, res) => {
  const c = getCard(req, res);
  if (!c) return;
  const who = hashIp(req.ip);
  c.reporters = c.reporters || [];
  if (!c.reporters.includes(who) && c.reporters.length < 50) {
    c.reporters.push(who);
    c.reports = c.reporters.length;
    saveCards();
    console.warn(`[report] card ${c.id} now has ${c.reports} report(s)`);
  }
  res.json({ ok: true });
});

// The sender (edit token) or the site admin (ADMIN_TOKEN) can delete a card
app.delete('/api/cards/:id', (req, res) => {
  const c = getCard(req, res);
  if (!c) return;
  const isOwner = safeEqual(req.get('x-edit-token') || '', c.editToken);
  const isAdmin = ADMIN_TOKEN.length >= 16 && safeEqual(req.get('x-admin-token') || '', ADMIN_TOKEN);
  if (!isOwner && !isAdmin) return res.status(403).json({ code: 'forbidden', error: 'Not allowed' });
  [c.media, c.voice, c.signature].filter(Boolean).forEach(f => removeFile(path.join(UPLOAD_DIR, path.basename(f.url))));
  cards.delete(c.id);
  saveCards();
  if (isAdmin) console.warn(`[admin] deleted card ${c.id}`);
  res.json({ ok: true });
});

// Admin: list reported cards (needs ADMIN_TOKEN)
app.get('/api/admin/reported', (req, res) => {
  if (!(ADMIN_TOKEN.length >= 16 && safeEqual(req.get('x-admin-token') || '', ADMIN_TOKEN))) {
    return res.status(403).json({ code: 'forbidden', error: 'Not allowed' });
  }
  res.json([...cards.values()].filter(c => c.reports > 0).sort((a, b) => b.reports - a.reports)
    .map(c => ({ ...publicCard(c), reports: c.reports })));
});

// Public wall: only cards the sender chose to share and that haven't been reported away
app.get('/api/wall', (req, res) => {
  const list = [...cards.values()]
    .filter(onWall)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60)
    .map(publicCard);
  res.json(list);
});

app.get('/c/:id', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow'); // private links must not end up in search engines
  res.sendFile(path.join(__dirname, 'public', 'card.html'));
});
app.get('/wall', (req, res) => res.sendFile(path.join(__dirname, 'public', 'wall.html')));

app.use('/api', (req, res) => res.status(404).json({ code: 'notFound', error: 'Not found' }));

app.use((err, req, res, next) => {
  removeUploads(req);
  const known = {
    LIMIT_FILE_SIZE: ['tooBig', 413, 'File is too large (max 50 MB).'],
    LIMIT_FILE_COUNT: ['generic', 400, 'Too many files.'],
    LIMIT_UNEXPECTED_FILE: ['fileType', 400, 'Unexpected file.'],
    LIMIT_PART_COUNT: ['generic', 400, 'Too many fields.'],
    LIMIT_FIELD_COUNT: ['generic', 400, 'Too many fields.'],
    LIMIT_FIELD_VALUE: ['generic', 400, 'A field is too long.'],
    LIMIT_FIELD_KEY: ['generic', 400, 'A field name is too long.'],
    fileType: ['fileType', 400, 'That file type is not supported.'],
    storageFull: ['storageFull', 507, 'Uploads are paused right now. Try again later.'],
  }[err.code];
  if (known) return res.status(known[1]).json({ code: known[0], error: known[2] });
  console.error(err);
  res.status(500).json({ code: 'generic', error: 'Something went wrong.' });
});

const server = app.listen(PORT, () => {
  console.log(`Heartfelt running at http://localhost:${PORT}${PROD ? ' (production)' : ''}`);
  if (ADMIN_TOKEN && ADMIN_TOKEN.length < 16) console.warn('ADMIN_TOKEN is shorter than 16 characters, so moderation is turned off.');
  else console.log(ADMIN_TOKEN ? 'Moderation: on' : 'Moderation: off (set ADMIN_TOKEN in .env to turn it on)');
});
server.requestTimeout = 120 * 1000; // slow uploads get cut off instead of holding connections open
server.headersTimeout = 20 * 1000;

// Docker sends SIGTERM on stop: finish in-flight requests, then exit
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10 * 1000).unref();
  });
}
