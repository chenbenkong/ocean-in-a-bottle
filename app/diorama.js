// 瓶内世界：玻璃瓶 / 平滑地形岛屿 / 真实内海水体 / glTF 道具与帆船 / 生灵
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const AXIS_Y = 5.55, SEA = 3.2, OFF = 0.15, CX = -OFF;
const ISLAND = { x: 3.4, z: 0, r: 1.85 };
const ISLET = { x: 9.3, z: 2.15, r: 0.95, h: 0.95 };
const RING_R = 2.65;
const SW = 2.4;                       // 瓶体放大倍数
const BOTTLE_LEN = 17.6 * SW;
const HALF = BOTTLE_LEN / 2;
const AXIS_FLOAT = 3.3;               // 瓶轴静浮高度

function innerR(x) {
  const p = [[0, .15], [.5, 2.8], [1.2, 4.1], [2.2, 4.55], [10.8, 4.55], [11.6, 4.2], [12.7, 3.3], [13.6, 2.2], [14.4, 1.6], [16.4, 1.5], [17.5, 1.5]];
  if (x <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (x <= p[i][0]) {
      const [x0, r0] = p[i - 1], [x1, r1] = p[i];
      return r0 + (r1 - r0) * (x - x0) / (x1 - x0);
    }
  }
  return p[p.length - 1][1];
}
function waveH(x, z, t, ss) {
  const A = 0.34 * (1 + ss * 1.9);
  return A * (Math.sin(x * 1.35 + t * 1.8) * 0.55 + Math.sin(z * 1.9 - t * 1.35) * 0.30
    + Math.sin((x + z) * 0.8 + t * 2.3) * 0.25 + Math.sin(x * 2.6 - t * 3.1) * 0.12 * (1 + ss * 0.7));
}
function terrainH(x, z) {
  // 主岛 + 小岛，平滑高度场
  let h = 0;
  const d1 = Math.hypot(x - ISLAND.x, z - ISLAND.z) / ISLAND.r;
  if (d1 < 1) h = Math.max(h, 2.35 * (1 - Math.pow(d1, 1.65)) + 0.14 * Math.sin(x * 4.2 + z * 3.1) * d1);
  const d2 = Math.hypot(x - ISLET.x, z - ISLET.z) / ISLET.r;
  if (d2 < 1) h = Math.max(h, ISLET.h * (1 - Math.pow(d2, 1.5)) + 0.04);
  return h;
}

const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _E = new THREE.Euler(),
  _P = new THREE.Vector3(), _S = new THREE.Vector3(), _C = new THREE.Color();
function box(w, h, d, color) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color })); }
function voxelSmall(list) {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
  list.forEach((v, i) => {
    _E.set(v.rx || 0, v.ry || 0, v.rz || 0); _Q.setFromEuler(_E);
    _P.set(v.x, v.y, v.z); _S.set(v.sx ?? 1, v.sy ?? 1, v.sz ?? 1);
    _M.compose(_P, _Q, _S); im.setMatrixAt(i, _M);
    im.setColorAt(i, _C.set(v.c ?? 0xffffff));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}

export function createDiorama(scene, manager) {
  const gltfLoader = new GLTFLoader(manager);

  const bottle = new THREE.Group(); bottle.rotation.order = 'YXZ'; scene.add(bottle);
  const contentRoot = new THREE.Group(); contentRoot.rotation.order = 'YXZ'; scene.add(contentRoot);
  const content = new THREE.Group(); contentRoot.add(content);
  content.scale.setScalar(SW);
  content.position.set(-HALF, -AXIS_Y * SW, 0);

  /* —— 玻璃瓶（PBR 透明 + 清漆） —— */
  {
    const prof = [[0.02, .06], [1.6, .06], [2.9, .2], [3.9, .5], [4.45, .95], [4.75, 1.7], [4.85, 2.6], [4.85, 10.6],
      [4.72, 11.5], [4.3, 12.3], [3.4, 13.1], [2.4, 13.9], [1.75, 14.6], [1.6, 15.4], [1.6, 16.5],
      [1.72, 16.8], [1.8, 17.3], [1.72, 17.6]];
    const pts = prof.map(([r, y]) => new THREE.Vector2(r * SW, y * SW));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({
      color: 0xdff2ea, metalness: 0, roughness: 0.04,
      transparent: true, opacity: 0.16, depthWrite: false,
      envMapIntensity: 0.55, clearcoat: 1, clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
    }));
    glass.rotation.z = -Math.PI / 2;
    glass.position.x = -HALF;
    glass.renderOrder = 20;
    bottle.add(glass);
    const corkC = document.createElement('canvas'); corkC.width = 64; corkC.height = 256;
    const cg2 = corkC.getContext('2d');
    cg2.fillStyle = '#c9a06a'; cg2.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 10; i++) {
      cg2.strokeStyle = 'rgba(140,100,55,' + (0.25 + Math.random() * 0.25) + ')';
      cg2.lineWidth = 2 + Math.random() * 3;
      cg2.beginPath(); cg2.moveTo(0, i * 26 + Math.random() * 10);
      cg2.bezierCurveTo(20, i * 26 + 8, 44, i * 26 - 8, 64, i * 26 + Math.random() * 10); cg2.stroke();
    }
    const corkT = new THREE.CanvasTexture(corkC); corkT.colorSpace = THREE.SRGBColorSpace;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(1.42 * SW, 1.5 * SW, 1.15 * SW, 24),
      new THREE.MeshLambertMaterial({ map: corkT }));
    cork.rotation.z = -Math.PI / 2; cork.position.set(18.05 * SW - HALF, 0, 0); bottle.add(cork);
    for (const rr of [15.95, 16.2, 16.45]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * SW * 0.94, 0.045 * SW, 8, 32),
        new THREE.MeshLambertMaterial({ color: 0xa8c8b8, transparent: true, opacity: 0.5 }));
      ring.rotation.y = Math.PI / 2; ring.position.set(rr * SW - HALF, 0, 0); bottle.add(ring);
    }
    const rollC = document.createElement('canvas'); rollC.width = 64; rollC.height = 64;
    const rg2 = rollC.getContext('2d');
    rg2.fillStyle = '#e8d9b0'; rg2.fillRect(0, 0, 64, 64);
    rg2.fillStyle = '#d8c69a'; rg2.fillRect(0, 0, 64, 6); rg2.fillRect(0, 58, 64, 6);
    for (let i = 0; i < 6; i++) {
      rg2.strokeStyle = 'rgba(120,90,50,.4)'; rg2.beginPath();
      rg2.moveTo(8, 14 + i * 8); rg2.lineTo(56, 14 + i * 8); rg2.stroke();
    }
    const rollT = new THREE.CanvasTexture(rollC); rollT.colorSpace = THREE.SRGBColorSpace;
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * SW, 0.5 * SW, 2.4 * SW, 16),
      new THREE.MeshLambertMaterial({ map: rollT }));
    roll.rotation.z = Math.PI / 2 - 0.15; roll.rotation.y = 0.4;
    roll.position.set(1.9 * SW, 0.2 * SW, 1.1 * SW);
    bottle.add(roll);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(1.72 * SW, 1.55 * SW, 0.5 * SW, 24),
      new THREE.MeshLambertMaterial({ color: 0xa32226, roughness: 0.5 }));
    wax.rotation.z = -Math.PI / 2; wax.position.set(18.6 * SW - HALF, 0, 0); bottle.add(wax);
    for (let i = 0; i < 5; i++) {
      const d = box(0.27, 0.5 + Math.random() * 0.4, 0.27, 0xa32226);
      const a = i * 1.7 + 0.4;
      d.position.set(18.35 * SW - HALF, Math.cos(a) * 1.55 * SW, Math.sin(a) * 1.55 * SW); bottle.add(d);
    }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.66 * SW, 0.07 * SW, 8, 28),
      new THREE.MeshLambertMaterial({ color: 0x9a7b4f }));
    rope.rotation.y = Math.PI / 2; rope.position.set(17.35 * SW - HALF, 0, 0); bottle.add(rope);
    const tagC = document.createElement('canvas'); tagC.width = 128; tagC.height = 96;
    const tg = tagC.getContext('2d');
    tg.fillStyle = '#e8d9b0'; tg.fillRect(0, 0, 128, 96);
    tg.strokeStyle = '#8a6a3a'; tg.lineWidth = 6; tg.strokeRect(4, 4, 120, 88);
    tg.fillStyle = '#5a3a1a'; tg.font = 'bold 34px serif'; tg.textAlign = 'center';
    tg.fillText('沧海', 64, 60);
    const tagT = new THREE.CanvasTexture(tagC); tagT.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.72 * SW, 0.54 * SW, 0.05 * SW),
      new THREE.MeshLambertMaterial({ map: tagT }));
    tag.position.set(17.15 * SW - HALF, -1.5 * SW, 0.9 * SW); tag.rotation.z = 0.35; bottle.add(tag);
  }

  /* —— 瓶内日月星空（点缀） —— */
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffb840 })); content.add(sunMesh);
  const moonMeshI = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xdfe6f5 })); content.add(moonMeshI);
  let stars;
  {
    const n = 150, pos = new Float32Array(n * 3);
    let i = 0, guard = 0;
    while (i < n && guard++ < 5000) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(3.8).add(new THREE.Vector3(5.6, 5.55, 0));
      if (v.y < 3.6 || v.x < 1.2 || v.x > 10.2) continue;
      if (Math.hypot(v.y - 5.55, v.z) > innerR(v.x) - 0.3) continue;
      pos[i * 3] = v.x + CX; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; i++;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.055, transparent: true, opacity: 0 }));
    content.add(stars);
  }

  /* —— 深水体（贴合瓶壁，半透明渐变） —— */
  const deepU = { uTime: { value: 0 }, uSea: { value: SEA }, uNight: { value: 0 } };
  {
    const prof = [[0.02, .06], [1.58, .06], [2.86, .2], [3.84, .5], [4.33, .95], [4.68, 1.7], [4.78, 2.6], [4.78, 10.6], [4.65, 11.5], [4.24, 12.3], [3.35, 13.1], [2.36, 13.9], [1.72, 14.6], [1.58, 15.4]];
    const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: deepU,
      vertexShader: `varying vec3 vW;
        void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz;
        gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `varying vec3 vW; uniform float uTime,uSea,uNight;
        void main(){
          if (vW.y > uSea+0.04) discard;
          float d=clamp((uSea-vW.y)/2.1,0.0,1.0);
          vec3 col=mix(vec3(0.035,0.18,0.27), vec3(0.01,0.05,0.16), pow(d,0.75));
          col *= (0.3+0.7*(1.0-uNight));
          float sh=0.5+0.5*sin(vW.x*3.5+uTime*1.1)*sin(vW.z*3.5-uTime*0.8);
          col += vec3(0.04,0.11,0.11)*sh*(1.0-d)*0.9;
          gl_FragColor=vec4(col, 0.62-0.18*(1.0-d));
        }`,
    });
    const deep = new THREE.Mesh(geo, mat);
    deep.rotation.z = -Math.PI / 2;
    deep.position.set(0, AXIS_Y, 0);
    deep.renderOrder = 2; content.add(deep);
  }

  /* —— 内海水体表面（贴合瓶壁的连续网格 + 顶点波浪 + 解析法线） —— */
  const waterU = {
    uTime: { value: 0 }, uStorm: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunCol: { value: new THREE.Color(0xffe0b0) },
    uAmb: { value: 0.6 },
    uHorizon: { value: new THREE.Color(0x9fd0ee) },
    uNmap: { value: null },
  };
  {
    const s2 = 256, c = document.createElement('canvas'); c.width = c.height = s2;
    const g = c.getContext('2d'), img = g.createImageData(s2, s2);
    const HN = (x, y) => Math.sin(x * 0.11 + y * 0.07) * 3 + Math.sin(x * 0.05 - y * 0.13) * 4 + Math.sin((x + y) * 0.031) * 5;
    for (let y = 0; y < s2; y++) for (let x = 0; x < s2; x++) {
      const dx = HN(x + 1, y) - HN(x - 1, y), dy = HN(x, y + 1) - HN(x, y - 1);
      const n = new THREE.Vector3(-dx, 8, -dy).normalize(), i = (y * s2 + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    waterU.uNmap.value = t;
  }
  {
    const X0 = 0.85, X1 = 10.45, NX = 96, NZ = 56, ZMAX = 3.6;
    const pos = [], idx = [];
    const zrOf = x => Math.sqrt(Math.max(0, (innerR(x) - 0.05) ** 2 - (SEA - AXIS_Y) ** 2));
    const rowZ = [];
    for (let j = 0; j <= NZ; j++) rowZ.push(-ZMAX + 2 * ZMAX * j / NZ);
    const grid = [];
    let vi = 0;
    for (let i = 0; i <= NX; i++) {
      const x = X0 + (X1 - X0) * i / NX;
      const zr = zrOf(x);
      grid.push([]);
      for (let j = 0; j <= NZ; j++) {
        const z = Math.max(-zr, Math.min(zr, rowZ[j]));
        pos.push(x + CX, SEA, z);
        grid[i].push(vi++);
      }
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
      const a = grid[i][j], b = grid[i + 1][j], c = grid[i + 1][j + 1], d = grid[i][j + 1];
      idx.push(a, b, d, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: waterU,
      vertexShader: `
        uniform float uTime,uStorm;
        varying vec3 vW; varying vec3 vN; varying float vH; varying vec2 vUv;
        void main(){
          vec3 p = position;
          float A = 0.34*(1.0+uStorm*1.9);
          float t = uTime;
          float dx = A*( cos(p.x*1.35+t*1.8)*0.55*1.35 + cos((p.x+p.z)*0.8+t*2.3)*0.25*0.8 + cos(p.x*2.6-t*3.1)*0.12*2.6*(1.0+uStorm*0.7) );
          float dz = A*( cos(p.z*1.9-t*1.35)*0.30*1.9 + cos((p.x+p.z)*0.8+t*2.3)*0.25*0.8 );
          float h  = A*( sin(p.x*1.35+t*1.8)*0.55 + sin(p.z*1.9-t*1.35)*0.30
                   + sin((p.x+p.z)*0.8+t*2.3)*0.25 + sin(p.x*2.6-t*3.1)*0.12*(1.0+uStorm*0.7) );
          p.y += h; vH = h;
          vN = normalize(vec3(-dx, 1.0, -dz));
          vUv = p.xz;
          vec4 wp = modelMatrix*vec4(p,1.0); vW = wp.xyz;
          gl_Position = projectionMatrix*viewMatrix*wp;
        }`,
      fragmentShader: `
        varying vec3 vW; varying vec3 vN; varying float vH; varying vec2 vUv;
        uniform vec3 uSunDir,uSunCol,uHorizon; uniform float uAmb,uTime,uStorm;
        uniform sampler2D uNmap;
        void main(){
          vec3 N = normalize(vN);
          vec3 n1 = texture2D(uNmap, vUv*0.55 + uTime*vec2(0.020,0.013)).xyz*2.0-1.0;
          vec3 n2 = texture2D(uNmap, vUv*1.40 - uTime*vec2(0.016,0.022)).xyz*2.0-1.0;
          N = normalize(N + vec3(n1.x,0.0,n1.z)*0.30 + vec3(n2.x,0.0,n2.z)*0.16);
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(dot(N,V),0.0), 3.0);
          vec3 deep = vec3(0.015,0.10,0.18);
          vec3 shallow = vec3(0.04,0.24,0.30);
          vec3 col = mix(deep, shallow, 0.5+0.5*N.y) * (uAmb*0.9+0.35);
          col += uSunCol * pow(max(dot(reflect(-normalize(uSunDir),N),V),0.0), 120.0) * 1.1;
          col = mix(col, uHorizon*0.85, fres*0.7);
          float foam = smoothstep(0.30, 0.52, vH) * (0.45 + 0.45*uStorm);
          col = mix(col, vec3(0.93,0.96,0.97), foam);
          gl_FragColor = vec4(col, 0.60 + foam*0.3);
        }`,
    });
    const sea = new THREE.Mesh(geo, mat);
    sea.renderOrder = 3; sea.frustumCulled = false;
    content.add(sea);
  }

  /* —— 岛缘白沫环 —— */
  function foamRing(cx2, cz2, r0, r1, op) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    for (let i = 12; i >= 1; i--) {
      const rr = (r0 + (r1 - r0) * (1 - i / 12)) * 64;
      g.strokeStyle = `rgba(255,255,255,${0.16 * op})`;
      g.lineWidth = 3;
      g.beginPath(); g.arc(64, 64, Math.max(2, rr), 0, Math.PI * 2); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r1 * 2.6, r1 * 2.6),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 1 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx2 + CX, SEA + 0.1, cz2);
    m.renderOrder = 4;
    content.add(m);
  }
  foamRing(ISLAND.x, ISLAND.z, 1.55, 2.0, 1);
  foamRing(ISLET.x, ISLET.z, 0.8, 1.05, 0.8);

  /* —— 平滑岛屿地形（顶点色网格，替换体素） —— */
  {
    const X0 = ISLAND.x - ISLAND.r - 0.4, X1 = ISLAND.x + ISLAND.r + 0.4;
    const Z0 = -2.4, Z1 = 3.3;
    const N = 96, pos = [], cols = [], idx = [];
    const sand = new THREE.Color(0xdfc88f), sandWet = new THREE.Color(0xb99f6e),
      grass = new THREE.Color(0x5f9a44), grass2 = new THREE.Color(0x6fae4e),
      deep = new THREE.Color(0x4a4636), rock = new THREE.Color(0x8d9188);
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const x = X0 + (X1 - X0) * i / N, z = Z0 + (Z1 - Z0) * j / N;
      const h = terrainH(x, z);
      const y = h > 0.02 ? SEA + h : SEA - 0.55;
      pos.push(x + CX, Math.min(y, SEA + 2.5), z);
      const c = new THREE.Color();
      if (h <= 0.06) c.copy(deep).lerp(sandWet, Math.max(0, 1 + h * 6));
      else if (h < 0.5) c.copy(sandWet).lerp(sand, h / 0.5);
      else if (h < 0.85) c.copy(sand);
      else c.copy(grass).lerp(grass2, 0.5 + 0.5 * Math.sin(x * 9.7 + z * 7.3));
      if (h > 1.7) c.lerp(rock, Math.min(1, (h - 1.7) * 1.4) * 0.6);
      c.multiplyScalar(0.92 + 0.08 * Math.sin(x * 31.7 + z * 17.3));
      cols.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const a = i * (N + 1) + j, b = (i + 1) * (N + 1) + j, c2 = (i + 1) * (N + 1) + j + 1, d = i * (N + 1) + j + 1;
      idx.push(a, b, d, b, c2, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const isl = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
    content.add(isl);
  }

  /* —— 灯塔 —— */
  let lanternMat, beamMat, beamRot, lhLamp;
  {
    const bx = 3.25 + CX, bz = 0.25;
    const baseY = SEA + terrainH(3.25, 0.25);
    const g = new THREE.Group(); g.position.set(bx, baseY - 0.1, bz);
    const segs = [[0.55, 0.5, 0xf6f1e6], [0.48, 0.45, 0xc23a32], [0.42, 0.45, 0xf6f1e6], [0.36, 0.45, 0xc23a32], [0.3, 0.4, 0xf6f1e6]];
    let y = 0.2;
    for (const [r, h, c] of segs) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, h, 20), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
      m.position.y = y + h / 2; y += h; g.add(m);
    }
    const gal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.8 }));
    gal.position.y = y + 0.06; g.add(gal);
    lanternMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12), lanternMat);
    lan.position.y = y + 0.28; g.add(lan);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 12), new THREE.MeshStandardMaterial({ color: 0x8a2c26, roughness: 0.5 }));
    roof.position.y = y + 0.56; g.add(roof);
    lhLamp = new THREE.PointLight(0xffe2a0, 0, 7, 1.6); lhLamp.position.y = y + 0.3; g.add(lhLamp);
    const bc = document.createElement('canvas'); bc.width = 8; bc.height = 128;
    const bg = bc.getContext('2d');
    const grd = bg.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, 'rgba(255,242,176,0.55)');
    grd.addColorStop(0.45, 'rgba(255,242,176,0.18)');
    grd.addColorStop(1, 'rgba(255,242,176,0)');
    bg.fillStyle = grd; bg.fillRect(0, 0, 8, 128);
    const beamTex = new THREE.CanvasTexture(bc);
    beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: 0xfff2b0, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
    beamRot = new THREE.Group(); beamRot.position.y = y + 0.3;
    const beamGeo = new THREE.ConeGeometry(0.26, 2.2, 18, 1, true);
    beamGeo.translate(0, -1.1, 0);
    for (const rot of [0, Math.PI]) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.rotation.z = Math.PI / 2; beam.rotation.y = rot;
      beamRot.add(beam);
    }
    g.add(beamRot);
    content.add(g);
  }
  const hutWinMat = new THREE.MeshBasicMaterial({ color: 0xffc36a });
  const hutWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.2), hutWinMat);
  hutWin.position.set(4.45 + CX + 0.52, SEA + terrainH(4.45, 0.85) + 0.36, 0.85);
  content.add(hutWin);
  const hutLamp = new THREE.PointLight(0xffb45c, 0, 5, 1.6);
  hutLamp.position.set(4.45 + CX + 0.75, SEA + terrainH(4.45, 0.85) + 0.4, 0.85); content.add(hutLamp);

  /* —— 水下遗存 —— */
  {
    const list = [];
    const c1 = { x: 7.0 + CX, y: 1.9, z: 1.45 };
    list.push({ ...c1, sx: 0.55, sy: 0.3, sz: 0.38, ry: 0.5, c: 0x5f3d22 });
    list.push({ ...c1, y: 2.08, sx: 0.58, sy: 0.08, sz: 0.4, ry: 0.5, c: 0x6e4828 });
    list.push({ ...c1, y: 1.96, sx: 0.6, sy: 0.07, sz: 0.1, ry: 0.5, c: 0xd8a832 });
    const a = { x: 8.35 + CX, y: 2.0, z: -0.85 };
    list.push({ ...a, sx: 1.0, sy: 0.14, sz: 0.14, rz: 0.45, c: 0x5c6470 });
    list.push({ ...a, x: a.x - 0.2, y: a.y + 0.28, sx: 0.14, sy: 0.5, sz: 0.14, c: 0x545c66 });
    list.push({ ...a, x: a.x + 0.35, y: a.y + 0.32, sx: 0.4, sy: 0.12, sz: 0.12, rz: -0.8, c: 0x5c6470 });
    const am = { x: 6.25 + CX, y: 1.95, z: -1.7 };
    list.push({ ...am, sx: 0.62, sy: 0.36, sz: 0.36, rz: 1.35, c: 0xa8642f });
    list.push({ ...am, x: am.x + 0.32, y: am.y + 0.22, sx: 0.26, sy: 0.16, sz: 0.16, rz: 1.35, c: 0x9a5a2a });
    const corals = [[6.5, 0.7, 0xff7a6a], [8.6, -0.1, 0xffb26a], [7.6, 1.85, 0xc46aff], [6.8, -2.0, 0xff8a5a]];
    for (const [cx2, cz2, cc] of corals) {
      for (let i = 0; i < 8; i++) {
        const ox = (Math.random() - 0.5) * 0.6, oz = (Math.random() - 0.5) * 0.6, h = 0.2 + Math.random() * 0.5;
        list.push({ x: cx2 + CX + ox, y: 1.8 + h / 2, z: cz2 + oz, sx: 0.1, sy: h, sz: 0.1,
          rx: (Math.random() - 0.5) * 0.7, rz: (Math.random() - 0.5) * 0.7, c: cc });
      }
    }
    content.add(voxelSmall(list));
    const ugl = new THREE.PointLight(0xffc84a, 1.8, 3.2, 1.8);
    ugl.position.set(7.0 + CX, 2.3, 1.45); content.add(ugl);
  }
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.75 }), 34);
  bubbles.frustumCulled = false; content.add(bubbles);
  {
    const src = [[7.0, 1.45], [6.5, 0.7], [8.6, -0.1], [7.6, 1.85]].map(([x, z]) => [x + CX, z]);
    bubbles.userData.seed = [];
    for (let i = 0; i < 34; i++) bubbles.userData.seed.push({ s: Math.random(), v: 0.25 + Math.random() * 0.35, src: src[i % 4] });
  }

  /* —— glTF 道具 —— */
  const propRoot = new THREE.Group(); content.add(propRoot);
  const MODEL = './assets/models/pirate/';
  function addGltf(file, { x = 0, z = 0, y = null, s = 1, ry = 0, parent = propRoot } = {}) {
    gltfLoader.load(MODEL + file, g => {
      const m = g.scene;
      const bb = new THREE.Box3().setFromObject(m);
      const size = bb.getSize(new THREE.Vector3());
      const k = s / Math.max(size.x, 0.001);
      m.scale.setScalar(k);
      m.position.set(x + CX, y ?? (SEA + terrainH(x, z) - 0.02), z);
      m.rotation.y = ry;
      parent.add(m);
    });
  }
  addGltf('palm-detailed-straight.glb', { x: 2.35, z: 1.15, s: 1.15 });
  addGltf('palm-detailed-bend.glb', { x: 4.15, z: -1.0, s: 1.05, ry: 1.2 });
  addGltf('palm-detailed-straight.glb', { x: 2.75, z: -1.35, s: 0.85, ry: 2.4 });
  addGltf('palm-detailed-bend.glb', { x: 9.15, z: 2.25, s: 0.8, ry: -0.8 });
  addGltf('rocks-sand-a.glb', { x: 2.0, z: 0.4, s: 0.5, ry: 0.7 });
  addGltf('rocks-sand-b.glb', { x: 4.8, z: -0.4, s: 0.45, ry: 2.1 });
  addGltf('rocks-sand-c.glb', { x: 8.4, z: 2.7, s: 0.5, ry: 1.1, y: SEA + 0.05 });
  addGltf('grass-patch.glb', { x: 3.6, z: 0.9, s: 0.9, ry: 0.4 });
  addGltf('grass-patch.glb', { x: 2.4, z: -0.5, s: 0.8, ry: 2.8 });
  addGltf('grass-patch.glb', { x: 9.0, z: 1.7, s: 0.6, ry: 1.4 });
  {
    const th = 2.4, dir = { x: Math.cos(th), z: Math.sin(th) };
    addGltf('structure-platform-dock.glb', { x: ISLAND.x + dir.x * 1.55, z: ISLAND.z + dir.z * 1.55, s: 1.15, ry: -th + Math.PI / 2, y: SEA + 0.22 });
  }
  addGltf('chest.glb', { x: 3.95, z: -0.55, s: 0.5, ry: 0.6 });
  addGltf('barrel.glb', { x: 5.35, z: 1.35, s: 0.5 });
  addGltf('crate.glb', { x: 5.15, z: 1.7, s: 0.5, ry: 0.7 });
  // 小屋（Kenney 结构体 + 屋顶）
  const hutG = new THREE.Group(); content.add(hutG);
  gltfLoader.load(MODEL + 'structure.glb', g => {
    const m = g.scene;
    const bb = new THREE.Box3().setFromObject(m);
    const size = bb.getSize(new THREE.Vector3());
    m.scale.setScalar(0.9 / Math.max(size.x, 0.001));
    const bb2 = new THREE.Box3().setFromObject(m);
    m.position.set(4.45 + CX - (bb2.min.x + bb2.max.x) / 2, SEA + terrainH(4.45, 0.85) - bb2.min.y, 0.85 - (bb2.min.z + bb2.max.z) / 2);
    hutG.add(m);
  });
  gltfLoader.load(MODEL + 'structure-roof.glb', g => {
    const m = g.scene;
    const bb = new THREE.Box3().setFromObject(m);
    const size = bb.getSize(new THREE.Vector3());
    m.scale.setScalar(0.95 / Math.max(size.x, 0.001));
    const bb2 = new THREE.Box3().setFromObject(m);
    m.position.set(4.45 + CX - (bb2.min.x + bb2.max.x) / 2, SEA + terrainH(4.45, 0.85) + 0.62 - bb2.min.y, 0.85 - (bb2.min.z + bb2.max.z) / 2);
    hutG.add(m);
  });
  const goldGlow = new THREE.PointLight(0xffc84a, 1.6, 2.6, 1.8);
  goldGlow.position.set(3.95 + CX, SEA + terrainH(3.95, -0.55) + 0.45, -0.55); content.add(goldGlow);

  /* —— glTF 帆船 —— */
  const ship = new THREE.Group(), shipTilt = new THREE.Group();
  ship.add(shipTilt); content.add(ship);
  gltfLoader.load(MODEL + '../pinnace/ship_pinnace.gltf', g => {
    const m = g.scene;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; } });
    const bb = new THREE.Box3().setFromObject(m);
    const size = bb.getSize(new THREE.Vector3());
    const k = 3.2 / Math.max(size.x, size.z, 0.001);
    const wrap = new THREE.Group();
    wrap.rotation.y = Math.PI / 2; // 模型长轴沿 Z → 转为 +X 朝前
    m.position.set(0, 0.45, 0); // 略微抬升，保证船体/甲板高于内海面
    wrap.add(m);
    wrap.scale.setScalar(k);
    shipTilt.add(wrap);
  }, undefined, e => { window.__errs.push('PINNACE: ' + e); });

  /* —— 尾迹 & 飞沫 —— */
  const wakePool = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xeef6f4, transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 5; content.add(m);
    wakePool.push({ m, life: 0 });
  }
  let wakeIdx = 0, wakeTimer = 0;
  const SPRAY_N = 110;
  const sprayGeo = new THREE.BufferGeometry();
  const sprayPos = new Float32Array(SPRAY_N * 3), sprayVel = [], sprayLife = new Float32Array(SPRAY_N);
  for (let i = 0; i < SPRAY_N; i++) { sprayVel.push(new THREE.Vector3()); sprayPos[i * 3 + 1] = -99; }
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xeef8f6, size: 0.1, transparent: true, opacity: 0.85, depthWrite: false }));
  spray.frustumCulled = false; content.add(spray);
  let sprayIdx = 0;
  function emitSpray(p, v) {
    sprayPos[sprayIdx * 3] = p.x; sprayPos[sprayIdx * 3 + 1] = p.y; sprayPos[sprayIdx * 3 + 2] = p.z;
    sprayVel[sprayIdx].copy(v); sprayLife[sprayIdx] = 0.7 + Math.random() * 0.4;
    sprayIdx = (sprayIdx + 1) % SPRAY_N;
  }
  const OSPRAY_N = 100;
  const oSprayGeo = new THREE.BufferGeometry();
  const oSprayPos = new Float32Array(OSPRAY_N * 3), oSprayVel = [], oSprayLife = new Float32Array(OSPRAY_N);
  for (let i = 0; i < OSPRAY_N; i++) { oSprayVel.push(new THREE.Vector3()); oSprayPos[i * 3 + 1] = -99; }
  oSprayGeo.setAttribute('position', new THREE.BufferAttribute(oSprayPos, 3));
  const oSpray = new THREE.Points(oSprayGeo, new THREE.PointsMaterial({ color: 0xeef8f6, size: 0.4, transparent: true, opacity: 0.8, depthWrite: false }));
  oSpray.frustumCulled = false; scene.add(oSpray);
  let oSprayIdx = 0;
  function emitOSpray(p, v) {
    oSprayPos[oSprayIdx * 3] = p.x; oSprayPos[oSprayIdx * 3 + 1] = p.y; oSprayPos[oSprayIdx * 3 + 2] = p.z;
    oSprayVel[oSprayIdx].copy(v); oSprayLife[oSprayIdx] = 0.8 + Math.random() * 0.5;
    oSprayIdx = (oSprayIdx + 1) % OSPRAY_N;
  }

  /* —— 生灵 —— */
  const gulls = [];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    g.add(box(0.22, 0.08, 0.09, 0xf2f2ee));
    const w1 = box(0.16, 0.03, 0.3, 0xe2e2dc); w1.position.set(0, 0.02, 0.17); g.add(w1);
    const w2 = box(0.16, 0.03, 0.3, 0xe2e2dc); w2.position.set(0, 0.02, -0.17); g.add(w2);
    content.add(g);
    gulls.push({ g, w1, w2, r: 1.3 + Math.random() * 1.1, h: 6.6 + Math.random() * 1.4,
      sp: (0.35 + Math.random() * 0.3) * (i % 2 ? 1 : -1), ph: Math.random() * 7, cx: 4.6 + Math.random() * 2, cz: (Math.random() - 0.5) * 1.4 });
  }
  function softTex() {
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
  const cloudMat = new THREE.SpriteMaterial({ map: softTex(), color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  const clouds = [];
  for (const [cx2, cy, cz2, n] of [[4.6, 8.75, 0.8, 5], [6.7, 8.8, -0.9, 4], [5.8, 9.0, 0.15, 6], [7.5, 8.6, 0.95, 3], [4.0, 8.7, -1.1, 4]]) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(cloudMat);
      const sc = 0.55 + Math.random() * 0.45;
      sp.scale.set(sc, sc * 0.55, 1);
      sp.position.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.5);
      g.add(sp);
    }
    g.position.set(cx2 + CX, cy, cz2);
    clouds.push({ g, vx: 0.08 + Math.random() * 0.06 });
    content.add(g);
  }
  function makeWhale() {
    const g = new THREE.Group(); const wc = 0x3e5a70;
    g.add(box(1.5, 0.52, 0.48, wc));
    const hd = box(0.6, 0.38, 0.36, wc); hd.position.x = 0.95; g.add(hd);
    const tl = box(0.6, 0.22, 0.22, wc); tl.position.x = -0.95; g.add(tl);
    const fl = box(0.4, 0.07, 0.8, wc); fl.position.set(-1.3, 0.1, 0); g.add(fl);
    const fn1 = box(0.4, 0.06, 0.42, wc); fn1.position.set(0.3, -0.22, 0.3); g.add(fn1);
    const fn2 = box(0.4, 0.06, 0.42, wc); fn2.position.set(0.3, -0.22, -0.3); g.add(fn2);
    return g;
  }
  const whales = [
    { g: makeWhale(), cx: 7.4, cz: -1.3, ph: 0, sc: 1.0 },
    { g: makeWhale(), cx: 6.1, cz: 2.05, ph: 8, sc: 0.7 },
  ];
  whales.forEach(w => { w.g.scale.setScalar(w.sc); content.add(w.g); });
  const buoy = new THREE.Group();
  {
    buoy.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 10), new THREE.MeshLambertMaterial({ color: 0xc23a32 })));
    const bw = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 10), new THREE.MeshLambertMaterial({ color: 0xf2ede2 }));
    bw.position.y = 0.05; buoy.add(bw);
    const bp = box(0.04, 0.34, 0.04, 0x4a3524); bp.position.y = 0.3; buoy.add(bp);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd76e }));
    bl.position.y = 0.5; buoy.add(bl);
    buoy.position.set(7.7 + CX, SEA, 1.9); content.add(buoy);
  }
  const fish = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.06, 0.05),
    new THREE.MeshLambertMaterial({ color: 0xe88a3a }), 22);
  fish.frustumCulled = false; content.add(fish);
  const crabs = [];
  for (const [th0, d] of [[-0.8, 1.45], [0.6, 1.5], [2.9, 1.42]]) {
    const g = new THREE.Group();
    g.add(box(0.16, 0.07, 0.12, 0xc23a32));
    const cl1 = box(0.06, 0.05, 0.06, 0xa82a26); cl1.position.set(0.09, 0.02, 0.05); g.add(cl1);
    const cl2 = box(0.06, 0.05, 0.06, 0xa82a26); cl2.position.set(0.09, 0.02, -0.05); g.add(cl2);
    content.add(g);
    crabs.push({ g, th0, d, ph: Math.random() * 7 });
  }
  const crab2 = new THREE.Group(); crab2.add(box(0.14, 0.06, 0.1, 0xc23a32)); content.add(crab2);

  /* —— 更新 —— */
  const tmpV = new THREE.Vector3();
  let smoothHeave = 0, smoothPitch = 0, smoothRoll = 0;
  let heaveY = AXIS_FLOAT, heaveV = 0, pitchA = 0, pitchV = 0, rollA = 0, rollV = 0;
  let driftYaw = 0.6;
  let simT = 0, storm = 0, speed = 1;

  const WAVES_LAZY = { dx: 0.985, dz: 0.174 };
  const dio = {
    bottle, contentRoot,
    update(dt, rt, st, swellHfn) {
      simT = st.simT; storm = st.storm; speed = st.speed;
      waterU.uStorm.value = storm;
      waterU.uTime.value = simT;
      deepU.uTime.value = simT;
      // 深水体裁剪面 = 内海平面的世界高度（随瓶体浮沉）
      deepU.uSea.value = bottle.position.y - SW * (AXIS_Y - SEA);

      /* —— 瓶体浮力 —— */
      {
        const c = Math.cos(driftYaw), s = Math.sin(driftYaw);
        const bx = bottle.position.x, bz = bottle.position.z;
        const sf = 1 + storm * 1.8;
        const hF = swellHfn(bx + c * 18, bz + s * 18, simT, sf);
        const hA = swellHfn(bx - c * 18, bz - s * 18, simT, sf);
        const hL = swellHfn(bx + s * 9, bz - c * 9, simT, sf);
        const hR = swellHfn(bx - s * 9, bz + c * 9, simT, sf);
        const targetHeave = AXIS_FLOAT + (hF + hA + hL + hR) / 4 * 0.85;
        const targetPitch = Math.atan2(hF - hA, 36);
        const targetRoll = Math.atan2(hL - hR, 18);
        heaveV += ((targetHeave - heaveY) * 22 - heaveV * 5.5) * dt; heaveY += heaveV * dt;
        pitchV += ((targetPitch - pitchA) * 18 - pitchV * 4.5) * dt; pitchA += pitchV * dt;
        rollV += ((targetRoll - rollA) * 18 - rollV * 4.5) * dt; rollA += rollV * dt;
        bottle.position.y = heaveY;
        bottle.rotation.z = pitchA + storm * Math.sin(rt * 2.1) * 0.02;
        bottle.rotation.x = rollA + storm * Math.sin(rt * 1.7) * 0.025;
        bottle.rotation.y = driftYaw;
        // 漂流物理：摇杆转向/推进 + 波浪推动（永不静止）
        const stick = st.stick || { x: 0, y: 0 };
        const seaYaw = Math.atan2(WAVES_LAZY.dz, WAVES_LAZY.dx);           // 主浪方向
        const wander = Math.sin(simT * 0.07) * 0.10 + Math.sin(simT * 0.023 + 2) * 0.07;
        const waveYaw = Math.sin(simT * 0.31) * 0.05 * (1 + storm);        // 波浪拍打的偏航摆动
        driftYaw += (stick.x * 0.95 + wander + waveYaw) * dt;
        const surge = 2.4 + stick.y * 4.5                                  // 摇杆推进
                    + Math.sin(simT * 0.42) * 0.7 * (1 + storm)            // 涌浪起伏推力
                    + storm * 2.0;
        bottle.position.x += (Math.cos(driftYaw) + WAVES_LAZY.dx * 0.35) * dt * surge;
        bottle.position.z += (Math.sin(driftYaw) + WAVES_LAZY.dz * 0.35) * dt * surge;
        // 横向摇摆（浪从侧面的推挤）
        const swayR = Math.sin(simT * 0.55 + 1.3) * 0.45 * (1 + storm * 1.5);
        bottle.position.x += -Math.sin(driftYaw) * swayR * dt;
        bottle.position.z += Math.cos(driftYaw) * swayR * dt;
        // 航行尾迹：瓶尾持续白色泡沫，凸显移动
        if (Math.random() < 0.75) {
          const lat = (Math.random() - 0.5) * 9;
          emitOSpray(tmpV.set(bx - c * 16 - s * lat, 0.15, bz + s * 16 - c * lat),
            new THREE.Vector3(-c * 0.5 + (Math.random() - 0.5), 0.4 + Math.random() * 0.6, -s * 0.5 + (Math.random() - 0.5)));
        }
        if (Math.hypot(bottle.position.x, bottle.position.z) > 46) {
          driftYaw = Math.atan2(-bottle.position.z, -bottle.position.x) + (Math.random() - 0.5);
        }
        contentRoot.position.copy(bottle.position);
        contentRoot.rotation.y = bottle.rotation.y;
        contentRoot.rotation.z = pitchA * 0.25;
        contentRoot.rotation.x = rollA * 0.25;
        if (storm > 0.25 && Math.random() < storm * 0.7) {
          const a = Math.random() * Math.PI * 2, rr = 12.2;
          emitOSpray(tmpV.set(bx + Math.cos(a) * rr, 0.4, bz + Math.sin(a) * rr),
            new THREE.Vector3(Math.cos(a) * (2 + Math.random() * 3), 5 + Math.random() * 6 * storm, Math.sin(a) * (2 + Math.random() * 3)));
        }
      }
      for (let i = 0; i < OSPRAY_N; i++) {
        if (oSprayLife[i] <= 0) { oSprayPos[i * 3 + 1] = -99; continue; }
        oSprayLife[i] -= dt;
        oSprayVel[i].y -= 16 * dt;
        oSprayPos[i * 3] += oSprayVel[i].x * dt;
        oSprayPos[i * 3 + 1] += oSprayVel[i].y * dt;
        oSprayPos[i * 3 + 2] += oSprayVel[i].z * dt;
      }
      oSprayGeo.attributes.position.needsUpdate = true;

      /* —— 帆船 —— */
      {
        const th = simT * 0.16;
        const px = ISLAND.x + Math.cos(th) * RING_R, pz = ISLAND.z + Math.sin(th) * RING_R;
        const dx = -Math.sin(th), dz = Math.cos(th);
        const hd = Math.atan2(-dz, dx);
        const wx = px + CX, wz = pz;
        ship.position.set(wx, 0, wz);
        ship.rotation.y = hd;
        const c = Math.cos(hd), s = Math.sin(hd);
        const pts = [[1.1, 0], [-1.1, 0], [0, 0.45], [0, -0.45]];
        const hs = pts.map(([lx, lz]) => waveH(wx + lx * c + lz * s, wz - lx * s + lz * c, simT, storm));
        const heave = (hs[0] + hs[1] + hs[2] + hs[3]) / 4;
        const pitch = Math.atan2(hs[0] - hs[1], 2.2);
        const roll = Math.atan2(hs[3] - hs[2], 0.9);
        smoothHeave += (heave - smoothHeave) * Math.min(1, dt * 5);
        smoothPitch += (pitch - smoothPitch) * Math.min(1, dt * 5);
        smoothRoll += (roll - smoothRoll) * Math.min(1, dt * 5);
        ship.position.y = SEA + smoothHeave - 0.05;
        shipTilt.rotation.z = smoothPitch;
        shipTilt.rotation.x = smoothRoll;
        wakeTimer -= dt * speed;
        if (wakeTimer <= 0) {
          wakeTimer = 0.09;
          const w = wakePool[wakeIdx = (wakeIdx + 1) % wakePool.length];
          w.life = 1;
          w.m.position.set(wx - 1.35 * c, 0, wz + 1.35 * s);
        }
        for (const w of wakePool) {
          if (w.life <= 0) { w.m.material.opacity = 0; continue; }
          w.life -= dt * speed * 0.65;
          w.m.position.y = SEA + waveH(w.m.position.x, w.m.position.z, simT, storm) + 0.28;
          const sc = 0.4 + (1 - Math.max(0, w.life)) * 1.1;
          w.m.scale.set(sc, sc, 1);
          w.m.material.opacity = Math.max(0, w.life) * 0.55;
        }
        const bowX = wx + 1.5 * c, bowZ = wz - 1.5 * s;
        if (Math.random() < 0.25 + storm * 0.5) {
          emitSpray(tmpV.set(bowX, SEA + 0.2, bowZ),
            new THREE.Vector3(c * (0.8 + Math.random()), 1.2 + Math.random() * 1.4 + storm * 2, (Math.random() - 0.5) * 0.8));
        }
      }
      for (let i = 0; i < SPRAY_N; i++) {
        if (sprayLife[i] <= 0) { sprayPos[i * 3 + 1] = -99; continue; }
        sprayLife[i] -= dt;
        sprayVel[i].y -= 6.5 * dt;
        sprayPos[i * 3] += sprayVel[i].x * dt;
        sprayPos[i * 3 + 1] += sprayVel[i].y * dt;
        sprayPos[i * 3 + 2] += sprayVel[i].z * dt;
      }
      sprayGeo.attributes.position.needsUpdate = true;

      /* —— 生灵与点缀 —— */
      for (const gl of gulls) {
        const a = rt * gl.sp + gl.ph;
        gl.g.position.set(gl.cx + Math.cos(a) * gl.r + CX, gl.h + Math.sin(rt * 0.7 + gl.ph) * 0.25, gl.cz + Math.sin(a) * gl.r * 0.7);
        gl.g.rotation.y = -a - (gl.sp > 0 ? 0 : Math.PI);
        const f = Math.sin(rt * 9 + gl.ph) * 0.55 + 0.1;
        gl.w1.rotation.x = f; gl.w2.rotation.x = -f;
      }
      for (const cl of clouds) {
        cl.g.position.x += cl.vx * dt * speed;
        if (cl.g.position.x - CX > 9.3) cl.g.position.x = 1.6 + CX;
      }
      for (const w of whales) {
        const cyc = ((simT + w.ph) % 16) / 16;
        if (cyc > 0.55 && cyc < 0.8) {
          const u = (cyc - 0.55) / 0.25;
          const a = rt * 0.2;
          w.g.position.set(w.cx + CX + Math.cos(a) * 0.3, 2.2 + Math.sin(u * Math.PI) * 3.3 * w.sc, w.cz + Math.sin(a) * 0.3);
          w.g.rotation.z = (0.5 - u) * 2.3;
          w.g.rotation.y = -a;
          if ((u > 0.02 && u < 0.08) || (u > 0.92 && u < 0.98)) {
            for (let k = 0; k < 5; k++)
              emitSpray(tmpV.set(w.g.position.x, SEA + 0.1, w.g.position.z),
                new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2.2));
          }
        } else if (cyc <= 0.55) {
          const a = rt * 0.25;
          w.g.position.set(w.cx + CX + Math.cos(a) * 0.6, 2.15, w.cz + Math.sin(a) * 0.5);
          w.g.rotation.z = Math.sin(rt * 0.8) * 0.06;
          w.g.rotation.y = -a;
        } else {
          w.g.position.y = Math.max(1.9, w.g.position.y - dt * 3);
          w.g.rotation.z *= 0.95;
        }
      }
      buoy.position.y = SEA + waveH(buoy.position.x, buoy.position.z, simT, storm) + 0.05;
      buoy.rotation.z = Math.sin(simT * 1.4) * 0.1 + storm * Math.sin(simT * 5) * 0.15;
      buoy.rotation.x = Math.cos(simT * 1.1) * 0.08;
      for (let i = 0; i < 22; i++) {
        const a = simT * 0.6 + i * 0.45;
        const r = 0.55 + 0.28 * Math.sin(i * 2.1);
        _P.set(7.2 + CX + Math.cos(a) * r, 2.15 + 0.18 * Math.sin(simT * 1.3 + i), -1.2 + Math.sin(a) * r * 0.8);
        _E.set(0, -a, 0); _Q.setFromEuler(_E);
        _M.compose(_P, _Q, _S.set(1, 1, 1));
        fish.setMatrixAt(i, _M);
      }
      fish.instanceMatrix.needsUpdate = true;
      for (const cb of crabs) {
        const a = cb.th0 + Math.sin(rt * 0.5 + cb.ph) * 0.45;
        const px = ISLAND.x + Math.cos(a) * cb.d, pz = ISLAND.z + Math.sin(a) * cb.d;
        cb.g.position.set(px + CX, SEA + terrainH(px, pz) + 0.09, pz);
        cb.g.rotation.y = -a + (Math.cos(rt * 0.5 + cb.ph) > 0 ? 0 : Math.PI);
      }
      crab2.position.set(9.3 + CX - 0.5, SEA + 0.72, 2.15 + Math.sin(rt * 0.4) * 0.5);
      crab2.rotation.y = Math.cos(rt * 0.4) > 0 ? Math.PI / 2 : -Math.PI / 2;
      for (let i = 0; i < 34; i++) {
        const sd = bubbles.userData.seed[i];
        const yy = 1.75 + ((simT * sd.v + sd.s * 1.4) % 1.35);
        _P.set(sd.src[0] + Math.sin(simT * 2 + i) * 0.06, Math.min(yy, 3.02), sd.src[1] + Math.cos(simT * 1.7 + i) * 0.06);
        _M.compose(_P, _Q.identity(), _S.set(1, 1, 1));
        bubbles.setMatrixAt(i, _M);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      beamRot.rotation.y = simT * 1.1;

      /* —— 昼夜同步 —— */
      const ang = st.dayT * Math.PI * 2;
      const elv = Math.sin(ang);
      const nf = Math.min(1, Math.max(0, -elv * 2.2));
      sunMesh.position.set(5.6 - Math.cos(ang) * 3.2 + CX, 5.55 + elv * 3.2, 0.9);
      sunMesh.visible = elv > -0.25;
      moonMeshI.position.set(5.6 + Math.cos(ang) * 3.0 + CX, 5.55 - elv * 3.0, -0.7);
      moonMeshI.visible = elv < 0.25;
      stars.material.opacity = nf * (1 - storm * 0.85);
      waterU.uAmb.value = st.amb + 0.1;
      waterU.uSunDir.value.copy(st.sunDir);
      waterU.uSunCol.value.copy(st.sunCol);
      waterU.uHorizon.value.copy(st.horizonCol);
      beamMat.opacity = 0.035 + nf * 0.42 + storm * 0.1;
      lanternMat.color.setRGB(1, 0.9, 0.6).multiplyScalar(0.5 + nf * 1.6);
      lhLamp.intensity = nf * 4;
      hutWinMat.color.setRGB(1, 0.72, 0.35).multiplyScalar(0.3 + nf * 1.3);
      hutLamp.intensity = nf * 5;
      deepU.uNight.value = nf;
      return { night: nf };
    },
  };
  return dio;
}
