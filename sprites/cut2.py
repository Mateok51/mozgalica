"""Izrezuje 6 poza s lista lika (natpisi i sjene na podu se uklanjaju) i sprema WebP slike.
Upotreba: python3 cut2.py <slika> <izlazna_mapa>"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W = a.shape[:2]
edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
bg = np.median(edge, axis=0)
dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
mx, mn = a.max(axis=2), a.min(axis=2)
sat = mx - mn
score = np.maximum(dist, sat * 1.4)
fg = score > 22
greyish = (sat < 16) & (mx > 105)          # sjene na podu, ali i svijetli vrhovi krzna
strong = fg & ~greyish                      # za pronalaženje likova (bez sjena koje ih spajaju s natpisima)

lab, n = ndimage.label(ndimage.binary_dilation(strong, iterations=4))
objs = ndimage.find_objects(lab)
blobs = []
for i, sl in enumerate(objs):
    if int((lab[sl] == i + 1).sum()) < 5000:   # natpisi i mrlje
        continue
    blobs.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop, i + 1))
blobs.sort(key=lambda b: ((b[0] + b[1]) / 2 > H / 2, b[2]))
POSES = ['idle', 'happy', 'sad', 'shocked', 'attack', 'victory']
print('pronađeno likova:', len(blobs))
for k, (Y0, Y1, X0, X1, myid) in enumerate(blobs[:6]):
    own = lab == myid
    # dno lika = najniži "jaki" piksel; sive piksele blizu dna smatramo sjenom na podu
    ys = np.where(own[:, X0:X1].any(axis=1))[0]
    yb = ys.max()
    pad = 10
    y0, y1 = max(0, Y0 - pad), min(H, yb + 4)
    x0, x1 = max(0, X0 - pad), min(W, X1 + pad)
    region = ndimage.binary_dilation(own, iterations=6)[y0:y1, x0:x1] & fg[y0:y1, x0:x1]
    rows = np.arange(y0, y1)[:, None]
    shadow = greyish[y0:y1, x0:x1] & (rows > yb - 34)
    keep = region & ~shadow
    sc = score[y0:y1, x0:x1] * keep
    alpha = np.clip((sc - 14) / 26.0, 0, 1)
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))).astype(np.float32) / 255
    crop = a[y0:y1, x0:x1]
    al = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((crop - bg * (1 - al)) / al, 0, 255)
    img = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    bb = img.getbbox()
    img = img.crop(bb)
    S = 360
    scale = min((S - 16) / img.width, (S - 16) / img.height)
    img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(img, ((S - img.width) // 2, S - 8 - img.height), img)
    canvas.save(os.path.join(out, POSES[k] + '.webp'), 'WEBP', quality=88, method=6)
    canvas.save(os.path.join(out, POSES[k] + '.png'))
    print(POSES[k], img.size)
