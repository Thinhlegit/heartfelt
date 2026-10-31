# Heartfelt

**English** · [Tiếng Việt](README.vi.md)

Write someone a card — for a partner, parent, friend or co-worker — and send it as a link. They open a sealed envelope and find your message, photo or video, voice note and signature inside.

English and Vietnamese.

## What you can do

- **Write** a message, or start from a suggested line for the occasion
- **Add** a photo or video, a voice note recorded in the browser, and a hand-drawn signature
- **Style** it: 8 occasions, 6 card designs, a little chibi friend (bear, cat, bunny or chick), and confetti, fireworks or a 3D card that swings open
- **Share** a private link, or also pin the card to the public **Love wall**
- **Receive**: the recipient opens the envelope and can send hearts back

Drafts save automatically on your device, and the sender can delete a card later from the same browser.

## Quick start

```bash
git clone https://github.com/Thinhlegit/heartfelt.git
cd heartfelt
./setup.sh
```

Open http://localhost:3000. That's it.

On Windows, run these in WSL (Ubuntu).

The script creates your settings file (`.env`), generates an admin token, and starts Heartfelt with Docker, or with Node.js 22+ if Docker isn't installed. It's safe to run again; your settings and cards are kept.

## Go live with HTTPS

1. Point your domain at your server (a DNS `A` record) and open ports 80 and 443.
2. Run:

```bash
./setup.sh --domain cards.example.com
```

Heartfelt is now on `https://cards.example.com`, with a free certificate that renews by itself.

## Everyday commands

| To | Run |
| --- | --- |
| Update | `git pull && ./setup.sh` |
| See logs | `docker compose logs -f` |
| Stop | `docker compose --profile https down` |
| Work on the code | `npm install && npm run dev` |

## Settings

Everything lives in `.env`. Change a value, then run `./setup.sh` again.

| Setting | Default | What it does |
| --- | --- | --- |
| `DOMAIN` | empty | Your public domain. Empty means this computer only |
| `ADMIN_TOKEN` | generated | Secret for moderating cards. Keep it private |
| `CREATE_LIMIT` | `10` | Cards one visitor can create per 15 minutes |
| `MAX_STORAGE_MB` | `2048` | Uploads pause once this much disk is used |
| `REPORT_HIDE_AT` | `3` | Reports that hide a card from the Love wall |

Running with Node behind your own proxy instead of Docker? Also add `NODE_ENV=production` and `TRUST_PROXY=1`.

## Moderation

Visitors can report cards on the Love wall; after enough reports a card is hidden from the wall (its private link still works). Review and remove cards with your admin token:

```bash
curl -H "x-admin-token: YOUR_TOKEN" https://cards.example.com/api/admin/reported
```

```bash
curl -X DELETE -H "x-admin-token: YOUR_TOKEN" https://cards.example.com/api/cards/CARD_ID
```

## Backups

Cards and uploads are stored in two Docker volumes. To save them to `backup.tgz`:

```bash
docker run --rm -v heartfelt_heartfelt-data:/d -v heartfelt_heartfelt-uploads:/u -v "$PWD":/out busybox tar czf /out/backup.tgz -C / d u
```

Without Docker, back up the `data/` and `uploads/` folders.

## Security

- Strict security headers: no inline scripts, no framing, card links never leaked to other sites
- Uploads are checked by their real file type, renamed, and served so they can never run as a page
- Rate limits, storage cap, cross-site request blocking, and input cleanup
- Hard-to-guess card links; private cards are hidden from search engines
- Docker image: distroless (no shell), non-root, read-only filesystem, no Linux capabilities, about 50 MB

Building behind a proxy that inspects HTTPS? Pass its certificate as a build secret (it isn't kept in the image): `docker build --secret id=ca,src=proxy-ca.crt -t heartfelt .`

## Project layout

```
setup.sh            One-step setup
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
