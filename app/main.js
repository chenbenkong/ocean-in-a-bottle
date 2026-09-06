// 主入口：渲染器 / 后期特效 / 相机 / 交互 / 主循环
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createEnvironment, swellH } from './environment.js';
import { createDiorama } from './diorama.js';
import { AudioEngine } from './audio.js';


/* —— 渲染器 —— */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.58;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9ab8d0, 650, 4200);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.5, 9000);
const cam = { theta: 0.85, phi: 1.22, r: 78, target: new THREE.Vector3(0, 3, 0) };
function applyCam() {
  const s = Math.sin(cam.phi), c = Math.cos(cam.phi);
  camera.position.set(
    cam.target.x + cam.r * s * Math.cos(cam.theta),
    cam.target.y + cam.r * c,
    cam.target.z + cam.r * s * Math.sin(cam.theta));
  camera.lookAt(cam.target);
}
applyCam();

/* —— 场景模块 —— */
const manager = new THREE.LoadingManager();
const bar = document.getElementById('loadBar'), loadTxt = document.getElementById('loadTxt');
manager.onProgress = (u, n, t) => { bar.style.width = Math.round(n / t * 100) + '%'; };
manager.onLoad = () => {
  document.getElementById('loading').classList.add('done');
};
setTimeout(() => document.getElementById('loading').classList.add('done'), 12000);

const env = createEnvironment(scene, manager);
const dio = createDiorama(scene, manager);
const audio = new AudioEngine();

/* —— 后期特效：Bloom + ACES 输出（MSAA×4） —— */
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.5, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* —— 虚拟摇杆（转向/推进） —— */
const stickState = { x: 0, y: 0 };           // x: 左右转向  y: 前进(+)/后退(-)
(function () {
  const pad = document.getElementById('stick'), knob = document.getElementById('stickKnob');
  let active = false, cx = 0, cy = 0, R = 46;
  function setKnob(dx, dy) { knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
  function apply(dx, dy) {
    const len = Math.hypot(dx, dy), m = Math.min(1, len / R);
    const nx = len ? dx / len * m : 0, ny = len ? dy / len * m : 0;
    setKnob(nx * R * 0.72, ny * R * 0.72);
    stickState.x = nx; stickState.y = -ny;
  }
  pad.addEventListener('pointerdown', e => {
    active = true; try { pad.setPointerCapture(e.pointerId); } catch (err) {}
    const r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    audio.ensure(); audio.fadeTo(0.5);
    apply(e.clientX - cx, e.clientY - cy); e.preventDefault();
  });
  pad.addEventListener('pointermove', e => { if (active) apply(e.clientX - cx, e.clientY - cy); });
  const end = () => { active = false; setKnob(0, 0); stickState.x = 0; stickState.y = 0; };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  // 键盘方向键 / WASD 同步摇杆
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
  dom.setPointerCapture(e.pointerId); audio.ensure(); audio.fadeTo(0.5);
});
dom.addEventListener('pointermove', e => {
  if (!dragging) return;
  cam.theta -= (e.clientX - lastX) * 0.005;
  cam.phi = Math.min(1.5, Math.max(0.12, cam.phi - (e.clientY - lastY) * 0.004));
  lastX = e.clientX; lastY = e.clientY; lastAct = performance.now();
});
addEventListener('pointerup', () => dragging = false);
addEventListener('wheel', e => { cam.r = Math.min(240, Math.max(30, cam.r * (1 + e.deltaY * 0.001))); lastAct = performance.now(); }, { passive: true });
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

/* —— 环境 PMREM —— */
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null; const sceneEnv = new THREE.Scene();
let lastEnvT = -9, lastEnvElev = 99;
function updateEnv() {
  if (envRT) envRT.dispose();
  sceneEnv.add(env.sky);
  envRT = pmrem.fromScene(sceneEnv);
  scene.add(env.sky);
  scene.environment = envRT.texture;
}

/* —— 主循环 —— */
const state = { simT: 0, storm: 0, dayT: 0.12, speed: 1, amb: 0.5, sunDir: new THREE.Vector3(0, 1, 0), sunCol: new THREE.Color(), horizonCol: new THREE.Color(0x9fd0ee), bottlePos: new THREE.Vector3(), stick: stickState };
// URL 参数控制（day/storm/speed）
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

  const envRet = env.update(dt, rt, state);
  state.amb = envRet.night > 0 ? 0.5 - envRet.night * 0.34 : 0.62;
  state.sunDir.copy(env.sunDir);
  state.sunCol.copy(env.cur.sun);
  state.horizonCol.copy(env.cur.hor);

  dio.update(dt, rt, state, swellH);
  state.bottlePos.copy(dio.bottle.position);

  if (envRet.flash) audio.thunder();
  if (stormHeld || state.storm > 0.1) audio.setStorm(state.storm);

  // PMREM 环境贴图（太阳高度变化超阈值时节流刷新）
  if ((Math.abs(env.sunDir.y - lastEnvElev) > 0.03 || state.storm > 0.05) && rt - lastEnvT > 0.8) {
    updateEnv(); lastEnvElev = env.sunDir.y; lastEnvT = rt;
  }

  // 相机
  cam.target.set(dio.bottle.position.x, dio.bottle.position.y + 3, dio.bottle.position.z);
  if (!dragging && performance.now() - lastAct > 3200) cam.theta += dt * 0.1;
  applyCam();

  composer.render();
  fpsAcc += dt; fpsN++;
  if (rt - fpsT > 0.5) {
    fpsEl.textContent = Math.round(fpsN / fpsAcc) + ' FPS';
    document.title = '瓶中沧海|' + Math.round(fpsN / fpsAcc) + 'fps|d' + state.dayT.toFixed(2) + '|s' + state.storm.toFixed(1);
    fpsAcc = 0; fpsN = 0; fpsT = rt;
  }
}

updateEnv();
animate();
window.__dio = {
  scene, env, cam, camera, setDay: v => state.dayT = v, setStorm: v => stormHeld = !!v, setSpeed: v => speed = v,
  get: () => JSON.stringify({ storm: state.storm, dayT: state.dayT, speed, simT: state.simT }),
};
