"""Izrezuje elemente s magenta pozadine (chroma key), uklanja magenta rub i sprema WebP."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
A = '/mnt/user-data/attachments/d0049d8f-34eb-5d03-b489-fe414f5ca31b/'
OUT = sys.argv[1]
import json
JOBS = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {
  'logo': 'daa123e3', 'token': '1337bad4', 'round': '359881e2',
  'ans-red': '19776893', 'ans-gold': '0bce6966', 'ans-blue': '63377e15', 'ans-green': '75b15fbd',
  'btn-purple': 'f4c01da5', 'btn-blue': '4b1aaa63', 'btn-green': '2ec64673', 'btn-orange': '1f6c7ca9', 'btn-wood': '0bc35c64',
  'panel': '4b722bae', 'parch': '9c4c240c',
}
for name, f in JOBS.items():
    a = np.asarray(Image.open(A + f + '-image.png').convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # koliko je piksel "magenta": r i b visoki, g nizak
    mag = np.minimum(r, b) - g
    alpha = np.clip(1 - (mag - 60) / 110, 0, 1)
    # samo pozadina spojena s rubom slike je prozirna (unutarnji ljubičasti dijelovi ostaju)
    bgmask = alpha < 0.5
    lab, n = ndimage.label(bgmask)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(edge))
    near = ndimage.binary_dilation(outside, iterations=3)
    alpha = np.where(outside, 0, np.where(near, alpha, 1))
    # zatvorene rupe jarke magente (npr. između listova) također su prozirne
    strict = np.clip(1 - (mag - 120) / 60, 0, 1)
    hole = ndimage.binary_dilation(strict < 0.5, iterations=2)
    alpha = np.minimum(alpha, np.where(hole, np.minimum(strict, np.clip(1 - (mag - 60) / 110, 0, 1)), 1))
    near = near | hole
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
    # makni magenta odsjaj s rubova
    spill = near & (np.minimum(r, b) > g + 25)
    m = np.minimum(r, b)
    cap = g + 25
    r2 = np.where(spill, np.minimum(r, np.maximum(cap, g + (r - m))), r)
    b2 = np.where(spill, np.minimum(b, cap), b)
    rgb = np.dstack([r2, g, b2])
    img = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    img = img.crop(img.getbbox())
    img.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    print(name, img.size)
for name, f, size in ([] if len(sys.argv) > 2 else [('bg-p', '67429d56', (1080, 1920)), ('bg-l', '95331f16', (1920, 1080))]):
    Image.open(A + f + '-image.png').convert('RGB').resize(size, Image.LANCZOS).save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=80, method=6)
    print(name)
