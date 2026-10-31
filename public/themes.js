// Shared choices + look for each occasion
window.HF = {
  relationships: [
    { id: 'love', label: 'My love', emoji: '💞' },
    { id: 'family', label: 'Family', emoji: '🏡' },
    { id: 'parents', label: 'Parents', emoji: '👨‍👩‍👧' },
    { id: 'friend', label: 'Friend', emoji: '🤝' },
    { id: 'coworker', label: 'Co-worker', emoji: '💼' },
    { id: 'teacher', label: 'Teacher', emoji: '🍎' },
    { id: 'other', label: 'Someone special', emoji: '✨' },
  ],
  occasions: [
    { id: 'love', label: 'Love message', emoji: '❤️', particles: ['❤️', '💕', '💖'], a: '#ff5f8f', b: '#ffb3c7', title: 'With all my love' },
    { id: 'birthday', label: 'Birthday', emoji: '🎂', particles: ['🎈', '🎉', '🎂'], a: '#7c5cff', b: '#ffcf5c', title: 'Happy Birthday' },
    { id: 'anniversary', label: 'Anniversary', emoji: '💍', particles: ['💍', '🌹', '✨'], a: '#c2185b', b: '#f8bbd0', title: 'Happy Anniversary' },
    { id: 'congrats', label: 'Congratulations', emoji: '🏆', particles: ['🎊', '🏆', '⭐'], a: '#00a884', b: '#ffd54f', title: 'Congratulations' },
    { id: 'thankyou', label: 'Thank you', emoji: '🙏', particles: ['🌼', '💛', '🙏'], a: '#f59e0b', b: '#fde68a', title: 'Thank you' },
    { id: 'celebration', label: 'Celebration', emoji: '🥳', particles: ['🥳', '🎉', '🎆'], a: '#ef4444', b: '#60a5fa', title: "Let's celebrate" },
    { id: 'getwell', label: 'Get well', emoji: '🌻', particles: ['🌻', '🍀', '💚'], a: '#16a34a', b: '#bbf7d0', title: 'Get well soon' },
    { id: 'justbecause', label: 'Just because', emoji: '🌈', particles: ['🌈', '☀️', '💫'], a: '#0ea5e9', b: '#c4b5fd', title: 'Thinking of you' },
  ],
  occasion(id) { return this.occasions.find(o => o.id === id) || this.occasions[7]; },
  relationship(id) { return this.relationships.find(r => r.id === id) || this.relationships[6]; },
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
  // Card markup used by the live preview, the card page and the wall
  renderCard(c, { compact = false } = {}) {
    const occ = this.occasion(c.occasion);
    const rel = this.relationship(c.relationship);
    const e = s => this.esc(s);
    const media = !c.media ? '' : c.media.kind === 'video'
      ? `<div class="media"><video src="${e(c.media.url)}" ${compact ? 'muted playsinline' : 'controls playsinline'}></video></div>`
      : `<div class="media"><img src="${e(c.media.url)}" alt="Photo for ${e(c.to)}"></div>`;
    const voice = !c.voice ? '' : compact
      ? `<div class="badges"><span>🎙️ Voice message</span></div>`
      : `<div class="voice"><div class="label">🎙️ A voice message from ${e(c.from || 'me')}</div><audio src="${e(c.voice.url)}" controls></audio></div>`;
    return `
      <div class="greeting">
        <div class="top">
          <div class="emoji">${occ.emoji}</div>
          <h2>${e(occ.title)}</h2>
          <div class="to">To ${e(c.to || 'someone special')} ${rel.emoji}</div>
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
