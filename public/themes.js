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
          ${c.from ? `<div class="from">${e(c.from)}</div>` : ''}
        </div>
      </div>`;
  },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};
