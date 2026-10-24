#!/usr/bin/env python3
"""Retuscherar bort felstavad text (titelbåge och AIRLOCK) ur en Midjourney-bakgrund.
Användning: python3 tools/clean-background.py in.jpg art/source/background.png
Bilden skalas till 1024 × 2560. Texten tas bort genom att fylla ockrafärgade pixlar i två fasta områden
med medelvärdet av omgivningen (diffusion)."""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB').resize((1024, 2560), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
H, W, _ = a.shape
yy, xx = np.mgrid[0:H, 0:W]

def ochre(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 110) & (r - b > 35) & (r >= g)

def fill(mask, box, iters=400):
    x0, y0, x1, y1 = box
    m = Image.fromarray((mask[y0:y1, x0:x1] * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    m = np.asarray(m) > 0
    sub = a[y0:y1, x0:x1].copy()
    known = ~m
    if known.any():
        sub[m] = sub[known].mean(axis=0)
    for _ in range(iters):
        p = np.pad(sub, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        sub[m] = avg[m]
    a[y0:y1, x0:x1] = sub

# 1. Titelbågen "STATION AEGIS 5": ring med radie 405–458 runt (512, 540), ovanför y=190
r = np.hypot(xx - 512, yy - 540)
title = ochre(a) & (r > 405) & (r < 458) & (yy < 190)
fill(title, (60, 60, 964, 200))
# 2. "AIRLOCK" ovanför Airlock-ringen
# Texten är rosa/orange på blågrön bakgrund: röd minus blå är märkbart högre än omgivningen.
air = ((a[..., 0] - a[..., 2]) > -62) & (xx > 412) & (xx < 534) & (yy > 670) & (yy < 704)
fill(air, (400, 655, 550, 715))

Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(dst)
print('Skrev', dst)
