"""Izrezuje poze s lista likova (3 stupca x 2 reda, natpisi ispod) i uklanja jednoliku pozadinu.
Upotreba: python3 cut.py <slika> <ime_lika> <izlazna_mapa>"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

src, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
H, W = a.shape[:2]
# boja pozadine = medijan rubnih piksela
edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
bg = np.median(edge, axis=0)
dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
# saturacija pomaže razlikovati svijetle dijelove lika od sive pozadine
mx, mn = a.max(axis=2), a.min(axis=2)
sat = (mx - mn)
score = np.maximum(dist, sat * 1.4)
fg = score > 22

POSES = ['idle', 'happy', 'sad', 'shocked', 'attack', 'victory']
from scipy import ndimage
grown = ndimage.binary_dilation(fg, iterations=5)
lab, n = ndimage.label(grown)
objs = ndimage.find_objects(lab)
blobs = []
for i, sl in enumerate(objs):
    area = int((lab[sl] == i + 1).sum())
    if area < 4000:  # natpisi i mrlje
        continue
    blobs.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop, i + 1))
# redovi po vertikalnom središtu, zatim slijeva nadesno
blobs.sort(key=lambda b: ((b[0] + b[1]) / 2 > H / 2, b[2]))
print('pronađeno likova:', len(blobs))
for k, (Y0, Y1, X0, X1, myid) in enumerate(blobs[:6]):
        y0, x0 = 0, 0
        # natpis ispod lika: zadnji uski komad sadržaja odvojen praznim redovima
        rows_on = fg[Y0:Y1, X0:X1].any(axis=1)
        r = len(rows_on) - 1
        while r > 0 and not rows_on[r]: r -= 1
        seg_end = r
        while r > 0 and rows_on[r]: r -= 1
        seg_start = r + 1
        gap = 0
        while r > 0 and not rows_on[r]: r -= 1; gap += 1
        seg = fg[Y0 + seg_start:Y0 + seg_end + 1, X0:X1]
        if gap >= 2 and (seg_end - seg_start) < 45 and seg.any(axis=0).sum() < 0.45 * (X1 - X0):
            Y1 = Y0 + seg_start - 1
        pad = 4
        by0, by1 = max(0, Y0 - pad), min(H, Y1 + 1)
        bx0, bx1 = max(0, X0 - pad), min(W, X1 + pad)
        own = (lab[by0:by1, bx0:bx1] == lab[(Y0 + Y1) // 2, (X0 + X1) // 2]) | True
        crop = a[by0:by1, bx0:bx1]
        sc = score[by0:by1, bx0:bx1] * (lab[by0:by1, bx0:bx1] > 0)
        # zadrži samo piksele ovog lika (ne susjednih natpisa)
        mine = lab[by0:by1, bx0:bx1] == myid
        sc = sc * mine
        # meka alfa: 0 ispod 12, 1 iznad 40
        alpha = np.clip((sc - 12) / 28.0, 0, 1)
        # makni izolirane mrlje šuma
        am = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
        alpha = np.asarray(am).astype(np.float32) / 255
        # ukloni sivi rub (dekontaminacija boje prema pozadini)
        al = np.maximum(alpha, 1e-3)[..., None]
        rgb = np.clip((crop - bg * (1 - al)) / al, 0, 255)
        rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
        img = Image.fromarray(rgba, 'RGBA')
        # stavi na jednako platno 360x360, stopala na istoj liniji
        S = 360
        scale = min((S - 20) / img.width, (S - 20) / img.height, 1.6)
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        canvas.paste(img, ((S - img.width) // 2, S - 10 - img.height), img)
        p = os.path.join(out, f'{name}-{POSES[k]}.png')
        canvas.save(p, optimize=True)
        print(p, img.size)
