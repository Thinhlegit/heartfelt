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
    const S = 'stroke="#3a2f25" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
    const heart = (x, y) => `<path class="accent" d="M${x} ${y}c-2-4-8-3-8 2 0 4 8 9 8 9s8-5 8-9c0-5-6-6-8-2z" ${S}/>`;
    const shadow = '<ellipse cx="50" cy="96" rx="22" ry="3" fill="#000" fill-opacity=".1"/>';
    const body = fill => `<path d="M32 93c-2-14 4-27 18-27s20 13 18 27z" fill="${fill}" ${S}/>`;
    const arm = `<path d="M34 77c-5 3-6 9-3 12" fill="none" ${S}/>`;
    const wave = `<g class="wave"><path d="M66 77c6-3 10-9 12-16" fill="none" ${S}/>${heart(80, 50)}</g>`;
    const cheeks = (y, o = '.5') => `<circle cx="35" cy="${y}" r="3.2" fill="#e8846b" fill-opacity="${o}"/><circle cx="65" cy="${y}" r="3.2" fill="#e8846b" fill-opacity="${o}"/>`;
    const eyes = (y, ry = 2.4) => `<g class="eyes"><ellipse cx="41" cy="${y}" rx="2.4" ry="${ry}" fill="#3a2f25"/><ellipse cx="59" cy="${y}" rx="2.4" ry="${ry}" fill="#3a2f25"/></g>`;
    return {
      bear: shadow + body('#c38d63') + '<ellipse cx="50" cy="84" rx="9" ry="8" fill="#ecc9a3"/>' + arm +
        `<circle cx="32" cy="24" r="8" fill="#c38d63" ${S}/><circle cx="68" cy="24" r="8" fill="#c38d63" ${S}/>` +
        '<circle cx="32" cy="24" r="3.5" fill="#ecc9a3"/><circle cx="68" cy="24" r="3.5" fill="#ecc9a3"/>' +
        `<circle cx="50" cy="42" r="22" fill="#c38d63" ${S}/><ellipse cx="50" cy="50" rx="10" ry="7.5" fill="#ecc9a3" ${S}/>` +
        `<ellipse cx="50" cy="46.5" rx="3.2" ry="2.3" fill="#3a2f25"/><path d="M50 49v3m-4 1c2 2 6 2 8 0" fill="none" ${S}/>` +
        eyes(39) + cheeks(47) + wave,
      cat: shadow +
        '<path d="M66 91c12 0 16-10 10-19" fill="none" stroke="#3a2f25" stroke-width="7.4" stroke-linecap="round"/>' +
        '<path d="M66 91c12 0 16-10 10-19" fill="none" stroke="#e9a35b" stroke-width="4.4" stroke-linecap="round"/>' +
        body('#e9a35b') + '<ellipse cx="50" cy="84" rx="9" ry="8" fill="#fbe3c4"/>' + arm +
        `<path d="M29 33l2-19 15 9z" fill="#e9a35b" ${S}/><path d="M71 33l-2-19-15 9z" fill="#e9a35b" ${S}/>` +
        '<path d="M33 28l1-8 6 4z" fill="#f4b6a6"/><path d="M67 28l-1-8-6 4z" fill="#f4b6a6"/>' +
        `<ellipse cx="50" cy="43" rx="23" ry="20" fill="#e9a35b" ${S}/>` +
        '<path d="M50 24v6M44 25l1 5M56 25l-1 5" fill="none" stroke="#b86f2c" stroke-width="2.2" stroke-linecap="round"/>' +
        eyes(42, 3.2) + `<path d="M47.5 47h5l-2.5 3z" fill="#e8846b" stroke="#3a2f25" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<path d="M50 50c-1 2.5-4 2.5-5 1M50 50c1 2.5 4 2.5 5 1" fill="none" ${S}/>` +
        '<path d="M30 47l-9-2M30 51l-9 1M70 47l9-2M70 51l9 1" fill="none" stroke="#3a2f25" stroke-width="1.6" stroke-linecap="round"/>' +
        cheeks(49, '.35') + wave,
      bunny: shadow + body('#f7f1ea') + '<ellipse cx="50" cy="84" rx="9" ry="8" fill="#ffffff"/>' + arm +
        `<path d="M39 28c-6-14-5-25 1-25s9 11 5 25" fill="#f7f1ea" ${S}/><path d="M61 28c6-14 5-25-1-25s-9 11-5 25" fill="#f7f1ea" ${S}/>` +
        '<path d="M41 23c-3-9-2-15 0-15s3 6 2 15" fill="#f4b6a6"/><path d="M59 23c3-9 2-15 0-15s-3 6-2 15" fill="#f4b6a6"/>' +
        `<circle cx="50" cy="45" r="21" fill="#f7f1ea" ${S}/>` +
        eyes(43) + '<ellipse cx="50" cy="49.5" rx="2.6" ry="2" fill="#e8846b"/>' +
        `<path d="M50 51.5v2m-3.5 1c1.5 1.5 5.5 1.5 7 0" fill="none" ${S}/>` + cheeks(50, '.6') + wave,
      chick: shadow +
        '<path d="M42 91v5m-3 0h6M58 91v5m-3 0h6" fill="none" stroke="#ef8a3c" stroke-width="2.4" stroke-linecap="round"/>' +
        `<path d="M50 22c18 0 28 16 28 36s-10 34-28 34-28-14-28-34 10-36 28-36z" fill="#f6cf4e" ${S}/>` +
        `<path d="M48 22c-2-6 1-10 4-11M51 22c1-5 5-7 8-6" fill="none" ${S}/>` +
        `<path d="M25 62c-6 4-6 12-1 15 4-3 5-10 1-15z" fill="#efbd2f" ${S}/>` +
        eyes(45) + `<path d="M46 52l4 5 4-5z" fill="#ef8a3c" stroke="#3a2f25" stroke-width="1.8" stroke-linejoin="round"/>` +
        cheeks(54, '.45') +
        `<g class="wave"><path d="M75 63c8-2 11-8 11-14" fill="none" ${S}/>${heart(86, 38)}</g>`,
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
