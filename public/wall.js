i18n.apply();
const t = k => i18n.t(k);
let all = [], filter = 'all', loaded = false;
const filters = document.getElementById('filters');
const wall = document.getElementById('wall');

function drawFilters() {
  // Only offer occasions that actually have cards
  const used = new Set(all.map(c => c.occasion));
  const opts = [{ id: 'all', label: t('wall.all') }, ...HF.occasions.filter(o => used.has(o.id)).map(o => ({ id: o.id, label: HF.occLabel(o.id) }))];
  filters.hidden = opts.length < 3;
  filters.innerHTML = opts.map(o => `<button type="button" data-id="${o.id}" aria-pressed="${o.id === filter}">${HF.esc(o.label)}</button>`).join('');
}
filters.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  filter = b.dataset.id;
  filters.querySelectorAll('button').forEach(c => c.setAttribute('aria-pressed', c === b));
  draw();
});

function draw() {
  if (!loaded) return;
  const list = filter === 'all' ? all : all.filter(c => c.occasion === filter);
  wall.innerHTML = list.length ? list.map(c => {
    const occ = HF.occasion(c.occasion);
    return `<a href="/c/${encodeURIComponent(c.id)}" data-occ="${occ.id}">${HF.renderCard(c, { compact: true })}</a>`;
  }).join('') : `<div class="empty"><p>${HF.esc(t('wall.empty'))}</p><a class="btn primary" href="/">${HF.esc(t('wall.beFirst'))}</a></div>`;
  // Colours go through the CSSOM: the CSP blocks inline style attributes
  wall.querySelectorAll('a[data-occ]').forEach(a => HF.applyTheme(a, HF.occasion(a.dataset.occ)));
}

i18n.onChange(() => { drawFilters(); draw(); });
fetch('/api/wall').then(r => r.json()).then(list => { all = list; loaded = true; drawFilters(); draw(); });
