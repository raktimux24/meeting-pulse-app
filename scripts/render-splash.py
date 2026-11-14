"""Render the splash images from the app's background (src/components/atmosphere.tsx).

Outputs, at 3x for a 440 x 956 pt screen:
  assets/images/splash-background.png  the background only (used by AnimatedSplash)
  assets/images/splash-screen.png      background plus the pulse mark (the native iOS splash)

The pulse mark itself comes from assets/images/splash-mark.png (140 pt). Re-run after changing
colours in src/theme/tokens.ts or the layout in atmosphere.tsx:

  python3 scripts/render-splash.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
W_PT, H_PT, SCALE = 440, 956, 3
MARK_PT = 140
W, H = W_PT * SCALE, H_PT * SCALE


def hex_rgb(value):
    value = value.lstrip('#')
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255


PAPER = hex_rgb('#070A12')
ORANGE = hex_rgb('#FF7958')
NAVY = hex_rgb('#7CA5FF')
AMBER = hex_rgb('#FFD166')
WHITE = np.ones(3)

# Pixel centres in points.
ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
xs = (xs + 0.5) / SCALE
ys = (ys + 0.5) / SCALE
img = np.zeros((H, W, 3))


def over(color, alpha):
    """Paint `color` with per-pixel `alpha` over the image."""
    global img
    a = np.clip(alpha, 0, 1)[..., None]
    img = img * (1 - a) + color * a


def interp(t, stops):
    """Piecewise-linear lookup of (offset, value) stops."""
    offsets = [o for o, _ in stops]
    if np.ndim(stops[0][1]) == 0:
        return np.interp(t, offsets, [v for _, v in stops])
    return np.stack([np.interp(t, offsets, [v[c] for _, v in stops]) for c in range(3)], axis=-1)


# 1. Screen gradient, top to bottom.
img = interp(ys / H_PT, [(0, hex_rgb('#060910')), (0.42, hex_rgb('#0A1220')), (1, hex_rgb('#101A2C'))])


# 2. Radial glows (Glow: opacity at centre, 35% at 55%, 0 at the edge).
def glow(color, size, opacity, left, top):
    r = size / 2
    d = np.hypot(xs - (left + r), ys - (top + r)) / r
    over(color, interp(np.clip(d, 0, 1), [(0, opacity), (0.55, opacity * 0.35), (1, 0)]) * (d <= 1))


glow(ORANGE, 620, 0.22, W_PT + 300 - 620, -280)  # right: -300, top: -280
glow(NAVY, 680, 0.17, -380, 140)  # left: -380, top: 140
glow(AMBER, 420, 0.07, W_PT + 60 - 420, H_PT + 10 - 420)  # right: -60, bottom: -10

# 3. Dot grid: 22 pt cells, dot at (1.15, 1.15), radius 0.75, white at 5.5%.
dx = np.mod(xs, 22) - 1.15
dy = np.mod(ys, 22) - 1.15
over(WHITE, 0.055 * np.clip(0.75 - np.hypot(dx, dy) + 0.5 / SCALE, 0, 1) * SCALE / 1.5)

# 4. Four faint diagonal lines.
for offset in (-8, 54, 118, 186):
    x1, y1, x2, y2 = W_PT * 0.08, offset + 36, W_PT * 0.92, offset + 92
    t = np.clip(((xs - x1) * (x2 - x1) + (ys - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2), 0, 1)
    dist = np.hypot(xs - (x1 + t * (x2 - x1)), ys - (y1 + t * (y2 - y1)))
    over(WHITE, 0.028 * np.clip(1 - dist * 2, 0, 1))

# 5. Vignette, top to bottom.
over(PAPER, interp(ys / H_PT, [(0, 0.22), (0.38, 0), (1, 0.55)]))

# 6. Warm horizon in the top-right box (78% wide, 280 pt tall), from (1, 0) to (0.2, 0.55).
bw, bh = W_PT * 0.78, 280
bx = (xs - (W_PT - bw)) / bw
by = ys / bh
sx, sy, ex, ey = 1, 0, 0.2, 0.55
# On iOS expo-linear-gradient is a CAGradientLayer, which projects in the box's unit space.
px, py = bx - sx, by - sy
vx, vy = ex - sx, ey - sy
t = np.clip((px * vx + py * vy) / (vx * vx + vy * vy), 0, 1)
inside = (bx >= 0) & (by <= 1)
over(ORANGE, interp(t, [(0, 0.16), (0.2, 0.03), (0.42, 0)]) * inside)

background = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB')
background.save(ROOT / 'assets/images/splash-background.png', optimize=True)

mark = Image.open(ROOT / 'assets/images/splash-mark.png').convert('RGBA').resize((MARK_PT * SCALE,) * 2, Image.LANCZOS)
screen = background.convert('RGBA')
screen.alpha_composite(mark, ((W - mark.width) // 2, (H - mark.height) // 2))
screen.convert('RGB').save(ROOT / 'assets/images/splash-screen.png', optimize=True)
print('wrote splash-background.png and splash-screen.png', background.size)
