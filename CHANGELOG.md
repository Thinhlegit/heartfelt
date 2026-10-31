# Changelog

## Unreleased

## 1.0.1 — 2026-10-31

### Easier setup
- `./setup.sh`: one command that creates `.env`, generates an admin token, and starts Heartfelt with Docker (or Node.js if Docker isn't installed)
- `./setup.sh --domain example.com`: public site with automatic HTTPS (Caddy, free auto-renewing certificate)
- All settings in one `.env` file, read by both Docker and `npm start`
- `npm run dev` for working on the code
- The server log says whether moderation is on

### For developers
- `AGENTS.md`: handover notes for coding agents (architecture, rules, checks, optimization backlog); `CLAUDE.md` points to it

### Fixes
- The input-cleanup pattern in `server.js` now uses visible `\u` escapes instead of invisible characters (same behaviour, safer to edit)

## 1.0.0 — 2026-10-31

First release.

### Cards
- Write a message, or start from a suggested line for each of 8 occasions
- Add a photo or video (up to 50 MB), a voice note recorded in the browser, and a hand-drawn signature
- 6 card designs: Classic, Polaroid, Evening, Party, Plain, Postcard
- Opening effect: confetti, fireworks or none
- Recipients open a sealed envelope and can send hearts back
- Private link by default; optionally pin a card to the public Love wall
- English and Vietnamese; each card keeps the language it was written in

### Experience
- Live preview, full-screen on phones
- Drafts save automatically; the sender's name is remembered
- Calm form: extras stay folded away until needed
- Smooth transitions, respecting reduced-motion settings
- Accessible: keyboard friendly, screen-reader announcements, high-contrast support

### Security
- Strict security headers and Content-Security-Policy
- Uploads checked by real file type and served safely
- Rate limits, storage cap, cross-site request blocking, input cleanup
- Reporting and admin moderation for the Love wall

### Deployment
- Docker image on distroless Node 22: non-root, no shell, about 50 MB
- `docker-compose.yml` with a read-only filesystem, no capabilities and resource limits
- Health check at `/healthz` and clean shutdown
