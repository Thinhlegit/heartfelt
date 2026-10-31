# AGENTS.md — Heartfelt handover

Read this before changing anything. It tells you how the app is built, the rules that keep it safe, how to verify your work, and what to optimize next.

## 1. What this is

A web app for making greeting cards (message, photo/video, voice note, hand-drawn signature, optional chibi character) and sharing them by link. Recipients open an animated envelope. Optional public "Love wall" with reporting. UI in English and Vietnamese.

- **Stack:** Node.js 22, Express 4, multer (uploads), helmet (headers), express-rate-limit
- **Frontend:** plain HTML/CSS/JS in `public/`. No framework, no bundler, no build step
- **Storage:** one JSON file (`data/cards.json`) loaded into a `Map`; files in `uploads/`
- **Deploy:** distroless Docker image + `docker-compose.yml`; optional Caddy for HTTPS
- **Size:** ~2,600 lines total. Read the files; they're short

## 2. Run and check

| Task | Command |
| --- | --- |
| One-step setup (creates `.env`, starts app) | `./setup.sh` (`--node`, `--docker`, `--domain x`, `--yes`, `--no-build`) |
| Dev server with reload | `npm install && npm run dev` → http://localhost:3000 |
| Syntax check | `node --check server.js && for f in public/*.js; do node --check "$f"; done` |
| Docker build | `docker build -t heartfelt .` |
| Run hardened | `docker compose up -d` (add `--profile https` with `DOMAIN` set) |
| Health | `curl localhost:3000/healthz` |

There is **no automated test suite yet** (see backlog). Use the checklist in section 6.

## 3. Architecture

```
Browser ──► Caddy (optional, HTTPS) ──► Express (server.js)
                                          ├─ helmet headers, Permissions-Policy
                                          ├─ /api: origin check → rate limit → no-store/noindex
                                          ├─ static public/
                                          ├─ /uploads: strict name regex, sandbox CSP
                                          └─ routes → cards Map ──► saveCards() → data/cards.json
```

### Files

| File | Responsibility |
| --- | --- |
| `server.js` | Config, storage (`loadCards`, `saveCards`), upload checks (`sniff`, `finalizeUpload`), input cleanup (`clean*`), security middleware, routes, error handler, graceful shutdown |
| `public/index.html` + `create.js` | Create page: chips, design tiles, effects, starter lines, extras (media / voice with level meter / signature canvas), draft autosave, phone preview sheet, submit, done screen |
| `public/card.html` + `card.js` | Recipient page: envelope, reveal, hearts, share, report, delete (if this browser made it) |
| `public/wall.html` + `wall.js` | Love wall with occasion tabs |
| `public/themes.js` | `window.HF`: occasions/designs/effects/characters lists, `renderCard()` (shared by all pages), `icon()`, `confetti()`, `fireworks()`, `fold3d()` + `tilt()` (3D card), `buddy()` + `buddyArt` (character SVGs), `playEffect()`, `esc()` |
| `public/i18n.js` | `window.I18N` strings (`en`, `vi`) + `window.i18n` (`t()`, `set()`, `onChange()`, `apply()` for `data-i18n*` attributes) |
| `public/style.css` | Tokens, layout, card designs (`.greeting.design-<id>`), components, view transitions |
| `setup.sh` | One-step setup (bash 3.2 compatible for macOS) |
| `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.env.example` | Deployment |

### Card record (`data/cards.json`, keyed by id)

```js
{
  id, editToken,               // 12-char base64url id; 32-char secret token
  to, from, message, lang,     // lang: 'en' | 'vi' (card text renders in this language)
  relationship, occasion, design, effect, character,   // whitelisted enums, see server.js "Allowed choices"
  isPublic,                    // shown on Love wall if true and reports < REPORT_HIDE_AT
  media: { url, kind: 'image'|'video' } | null,
  voice: { url } | null,
  signature: { url } | null,   // transparent PNG
  hearts, reports, reporters,  // reporters = hashed IPs (max 50)
  createdAt                    // ISO string
}
```

`publicCard()` removes `editToken`, `reports` and `reporters` before anything leaves the server.

### API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/cards` | multipart: text fields + `media`, `voice`, `signature` files. Returns `{ id, url, editToken }` |
| GET | `/api/cards/:id` | public view |
| POST | `/api/cards/:id/heart` | 30/min/IP |
| POST | `/api/cards/:id/report` | 10/hour/IP, one per IP per card |
| DELETE | `/api/cards/:id` | header `x-edit-token` (owner) or `x-admin-token` |
| GET | `/api/admin/reported` | header `x-admin-token` |
| GET | `/api/wall` | latest 60 visible public cards |
| GET | `/healthz` | liveness |

Errors are `{ code, error }`; the client translates `code` via `err.<code>` keys in `i18n.js`.

## 4. Rules you must not break

1. **Storage is a `Map`.** Never index a plain object with user input (prototype pollution was a real bug). Always validate ids with `ID_RE` via `getCard()`.
2. **Never put user text into HTML unescaped.** Use `HF.esc()` in template strings or `textContent`.
3. **CSP is strict.** No inline `<script>` and no `style="…"` in HTML strings. Set CSS variables with `HF.applyTheme(el, occ)` or `el.style`. New external hosts need a helmet directive change; prefer not to add any.
4. **Uploads are verified by content.** A new file type needs all of: `CLAIMED` regex, a magic-byte branch in `sniff()`, an `EXT` entry, the `/uploads` path regex, and size limits. Never trust the browser's MIME type.
5. **Secrets stay server-side.** Any new private field must be stripped in `publicCard()`.
6. **Every UI string exists in both `en` and `vi`.** Card content uses `card.lang`; buttons and hints use the viewer's language.
7. **State-changing routes** go under `/api` (origin check + rate limit apply automatically) and need their own limiter if they're cheap to abuse.
8. **Respect reduced motion** for any animation (`HF.confetti`/`fireworks`/`fold3d`/`tilt` already return early).
9. **Container is read-only.** At runtime only `data/`, `uploads/` and a 16 MB `/tmp` are writable. Keep it that way.
10. **No build step.** Don't introduce bundlers or frameworks without the owner's agreement.

## 5. Recipes

- **New occasion:** add to `OCCASIONS` (server.js) and `HF.occasions` (themes.js, with colours `a`/`b` and a stamp emoji), then add `occ.<id>`, `title.<id>`, `sug.<id>.1`, `sug.<id>.2` in both languages.
- **New card design:** `DESIGNS` (server.js), `HF.designs`, `design.<id>` strings, `.greeting.design-<id>` rules, a `.sw-<id>` swatch, and `.wall .greeting.design-<id>` tweaks. Check it in the preview, on the card page and on the wall.
- **New opening effect:** `EFFECTS` (server.js), `HF.effects`, `effect.<id>` strings, a branch in `HF.playEffect()`. Effects that act on the card itself (like `fold3d`) receive the card's container and data; elsewhere (done screen) fall back to confetti.
- **New character:** `CHARACTERS` (server.js), `HF.characters`, an SVG in `HF.buddyArt` (viewBox 0 0 100 100, presentation attributes only, heart with `class="accent"`, waving arm in `<g class="wave">` with the shoulder at its bottom-left, eyes in `<g class="eyes">`), and `character.<id>` strings in both languages.
- **New language:** copy the `en` block in `i18n.js` to a new key, translate every string, and add the code to `LANGS` in server.js. The switcher builds itself from `I18N`.
- **New setting:** read it from `env` at the top of server.js, document it in `.env.example` and both READMEs.

## 6. Verify before you commit

1. `node --check` on every changed JS file.
2. Start the server and run the security regression probes (each must give the expected result):

```bash
B=localhost:3000
curl -s -X POST $B/api/cards/__proto__/heart                     # 404 notFound
printf '<html>' > /tmp/x.png
curl -s -X POST $B/api/cards -F to=x -F "media=@/tmp/x.png;type=image/png"   # fileType
curl -s -X POST $B/api/cards -H 'Origin: https://evil.example' -F to=x -F message=hi   # badOrigin
ID=$(curl -s -X POST $B/api/cards -F to=x -F message=hi | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s -X DELETE $B/api/cards/$ID                                # forbidden (no edit token)
curl -sI $B/ | grep -i content-security-policy                    # present, script-src 'self'
for i in $(seq 12); do curl -s -o /dev/null -w "%{http_code} " -X POST $B/api/cards -F to=x -F message=hi; done   # 429s after the limit
```

3. Browser check with Playwright (preinstalled in many agent sandboxes): create a card with photo, voice and signature; open the link; click the envelope; confirm no console errors (CSP violations show up there). Check a 390px-wide viewport (`document.documentElement.scrollWidth <= 390`), dark mode (`colorScheme: 'dark'`) and `?lang=vi`.
4. If you touched deployment: `docker build`, `docker compose up -d`, wait for `healthy`, create a card, `docker compose restart`, confirm it's still there.
5. Delete test data: `data/cards.json` and files in `uploads/` (keep `.gitkeep`).

## 7. Gotchas from previous sessions

- **Docker build behind a TLS-inspecting proxy:** `npm ci` fails with `SELF_SIGNED_CERT_IN_CHAIN`. Pass the proxy CA as a secret: `docker build --network=host --secret id=ca,src=/path/ca.crt .` It isn't stored in the image.
- **`COPY --from` resets ownership** to root. Writable dirs need `--chown=65532:65532` in the runtime stage.
- **Docker env_file doesn't strip inline `# comments`.** Keep comments on their own lines in `.env.example`.
- **Windows/WSL line endings:** `.gitattributes` forces LF. Without it, Git for Windows checks out CRLF, `setup.sh` fails with `bash\r: No such file or directory`, and WSL git shows every file as modified. Don't remove it.
- **macOS bash 3.2:** in `setup.sh`, no empty arrays under `set -u`, no `sed -i`, no `${var,,}`.
- **Playwright timing:** opening an extras panel scrolls smoothly; wait ~800 ms before reading bounding boxes. `canvas.toBlob` can take ~1 s headless (the signature now uses synchronous `toDataURL`).
- **`pkill -f server.js` can kill your own shell** if the command line contains that string. Kill by PID.
- **Some sandboxes can push branches but not tags.** Create releases from the GitHub UI if a tag push hangs.

## 8. Optimization backlog (prioritized)

Measure before and after (for example `npx autocannon -c 50 -d 10 http://localhost:3000/api/wall`), keep behaviour identical, and run section 6.

| # | Area | Problem (evidence) | Suggested fix | Done when |
| --- | --- | --- | --- | --- |
| 1 | Writes | `saveCards()` rewrites the whole file with `writeFileSync` and pretty-printed JSON on **every** create, heart, report and delete. It blocks the event loop and costs O(all cards) per heart | Coalesce writes: mark dirty, flush at most every ~250 ms with async `fs.promises.writeFile` + `rename`, one write in flight, compact JSON, and flush on SIGTERM before exit | Heart endpoint p99 flat as card count grows; no data loss on `docker stop` |
| 2 | Love wall | `/api/wall` filters and sorts all cards on every request | Keep a cached, sorted list of wall cards; rebuild on create/delete/report/visibility change; send an ETag | Response time independent of total cards |
| 3 | Static caching | `express.static` sends no long cache headers, so every visit revalidates CSS/JS | Add `?v=<hash or version>` to asset URLs and serve `public/` with `maxAge: '1y', immutable`; keep HTML `no-cache` | Repeat visits load assets from cache |
| 4 | Upload size | Photos are stored as uploaded (up to 50 MB) with EXIF/GPS intact | Downscale images in the browser before upload (canvas to ~2048 px JPEG/WebP; this also drops EXIF). Keep server-side `sniff()` checks | Typical photo upload under 1 MB; no GPS in stored files |
| 5 | Scale-out | JSON file + in-memory rate limits = single process only | Move to SQLite (Node's built-in `node:sqlite` avoids native builds, which matters because the Dockerfile uses `--ignore-scripts` on distroless) and a shared rate-limit store if running several replicas | Two replicas behind Caddy behave correctly |
| 6 | Boot | Upload directory size is computed synchronously at startup | Compute asynchronously or persist the running total | Fast start with many uploads |
| 7 | Fonts | Google Fonts adds two third-party origins | Self-host the WOFF2 files (keep the Vietnamese subset) and drop those CSP hosts | No third-party requests |
| 8 | Payload | `i18n.js` ships both languages to everyone | Split per language and load the active one | Smaller first load |
| 9 | Tests | No automated tests | Add `node:test` API + security tests (section 6 as code), a Playwright end-to-end flow, and a GitHub Actions workflow | `npm test` green in CI |
| 10 | Wall | Hard limit of 60 cards, no paging | Cursor pagination (`?before=createdAt`) | Older cards reachable |

## 9. Working conventions

- **Commits:** imperative summary line, body explains *why*. Use the repo's existing local git identity (the owner, Le Thinh). Work on a branch and open a PR unless the owner says to push to `main`.
- **Changelog:** add user-visible changes under `## Unreleased` in `CHANGELOG.md`.
- **Docs:** if behaviour or setup changes, update both `README.md` and `README.vi.md`.
- **Style:** match the surrounding code: 2-space indent, short comments that explain why, plain DOM APIs, `$()` helper in `create.js`.

## 10. Current state

- `main` is deployable. Version `1.0.0` is described in `CHANGELOG.md`; the GitHub release/tag may still need publishing from the GitHub UI.
- Not yet verified: issuing a real Let's Encrypt certificate (needs a public domain) and an image vulnerability scan (`docker scout cves heartfelt` or `trivy image heartfelt`).
