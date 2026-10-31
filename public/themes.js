// Shared choices + look for each occasion. Labels and titles live in i18n.js.
window.HF = {
  relationships: [
    { id: 'love' }, { id: 'family' }, { id: 'parents' }, { id: 'friend' },
    { id: 'coworker' }, { id: 'teacher' }, { id: 'other' },
  ],
  // a/b: card colours. emoji only appears where a design wants a motif (postcard stamp).
  occasions: [
    { id: 'love', emoji: '❤️', a: '#c2364a', b: '#f1b7bd' },
    { id: 'birthday', emoji: '🎂', a: '#6a4fd1', b: '#f3c75b' },
    { id: 'anniversary', emoji: '💍', a: '#9c2a5c', b: '#efc4d4' },
    { id: 'congrats', emoji: '🏆', a: '#127a63', b: '#f0cf63' },
    { id: 'thankyou', emoji: '🌼', a: '#c27410', b: '#f6dc96' },
    { id: 'celebration', emoji: '🥂', a: '#d1462f', b: '#7fb0e8' },
    { id: 'getwell', emoji: '🌻', a: '#2f7d3a', b: '#c9e8b8' },
    { id: 'justbecause', emoji: '☁️', a: '#2b6c9e', b: '#cbbff0' },
  ],
  designs: [
    { id: 'classic' }, { id: 'polaroid' }, { id: 'elegant' },
    { id: 'confetti' }, { id: 'minimal' }, { id: 'postcard' },
  ],
  effects: [{ id: 'confetti' }, { id: 'fireworks' }, { id: 'fold3d' }, { id: 'none' }],
  characters: [{ id: 'none' }, { id: 'bear' }, { id: 'cat' }, { id: 'bunny' }, { id: 'chick' }],
  design(id) { return this.designs.find(d => d.id === id) || this.designs[0]; },
  occasion(id) { return this.occasions.find(o => o.id === id) || this.occasions[7]; },
  relationship(id) { return this.relationships.find(r => r.id === id) || this.relationships[6]; },
  occLabel(id, lang) { return i18n.t('occ.' + this.occasion(id).id, null, lang); },
  occTitle(id, lang) { return i18n.t('title.' + this.occasion(id).id, null, lang); },
  relLabel(id, lang) { return i18n.t('rel.' + this.relationship(id).id, null, lang); },
  applyTheme(el, occ) {
    el.style.setProperty('--a', occ.a);
    el.style.setProperty('--b', occ.b);
  },

  // Small line icons (24px grid, stroke = currentColor)
  icon(name) {
    const p = {
      mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
      stop: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
      link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
      share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
      heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      pen: '<path d="M3 21c3-1 5-3 7-6l7-7a2.1 2.1 0 0 0-3-3l-7 7c-3 2-5 4-6 7"/><path d="M14 21h7"/>',
      check: '<path d="m5 12 5 5 9-10"/>',
      play: '<path d="M7 5v14l11-7z" fill="currentColor" stroke="none"/>',
    }[name] || '';
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  },

  // Paper confetti falling from the top. Respects reduced motion.
  confetti(colors, count = 70) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    for (let i = 0; i < count; i++) {
      const s = document.createElement('i');
      const w = 6 + Math.random() * 6;
      s.style.cssText = `left:${Math.random() * 100}%;width:${w}px;height:${w * (0.4 + Math.random() * 0.8)}px;` +
        `background:${colors[i % colors.length]};animation-duration:${2.4 + Math.random() * 2}s;` +
        `animation-delay:${Math.random() * 0.6}s;--drift:${(Math.random() - 0.5) * 160}px;--spin:${(Math.random() - 0.5) * 1080}deg`;
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 5500);
  },

  // Fireworks on a full-screen canvas: rockets rise, then burst into falling sparks
  fireworks(colors, bursts = 7) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'fireworks-layer';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const rockets = [], sparks = [];
    // Additive glow only reads well on dark backgrounds; on light paper, paint solid colour
    const glow = matchMedia('(prefers-color-scheme: dark)').matches ? 'lighter' : 'source-over';
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < bursts; i++) {
      rockets.push({
        x: W * (0.15 + Math.random() * 0.7), y: H + 10,
        vy: -(H * 0.011 + Math.random() * H * 0.004), apex: H * (0.15 + Math.random() * 0.3),
        delay: i * 22 + Math.random() * 14, color: pick(),
      });
    }
    function burst(r) {
      const n = 56 + Math.floor(Math.random() * 28);
      const speed = 2.2 + Math.random() * 1.8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
        const v = speed * (0.55 + Math.random() * 0.45);
        sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.012 + Math.random() * 0.01, color: Math.random() < 0.2 ? '#f3d36b' : r.color });
      }
    }
    let frame = 0;
    (function tick() {
      frame++;
      // Fade the previous frame so sparks leave short trails
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = glow;
      for (const r of rockets) {
        if (r.done || frame < r.delay) continue;
        r.y += r.vy;
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x - 1, r.y, 2, 7);
        if (r.y <= r.apex) { r.done = true; burst(r); }
      }
      for (const s of sparks) {
        if (s.life <= 0) continue;
        s.vx *= 0.985; s.vy = s.vy * 0.985 + 0.045;
        s.x += s.vx; s.y += s.vy; s.life -= s.decay;
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.3 * (0.6 + s.life * 0.4), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const busy = rockets.some(r => !r.done) || sparks.some(s => s.life > 0);
      if (busy && frame < 600) requestAnimationFrame(tick);
      else canvas.remove();
    })();
  },

  // The opening effect a sender picked for their card.
  // fold3d needs the element holding the card (target) and the card data for its cover.
  playEffect(effect, occ, target, card) {
    if (effect === 'none') return;
    if (effect === 'fireworks') return this.fireworks([occ.a, occ.b, '#f3d36b', '#ffffff']);
    if (effect === 'fold3d' && target && card) {
      if (this.fold3d(target, card)) setTimeout(() => this.confetti([occ.a, occ.b, '#ffffff'], 36), 1300);
      return;
    }
    this.confetti([occ.a, occ.b, '#ffffff', '#f3d36b']);
  },

  // 3D card: a front cover hinged on the left swings open to reveal the card inside.
  // Returns false when skipped (reduced motion or nothing to open).
  fold3d(host, c) {
    const card = host.querySelector('.greeting');
    host.querySelectorAll('.fold-cover').forEach(el => el.remove());
    if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const lang = c.lang || 'en';
    const occ = this.occasion(c.occasion);
    const art = this.buddy(c.character) || `<span class="cover-emoji">${occ.emoji}</span>`;
    const cover = document.createElement('div');
    cover.className = 'fold-cover';
    cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML = `
      <div class="face front">
        <div class="cover-art">${art}</div>
        <div class="cover-title">${this.esc(this.occTitle(occ.id, lang))}</div>
        <div class="cover-to">${this.esc(i18n.t('card.to', { to: c.to || i18n.t('card.someoneSpecial', null, lang) }, lang))}</div>
      </div>
      <div class="face back"></div>`;
    this.applyTheme(cover, occ);
    host.classList.add('fold3d');
    host.prepend(cover);
    cover.addEventListener('animationend', e => {
      if (e.target !== cover) return;
      cover.remove();
      host.classList.remove('fold3d');
    });
    return true;
  },

  // Gentle 3D tilt that follows the pointer (mouse/trackpad only)
  tilt(stage) {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stage.classList.add('tilt');
    stage.addEventListener('pointermove', e => {
      const card = stage.querySelector('.greeting');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      card.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
      card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
      card.style.setProperty('--gx', `${x * 100}%`);
      card.style.setProperty('--gy', `${y * 100}%`);
    });
    stage.addEventListener('pointerleave', () => {
      const card = stage.querySelector('.greeting');
      if (card) ['--rx', '--ry'].forEach(p => card.style.setProperty(p, '0deg'));
    });
  },

  // Little hand-drawn friends. Plain SVG attributes only (the CSP blocks inline styles);
  // .accent takes the occasion colour, .wave and .eyes are animated in CSS.
  buddy(id) {
    const art = this.buddyArt[id];
    return art ? `<div class="buddy buddy-${id}" aria-hidden="true"><svg viewBox="0 0 100 100">${art}</svg></div>` : '';
  },
  buddyArt: (() => {
    const K = '#3a2f25';
    const S = `stroke="${K}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
    const heart = (x, y) => `<path class="accent" d="M${x} ${y}c-2-4-8-3-8 2 0 4 8 9 8 9s8-5 8-9c0-5-6-6-8-2z" ${S}/>`;
    const shadow = '<ellipse cx="50" cy="96.5" rx="24" ry="3" fill="#000" fill-opacity=".1"/>';
    // Tiny body, stubby feet and a resting arm (drawn before the head so the chin overlaps).
    const body = (fill, belly) => `<path d="M35 94c-2-13 3-25 15-25s17 12 15 25z" fill="${fill}" ${S}/>` +
      (belly ? `<ellipse cx="50" cy="84" rx="8" ry="7" fill="${belly}"/>` : '') +
      `<ellipse cx="40" cy="94" rx="6.5" ry="3.6" fill="${fill}" ${S}/><ellipse cx="60" cy="94" rx="6.5" ry="3.6" fill="${fill}" ${S}/>` +
      `<path d="M37 79c-5 1-6 7-3 10" fill="none" ${S}/>`;
    // Waving arm: shoulder at the group's bottom-left (the CSS rotates around it).
    const wave = `<g class="wave"><path d="M63 82c7-1 12-6 15-13" fill="none" ${S}/>${heart(84, 55)}</g>`;
    const cheeks = (y, o = '.5') => `<ellipse cx="31" cy="${y}" rx="4.2" ry="3" fill="#f08a8a" fill-opacity="${o}"/><ellipse cx="69" cy="${y}" rx="4.2" ry="3" fill="#f08a8a" fill-opacity="${o}"/>`;
    const eye = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="6.4" fill="${K}"/><circle cx="${x - 1.8}" cy="${y - 2.4}" r="2.2" fill="#fff"/><circle cx="${x + 2}" cy="${y + 2.6}" r="1" fill="#fff"/>`;
    const eyes = y => `<g class="eyes">${eye(36, y)}${eye(64, y)}</g>`;
    const smile = (y) => `<path d="M46.5 ${y}c1.5 2 5.5 2 7 0" fill="none" ${S}/>`;
    return {
      bear: shadow + body('#c38d63', '#ecc9a3') +
        `<circle cx="26" cy="15" r="9" fill="#c38d63" ${S}/><circle cx="74" cy="15" r="9" fill="#c38d63" ${S}/>` +
        '<circle cx="26" cy="15" r="4" fill="#ecc9a3"/><circle cx="74" cy="15" r="4" fill="#ecc9a3"/>' +
        `<circle cx="50" cy="39" r="31" fill="#c38d63" ${S}/><ellipse cx="50" cy="54" rx="11" ry="8" fill="#ecc9a3" ${S}/>` +
        `<ellipse cx="50" cy="51" rx="3.4" ry="2.4" fill="${K}"/><path d="M50 53v2" fill="none" ${S}/>` + smile(55) +
        eyes(46) + cheeks(56) + wave,
      cat: shadow +
        `<path d="M64 90c13 1 17-9 11-17" fill="none" stroke="${K}" stroke-width="7.4" stroke-linecap="round"/>` +
        '<path d="M64 90c13 1 17-9 11-17" fill="none" stroke="#e9a35b" stroke-width="4.4" stroke-linecap="round"/>' +
        body('#e9a35b', '#fbe3c4') +
        `<path d="M21 31l1-24 20 9z" fill="#e9a35b" ${S}/><path d="M79 31l-1-24-20 9z" fill="#e9a35b" ${S}/>` +
        '<path d="M26 24l1-11 8 4z" fill="#f4b6a6"/><path d="M74 24l-1-11-8 4z" fill="#f4b6a6"/>' +
        `<circle cx="50" cy="39" r="31" fill="#e9a35b" ${S}/>` +
        '<path d="M50 11v7M43 12l1.5 6M57 12l-1.5 6" fill="none" stroke="#b86f2c" stroke-width="2.2" stroke-linecap="round"/>' +
        eyes(46) + `<path d="M47.5 51h5l-2.5 2.6z" fill="#e8846b" stroke="${K}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<path d="M50 53.6c-.5 2.6-4.5 2.6-5 .4M50 53.6c.5 2.6 4.5 2.6 5 .4" fill="none" ${S}/>` +
        `<path d="M22 50l-10-2M22 54l-10 2M78 50l10-2M78 54l10 2" fill="none" stroke="${K}" stroke-width="1.6" stroke-linecap="round"/>` +
        cheeks(57, '.4') + wave,
      bunny: shadow + body('#f7f1ea', '#ffffff') +
        `<path d="M33 24c-8-14-7-22-1-23s11 9 11 22" fill="#f7f1ea" ${S}/><path d="M67 24c8-14 7-22 1-23s-11 9-11 22" fill="#f7f1ea" ${S}/>` +
        '<path d="M33.5 20c-4-9-3-14-1-14.5s5 5 5 14" fill="#f4b6a6"/><path d="M66.5 20c4-9 3-14 1-14.5s-5 5-5 14" fill="#f4b6a6"/>' +
        `<circle cx="50" cy="44" r="29" fill="#f7f1ea" ${S}/>` +
        eyes(50) + '<ellipse cx="50" cy="55" rx="2.8" ry="2" fill="#e8846b"/>' +
        `<path d="M50 57v1.5m-3.5.5c1.5 1.8 5.5 1.8 7 0" fill="none" ${S}/>` + cheeks(60, '.55') + wave,
      chick: shadow +
        '<path d="M41 91v4m-3 1h6M59 91v4m-3 1h6" fill="none" stroke="#ef8a3c" stroke-width="2.4" stroke-linecap="round"/>' +
        `<path d="M36 94c-2-13 3-25 14-25s16 12 14 25z" fill="#f6cf4e" ${S}/><ellipse cx="50" cy="85" rx="8" ry="6.5" fill="#fbe9a0"/>` +
        `<path d="M37 79c-5 1-6 7-3 10" fill="none" ${S}/>` +
        `<circle cx="50" cy="39" r="31" fill="#f6cf4e" ${S}/>` +
        `<path d="M46 9c-3-6-1-8 2-7M50 8c0-6 4-8 7-6M54 9c3-4 6-4 8-2" fill="none" ${S}/>` +
        eyes(46) + `<path d="M45.500 51.500c2-1.500 7-1.500 9 0l-4.500 5z" fill="#ef8a3c" stroke="${K}" stroke-width="1.8" stroke-linejoin="round"/>` +
        cheeks(57, '.45') + wave,
    };
  })(),

  // Card markup used by the live preview, the card page and the wall.
  // The card's own text uses the language it was written in (c.lang).
  renderCard(c, { compact = false } = {}) {
    const lang = c.lang || 'en';
    const t = (k, v) => i18n.t(k, v, lang);
    const occ = this.occasion(c.occasion);
    const e = s => this.esc(s);
    const media = !c.media ? '' : c.media.kind === 'video'
      ? `<div class="media"><video src="${e(c.media.url)}" ${compact ? 'muted playsinline' : 'controls playsinline'}></video></div>`
      : `<div class="media"><img src="${e(c.media.url)}" alt="${e(t('card.photoFor', { to: c.to }))}"></div>`;
    const voice = !c.voice ? '' : compact
      ? `<div class="badges">${this.icon('mic')}<span>${e(t('card.voiceBadge'))}</span></div>`
      : `<div class="voice"><div class="label">${this.icon('mic')}${e(t('card.voiceFrom', { from: c.from || t('card.me') }))}</div><audio src="${e(c.voice.url)}" controls></audio></div>`;
    const sign = c.signature
      ? `<div class="from signed"><img src="${e(c.signature.url)}" alt="${e(t('card.signedBy', { from: c.from || t('card.me') }))}"></div>`
      : c.from ? `<div class="from">${e(c.from)}</div>` : '';
    const buddy = this.buddy(c.character);
    const foot = buddy ? `<div class="foot">${buddy}${sign}</div>` : sign;
    return `
      <div class="greeting design-${this.design(c.design).id}" lang="${e(lang)}">
        <div class="top">
          <div class="emoji" aria-hidden="true">${occ.emoji}</div>
          <h2>${e(this.occTitle(occ.id, lang))}</h2>
          <div class="to">${e(t('card.to', { to: c.to || t('card.someoneSpecial') }))}</div>
        </div>
        <div class="body">
          ${media}
          ${c.message ? `<div class="msg">${e(c.message)}</div>` : ''}
          ${voice}
          ${foot}
        </div>
      </div>`;
  },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};
