"""Generate Android launcher icons + favicon for DoNow.

Design: green primary gradient (#10b981 -> #34d399, top-left to bottom-right)
on a rounded square, with a bold white checkmark.

Run from project root: python scripts/generate_icons.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

C1 = (0x10, 0xb9, 0x81)  # primary
C2 = (0x34, 0xd3, 0x99)  # primary-light

LAUNCHER_PX = {
    'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192,
}
FOREGROUND_PX = {
    'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432,
}


def make_gradient(size):
    """Diagonal linear gradient from C1 (top-left) to C2 (bottom-right)."""
    img = Image.new('RGB', (size, size))
    px = img.load()
    denom = max(1, 2 * (size - 1))
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            r = int(C1[0] + (C2[0] - C1[0]) * t)
            g = int(C1[1] + (C2[1] - C1[1]) * t)
            b = int(C1[2] + (C2[2] - C1[2]) * t)
            px[x, y] = (r, g, b)
    return img.convert('RGBA')


def draw_check(draw, size, cx_frac=0.5, cy_frac=0.5, scale=1.0, stroke_frac=0.10):
    """Draw a bold white checkmark centered at (cx_frac*size, cy_frac*size)."""
    # checkmark anchor points in normalized [0,1] x [0,1] space within a bounding box
    pts_norm = [(0.20, 0.55), (0.42, 0.78), (0.80, 0.30)]
    box = size * scale
    cx, cy = cx_frac * size, cy_frac * size
    x0, y0 = cx - box / 2, cy - box / 2
    pts = [(x0 + nx * box, y0 + ny * box) for (nx, ny) in pts_norm]
    stroke = max(2, int(size * stroke_frac))

    # main strokes
    draw.line([pts[0], pts[1]], fill='white', width=stroke)
    draw.line([pts[1], pts[2]], fill='white', width=stroke)
    # rounded caps + join
    r = stroke // 2
    for p in pts:
        draw.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill='white')


def make_full_icon(size, rounded=True):
    """Full launcher icon: gradient + rounded mask + checkmark."""
    grad = make_gradient(size)
    if rounded:
        radius = int(size * 0.22)
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius, fill=255)
        grad.putalpha(mask)
    else:
        grad.putalpha(255)
    draw = ImageDraw.Draw(grad)
    draw_check(draw, size, scale=0.55, stroke_frac=0.10)
    return grad


def make_round_icon(size):
    """Circular icon for ic_launcher_round.png."""
    grad = make_gradient(size)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    grad.putalpha(mask)
    draw = ImageDraw.Draw(grad)
    draw_check(draw, size, scale=0.55, stroke_frac=0.10)
    return grad


def make_foreground(size):
    """Adaptive-icon foreground: transparent bg, checkmark in 72dp safe zone (out of 108dp)."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Safe zone in adaptive icons is the inner 72/108 = 66.7% of canvas.
    # Scale checkmark to fit comfortably in that.
    inner_scale = (72 / 108) * 0.55
    draw_check(draw, size, scale=inner_scale, stroke_frac=(72 / 108) * 0.10)
    return img


def main():
    # 1. Per-density launcher PNGs (full + round)
    for density, px in LAUNCHER_PX.items():
        out_dir = os.path.join(RES, f'mipmap-{density}')
        os.makedirs(out_dir, exist_ok=True)
        full = make_full_icon(px)
        full.save(os.path.join(out_dir, 'ic_launcher.png'))
        rnd = make_round_icon(px)
        rnd.save(os.path.join(out_dir, 'ic_launcher_round.png'))
        print(f'  wrote {density} launcher ({px}px)')

    # 2. Per-density adaptive-icon foregrounds
    for density, px in FOREGROUND_PX.items():
        out_dir = os.path.join(RES, f'mipmap-{density}')
        os.makedirs(out_dir, exist_ok=True)
        fg = make_foreground(px)
        fg.save(os.path.join(out_dir, 'ic_launcher_foreground.png'))
        print(f'  wrote {density} foreground ({px}px)')

    # 3. 512x512 master (Play Store / general use)
    master = make_full_icon(512)
    master.save(os.path.join(ROOT, 'icon-512.png'))
    print('  wrote icon-512.png')


if __name__ == '__main__':
    main()
