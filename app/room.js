// 房间陈设：黄昏书房 —— 木桌 · 暖台灯 · 舷窗天光 · 尘埃 · 闪电
import * as THREE from 'three';

function woodTexture(base, plank) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) {
    g.strokeStyle = `rgba(46,28,12,${0.05 + Math.random() * 0.08})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const y = Math.random() * 512;
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 5);
    g.stroke();
  }
  if (plank) for (let i = 1; i < 5; i++) { g.fillStyle = 'rgba(28,16,6,.4)'; g.fillRect(0, i * 102, 512, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createRoom(scene) {
  scene.fog = new THREE.Fog(0x171310, 150, 460);

  /* —— 灯光 —— */
  scene.add(new THREE.AmbientLight(0x8a7a62, 0.22));
  scene.add(new THREE.HemisphereLight(0x5a6a88, 0x241a10, 0.22));
  // 台灯暖光（主角，带阴影）
  const lamp = new THREE.SpotLight(0xffb46a, 1400, 320, 0.95, 0.55, 1.7);
  lamp.position.set(52, 74, 42);
  lamp.target.position.set(-4, 0, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.camera.near = 20; lamp.shadow.camera.far = 260;
  lamp.shadow.bias = -0.0004;
  scene.add(lamp, lamp.target);
  // 舷窗黄昏冷光
  const winLight = new THREE.DirectionalLight(0x8aa4cc, 1.0);
  winLight.position.set(-110, 50, -40); scene.add(winLight);
  // 闪电
  const flash = new THREE.PointLight(0xd6e4ff, 0, 520, 1.3);
  flash.position.set(-95, 80, -60); scene.add(flash);

  /* —— 书桌 —— */
  const deskMat = new THREE.MeshStandardMaterial({ map: woodTexture('#7a4e28', true), roughness: 0.82 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(190, 6, 110), deskMat);
  desk.position.set(-6, -17, 4); desk.receiveShadow = true; scene.add(desk);
  const legMat = new THREE.MeshStandardMaterial({ map: woodTexture('#573619'), roughness: 0.85 });
  for (const [lx, lz] of [[-86, -44], [70, -44], [-86, 52], [70, 52]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(7, 62, 7), legMat);
    leg.position.set(lx, -48, lz); leg.castShadow = true; scene.add(leg);
  }
  // 桌面地毯式暗色投影渐变（兜底接地感）
  const shC = document.createElement('canvas'); shC.width = shC.height = 128;
  const sg = shC.getContext('2d');
  const sgr = sg.createRadialGradient(64, 64, 8, 64, 64, 64);
  sgr.addColorStop(0, 'rgba(0,0,0,0.5)'); sgr.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(120, 60),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shC), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.set(0, -13.9, 0); scene.add(blob);

  /* —— 瓶托（黄铜马鞍） —— */
  const brass = new THREE.MeshStandardMaterial({ color: 0xb98a3a, metalness: 0.85, roughness: 0.35 });
  for (const sx of [-20, 20]) {
    const cr = new THREE.Mesh(new THREE.TorusGeometry(16.2, 1.4, 10, 30, Math.PI * 1.15), brass);
    cr.rotation.y = Math.PI / 2; cr.rotation.x = Math.PI * 0.5 + 0.42;
    cr.position.set(sx, -6.0, 0); cr.castShadow = true; scene.add(cr);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 5.2, 10), brass);
    post.position.set(sx, -11.4, 0); post.castShadow = true; scene.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(56, 1.8, 6), new THREE.MeshStandardMaterial({ map: woodTexture('#4e3116'), roughness: 0.8 }));
  rail.position.set(0, -13.6, 0); rail.receiveShadow = true; scene.add(rail);

  /* —— 陈设：旧书 / 黄铜望远镜 / 海图 / 罗盘 / 绳卷 —— */
  const book = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  const b1 = book(17, 3.4, 12, 0x6e2f2a); b1.position.set(-62, -12.2, 24); b1.rotation.y = 0.42; b1.castShadow = true; scene.add(b1);
  const b2 = book(15, 2.8, 11, 0x2f4a5a); b2.position.set(-60, -9.2, 25); b2.rotation.y = 0.18; b2.castShadow = true; scene.add(b2);
  const b3 = book(13, 2.4, 10, 0x7a6a3a); b3.position.set(-61, -6.6, 24.6); b3.rotation.y = -0.1; b3.castShadow = true; scene.add(b3);
  // 望远镜（黄铜三节，斜指舷窗）
  const scope = new THREE.Group();
  const seg = (r1, r2, len, px, py) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 14), brass); m.rotation.z = 1.18; m.position.set(px, py, 0); m.castShadow = true; scope.add(m); };
  seg(1.9, 2.2, 9, 0, 0); seg(1.35, 1.7, 7, 7.2, 3.6); seg(0.9, 1.2, 5, 12.8, 6.5);
  for (const [lx, tilt] of [[-1, 0.35], [1, -0.35]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 7, 8), new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.8 }));
    leg.position.set(lx * 0.8, -3.4, 0); leg.rotation.z = tilt * 1.2; scope.add(leg);
  }
  scope.position.set(58, -8, -26); scope.rotation.y = -0.5; scene.add(scope);
  // 海图卷
  const paper = new THREE.MeshStandardMaterial({ color: 0xe4d5a8, roughness: 0.9 });
  for (const [rx, rz, ry] of [[46, 30, 0.5], [50, 33, 1.2]]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 11, 12), paper);
    roll.rotation.z = Math.PI / 2; roll.rotation.y = ry;
    roll.position.set(rx, -13.2, rz); roll.castShadow = true; scene.add(roll);
  }
  // 罗盘
  const comp = new THREE.Group();
  comp.add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 1.2, 18), brass));
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.3, 18), new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.6 }));
  dial.position.y = 0.7; comp.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 4.2), new THREE.MeshStandardMaterial({ color: 0xa32226 }));
  needle.position.y = 1.0; comp.add(needle);
  comp.position.set(-30, -13.0, -28); comp.rotation.y = 0.7; scene.add(comp);
  let needleM = needle;
  // 绳卷
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 0.95 });
  for (const [rx2, rz2] of [[66, 8], [66, 13]]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(3.4, 1.1, 8, 22), ropeMat);
    coil.rotation.x = Math.PI / 2; coil.position.set(rx2, -14.2, rz2); coil.castShadow = true; scene.add(coil);
  }

  /* —— 舷窗（后墙） + 黄昏天色 —— */
  const skyU = {
    cTop: { value: new THREE.Color(0x3a4470) },
    cMid: { value: new THREE.Color(0xc06028) },
    cBot: { value: new THREE.Color(0xe89850) },
    uNight: { value: 0 },
    uFlash: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(96, 78), new THREE.ShaderMaterial({
    uniforms: skyU, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform vec3 cTop,cMid,cBot; uniform float uNight,uFlash;
      void main(){
        float h = vUv.y;
        vec3 col = mix(cBot, cMid, smoothstep(0.0,0.45,h));
        col = mix(col, cTop, smoothstep(0.4,1.0,h));
        // 云带
        float cl = sin(vUv.x*9.0+1.7)*0.5+0.5;
        col = mix(col, col*1.25+vec3(0.08,0.04,0.0), smoothstep(0.55,0.9,cl)*smoothstep(0.25,0.6,h)*(1.0-smoothstep(0.6,0.95,h))*0.5);
        // 海平线
        col = mix(col*0.55, col, smoothstep(0.02,0.12,h));
        col *= (1.0 - uNight*0.72);
        col += vec3(0.8,0.87,1.0)*uFlash*0.5;
        gl_FragColor = vec4(col,1.0);
      }`,
  }));
  sky.position.set(-52, 26, -96); scene.add(sky);
  // 窗框
  const frameMat = new THREE.MeshStandardMaterial({ map: woodTexture('#3e2a14'), roughness: 0.85 });
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(102, 6, 5), frameMat); f1.position.set(-52, 66, -95); scene.add(f1);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(102, 6, 5), frameMat); f2.position.set(-52, -14, -95); scene.add(f2);
  const f3 = new THREE.Mesh(new THREE.BoxGeometry(6, 84, 5), frameMat); f3.position.set(-102, 26, -95); scene.add(f3);
  const f4 = new THREE.Mesh(new THREE.BoxGeometry(6, 84, 5), frameMat); f4.position.set(-2, 26, -95); scene.add(f4);
  for (const [cx2, cy2] of [[-52, 26], [-52, 26]]) {
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(4, 76, 4), frameMat); m1.position.set(cx2, cy2, -95); scene.add(m1);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(96, 4, 4), frameMat); m2.position.set(cx2, cy2, -95); scene.add(m2);
  }
  // 侧墙与地板暗示
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(360, 160), wallMat);
  back.position.set(0, 30, -100); scene.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(300, 160), wallMat);
  left.rotation.y = Math.PI / 2; left.position.set(-130, 30, 0); scene.add(left);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(360, 300), new THREE.MeshStandardMaterial({ map: woodTexture('#3a2812', true), roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -79, 0); scene.add(floor);

  /* —— 斜射光带（体积感） —— */
  const rayC = document.createElement('canvas'); rayC.width = 64; rayC.height = 256;
  const rgg = rayC.getContext('2d');
  const rgr = rgg.createLinearGradient(0, 0, 64, 0);
  rgr.addColorStop(0, 'rgba(160,190,240,0)'); rgr.addColorStop(0.5, 'rgba(170,200,245,0.10)');
  rgr.addColorStop(1, 'rgba(160,190,240,0)');
  rgg.fillStyle = rgr; rgg.fillRect(0, 0, 64, 256);
  const rayTex = new THREE.CanvasTexture(rayC);
  const rayMat = new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rays = [];
  for (const [rx3, ry3, rz3, len, wide] of [[-40, 22, -60, 120, 26], [-24, 18, -58, 128, 20], [-58, 26, -62, 112, 18]]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(wide, len), rayMat);
    r.position.set(rx3, ry3, rz3);
    r.rotation.set(0.12, 0.62, -0.5);
    rays.push(r); scene.add(r);
  }

  /* —— 尘埃 —— */
  const dustN = 220;
  const dustPos = new Float32Array(dustN * 3), dustSeed = [];
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = -80 + Math.random() * 90;
    dustPos[i * 3 + 1] = -12 + Math.random() * 56;
    dustPos[i * 3 + 2] = -60 + Math.random() * 70;
    dustSeed.push(Math.random() * 10);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xd8c8a8, size: 0.55, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  dust.frustumCulled = false; scene.add(dust);

  /* —— 台灯本体 —— */
  const lampG = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5, 2.2, 18), new THREE.MeshStandardMaterial({ color: 0x6a4a22, metalness: 0.4, roughness: 0.6 }));
  base.position.set(52, -13.8, 42); base.castShadow = true; scene.add(base);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 26, 8), brass);
  arm.position.set(52, 0, 42); arm.rotation.z = 0.35; arm.rotation.x = -0.25; scene.add(arm);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(7.5, 8, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x3a5a3a, metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide }));
  shade.position.set(58, 14, 40); shade.rotation.z = -0.7; scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.0, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  bulb.position.set(59, 11.5, 40); scene.add(bulb);

  let nextBolt = 3, simT = 0;
  const room = {
    lamp, winLight, flash, skyU, dust, needleM,
    update(dt, rt, st) {
      simT = st.simT;
      // 台灯呼吸 + 夜晚更暖更亮
      const flick = 1 + Math.sin(rt * 7.3) * 0.025 + Math.sin(rt * 13.7) * 0.015;
      lamp.intensity = 1400 * flick * (1 + st.night * 0.5);
      bulb.material.color.setHex(0xffd9a0).multiplyScalar(0.9 + st.night * 0.3 + flick * 0.1);
      // 窗光随昼夜
      winLight.intensity = 1.0 * (1 - st.night * 0.85) + st.storm * 0.1;
      skyU.uNight.value = st.night;
      skyU.uFlash.value *= Math.pow(0.0001, dt);
      flash.intensity *= Math.pow(0.0001, dt);
      // 尘埃漂浮
      const p = dustGeo.attributes.position.array;
      for (let i = 0; i < dustN; i++) {
        p[i * 3 + 1] += Math.sin(rt * 0.6 + dustSeed[i]) * 0.012 + 0.006;
        p[i * 3] += Math.cos(rt * 0.4 + dustSeed[i]) * 0.008;
        if (p[i * 3 + 1] > 48) p[i * 3 + 1] = -12;
      }
      dustGeo.attributes.position.needsUpdate = true;
      // 罗盘指针微颤
      needleM.rotation.y = Math.sin(rt * 1.7) * 0.18 + 0.7;
      // 风暴闪电（窗外）
      let didFlash = false;
      if (st.storm > 0.5 && simT > nextBolt) {
        nextBolt = simT + 1.2 + Math.random() * 2.6;
        flash.intensity = 26000;
        skyU.uFlash.value = 1;
        didFlash = true;
      }
      return { flash: didFlash };
    },
  };
  return room;
}
