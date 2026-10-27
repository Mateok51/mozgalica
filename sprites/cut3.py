# Izreže 6 poza (3x2) iz sheeta, ukloni pozadinu (ISNet, onnxruntime), makne natpise ispod poza, spremi chars/<ime>/<poza>.webp
import sys, os, numpy as np, onnxruntime as ort
from PIL import Image
from scipy import ndimage
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sess = ort.InferenceSession('/tmp/claude-0/models/isnet.onnx')
POSES = [['idle', 'happy', 'sad'], ['shocked', 'attack', 'victory']]
OUT = 480; PAD = int(OUT * 8 / 360); BOT = OUT - PAD

def mask_of(im):
    x = np.asarray(im.convert('RGB').resize((1024, 1024), Image.BILINEAR)).astype(np.float32)
    x = x / max(1.0, x.max())
    x = (x - np.array([0.485, 0.456, 0.406])) / np.array([1.0, 1.0, 1.0])
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    y = sess.run(None, {'input_image': x})[0][0, 0]
    y = (y - y.min()) / max(1e-6, y.max() - y.min())
    return np.asarray(Image.fromarray((y * 255).astype(np.uint8)).resize(im.size, Image.BILINEAR)).astype(np.float32) / 255

def cut(name, src):
    sheet = Image.open(src).convert('RGB'); W, H = sheet.size
    os.makedirs(SP + '/chars/' + name, exist_ok=True)
    for r in range(2):
        for c in range(3):
            box = (round(c * W / 3) + 4, round(r * H / 2) + 4, round((c + 1) * W / 3) - 4, round((r + 1) * H / 2) - 4)
            cell = sheet.crop(box); cw, ch = cell.size
            m = mask_of(cell)
            hard = m > 0.35
            lab, n = ndimage.label(hard)
            if n == 0: continue
            areas = ndimage.sum(hard, lab, range(1, n + 1))
            big = areas.max()
            keep = np.zeros_like(hard)
            objs = ndimage.find_objects(lab)
            for i, a in enumerate(areas):
                sl = objs[i]
                top = sl[0].start
                # natpis: mali dijelovi u donjih 16% ćelije; zadrži tijelo i veće odvojene dijelove (štap, magija)
                if a == big or (a >= 0.02 * big and top < ch * 0.84):
                    keep |= lab == (i + 1)
            keep = ndimage.binary_dilation(keep, iterations=6)
            alpha = np.clip((m - 0.08) / 0.84, 0, 1) * keep
            rgba = np.dstack([np.asarray(cell), (alpha * 255).astype(np.uint8)])
            im = Image.fromarray(rgba, 'RGBA')
            bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
            im = im.crop(bb)
            s = min((OUT - 2 * PAD) / im.width, (BOT - PAD) / im.height)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            can = Image.new('RGBA', (OUT, OUT), (0, 0, 0, 0))
            can.paste(im, ((OUT - im.width) // 2, BOT - im.height), im)
            can.save(SP + '/chars/' + name + '/' + POSES[r][c] + '.webp', quality=90, method=6)
    print(name, 'ok')

for a in sys.argv[1:]:
    cut(a, SP + '/chars-src/' + a + '.png')
