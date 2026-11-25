"""Generate the Namaz app icon set: "Night Sky" (chosen 25 Nov 2026, replacing Morning).

A starry night: deep indigo sky, faint moonlit clouds, dark hills and a mosque on
the horizon, a glowing white crescent, fine stars and lens-sparkle star bursts
(variant 07 of the moon-and-stars set, chosen 25 Nov 2026), film grain.

Writes into ./assets:
  icon.png                     full icon (store, iOS, legacy Android)
  android-icon-background.png  scene without the crescent (adaptive layer)
  android-icon-foreground.png  crescent only, inside the adaptive safe zone
  android-icon-monochrome.png  crescent + mosque silhouette (themed icons)
  splash-icon.png              rounded icon for the splash screen
  favicon.png                  48 px web icon

Everything important sits inside the centre 66 % so launcher masks never cut it.
Run from the project root:  python -I scripts/make_icons.py
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_card_skies as cs  # noqa: E402

S = 1024
OUT = cs.OUT
SEED = 105  # same seed family as the Isha card


def scene():
    cs.W = cs.H = S  # render the card sky square
    spec = dict(cs.SKIES["isha"])
    spec["stops"] = ["#050817", "#121A48", "#3A3576"]
    spec["land"] = "#04050C"
    img = cs.gradient(spec["stops"])
    img = cs.glow_at(img, "#8FA2FF", 0.41, 0.34, 0.35, 3.2)  # moonlight halo
    img = cs.glow_at(img, "#6A5AA8", 0.5, 0.95, 0.4, 2.4)  # last light on the horizon
    img = cs.clouds(img, spec, SEED)
    img = star_bursts(img)
    img = cs.skyline(img, spec["land"], SEED, mx_f=0.5, base_f=0.77, dw_f=0.105, hill_f=0.8)
    # Mosque alone (hills pushed off-canvas) for the monochrome icon.
    _, mask = cs.skyline(img, spec["land"], SEED, mx_f=0.5, base_f=0.77, dw_f=0.105, hill_f=2.0, return_mask=True)
    return img, mask


def _sparkle(cx, cy, r, inner=0.1, rot=-90):
    m = Image.new("L", (S, S), 0)
    pts = []
    for i in range(8):
        a = math.radians(rot + 45 * i)
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m


def _paint(img, mask, color, alpha=1.0):
    m = (np.asarray(mask, dtype=float) / 255 * alpha)[..., None]
    return img * (1 - m) + cs.col(color) * m


def star_bursts(img):
    """Variant 07 (chosen 25 Nov 2026): fine dotted stars plus four large
    lens-sparkle star bursts. Drawn before the skyline so the mosque covers them."""
    rng = np.random.default_rng(7)
    mx, my, keep = S * 0.41, S * 0.34, S * 0.2
    dots = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(dots)
    for _ in range(180):
        x, y = rng.random() * S, rng.random() ** 1.25 * S * 0.72
        if math.hypot(x - mx, y - my) < keep:
            continue
        r = 1.2 + rng.random() ** 3 * 2.4
        d.ellipse([x - r, y - r, x + r, y + r], fill=int(150 + rng.random() * 105))
    img = _paint(img, dots.filter(ImageFilter.GaussianBlur(0.5)), "#FFFFFF", 0.8)
    burst = Image.new("L", (S, S), 0)
    # Inside the launcher's circle crop (radius 0.33 around the centre) so none is cut off.
    for (x, y, r) in [(0.62, 0.27, 38), (0.3, 0.32, 22), (0.74, 0.46, 22), (0.58, 0.4, 13)]:
        burst = ImageChops.lighter(burst, _sparkle(S * x, S * y, r))
        burst = ImageChops.lighter(burst, _sparkle(S * x, S * y, r * 0.5, rot=-45))
    img = _paint(img, burst.filter(ImageFilter.GaussianBlur(9)), "#BFD0FF", 0.8)
    return _paint(img, burst, "#FFFFFF")


def crescent_mask(cx, cy, r):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    c = Image.new("L", (S, S), 0)
    ox, oy, o = cx + r * 0.42, cy - r * 0.3, r * 0.86
    ImageDraw.Draw(c).ellipse([ox - o, oy - o, ox + o, oy + o], fill=255)
    return ImageChops.subtract(m, c)


def add_grain(arr, seed=SEED):
    rng = np.random.default_rng(seed)
    fine = rng.normal(0, 1, (S, S))
    coarse = np.kron(rng.normal(0, 1, (S // 2, S // 2)), np.ones((2, 2)))
    g = fine * 0.6 + coarse * 0.4
    lum = arr.mean(axis=2)
    return np.clip(arr + (g * (0.035 + 0.025 * (1 - lum)))[..., None], 0, 1)


def to_img(arr):
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")


def sun_mask(cx, cy, r):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    return m


def crescent_layer(cm):
    """Glowing white crescent with a cool blue-white halo (variant 07)."""
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    glow = Image.new("RGBA", (S, S), (217, 228, 255, 0))
    glow.putalpha(cm.filter(ImageFilter.GaussianBlur(44)).point(lambda v: int(v * 0.9)))
    layer = Image.alpha_composite(layer, glow)
    inner = Image.new("RGBA", (S, S), (217, 228, 255, 0))
    inner.putalpha(cm.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.75)))
    layer = Image.alpha_composite(layer, inner)
    body = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    body.putalpha(cm)
    return Image.alpha_composite(layer, body)


def rounded(img, radius=0.225):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=255)
    out = img.copy()
    out.putalpha(m)
    return out


def save(img, name, size=S):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
    print("wrote", name, size)


def main():
    arr, sky_mask = scene()
    bg = to_img(add_grain(arr))
    cm = crescent_mask(S * 0.41, S * 0.34, S * 0.09)
    moon = crescent_layer(cm)
    full = Image.alpha_composite(bg, moon)

    save(full, "icon.png")
    save(bg, "android-icon-background.png")
    save(moon, "android-icon-foreground.png")

    # Monochrome: crescent plus the mosque, cut at the horizon, as one white silhouette.
    mono_mask = ImageChops.lighter(cm, sky_mask.point(lambda v: 255 if v > 127 else 0))
    ImageDraw.Draw(mono_mask).rectangle([0, int(S * 0.79), S, S], fill=0)
    mono = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    mono.putalpha(mono_mask)
    save(mono, "android-icon-monochrome.png")

    save(rounded(full), "splash-icon.png")
    save(full, "favicon.png", 48)


if __name__ == "__main__":
    main()
