"""Draw the SW monogram with the letters as outlines, so it looks the same everywhere (no font needed).

    pip install fonttools
    python3 brand/build/logos.py

build.mjs renders the PNG icons from these SVGs.
"""
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

BRAND = Path(__file__).resolve().parent.parent
FONT = BRAND / 'build/fonts/InstrumentSerif-Regular.ttf'
OUT = BRAND / 'logos'
THEMES = {
    'light': {'bg': '#F8F7F4', 'ink': '#181816', 'dot': '#3F6E9C'},
    'dark': {'bg': '#1A2238', 'ink': '#F8F7F4', 'dot': '#7CA9D4'},
}


def letters(text: str, size: float):
    """Return an SVG path for the text at the given font size, plus its bounds."""
    font = TTFont(FONT)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    scale = size / font['head'].unitsPerEm
    pen, bounds = SVGPathPen(glyphs, ntos=lambda n: f'{n:.1f}'.rstrip('0').rstrip('.')), BoundsPen(glyphs)
    x = 0
    for ch in text:
        name = cmap[ord(ch)]
        # flip y (fonts draw upwards) and advance along the baseline
        transform = (scale, 0, 0, -scale, x, 0)
        glyphs[name].draw(TransformPen(pen, transform))
        glyphs[name].draw(TransformPen(bounds, transform))
        x += glyphs[name].width * scale
    return pen.getCommands(), bounds.bounds


def monogram(theme: dict) -> str:
    path, (x0, y0, x1, y1) = letters('SW', 340)
    dot_r = 21
    width = (x1 - x0) + 4 + dot_r * 2
    dx = 256 - width / 2 - x0
    dy = 256 - (y0 + y1) / 2
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Stephen Walsh</title>
  <rect width="512" height="512" rx="96" fill="{theme['bg']}"/>
  <path transform="translate({dx:.1f} {dy:.1f})" fill="{theme['ink']}" d="{path}"/>
  <circle cx="{dx + x1 + 4 + dot_r:.1f}" cy="{dy + y1 - dot_r:.1f}" r="{dot_r}" fill="{theme['dot']}"/>
</svg>
'''


def main():
    OUT.mkdir(exist_ok=True)
    for name, theme in THEMES.items():
        (OUT / f'sw-monogram-{name}.svg').write_text(monogram(theme))
    (OUT / 'favicon.svg').write_text(monogram(THEMES['dark']))
    print('logos built')


if __name__ == '__main__':
    main()
