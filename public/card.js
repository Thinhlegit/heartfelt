i18n.apply();
const t = (k, v) => i18n.t(k, v);
const e = s => HF.esc(s);
const root = document.getElementById('root');
const id = location.pathname.split('/').pop();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let card = null, view = 'loading', shareCopied = false, reported = false;

// The card itself stays in the sender's language; buttons and hints follow the viewer's
function draw() {
  if (view === 'missing') {
    root.innerHTML = `<div class="empty"><h1>${e(t('card.notFound'))}</h1><p>${e(t('card.notFoundBody'))}</p><a class="btn primary" href="/">${e(t('card.makeCard'))}</a></div>`;
  } else if (view === 'envelope') {
    const occ = HF.occasion(card.occasion);
    const cardT = (k, v) => i18n.t(k, v, card.lang);
    document.title = `${HF.occTitle(occ.id, card.lang)}, ${card.to}`;
    root.innerHTML = `
      <div class="stage">
        <button type="button" class="envelope" id="env" aria-label="${e(t('card.openLabel'))}">
          <span class="env-back"></span>
          <span class="env-letter"></span>
          <span class="env-front">
            <span class="stamp" aria-hidden="true">${occ.emoji}</span>
            <span class="address" lang="${e(card.lang || 'en')}">
              <span class="for">${e(cardT('card.envelopeFor', { to: card.to }))}</span>
              ${card.from ? `<span class="sender">${e(cardT('card.fromLine', { from: card.from }))}</span>` : ''}
            </span>
          </span>
          <span class="env-flap"><span class="seal" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 19s-6-3.8-6-8.3A3.3 3.3 0 0 1 12 8.8a3.3 3.3 0 0 1 6 1.9C18 15.2 12 19 12 19z"/></svg></span></span>
        </button>
        <p class="hint">${e(t('card.tapToOpen'))}</p>
      </div>`;
    document.getElementById('env').addEventListener('click', openEnvelope);
  } else if (view === 'open') {
    drawActions();
  }
}

function editToken() {
  try { return localStorage.getItem('hf-edit-' + card.id); } catch { return null; }
}

function drawActions() {
  const token = editToken();
  document.getElementById('actions').innerHTML = `
    <button type="button" class="btn primary heart-btn" id="heart">${HF.icon('heart')}<span>${e(t('card.sendLove'))}</span><span class="count" id="hc">${card.hearts || 0}</span></button>
    <button type="button" class="btn" id="share">${HF.icon('share')}<span>${e(t(shareCopied ? 'card.linkCopied' : 'card.share'))}</span></button>
    <a class="btn" href="/">${e(t('card.makeBack'))}</a>
    ${token ? `<button type="button" class="text-btn danger" id="del">${e(t('card.delete'))}</button>` : ''}
    ${card.isPublic && !token ? `<button type="button" class="text-btn" id="report"${reported ? ' disabled' : ''}>${e(t(reported ? 'card.reported' : 'card.report'))}</button>` : ''}`;

  const heart = document.getElementById('heart');
  heart.addEventListener('click', async () => {
    heart.classList.remove('pop'); void heart.offsetWidth; heart.classList.add('pop');
    const r = await fetch(`/api/cards/${card.id}/heart`, { method: 'POST' });
    if (r.ok) {
      card.hearts = (await r.json()).hearts;
      document.getElementById('hc').textContent = card.hearts;
    }
  });
  document.getElementById('share').addEventListener('click', async () => {
    if (navigator.share) return navigator.share({ title: document.title, url: location.href }).catch(() => {});
    await navigator.clipboard.writeText(location.href);
    shareCopied = true;
    document.querySelector('#share span').textContent = t('card.linkCopied');
  });
  const report = document.getElementById('report');
  if (report) report.addEventListener('click', async () => {
    if (!confirm(t('card.reportConfirm'))) return;
    const r = await fetch(`/api/cards/${card.id}/report`, { method: 'POST' });
    if (r.ok) { reported = true; report.textContent = t('card.reported'); report.disabled = true; }
  });
  const del = document.getElementById('del');
  if (del) del.addEventListener('click', async () => {
    if (!confirm(t('card.confirmDelete'))) return;
    const r = await fetch('/api/cards/' + card.id, { method: 'DELETE', headers: { 'x-edit-token': token } });
    if (r.ok) { try { localStorage.removeItem('hf-edit-' + card.id); } catch {} location.href = '/'; }
  });
}

function openEnvelope() {
  const env = document.getElementById('env');
  if (env.classList.contains('open')) return;
  env.classList.add('open');
  setTimeout(showCard, reduceMotion ? 0 : 1100);
}

function showCard() {
  view = 'open';
  root.innerHTML = `<div class="reveal">${HF.renderCard(card)}</div><div class="actions" id="actions"></div>`;
  drawActions();
  const occ = HF.occasion(card.occasion);
  HF.confetti([occ.a, occ.b, '#ffffff', '#f3d36b']);
  const v = root.querySelector('.media video');
  if (v) v.play().catch(() => {});
}

i18n.onChange(draw);

fetch('/api/cards/' + encodeURIComponent(id))
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(c => {
    card = c;
    HF.applyTheme(document.documentElement, HF.occasion(card.occasion));
    view = 'envelope';
    draw();
  })
  .catch(() => { view = 'missing'; draw(); });
