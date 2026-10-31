# 💌 Heartfelt

Make a card for your love, family, parents, friends or co-workers, then share it with a public link.

- **Pick who it's for**: My love, Family, Parents, Friend, Co-worker, Teacher, Someone special
- **Pick the occasion**: Love message, Birthday, Anniversary, Congratulations, Thank you, Celebration, Get well, Just because (each has its own colours and floating emoji)
- **Add content**: a text message, a photo or video (up to 50 MB), and/or a **voice message recorded in the browser** (or an uploaded audio file)
- **Share**: each card gets a link like `/c/AbC123`. The recipient sees an envelope, taps it to open, and can send hearts back
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
public/themes.js   Relationships, occasions, themes, shared card renderer
public/style.css   Styles (light + dark mode)
data/cards.json    Card storage (created automatically)
uploads/           Uploaded photos, videos and voice notes
```

## Before going to production

- Replace the JSON file with a database (SQLite/Postgres) and `uploads/` with object storage (S3, R2, Cloudinary)
- Add rate limiting and moderation/reporting for the public wall
- Put it behind HTTPS
