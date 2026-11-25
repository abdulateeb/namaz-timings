"""Portrait sky backgrounds for the Qibla screen, with film grain.

  assets/qibla-night.jpg    dark theme: starry night, crescent moon, dim clouds,
                            hills and tree silhouettes
  assets/qibla-morning.jpg  light theme: fresh morning blue, soft sun, white
                            clouds, sunlit green hills and trees

The sky is rendered at half size (smooth content), trees and grain at full size.
Run from the project root:  python -I scripts/make_qibla_skies.py
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_card_skies as cs  # noqa: E402

W, H = 1080, 2340
OUT = cs.OUT


def sky(spec, seed, half=2):
    cs.W, cs.H = W // half, H // half
    img = cs.gradient(spec["stops"])
    if spec.get("stars"):
        img = cs.stars(img, spec["stars"], seed)
    if spec.get("glow"):
        g_col, g_str, gx, gy = spec["glow"]
        img = cs.glow_at(img, g_col, gx, gy, g_str, 2.0)
    if spec.get("moon"):
        img = cs.moon(img, *spec["moon"], rf=0.028)
    if spec.get("sun"):
        s_col, sx, sy, sr, sg = spec["sun"]
        img = cs.sun_disc(img, s_col, sx, sy, sr, sg)
    img = cs.clouds(img, spec, seed)
    small = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    return np.asarray(small.resize((W, H), Image.LANCZOS), dtype=float) / 255


def tree_row(seed, ground, size, spacing, include_hill):
    """One row of trees standing on rolling ground, as a soft mask.

    Canopies are many small overlapping leaf clumps with a ragged, noisy edge,
    so they read as foliage rather than cartoon circles.
    """
    rng = np.random.default_rng(seed)
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    xs = np.arange(0, W + 8, 8)
    line = H * (ground - 0.022 * np.sin(xs / W * 4 + 1.3 + seed) - 0.012 * np.sin(xs / W * 11 + 0.4))
    if include_hill:
        d.polygon([(0, H)] + [(int(x), float(y)) for x, y in zip(xs, line)] + [(W, H)], fill=255)
    x = -40.0
    while x < W + 40:
        base = H * (ground - 0.022 * math.sin(x / W * 4 + 1.3 + seed)) + 6
        hgt = rng.uniform(0.8, 1.25) * size * H
        if rng.random() < 0.2:  # tall cypress
            w = hgt * 0.13
            for k in range(14):
                t = k / 13
                r = w * (1 - 0.65 * t) * rng.uniform(0.85, 1.1)
                cy = base - hgt * 0.1 - t * hgt * 0.95
                d.ellipse([x - r, cy - r, x + r, cy + r], fill=255)
        else:  # broadleaf: short trunk, dense crown of leaf clumps
            d.rectangle([x - hgt * 0.035, base - hgt * 0.3, x + hgt * 0.035, base], fill=255)
            crown_w, crown_h = hgt * rng.uniform(0.38, 0.5), hgt * 0.42
            ccy = base - hgt * 0.62
            for _ in range(46):
                a = rng.uniform(0, 2 * math.pi)
                rr = rng.uniform(0, 1) ** 0.6
                cx = x + math.cos(a) * rr * crown_w
                cy = ccy + math.sin(a) * rr * crown_h
                r = hgt * rng.uniform(0.07, 0.13)
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
        x += rng.uniform(0.55, 0.9) * size * H
    arr = np.asarray(m, dtype=float) / 255
    # Ragged leafy edge: perturb the soft mask with fine noise, then re-threshold.
    soft = np.asarray(Image.fromarray((arr * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), dtype=float) / 255
    n = rng.random((H // 3 + 1, W // 3 + 1))
    n = np.kron(n, np.ones((3, 3)))[:H, :W]
    return np.clip((soft + (n - 0.5) * 0.35 - 0.5) * 6 + 0.5, 0, 1)


def tree_mask(seed):
    return tree_row(seed, 0.86, 0.11, 0.0, True)


def shade_trees(img, mask, day, seed):
    yy, xx = np.mgrid[0:H, 0:W]
    if not day:
        land = cs.col("#03050C")
        return img * (1 - mask[..., None]) + land * mask[..., None]
    # Sunlit foliage: leaf-clump noise lit from the upper right, darker low down.
    cs.mb.rng = np.random.default_rng(seed)
    clump = cs.mb.fbm(W // 2, H // 2, 6, 4)
    clump = np.asarray(Image.fromarray((clump * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), dtype=float) / 255
    edge = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), dtype=float) / 255
    depth = np.clip((yy / H - 0.78) / 0.22, 0, 1)
    t = np.clip(0.75 - depth * 0.6 + (clump - 0.5) * 0.9 + (1 - edge) * 0.35 + (xx / W - 0.5) * 0.15, 0, 1)
    dark, mid, light = cs.col("#1E4A1F"), cs.col("#3F7F2E"), cs.col("#8CC45A")
    g = np.where(t[..., None] < 0.5, dark + (mid - dark) * (t / 0.5)[..., None], mid + (light - mid) * ((t - 0.5) / 0.5)[..., None])
    return img * (1 - mask[..., None]) + g * mask[..., None]


def grain(img, seed):
    rng = np.random.default_rng(seed)
    fine = rng.normal(0, 1, (H, W))
    coarse = np.kron(rng.normal(0, 1, (H // 2, W // 2)), np.ones((2, 2)))
    g = fine * 0.6 + coarse * 0.4
    lum = img.mean(axis=2)
    return np.clip(img + (g * (0.04 + 0.03 * (1 - lum)))[..., None], 0, 1)


NIGHT = dict(stops=["#02030A", "#0A1030", "#1C2350"], stars=900, moon=(0.74, 0.13), glow=("#3A4A8A", 0.3, 0.5, 1.0),
             lit="#7C88B4", shade="#141A38", clouds=0.32, cloud_alpha=0.5)
MORNING = dict(stops=["#1C67BE", "#5BA5E2", "#CFE6F2"], sun=("#FFF6DA", 0.84, 0.07, 0.018, 0.4), glow=("#FFE9C2", 0.12, 0.85, 0.08),
               lit="#FFFFFF", shade="#B5C8DA", clouds=0.55, cloud_alpha=1.0)


def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=float) / 255


def noise(seed, cell):
    """Upscaled random field: cell = size of one noise pixel."""
    r = np.random.default_rng(seed).random((H // cell + 2, W // cell + 2))
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).resize(((W // cell + 2) * cell, (H // cell + 2) * cell), Image.BICUBIC), dtype=float)[:H, :W] / 255


def ramp(t, stops):
    """Colour ramp: stops = [(t, '#hex'), ...] ascending."""
    out = np.zeros(t.shape + (3,))
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        f = ((t - t0) / (t1 - t0))[..., None]
        out[m] = (cs.col(c0) + (cs.col(c1) - cs.col(c0)) * f)[m]
    out[t < stops[0][0]] = cs.col(stops[0][1])
    out[t > stops[-1][0]] = cs.col(stops[-1][1])
    return out


def hill_mask(ground, seed):
    m = Image.new("L", (W, H), 0)
    xs = np.arange(0, W + 8, 8)
    line = H * (ground - 0.022 * np.sin(xs / W * 4 + 1.3 + seed) - 0.012 * np.sin(xs / W * 11 + 0.4))
    ImageDraw.Draw(m).polygon([(0, H)] + [(int(x), float(y)) for x, y in zip(xs, line)] + [(W, H)], fill=255)
    return blur(np.asarray(m, dtype=float) / 255, 1.2)


def land(img, hill, trees, day, seed):
    """Grass: blade texture (vertically stretched noise), lighter near the crest,
    deeper toward the viewer, with soft shadows below the trees."""
    yy, _ = np.mgrid[0:H, 0:W]
    blades = np.asarray(Image.fromarray((np.random.default_rng(seed).random((H // 6, W // 2)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=float) / 255
    patches = noise(seed + 3, 60)
    depth = np.clip((yy / H - 0.82) / 0.18, 0, 1)
    shadow = blur(np.roll(trees, int(H * 0.012), axis=0), 18) * 0.55
    if day:
        t = np.clip(0.8 - depth * 0.55 + (blades - 0.5) * 0.35 + (patches - 0.5) * 0.3 - shadow, 0, 1)
        g = ramp(t, [(0, "#24451C"), (0.35, "#3F6E26"), (0.7, "#7BA845"), (1, "#B8D272")])
    else:
        t = np.clip(0.5 - depth * 0.3 + (blades - 0.5) * 0.25 - shadow, 0, 1)
        g = ramp(t, [(0, "#020306"), (0.5, "#060A14"), (1, "#121A2C")])
    return img * (1 - hill[..., None]) + g * hill[..., None]


def foliage(img, trees, day, seed):
    """Leafy crowns: fine leaf texture, clumps lit from the sun side (upper right),
    dark hollow interiors, bright sunlit rims; at night a faint moonlit edge."""
    yy, xx = np.mgrid[0:H, 0:W]
    leaf = noise(seed + 11, 2)
    clump = noise(seed + 12, 9)
    inner = blur(trees, 10)  # high deep inside the crown, low at its edge
    # Sun side: how much of the crown lies toward the upper right of each point.
    toward_sun = blur(np.roll(np.roll(trees, -int(W * 0.012), axis=1), int(H * 0.006), axis=0), 6)
    lit_edge = np.clip(trees - toward_sun, 0, 1)
    if day:
        t = 0.42 + (clump - 0.5) * 0.7 + (leaf - 0.5) * 0.45 - (inner - 0.6) * 0.5 + lit_edge * 0.9
        t -= np.clip((yy / H - 0.8) / 0.1, 0, 1) * 0.15  # lower crown in shade
        t = np.clip(t, 0, 1)
        g = ramp(t, [(0, "#0F2412"), (0.3, "#24461C"), (0.6, "#4E7F2E"), (0.85, "#8DB64E"), (1, "#C9E08A")])
    else:
        t = np.clip(0.1 + (leaf - 0.5) * 0.1 + lit_edge * 0.6, 0, 1)
        g = ramp(t, [(0, "#020308"), (0.5, "#070B16"), (1, "#3A4A78")])
    return img * (1 - trees[..., None]) + g * trees[..., None]


def build(name, spec, day, seed):
    img = sky(spec, seed)
    # Back row: smaller, set higher, hazed toward the sky colour (aerial perspective).
    # Light mode is open landscape (no trees, by request); night keeps tree silhouettes.
    back = tree_row(seed + 7, 0.835, 0.075, 0.0, True) if not day else np.zeros((H, W))
    haze = cs.col("#8FAEBF") if day else cs.col("#0B1026")
    back_tex = noise(seed + 21, 3)[..., None] * (0.08 if day else 0.03)
    img = img * (1 - back[..., None] * 0.88) + (haze + back_tex - 0.04) * back[..., None] * 0.88
    hill = hill_mask(0.86, seed)
    trees = tree_row(seed, 0.86, 0.11, 0.0, False) if not day else np.zeros((H, W))
    img = land(img, hill, trees, day, seed)
    img = foliage(img, trees, day, seed)
    img = grain(img, seed)
    Image.fromarray((img * 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=86, optimize=True)
    print("wrote", name)


if __name__ == "__main__":
    build("qibla-night.jpg", NIGHT, False, 211)
    build("qibla-morning.jpg", MORNING, True, 212)
