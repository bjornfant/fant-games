#!/usr/bin/env python3
"""Gör en Midjourney-sprite (på platt magenta) spelklar.
Användning: python3 tools/process-sprite.py <bild> <namn>      t.ex.  python3 tools/process-sprite.py bumper1_mj.png bumper1
Gör: tar bort magenta-bakgrunden (mjuk kant + avfärgning av magentakanter) och skalar till exakt storlek
enligt art/mock/manifest.json. Sparar art/source/<namn>.png.
Bildens proportioner måste vara lika som mockens (använd samma --ar), annars sträcks den."""
import json, sys, os
import numpy as np
from PIL import Image

src, name = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(__file__), '..')
m = json.load(open(os.path.join(root, 'art', 'mock', 'manifest.json')))[name]
im = Image.open(src).convert('RGB')
ar_in, ar_out = im.width / im.height, m['w'] / m['h']
if abs(ar_in / ar_out - 1) > 0.05:
    print(f'Varning: proportionerna är {ar_in:.2f}, mockens är {ar_out:.2f}. Bilden sträcks.')
a = np.asarray(im).astype(np.float32)
dist = np.linalg.norm(a - np.array([255, 0, 255], np.float32), axis=2)
alpha = np.clip((dist - 70) / 90, 0, 1)
# avfärga magentakanter: dra ned röd/blå där de sticker ut över grönt
spill = np.clip(1 - alpha, 0, 1)[..., None]
mx = np.maximum(a[..., 1:2], 0)
a2 = a.copy()
a2[..., 0:1] = np.minimum(a[..., 0:1], (1 - spill) * a[..., 0:1] + spill * (mx + 30))
a2[..., 2:3] = np.minimum(a[..., 2:3], (1 - spill) * a[..., 2:3] + spill * (mx + 30))
out = np.dstack([np.clip(a2, 0, 255), alpha * 255]).astype(np.uint8)
res = Image.fromarray(out, 'RGBA').resize((int(m['w']), int(m['h'])), Image.LANCZOS)
dst = os.path.join(root, 'art', 'source', name + '.png')
res.save(dst)
print('Skrev', dst, res.size)
