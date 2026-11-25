"""Generate screen backgrounds matched to the two design references.

  assets/bg-sky.png   prayer times: pixel-art blue sky with dithered clouds (reference 2)
  assets/bg-grid.png  Qibla: green surface with a fine grid texture (reference 1)

Run from the project root:  python -I scripts/make_backgrounds.py
"""
import os

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
W, H = 1080, 2340
rng = np.random.default_rng(11)


def value_noise(w, h, cell):
    gw, gh = w // cell + 2, h // cell + 2
    g = rng.random((gh, gw))
    ys, xs = np.mgrid[0:h, 0:w]
    gx, gy = xs / cell, ys / cell
    x0, y0 = gx.astype(int), gy.astype(int)
    fx, fy = gx - x0, gy - y0
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = g[y0, x0], g[y0, x0 + 1]
    c, d = g[y0 + 1, x0], g[y0 + 1, x0 + 1]
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy


def fbm(w, h, base, octaves=5):
    out = np.zeros((h, w))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        out += amp * value_noise(w, h, max(2, base >> o))
        total += amp
        amp *= 0.5
    return out / total


BAYER4 = (1 / 16) * np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
# 8x8 ordered-dither matrix built from the 4x4 one.
BAYER8 = np.block([[4 * BAYER4 * 16, 4 * BAYER4 * 16 + 2], [4 * BAYER4 * 16 + 3, 4 * BAYER4 * 16 + 1]]) / 64


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def sample(field, yy, xx):
    """Nearest sample of a 2-D field at float coordinates, clamped at the edges."""
    h, w = field.shape
    return field[np.clip(yy.astype(int), 0, h - 1), np.clip(xx.astype(int), 0, w - 1)]


def warped_fbm(w, h, base, octaves, warp):
    """fbm with domain warping: gives billowy, cauliflower cloud edges."""
    n = fbm(w, h, base, octaves)
    wx = (fbm(w, h, base, 3) - 0.5) * warp
    wy = (fbm(w, h, base, 3) - 0.5) * warp
    yy, xx = np.mgrid[0:h, 0:w]
    return sample(n, yy + wy, xx + wx)


def cumulus(w, h, base_y, top_y, cell, coverage, x_bias=None, spread=2):
    """Density of one cumulus layer: billowy tops, flat-ish bases near base_y."""
    yy, xx = np.mgrid[0:h, 0:w]
    n = warped_fbm(w, h, cell, 6, cell * 0.9)
    fy = yy / h
    # Height map along x: separate towers of different heights.
    hx = fbm(w, 8, max(4, cell * spread), 4)[4]
    tower = np.clip((hx - (1 - coverage) * 0.8) * 2.4, 0, 1)
    if x_bias is not None:
        tower = tower * np.clip(x_bias(np.arange(w) / w), 0, 1)
    local_top = base_y - (base_y - top_y) * tower[None, :]
    # Lumpy tops (big wobble) and nearly flat bases (small wobble).
    inside = smoothstep(local_top - 0.015, local_top + 0.04, fy + (n - 0.5) * 0.16)
    inside = inside * smoothstep(base_y + 0.012, base_y - 0.02, fy + (n - 0.5) * 0.025)
    inside = inside * smoothstep(0.0, 0.25, tower)[None, :]
    # Interior texture so the body is not a flat blob.
    return np.clip(inside * smoothstep(0.2, 0.5, n + 0.15), 0, 1), local_top


def bump(w, h, cell, octaves=4):
    """Fake surface relief from noise slopes, lit from the upper right (sun side)."""
    b = fbm(w, h, cell, octaves)
    gx = np.zeros_like(b)
    gy = np.zeros_like(b)
    gx[:, 1:-1] = (b[:, 2:] - b[:, :-2]) * 0.5
    gy[1:-1, :] = (b[2:, :] - b[:-2, :]) * 0.5
    s = gx * 0.7 - gy * 0.7  # light from +x, -y
    return s / (np.abs(s).max() + 1e-6)


def light(d, steps, dy, dx, k):
    """Self-shadowing: density accumulated toward the sun darkens a cloud's far side."""
    h, w = d.shape
    occ = np.zeros_like(d)
    yy, xx = np.mgrid[0:h, 0:w]
    for i in range(1, steps + 1):
        occ += sample(d, yy - dy * i, xx + dx * i)
    return np.exp(-occ * k)


def sky():
    px = 4  # one art pixel = 4 screen pixels
    w, h = W // px, H // px
    yy, xx = np.mgrid[0:h, 0:w]
    fy, fx = yy / h, xx / w

    # --- Atmosphere: deep zenith blue to pale horizon, Rayleigh-style. ---
    zen = np.array([0.10, 0.33, 0.58])
    mid = np.array([0.24, 0.52, 0.76])
    hor = np.array([0.66, 0.80, 0.88])
    t = fy[..., None]
    img = np.where(t < 0.6, zen + (mid - zen) * (t / 0.6), mid + (hor - mid) * ((t - 0.6) / 0.4))

    # Sun just off the top right: warm glow and a wide bloom.
    sun = (0.92, 0.04)
    dist = np.sqrt(((fx - sun[0]) * w / h) ** 2 + (fy - sun[1]) ** 2)
    img += (np.exp(-dist * 9) * 0.55)[..., None] * np.array([1.0, 0.95, 0.82])
    img += (np.exp(-dist * 2.6) * 0.14)[..., None] * np.array([1.0, 0.97, 0.9])

    # --- High cirrus streaks near the top, stretched sideways by the wind. ---
    ci = fbm(w, h * 6, 24, 5)[::6, :]
    ci = smoothstep(0.62, 0.85, ci) * smoothstep(0.30, 0.04, fy) * 0.35
    img = img * (1 - ci[..., None]) + np.array([0.92, 0.95, 0.98]) * ci[..., None]

    # --- Cumulus layers, far to near. Far clouds are smaller, hazier, bluer. ---
    layers = [
        # base_y, top_y, cell, coverage, haze, scale of shadow
        (0.34, 0.24, 20, 0.45, 0.40, 0.55, None),
        (0.54, 0.33, 36, 0.55, 0.22, 0.75, lambda x: 0.55 + 0.45 * np.cos((x - 0.4) * 4)),
        (0.72, 0.47, 48, 0.6, 0.10, 0.9, lambda x: 0.6 + 0.4 * np.sin(x * 5 + 1)),
        (1.02, 0.74, 56, 0.75, 0.0, 1.0, None),
    ]
    lit_col = np.array([0.99, 0.99, 0.98])
    warm_edge = np.array([1.0, 0.97, 0.9])
    shade_col = np.array([0.62, 0.70, 0.80])  # blue-grey underside
    for base_y, top_y, cell, cov, haze, sh, bias in layers:
        d, ltop = cumulus(w, h, base_y, top_y, cell, cov, bias)
        lum = light(d, 6, max(1, cell // 10), max(1, cell // 14), 0.22 * sh)
        # Darker toward the flat base, brighter on top.
        under = np.clip((fy - ltop) / np.maximum(base_y - ltop, 1e-3), 0, 1) ** 1.4
        lum = lum * (1 - 0.5 * under * sh)
        # Cauliflower relief: small puffs catch light on their sun side.
        lum = np.clip(lum * (0.9 + 0.42 * bump(w, h, max(3, cell // 4)) * sh), 0, 1.05)
        col = shade_col[None, None] + (lit_col - shade_col)[None, None] * lum[..., None]
        # Silver lining: thin edges facing the sun glow warm white.
        edge = smoothstep(0.0, 0.35, d) * (1 - smoothstep(0.35, 0.8, d))
        col = col + (warm_edge - col) * (edge * 0.5 * (1 - fy))[..., None]
        # Aerial perspective: far layers fade toward the sky colour.
        col = col * (1 - haze) + img * haze
        a = d[..., None]
        img = img * (1 - a) + col * a

    # Low haze band near the bottom.
    img = img + (smoothstep(0.75, 1.0, fy) * 0.08)[..., None]

    # --- Tree in the bottom right: leaf clumps lit from the upper right. ---
    tn = warped_fbm(w, h, 6, 4, 6)
    cx, cy = 1.0, 1.0
    shape = ((fx - cx) / 0.42) ** 2 + ((fy - cy) / 0.13) ** 2 + (tn - 0.5) * 1.1
    tree = shape < 1
    clump = fbm(w, h, 5, 3)
    leaf = bump(w, h, 3, 3)
    shade_t = np.clip(0.45 + (1 - fy) * 1.6 - 0.3 + (clump - 0.5) * 1.2 + leaf * 0.45, 0, 1)
    dark = np.array([0.10, 0.26, 0.11])
    midg = np.array([0.24, 0.48, 0.17])
    light_g = np.array([0.58, 0.78, 0.30])
    tcol = np.where(shade_t[..., None] < 0.5, dark + (midg - dark) * (shade_t / 0.5)[..., None],
                    midg + (light_g - midg) * ((shade_t - 0.5) / 0.5)[..., None])
    # Gaps between leaves.
    gaps = (clump < 0.32) & (shape > 0.55)
    img[tree] = tcol[tree]
    img[tree & gaps] = dark * 0.8
    # A low bush in the bottom left, half out of frame.
    bshape = ((fx + 0.02) / 0.22) ** 2 + ((fy - 1.01) / 0.05) ** 2 + (tn - 0.5) * 0.9
    bush = bshape < 1
    img[bush] = (dark + (midg - dark) * np.clip(clump, 0, 1)[..., None])[bush]

    # --- Pixel-art finish: ordered dither down to a limited palette. ---
    levels = 14
    thr = BAYER8[yy % 8, xx % 8][..., None]
    img = np.floor(np.clip(img, 0, 1) * levels + thr) / levels

    small = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGB")
    small.resize((W, H), Image.NEAREST).save(os.path.join(OUT, "bg-sky.png"), optimize=True)
    print("wrote bg-sky.png")


def grid():
    # Green from the reference (#35B15B), with a fine 4 px grid and slight noise.
    base = np.array([53, 172, 90], dtype=float)
    img = np.tile(base, (H, W, 1))
    yy, xx = np.mgrid[0:H, 0:W]
    lines = ((xx % 9) == 0) | ((yy % 9) == 0)
    img[lines] -= 9
    grain = np.kron(rng.random((H // 3 + 1, W // 3 + 1)), np.ones((3, 3)))[:H, :W]
    img += (grain - 0.5)[..., None] * 8
    # Soft vignette.
    v = 1 - 0.16 * (((xx / W) - 0.5) ** 2 + ((yy / H) - 0.45) ** 2) * 2.2
    img *= v[..., None]
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").quantize(48, dither=Image.Dither.NONE)
    out.save(os.path.join(OUT, "bg-grid.png"), optimize=True)
    print("wrote bg-grid.png")


if __name__ == "__main__":
    # sky() is kept as the shared cloud test bench; the app now uses the card skies.
    grid()
