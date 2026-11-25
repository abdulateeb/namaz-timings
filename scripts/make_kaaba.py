"""Render a realistic Kaaba (isometric, seen slightly from above) for the compass.

Black kiswa cloth with soft folds and woven texture, the gold hizam band with
calligraphy-like detail, the gold door on the lit face, a stone roof, soft
edge highlights and a contact shadow. Output: assets/kaaba.png (transparent).

Run from the project root:  python -I scripts/make_kaaba.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
S = 1024
rng = np.random.default_rng(7)

# Cube corners (top face rhombus T, R, B, L; walls drop by HGT).
T, R, B, L = (512, 150), (880, 330), (512, 510), (144, 330)
HGT = 430
TW, TH = 900, 940  # flat texture size per wall


def kiswa(tw, th, lit):
    """Black cloth: woven grain, vertical drape folds, gold band, faint lower band."""
    yy, xx = np.mgrid[0:th, 0:tw]
    u, v = xx / tw, yy / th
    weave = rng.normal(0, 1, (th, tw)) * 0.018
    folds = 0.035 * np.sin(u * 2 * np.pi * 5.5 + np.sin(v * 3) * 0.6) + 0.02 * np.sin(u * 2 * np.pi * 13 + 1.7)
    shade = 0.075 + folds + weave + 0.03 * (1 - v)  # slightly lighter near the top
    img = np.stack([shade, shade, shade * 1.04], axis=2) * lit

    def gold_band(v0, v1, rich):
        band = (v >= v0) & (v <= v1)
        t = (v - v0) / (v1 - v0)
        base = np.stack([0.86 - 0.18 * t, 0.68 - 0.2 * t, 0.30 - 0.12 * t], axis=2) * (0.9 + 0.2 * lit)
        img[band] = base[band]
        if rich:
            # Calligraphy: rows of short dark-gold flourishes inside the band.
            m = Image.new("L", (tw, th), 0)
            d = ImageDraw.Draw(m)
            y0, y1 = v0 * th, v1 * th
            for x in np.arange(14, tw - 14, 22):
                for row in (0.35, 0.68):
                    cy = y0 + (y1 - y0) * row
                    w = rng.uniform(6, 14)
                    d.arc([x - w, cy - w * 0.7, x + w, cy + w * 0.7], start=rng.uniform(0, 180), end=rng.uniform(200, 360), fill=255, width=3)
                d.line([(x + 9, y0 + 6), (x + 9, y1 - 6)], fill=160, width=2)
            pat = np.asarray(m.filter(ImageFilter.GaussianBlur(0.6)), dtype=float) / 255
            img[...] = img * (1 - pat[..., None] * 0.45 * band[..., None])
            # Thin bright rims along the band edges.
            for e in (v0, v1):
                rim = np.abs(v - e) < 0.004
                img[rim] = np.array([1.0, 0.9, 0.55]) * (0.9 + 0.1 * lit)

    gold_band(0.2, 0.31, True)
    gold_band(0.36, 0.375, False)
    return np.clip(img, 0, 1)


def door(img, lit):
    """Gold door with raised panels, low on the wall."""
    th, tw = img.shape[:2]
    x0, x1, y0, y1 = int(tw * 0.14), int(tw * 0.36), int(th * 0.47), int(th * 0.97)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    t = (yy - y0) / (y1 - y0)
    g = np.stack([0.95 - 0.25 * t, 0.77 - 0.25 * t, 0.36 - 0.15 * t], axis=2) * (0.85 + 0.2 * lit)
    img[y0:y1, x0:x1] = g
    # Panels and frame lines.
    m = Image.new("L", (tw, th), 0)
    d = ImageDraw.Draw(m)
    d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=255, width=8)
    mid = (x0 + x1) // 2
    d.line([(mid, y0), (mid, y1)], fill=255, width=6)
    for k in range(1, 5):
        y = y0 + (y1 - y0) * k / 5
        d.line([(x0 + 14, y), (x1 - 14, y)], fill=180, width=4)
    pat = np.asarray(m, dtype=float) / 255
    img[...] = img * (1 - pat[..., None] * 0.35)
    return img


def wall_to_canvas(tex, p0, p1):
    """Affine-map a flat wall texture onto the parallelogram p0 -> p1, dropping HGT."""
    th, tw = tex.shape[:2]
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    a, b, c = tw / dx, 0, -p0[0] * tw / dx
    d, e = -dy * th / (dx * HGT), th / HGT
    f = -p0[1] * th / HGT + p0[0] * dy * th / (dx * HGT)
    src = Image.fromarray((np.clip(tex, 0, 1) * 255).astype(np.uint8), "RGB")
    return src.transform((S, S), Image.AFFINE, (a, b, c, d, e, f), resample=Image.BICUBIC)


def poly_mask(pts, blur=0.0):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


def main():
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # Contact shadow on the ground.
    sh = Image.new("L", (S, S), 0)
    ImageDraw.Draw(sh).ellipse([150, 780, 900, 1000], fill=150)
    canvas = Image.alpha_composite(canvas, Image.merge("RGBA", [Image.new("L", (S, S), 0)] * 3 + [sh.filter(ImageFilter.GaussianBlur(40))]))

    def down(p):
        return (p[0], p[1] + HGT)

    # Left wall (shadow side) and right wall (lit side, with the door).
    left = kiswa(TW, TH, 0.78)
    right = door(kiswa(TW, TH, 1.25), 1.25)
    for tex, p0, p1 in ((left, L, B), (right, B, R)):
        face = wall_to_canvas(tex, p0, p1).convert("RGBA")
        face.putalpha(poly_mask([p0, p1, down(p1), down(p0)]))
        canvas = Image.alpha_composite(canvas, face)

    # Roof: dark stone with a soft gradient and a low parapet line.
    roof = np.zeros((S, S, 3))
    yy, xx = np.mgrid[0:S, 0:S]
    t = np.clip((yy - T[1]) / (B[1] - T[1]), 0, 1)
    roof[...] = (np.array([0.36, 0.35, 0.33]) - 0.08 * t[..., None]) + rng.normal(0, 0.012, (S, S, 1))
    roof_img = Image.fromarray((np.clip(roof, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
    roof_img.putalpha(poly_mask([T, R, B, L]))
    canvas = Image.alpha_composite(canvas, roof_img)

    # Edge light: thin highlights on the top edges and the front vertical edge.
    edges = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(edges)
    d.line([L, T, R], fill=120, width=4)
    d.line([L, B, R], fill=200, width=5)
    d.line([B, down(B)], fill=90, width=4)
    hl = Image.new("RGBA", (S, S), (255, 240, 210, 0))
    hl.putalpha(edges.filter(ImageFilter.GaussianBlur(1.5)))
    canvas = Image.alpha_composite(canvas, hl)

    # Trim to content and save.
    box = canvas.getbbox()
    out = canvas.crop(box)
    side = max(out.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
    sq.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "kaaba.png"))
    print("wrote kaaba.png")


if __name__ == "__main__":
    main()
