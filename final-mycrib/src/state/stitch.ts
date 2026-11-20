// A room has one photo (Synne 14.11). When several are added – to get the whole room in – they are put together side
// by side into one wide photo, with a soft blend where two photos meet. Done in the browser with a canvas; simulated
// «stitching», no real panorama matching.

const load = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

/** one JPEG data URL of all the photos side by side, the same height, blended where they meet */
export async function stitchPhotos(srcs: string[], height = 1000, blend = 80): Promise<string> {
  if (srcs.length < 2) return srcs[0];
  const imgs = await Promise.all(srcs.map(load));
  // a library «photo» can be a cut of the room panorama (`?x=` = where the 3:4 cut sits, like object-position)
  const cuts = srcs.map((src, i) => {
    const im = imgs[i];
    const m = /[?&]x=(\d+)/.exec(src);
    if (!m) return { sx: 0, sw: im.naturalWidth };
    const sw = Math.round(im.naturalHeight * 0.75);
    return { sx: Math.round((im.naturalWidth - sw) * (Number(m[1]) / 100)), sw };
  });
  const widths = imgs.map((im, i) => Math.round((cuts[i].sw / im.naturalHeight) * height));
  const total = widths.reduce((a, b) => a + b, 0) - blend * (imgs.length - 1);
  const out = document.createElement('canvas');
  out.width = total;
  out.height = height;
  const ctx = out.getContext('2d')!;
  let x = 0;
  imgs.forEach((im, i) => {
    const w = widths[i];
    if (i === 0) {
      ctx.drawImage(im, cuts[i].sx, 0, cuts[i].sw, im.naturalHeight, 0, 0, w, height);
    } else {
      // the next photo fades in over the last `blend` px of the one before
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = height;
      const t = tmp.getContext('2d')!;
      t.drawImage(im, cuts[i].sx, 0, cuts[i].sw, im.naturalHeight, 0, 0, w, height);
      t.globalCompositeOperation = 'destination-in';
      // one fill over the whole photo (destination-in clears everything outside what is drawn)
      const g = t.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(Math.min(1, blend / w), 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      t.fillStyle = g;
      t.fillRect(0, 0, w, height);
      ctx.drawImage(tmp, x, 0);
    }
    x += w - blend;
  });
  return out.toDataURL('image/jpeg', 0.82);
}
