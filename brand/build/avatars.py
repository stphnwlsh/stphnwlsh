"""Turn the source avatars into transparent cut-outs and ready-to-upload profile pictures.

    pip install pillow numpy opencv-python-headless
    python3 brand/build/avatars.py

Reads   brand/avatars/source/<look>.png      (1024x1024, flat paper background)
Writes  brand/avatars/transparent/<look>.png (1024x1024, background removed)
        brand/avatars/profile/<look>-<theme>-<size>.png
        brand/avatars/webp/<look>-<theme>-<size>.webp
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

BRAND = Path(__file__).resolve().parent.parent
SOURCE, TRANSPARENT = BRAND / 'avatars/source', BRAND / 'avatars/transparent'
PROFILE, WEBP = BRAND / 'avatars/profile', BRAND / 'avatars/webp'
LOOKS = ['stubble', 'clean', 'beard', 'moustache', 'movember']
THEMES = {'paper': '#F8F7F4', 'navy': '#1A2238'}
SIZES = [512, 128]


def cutout(src: Path, dst: Path, tol=30, ring=3, soft=110):
    """Flood the background in from the edges, then give the figure a soft, halo-free edge."""
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.int32)
    bg = np.median(np.concatenate([a[0], a[:, 0], a[:, -1]]), 0)
    dist = np.abs(a - bg).sum(-1)
    _, lab = cv2.connectedComponents((dist < tol).astype(np.uint8), connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(border))
    edge = (cv2.dilate(bgmask.astype(np.uint8), np.ones((2 * ring + 1,) * 2, np.uint8)) > 0) & ~bgmask
    alpha = np.where(bgmask, 0.0, 1.0)
    alpha[edge] = np.clip((dist[edge] - tol) / soft, 0, 1)
    # pull the edge in by a pixel to drop the paper-coloured fringe, then soften it
    alpha = cv2.erode(alpha.astype(np.float32), np.ones((3, 3), np.uint8))
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.6).astype(np.float64)
    # un-mix the paper from semi-transparent edge pixels so nothing glows on dark backgrounds
    al = alpha[..., None]
    rgb = np.where(al > 0.02, (a - bg * (1 - al)) / np.maximum(al, 0.02), a)
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8), 'RGBA').save(dst, optimize=True)


def main():
    for d in (TRANSPARENT, PROFILE, WEBP):
        d.mkdir(parents=True, exist_ok=True)
    for look in LOOKS:
        cut = TRANSPARENT / f'{look}.png'
        cutout(SOURCE / f'{look}.png', cut)
        figure = Image.open(cut)
        for theme, colour in THEMES.items():
            square = Image.new('RGBA', figure.size, colour)
            square.alpha_composite(figure)
            square = square.convert('RGB')
            for size in SIZES:
                small = square.resize((size, size), Image.LANCZOS)
                small.save(PROFILE / f'{look}-{theme}-{size}.png', optimize=True)
            for size in (1024, 400):
                square.resize((size, size), Image.LANCZOS).save(WEBP / f'{look}-{theme}-{size}.webp', quality=90, method=6)
    print('avatars built')


if __name__ == '__main__':
    main()
