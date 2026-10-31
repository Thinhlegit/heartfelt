# Heartfelt

**English** · [Tiếng Việt](README.vi.md)

Write someone a card — for a partner, parent, friend or co-worker — and send it as a link. They open a sealed envelope and find your message, photo or video, voice note and signature inside.

English and Vietnamese.

## What you can do

- **Write** a message, or start from a suggested line for the occasion
- **Add** a photo or video, a voice note recorded in the browser, and a hand-drawn signature
- **Style** it: 8 occasions, 6 card designs, and confetti, fireworks or nothing when it opens
- **Share** a private link, or also pin the card to the public **Love wall**
- **Receive**: the recipient opens the envelope and can send hearts back

Drafts save automatically on your device, and the sender can delete a card later from the same browser.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000.

Or with Docker:

```bash
docker compose up -d --build
```

The microphone only works on `localhost` or over HTTPS.

## Going live

Run it behind HTTPS (Caddy, nginx, or a host like Render or Fly) and set:

```bash
NODE_ENV=production TRUST_PROXY=1 ADMIN_TOKEN="$(openssl rand -hex 24)" npm start
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | | `production` enables HSTS and HTTPS upgrades |
| `TRUST_PROXY` | off | Proxies in front of the app (usually `1`), so rate limits see real visitor IPs |
| `ADMIN_TOKEN` | off | Secret (16+ characters) for moderating cards |
| `CREATE_LIMIT` | `10` | Cards per IP per 15 minutes |
| `MAX_STORAGE_MB` | `2048` | Uploads pause once this much disk is used |
| `REPORT_HIDE_AT` | `3` | Reports needed to hide a card from the Love wall |
| `PORT` | `3000` | Port to listen on |

### Moderation

Visitors can report cards on the Love wall; after enough reports a card is hidden from the wall (its private link still works). With `ADMIN_TOKEN` set:

```bash
curl -H "x-admin-token: $ADMIN_TOKEN" https://your-site/api/admin/reported
```

```bash
curl -X DELETE -H "x-admin-token: $ADMIN_TOKEN" https://your-site/api/cards/CARD_ID
```

### Backups

Everything lives in `data/` (cards) and `uploads/` (files). With Docker, these are the `heartfelt-data` and `heartfelt-uploads` volumes:

```bash
docker run --rm -v heartfelt_heartfelt-data:/d -v heartfelt_heartfelt-uploads:/u -v "$PWD":/out busybox tar czf /out/backup.tgz -C / d u
```

## Security

- Strict security headers: no inline scripts, no framing, card links never leaked to other sites
- Uploads are checked by their real file type, renamed, and served so they can never run as a page
- Rate limits, storage cap, cross-site request blocking, and input cleanup
- Hard-to-guess card links; private cards are hidden from search engines
- Docker image: distroless (no shell), non-root, read-only filesystem, no Linux capabilities, about 50 MB

Building behind a proxy that inspects HTTPS? Pass its certificate as a build secret (it's not kept in the image):

```bash
docker build --secret id=ca,src=proxy-ca.crt -t heartfelt .
```

## Project layout

```
server.js           API, uploads, security
public/index.html   Create a card       (create.js)
public/card.html    Open a card         (card.js)
public/wall.html    Love wall           (wall.js)
public/themes.js    Card designs, effects, shared rendering
public/i18n.js      English and Vietnamese text
public/style.css    All styles
```

## Next steps for a bigger launch

- Move to a database and object storage (S3, R2) with regular backups
- Strip location data from photos on upload
- Add a CAPTCHA if spam gets past the rate limits
