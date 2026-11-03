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

const fonts = ['Inter-Regular', 'Inter-SemiBold', 'Inter-Bold', 'InstrumentSerif-Regular', 'InstrumentSerif-Italic', 'JetBrainsMono-Regular', 'JetBrainsMono-SemiBold']
  .map(f => join(HERE, 'fonts', `${f}.ttf`));
const fontOpts = { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Inter' };
const img = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;');

// How wide a line of Inter SemiBold really is, measured by the same renderer that draws it.
const measured = new Map();
function inkRight(text, size) {
  const key = `${size}|${text}`;
  if (!measured.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400"><text x="0" y="200" font-family="Inter" font-weight="600" font-size="${size}">${esc(text)}</text></svg>`;
    const box = new Resvg(svg, { font: fontOpts }).getBBox();
    measured.set(key, box.x + box.width);
  }
  return measured.get(key);
}

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

// The tagline as two lines of three (wide banners) or three lines of two (the taller X header and link card).
const WORDS = tokens.person.tagline.join(' · ').split(' · ');
const TAGLINE = {
  two: tokens.person.tagline,
  three: [0, 2, 4].map(i => WORDS.slice(i, i + 2).join(' · ')),
};
const HANDLE = `@${tokens.person.handle}`;
const SIGN = `${HANDLE} · Movember ${YEAR}`;

// Type is sized for the screen, not the file. `shown` is roughly how wide each site displays the banner on a
// desktop, and the build stops if any text would land under these sizes (in on-screen pixels) at that width.
const TARGET = { name: 36, tagline: 16, small: 12 };
// x/cy (or top): text block anchor. ax/ah: avatar centre x and height. chip/name/line: font sizes in file pixels.
// LinkedIn and X/Bluesky put the profile photo over the bottom left, so the text starts further in there.
// Movember: the ask is blue; no QR on the README (the whole banner is the link), elsewhere the QR sits 48px from the words.
const SIZES = {
  'github-readme-1280x320': { w: 1280, h: 320, shown: 840, x: 64, cy: 160, ax: 1090, ah: 340, chip: 20, name: 64, tagline: 'two', line: 29,
    movember: { head: [29], ask: [27] } },
  'linkedin-1584x396': { w: 1584, h: 396, shown: 800, x: 520, cy: 192, ax: 1400, ah: 430, chip: 26, name: 80, tagline: 'two', line: 35,
    movember: { x: 500, head: [35], ask: [30, 'split'], qr: { mode: 'right', size: 140 } } },
  'social-header-1500x500': { w: 1500, h: 500, shown: 600, x: 410, cy: 252, ax: 1330, ah: 470, chip: 32, name: 100, tagline: 'three', line: 40,
    movember: { ax: 1345, head: [40, 'split'], ask: [32, 'split'], qr: { mode: 'right', size: 150 } } },
  'social-card-1200x630': { w: 1200, h: 630, shown: 500, x: 72, top: 87, ax: 985, ah: 600, chip: 31, name: 112, tagline: 'three', line: 40, site: 31,
    movember: { head: [40], ask: [29], qr: { mode: 'below', size: 130 } } },
};
const QR_GAP = 48;

let QR;
async function qrPath() {
  const s = await QRCode.toString(DONATE, { type: 'svg', errorCorrectionLevel: 'M', margin: 0 });
  return { d: s.match(/<path stroke="#000000" d="([^"]+)"/)[1], n: +s.match(/viewBox="0 0 (\d+)/)[1] };
}
function qr(x, y, size, caption, captionColor, captionSize) {
  const pad = size * 0.08, sc = (size - pad * 2) / QR.n;
  return `<g>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.06}" fill="${C.navyMuted}"/>
    <g transform="translate(${x + pad} ${y + pad}) scale(${sc})"><path d="${QR.d}" stroke="${C.movemberNavy}" fill="none" shape-rendering="crispEdges"/></g>
    ${caption ? `<text x="${x + size / 2}" y="${y + size + captionSize * 1.35}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${captionSize}" fill="${captionColor}">${esc(caption)}</text>` : ''}
  </g>`;
}

// The handle chip: JetBrains Mono SemiBold (every character 0.6em wide) on a soft tint of the handle blue.
function chip(x, top, size, text, t, anchor = 'start') {
  const h = size * 1.7, pad = size * 0.65, w = text.length * size * 0.6 + pad * 2;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return { w, h, svg: `<rect x="${x0}" y="${top}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.handle}" fill-opacity="0.14"/>
  <text x="${x0 + pad}" y="${top + h * 0.68}" font-family="JetBrains Mono" font-weight="600" font-size="${size}" fill="${t.handle}">${esc(text)}</text>` };
}

function checkSizes(name, sz, items) {
  const k = sz.shown / sz.w;
  for (const [what, size, min] of items) {
    const onScreen = size * k;
    if (onScreen < min) throw new Error(`${name}: ${what} would be ${onScreen.toFixed(1)}px on screen, under the ${min}px target`);
  }
}

function banner(name, sz, theme, look) {
  const t = THEMES[theme], mo = theme === 'movember' ? sz.movember : null;
  const x = mo?.x ?? sz.x, ax = mo?.ax ?? sz.ax, ah = Math.min(sz.ah, sz.h);
  const say = (size, color, role, text) => ({ text, size, color, role });
  let lines;
  if (mo) {
    const [hs, hsplit] = mo.head, [as, asplit] = mo.ask;
    const head = hsplit ? ['Growing a mo', 'for Movember'] : ['Growing a mo for Movember'];
    const ask = asplit ? ['Please give:', DONATE_LABEL] : [`Please give: ${DONATE_LABEL}`];
    lines = [...head.map(l => say(hs, t.ink, 'tagline', l)), ...ask.map(l => say(as, t.handle, 'small', l))];
    lines[head.length].drop = hs * 0.25; // the ask sits a touch below the headline
  } else {
    lines = TAGLINE[sz.tagline].map(l => say(sz.line, t.tagline, 'tagline', l));
  }
  checkSizes(`${name} (${theme})`, sz, [['name', sz.name, TARGET.name], ['handle', sz.chip, TARGET.small],
    ...lines.map(l => [`"${l.text}"`, l.size, TARGET[l.role]]), ...(sz.site && !mo ? [['site', sz.site, TARGET.small]] : [])]);

  // Stack: chip, name, lines; then the QR below them on the card.
  const chipH = sz.chip * 1.7, gap = l => l.size * 0.3 + (l.drop ?? 0);
  const linesH = lines.reduce((a, l, i) => a + l.size + (i ? gap(l) : 0), 0);
  const blockH = chipH + sz.name * 1.12 + lines[0].size * 0.7 + linesH;
  const top = sz.top ?? sz.cy - blockH / 2;
  const yName = top + chipH + sz.name * 1.04;
  let y = yName + lines[0].size * 0.7;
  for (const [i, l] of lines.entries()) { y += (i ? gap(l) : 0) + l.size; l.y = y; }

  let code = '';
  if (mo?.qr) {
    const { mode, size } = mo.qr;
    if (mode === 'right') {
      const right = Math.max(...lines.map(l => x + inkRight(l.text, l.size)));
      const yTop = lines[0].y - lines[0].size * 0.75, yBottom = lines.at(-1).y + lines.at(-1).size * 0.22;
      const qx = right + QR_GAP, qy = (yTop + yBottom) / 2 - size * 0.58;
      if (qx + size > ax - ah * 0.40) throw new Error(`${name}: the QR code runs into the avatar`);
      code = qr(qx, qy, size, 'Scan to give', t.ink, size * 0.13);
    } else {
      const qy = lines.at(-1).y + lines.at(-1).size * 0.22 + QR_GAP;
      if (qy + size > sz.h - 40) throw new Error(`${name}: the QR code runs off the bottom`);
      code = qr(x, qy, size, '', t.ink, 0) +
        `<text x="${x + size + 28}" y="${qy + size / 2 + 10}" font-family="Inter" font-weight="600" font-size="${sz.site}" fill="${t.ink}">Scan to give</text>`;
    }
  }
  const rings = [0.55, 0.75, 0.95].map((r, i) =>
    `<circle cx="${ax}" cy="${sz.h * 0.52}" r="${ah * r}" fill="none" stroke="${t.ring}" stroke-opacity="${0.10 - i * 0.02}" stroke-width="${Math.max(2, sz.w / 500)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sz.w}" height="${sz.h}" viewBox="0 0 ${sz.w} ${sz.h}">
  <rect width="100%" height="100%" fill="${t.bg}"/>
  ${rings}
  <circle cx="${ax}" cy="${sz.h - ah * 0.42}" r="${ah * 0.40}" fill="${t.disc}"/>
  <image href="${img(avatar(look))}" x="${ax - ah / 2}" y="${sz.h - ah * (0.94 + (LIFT[look] ?? 0))}" width="${ah}" height="${ah}"/>
  ${chip(x, top, sz.chip, mo ? SIGN : HANDLE, t).svg}
  <text x="${x - sz.name * 0.03}" y="${yName}" font-family="Instrument Serif" font-size="${sz.name}" fill="${t.ink}">${esc(tokens.person.name)}</text>
  ${lines.map(l => `<text x="${x}" y="${l.y}" font-family="Inter" font-weight="600" font-size="${l.size}" fill="${l.color}">${esc(l.text)}</text>`).join('\n  ')}
  ${sz.site && !mo ? `<rect x="${x}" y="${sz.h - 100}" width="56" height="3" rx="1.5" fill="${t.tagline}"/>
  <text x="${x}" y="${sz.h - 54}" font-family="JetBrains Mono" font-size="${sz.site}" fill="${t.muted}">${esc(tokens.person.links.site.replace(/^https:\/\//, ''))}</text>` : ''}
  ${code}
</svg>`;
}

// A plain handlebar moustache drawn for these posts (not the Movember logo).
const MO = (x, y, w, fill) => `<g transform="translate(${x} ${y}) scale(${w / 200})"><path fill="${fill}" d="M100 34 C88 12 62 6 44 18 C30 27 22 40 6 38 C-2 37 -4 30 2 26 C-6 40 6 58 30 58 C56 58 78 46 100 40 C122 46 144 58 170 58 C194 58 206 40 198 26 C204 30 202 37 194 38 C178 40 170 27 156 18 C138 6 112 12 100 34 Z"/></g>`;

// Movember posts for Facebook and Instagram: no cartoon, just the ask and the QR code.
// Each keeps clear of its platform's overlays: the Instagram story's reply bar (bottom ~250px), the Facebook
// cover's profile photo (bottom left) and the sides phones crop off the cover (outside the middle 1160px).
const POSTS = {
  'instagram-post-1080x1080':  { w: 1080, h: 1080 },
  'instagram-story-1080x1920': { w: 1080, h: 1920 },
  'facebook-post-1200x630':    { w: 1200, h: 630 },
  'facebook-cover-1640x624':   { w: 1640, h: 624 },
};
function post(key, p) {
  const t = THEMES.movember, W = p.w, H = p.h;
  const ringsAt = (cx, cy, rs) => rs.map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.10 - i * 0.02}" stroke-width="2"/>`).join('');
  if (W / H > 1.6) {
    // text left, QR right
    const cover = key.startsWith('facebook-cover'), k = cover ? 1.05 : 1.0, x0 = cover ? 240 : 72, body = (cover ? 30 : 24) * k;
    const qs = 230 * k, qx = cover ? W - 240 - qs : W - 72 - qs, qy = H / 2 - qs / 2 - 30;
    const sign = cover ? chip(W - 240, 512, 24, SIGN, t, 'end') : chip(x0, H - 74, 20, SIGN, t);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="100%" height="100%" fill="${t.bg}"/>
    ${ringsAt(qx + qs / 2, H / 2, [0.35, 0.55, 0.75].map(r => H * r * 1.4))}
    ${MO(x0, H / 2 - 160 * k, 150 * k, t.handle)}
    <text x="${x0}" y="${H / 2 - 40 * k}" font-family="Instrument Serif" font-size="${78 * k}" fill="${t.ink}">I'm growing a mo</text>
    <text x="${x0}" y="${H / 2 + 40 * k}" font-family="Instrument Serif" font-style="italic" font-size="${78 * k}" fill="${t.handle}">for Movember.</text>
    <text x="${x0}" y="${H / 2 + 60 * k + body * 1.33}" font-family="Inter" font-size="${body}" fill="${t.muted}">Help change the face of men's health.</text>
    <text x="${x0}" y="${H / 2 + 60 * k + body * 3}" font-family="Inter" font-weight="600" font-size="${body}" fill="${t.handle}">Please give: ${esc(DONATE_LABEL)}</text>
    ${qr(qx, qy, qs, 'Scan to give', t.ink, 24)}
    ${sign.svg}
  </svg>`;
  }
  // square and story: stacked and centred; the story sits higher so its footer clears the reply bar
  const tall = H > W * 1.2, cx = W / 2, k = 1.25;
  const yMo = tall ? 320 : 120, yT = tall ? 600 : 330, qs = tall ? 420 : 300, qy = tall ? 1040 : 600;
  const sign = chip(cx, tall ? 1580 : H - 80, tall ? 28 : 26, SIGN, t, 'middle');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="${t.bg}"/>
  ${ringsAt(cx, qy + qs / 2, [0.3, 0.45, 0.6].map(r => W * r * 1.3))}
  ${MO(cx - 130, yMo, 260, t.handle)}
  <text x="${cx}" y="${yT}" text-anchor="middle" font-family="Instrument Serif" font-size="${84 * k}" fill="${t.ink}">I'm growing a mo</text>
  <text x="${cx}" y="${yT + 100 * k}" text-anchor="middle" font-family="Instrument Serif" font-style="italic" font-size="${84 * k}" fill="${t.handle}">for Movember.</text>
  <text x="${cx}" y="${yT + 160 * k}" text-anchor="middle" font-family="Inter" font-size="${26 * k}" fill="${t.muted}">Help change the face of men's health.</text>
  ${qr(cx - qs / 2, qy, qs, '', t.ink, 0)}
  <text x="${cx}" y="${qy + qs + 56 * k}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${26 * k}" fill="${t.handle}">Scan to give · ${esc(DONATE_LABEL)}</text>
  ${sign.svg}
</svg>`;
}

const render = (svg, file, width) => writeFileSync(file, new Resvg(svg, {
  font: fontOpts,
  fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
}).render().asPng());
const fresh = dir => { rmSync(at(dir), { recursive: true, force: true }); mkdirSync(at(dir), { recursive: true }); };

QR = await qrPath();

fresh('banners');
for (const look of LOOKS.filter(l => l !== 'movember')) for (const theme of ['paper', 'navy']) {
  const dir = `banners/${look}-${theme}`; mkdirSync(at(dir));
  for (const [key, sz] of Object.entries(SIZES)) render(banner(key, sz, theme, look), at(`${dir}/${look}-${theme}-${key}.png`));
}
mkdirSync(at('banners/movember'));
for (const [key, sz] of Object.entries(SIZES)) render(banner(key, sz, 'movember', 'movember'), at(`banners/movember/movember-${key}.png`));

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
