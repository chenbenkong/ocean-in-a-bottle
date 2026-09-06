// 环境层：天空 / 外海 / 云 / 星月 / 闪电
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

const WAVES = [
  { dx: 0.985, dz: 0.174, amp: 1.05, k: 0.1047, w: 1.013 },
  { dx: 0.825, dz: 0.565, amp: 0.58, k: 0.1848, w: 1.750 },
  { dx: 0.128, dz: 0.992, amp: 0.38, k: 0.2856, w: 2.840 },
  { dx: -0.637, dz: 0.771, amp: 0.30, k: 0.4488, w: 4.400 },
  { dx: 0.707, dz: 0.707, amp: 0.22, k: 0.6283, w: 2.483 },
  { dx: -0.208, dz: 0.978, amp: 0.15, k: 0.8976, w: 2.965 },
  { dx: 0.951, dz: -0.309, amp: 0.10, k: 1.2566, w: 3.510 },
  { dx: -0.500, dz: -0.866, amp: 0.07, k: 1.7952, w: 4.198 },
];
export function swellH(x, z, t, sf) {
  let h = 0;
  for (const w of WAVES) h += w.amp * sf * Math.sin(w.k * (w.dx * x + w.dz * z) - w.w * t);
  return h;
}
function glslWaves() {
  let s = 'vec3 swell(vec3 p){\n vec3 off=vec3(0.0); float ph,a,kk,ss,c; vec2 D;\n';
  for (const w of WAVES) {
    s += ` D=vec2(${w.dx.toFixed(4)},${w.dz.toFixed(4)}); kk=${w.k.toFixed(5)}; a=${w.amp.toFixed(4)}*uSwellA; `
      + `ph=kk*dot(D,p.xz)-${w.w.toFixed(4)}*uSwellT; ss=sin(ph); c=cos(ph); off.y+=a*ss; off.xz+=D*(a*kk*c);\n`;
  }
  return s + ' return p+off;\n}\n';
}

function proceduralNormals() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), img = g.createImageData(s, s);
  const H = (x, y) => Math.sin(x * 0.11 + y * 0.07) * 3 + Math.sin(x * 0.05 - y * 0.13) * 4 + Math.sin((x + y) * 0.031) * 5;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1);
    const n = new THREE.Vector3(-dx, 8, -dy).normalize(), i = (y * s + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
    img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function cloudSpriteTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 5; i >= 1; i--) {
    const r = 18 + i * 9;
    const gr = g.createRadialGradient(64, 64, r * 0.35, 64, 64, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.16)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createEnvironment(scene, manager) {
  const texLoader = new THREE.TextureLoader(manager);

  /* —— 灯光 —— */
  scene.add(new THREE.AmbientLight(0xcfe0ee, 0.5));
  scene.add(new THREE.HemisphereLight(0xbfd4e8, 0x1c3242, 0.55));
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.8); scene.add(sunLight);
  const moonLight = new THREE.DirectionalLight(0x8fa8d8, 0.0); scene.add(moonLight);
  const flashLight = new THREE.PointLight(0xdfe8ff, 0, 900, 1.2); scene.add(flashLight);

  /* —— 天空（自定义渐变天穹：天顶深蓝→地平线浅蓝，随昼夜/风暴调色） —— */
  const skyU = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    cTop: { value: new THREE.Color(0x2f7cc9) },
    cHor: { value: new THREE.Color(0x9fd0ee) },
    cGlow: { value: new THREE.Color(0xfff0c8) },
    uStorm: { value: 0 },
    uFlash: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4200, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vD;
      void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vD;
      uniform vec3 uSunDir, cTop, cHor, cGlow;
      uniform float uStorm, uFlash;
      void main(){
        vec3 d = normalize(vD);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(cHor, cTop, pow(h, 0.5));
        if (d.y < 0.0) col = mix(cHor, cHor*0.5, clamp(-d.y*5.0, 0.0, 1.0));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += cGlow * (pow(s, 420.0)*1.3 + pow(s, 14.0)*0.20 + pow(s, 3.0)*0.05);
        col *= (1.0 - uStorm*0.5);
        col += vec3(0.85, 0.9, 1.0) * uFlash * 0.45;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  scene.add(sky);
  const sunDir = new THREE.Vector3(0, 1, 0);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(90, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff2cc, fog: false })); scene.add(sunDisc);
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(55, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xe8eef8, fog: false })); scene.add(moonMesh);
  let starsO;
  {
    const n = 320, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * 0.9 + 0.06;
      v.normalize().multiplyScalar(3900);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starsO = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 7, transparent: true, opacity: 0, fog: false, sizeAttenuation: true }));
    scene.add(starsO);
  }

  /* —— 外海 —— */
  const geo = new THREE.PlaneGeometry(3000, 3000, 320, 320);
  const tex = texLoader.load(
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/waternormals.jpg',
    t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; }, undefined, () => { water.material.uniforms.normalSampler.value = proceduralNormals(); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const water = new Water(geo, {
    textureWidth: 512, textureHeight: 512,
    waterNormals: tex,
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x07354d,
    distortionScale: 2.6,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.uSwellT = { value: 0 };
  water.material.uniforms.uSwellA = { value: 1 };
  let fs = water.material.fragmentShader;
  fs = fs.replace('float rf0 = 0.3;', 'float rf0 = 0.02;');
  fs = fs.replace('reflectionSample * 0.9', 'reflectionSample * 0.55');
  fs = fs.replace('* waterColor;', '* waterColor * 2.2;');
  fs = fs.replace('100.0, 2.0, 0.5,', '100.0, 2.0, 0.32,');
  water.material.fragmentShader = fs;
  water.material.vertexShader = 'uniform float uSwellT;\nuniform float uSwellA;\n' + glslWaves()
    + water.material.vertexShader
      .replaceAll('modelMatrix * vec4( position, 1.0 )', 'modelMatrix * vec4( swell( position ), 1.0 )')
      .replaceAll('modelViewMatrix * vec4( position, 1.0 )', 'modelViewMatrix * vec4( swell( position ), 1.0 )');
  water.material.needsUpdate = true;
  scene.add(water);

  /* —— 远景乌云（软精灵） —— */
  const cloudTex = cloudSpriteTexture();
  const oCloudMat = new THREE.SpriteMaterial({ map: cloudTex, color: 0xf2f4f8, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  const oCloudRoot = new THREE.Group(); scene.add(oCloudRoot);
  const oClouds = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const n = 6 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      const sp = new THREE.Sprite(oCloudMat);
      const s = 45 + Math.random() * 45;
      sp.scale.set(s, s * 0.42, 1);
      sp.position.set((Math.random() - 0.5) * 90, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 60);
      g.add(sp);
    }
    const a = i / 7 * Math.PI * 2;
    g.position.set(Math.cos(a) * (140 + Math.random() * 160), 95 + Math.random() * 45, Math.sin(a) * (140 + Math.random() * 160));
    oClouds.push({ g, vx: 1.2 + Math.random() });
    oCloudRoot.add(g);
  }

  /* —— 闪电 —— */
  let bolt = null, boltT = 0;
  function spawnBottleBolt(onFlash) {
    const pts = []; let bx = (Math.random() - 0.5) * 80, bz = (Math.random() - 0.5) * 80;
    for (let i = 0; i < 8; i++) { pts.push(new THREE.Vector3(bx, 75 - i * 9, bz)); bx += (Math.random() - 0.5) * 8; bz += (Math.random() - 0.5) * 8; }
    bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xeef2ff, transparent: true, opacity: 0.95 }));
    scene.add(bolt); boltT = 0.14;
    onFlash && onFlash();
  }

  const PAL = [
    { top: 0x4a66a8, hor: 0xe8a878, glow: 0xffc890, amb: 0.55, sun: 0xffc890, sunI: 1.6, fog: 0xb08068 },
    { top: 0x2f7cc9, hor: 0x9fd0ee, glow: 0xfff0c8, amb: 0.62, sun: 0xfff2d8, sunI: 2.6, fog: 0x6f9cc0 },
    { top: 0x3b3f78, hor: 0xf07a4e, glow: 0xff9a60, amb: 0.5, sun: 0xffa060, sunI: 1.4, fog: 0xa86050 },
    { top: 0x0a1030, hor: 0x182452, glow: 0x8aa0d8, amb: 0.16, sun: 0x9db8e8, sunI: 0.55, fog: 0x0c1428 },
  ];
  const _cA = new THREE.Color(), _cB = new THREE.Color();
  function lerpPal(a, b, f, out) {
    out.sun.copy(_cA.setHex(a.sun)).lerp(_cB.setHex(b.sun), f);
    out.hor.copy(_cA.setHex(a.hor)).lerp(_cB.setHex(b.hor), f);
    out.top.copy(_cA.setHex(a.top)).lerp(_cB.setHex(b.top), f);
    out.glow.copy(_cA.setHex(a.glow)).lerp(_cB.setHex(b.glow), f);
    out.fog.copy(_cA.setHex(a.fog)).lerp(_cB.setHex(b.fog), f);
    out.sunI = a.sunI + (b.sunI - a.sunI) * f;
  }
  const cur = { sun: new THREE.Color(), fog: new THREE.Color(), hor: new THREE.Color(), top: new THREE.Color(), glow: new THREE.Color(), sunI: 2 };

  const env = {
    sky, water, sunDir, sunLight, moonLight, flashLight, oCloudRoot, oCloudMat, oClouds,
    starsO, moonMesh, sunDisc,
    cur,
    update(dt, rt, st) {
      // st = { simT, storm, dayT, bottlePos }
      const storm = st.storm, dayT = st.dayT;
      skyU.cTop.value.copy(cur.top); skyU.cHor.value.copy(cur.hor); skyU.cGlow.value.copy(cur.glow);
      water.material.uniforms.uSwellT.value = st.simT;
      water.material.uniforms.uSwellA.value = 1 + storm * 1.8;
      water.material.uniforms.distortionScale.value = 2.6 + storm * 4.5;
      const ang = dayT * Math.PI * 2;
      const el = Math.sin(ang) * 0.95, az = 2.1 + Math.cos(ang) * 0.5;
      sunDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
      skyU.uSunDir.value.copy(sunDir);
      skyU.uStorm.value = storm;
      sunLight.position.copy(sunDir).multiplyScalar(600);
      const seg = dayT * 4, i0 = Math.floor(seg) % 4, i1 = (i0 + 1) % 4, f0 = seg - Math.floor(seg);
      lerpPal(PAL[i0], PAL[i1], f0 * f0 * (3 - 2 * f0), cur);
      sunLight.color.copy(cur.sun);
      sunLight.intensity = el > 0 ? cur.sunI * 0.75 : 0.0;
      const nf = Math.min(1, Math.max(0, -el * 2.2));
      moonLight.position.set(-sunDir.x * 600, Math.abs(sunDir.y) * 600 + 80, -sunDir.z * 600);
      moonLight.intensity = nf * 0.5;
      moonMesh.position.set(-sunDir.x * 3400, -sunDir.y * 3400, -sunDir.z * 3400);
      moonMesh.visible = el < 0.1;
      sunDisc.position.set(sunDir.x * 3800, sunDir.y * 3800, sunDir.z * 3800);
      sunDisc.visible = el > -0.06;
      starsO.material.opacity = nf * 0.9;
      scene.fog.color.copy(cur.fog).lerp(_cA.setHex(0x2a3440), storm * 0.6);
      scene.fog.color.multiplyScalar(0.4 + 0.45 * (1 - nf));
      const cl = 0.55 + 0.45 * (1 - nf);
      oCloudMat.color.setRGB((0.88 - cl * 0.25) * (1 - storm * 0.6) + 0.1, (0.9 - cl * 0.22) * (1 - storm * 0.55) + 0.1, (0.94 - cl * 0.2) * (1 - storm * 0.5) + 0.12);
      water.material.uniforms.sunColor.value.copy(cur.sun).multiplyScalar(0.3 + 0.7 * (1 - nf));
      water.material.uniforms.waterColor.value.setHex(0x07354d).multiplyScalar(0.45 + 0.55 * (1 - nf));
      for (const oc of oClouds) {
        oc.g.position.x += oc.vx * dt * (1 + storm * 4);
        if (oc.g.position.x - oCloudRoot.position.x > 260) oc.g.position.x = oCloudRoot.position.x - 260;
      }
      // 闪电
      flashLight.intensity *= Math.pow(0.0001, dt);
      if (bolt) { boltT -= dt; if (boltT <= 0) { scene.remove(bolt); bolt = null; } }
      if (storm > 0.5 && st.simT > env._nextBolt) {
        env._nextBolt = st.simT + 1.2 + Math.random() * 2.5;
        flashLight.intensity = 9000;
        env.flash = true;
        spawnBottleBolt();
      }
      oCloudRoot.position.x = st.bottlePos.x; oCloudRoot.position.z = st.bottlePos.z;
      water.position.x = st.bottlePos.x; water.position.z = st.bottlePos.z;
      flashLight.position.set(st.bottlePos.x, 70, st.bottlePos.z);
      return { night: nf, el, flash: env.flash === true ? (env.flash = false, true) : false };
    },
    _nextBolt: 3,
  };
  return env;
}
