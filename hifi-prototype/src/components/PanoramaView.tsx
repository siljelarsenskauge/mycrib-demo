// 360° room view, ported from the Furnie reference (reference/Furnie-main, «romvisning 360°»).
// The room is one 360° panorama photo (equirectangular, 360° around and ±60° up/down) drawn with WebGL
// (Synne 18.10: «Skandinavisk stue med kjøkken og balkong»). If WebGL is missing, the old six cube photos are laid out
// as a CSS 3D cube. A furniture photo (the chair) stands on the floor: it is projected from a camera at a fixed
// height, so it gets smaller further away and can be dragged along the floor.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type PointerEvent } from 'react';

const FACES = ['right', 'left', 'top', 'bottom', 'front', 'back'] as const; // order of the WebGL cube map targets
const faceSrc = (f: string) => `/pano/room-${f}.jpg`;
const PANO_SRC = '/pano/room-pano.jpg';
/** the «Drag to look around» pill over the 360° view (off since Synne 17.11) */
const SHOW_DRAG_HINT = false;
/** how far the panorama reaches up and down from the horizon, degrees */
const PANO_LAT = 60;
/** CSS fallback: how each face is turned into place (cube of 1536 px, camera in the middle) */
const CSS_FACE: Record<(typeof FACES)[number], string> = {
  front: 'translateZ(-768px)',
  right: 'rotateY(-90deg) translateZ(-768px)',
  back: 'rotateY(180deg) translateZ(-768px)',
  left: 'rotateY(90deg) translateZ(-768px)',
  top: 'rotateX(-90deg) translateZ(-768px)',
  bottom: 'rotateX(90deg) translateZ(-768px)',
};

const CAM_H = 150; // camera height above the floor, cm
const CHAIR_W = 56;
const CHAIR_H = 116;
const FOV_MIN = 35;
const FOV_MAX = 100;

export interface PanoChair {
  on: boolean;
  /** floor position relative to the camera, cm (x right, z forward is negative) */
  x: number;
  z: number;
  flip: boolean;
}

export const DEFAULT_CHAIR: PanoChair = { on: true, x: 178, z: -150, flip: false };

/** What the room screen needs to know about the camera (e.g. to move the chair «to the left» as seen now). */
export interface PanoCamera {
  yaw: number;
}

/** Another panorama than the room's own (07.11: the living room in the coast palette). */
export interface PanoSource {
  src: string;
  /** how far the photo reaches around, degrees: 360 = all the way round; less = the view stops at the edges */
  span: number;
  /** how far the photo reaches up and down from the horizon, degrees */
  lat: number;
  /** where the view starts, degrees (0 = the middle of the photo) */
  yaw?: number;
  /** a 360° photo whose ends don't quite meet: this share of the width is faded across the seam (e.g. 0.06) */
  seam?: number;
}

interface Props {
  /** the photo to show; without it the room's own 360° photo (with the cube photos as fallback) */
  source?: PanoSource;
  chair: PanoChair;
  chairSelected: boolean;
  onSelectChair: (selected: boolean) => void;
  onMoveChair: (x: number, z: number) => void;
  cameraRef?: MutableRefObject<PanoCamera>;
  label: string;
}



/** Keep the chair between 70 cm and 4.8 m from the camera. */
export function clampChair(x: number, z: number) {
  const d = Math.hypot(x, z) || 1;
  const k = d < 70 ? 70 / d : d > 480 ? 480 / d : 1;
  return { x: x * k, z: z * k };
}

export function PanoramaView({ source, chair, chairSelected, onSelectChair, onMoveChair, cameraRef, label }: Props) {
  const src = source?.src ?? PANO_SRC;
  const span = source?.span ?? 360;
  const lat = source?.lat ?? PANO_LAT;
  const seam = span >= 360 ? source?.seam ?? 0 : 0;
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perspRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const chairRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const facesRef = useRef<Record<string, HTMLImageElement | null>>({});

  const [noGL, setNoGL] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState(true);

  // camera and gesture state live in refs: they change every frame and must not re-render React
  const pv = useRef({ yaw: source?.yaw ?? -20, pitch: 0, fov: 82 });
  const panoRef = useRef<HTMLImageElement | null>(null);
  const pos = useRef({ x: chair.x, z: chair.z });
  const gesture = useRef<{
    pointers: Record<number, { x: number; y: number }>;
    mode: 'look' | 'chair' | 'pinch' | 'none' | null;
    start?: { x: number; y: number; yaw: number; pitch: number };
    last?: { x: number; y: number; t: number };
    off?: { x: number; z: number };
    d0?: number;
    fov0?: number;
    vel: number;
    velP: number;
    moved: boolean;
    downOnChair: boolean;
  }>({ pointers: {}, mode: null, vel: 0, velP: 0, moved: false, downOnChair: false });
  const glRef = useRef<{ gl: WebGLRenderingContext; rb: WebGLBuffer; rl: number; tex: WebGLTexture | null; ready: boolean } | null>(null);
  const raf = useRef<number | null>(null);
  const inertiaRaf = useRef<number | null>(null);
  const propsRef = useRef({ chair, chairSelected });
  propsRef.current = { chair, chairSelected };

  if (!gesture.current.moved || gesture.current.mode !== 'chair') pos.current = { x: chair.x, z: chair.z };

  /* ---------- camera maths (same as Furnie) ---------- */
  const size = () => {
    const el = viewerRef.current;
    return { w: el?.clientWidth || 402, h: el?.clientHeight || 800 };
  };
  const focal = () => size().w / 2 / Math.tan((pv.current.fov * Math.PI) / 360);
  /** vertical field of view for a horizontal one, degrees */
  const vfov = (fov: number) => {
    const sz = size();
    return (2 * Math.atan((Math.tan((fov * Math.PI) / 360) * sz.h) / sz.w) * 180) / Math.PI;
  };
  /** widest view that still fits inside the photo (it only covers ±PANO_LAT degrees) */
  const fovMax = () => {
    const sz = size();
    const v = (2 * lat - 4) * (Math.PI / 180);
    return Math.min(FOV_MAX, span - 4, (2 * Math.atan((Math.tan(v / 2) * sz.w) / sz.h) * 180) / Math.PI);
  };
  /** a photo that doesn't go all the way round: stop at its edges instead of showing the seam */
  const clampYaw = (y: number) => {
    if (span >= 360) return y;
    const lim = Math.max(0, span / 2 - pv.current.fov / 2 - 1);
    return Math.max(-lim, Math.min(lim, y));
  };
  const clampFov = (f: number) => Math.max(FOV_MIN, Math.min(fovMax(), f));
  const clampPitch = (p: number) => {
    const lim = Math.max(0, lat - 2 - vfov(pv.current.fov) / 2);
    return Math.max(-lim, Math.min(lim, p));
  };
  const toCam = (x: number, y: number, z: number) => {
    const yw = (pv.current.yaw * Math.PI) / 180;
    const p = (pv.current.pitch * Math.PI) / 180;
    const x1 = x * Math.cos(yw) + z * Math.sin(yw);
    const z1 = -x * Math.sin(yw) + z * Math.cos(yw);
    return { x: x1, y: y * Math.cos(p) - z1 * Math.sin(p), z: y * Math.sin(p) + z1 * Math.cos(p) };
  };
  const toWorld = (x: number, y: number, z: number) => {
    const p = (-pv.current.pitch * Math.PI) / 180;
    const yw = (-pv.current.yaw * Math.PI) / 180;
    const y1 = y * Math.cos(p) - z * Math.sin(p);
    const z1 = y * Math.sin(p) + z * Math.cos(p);
    return { x: x * Math.cos(yw) + z1 * Math.sin(yw), y: y1, z: -x * Math.sin(yw) + z1 * Math.cos(yw) };
  };
  const chairProj = () => {
    const c = pos.current;
    const sz = size();
    const q = toCam(c.x, CAM_H, c.z);
    if (q.z > -20) return null; // behind the camera
    const s = focal() / -q.z;
    const d = Math.hypot(c.x, c.z);
    return { x: sz.w / 2 + q.x * s, y: sz.h / 2 + q.y * s, s, flat: Math.max(0.12, Math.min(0.9, CAM_H / Math.hypot(CAM_H, d) + 0.08)) };
  };
  /** Where a screen point hits the floor (cm, relative to the camera), or null above the horizon. */
  const floorHit = (cx: number, cy: number) => {
    const el = viewerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const sc = el.clientWidth ? r.width / el.clientWidth : 1;
    const w = toWorld((cx - (r.left + r.width / 2)) / sc, (cy - (r.top + r.height / 2)) / sc, -focal());
    if (w.y <= 0.02) return null;
    const t = CAM_H / w.y;
    return { x: w.x * t, z: w.z * t };
  };

  /* ---------- drawing ---------- */
  const draw = () => {
    const G = glRef.current;
    const cv = canvasRef.current;
    if (!G || !G.ready || !cv) return;
    const { gl } = G;
    const sz = size();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(sz.w * dpr);
    const H = Math.round(sz.h * dpr);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    gl.viewport(0, 0, W, H);
    const P = focal();
    const hw = sz.w / 2;
    const hh = sz.h / 2;
    const rays: number[] = [];
    for (const [cx, cy] of [[-hw, hh], [hw, hh], [-hw, -hh], [hw, -hh]]) {
      const d = toWorld(cx, cy, -P);
      rays.push(d.x, d.y, d.z);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, G.rb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rays), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(G.rl);
    gl.vertexAttribPointer(G.rl, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const apply = () => {
    draw();
    if (sceneRef.current && perspRef.current) {
      perspRef.current.style.perspective = `${focal().toFixed(2)}px`;
      sceneRef.current.style.transform = `translateZ(${focal().toFixed(2)}px) rotateX(${pv.current.pitch.toFixed(3)}deg) rotateY(${pv.current.yaw.toFixed(3)}deg)`;
    }
    const pr = chairProj();
    const vis = pr ? '1' : '0';
    const flip = propsRef.current.chair.flip ? -1 : 1;
    const floorTf = (base: number) => {
      if (!pr) return 'translate(-9999px, -9999px)';
      const w = base * pr.s;
      const h = w * pr.flat;
      return `translate(${(pr.x - w / 2).toFixed(1)}px, ${(pr.y - h / 2 - 2 * pr.s).toFixed(1)}px) scale(${(w / 100).toFixed(4)}, ${(h / 100).toFixed(4)})`;
    };
    if (chairRef.current) {
      chairRef.current.style.transform = pr
        ? `translate(${(pr.x - CHAIR_W / 2).toFixed(1)}px, ${(pr.y - CHAIR_H).toFixed(1)}px) scale(${(pr.s * flip).toFixed(4)}, ${pr.s.toFixed(4)})`
        : 'translate(-9999px, -9999px)';
      chairRef.current.style.opacity = vis;
    }
    if (shadowRef.current) {
      shadowRef.current.style.transform = floorTf(100);
      shadowRef.current.style.opacity = vis;
    }
    if (ringRef.current) ringRef.current.style.transform = floorTf(112);
    if (cameraRef) cameraRef.current = { yaw: pv.current.yaw };
  };

  const schedule = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      apply();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- WebGL set-up ---------- */
  const tryUpload = () => {
    const G = glRef.current;
    const im = panoRef.current;
    if (!G || G.ready || !im || !im.complete || !im.naturalWidth) return;
    const { gl } = G;
    const tex = gl.createTexture();
    try {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('GL error');
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const pow2 = (n: number) => (n & (n - 1)) === 0;
      if (pow2(im.naturalWidth) && pow2(im.naturalHeight)) {
        // the room photo is 4096 × 1024 (power of two): it can repeat around the circle and have mipmaps
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, span >= 360 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        // other sizes (WebGL 1): no repeat and no mipmaps
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    } catch {
      gl.deleteTexture(tex);
      glRef.current = null;
      setNoGL(true);
      setLoading(false);
      schedule();
      return;
    }
    G.tex = tex;
    G.ready = true;
    // start with the widest view that fits the screen
    pv.current.fov = clampFov(pv.current.fov);
    pv.current.pitch = clampPitch(pv.current.pitch);
    pv.current.yaw = clampYaw(pv.current.yaw);
    setLoading(false);
    schedule();
  };

  useEffect(() => {
    const im = new Image();
    im.onload = () => tryUpload();
    im.src = src;
    panoRef.current = im;
    if (im.complete) tryUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    } catch {
      gl = null;
    }
    if (!gl) {
      setNoGL(true);
      return;
    }
    const vs = 'attribute vec2 p; attribute vec3 r; varying vec3 vR; void main(){ vR = r; gl_Position = vec4(p, 0.0, 1.0); }';
    // equirectangular lookup: longitude around, latitude up/down (the photo covers `span` degrees around and ±`lat`)
    const fs = `precision highp float; varying vec3 vR; uniform sampler2D t;
      void main(){ vec3 d = normalize(vec3(vR.x, -vR.y, -vR.z));
        float lon = atan(d.x, d.z); float lat = asin(clamp(d.y, -1.0, 1.0));
        float u = 0.5 + lon / ${((span * Math.PI) / 180).toFixed(6)}; float v = clamp(0.5 - lat / ${((2 * lat * Math.PI) / 180).toFixed(6)}, 0.001, 0.999);
        ${seam > 0
          ? `// the ends overlap by \`seam\`: the last strip fades into the first, so there is no hard edge
        float w = ${seam.toFixed(4)}; float x = fract(u) * (1.0 - w);
        if (x < w) gl_FragColor = mix(texture2D(t, vec2(x + 1.0 - w, v)), texture2D(t, vec2(x, v)), x / w);
        else gl_FragColor = texture2D(t, vec2(x, v)); }`
          : 'gl_FragColor = texture2D(t, vec2(u, v)); }'}`;
    const mk = (type: number, src: string) => {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setNoGL(true);
      return;
    }
    gl.useProgram(prog);
    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(pl);
    gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(gl.getUniformLocation(prog, 't'), 0);
    glRef.current = { gl, rb: gl.createBuffer()!, rl: gl.getAttribLocation(prog, 'r'), tex: null, ready: false };
    tryUpload();
    return () => {
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CSS fallback: done loading when all six faces are in
  const onFaceLoad = () => {
    if (FACES.every((f) => facesRef.current[f]?.complete)) setLoading(false);
  };

  // wheel zoom (needs a non-passive listener), resize, and redraw when the chair changes
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (inertiaRaf.current) cancelAnimationFrame(inertiaRaf.current);
      pv.current.fov = clampFov(pv.current.fov * Math.exp(e.deltaY * 0.0012));
      pv.current.pitch = clampPitch(pv.current.pitch);
      pv.current.yaw = clampYaw(pv.current.yaw);
      schedule();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      el.removeEventListener('wheel', onWheel);
      ro.disconnect();
      if (raf.current) cancelAnimationFrame(raf.current);
      if (inertiaRaf.current) cancelAnimationFrame(inertiaRaf.current);
      raf.current = null;
      inertiaRaf.current = null;
    };
  }, [schedule]);

  useEffect(schedule, [chair.x, chair.z, chair.flip, chair.on, chairSelected, schedule]);

  /* ---------- gestures: drag to look, drag the chair on the floor, pinch to zoom ---------- */
  const inertia = () => {
    let vy = gesture.current.vel * 16;
    let vp = gesture.current.velP * 16;
    const step = () => {
      vy *= 0.92;
      vp *= 0.92;
      if (Math.abs(vy) < 0.02 && Math.abs(vp) < 0.02) {
        inertiaRaf.current = null;
        return;
      }
      pv.current.yaw = clampYaw(pv.current.yaw + vy);
      pv.current.pitch = clampPitch(pv.current.pitch + vp);
      apply();
      inertiaRaf.current = requestAnimationFrame(step);
    };
    inertiaRaf.current = requestAnimationFrame(step);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    g.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (inertiaRaf.current) cancelAnimationFrame(inertiaRaf.current);
    const ids = Object.keys(g.pointers);
    if (ids.length >= 2) {
      const a = g.pointers[+ids[0]];
      const b = g.pointers[+ids[1]];
      g.mode = 'pinch';
      g.d0 = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      g.fov0 = pv.current.fov;
      return;
    }
    const onChair = !!chairRef.current && e.target === chairRef.current;
    g.start = { x: e.clientX, y: e.clientY, yaw: pv.current.yaw, pitch: pv.current.pitch };
    g.last = { x: e.clientX, y: e.clientY, t: performance.now() };
    g.moved = false;
    g.downOnChair = onChair;
    g.vel = 0;
    g.velP = 0;
    if (onChair && propsRef.current.chairSelected) {
      const hit = floorHit(e.clientX, e.clientY);
      if (hit) {
        g.mode = 'chair';
        g.off = { x: pos.current.x - hit.x, z: pos.current.z - hit.z };
        return;
      }
    }
    g.mode = 'look';
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.pointers[e.pointerId]) return;
    g.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (g.mode === 'pinch') {
      const ids = Object.keys(g.pointers);
      if (ids.length < 2) return;
      const a = g.pointers[+ids[0]];
      const b = g.pointers[+ids[1]];
      const d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      pv.current.fov = clampFov((g.fov0! * g.d0!) / d);
      pv.current.pitch = clampPitch(pv.current.pitch);
      pv.current.yaw = clampYaw(pv.current.yaw);
      schedule();
      return;
    }
    if (!g.start) return;
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    if (!g.moved && Math.abs(dx) + Math.abs(dy) > 5) {
      g.moved = true;
      setHint(false);
    }
    if (!g.moved) return;
    if (g.mode === 'chair') {
      const hit = floorHit(e.clientX, e.clientY);
      if (hit) {
        pos.current = clampChair(hit.x + g.off!.x, hit.z + g.off!.z);
        schedule();
      }
      return;
    }
    if (g.mode === 'look') {
      const k = pv.current.fov / size().w;
      pv.current.yaw = clampYaw(g.start.yaw - dx * k);
      pv.current.pitch = clampPitch(g.start.pitch + dy * k);
      const now = performance.now();
      const dt = Math.max(8, now - g.last!.t);
      g.vel = (-(e.clientX - g.last!.x) * k) / dt;
      g.velP = ((e.clientY - g.last!.y) * k) / dt;
      g.last = { x: e.clientX, y: e.clientY, t: now };
      schedule();
    }
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    delete g.pointers[e.pointerId];
    const mode = g.mode;
    if (Object.keys(g.pointers).length > 0) {
      if (mode === 'pinch') g.mode = 'none';
      return;
    }
    g.mode = null;
    if (mode !== 'look' && mode !== 'chair') {
      g.start = undefined;
      return;
    }
    if (!g.moved) {
      // a tap: on the chair selects it, anywhere else deselects
      if (g.downOnChair) onSelectChair(true);
      else if (propsRef.current.chairSelected) onSelectChair(false);
    } else if (mode === 'chair') {
      onMoveChair(pos.current.x, pos.current.z);
    } else if (performance.now() - g.last!.t < 90) {
      inertia();
    }
    g.moved = false;
    g.start = undefined;
  };

  return (
    <div
      ref={viewerRef}
      className="pano"
      aria-label={label}
      role="img"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ cursor: gesture.current.mode === 'look' ? 'grabbing' : 'grab' }}
    >
      <canvas ref={canvasRef} className="pano-canvas" aria-hidden style={{ display: noGL ? 'none' : 'block' }} />
      <div ref={perspRef} className="pano-persp" aria-hidden style={{ visibility: noGL ? 'visible' : 'hidden' }}>
        <div ref={sceneRef} className="pano-scene">
          {noGL && !source && FACES.map((f) => (
            <img
              key={f}
              ref={(el) => {
                facesRef.current[f] = el;
              }}
              src={faceSrc(f)}
              alt=""
              draggable={false}
              onLoad={onFaceLoad}
              style={{ transform: CSS_FACE[f] }}
            />
          ))}
        </div>
      </div>

      {/* no WebGL with another photo: show it flat */}
      {noGL && source && <img className="pano-flat" src={src} alt="" onLoad={() => setLoading(false)} />}

      {loading && (
        <div className="pano-loading" role="status">
          <span className="spinner" aria-hidden />
          Loading the room …
        </div>
      )}

      {chair.on && (
        <>
          <div ref={shadowRef} className="pano-shadow" aria-hidden />
          <div ref={ringRef} className="pano-ring" aria-hidden style={{ opacity: chairSelected ? 1 : 0 }} />
          <img ref={chairRef} className="pano-chair" src="/pano/chair.png" alt="Chair" draggable={false} style={{ width: CHAIR_W, height: CHAIR_H }} />
        </>
      )}

      {/* no «Drag to look around» over the room (Synne 17.11) – kept behind SHOW_DRAG_HINT */}
      {SHOW_DRAG_HINT && hint && !loading && <span className="pano-hint">Drag to look around</span>}
    </div>
  );
}
