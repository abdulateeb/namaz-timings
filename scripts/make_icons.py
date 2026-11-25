"""Generate the Namaz app icon set: glass disc, crescent and star on a night sky.

Run from the project root:  python -I scripts/make_icons.py
Writes into ./assets. Everything is drawn in code, so the logo can be tweaked
and regenerated at any time.
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

SS = 4  # supersampling factor for smooth edges
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def radial(size, cx, cy, r, color, alpha):
    """Soft radial glow layer."""
    layer = Image.new("RGBA", (size, size), color + (0,))
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    steps = 60
    for i in range(steps, 0, -1):
        t = i / steps
        rr = r * t
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=int(alpha * 255 * (1 - t) ** 1.6))
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(size * 0.02)))
    return layer


def sky(size):
    """Night sky background: diagonal navy gradient with violet and warm glows."""
    top, mid, bot = (6, 9, 28), (22, 26, 78), (58, 34, 104)
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(0, size):
            t = (x * 0.35 + y * 0.65) / size
            c = lerp(top, mid, t / 0.6) if t < 0.6 else lerp(mid, bot, (t - 0.6) / 0.4)
            px[x, y] = c + (255,)
    img = Image.alpha_composite(img, radial(size, size * 0.85, size * 0.12, size * 0.55, (110, 90, 230), 0.55))
    img = Image.alpha_composite(img, radial(size, size * 0.2, size * 1.0, size * 0.7, (240, 140, 108), 0.55))
    # A few stars.
    d = ImageDraw.Draw(img)
    for (fx, fy, fr, a) in [(0.18, 0.2, 0.006, 200), (0.3, 0.12, 0.004, 150), (0.12, 0.42, 0.003, 140),
                            (0.82, 0.78, 0.004, 120), (0.88, 0.4, 0.003, 150), (0.7, 0.9, 0.003, 110)]:
        r = fr * size
        d.ellipse([fx * size - r, fy * size - r, fx * size + r, fy * size + r], fill=(255, 255, 255, a))
    return img


def crescent_mask(size, cx, cy, r):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    cut = Image.new("L", (size, size), 0)
    dc = ImageDraw.Draw(cut)
    ox, oy, orr = cx + r * 0.42, cy - r * 0.30, r * 0.86
    dc.ellipse([ox - orr, oy - orr, ox + orr, oy + orr], fill=255)
    return ImageChops.subtract(m, cut)


def sparkle(size, cx, cy, r):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.26
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=255)
    return m


def vgradient(size, top, bottom):
    g = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(g)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(top, bottom, y / size))
    return g


def emblem(size, backdrop=None):
    """Glass disc + crescent + star, centred, on a transparent layer.

    backdrop: if given, the disc shows a blurred copy of it (true frosted glass).
    """
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    c = size / 2
    disc_r = size * 0.36

    disc = Image.new("L", (size, size), 0)
    ImageDraw.Draw(disc).ellipse([c - disc_r, c - disc_r, c + disc_r, c + disc_r], fill=255)

    # Frosted body.
    if backdrop is not None:
        frost = backdrop.filter(ImageFilter.GaussianBlur(size * 0.04))
        frost.putalpha(disc)
        layer = Image.alpha_composite(layer, frost)
    body = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    body.putalpha(disc.point(lambda v: int(v * 0.13)))
    layer = Image.alpha_composite(layer, body)

    # Top sheen.
    sheen = vgradient(size, (255, 255, 255), (255, 255, 255))
    sheen_mask = Image.new("L", (size, size), 0)
    sd = ImageDraw.Draw(sheen_mask)
    for y in range(int(c - disc_r), int(c + disc_r)):
        t = (y - (c - disc_r)) / (2 * disc_r)
        sd.line([(0, y), (size, y)], fill=int(255 * max(0.0, 0.22 * (1 - t * 1.8))))
    sheen.putalpha(ImageChops.multiply(sheen_mask, disc))
    layer = Image.alpha_composite(layer, sheen)

    # Light edge: brighter at the top, faint at the bottom.
    ring = Image.new("L", (size, size), 0)
    w = max(2, int(size * 0.006))
    ImageDraw.Draw(ring).ellipse([c - disc_r, c - disc_r, c + disc_r, c + disc_r], outline=255, width=w)
    edge_fade = Image.new("L", (size, size), 0)
    ed = ImageDraw.Draw(edge_fade)
    for y in range(size):
        t = (y - (c - disc_r)) / (2 * disc_r)
        ed.line([(0, y), (size, y)], fill=int(255 * min(1, max(0.18, 0.75 - 0.6 * t))))
    edge = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    edge.putalpha(ImageChops.multiply(ring, edge_fade))
    layer = Image.alpha_composite(layer, edge)

    # Crescent: warm gold gradient with a soft glow.
    cr = size * 0.215
    ccx, ccy = c - size * 0.025, c + size * 0.01
    cm = crescent_mask(size, ccx, ccy, cr)
    glow = Image.new("RGBA", (size, size), (255, 200, 120, 0))
    glow.putalpha(cm.filter(ImageFilter.GaussianBlur(size * 0.03)).point(lambda v: int(v * 0.7)))
    layer = Image.alpha_composite(layer, glow)
    fill = vgradient(size, (255, 244, 214), (240, 178, 92))
    fill.putalpha(cm)
    layer = Image.alpha_composite(layer, fill)

    # Star in the crescent's opening.
    sm = sparkle(size, c + size * 0.13, c - size * 0.11, size * 0.065)
    sglow = Image.new("RGBA", (size, size), (255, 236, 190, 0))
    sglow.putalpha(sm.filter(ImageFilter.GaussianBlur(size * 0.015)))
    layer = Image.alpha_composite(layer, sglow)
    star = Image.new("RGBA", (size, size), (255, 250, 236, 0))
    star.putalpha(sm)
    layer = Image.alpha_composite(layer, star)
    return layer, cm, sm


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
    print("wrote", name, size)


def main():
    big = 1024 * SS // 2  # 2048 working size keeps the script quick
    bg = sky(big)

    # Full icon (iOS, legacy Android, store listing).
    em, _, _ = emblem(big, backdrop=bg)
    save(Image.alpha_composite(bg, em), "icon.png", 1024)

    # Android adaptive: background and a smaller foreground inside the safe zone.
    save(bg, "android-icon-background.png", 1024)
    em_small, cm, sm = emblem(big)
    fg = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    scaled = em_small.resize((int(big * 0.8), int(big * 0.8)), Image.LANCZOS)
    off = (big - scaled.width) // 2
    fg.paste(scaled, (off, off), scaled)
    save(fg, "android-icon-foreground.png", 1024)

    # Monochrome (themed icons): crescent + star silhouette.
    mono_mask = ImageChops.lighter(cm, sm)
    mono = Image.new("RGBA", (big, big), (255, 255, 255, 0))
    mono.putalpha(mono_mask)
    ms = mono.resize((int(big * 0.8), int(big * 0.8)), Image.LANCZOS)
    mono_out = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    mono_out.paste(ms, (off, off), ms)
    save(mono_out, "android-icon-monochrome.png", 1024)

    # Splash: emblem only, transparent; background colour comes from app.json.
    save(em_small, "splash-icon.png", 1024)
    save(Image.alpha_composite(bg, em), "favicon.png", 48)


if __name__ == "__main__":
    main()
