// 主入口：渲染器 / 后期 / 相机 / 交互 / 昼夜 / 主循环
// 愿景：黄昏书房 · 木桌上的瓶中沧海（微缩世界是房间里唯一的光源奇观）
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRoom } from './room.js';
import { createDiorama } from './diorama.js';
import { AudioEngine } from './audio.js';

/* —— 渲染器 —— */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 900);
const cam = { theta: 0.95, phi: 1.2, r: 96, target: new THREE.Vector3(0, 0.5, 0) };
let shake = 0;
function applyCam() {
  const s = Math.sin(cam.phi), c = Math.cos(cam.phi);
  camera.position.set(
    cam.target.x + cam.r * s * Math.cos(cam.theta),
    cam.target.y + cam.r * c,
    cam.target.z + cam.r * s * Math.sin(cam.theta));
  if (shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }
  camera.lookAt(cam.target);
}
applyCam();

/* —— 场景模块 —— */
const manager = new THREE.LoadingManager();
const bar = document.getElementById('loadBar');
manager.onProgress = (u, n, t) => { bar.style.width = Math.round(n / t * 100) + '%'; };
manager.onLoad = () => document.getElementById('loading').classList.add('done');
setTimeout(() => document.getElementById('loading').classList.add('done'), 15000);

const room = createRoom(scene);
const dio = createDiorama(scene, manager);
const audio = new AudioEngine();

// 玻璃反射用的中性室内环境（IBL）
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* —— 后期：Bloom + 输出（MSAA×4 HDR） —— */
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* —— 虚拟摇杆（转动瓶身） —— */
const stickState = { x: 0, y: 0 };
(function () {
  const pad = document.getElementById('stick'), knob = document.getElementById('stickKnob');
  let active = false, cx = 0, cy = 0, R = 66;
  function setKnob(dx, dy) { knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
  function apply(dx, dy) {
    const len = Math.hypot(dx, dy), m = Math.min(1, len / R);
    const nx = len ? dx / len * m : 0, ny = len ? dy / len * m : 0;
    setKnob(nx * R * 0.72, ny * R * 0.72);
    stickState.x = nx; stickState.y = -ny;
  }
  pad.addEventListener('pointerdown', e => {
    active = true; try { pad.setPointerCapture(e.pointerId); } catch (err) { }
    const r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    audio.ensure(); audio.fadeTo(0.5);
    apply(e.clientX - cx, e.clientY - cy); e.preventDefault();
  });
  pad.addEventListener('pointermove', e => { if (active) apply(e.clientX - cx, e.clientY - cy); });
  const end = () => { active = false; setKnob(0, 0); stickState.x = 0; stickState.y = 0; };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = true; syncKeys(); });
  addEventListener('keyup', e => { keys[e.code] = false; syncKeys(); });
  function syncKeys() {
    const L = keys.ArrowLeft || keys.KeyA, Rt = keys.ArrowRight || keys.KeyD,
      U = keys.ArrowUp || keys.KeyW, D = keys.ArrowDown || keys.KeyS;
    if (L || Rt || U || D) apply((Rt ? 1 : 0) - (L ? 1 : 0), (D ? 1 : 0) - (U ? 1 : 0));
    else if (!active) { stickState.x = 0; stickState.y = 0; setKnob(0, 0); }
  }
})();

/* —— 交互 —— */
let dragging = false, lastX = 0, lastY = 0, lastAct = performance.now();
const dom = renderer.domElement;
dom.addEventListener('pointerdown', e => {
  dragging = true; lastX = e.clientX; lastY = e.clientY; lastAct = performance.now();
  try { dom.setPointerCapture(e.pointerId); } catch (err) { }
  audio.ensure(); audio.fadeTo(0.5);
});
dom.addEventListener('pointermove', e => {
  if (!dragging) return;
  cam.theta -= (e.clientX - lastX) * 0.005;
  cam.phi = Math.min(1.52, Math.max(0.35, cam.phi - (e.clientY - lastY) * 0.004));
  lastX = e.clientX; lastY = e.clientY; lastAct = performance.now();
});
addEventListener('pointerup', () => dragging = false);
addEventListener('wheel', e => { cam.r = Math.min(150, Math.max(30, cam.r * (1 + e.deltaY * 0.001))); lastAct = performance.now(); }, { passive: true });
let speed = 1, stormHeld = false;
addEventListener('keydown', e => {
  if (e.code === 'Space') { stormHeld = true; e.preventDefault(); }
  if (e.key >= '1' && e.key <= '4') { const b = document.querySelectorAll('.spd')[+e.key - 1]; b && b.click(); }
  audio.ensure();
});
addEventListener('keyup', e => { if (e.code === 'Space') stormHeld = false; });
document.querySelectorAll('.spd').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.spd').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); speed = +b.dataset.s;
}));
const sBtn = document.getElementById('stormBtn');
sBtn.addEventListener('pointerdown', () => stormHeld = true);
sBtn.addEventListener('pointerup', () => stormHeld = false);
sBtn.addEventListener('pointerleave', () => stormHeld = false);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* —— 昼夜（瓶内世界的时间） —— */
const PAL = [
  { sun: 0xffc890, amb: 0.55, hor: 0xe8a878, top: 0x4a66a8 },
  { sun: 0xfff2d8, amb: 0.62, hor: 0x9fd0ee, top: 0x2f7cc9 },
  { sun: 0xffa060, amb: 0.5, hor: 0xf07a4e, top: 0x3b3f78 },
  { sun: 0x9db8e8, amb: 0.16, hor: 0x182452, top: 0x0a1030 },
];
const _cA = new THREE.Color(), _cB = new THREE.Color();
function computeDay(st) {
  const seg = st.dayT * 4, i0 = Math.floor(seg) % 4, i1 = (i0 + 1) % 4, f0 = seg - Math.floor(seg);
  const f = f0 * f0 * (3 - 2 * f0);
  const a = PAL[i0], b = PAL[i1];
  st.sunCol.copy(_cA.setHex(a.sun)).lerp(_cB.setHex(b.sun), f);
  st.horizonCol.copy(_cA.setHex(a.hor)).lerp(_cB.setHex(b.hor), f);
  st.topCol.copy(_cA.setHex(a.top)).lerp(_cB.setHex(b.top), f);
  st.amb = a.amb + (b.amb - a.amb) * f;
  const ang = st.dayT * Math.PI * 2;
  const elv = Math.sin(ang);
  st.sunDir.set(Math.cos(ang) * 0.8, Math.max(0.06, elv), 0.5).normalize();
  st.night = Math.min(1, Math.max(0, -elv * 2.2));
}

/* —— 主循环 —— */
const state = {
  simT: 0, storm: 0, dayT: 0.12, speed: 1, night: 0,
  amb: 0.5, sunDir: new THREE.Vector3(0, 1, 0), sunCol: new THREE.Color(),
  horizonCol: new THREE.Color(0x9fd0ee), topCol: new THREE.Color(0x2f7cc9), stick: stickState,
};
const qs = new URLSearchParams(location.search);
if (qs.has('day')) state.dayT = parseFloat(qs.get('day')) || 0;
if (qs.get('storm') === '1') stormHeld = true;
if (qs.has('speed')) speed = parseFloat(qs.get('speed')) || 1;

const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, fpsT = 0;
const fpsEl = document.getElementById('fps');
const DAY_LEN = 90;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const rt = clock.elapsedTime;
  state.simT += dt * speed;
  state.speed = speed;

  const st = stormHeld ? 1 : 0;
  state.storm += (st - state.storm) * Math.min(1, dt * 1.6);
  state.dayT = (state.dayT + dt * speed / DAY_LEN) % 1;
  computeDay(state);

  const roomRet = room.update(dt, rt, state);
  dio.update(dt, rt, state, null);

  if (roomRet.flash) { audio.thunder(); shake = 1.4; }
  shake *= Math.pow(0.005, dt);
  if (stormHeld || state.storm > 0.1) audio.setStorm(state.storm);

  // 相机：微距感的缓推环绕
  const bp = dio.bottle.position;
  cam.target.set(bp.x, bp.y + 1.2, bp.z);
  if (!dragging && performance.now() - lastAct > 3200) cam.theta += dt * 0.07;
  applyCam();

  composer.render();
  fpsAcc += dt; fpsN++;
  if (rt - fpsT > 0.5) {
    fpsEl.textContent = Math.round(fpsN / fpsAcc) + ' FPS';
    document.title = '瓶中沧海|' + Math.round(fpsN / fpsAcc) + 'fps|d' + state.dayT.toFixed(2) + '|s' + state.storm.toFixed(1);
    fpsAcc = 0; fpsN = 0; fpsT = rt;
  }
}
animate();
window.__dio = { scene, cam, camera, setDay: v => state.dayT = v, setStorm: v => stormHeld = !!v, get: () => JSON.stringify({ storm: state.storm, dayT: state.dayT, speed }) };
