import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Building, H, applyTheme } from './world.js';
import { BotLayer } from './bots.js';
import { state, subscribe, ingest } from './store.js';
import { startFeed } from './feed.js';
import { createUI } from './ui.js';
import { createQuality } from './quality.js';
import { createAtmosphere } from './atmosphere.js';

const stage = document.getElementById('stage');
const photoLayer = document.createElement('div');
photoLayer.id = 'photo-layer';
stage.appendChild(photoLayer);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.setClearColor(0x000000, 0);
stage.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.domElement.className = 'labels';
stage.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07131f);
scene.fog = new THREE.FogExp2(0x07131f, 0.0048);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

const hemi = new THREE.HemisphereLight(0x9fd8ff, 0x0b1620, 1.35);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0x497495, 0.95);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xbfe6ff, 1.25);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-14, 30, 12);

const studioKey = new THREE.DirectionalLight(0xfff4e8, 2.4);
studioKey.position.set(24, 42, 30);
scene.add(studioKey);
const studioFill = new THREE.DirectionalLight(0x9fdcff, 1.4);
studioFill.position.set(-26, 24, 22);
scene.add(studioFill);

const panoGeometry = new THREE.SphereGeometry(170, 64, 32);
panoGeometry.scale(-1, 1, 1);
const panoMaterial = new THREE.MeshBasicMaterial({ depthWrite: false, depthTest: false, fog: false, toneMapped: false });
const panorama = new THREE.Mesh(panoGeometry, panoMaterial);
panorama.renderOrder = -200;
panorama.frustumCulled = false;
panorama.visible = false;
scene.add(panorama);
let panoramaTexture = null;
const panoLoader = new THREE.TextureLoader();

let ui = null;
let atmosphere = null;
const THEME_AIR = {
  dawn: { night: 0x1b2a38, day: 0xcfe9e4, dusk: 0xf3c8a5, sunNight: 0x8fb8d0, sunDay: 0xfff0c8, sunDusk: 0xffb07a, ground: 0x8a6a4a, light: 1.1 },
  neon: { night: 0x05000f, day: 0x0a0a20, dusk: 0x1a0524, sunNight: 0x8f6aff, sunDay: 0xffd6f4, sunDusk: 0xff4fa0, ground: 0x0a0614, light: 1 },
  moss: { night: 0x07130d, day: 0x1a2a1c, dusk: 0x2a2a18, sunNight: 0x8aa87a, sunDay: 0xe8f0c0, sunDusk: 0xd8b06a, ground: 0x1a2416, light: 1.05 },
  ink: { night: 0x1c1e21, day: 0xf5efe1, dusk: 0xe7dcc8, sunNight: 0x91a4b8, sunDay: 0xfff3d8, sunDusk: 0xd8a47a, ground: 0xc9bda8, light: 1.08 },
  vermilion: { night: 0x2a0f12, day: 0xf0dcc0, dusk: 0xc86a4a, sunNight: 0xd99a6a, sunDay: 0xffe8c0, sunDusk: 0xe86a3a, ground: 0x6d1a1a, light: 1.05 },
};
const THEME_NAMES = ['dawn', 'neon', 'moss', 'ink', 'vermilion'];
const themeForHour = (h) => (h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 12 ? 'moss' : h >= 12 && h < 17 ? 'vermilion' : h >= 17 && h < 19 ? 'ink' : 'neon');
let themeAuto = true;
let currentTheme = 'dawn';
try {
  const stored = localStorage.getItem('bw-theme');
  const storedAuto = localStorage.getItem('bw-theme-auto');
  const migrated = stored === 'sci-fi' ? 'neon' : stored === 'classic' ? 'dawn' : stored;
  if (storedAuto === '0' && THEME_NAMES.includes(migrated)) {
    themeAuto = false;
    currentTheme = migrated;
  }
} catch { /* ignore */ }
if (themeAuto) currentTheme = themeForHour(new Date().getHours() + new Date().getMinutes() / 60);
let dayMode = 'auto';
try {
  const storedDay = localStorage.getItem('bw-day-mode');
  if (storedDay === 'day' || storedDay === 'night' || storedDay === 'auto') dayMode = storedDay;
} catch { /* ignore */ }

function applyTimeOfDay() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const autoDay = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
  const autoDusk = Math.max(0, 1 - Math.min(Math.abs(h - 6.5), Math.abs(h - 18.5)) / 2.2);
  const day = dayMode === 'day' ? 1 : dayMode === 'night' ? 0 : autoDay;
  const dusk = dayMode === 'auto' ? autoDusk : 0;
  const air = THEME_AIR[currentTheme] || THEME_AIR.dawn;
  const nightColor = new THREE.Color(air.night);
  const dayColor = new THREE.Color(air.day);
  const duskColor = new THREE.Color(air.dusk);
  const bg = nightColor.clone().lerp(dayColor, day).lerp(duskColor, dusk * 0.4);
  if (scene.background && scene.background.isColor) scene.background.copy(bg);
  scene.fog.color.copy(bg);
  const dark = currentTheme === 'neon' || currentTheme === 'moss';
  scene.environmentIntensity = (dark ? 0.34 : 0.62) + day * 0.24;
  hemi.intensity = (dark ? 1.45 : 1.2) + day * 0.65;
  hemi.color.copy(nightColor).lerp(dayColor, 0.5 + day * 0.25);
  hemi.groundColor.setHex(air.ground);
  sun.intensity = (dark ? 1.2 : 1.2) + day * 1.05;
  sun.color.copy(new THREE.Color(air.sunNight)).lerp(new THREE.Color(air.sunDay), day).lerp(new THREE.Color(air.sunDusk), dusk * 0.55);
}
function setTheme(name, auto = themeAuto) {
  const next = THEME_NAMES.includes(name) ? name : 'dawn';
  themeAuto = Boolean(auto);
  currentTheme = next;
  applyTheme(next);
  if (atmosphere) atmosphere.set(next);
  applyTimeOfDay();
  if (photoLayer && !photoLayer.classList.contains('photo')) applyStudio(next);
  try {
    localStorage.setItem('bw-theme', next);
    localStorage.setItem('bw-theme-auto', themeAuto ? '1' : '0');
  } catch { /* ignore */ }
  if (ui) ui.setTheme(next, themeAuto);
}
function setDayMode(mode) {
  dayMode = mode === 'day' || mode === 'night' ? mode : 'auto';
  try { localStorage.setItem('bw-day-mode', dayMode); } catch { /* ignore */ }
  applyTimeOfDay();
  syncWander();
  if (ui) ui.setDayMode(dayMode);
}
let photoUrl = '';
const PHOTO_DB = 'bw-office-photo';
function photoDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('no indexeddb'));
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('photos')) req.result.createObjectStore('photos'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveStoredPhoto(blob) {
  try {
    const db = await photoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put(blob, 'background');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  } catch { /* storage unavailable */ }
}
async function loadStoredPhoto() {
  try {
    const db = await photoDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').get('background');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}
async function deleteStoredPhoto() {
  try {
    const db = await photoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete('background');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  } catch { /* storage unavailable */ }
}
function applyStudio(theme) {
  photoLayer.style.backgroundImage = '';
  photoLayer.dataset.studio = theme;
  photoLayer.classList.add('show');
  photoLayer.classList.remove('photo');
  scene.background = null;
  if (atmosphere) atmosphere.setPhotoMode(true);
}
function applyPhotoFile(file, persist = true) {
  if (!file || !/^image\//.test(file.type || '')) return;
  const url = URL.createObjectURL(file);
  const previous = photoUrl;
  photoUrl = url;
  panoLoader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    if (panoramaTexture) panoramaTexture.dispose();
    panoramaTexture = tex;
    panoMaterial.map = tex;
    panoMaterial.needsUpdate = true;
    panorama.visible = true;
    photoLayer.style.backgroundImage = '';
    photoLayer.dataset.studio = '';
    photoLayer.classList.add('show', 'photo');
    scene.background = null;
    if (atmosphere) atmosphere.setPhotoMode(true);
    if (previous) URL.revokeObjectURL(previous);
    if (persist) void saveStoredPhoto(file);
  }, undefined, () => {
    URL.revokeObjectURL(url);
    if (photoUrl === url) photoUrl = '';
  });
}
function clearPhoto() {
  panorama.visible = false;
  if (panoramaTexture) {
    panoramaTexture.dispose();
    panoramaTexture = null;
    panoMaterial.map = null;
    panoMaterial.needsUpdate = true;
  }
  applyStudio(currentTheme);
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = '';
  void deleteStoredPhoto();
}
window.addEventListener('paste', (event) => {
  const items = event.clipboardData && event.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) { applyPhotoFile(file); event.preventDefault(); }
      break;
    }
  }
});
function autoThemeTick() {
  if (!themeAuto) return;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const next = themeForHour(h);
  if (next !== currentTheme) setTheme(next, true);
}
applyTheme(currentTheme);
applyTimeOfDay();
setInterval(applyTimeOfDay, 60_000);
setInterval(autoThemeTick, 60_000);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
const DIR = new THREE.Vector3(1, 0.58, 1).normalize();
camera.position.copy(DIR).multiplyScalar(120);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.minZoom = 0.3;
controls.maxZoom = 3;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.25;

const building = new Building(scene);
const topY = Math.max(0, ...[...building.floors.values()].map((floor) => floor.group.position.y));
atmosphere = createAtmosphere(scene, { topY: topY + 2 });
atmosphere.set(currentTheme);
const botLayer = new BotLayer(building);
const stillMode = new URLSearchParams(location.search).has('still');
botLayer.wanders = !stillMode;
function syncWander() {
  const h = new Date().getHours();
  const night = dayMode === 'night' || (dayMode === 'auto' && (h < 6 || h >= 18));
  botLayer.wanders = !stillMode && !night;
}
syncWander();
setInterval(syncWander, 60_000);


let halfH = 15;
function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  halfH = Math.max(15, 19.5 / aspect);
  Object.assign(camera, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH });
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labels.setSize(w, h);
}
addEventListener('resize', resize);

function applyQuality(c, tier) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, c.dpr));
  renderer.shadowMap.enabled = c.shadow > 0;
  renderer.shadowMap.type = c.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  sun.castShadow = c.shadow > 0;
  if (c.shadow) {
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    sun.shadow.mapSize.set(c.shadow, c.shadow);
  }
  // shadow on/off changes every shader
  scene.traverse((o) => { for (const m of [].concat(o.material || [])) m.needsUpdate = true; });
  botLayer.setGloss(c.gloss);
  document.documentElement.dataset.quality = tier;
  resize();
}
const quality = createQuality(applyQuality);

// --- camera moves ---
const tween = { active: false };
// Moves between floors pull back a little mid-flight and swing round slightly, then settle.
const AZ_HOME = Math.atan2(DIR.x, DIR.z);
function flyTo(target, zoom, dur = 1.25, arc = 0.14) {
  const off = camera.position.clone().sub(controls.target);
  Object.assign(tween, {
    from: controls.target.clone(), to: target, z0: camera.zoom, z1: zoom, t: 0, dur, arc, active: true,
    r: off.length(), y: off.y, a0: Math.atan2(off.x, off.z),
  });
  tween.a1 = tween.a0 + Math.atan2(Math.sin(AZ_HOME - tween.a0), Math.cos(AZ_HOME - tween.a0));
}
function stepTween(dt) {
  if (!tween.active) return;
  tween.t = Math.min(1, tween.t + dt / tween.dur);
  const t = tween.t, e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const bump = Math.sin(Math.PI * e);
  controls.target.lerpVectors(tween.from, tween.to, e);
  const h = Math.sqrt(Math.max(0, tween.r * tween.r - tween.y * tween.y));
  const a = tween.a0 + (tween.a1 - tween.a0) * e + bump * 0.06 * tween.arc / 0.14;
  camera.position.set(controls.target.x + Math.sin(a) * h, controls.target.y + tween.y, controls.target.z + Math.cos(a) * h);
  camera.zoom = (tween.z0 + (tween.z1 - tween.z0) * e) * (1 - tween.arc * bump);
  camera.updateProjectionMatrix();
  if (t >= 1) tween.active = false;
}

let focus = null, selected = null;

function focusFloor(team, instant = false) {
  focus = team && building.floor(team) ? team : null;
  building.showUpTo(focus);
  botLayer.focus = focus;
  if (focus) flyTo(new THREE.Vector3(0, (building.floor(focus).number - 1) * H + 1.2, 0), 0.9);
  else flyTo(new THREE.Vector3(0, (building.count * H) / 2 - 2, 0), Math.min(1, halfH / ((building.count * H) / 2 + 12)));
  if (instant) { tween.dur = 0.001; building.snap(); }
  ui.setFocus(focus);
}

function select(id) {
  selected = id && state.bots.has(id) ? id : null;
  botLayer.selected = selected;
  ui.setSelected(selected);
  if (selected) {
    // Follow the bot where it actually is (lounge / meeting room), not its old desk.
    const actual = botLayer.get(selected)?.floor?.team;
    const team = actual || state.bots.get(selected).team;
    if (team !== focus) focusFloor(team);
  }
}

ui = createUI(document.getElementById('ui'), {
  state,
  onFloor: (team) => { select(null); focusFloor(team); },
  onSelect: select,
  onChat: (slug) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'bot-workbench-open-chat', slug }, window.location.origin);
    } else {
      window.location.hash = '#botharness-open=dm:' + encodeURIComponent(slug);
      window.setTimeout(() => window.location.reload(), 30);
    }
  },
  onTheme: (name, auto) => {
    if (name === 'auto') setTheme(themeForHour(new Date().getHours() + new Date().getMinutes() / 60), true);
    else setTheme(name, auto);
  },
  onDayMode: setDayMode,
  onPhoto: applyPhotoFile,
  onPhotoClear: clearPhoto,
  onZoom: (d) => flyTo(controls.target.clone(), THREE.MathUtils.clamp(camera.zoom * (d > 0 ? 1.25 : 0.8), controls.minZoom, controls.maxZoom), 0.35, 0),
});
ui.setTheme(currentTheme, themeAuto);
ui.setDayMode(dayMode);
applyStudio(currentTheme);
void loadStoredPhoto().then((blob) => {
  if (!blob) return;
  applyPhotoFile(new File([blob], 'background', { type: blob.type || 'image/jpeg' }), false);
});

// --- picking ---
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function hit(e, objects) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(objects, false)[0];
}
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointermove', (e) => {
  const h = hit(e, botLayer.pickables());
  botLayer.hovered = h?.object.userData.botId || null;
  renderer.domElement.style.cursor = botLayer.hovered ? 'pointer' : '';
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const b = hit(e, botLayer.pickables());
  if (b) return select(b.object.userData.botId);
  const slab = hit(e, building.slabs());
  const team = slab?.object.userData.team;
  if (team && team !== focus) { select(null); focusFloor(team); }
  else select(null);
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (selected) select(null);
  else focusFloor(null);
});

// --- data ---
const instantUntil = performance.now() + 1500;
let started = false;
subscribe((kind) => {
  if (kind === 'roster' || kind === 'status') {
    const rebuilt = building.setTeams(state.teams);
    botLayer.sync(state, performance.now() < instantUntil);
    if (!started) {
      started = true;
      const firstWaiting = [...state.bots.values()].find((b) => b.state === 'waiting');
      focusFloor(building.floor('公共层') ? '公共层' : (firstWaiting?.team || state.teams[0]));
      tween.dur = 0.01;
    } else if (rebuilt) {
      if (focus && !building.floor(focus)) focusFloor(null);
      else building.showUpTo(focus);
    }
  }
  ui.render();
});

// A dashboard doesn't need the screen's full refresh rate: the tier sets the pace,
// a bit faster while the camera moves, and slow when the window isn't in front.
let last = performance.now(), elapsed = 0, movingUntil = 0, lastZ = '';
controls.addEventListener('change', () => { movingUntil = performance.now() + 300; });
renderer.setAnimationLoop((now) => {
  try {
  const c = quality.cfg;
  const busy = tween.active || now < movingUntil;
  const fps = !quality.fixed && !document.hasFocus() ? 10 : busy ? c.busyFps : c.fps;
  const budget = 1000 / fps;
  const gap = now - last;
  if (gap < budget - 2) return;
  const t0 = performance.now();
  const dt = Math.min(gap / 1000, 0.05);
  last = now;
  elapsed += dt;
  stepTween(dt);
  building.update(dt);
  controls.update();
  botLayer.update(dt, elapsed);
  atmosphere.update(dt, elapsed);
  sun.target.position.copy(controls.target);
  sun.position.copy(controls.target).add(SUN_OFFSET);
  renderer.render(scene, camera);
  // bubbles grow a little as you zoom in, so close-ups still read
  const z = Math.min(2.4, Math.max(0.8, camera.zoom)).toFixed(2);
  if (z !== lastZ) labels.domElement.style.setProperty('--z', (lastZ = z));
  labels.render(scene, camera);
  quality.sample(performance.now() - t0, gap, budget);
  } catch (error) {
    const box = document.getElementById('err');
    if (box) {
      box.style.display = 'block';
      box.textContent = '3D render error:\n' + ((error && error.stack) || error);
    }
    renderer.setAnimationLoop(null);
  }
});

// Hooks for scripted recordings (promo videos).
window.__office = {
  focusFloor, select, ingest,
  // push the camera in on one bot (close-ups in recordings)
  closeUp(id, zoom = 2.2, dur = 1.2) {
    const b = botLayer.get(id);
    if (!b) return;
    const v = new THREE.Vector3();
    b.body.getWorldPosition(v);
    flyTo(v, zoom, dur, 0.05);
  },
  quality: () => quality.tier,
  stats: () => ({ frame: renderer.info.render.frame, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries }),
  bots: () => [...botLayer.bots.values()].map((b) => ({
    id: b.id, name: b.rec.name, state: b.rec.state, floor: b.floor?.team, key: b.key,
    x: +b.pos.x.toFixed(2), z: +b.pos.z.toFixed(2), spot: b.spot,
    seat: b.seat ? b.seat.pos.x.toFixed(1) + ',' + b.seat.pos.z.toFixed(1) : null,
    meeting: b.meetingSeat ? b.meetingSeat.pos.x.toFixed(1) + ',' + b.meetingSeat.pos.z.toFixed(1) : null,
  })),
  debug: () => ({
    focus,
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z, zoom: camera.zoom, left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom },
    target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
    sceneChildren: scene.children.length,
    floors: [...building.floors.values()].map((f) => ({
      team: f.team, number: f.number, away: f.away, lift: f.lift,
      groupVisible: f.group.visible, innerVisible: f.inner.visible,
      y: f.group.position.y, children: f.inner.children.length,
      seats: f.seats.length, meetingSeats: f.meetingSeats.length, rest: f.rest.length,
    })),
    canvas: { w: renderer.domElement.width, h: renderer.domElement.height, cw: renderer.domElement.clientWidth, ch: renderer.domElement.clientHeight },
  }),
  screenOf(id) {
    const b = botLayer.get(id);
    if (!b) return null;
    const v = new THREE.Vector3();
    b.body.getWorldPosition(v);
    v.y += b.height * 0.45;
    v.project(camera);
    return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
  },
};

await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
startFeed();
