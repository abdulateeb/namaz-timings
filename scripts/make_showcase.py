"""App Store style showcase images for the README.

Each panel: a bold white headline over a bright sky background, and a real
screenshot of the app inside a phone frame that tilts and bleeds off the
bottom edge. A wide banner joins all panels with rounded corners.

Inputs : docs/shots/*.png  (raw phone screenshots, 1260 x 2800)
Outputs: docs/images/panel-*.png and docs/images/banner.png

Run from the project root:  python -I scripts/make_showcase.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import make_backgrounds as mb  # noqa: E402

SHOTS = os.path.join(ROOT, "docs", "shots")
OUT = os.path.join(ROOT, "docs", "images")
FONT = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "inter", "800ExtraBold", "Inter_800ExtraBold.ttf")
FONT_SUB = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "inter", "500Medium", "Inter_500Medium.ttf")

PW, PH = 1080, 2160  # panel size
os.makedirs(OUT, exist_ok=True)


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float) / 255


def background(kind, seed):
    """Bright blue gradient (reference 1) or blue sky with soft clouds (reference 2)."""
    yy, xx = np.mgrid[0:PH, 0:PW]
    t = (yy / PH)[..., None]
    if kind == "gradient":
        top, bottom = hexc("#2F6FE4"), hexc("#7FB4FF")
        img = top + (bottom - top) * t
        # Soft light blobs, like the glassy shapes in the reference.
        for (cx, cy, r, a) in [(0.15, 0.2, 0.45, 0.18), (0.9, 0.55, 0.5, 0.16), (0.4, 0.95, 0.55, 0.2)]:
            d = np.sqrt((xx / PW - cx) ** 2 + (yy / PH - cy) ** 2 * 0.3) / r
            img = img + (np.exp(-d * d) * a)[..., None]
    else:
        top, bottom = hexc("#3E8EF0"), hexc("#CFE6FA")
        img = top + (bottom - top) * t
        mb.rng = np.random.default_rng(seed)
        w, h = PW // 3, PH // 3
        n = mb.warped_fbm(w, h, 40, 6, 30)
        yy3 = np.mgrid[0:h, 0:w][0] / h
        dens = mb.smoothstep(0.5, 0.75, n + 0.25 * np.exp(-((yy3 - 0.78) / 0.12) ** 2) - 0.08)
        dens = np.asarray(Image.fromarray((dens * 255).astype(np.uint8)).resize((PW, PH), Image.BICUBIC), dtype=float) / 255
        shade = np.asarray(Image.fromarray((np.clip(n, 0, 1) * 255).astype(np.uint8)).resize((PW, PH), Image.BICUBIC), dtype=float) / 255
        cloud = hexc("#FFFFFF") * (0.88 + 0.12 * shade[..., None]) - hexc("#203050") * 0.08 * (1 - shade[..., None])
        img = img * (1 - dens[..., None]) + cloud * dens[..., None]
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")


def status_bar(shot):
    """Clean status bar in the top inset: 9:41, signal, Wi-Fi, full battery."""
    s = shot.width / 1260  # drawn for a 1260 px wide screenshot
    d = ImageDraw.Draw(shot)
    white = (255, 255, 255, 255)
    f = ImageFont.truetype(FONT_SUB.replace("500Medium", "600SemiBold").replace("Inter_500Medium", "Inter_600SemiBold"), int(44 * s))
    d.text((int(84 * s), int(38 * s)), "9:41", font=f, fill=white)
    right = shot.width - int(84 * s)
    # Battery.
    bw, bh, by = int(62 * s), int(30 * s), int(50 * s)
    bx = right - bw
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=int(8 * s), outline=white, width=max(2, int(3 * s)))
    d.rounded_rectangle([bx + int(5 * s), by + int(5 * s), bx + bw - int(5 * s), by + bh - int(5 * s)], radius=int(4 * s), fill=white)
    d.rounded_rectangle([bx + bw + int(3 * s), by + int(9 * s), bx + bw + int(8 * s), by + bh - int(9 * s)], radius=int(2 * s), fill=white)
    # Wi-Fi: three arcs and a dot.
    wx, wy = bx - int(62 * s), by + int(26 * s)
    for k, r in enumerate((30, 20, 10)):
        r = int(r * s)
        d.arc([wx - r, wy - r, wx + r, wy + r], 225, 315, fill=white, width=max(2, int(5 * s)))
    d.ellipse([wx - int(4 * s), wy - int(4 * s), wx + int(4 * s), wy + int(4 * s)], fill=white)
    # Signal bars.
    sx = wx - int(96 * s)
    for k in range(4):
        h = int((10 + 7 * k) * s)
        x = sx + k * int(13 * s)
        d.rounded_rectangle([x, by + bh - h, x + int(8 * s), by + bh], radius=int(2 * s), fill=white)
    return shot


def phone(shot_path, width):
    """Screenshot inside a black phone frame with rounded corners and a camera hole."""
    shot = status_bar(Image.open(shot_path).convert("RGBA"))
    sw = width - 2 * int(width * 0.035)
    sh = int(shot.height * sw / shot.width)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    bez = int(width * 0.035)
    fw, fh = width, sh + 2 * bez
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle([0, 0, fw - 1, fh - 1], radius=int(width * 0.14), fill=(14, 15, 18, 255))
    d.rounded_rectangle([2, 2, fw - 3, fh - 3], radius=int(width * 0.14), outline=(70, 72, 80, 255), width=3)
    m = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=int(width * 0.11), fill=255)
    frame.paste(shot, (bez, bez), m)
    cr = int(width * 0.018)
    d.ellipse([fw // 2 - cr, bez + cr, fw // 2 + cr, bez + 3 * cr], fill=(8, 8, 10, 255))
    return frame


def drop_shadow(img, blur, opacity, offset):
    a = img.getchannel("A").point(lambda v: int(v * opacity))
    sh = Image.new("RGBA", img.size, (10, 25, 60, 0))
    sh.putalpha(a)
    pad = blur * 3
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(sh, (pad + offset[0], pad + offset[1]), sh)
    canvas = canvas.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(img, (pad, pad))
    return canvas, pad


# ---------------------------------------------------------------------------
# One continuous scene, sliced into panels (like the reference: art and
# floating elements cross from one panel into the next).

GAP = 64                      # strip hidden between panels
N = 4
CW = N * PW + (N - 1) * GAP   # canvas width
X0 = [i * (PW + GAP) for i in range(N)]
FONT_HEAD = FONT
FONT_CHIP = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "inter", "700Bold", "Inter_700Bold.ttf")
KAABA = os.path.join(ROOT, "assets", "kaaba.png")


def scene_background():
    """Vivid blue, light glow at the top, soft realistic clouds low down."""
    yy, xx = np.mgrid[0:PH, 0:CW // 4]
    t = (yy / PH)[..., None]
    top, mid, bot = hexc("#1559DE"), hexc("#3C8CF5"), hexc("#A9D3FF")
    img = np.where(t < 0.6, top + (mid - top) * (t / 0.6), mid + (bot - mid) * ((t - 0.6) / 0.4))
    small = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGB").resize((CW, PH), Image.BICUBIC)
    img = np.asarray(small, dtype=float) / 255
    yy, xx = np.mgrid[0:PH, 0:CW]
    # Soft light pools like studio lighting.
    for (cx, cy, r, a) in [(0.12, 0.05, 0.25, 0.25), (0.45, 0.0, 0.22, 0.2), (0.8, 0.08, 0.25, 0.22), (0.6, 0.55, 0.3, 0.12)]:
        d = np.sqrt(((xx / CW - cx) * CW / PH) ** 2 + (yy / PH - cy) ** 2) / r
        img = img + (np.exp(-d * d) * a)[..., None]
    # Clouds: a low bank plus a few wisps, rendered small and scaled up.
    mb.rng = np.random.default_rng(21)
    w, h = CW // 6, PH // 6
    n = mb.warped_fbm(w, h, 34, 6, 26)
    y6 = np.mgrid[0:h, 0:w][0] / h
    dens = mb.smoothstep(0.56, 0.8, n + 0.24 * np.exp(-((y6 - 0.95) / 0.09) ** 2) + 0.1 * np.exp(-((y6 - 0.32) / 0.05) ** 2) - 0.12)
    shade = mb.smoothstep(0.3, 0.9, n)
    dens = np.asarray(Image.fromarray((dens * 255).astype(np.uint8)).resize((CW, PH), Image.BICUBIC), dtype=float) / 255
    shade = np.asarray(Image.fromarray((shade * 255).astype(np.uint8)).resize((CW, PH), Image.BICUBIC), dtype=float) / 255
    cloud = hexc("#FFFFFF") * (0.86 + 0.14 * shade[..., None]) + hexc("#9DB8DA") * 0.0
    cloud = cloud - (1 - shade[..., None]) * 0.1 * hexc("#3050A0")
    img = img * (1 - dens[..., None]) + cloud * dens[..., None]
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")


def text_block(canvas, x0, y, title, sub, size=108):
    f = ImageFont.truetype(FONT_HEAD, size)
    d = ImageDraw.Draw(canvas)
    for line in title.split("\n"):
        w = d.textlength(line, font=f)
        x = x0 + (PW - w) / 2
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((x, y + 8), line, font=f, fill=(8, 30, 90, 110))
        canvas.alpha_composite(sh.crop((int(x0) - 40, int(y) - 40, int(x0) + PW + 40, int(y) + size + 80)).filter(ImageFilter.GaussianBlur(12)), (int(x0) - 40, int(y) - 40))
        d = ImageDraw.Draw(canvas)
        d.text((x, y), line, font=f, fill=(255, 255, 255, 255))
        y += int(size * 1.08)
    if sub:
        fs = ImageFont.truetype(FONT_SUB, 42)
        w = d.textlength(sub, font=fs)
        sx = x0 + (PW - w) / 2
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((sx, y + 25), sub, font=fs, fill=(8, 30, 90, 150))
        canvas.alpha_composite(sh.crop((int(x0), int(y), int(x0) + PW, int(y) + 120)).filter(ImageFilter.GaussianBlur(6)), (int(x0), int(y)))
        d = ImageDraw.Draw(canvas)
        d.text((sx, y + 22), sub, font=fs, fill=(240, 246, 255, 255))
        y += 90
    return y


def place(canvas, img, x, y, angle=0, shadow=(46, 0.5, (0, 34))):
    """Paste with rotation and a soft drop shadow; x, y = top-left of the element."""
    if angle:
        img = img.rotate(angle, resample=Image.BICUBIC, expand=True)
    sh, pad = drop_shadow(img, *shadow)
    canvas.alpha_composite(sh, (int(x - pad), int(y - pad)))


def rounded_crop(shot_path, box, radius):
    """Cut a rounded rectangle out of a screenshot (a prayer card, a chip...)."""
    im = Image.open(shot_path).convert("RGBA").crop(box)
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
    im.putalpha(m)
    return im


def circle_crop(shot_path, cx, cy, r, ring=(255, 255, 255, 255), ring_w=14):
    im = Image.open(shot_path).convert("RGBA").crop((cx - r, cy - r, cx + r, cy + r))
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, 2 * r - 1, 2 * r - 1], fill=255)
    im.putalpha(m)
    out = Image.new("RGBA", (2 * r + 2 * ring_w, 2 * r + 2 * ring_w), (0, 0, 0, 0))
    ImageDraw.Draw(out).ellipse([0, 0, out.width - 1, out.height - 1], fill=ring)
    out.alpha_composite(im, (ring_w, ring_w))
    return out


def chip(text, dot=None, size=46, bg=(255, 255, 255, 245), fg=(18, 24, 40, 255)):
    f = ImageFont.truetype(FONT_CHIP, size)
    w = int(ImageDraw.Draw(Image.new("RGBA", (1, 1))).textlength(text, font=f))
    padx, h = 38, int(size * 2.1)
    extra = int(size * 0.9) if dot else 0
    im = Image.new("RGBA", (w + padx * 2 + extra, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, im.width - 1, h - 1], radius=h // 2, fill=bg)
    x = padx
    if dot:
        r = size // 3
        d.ellipse([x, h // 2 - r, x + 2 * r, h // 2 + r], fill=dot)
        x += extra
    d.text((x, (h - size) // 2 - size * 0.12), text, font=f, fill=fg)
    return im


def moon_3d(size):
    """Glowing white crescent with a soft silver gradient and a cool halo."""
    s = size * 4  # supersample for smooth edges
    m = Image.new("L", (s, s), 0)
    ImageDraw.Draw(m).ellipse([0, 0, s - 1, s - 1], fill=255)
    cut = Image.new("L", (s, s), 0)
    o = s * 0.43
    ImageDraw.Draw(cut).ellipse([s * 0.5 + s * 0.2 - o, s * 0.5 - s * 0.14 - o, s * 0.5 + s * 0.2 + o, s * 0.5 - s * 0.14 + o], fill=255)
    m = ImageChops.subtract(m, cut).resize((size, size), Image.LANCZOS)
    yy = np.linspace(0, 1, size)[:, None]
    tone = np.clip(1.0 - 0.12 * yy, 0, 1)
    rgb = np.dstack([tone * 0.99, tone * 0.995, np.ones_like(tone) * 1.0] * 1)
    rgb = np.broadcast_to(rgb, (size, size, 3))
    body = Image.fromarray((rgb * 255).astype(np.uint8), "RGB").convert("RGBA")
    body.putalpha(m)
    pad = size // 2
    out = Image.new("RGBA", (size + 2 * pad, size + 2 * pad), (0, 0, 0, 0))
    gm = Image.new("L", out.size, 0)
    gm.paste(m, (pad, pad))
    for blur, amt in ((size // 5, 0.75), (size // 14, 0.6)):
        g = Image.new("RGBA", out.size, (214, 228, 255, 0))
        g.putalpha(gm.filter(ImageFilter.GaussianBlur(blur)).point(lambda v, a=amt: int(v * a)))
        out.alpha_composite(g)
    out.alpha_composite(body, (pad, pad))
    return out


def sparkle(size, color=(255, 255, 255, 255)):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    c, r = size / 2, size / 2
    pts = []
    for i in range(8):
        a = np.pi / 4 * i - np.pi / 2
        rr = r if i % 2 == 0 else r * 0.14
        pts.append((c + rr * np.cos(a), c + rr * np.sin(a)))
    ImageDraw.Draw(im).polygon(pts, fill=color)
    g = im.filter(ImageFilter.GaussianBlur(size / 10))
    g.alpha_composite(im)
    return g


def build():
    canvas = scene_background()
    shot = lambda n: os.path.join(SHOTS, n)  # noqa: E731
    PHW = 700  # phone width

    # Panel 1: prayer times at night. Maghrib card bursts out toward panel 2.
    x = X0[0]
    top = text_block(canvas, x, 150, "Every prayer,\nright on time", "5 daily prayers plus Tahajjud")
    place(canvas, phone(shot("times-night.png"), PHW), x + 120, top + 80)
    moon = moon_3d(230)
    canvas.alpha_composite(moon, (x + 690, top - 30))
    card = rounded_crop(shot("times-night.png"), (48, 2191, 1212, 2513), 72).resize((880, int(880 * 322 / 1164)), Image.LANCZOS)
    place(canvas, card, x + 170, top + 1080, angle=4)

    # Panel 2: a sky for every prayer. A fan of prayer cards rises out of the phone.
    x = X0[1]
    top = text_block(canvas, x, 150, "A sky for\nevery prayer", "Each card shows the sky of its hour")
    place(canvas, phone(shot("times-day.png"), PHW), x + 250, top + 360, angle=-7)
    boxes = [(48, 1113, 1212, 1431), (48, 1470, 1212, 1792), (48, 1831, 1212, 2153)]
    for k, (box, ang) in enumerate(zip(boxes, (9, 3, -4))):
        c = rounded_crop(shot("times-night.png"), box, 72).resize((760, int(760 * (box[3] - box[1]) / 1164)), Image.LANCZOS)
        place(canvas, c, x + 40 + k * 40, top + 120 + k * 210, angle=ang, shadow=(34, 0.45, (0, 24)))

    # Panel 3: Qibla at night. A large Kaaba floats across the panel 2 and 3 edge.
    x = X0[2]
    place(canvas, phone(shot("qibla-night.png"), PHW), x + 190, -340, angle=5)
    kaaba = Image.open(KAABA).convert("RGBA").resize((470, 470), Image.LANCZOS)
    place(canvas, kaaba, x + 30, 900, angle=-8, shadow=(40, 0.55, (0, 40)))
    place(canvas, chip("You are facing the Qibla", dot=(34, 197, 94, 255)), x + 330, 1260, angle=-3, shadow=(30, 0.4, (0, 18)))
    text_block(canvas, x, 1500, "Find the Qibla\nin seconds", "Turn until the Kaaba meets the arrow")

    # Panel 4: the spirit level. The bull's eye pops out as a big badge.
    x = X0[3]
    top = text_block(canvas, x, 150, "Flat phone,\ntrue reading", "The bull's eye turns green when level")
    place(canvas, phone(shot("qibla-day.png"), PHW), x + 300, top + 300, angle=6)
    eye = circle_crop(shot("qibla-day.png"), 630, 1568, 300).resize((500, 500), Image.LANCZOS)
    place(canvas, eye, x + 30, top + 640, shadow=(40, 0.5, (0, 30)))
    place(canvas, chip("Level", dot=(34, 197, 94, 255)), x + 90, top + 1180, angle=4, shadow=(26, 0.4, (0, 16)))

    # A few sparkles across the scene.
    for (sx, sy, s) in [(X0[0] + 90, 520, 70), (X0[1] + 900, 560, 56), (X0[2] + 80, 1480, 60), (X0[3] + 860, 560, 64), (X0[1] - 40, 1900, 48)]:
        canvas.alpha_composite(sparkle(s), (sx, sy))
    return canvas


def slice_and_save(canvas):
    panels = []
    names = ["times-night", "times-day", "qibla-night", "qibla-day"]
    for i, n in enumerate(names):
        p = canvas.crop((X0[i], 0, X0[i] + PW, PH))
        panels.append(p)  # used only inside the banner
    # Banner: panels with rounded corners on a light background.
    tw = 540
    th = int(PH * tw / PW)
    gap, pad = 26, 36
    W = pad * 2 + N * tw + (N - 1) * gap
    out = Image.new("RGBA", (W, pad * 2 + th), (240, 243, 248, 255))
    m = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, tw - 1, th - 1], radius=40, fill=255)
    for i, p in enumerate(panels):
        t = p.resize((tw, th), Image.LANCZOS)
        t.putalpha(m)
        out.alpha_composite(t, (pad + i * (tw + gap), pad))
    out.convert("RGB").save(os.path.join(OUT, "banner.png"), optimize=True)
    print("wrote banner.png")


def plain_screens():
    """Simple screens for the README: the real screen in a phone frame, transparent background."""
    for n in ["times-night", "times-day", "qibla-night", "qibla-day"]:
        ph = phone(os.path.join(SHOTS, f"{n}.png"), 600)
        sh, _ = drop_shadow(ph, 22, 0.28, (0, 14))
        sh.save(os.path.join(OUT, f"screen-{n}.png"), optimize=True)
        print("wrote", f"screen-{n}.png")


if __name__ == "__main__":
    slice_and_save(build())
    plain_screens()
