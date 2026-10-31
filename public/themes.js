// Shared choices + look for each occasion. Labels and titles live in i18n.js.
window.HF = {
  relationships: [
    { id: 'love', emoji: '💞' },
    { id: 'family', emoji: '🏡' },
    { id: 'parents', emoji: '👨‍👩‍👧' },
    { id: 'friend', emoji: '🤝' },
    { id: 'coworker', emoji: '💼' },
    { id: 'teacher', emoji: '🍎' },
    { id: 'other', emoji: '✨' },
  ],
  occasions: [
    { id: 'love', emoji: '❤️', particles: ['❤️', '💕', '💖'], a: '#ff5f8f', b: '#ffb3c7' },
    { id: 'birthday', emoji: '🎂', particles: ['🎈', '🎉', '🎂'], a: '#7c5cff', b: '#ffcf5c' },
    { id: 'anniversary', emoji: '💍', particles: ['💍', '🌹', '✨'], a: '#c2185b', b: '#f8bbd0' },
    { id: 'congrats', emoji: '🏆', particles: ['🎊', '🏆', '⭐'], a: '#00a884', b: '#ffd54f' },
    { id: 'thankyou', emoji: '🙏', particles: ['🌼', '💛', '🙏'], a: '#f59e0b', b: '#fde68a' },
    { id: 'celebration', emoji: '🥳', particles: ['🥳', '🎉', '🎆'], a: '#ef4444', b: '#60a5fa' },
    { id: 'getwell', emoji: '🌻', particles: ['🌻', '🍀', '💚'], a: '#16a34a', b: '#bbf7d0' },
    { id: 'justbecause', emoji: '🌈', particles: ['🌈', '☀️', '💫'], a: '#0ea5e9', b: '#c4b5fd' },
  ],
  occasion(id) { return this.occasions.find(o => o.id === id) || this.occasions[7]; },
  relationship(id) { return this.relationships.find(r => r.id === id) || this.relationships[6]; },
  occLabel(id, lang) { return i18n.t('occ.' + this.occasion(id).id, null, lang); },
  occTitle(id, lang) { return i18n.t('title.' + this.occasion(id).id, null, lang); },
  relLabel(id, lang) { return i18n.t('rel.' + this.relationship(id).id, null, lang); },
  applyTheme(el, occ) {
    el.style.setProperty('--a', occ.a);
    el.style.setProperty('--b', occ.b);
  },
  // Floating emoji burst
  burst(container, emojis, count = 24) {
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'particle';
      s.textContent = emojis[i % emojis.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.fontSize = 16 + Math.random() * 22 + 'px';
      s.style.animationDuration = 3 + Math.random() * 3 + 's';
      s.style.animationDelay = Math.random() * 1.5 + 's';
      container.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    }
  },
  // Card markup used by the live preview, the card page and the wall.
  // The card's own text uses the language it was written in (c.lang).
  renderCard(c, { compact = false } = {}) {
    const lang = c.lang || 'en';
    const t = (k, v) => i18n.t(k, v, lang);
    const occ = this.occasion(c.occasion);
    const rel = this.relationship(c.relationship);
    const e = s => this.esc(s);
    const media = !c.media ? '' : c.media.kind === 'video'
      ? `<div class="media"><video src="${e(c.media.url)}" ${compact ? 'muted playsinline' : 'controls playsinline'}></video></div>`
      : `<div class="media"><img src="${e(c.media.url)}" alt="${e(t('card.photoFor', { to: c.to }))}"></div>`;
    const voice = !c.voice ? '' : compact
      ? `<div class="badges"><span>${e(t('card.voiceBadge'))}</span></div>`
      : `<div class="voice"><div class="label">${e(t('card.voiceFrom', { from: c.from || t('card.me') }))}</div><audio src="${e(c.voice.url)}" controls></audio></div>`;
    return `
      <div class="greeting" lang="${e(lang)}">
        <div class="top">
          <div class="emoji">${occ.emoji}</div>
          <h2>${e(this.occTitle(occ.id, lang))}</h2>
          <div class="to">${e(t('card.to', { to: c.to || t('card.someoneSpecial') }))} ${rel.emoji}</div>
        </div>
        <div class="body">
          ${media}
          ${c.message ? `<div class="msg">${e(c.message)}</div>` : ''}
          ${voice}
          ${c.from ? `<div class="from">— ${e(c.from)}</div>` : ''}
        </div>
      </div>`;
  },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};
