import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bmmflgbdiudhufdesxos.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbWZsZ2JkaXVkaHVmZGVzeG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTgzOTIsImV4cCI6MjA5NTI5NDM5Mn0.7jdqPuBk3jWVHXx3pR1mtBf5RH1rBRdWPANAFlZUdt8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OUT = path.resolve('dist');
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT + '/images', { recursive: true });
await fs.mkdir(OUT + '/category', { recursive: true });
await fs.mkdir(OUT + '/page', { recursive: true });

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const [categoriesResult, artworksResult, pagesResult, lessonsResult] = await Promise.all([
  supabase.from('categories').select('*').order('type').order('sort_order'),
  supabase.from('artworks').select('*').order('sort_order').order('created_at'),
  supabase.from('pages').select('*').order('section').order('sort_order'),
  supabase.from('schedule_lessons').select('*').order('day_of_week').order('start_time'),
]);

for (const [name, result] of [
  ['categories', categoriesResult],
  ['artworks', artworksResult],
  ['pages', pagesResult],
  ['schedule_lessons', lessonsResult],
]) {
  if (result.error) {
    throw new Error(`Supabase query failed for ${name}: ${result.error.message}`);
  }
}

const categories = categoriesResult.data ?? [];
const artworks = artworksResult.data ?? [];
const pages = pagesResult.data ?? [];
const lessons = lessonsResult.data ?? [];

// download images
const imgMap = new Map();
for (const a of artworks) {
  if (!a.image_path || imgMap.has(a.image_path)) continue;
  const url = supabase.storage.from('artworks').getPublicUrl(a.image_path).data.publicUrl;
  const safe = a.image_path.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = `images/${safe}`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn('skip', a.image_path, res.status); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path.join(OUT, dest), buf);
    imgMap.set(a.image_path, dest);
  } catch (e) { console.warn('err', a.image_path, e.message); }
}
console.log(`downloaded ${imgMap.size} images`);

const ringid = pages.filter(p => p.section === 'ringid');
const opetajad = pages.filter(p => p.section === 'opetajad');
const pohikursus = pages.find(p => p.section === 'pohikursus');

function header(rel = '') {
  const link = (h, t) => `<a href="${rel}${h}">${esc(t)}</a>`;
  const dd = (label, items) => `<details class="dd"><summary>${label}</summary><ul>${items.map(p => `<li>${link(`page/${p.slug}.html`, p.title)}</li>`).join('')}</ul></details>`;
  return `<header class="site"><div class="wrap">
    <a class="brand" href="${rel}index.html">Kunstikooli galerii</a>
    <nav>
      ${dd('Ringid ▾', ringid)}
      ${dd('Õpetajad ▾', opetajad)}
      ${pohikursus ? link(`page/${pohikursus.slug}.html`, 'Põhikursus') : ''}
      ${link('tunniplaan.html', 'Tunniplaan')}
    </nav>
  </div></header>`;
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fafaf7;color:#1a1a1a;line-height:1.5}
.serif{font-family:Georgia,"Times New Roman",serif}
h1,h2,h3{font-family:Georgia,"Times New Roman",serif;font-weight:600;margin:0 0 .5em}
h1{font-size:2.5rem}h2{font-size:2rem}
a{color:inherit;text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 1rem}
header.site{position:sticky;top:0;z-index:50;background:rgba(250,250,247,.92);backdrop-filter:blur(8px);border-bottom:1px solid #e5e5e0}
header.site .wrap{display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem}
.brand{font-family:Georgia,serif;font-size:1.4rem;font-weight:600}
nav{display:flex;gap:.5rem;align-items:center;font-size:.9rem}
nav a,nav summary{padding:.4rem .6rem;border-radius:6px;cursor:pointer}
nav a:hover,nav summary:hover{background:#eee}
.dd{position:relative}
.dd summary{list-style:none}.dd summary::-webkit-details-marker{display:none}
.dd ul{position:absolute;right:0;top:100%;background:#fff;border:1px solid #e5e5e0;border-radius:8px;list-style:none;padding:.4rem;margin:.25rem 0 0;min-width:200px;box-shadow:0 4px 12px rgba(0,0,0,.08);z-index:60}
.dd li a{display:block;padding:.4rem .6rem;border-radius:4px}
.dd li a:hover{background:#f0f0eb}
main{padding:2rem 0}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem;margin-bottom:3rem}
.cat-tile{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#ddd}
.cat-tile img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.cat-tile:hover img{transform:scale(1.05)}
.cat-tile .lbl{position:absolute;inset:auto 0 0 0;padding:.75rem;color:#fff;font-family:Georgia,serif;font-size:1.15rem;background:linear-gradient(to top,rgba(0,0,0,.85),transparent)}
.hero{background:#111;color:#fff;padding:3rem 0;text-align:center}
.hero img{max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:4px}
.hero .meta{margin-top:1rem;color:#bbb;font-size:.9rem}
.artworks{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:2rem;padding:2rem 0}
.artworks article img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;background:#eee}
.artworks dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem 1rem;font-size:.9rem;margin-top:.75rem}
.artworks dt{color:#777}
.prose{max-width:720px;margin:0 auto;white-space:pre-wrap;font-size:1.1rem;line-height:1.7}
table.schedule{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:1.5rem}
table.schedule th,table.schedule td{border:1px solid #e5e5e0;padding:.6rem;text-align:left;vertical-align:top}
table.schedule th{background:#f0f0eb}
table.schedule td .l{margin-bottom:.4rem}
table.schedule td .t{font-weight:600}
table.schedule td small{color:#777}
footer{margin-top:4rem;border-top:1px solid #e5e5e0;background:#f3f3ee;padding:2.5rem 0 1rem;font-size:.9rem}
footer .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.5rem}
footer .grid div b{display:block;margin-bottom:.25rem}
footer .copy{text-align:center;color:#777;font-size:.8rem;margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e5e0}
.back{display:inline-block;color:#777;margin-bottom:1rem;font-size:.9rem}
.back:hover{color:#000}
@media(max-width:640px){h1{font-size:2rem}nav{gap:.1rem}.dd ul{right:auto;left:0}}
`;

function shell(title, body, rel = '') {
  return `<!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body>${header(rel)}<main>${body}</main>
<footer><div class="wrap"><div class="grid">
<div><b class="serif">Pärnu Kunstikool</b>Õpilastööde galerii</div>
<div><b>Aadress</b>Kerese 4, Pärnu<br>80010 Pärnumaa</div>
<div><b>Kontakt</b>Tel: 442 5240<br>E-post: kool@parnukunstikool.ee</div>
</div><div class="copy">© ${new Date().getFullYear()} Pärnu Kunstikool</div></div></footer>
</body></html>`;
}

const imgSrc = (p, rel='') => imgMap.has(p) ? `${rel}${imgMap.get(p)}` : '';

// Index
const featured = artworks.filter(a => a.featured);
const courses = categories.filter(c => c.type === 'course');
const circles = categories.filter(c => c.type === 'circle');
const previewByCat = new Map();
for (const a of artworks) if (!previewByCat.has(a.category_id)) previewByCat.set(a.category_id, a.image_path);

const heroHtml = featured.length ? `<section class="hero"><div class="wrap">
  ${featured.slice(0,1).map(a => `<img src="${imgSrc(a.image_path)}" alt="${esc(a.title)}"><div class="meta">${esc(a.title)} — ${esc(a.author_name)}${a.age?`, ${a.age} a.`:''}</div>`).join('')}
</div></section>` : '';

const catSection = (label, cats) => cats.length ? `<section><h2>${label}</h2><div class="cat-grid">${cats.map(c => {
  const p = previewByCat.get(c.id);
  return `<a class="cat-tile" href="category/${c.id}.html">${p?`<img src="${imgSrc(p)}" alt="${esc(c.name)}" loading="lazy">`:''}<div class="lbl">${esc(c.name)}</div></a>`;
}).join('')}</div></section>` : '';

await fs.writeFile(`${OUT}/index.html`, shell('Pärnu Kunstikool — õpilastööde galerii',
  heroHtml + `<div class="wrap">${catSection('Kursused', courses)}${catSection('Ringid', circles)}</div>`));

// Category pages
for (const c of categories) {
  const items = artworks.filter(a => a.category_id === c.id);
  const body = `<div class="wrap"><a class="back" href="../index.html">← Tagasi</a>
    <h1>${esc(c.name)}</h1><p style="color:#777">${items.length} tööd</p>
    <div class="artworks">${items.map(a => `<article>
      ${imgSrc(a.image_path) ? `<img src="../${imgSrc(a.image_path)}" alt="${esc(a.title || a.author_name)}" loading="lazy">` : ''}
      <h3 style="margin-top:.75rem">${esc(a.title || 'Pealkirjata')}</h3>
      <dl>
        ${a.author_name?`<dt>Autor</dt><dd>${esc(a.author_name)}${a.age?`, ${a.age} a.`:''}</dd>`:''}
        ${a.technique?`<dt>Tehnika</dt><dd>${esc(a.technique)}</dd>`:''}
        ${a.year?`<dt>Aasta</dt><dd>${a.year}</dd>`:''}
        ${a.teacher?`<dt>Juhendaja</dt><dd>${esc(a.teacher)}</dd>`:''}
      </dl></article>`).join('') || '<p style="color:#777">Selles kategoorias pole veel pilte.</p>'}</div></div>`;
  await fs.writeFile(`${OUT}/category/${c.id}.html`, shell(`${c.name} — Kunstikooli galerii`, body, '../'));
}

// Page pages
for (const p of pages) {
  const body = `<div class="wrap"><a class="back" href="../index.html">← Tagasi</a>
    <h1>${esc(p.title)}</h1><div class="prose">${esc(p.content)}</div></div>`;
  await fs.writeFile(`${OUT}/page/${p.slug}.html`, shell(`${p.title} — Kunstikooli galerii`, body, '../'));
}

// Tunniplaan
const DAY_NAMES = { 1:'E', 2:'T', 3:'K', 4:'N', 5:'R', 6:'L' };
const days = [1,2,3,4,5,6];
const slots = [...new Set(lessons.map(l => l.start_time))].sort();
const cell = l => `<div class="l"><div class="t">${esc(l.title)}</div><small>${l.start_time}–${l.end_time}${l.teacher?` · ${esc(l.teacher)}`:''}${l.room?` · ${esc(l.room)}`:''}</small></div>`;
const tableHtml = lessons.length === 0 ? '<p style="color:#777">Tunniplaan on veel täitmata.</p>' :
`<table class="schedule"><thead><tr><th>Algus</th>${days.map(d=>`<th>${DAY_NAMES[d]}</th>`).join('')}</tr></thead>
<tbody>${slots.map(s => `<tr><td><code>${s}</code></td>${days.map(d => {
  const m = lessons.filter(l => l.day_of_week===d && l.start_time===s);
  return `<td>${m.length ? m.map(cell).join('') : '<span style="color:#ccc">—</span>'}</td>`;
}).join('')}</tr>`).join('')}</tbody></table>`;
await fs.writeFile(`${OUT}/tunniplaan.html`, shell('Tunniplaan — Kunstikooli galerii',
  `<div class="wrap"><h1>Tunniplaan</h1><p style="color:#777">Tunnid algavad erinevatel aegadel.</p>${tableHtml}</div>`));

console.log('done');
