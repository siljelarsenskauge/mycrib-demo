// The real 3D scan of the living room (Synne 20.10: «3D scan - stue», a textured .glb), shown in the 3D view.
// Drag to look around, pinch or scroll to move closer. Built with three.js.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loading } from './ui';

export function ScanModelView({ src, label }: { src: string; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // a scan carries its own light in the textures, so only a soft, even light is added
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c8, 2.2));
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let frame = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };

    new GLTFLoader().load(
      src,
      (gltf) => {
        const model = gltf.scene;
        // the scan is lit by its textures: show the colours as they are
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            const m = mesh.material as THREE.MeshStandardMaterial;
            // front faces only: the ceiling and the near walls disappear when seen from outside, so you look into the room
            mesh.material = new THREE.MeshBasicMaterial({ map: m.map ?? null, color: m.map ? 0xffffff : m.color, side: THREE.FrontSide });
          }
        });
        scene.add(model);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // look at the room from above one corner, like a dollhouse, so the whole room is in view
        controls.target.set(center.x, box.min.y, center.z);
        camera.position.set(center.x + size.x * 0.75, box.max.y + size.y * 1.3, center.z + size.z * 1.15);
        controls.minDistance = 1;
        controls.maxDistance = Math.max(size.x, size.z) * 2.5;
        controls.maxPolarAngle = Math.PI * 0.49;
        controls.update();
        setLoaded(true);
        tick();
      },
      undefined,
      () => setFailed(true),
    );

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const m = mesh.material as THREE.MeshBasicMaterial;
          m.map?.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return (
    <div className="scan-model" ref={hostRef} role="img" aria-label={label}>
      {!loaded && !failed && (
        <div className="scan-model-status">
          <Loading text="Loading the 3D scan …" />
        </div>
      )}
      {failed && (
        <div className="scan-model-status">
          <p>The 3D scan couldn’t be loaded.</p>
        </div>
      )}
    </div>
  );
}
