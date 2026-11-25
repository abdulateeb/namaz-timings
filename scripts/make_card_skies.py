"""Realistic sky panoramas for the six prayer cards.

  assets/sky-tahajjud.jpg  deep night, stars, crescent moon
  assets/sky-fajr.jpg      pre-dawn: indigo to rose and orange at the horizon
  assets/sky-dhuhr.jpg     bright noon blue, white cumulus
  assets/sky-asr.jpg       warm afternoon, lower sun, golden-edged clouds
  assets/sky-maghrib.jpg   sunset: sun on the horizon, orange and crimson clouds
  assets/sky-isha.jpg      late twilight fading into night

Each has a low skyline of hills and a mosque silhouette along the bottom.
Run from the project root:  python -I scripts/make_card_skies.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_backgrounds as mb  # noqa: E402  (shared noise and cloud helpers)

OUT = mb.OUT
W, H = 1200, 360


def col(hex_):
    hex_ = hex_.lstrip("#")
    return np.array([int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4)])


SKIES = {
    "tahajjud": dict(stops=["#03040B", "#070B1F", "#121B3A"], sun=None, moon=(0.44, 0.3), stars=420,
                     lit="#7F8CB0", shade="#1A2140", clouds=0.35, cloud_alpha=0.55, glow=("#2B3A70", 0.25),
                     land="#020308"),
    "fajr": dict(stops=["#0E1538", "#4A3B78", "#E8927A"], sun=("#FFB27A", 0.78, 1.08, 0.0, 0.55), moon=None, stars=90,
                 lit="#FFC7B0", shade="#5B4C86", clouds=0.45, cloud_alpha=0.9, glow=("#FF9E7A", 0.5), land="#120E22"),
    "dhuhr": dict(stops=["#1658A8", "#3D86D0", "#A9D2F0"], sun=("#FFFBEA", 0.84, 0.05, 0.03, 0.7), moon=None, stars=0,
                  lit="#FFFFFF", shade="#9EB4CC", clouds=0.6, cloud_alpha=1.0, glow=("#FFFFFF", 0.0), land="#1F3B2A"),
    "asr": dict(stops=["#1F5C9C", "#5F94C6", "#E9C79A"], sun=("#FFE3A8", 0.2, 0.42, 0.03, 0.7), moon=None, stars=0,
                lit="#FFF2D8", shade="#A6A7B8", clouds=0.55, cloud_alpha=1.0, glow=("#FFD58A", 0.35), land="#2A2E2A"),
    "maghrib": dict(stops=["#24164A", "#B0405A", "#FF9A4A"], sun=("#FFD27A", 0.62, 0.98, 0.07, 1.0), moon=None, stars=20,
                    lit="#FFC48A", shade="#9A4A72", clouds=0.55, cloud_alpha=1.0, glow=("#FF7A3A", 0.7), land="#14091A"),
    "isha": dict(stops=["#060A1E", "#18205A", "#4A3E7E"], sun=None, moon=(0.46, 0.3), stars=220,
                 lit="#8E90C8", shade="#262A5A", clouds=0.4, cloud_alpha=0.75, glow=("#6A5AA8", 0.35), land="#05060F"),
}


def gradient(stops):
    a, b, c = (col(s) for s in stops)
    t = np.linspace(0, 1, H)[:, None, None]
    img = np.where(t < 0.55, a + (b - a) * (t / 0.55), b + (c - b) * ((t - 0.55) / 0.45))
    return np.broadcast_to(img, (H, W, 3)).copy()


def glow_at(img, color, x, y, strength, spread):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx / W - x) * W / H) ** 2 + (yy / H - y) ** 2)
    g = np.exp(-d * spread) * strength
    return img + g[..., None] * col(color)


def stars(img, n, seed):
    rng = np.random.default_rng(seed)
    out = img.copy()
    for _ in range(n):
        x, y = rng.random() * W, (rng.random() ** 1.6) * H * 0.8
        b = rng.random() ** 3
        r = 0.6 + b * 1.6
        tint = np.array([0.85 + 0.15 * rng.random(), 0.9, 1.0])
        yy, xx = np.ogrid[int(max(0, y - 4)):int(min(H, y + 5)), int(max(0, x - 4)):int(min(W, x + 5))]
        d = np.sqrt((xx - x) ** 2 + (yy - y) ** 2)
        a = np.clip(1 - d / r, 0, 1) * (0.35 + 0.65 * b)
        out[yy, xx] = out[yy, xx] * (1 - a[..., None]) + tint * a[..., None]
    return out


def moon(img, x, y):
    """Crescent with an earthshine disc and soft halo."""
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy, r = x * W, y * H, H * 0.07
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    d2 = np.sqrt((xx - (cx + r * 0.45)) ** 2 + (yy - (cy - r * 0.2)) ** 2)
    halo = np.exp(-np.maximum(d - r, 0) / (H * 0.12)) * 0.22
    img = img + halo[..., None] * col("#AFC0FF")
    disc = np.clip(r + 0.8 - d, 0, 1)
    lit = disc * np.clip(d2 - r * 0.92 + 0.8, 0, 1)
    img = img * (1 - disc[..., None] * 0.15) + disc[..., None] * 0.04
    return img * (1 - lit[..., None]) + col("#FFF6DA") * lit[..., None]


def sun_disc(img, color, x, y, r, glow):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - x * W) ** 2 + (yy - y * H) ** 2)
    img = img + (np.exp(-d / (H * 0.22)) * 0.55 * glow)[..., None] * col(color)
    img = img + (np.exp(-d / (H * 0.6)) * 0.25 * glow)[..., None] * col(color)
    if r > 0:
        disc = np.clip(r * H + 1 - d, 0, 1)
        img = img * (1 - disc[..., None]) + col("#FFF8E8") * disc[..., None]
    return img


def clouds(img, spec, seed):
    mb.rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W]
    fy = yy / H
    lit, shade = col(spec["lit"]), col(spec["shade"])
    cov = spec["clouds"]
    for base_y, top_y, cell, c_mul, haze in [(0.62, 0.3, 26, 0.85, 0.35), (0.9, 0.45, 44, 1.0, 0.0)]:
        d, ltop = mb.cumulus(W, H, base_y, top_y, cell, cov * c_mul, None, spread=6)
        lum = mb.light(d, 5, max(1, cell // 9), max(1, cell // 12), 0.25)
        under = np.clip((fy - ltop) / np.maximum(base_y - ltop, 1e-3), 0, 1) ** 1.3
        lum = np.clip(lum * (1 - 0.5 * under) * (0.9 + 0.35 * mb.bump(W, H, max(3, cell // 4))), 0, 1.05)
        c = shade + (lit - shade) * lum[..., None]
        c = c * (1 - haze) + img * haze
        a = (d * spec["cloud_alpha"])[..., None]
        img = img * (1 - a) + c * a
    return img


def skyline(img, land, seed, mx_f=0.56, base_f=0.86, dw_f=0.12, hill_f=0.9, return_mask=False):
    """Rolling hills plus a small mosque silhouette (defaults: card layout)."""
    rng = np.random.default_rng(seed)
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    xs = np.arange(W)
    hills = H * (hill_f - 0.05 * np.sin(xs / W * 5 + rng.random() * 6) - 0.03 * np.sin(xs / W * 13 + rng.random() * 6))
    d.polygon([(0, H)] + [(int(x), float(y)) for x, y in zip(xs[::4], hills[::4])] + [(W, H)], fill=255)
    # Mosque: dome, drum, two minarets with small domes.
    mx, base = W * mx_f, H * base_f
    dw = H * dw_f
    d.rectangle([mx - dw * 1.2, base - dw * 0.55, mx + dw * 1.2, H], fill=255)
    d.ellipse([mx - dw * 0.75, base - dw * 1.45, mx + dw * 0.75, base - dw * 0.05], fill=255)
    d.line([(mx, base - dw * 1.45), (mx, base - dw * 1.75)], fill=255, width=3)
    for side in (-1, 1):
        x = mx + side * dw * 1.55
        d.rectangle([x - dw * 0.1, base - dw * 2.1, x + dw * 0.1, H], fill=255)
        d.ellipse([x - dw * 0.15, base - dw * 2.35, x + dw * 0.15, base - dw * 2.05], fill=255)
        d.line([(x, base - dw * 2.35), (x, base - dw * 2.55)], fill=255, width=2)
    m = np.asarray(mask.filter(ImageFilter.GaussianBlur(0.8)), dtype=float)[..., None] / 255
    out = img * (1 - m) + col(land) * m
    return (out, mask) if return_mask else out


def render(key, spec, seed):
    img = gradient(spec["stops"])
    if spec["stars"]:
        img = stars(img, spec["stars"], seed)
    g_col, g_str = spec["glow"]
    if g_str:
        img = glow_at(img, g_col, 0.5, 1.05, g_str, 2.2)
    if spec["moon"]:
        img = moon(img, *spec["moon"])
    if spec["sun"]:
        s_col, sx, sy, sr, sg = spec["sun"]
        img = sun_disc(img, s_col, sx, sy, sr, sg)
    img = clouds(img, spec, seed)
    img = skyline(img, spec["land"], seed)
    # Premium film grain: fine monochrome grain plus a coarser clumped layer,
    # stronger in the darks (as real film), so the cards feel tactile.
    g_rng = np.random.default_rng(seed)
    fine = g_rng.normal(0, 1, (H, W))
    coarse = np.kron(g_rng.normal(0, 1, (H // 2 + 1, W // 2 + 1)), np.ones((2, 2)))[:H, :W]
    grain = fine * 0.6 + coarse * 0.4
    lum = img.mean(axis=2)
    amount = 0.045 + 0.03 * (1 - lum)
    img = np.clip(img + (grain * amount)[..., None], 0, 1)
    Image.fromarray((img * 255).astype(np.uint8)).save(os.path.join(OUT, f"sky-{key}.jpg"), quality=88, optimize=True)
    print("wrote", f"sky-{key}.jpg")


if __name__ == "__main__":
    for i, (k, s) in enumerate(SKIES.items()):
        render(k, s, 100 + i)
