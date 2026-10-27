"""Izreže sve elemente s magenta lista u zasebne WebP datoteke (redom: gore-dolje, lijevo-desno)."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src, out, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mag = np.minimum(r, b) - g
alpha = np.clip(1 - (mag - 60) / 110, 0, 1)
strict = np.clip(1 - (mag - 120) / 60, 0, 1)
fg = alpha > 0.5
lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=3))
objs = ndimage.find_objects(lab)
items = []
for i, sl in enumerate(objs):
    if (sl[0].stop - sl[0].start) * (sl[1].stop - sl[1].start) < 4000: continue
    items.append((sl, i + 1))
rows = sorted(items, key=lambda t: t[0][0].start)
# grupiraj u redove po vertikali
groups, cur = [], []
for t in rows:
    if cur and t[0][0].start > max(c[0][0].stop for c in cur) - 20: groups.append(cur); cur = []
    cur.append(t)
if cur: groups.append(cur)
k = 0
for grp in groups:
    for sl, idx in sorted(grp, key=lambda t: t[0][1].start):
        own = ndimage.binary_dilation(lab == idx, iterations=2)
        al = np.where(own, np.minimum(alpha, np.maximum(strict, alpha)), 0)[sl]
        near = ndimage.binary_dilation(~(al > 0.5), iterations=3)
        rr, gg, bb = r[sl], g[sl], b[sl]
        cap = gg + 25
        spill = near & (np.minimum(rr, bb) > cap)
        rr = np.where(spill, np.minimum(rr, np.maximum(cap, rr - (np.minimum(rr, bb) - cap))), rr)
        bb = np.where(spill, np.minimum(bb, cap), bb)
        al = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5))).astype(np.float32)
        img = Image.fromarray(np.dstack([rr, gg, bb, al]).astype(np.uint8), 'RGBA')
        img = img.crop(img.getbbox())
        name = '%s%02d.webp' % (prefix, k); img.save(os.path.join(out, name), 'WEBP', quality=90, method=6)
        print(name, img.size); k += 1
