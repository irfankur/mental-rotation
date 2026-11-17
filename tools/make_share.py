"""Builds assets/share.png (1200x630 link preview). Run: python tools/make_share.py
Uses the same figure geometry and view maths as js/figures.js."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SS = 2  # supersampling for smooth edges
W, H = 1200 * SS, 630 * SS
BG, FG, MUTED, SUBTLE = (29, 31, 34), (236, 238, 240), (163, 169, 176), (124, 131, 139)
FONT = "C:/Windows/Fonts/segoeui.ttf"
FONT_B = "C:/Windows/Fonts/segoeuib.ttf"

AX = {"x": 0, "y": 1, "z": 2}
SHAPE = [["x", 1, 3], ["y", 1, 2], ["z", 1, 2], ["x", 1, 2]]  # figure B


def build(defn):
    cubes, p = [[0, 0, 0]], [0, 0, 0]
    for axis, d, n in defn:
        for _ in range(n):
            p = p[:]
            p[AX[axis]] += d
            cubes.append(p)
    c = [sum(q[k] for q in cubes) / len(cubes) for k in range(3)]
    return [[q[k] - c[k] for k in range(3)] for q in cubes]


def view(az, el):
    a, e = math.radians(az), math.radians(el)
    ca, sa, ce, se = math.cos(a), math.sin(a), math.cos(e), math.sin(e)

    def T(v):
        x, y, z = v
        x1, z1 = ca * x + sa * z, -sa * x + ca * z
        return [x1, ce * y - se * z1, se * y + ce * z1]
    return T


FACES = [
    ([1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]),
    ([-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]),
    ([0, 1, 0], [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]),
    ([0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]),
    ([0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]),
    ([0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]),
]


def radius(cubes):
    return max(math.dist([0, 0, 0], [q[0] - .5 + (i & 1), q[1] - .5 + ((i >> 1) & 1), q[2] - .5 + ((i >> 2) & 1)])
               for q in cubes for i in range(8))


def draw_figure(img, box, cubes, az, el=30, mirror=False):
    x0, y0, size = box
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x0, y0, x0 + size, y0 + size], radius=28 * SS, fill=(230, 232, 235))
    base = [[-q[0], q[1], q[2]] for q in cubes] if mirror else cubes
    T = view(az, el)
    scale = size * 0.42 / radius(cubes)
    key = lambda q: tuple(round(v) for v in q)
    occ = {key(q) for q in base}
    o = T([0, 0, 0])
    light = [-0.35, 0.8, 0.5]
    ln = math.hypot(*light)
    for q in sorted(base, key=lambda q: T(q)[2]):
        for n, corners in FACES:
            if key([q[k] + n[k] for k in range(3)]) in occ:
                continue
            tn = T(n)
            nz = tn[2] - o[2]
            if nz <= 1e-6:
                continue
            shade = max(0, ((tn[0] - o[0]) * light[0] + (tn[1] - o[1]) * light[1] + nz * light[2]) / ln)
            g = round(105 + 145 * shade)
            pts = []
            for c in corners:
                p = T([q[0] - .5 + c[0], q[1] - .5 + c[1], q[2] - .5 + c[2]])
                pts.append((x0 + size / 2 + p[0] * scale, y0 + size / 2 - p[1] * scale))
            d.polygon(pts, fill=(g, g, min(255, g + 4)), outline=(27, 29, 32), width=3 * SS // 2)


img = Image.new("RGB", (W, H), BG)
cubes = build(SHAPE)
fs = 228 * SS
x1, y1, gap = 640 * SS, 168 * SS, 44 * SS
draw_figure(img, (x1, y1, fs), cubes, 55)
draw_figure(img, (x1 + fs + gap, y1, fs), cubes, 155, mirror=True)
d = ImageDraw.Draw(img)
q = ImageFont.truetype(FONT_B, 40 * SS)
qw = d.textlength("?", font=q)
d.text((x1 + fs + gap / 2 - qw / 2, y1 + fs / 2 - 30 * SS), "?", font=q, fill=MUTED)

d.text((70 * SS, 120 * SS), "Tes Bentuk 3D", font=ImageFont.truetype(FONT_B, 64 * SS), fill=FG)
sub = ImageFont.truetype(FONT, 30 * SS)
d.text((70 * SS, 215 * SS), "Dua bentuk ini sama", font=sub, fill=MUTED)
d.text((70 * SS, 257 * SS), "atau cerminan?", font=sub, fill=MUTED)
d.text((70 * SS, 330 * SS), "Putar bentuknya di kepalamu.", font=ImageFont.truetype(FONT, 26 * SS), fill=SUBTLE)
d.text((70 * SS, 450 * SS), "±8 menit  •  Anonim  •  HP atau laptop", font=ImageFont.truetype(FONT_B, 30 * SS), fill=(168, 168, 168))
d.text((70 * SS, 520 * SS), "Eksperimen psikologi mahasiswa", font=ImageFont.truetype(FONT, 22 * SS), fill=SUBTLE)

img.resize((1200, 630), Image.LANCZOS).save(ROOT / "assets" / "share.png", optimize=True)
print("wrote", ROOT / "assets" / "share.png")
