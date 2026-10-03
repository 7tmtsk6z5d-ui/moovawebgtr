import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (current, target, lambda, dt) => THREE.MathUtils.damp(current, target, lambda, dt);

export class BottleScene {
  constructor(container, onReady = () => {}) {
    this.container = container;
    this.onReady = onReady;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.lowPower = this.detectLowPower();
    this.currentColor = new THREE.Color("#F7F4EA");
    this.targetColor = this.currentColor.clone();
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.drag = { active: false, x: 0 };
    this.targetRot = { x: 0, y: 0 };
    this.velocityY = 0;
    this.clock = new THREE.Clock();
    this.visible = true;
    this.raf = null;
    this.init();
  }

  detectLowPower() {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return (mobile && cores <= 4) || memory <= 2;
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(27, 1, 0.1, 100);
    this.camera.position.set(0, 0.28, 8.7);

    try {
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !this.lowPower,
        powerPreference: "high-performance"
      });
    } catch {
      this.fallback();
      return;
    }

    const maxDpr = this.lowPower ? 1.15 : 1.6;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0x000000, 0);
    this.container.replaceChildren(this.renderer.domElement);

    this.buildEnvironment();
    this.buildLights();
    this.buildBottle();
    this.bind();
    this.resize();

    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
      if (this.visible) this.start(); else this.stop();
    }, { threshold: 0.02 });
    this.io.observe(this.container);

    this.onReady({ supported: true });
    this.start();
  }

  buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = new RoomEnvironment(this.renderer);
    this.scene.environment = pmrem.fromScene(env, 0.045).texture;
    env.dispose();
    pmrem.dispose();
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight("#eef7ff", "#07111e", 1.25));

    const key = new THREE.DirectionalLight("#ffffff", 4.6);
    key.position.set(3.5, 5.5, 5.5);
    this.scene.add(key);

    const rim = new THREE.PointLight("#a8d7ff", 9, 15, 2);
    rim.position.set(-3.7, 2.0, 3.0);
    this.scene.add(rim);

    const warm = new THREE.PointLight("#ffd9b1", 2.5, 12, 2);
    warm.position.set(3.2, -1.2, 2.2);
    this.scene.add(warm);
  }

  bottleProfile() {
    const p = [];
    const N = 180;
    for (let i = 0; i <= N; i++) {
      const y = -2.18 + (4.80 * i / N);
      let r;
      if (y < -1.98) {
        const t = (y + 2.18) / 0.20;
        r = 0.72 + 0.43 * (t * t * (3 - 2 * t));
      } else if (y <= 0.92) {
        const t = clamp((y + 1.98) / 2.90, 0, 1);
        r = 1.15 + 0.035 * Math.sin(t * Math.PI);
      } else if (y <= 1.58) {
        const t = (y - 0.92) / 0.66;
        const s = t * t * (3 - 2 * t);
        r = 1.17 - 0.32 * s;
      } else if (y <= 1.82) {
        const t = (y - 1.58) / 0.24;
        const s = t * t * (3 - 2 * t);
        r = 0.85 - 0.36 * s;
      } else if (y <= 2.42) {
        r = 0.49;
      } else {
        r = 0.525;
      }
      p.push(new THREE.Vector2(Math.max(0.06, r), y));
    }
    return p;
  }

  glassMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: "#dce8ef",
      transparent: true,
      opacity: 0.34,
      roughness: 0.035,
      metalness: 0,
      transmission: 0.96,
      thickness: 0.72,
      ior: 1.47,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      envMapIntensity: 1.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  buildBottle() {
    this.bottle = new THREE.Group();
    this.scene.add(this.bottle);

    const profile = this.bottleProfile();
    const radial = this.lowPower ? 72 : 144;

    const bottleGeom = new THREE.LatheGeometry(profile, radial);
    bottleGeom.computeVertexNormals();
    this.bottleGlass = new THREE.Mesh(bottleGeom, this.glassMaterial());
    this.bottle.add(this.bottleGlass);

    // Liquid uses the exact bottle silhouette below the fill line, so it reads as volume inside the glass.
    const fillY = 1.42;
    const liquidProfile = profile
      .filter(v => v.y <= fillY)
      .map(v => new THREE.Vector2(Math.max(0.06, v.x - 0.075), v.y + 0.035));
    const topRadius = liquidProfile[liquidProfile.length - 1].x;

    this.liquid = new THREE.Mesh(
      new THREE.LatheGeometry(liquidProfile, this.lowPower ? 64 : 112),
      this.liquidMaterial(this.currentColor)
    );
    this.liquid.position.y = -0.02;
    this.bottle.add(this.liquid);

    const top = new THREE.CircleGeometry(topRadius, this.lowPower ? 48 : 96);
    this.liquidTop = new THREE.Mesh(top, this.liquidTopMaterial(this.currentColor));
    this.liquidTop.rotation.x = -Math.PI / 2;
    this.liquidTop.position.y = fillY + 0.015;
    this.bottle.add(this.liquidTop);

    this.meniscus = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.1, topRadius - 0.012), 0.014, 8, this.lowPower ? 48 : 88),
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.32,
        roughness: 0.08,
        transmission: 0.5,
        thickness: 0.18,
        side: THREE.DoubleSide
      })
    );
    this.meniscus.rotation.x = Math.PI / 2;
    this.meniscus.position.y = fillY + 0.018;
    this.bottle.add(this.meniscus);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.49, 0.49, 0.62, this.lowPower ? 48 : 88),
      this.glassMaterial()
    );
    neck.position.y = 2.45;
    this.bottle.add(neck);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.555, 0.545, 0.30, this.lowPower ? 48 : 96),
      new THREE.MeshPhysicalMaterial({
        color: "#0A1628",
        roughness: 0.22,
        metalness: 0.18,
        clearcoat: 0.75,
        clearcoatRoughness: 0.08,
        envMapIntensity: 0.85
      })
    );
    cap.position.y = 2.86;
    this.bottle.add(cap);

    const capHighlight = new THREE.Mesh(
      new THREE.TorusGeometry(0.515, 0.018, 10, this.lowPower ? 48 : 88),
      new THREE.MeshPhysicalMaterial({ color: "#dbe7f2", roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.72 })
    );
    capHighlight.rotation.x = Math.PI / 2;
    capHighlight.position.y = 2.70;
    this.bottle.add(capHighlight);

    this.bottle.add(this.createLogo());

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, this.lowPower ? 40 : 72),
      new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.14, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -2.20;
    this.shadow.scale.set(1.08, 0.30, 1);
    this.bottle.add(this.shadow);

    this.bottle.userData.pulse = 0;
  }

  createLogo() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 420;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Minimal premium navy label: logo only.
    ctx.fillStyle = "rgba(10,22,40,0.96)";
    ctx.beginPath();
    ctx.roundRect(28, 55, 968, 310, 42);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 170px Georgia, serif";
    ctx.fillText("MŌVA", 512, 215);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    const geo = new THREE.CylinderGeometry(1.176, 1.176, 0.72, 144, 1, true, -Math.PI * 0.34, Math.PI * 0.68);
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex,
      transparent: true,
      opacity: 0.94,
      roughness: 0.24,
      clearcoat: 0.5,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.30;
    mesh.position.z = -0.008;
    return mesh;
  }

  liquidMaterial(color) {
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.965,
      roughness: 0.13,
      metalness: 0,
      transmission: 0.04,
      thickness: 0.62,
      ior: 1.345,
      clearcoat: 0.9,
      clearcoatRoughness: 0.09,
      envMapIntensity: 0.82
    });
  }

  liquidTopMaterial(color) {
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      roughness: 0.12,
      transmission: 0.04,
      thickness: 0.30,
      clearcoat: 0.8,
      clearcoatRoughness: 0.10,
      side: THREE.DoubleSide
    });
  }

  setFlavor(hex) {
    this.targetColor.set(hex);
    this.bottle.userData.pulse = 1;
    if (!this.reduceMotion) {
      this.targetRot.y += (Math.random() > 0.5 ? 1 : -1) * 0.10;
    }
  }

  bind() {
    const move = (clientX, clientY) => {
      const r = this.container.getBoundingClientRect();
      this.pointer.tx = clamp(((clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      this.pointer.ty = clamp(((clientY - r.top) / r.height - 0.5) * 2, -1, 1);
    };

    this.container.addEventListener("pointermove", (e) => move(e.clientX, e.clientY), { passive: true });
    this.container.addEventListener("pointerleave", () => { this.pointer.tx = 0; this.pointer.ty = 0; }, { passive: true });
    this.container.addEventListener("pointerdown", (e) => {
      this.drag.active = true;
      this.drag.x = e.clientX;
      this.container.setPointerCapture?.(e.pointerId);
    });
    this.container.addEventListener("pointerup", () => { this.drag.active = false; });
    this.container.addEventListener("pointercancel", () => { this.drag.active = false; });
    this.container.addEventListener("pointermove", (e) => {
      if (!this.drag.active || this.reduceMotion) return;
      const dx = e.clientX - this.drag.x;
      this.drag.x = e.clientX;
      this.velocityY = clamp(this.velocityY + dx * 0.00072, -0.032, 0.032);
      this.targetRot.y += dx * 0.007;
    });

    window.addEventListener("resize", () => this.resize(), { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop(); else if (this.visible) this.start();
    });
  }

  fallback() {
    this.container.innerHTML = `<div class="bottle-fallback" aria-label="MŌVA Fresh Milk bottle visual"><div class="fallback-bottle"><div class="fallback-cap"></div><div class="fallback-liquid"></div><div class="fallback-label"><b>MŌVA</b></div></div></div>`;
    this.onReady({ supported: false });
  }

  resize() {
    if (!this.renderer) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  start() {
    if (this.raf || !this.renderer) return;
    const loop = () => {
      if (!this.visible || document.hidden) { this.raf = null; return; }
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.032);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  update(dt) {
    if (!this.bottle) return;
    const t = performance.now() * 0.001;
    const colorAlpha = 1 - Math.pow(0.00035, dt);
    this.currentColor.lerp(this.targetColor, colorAlpha);
    this.liquid.material.color.copy(this.currentColor);
    this.liquidTop.material.color.copy(this.currentColor);

    if (!this.reduceMotion) {
      this.targetRot.y += this.velocityY;
      this.velocityY = damp(this.velocityY, 0, 8.5, dt);
    }

    const pointerY = this.reduceMotion ? 0 : this.pointer.tx * 0.16;
    const pointerX = this.reduceMotion ? 0 : -this.pointer.ty * 0.055;
    const idleY = this.reduceMotion ? 0 : Math.sin(t * 0.45) * 0.012;
    const idleX = this.reduceMotion ? 0 : Math.sin(t * 0.34) * 0.008;

    this.bottle.rotation.y = damp(this.bottle.rotation.y, this.targetRot.y + pointerY + idleY, 9.0, dt);
    this.bottle.rotation.x = damp(this.bottle.rotation.x, pointerX + idleX, 8.0, dt);
    this.bottle.rotation.z = damp(this.bottle.rotation.z, this.reduceMotion ? 0 : Math.sin(t * 0.31) * 0.006, 5.5, dt);

    const float = this.reduceMotion ? 0 : Math.sin(t * 0.65) * 0.034;
    this.bottle.position.y = damp(this.bottle.position.y, float, 4.5, dt);

    const pulse = this.bottle.userData.pulse || 0;
    this.bottle.userData.pulse = damp(pulse, 0, 7.2, dt);
    const s = 1 + this.bottle.userData.pulse * 0.012;
    this.bottle.scale.set(s, 1 + this.bottle.userData.pulse * 0.008, s);
  }

  dispose() {
    this.stop();
    this.io?.disconnect();
    this.renderer?.dispose();
  }
}
