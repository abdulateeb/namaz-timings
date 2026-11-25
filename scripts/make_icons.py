"""Generate the Namaz app icon set: "Morning Sky" (chosen 25 Nov 2026, replacing Dawn).

A fresh morning: clear blue sky, white cumulus, green hills and a mosque on the
horizon, a warm sun above, film grain.

Writes into ./assets:
  icon.png                     full icon (store, iOS, legacy Android)
  android-icon-background.png  scene without the sun (adaptive layer)
  android-icon-foreground.png  sun only, inside the adaptive safe zone
  android-icon-monochrome.png  sun + mosque silhouette (themed icons)
  splash-icon.png              rounded icon for the splash screen
  favicon.png                  48 px web icon

Everything important sits inside the centre 66 % so launcher masks never cut it.
Run from the project root:  python -I scripts/make_icons.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_card_skies as cs  # noqa: E402

S = 1024
OUT = cs.OUT
SEED = 102  # same seed family as the Zuhr card


def scene():
    cs.W = cs.H = S  # render the card sky square
    spec = dict(cs.SKIES["dhuhr"])
    spec["stops"] = ["#1A64BC", "#4C9BE0", "#BFE0F4"]
    spec["land"] = "#1E4D2B"
    img = cs.gradient(spec["stops"])
    img = cs.glow_at(img, "#FFF3D6", 0.36, 0.33, 0.45, 3.0)  # warm light around the sun
    img = cs.clouds(img, spec, SEED)
    img = cs.skyline(img, spec["land"], SEED, mx_f=0.5, base_f=0.77, dw_f=0.105, hill_f=0.8)
    # Mosque alone (hills pushed off-canvas) for the monochrome icon.
    _, mask = cs.skyline(img, spec["land"], SEED, mx_f=0.5, base_f=0.77, dw_f=0.105, hill_f=2.0, return_mask=True)
    return img, mask


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
    """Glowing body for the sky light (used for the sun)."""
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    glow = Image.new("RGBA", (S, S), (255, 236, 190, 0))
    glow.putalpha(cm.filter(ImageFilter.GaussianBlur(40)).point(lambda v: int(v * 0.9)))
    layer = Image.alpha_composite(layer, glow)
    body = Image.new("RGBA", (S, S), (255, 250, 232, 0))
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
    cm = sun_mask(S * 0.36, S * 0.33, S * 0.075)
    moon = crescent_layer(cm)
    full = Image.alpha_composite(bg, moon)

    save(full, "icon.png")
    save(bg, "android-icon-background.png")
    save(moon, "android-icon-foreground.png")

    # Monochrome: sun plus the mosque, cut at the horizon, as one white silhouette.
    mono_mask = ImageChops.lighter(cm, sky_mask.point(lambda v: 255 if v > 127 else 0))
    ImageDraw.Draw(mono_mask).rectangle([0, int(S * 0.79), S, S], fill=0)
    mono = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    mono.putalpha(mono_mask)
    save(mono, "android-icon-monochrome.png")

    save(rounded(full), "splash-icon.png")
    save(full, "favicon.png", 48)


if __name__ == "__main__":
    main()
