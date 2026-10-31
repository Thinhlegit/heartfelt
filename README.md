# 💌 Heartfelt

Make a card for your love, family, parents, friends or co-workers, then share it with a public link.

- **Pick who it's for**: My love, Family, Parents, Friend, Co-worker, Teacher, Someone special
- **Pick the occasion**: Love message, Birthday, Anniversary, Congratulations, Thank you, Celebration, Get well, Just because (each has its own colours and floating emoji)
- **Pick a card design**: Classic, Polaroid, Elegant, Confetti, Minimal or Postcard (a look that is separate from the occasion colours)
- **Add content**: a text message, a photo or video (up to 50 MB), and/or a **voice message recorded in the browser** (or an uploaded audio file)
- **Starter lines** for each occasion when you don't know how to begin, and a live preview (full-screen sheet on phones)
- **Share**: each card gets a link like `/c/AbC123`. The recipient sees a sealed envelope, taps to open it, and can send hearts back
- **English and Vietnamese**: switch with the button in the top bar (auto-detected from the browser, or `?lang=vi`). Each card remembers the language it was written in, so the recipient sees it the way the sender wrote it
- **Love wall** (`/wall`): cards the sender chose to make public, filterable by occasion
- The creator's browser keeps a private edit token, so they can delete their card later

## Run

```bash
npm install
npm start
```

Open http://localhost:3000. Set `PORT` to change the port.

Voice recording needs HTTPS (or localhost) because browsers only allow the microphone on secure pages.

## Structure

```
server.js          Express API + file uploads (multer)
public/index.html  Create page with live preview
public/create.js   Form, media picker, voice recorder, submit
public/card.html   Public card page (envelope → card, hearts, share)
public/wall.html   Public Love wall
public/i18n.js     English + Vietnamese text, language switcher
public/themes.js   Relationships, occasions, themes, shared card renderer
public/style.css   Styles (light + dark mode)
data/cards.json    Card storage (created automatically)
uploads/           Uploaded photos, videos and voice notes
```

## Running in production

Put it behind HTTPS (a reverse proxy such as Caddy or nginx, or a host like Render/Railway/Fly), then start it with:

```bash
NODE_ENV=production TRUST_PROXY=1 ADMIN_TOKEN="$(openssl rand -hex 24)" npm start
```

| Variable | Default | What it does |
| --- | --- | --- |
| `NODE_ENV` | | `production` turns on HSTS and upgrades any `http://` requests to `https://` |
| `TRUST_PROXY` | off | Number of proxies in front of the app (usually `1`). Needed so rate limits see the real visitor IP. Don't set it if nothing is in front of the app |
| `ADMIN_TOKEN` | off | Secret (16+ characters) for moderating cards. Keep it private |
| `CREATE_LIMIT` | `10` | Cards one IP can create per 15 minutes |
| `MAX_STORAGE_MB` | `2048` | Uploads stop being accepted once this much disk is used |
| `REPORT_HIDE_AT` | `3` | Reports from different people needed to hide a card from the Love wall |
| `PORT` | `3000` | Port to listen on |

### Moderation

Visitors can report public cards; once enough different people report one, it disappears from the Love wall (the link still works for the person it was sent to). With `ADMIN_TOKEN` set you can review and remove cards:

```bash
curl -H "x-admin-token: $ADMIN_TOKEN" https://your-site/api/admin/reported
```
```bash
curl -X DELETE -H "x-admin-token: $ADMIN_TOKEN" https://your-site/api/cards/CARD_ID
```

### Security measures

- **Headers** (helmet): strict Content-Security-Policy with no inline scripts, no framing, `nosniff`, `same-origin` referrer policy so secret card links never leak to other sites, Permissions-Policy that only allows the microphone, HSTS in production
- **Uploads**: the real file type is checked from the file's bytes (a renamed HTML or SVG file is rejected), files get random names, and they're served with a sandboxing CSP so they can never run as a page. 50 MB per file, 2 files per card, a total storage cap
- **Rate limits** per IP on creating cards, hearts, reports and the API overall
- **Cross-site requests** that change data are rejected
- **Input cleanup**: control and right-to-left override characters are stripped, every field has a length limit, and all text is escaped when shown
- **Storage** uses a `Map`, so ids like `__proto__` can't corrupt the server (prototype pollution)
- **Secrets**: 72-bit card ids, 192-bit edit tokens compared in constant time; the data file is only readable by the app's user
- Card pages and the API send `noindex`, so private cards don't show up in search engines
- Slow or stalled uploads are cut off after 2 minutes

### Still worth doing for a bigger launch

- Move from the JSON file to a database (SQLite/Postgres) and from `uploads/` to object storage (S3, R2), with backups
- Strip photo location data (EXIF GPS) on upload, for example with `sharp`
- Add a CAPTCHA (such as Cloudflare Turnstile) if spam gets past the rate limits
- Run `npm audit` regularly and keep dependencies updated
