// Builds every banner, card, Movember post and icon from the avatars and tokens.
// Same inputs, same pixels: nothing here is drawn by hand.
//
//   cd brand/build && npm ci && npm run build
//
// Reads  ../avatars/transparent/<look>.png, ../tokens/tokens.json, ../logos/*.svg, ./fonts/*.ttf
// Writes ../banners/<look>-<theme>/, ../banners/movember/, ../movember-posts/, ../logos/*.png, ../tokens/swatches/
import { Resvg } from '@resvg/resvg-js';
import QRCode from 'qrcode';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND = join(HERE, '..');
const at = p => join(BRAND, p);

const tokens = JSON.parse(readFileSync(at('tokens/tokens.json'), 'utf8'));
const C = tokens.color;
const DONATE = tokens.person.links.movember;
const DONATE_LABEL = DONATE.replace(/^https:\/\//, '');
const YEAR = tokens.person.movemberYear;

const fonts = ['Inter-Regular', 'Inter-SemiBold', 'Inter-Bold', 'InstrumentSerif-Regular', 'InstrumentSerif-Italic', 'JetBrainsMono-Regular']
  .map(f => join(HERE, 'fonts', `${f}.ttf`));
const img = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;');

// One face, four everyday looks in the buttoned flannel, plus the Movember hoodie.
const LOOKS = ['stubble', 'clean', 'beard', 'moustache', 'movember'];
const avatar = look => at(`avatars/transparent/${look}.png`);
// Lift the hoodie a touch so the moustache on the chest isn't cut off by the bottom edge.
const LIFT = { movember: 0.045 };

const THEMES = {
  paper:    { bg: C.paper,        disc: C.paperRaised,    ink: C.ink,     muted: C.inkMuted,  handle: C.blue,       tagline: C.rust,       ring: C.ink },
  navy:     { bg: C.navy,         disc: C.navyRaised,     ink: C.paper,   muted: C.navyMuted, handle: C.blueOnDark, tagline: C.rustOnDark, ring: C.paper },
  movember: { bg: C.movemberNavy, disc: C.movemberRaised, ink: '#FFFFFF', muted: C.navyMuted, handle: C.blueOnDark, tagline: '#FFFFFF',   ring: '#FFFFFF' },
};
const COPY = {
  everyday: { kicker: `@${tokens.person.handle}`, lines: tokens.person.tagline },
  movember: { kicker: `@${tokens.person.handle} · Movember ${YEAR}`, lines: ['Growing a mo for Movember'], note: `Please give: ${DONATE_LABEL}` },
};

// tx/ty: text block anchor. ax/ah: avatar centre x and height. s: type scale. qr: Movember QR tile.
// LinkedIn and X/Bluesky put the profile photo over the bottom left, so the text starts further in there.
// The three wide banners show small on screen, so their handle, tagline and link get a few extra points.
const WIDE = { kick: 2, line: 5, note: 2 };
const SIZES = {
  'github-readme-1280x320': { w: 1280, h: 320, tx: 64,  ty: 160, ax: 1090, ah: 340, s: 1.0,  plus: WIDE, qr: { x: 742,  y: 86,  size: 132 } },
  'linkedin-1584x396':      { w: 1584, h: 396, tx: 520, ty: 185, ax: 1400, ah: 430, s: 1.2,  plus: WIDE, qr: { x: 1080, y: 110, size: 150 } },
  'social-header-1500x500': { w: 1500, h: 500, tx: 410, ty: 240, ax: 1330, ah: 470, s: 1.3,  plus: WIDE, qr: { x: 1000, y: 150, size: 170 } },
  'social-card-1200x630':   { w: 1200, h: 630, tx: 72,  ty: 250, ax: 960,  ah: 640, s: 1.35, qr: { x: 72,   y: 410, size: 150 } },
};

let QR;
async function qrPath() {
  const s = await QRCode.toString(DONATE, { type: 'svg', errorCorrectionLevel: 'M', margin: 0 });
  return { d: s.match(/<path stroke="#000000" d="([^"]+)"/)[1], n: +s.match(/viewBox="0 0 (\d+)/)[1] };
}
function qr(x, y, size, caption, captionColor, k) {
  const pad = size * 0.08, sc = (size - pad * 2) / QR.n;
  return `<g>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.06}" fill="${C.navyMuted}"/>
    <g transform="translate(${x + pad} ${y + pad}) scale(${sc})"><path d="${QR.d}" stroke="${C.movemberNavy}" fill="none" shape-rendering="crispEdges"/></g>
    ${caption ? `<text x="${x + size / 2}" y="${y + size + 18 * k}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${13 * k}" fill="${captionColor}">${esc(caption)}</text>` : ''}
  </g>`;
}

function banner(sz, theme, copyKey, look) {
  const t = THEMES[theme], c = COPY[copyKey], k = sz.s;
  const ah = Math.min(sz.ah, sz.h);
  const p = sz.plus ?? { kick: 0, line: 0, note: 0 };
  const kick = (15 + p.kick) * k, name = 64 * k, line = (24 + p.line) * k, gap = 8 * k, note = (17 + p.note) * k;
  const linesH = c.lines.length * line + (c.lines.length - 1) * gap;
  const blockH = kick + 14 * k + name + 16 * k + linesH + (c.note ? 12 * k + note : 0);
  const yKick = sz.ty - blockH / 2 + kick;
  const yName = yKick + 14 * k + name * 0.82;
  const yLine = i => yName + 18 * k + line + i * (line + gap);
  const yNote = yLine(c.lines.length - 1) + 12 * k + note;
  const rings = [0.55, 0.75, 0.95].map((r, i) =>
    `<circle cx="${sz.ax}" cy="${sz.h * 0.52}" r="${ah * r}" fill="none" stroke="${t.ring}" stroke-opacity="${0.06 - i * 0.012}" stroke-width="${2 * k}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sz.w}" height="${sz.h}" viewBox="0 0 ${sz.w} ${sz.h}">
  <rect width="100%" height="100%" fill="${t.bg}"/>
  ${rings}
  <circle cx="${sz.ax}" cy="${sz.h - ah * 0.42}" r="${ah * 0.40}" fill="${t.disc}"/>
  <image href="${img(avatar(look))}" x="${sz.ax - ah / 2}" y="${sz.h - ah * (0.94 + (LIFT[look] ?? 0))}" width="${ah}" height="${ah}"/>
  <text x="${sz.tx}" y="${yKick}" font-family="JetBrains Mono" font-size="${kick}" fill="${t.handle}" letter-spacing="${0.5 * k}">${esc(c.kicker)}</text>
  <text x="${sz.tx - 2 * k}" y="${yName}" font-family="Instrument Serif" font-size="${name}" fill="${t.ink}">${esc(tokens.person.name)}</text>
  ${c.lines.map((l, i) => `<text x="${sz.tx}" y="${yLine(i)}" font-family="Inter" font-weight="600" font-size="${line}" fill="${t.tagline}">${esc(l)}</text>`).join('\n  ')}
  ${c.note ? `<text x="${sz.tx}" y="${yNote}" font-family="Inter" font-size="${note}" fill="${t.muted}">${esc(c.note)}</text>` : ''}
  ${copyKey === 'movember' ? qr(sz.qr.x, sz.qr.y, sz.qr.size, 'Scan to give', t.ink, k) : ''}
</svg>`;
}

// A plain handlebar moustache drawn for these posts (not the Movember logo).
const MO = (x, y, w, fill) => `<g transform="translate(${x} ${y}) scale(${w / 200})"><path fill="${fill}" d="M100 34 C88 12 62 6 44 18 C30 27 22 40 6 38 C-2 37 -4 30 2 26 C-6 40 6 58 30 58 C56 58 78 46 100 40 C122 46 144 58 170 58 C194 58 206 40 198 26 C204 30 202 37 194 38 C178 40 170 27 156 18 C138 6 112 12 100 34 Z"/></g>`;

// Movember posts for Facebook and Instagram: no cartoon, just the ask and the QR code.
const POSTS = {
  'instagram-post-1080x1080':  { w: 1080, h: 1080 },
  'instagram-story-1080x1920': { w: 1080, h: 1920 },
  'facebook-post-1200x630':    { w: 1200, h: 630 },
  'facebook-cover-1640x624':   { w: 1640, h: 624 },
};
function post(key, p) {
  const t = THEMES.movember, W = p.w, H = p.h, sign = `@${tokens.person.handle} · Movember ${YEAR}`;
  if (W / H > 1.6) {
    // text left, QR right; the Facebook cover keeps everything inside the middle 1160px, which phones show
    const cover = key.startsWith('facebook-cover'), k = cover ? 1.05 : 1.0, x0 = cover ? 240 : 72;
    const qs = 230 * k, qx = cover ? W - 240 - qs : W - 72 - qs, qy = H / 2 - qs / 2 - 12 * k;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="100%" height="100%" fill="${t.bg}"/>
    ${[0.35, 0.55, 0.75].map((r, i) => `<circle cx="${qx + qs / 2}" cy="${H / 2}" r="${H * r * 1.4}" fill="none" stroke="#fff" stroke-opacity="${0.06 - i * 0.015}" stroke-width="2"/>`).join('')}
    ${MO(x0, H / 2 - 150 * k, 150 * k, t.handle)}
    <text x="${x0}" y="${H / 2 - 30 * k}" font-family="Instrument Serif" font-size="${78 * k}" fill="${t.ink}">I'm growing a mo</text>
    <text x="${x0}" y="${H / 2 + 50 * k}" font-family="Instrument Serif" font-style="italic" font-size="${78 * k}" fill="${t.handle}">for Movember.</text>
    <text x="${x0}" y="${H / 2 + 105 * k}" font-family="Inter" font-size="${24 * k}" fill="${t.muted}">Help change the face of men's health.</text>
    <text x="${x0}" y="${H / 2 + 150 * k}" font-family="Inter" font-weight="600" font-size="${24 * k}" fill="${t.ink}">Please give: ${esc(DONATE_LABEL)}</text>
    ${qr(qx, qy, qs, 'Scan to give', t.ink, 1.4 * k)}
    <text x="${x0}" y="${H - 40}" font-family="JetBrains Mono" font-size="${18 * k}" fill="${t.handle}">${esc(sign)}</text>
  </svg>`;
  }
  // square and story: stacked and centred
  const tall = H > W * 1.2, cx = W / 2, k = 1.25;
  const yMo = tall ? 360 : 120, yT = tall ? 640 : 330, qs = tall ? 420 : 300, qy = tall ? 1080 : 600;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="${t.bg}"/>
  ${[0.3, 0.45, 0.6].map((r, i) => `<circle cx="${cx}" cy="${qy + qs / 2}" r="${W * r * 1.3}" fill="none" stroke="#fff" stroke-opacity="${0.06 - i * 0.015}" stroke-width="2"/>`).join('')}
  ${MO(cx - 130, yMo, 260, t.handle)}
  <text x="${cx}" y="${yT}" text-anchor="middle" font-family="Instrument Serif" font-size="${84 * k}" fill="${t.ink}">I'm growing a mo</text>
  <text x="${cx}" y="${yT + 100 * k}" text-anchor="middle" font-family="Instrument Serif" font-style="italic" font-size="${84 * k}" fill="${t.handle}">for Movember.</text>
  <text x="${cx}" y="${yT + 160 * k}" text-anchor="middle" font-family="Inter" font-size="${26 * k}" fill="${t.muted}">Help change the face of men's health.</text>
  ${qr(cx - qs / 2, qy, qs, '', t.ink, k)}
  <text x="${cx}" y="${qy + qs + 56 * k}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${26 * k}" fill="${t.ink}">Scan to give · ${esc(DONATE_LABEL)}</text>
  <text x="${cx}" y="${H - (tall ? 140 : 48)}" text-anchor="middle" font-family="JetBrains Mono" font-size="${20 * k}" fill="${t.handle}">${esc(sign)}</text>
</svg>`;
}

const render = (svg, file, width) => writeFileSync(file, new Resvg(svg, {
  font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
}).render().asPng());
const fresh = dir => { rmSync(at(dir), { recursive: true, force: true }); mkdirSync(at(dir), { recursive: true }); };

QR = await qrPath();

fresh('banners');
for (const look of LOOKS.filter(l => l !== 'movember')) for (const theme of ['paper', 'navy']) {
  const dir = `banners/${look}-${theme}`; mkdirSync(at(dir));
  for (const [key, sz] of Object.entries(SIZES)) render(banner(sz, theme, 'everyday', look), at(`${dir}/${look}-${theme}-${key}.png`));
}
mkdirSync(at('banners/movember'));
for (const [key, sz] of Object.entries(SIZES)) render(banner(sz, 'movember', 'movember', 'movember'), at(`banners/movember/movember-${key}.png`));

fresh('movember-posts');
for (const [key, p] of Object.entries(POSTS)) render(post(key, p), at(`movember-posts/movember-${key}.png`));
const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${QR.n + 8} ${QR.n + 8}"><rect width="100%" height="100%" fill="#FFFFFF"/><path transform="translate(4 4)" d="${QR.d}" stroke="${C.movemberNavy}" fill="none" shape-rendering="crispEdges"/></svg>\n`;
writeFileSync(at('movember-posts/movember-donate-qr.svg'), qrSvg);
render(qrSvg, at('movember-posts/movember-donate-qr.png'), 1024);

// Little colour swatches for the README, so it doesn't lean on an outside image service.
fresh('tokens/swatches');
for (const [name, hex] of Object.entries(C)) {
  writeFileSync(at(`tokens/swatches/${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="0.5" y="0.5" width="23" height="23" rx="5" fill="${hex}" stroke="#00000022"/></svg>\n`);
}

const favicon = readFileSync(at('logos/favicon.svg'), 'utf8');
for (const [size, file] of [[512, 'icon-512.png'], [180, 'apple-touch-icon.png'], [32, 'favicon-32.png']]) render(favicon, at(`logos/${file}`), size);

console.log('built');
