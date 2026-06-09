"use client";

import { useEffect, useRef } from "react";

/**
 * Three.js hero backdrop — a flowing wireframe "wave" mesh in brand blue that
 * ripples, tilts with the mouse (parallax), and slides on scroll.
 *
 * Performance-minded: `three` is dynamically imported *inside* the effect, so it
 * ships as its own client chunk and never blocks the server-rendered headline
 * (LCP). Under prefers-reduced-motion it renders a single still frame (no loop);
 * if WebGL is unavailable the CSS radial glow remains. Pauses when hidden and
 * disposes all GPU resources on unmount.
 */
export function HeroScene({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const node: HTMLDivElement = el;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const mod = await import("three").catch(() => null);
      if (!mod || disposed) return;
      const THREE = mod;

      let created: InstanceType<typeof THREE.WebGLRenderer> | null = null;
      try {
        created = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      } catch {
        return;
      }
      const renderer = created;

      const w = () => node.clientWidth || 1;
      const h = () => node.clientHeight || 1;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w(), h());
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      node.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, w() / h(), 0.1, 100);
      camera.position.set(0, 2.4, 16);
      camera.lookAt(0, 0, 0);

      // Subdivided plane, displaced along Z into a wave, shown as a wireframe.
      const geometry = new THREE.PlaneGeometry(52, 30, 56, 32);
      const pos = geometry.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
      const baseXY = Float32Array.from(pos.array as Float32Array);
      const material = new THREE.MeshBasicMaterial({
        color: 0x1d4ed8,
        wireframe: true,
        transparent: true,
        opacity: 0.34
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -0.5; // tilt: top of the plane recedes
      scene.add(mesh);

      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

      const applyWave = (time: number) => {
        const a = pos.array as Float32Array;
        for (let k = 0; k < pos.count; k++) {
          const x = baseXY[k * 3];
          const y = baseXY[k * 3 + 1];
          a[k * 3 + 2] = Math.sin(x * 0.3 + time) * 1.4 + Math.cos(y * 0.4 + time * 0.8) * 1.4;
        }
        pos.needsUpdate = true;
      };

      const onMove = (e: PointerEvent) => {
        pointer.tx = e.clientX / window.innerWidth - 0.5;
        pointer.ty = e.clientY / window.innerHeight - 0.5;
      };
      const onScroll = () => {
        node.style.transform = `translate3d(0, ${(window.scrollY || 0) * 0.28}px, 0)`;
      };
      const resize = () => {
        const ww = w();
        const hh = h();
        if (ww < 2 || hh < 2) return; // not laid out yet — wait for the observer
        renderer.setSize(ww, hh, false); // false: keep our 100% canvas style
        camera.aspect = ww / hh;
        camera.updateProjectionMatrix();
      };

      // The mount is absolutely positioned, so its real size can arrive a tick
      // after the async three import resolves. Size off a ResizeObserver rather
      // than a one-shot read, or we render into a degenerate 0-width buffer.
      const ro = new ResizeObserver(() => {
        resize();
        if (reduced || document.hidden) render(); // redraw the still frame
      });
      ro.observe(node);

      window.addEventListener("pointermove", onMove, { passive: true });
      if (!reduced) window.addEventListener("scroll", onScroll, { passive: true });

      let raf = 0;
      let t = 6; // start mid-wave so the first frame isn't flat
      const render = () => {
        t += 0.02;
        applyWave(t);
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        mesh.rotation.z = pointer.x * 0.18;
        mesh.rotation.y = pointer.x * 0.35;
        camera.position.x = pointer.x * 2.4;
        camera.position.y = 2.4 - pointer.y * 1.6;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        if (!reduced && !document.hidden) raf = requestAnimationFrame(render);
      };

      render();

      const onVis = () => {
        cancelAnimationFrame(raf);
        if (!reduced && !document.hidden) raf = requestAnimationFrame(render);
      };
      document.addEventListener("visibilitychange", onVis);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.parentNode?.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // Fade the field out toward the right so the sign-in card sits on clean white.
  const fade = "linear-gradient(to right, #000 0%, #000 44%, transparent 68%)";
  return <div ref={mountRef} aria-hidden="true" className={className} style={{ maskImage: fade, WebkitMaskImage: fade }} />;
}
