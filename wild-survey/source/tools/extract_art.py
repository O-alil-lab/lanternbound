"""Extract clean, background-free sprites from the 24 reference sheets (v3)."""
import io, os
import numpy as np
import pymupdf
from PIL import Image, ImageFilter
from scipy import ndimage

PDF = "google_drive/Original_Cast_24_Character_Reference_Sheets.pdf"
OUT = "art"
os.makedirs(OUT, exist_ok=True)
doc = pymupdf.open(PDF)

NAMES = ["Nera","Ivo","Sana","Tavi","Elin","Oren",
         "Bellmoss","Velouray","Loomtail","Tasselk","Puddlewick","Clatterbud",
         "Rillspool","Coralune","Hearthusk","Glimmerell","Quillora","Saffrill",
         "Cairnib","Tumblefen","Drapplet","Nimbrook","Bristlefin","Opaloom"]

def sheet(p):
    info = doc.extract_image(doc[p].get_images(full=True)[0][0])
    return Image.open(io.BytesIO(info["image"])).convert("RGB")

def sheet_notext(p):
    """Sheet image with the PDF's annotation text erased to paper colour."""
    page = doc[p]
    im = sheet(p)
    bg = paper(im)
    sx = im.width / page.rect.width
    sy = im.height / page.rect.height
    px = im.load()
    from PIL import ImageDraw
    dr = ImageDraw.Draw(im)
    for w in page.get_text("words"):
        x0, y0, x1, y1 = w[:4]
        pad = 1.2
        dr.rectangle([x0*sx-pad, y0*sy-pad, x1*sx+pad, y1*sy+pad],
                     fill=tuple(int(v) for v in bg))
    return im

def paper(im):
    a = np.asarray(im).astype(np.int16)
    b = np.concatenate([a[0:6].reshape(-1,3), a[-6:].reshape(-1,3),
                        a[:,0:6].reshape(-1,3), a[:,-6:].reshape(-1,3)])
    return np.median(b, axis=0)

def figure_mask(im, bg, y0, y1):
    """Mask of illustrated figures only: blobs taller than 26px inside band."""
    a = np.asarray(im.crop((0, y0, im.width, y1))).astype(np.int16)
    d = np.abs(a - bg).sum(axis=2)
    m = ndimage.binary_closing(d > 60, np.ones((5,5)))
    lab, n = ndimage.label(m)
    keep = np.zeros_like(m)
    for i in range(1, n+1):
        ys, xs = np.where(lab == i)
        if (ys.max()-ys.min()) > 26 and len(ys) > 700:
            keep[lab == i] = True
    return keep

def column_blobs(im, bg, y0, y1, ncol=4):
    """Cut into ncol slots at the emptiest vertical gaps, then bbox tall blobs."""
    a = np.asarray(im.crop((0, y0, im.width, y1))).astype(np.int16)
    d = np.abs(a - bg).sum(axis=2)
    m = ndimage.binary_closing(d > 60, np.ones((5,5)))
    lab, n = ndimage.label(m)
    tall = np.zeros_like(m)
    for i in range(1, n+1):
        ys, xs = np.where(lab == i)
        if len(ys) >= 700 and (ys.max()-ys.min()) >= 26:
            tall[lab == i] = True
    occ = tall.sum(axis=0).astype(float)
    W = im.width; quarter = W / ncol
    cuts = [0]
    for k in range(1, ncol):
        lo, hi = int(quarter*k - quarter*0.35), int(quarter*k + quarter*0.35)
        win = occ[lo:hi]
        cuts.append(lo + int(np.argmin(win)))
    cuts.append(W)
    out = []
    for k in range(ncol):
        sub = tall[:, cuts[k]:cuts[k+1]]
        ys, xs = np.where(sub)
        if len(ys) == 0:
            out.append(None); continue
        out.append((cuts[k]+int(xs.min()), int(ys.min()),
                    cuts[k]+int(xs.max())+1, int(ys.max())+1))
    return out

def cut(im, box, y0, bg, tol=44, feather=1.3):
    x0,y0b,x1,y1b = box
    c = im.crop((x0, y0b, x1, y1b)).convert("RGB")
    arr = np.asarray(c).astype(np.int16)
    d = np.abs(arr - bg).sum(axis=2)
    near = d < tol*3
    lab, n = ndimage.label(near)
    border = set(lab[0,:]) | set(lab[-1,:]) | set(lab[:,0]) | set(lab[:,-1])
    border.discard(0)
    alpha = np.where(np.isin(lab, list(border)), 0, 255).astype(np.uint8)
    # drop stray text/label fragments: keep only components that belong to the figure
    al, an = ndimage.label(alpha > 128)
    if an > 1:
        sizes = ndimage.sum(alpha > 128, al, range(1, an+1))
        ref = int(np.argmax(sizes)) + 1
        rys, rxs = np.where(al == ref)
        ry0, ry1, rx0, rx1 = rys.min(), rys.max(), rxs.min(), rxs.max()
        keep_ids = [ref]
        for i in range(1, an+1):
            if i == ref: continue
            ys, xs = np.where(al == i)
            hgt, wid = ys.max()-ys.min()+1, xs.max()-xs.min()+1
            xov = max(0, min(xs.max(), rx1)-max(xs.min(), rx0)+1)
            # keep sizeable/detached accessories; drop small text glyphs & leader lines
            if hgt >= 28 and len(ys) >= 220 and xov >= 8:
                keep_ids.append(i)
        alpha = np.where(np.isin(al, keep_ids), alpha, 0).astype(np.uint8)
    a = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(feather))
    rgba = c.convert("RGBA"); rgba.putalpha(a)
    bb = rgba.getbbox()
    return rgba.crop(bb) if bb else rgba

def save(rgba, name, size=560):
    w,h = rgba.size
    s = min(size/max(w,h), 1.0)
    if s < 1.0: rgba = rgba.resize((max(1,int(w*s)), max(1,int(h*s))), Image.LANCZOS)
    rgba.save(f"{OUT}/{name}.png", optimize=True)

for idx, nm in enumerate(NAMES):
    im = sheet_notext(idx+1); W, H = im.size; bg = paper(im)
    y0, y1 = int(H*0.105), int(H*0.56)
    boxes = column_blobs(im, bg, y0, y1, 4)
    if any(b is None for b in boxes): print("!!", nm, boxes)
    for k, bb in enumerate(boxes):
        if bb is None: continue
        bx0, by0, bx1, by1 = bb[0], y0+bb[1], bb[2], y0+bb[3]
        pad = 3
        rgba = cut(im, (bx0-pad, by0-pad, bx1+pad, by1+pad), y0, bg)
        tag = ["front","threeq","side","back"][k]
        save(rgba, f"{nm.lower()}_{tag}")
    print(nm, [(None if b is None else (b[2]-b[0], b[3]-b[1])) for b in boxes])
print("files:", len(os.listdir(OUT)))
