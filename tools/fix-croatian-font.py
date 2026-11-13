#!/usr/bin/env python3
"""Reproduce the narrow Croatian glyph correction (requires fonttools[woff])."""
import argparse
import hashlib
from pathlib import Path
from fontTools.ttLib import TTFont

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument('font', type=Path, help='original bundled cinzel-800-latin-ext.woff2')
args = ap.parse_args()
EXPECTED = '6ec952a839edaadbfe17dfe61f3d28208c06bd12dee62b874570a99557be0678'
if hashlib.sha256(args.font.read_bytes()).hexdigest() != EXPECTED:
    raise SystemExit('Unrecognized source font; no changes made')
f = TTFont(args.font, recalcTimestamp=False)
f['head'].modified = 3877403658
for glyph, old, new in [('Dcroat', (125, 92), (-125, -390)), ('dcroat', (73, -7), (-138, -440))]:
    part = f['glyf'][glyph].components[1]
    if part.glyphName != 'uni0304' or (part.x, part.y) != old:
        raise SystemExit('Unexpected glyph structure; no changes made')
    part.x, part.y = new
for record in f['name'].names:
    try:
        value = record.toUnicode()
    except UnicodeError:
        continue
    if record.nameID in [1, 4, 16]:
        value = value.replace('Cinzel', 'Tavern Cinzel')
    elif record.nameID == 6:
        value = value.replace('Cinzel', 'TavernCinzel')
    elif record.nameID == 5:
        value += '; Tavern Croatian crossbar correction 1'
    else:
        continue
    record.string = value.encode(record.getEncoding())
f.save(args.font)
print('Corrected Đ/đ crossbars and renamed internal derivative family')
