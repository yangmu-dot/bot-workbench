// The building: one white open-plan floor per team, stacked.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const W = 30, D = 20, H = 7.5;
const WALL_H = H - 0.5;
export const LANE_X = 5; // free column between the desks and the lounge
const LIFT = 34; // how far a floor rises when the building is cut open below it

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const M = {
  top: mat(0x142434, { roughness: 0.8 }),
  edge: mat(0x2c4558),
  wall: mat(0x111f2c, { roughness: 0.9 }),
  frame: mat(0x4c7890, { roughness: 0.3, metalness: 0.45 }),
  band: mat(0x1c4054, { roughness: 0.16, metalness: 0.5, emissive: 0x0d6d86, emissiveIntensity: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.04, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
  desk: mat(0x2a4156, { roughness: 0.5 }),
  stool: mat(0x35546a, { roughness: 0.45 }),
  laptop: mat(0x0b1119, { roughness: 0.3, metalness: 0.6 }),
  sofa: mat(0x263d50, { roughness: 0.85 }),
  leather: mat(0x122232, { roughness: 0.4 }),
  pot: mat(0x203646, { roughness: 0.4 }),
  trunk: mat(0x526b70),
  leaves: [mat(0x3f9e83), mat(0x2f7d6e), mat(0x61b89a)],
  counter: mat(0x1d3142, { roughness: 0.55 }),
  rug: mat(0x152a3a, { roughness: 0.95 }),
  rug2: mat(0x123033, { roughness: 0.95 }),
  lift: mat(0x24394b, { roughness: 0.35, metalness: 0.45 }),
  lamp: mat(0x9ff4ff, { roughness: 0.12, emissive: 0x52dcff, emissiveIntensity: 2.2 }),
};

const PALETTES = {
  dawn: {
    top: 0xf4e6cc, edge: 0xcfb894, wall: 0xfaf1df, frame: 0x7a5b3b,
    band: 0xe3a25e, bandEmissive: 0xffc978, bandGlow: 0.7,
    glass: 0xbfe6e0, glassOpacity: 0.35,
    desk: 0xf1dfc0, stool: 0xfff6e6, laptop: 0x7a6750, sofa: 0xf4e4c8,
    leather: 0x9a6a45, pot: 0xf6eddc, trunk: 0x7a5a3e,
    leaves: [0x6f9f8a, 0x5f8f7a, 0x8bb9a2], counter: 0xf0dcba,
    rug: 0xe8d3b0, rug2: 0xd9e8df, lift: 0xb98b5b,
    lamp: 0xffe4b0, lampEmissive: 0xffb45e, lampGlow: 1.1,
  },
  neon: {
    top: 0x0a1020, edge: 0x1c2f4a, wall: 0x0b1220, frame: 0x2a5a7a,
    band: 0xff2a8a, bandEmissive: 0xff2a8a, bandGlow: 1.3,
    glass: 0x6fe8ff, glassOpacity: 0.28,
    desk: 0x172538, stool: 0x24384f, laptop: 0x090d16, sofa: 0x1a2a3e,
    leather: 0x101a26, pot: 0x1a2a3a, trunk: 0x3a4a5a,
    leaves: [0x2a6f6a, 0x1f5a5e, 0x4a9a8a], counter: 0x142030,
    rug: 0x0c1828, rug2: 0x14102a, lift: 0x2a3a5a,
    lamp: 0xff6ad5, lampEmissive: 0xff2a8a, lampGlow: 2.2,
  },
  moss: {
    top: 0x1b2a1c, edge: 0x3d4a2e, wall: 0x142018, frame: 0x5a4a32,
    band: 0x7f9a52, bandEmissive: 0x3f5a22, bandGlow: 0.45,
    glass: 0xb8d8b8, glassOpacity: 0.28,
    desk: 0x2a3a28, stool: 0x3d4a34, laptop: 0x151a12, sofa: 0x2d3d2a,
    leather: 0x3a2d20, pot: 0x26321f, trunk: 0x4a3a24,
    leaves: [0x6f8a4a, 0x587a3a, 0x8aa85e], counter: 0x2b3a2a,
    rug: 0x1f2b1c, rug2: 0x26382a, lift: 0x5a4630,
    lamp: 0xd8c27a, lampEmissive: 0x9ab55a, lampGlow: 0.8,
  },
  ink: {
    top: 0xf1ede2, edge: 0xcfc9bc, wall: 0xf6f1e6, frame: 0x22221f,
    band: 0x3a3933, bandEmissive: 0x000000, bandGlow: 0,
    glass: 0xd6dfdd, glassOpacity: 0.24,
    desk: 0xe4ddcf, stool: 0xf5f1e8, laptop: 0x22211e, sofa: 0xebe6da,
    leather: 0x2b2a26, pot: 0xece7dc, trunk: 0x4a443c,
    leaves: [0x5f6f5b, 0x4f5d4b, 0x79866f], counter: 0xdfd7c6,
    rug: 0xe4dccd, rug2: 0xd8ddd2, lift: 0x4a4740,
    lamp: 0xfff0d0, lampEmissive: 0xffdf9e, lampGlow: 0.55,
  },
  vermilion: {
    top: 0xe8d3b0, edge: 0xb88a4a, wall: 0x6d1a1a, frame: 0xd4af37,
    band: 0xd4af37, bandEmissive: 0xb8862b, bandGlow: 0.5,
    glass: 0xcfe0d8, glassOpacity: 0.25,
    desk: 0x6b1a1a, stool: 0xd4af37, laptop: 0x1b1b1b, sofa: 0x7a1e1e,
    leather: 0x3a0f0f, pot: 0x8c1c1c, trunk: 0x6b1a1a,
    leaves: [0x3f7a5a, 0x2f6a4a, 0x5a9a72], counter: 0xb8862b,
    rug: 0x8c1c1c, rug2: 0x2f6a4a, lift: 0xb8862b,
    lamp: 0xffd27a, lampEmissive: 0xffb03a, lampGlow: 1.2,
  },
};

export function applyTheme(name) {
  const p = PALETTES[name] || PALETTES.dawn;
  for (const key of ['top', 'edge', 'wall', 'frame', 'desk', 'stool', 'laptop', 'sofa', 'leather', 'pot', 'trunk', 'counter', 'rug', 'rug2', 'lift']) {
    M[key].color.setHex(p[key]);
  }
  M.band.color.setHex(p.band);
  M.band.emissive.setHex(p.bandEmissive);
  M.band.emissiveIntensity = p.bandGlow;
  M.glass.color.setHex(p.glass);
  M.glass.opacity = p.glassOpacity;
  M.lamp.color.setHex(p.lamp);
  M.lamp.emissive.setHex(p.lampEmissive);
  M.lamp.emissiveIntensity = p.lampGlow;
  p.leaves.forEach((color, i) => M.leaves[i].color.setHex(color));
  return name;
}

function shade(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function box(w, h, d, material, x, y, z, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  const m = shade(new THREE.Mesh(geo, material));
  m.position.set(x, y, z);
  return m;
}

function cyl(rt, rb, h, material, x, y, z, seg = 20) {
  const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material));
  m.position.set(x, y, z);
  return m;
}

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function windowWall(len) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(len, WALL_H), M.glass);
  glass.position.y = WALL_H / 2;
  g.add(glass);
  g.add(box(len, 0.14, 0.2, M.frame, 0, 0.07, 0));
  g.add(box(len, 0.14, 0.2, M.frame, 0, WALL_H - 0.07, 0));
  g.add(box(len, 0.08, 0.08, M.frame, 0, 1.2, 0.25));
  const n = Math.round(len / 3);
  for (let i = 0; i <= n; i++) g.add(box(0.12, WALL_H, 0.2, M.frame, -len / 2 + (i * len) / n, WALL_H / 2, 0));
  return g;
}

function plant(x, z, s = 1) {
  const g = new THREE.Group();
  const r = rng(Math.round(x * 97 + z * 31));
  g.add(cyl(0.42, 0.34, 0.85, M.pot, 0, 0.425, 0));
  g.add(cyl(0.05, 0.07, 1.4, M.trunk, 0, 1.4, 0, 8));
  const leafGeo = new THREE.SphereGeometry(1, 12, 9);
  for (let i = 0; i < 11; i++) {
    const a = r() * Math.PI * 2, d = 0.15 + r() * 0.5;
    const leaf = shade(new THREE.Mesh(leafGeo, M.leaves[i % 3]));
    leaf.scale.setScalar(0.3 + r() * 0.25);
    leaf.position.set(Math.cos(a) * d, 2.1 + r() * 0.8, Math.sin(a) * d);
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  return g;
}

function teamScreen(team, number) {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 384;
  const x = c.getContext('2d');
  x.fillStyle = '#17171a';
  x.fillRect(0, 0, 768, 384);
  x.fillStyle = '#7a7a82';
  x.font = '700 34px "Plus Jakarta Sans", system-ui, sans-serif';
  x.fillText(`FLOOR ${number}`, 52, 86);
  x.fillStyle = '#ffffff';
  x.font = '800 96px "Plus Jakarta Sans", system-ui, sans-serif';
  x.fillText(team, 52, 196, 664);
  const r = rng(number * 13 + team.length);
  for (let i = 0; i < 14; i++) {
    const h = 20 + r() * 80;
    x.fillStyle = i % 4 === 3 ? '#ff6b57' : '#5fd38a';
    x.globalAlpha = 0.85;
    x.fillRect(52 + i * 47, 340 - h, 28, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = new THREE.Group();
  g.add(box(6.7, 3.5, 0.12, M.frame, 0, 0, -0.08));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  g.add(face);
  g.userData.tex = tex;
  return g;
}

// Melt every static mesh under `root` into one mesh per material, so a floor
// costs about fifteen draw calls instead of hundreds. Meshes marked keep stay.
function bake(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const buckets = new Map();
  const melted = [];
  root.traverse((o) => {
    if (!o.isMesh || o.userData.keep || Array.isArray(o.material)) return;
    let g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!buckets.has(o.material)) buckets.set(o.material, { geos: [], cast: o.castShadow, receive: o.receiveShadow });
    buckets.get(o.material).geos.push(g);
    melted.push(o);
  });
  for (const o of melted) {
    o.removeFromParent();
    o.geometry.dispose();
  }
  for (const [material, b] of buckets) {
    const m = new THREE.Mesh(mergeGeometries(b.geos), material);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    root.add(m);
    for (const g of b.geos) g.dispose();
  }
}

// A floor seen from outside: white shell with one dark ribbon window.
function facade() {
  const g = new THREE.Group();
  const t = 0.3;
  g.add(box(W + 0.6, WALL_H, t, M.wall, 0, WALL_H / 2, D / 2 + 0.15));
  g.add(box(W + 0.6, WALL_H, t, M.wall, 0, WALL_H / 2, -D / 2 - 0.15));
  g.add(box(t, WALL_H, D + 0.6, M.wall, W / 2 + 0.15, WALL_H / 2, 0));
  g.add(box(t, WALL_H, D + 0.6, M.wall, -W / 2 - 0.15, WALL_H / 2, 0));
  g.add(box(W + 0.4, WALL_H, D + 0.4, M.wall, 0, WALL_H / 2, 0));
  const bh = 2.4, by = 3.7;
  g.add(box(W + 0.7, bh, 0.1, M.band, 0, by, D / 2 + 0.32));
  g.add(box(0.1, bh, D + 0.7, M.band, W / 2 + 0.32, by, 0));
  for (let x = -W / 2 + 3; x < W / 2; x += 3) g.add(box(0.14, bh, 0.06, M.wall, x, by, D / 2 + 0.39));
  for (let z = -D / 2 + 2.5; z < D / 2; z += 2.5) g.add(box(0.06, bh, 0.14, M.wall, W / 2 + 0.39, by, z));
  return g;
}

export class Floor {
  constructor(team, number) {
    this.team = team;
    this.number = number;
    const g = (this.group = new THREE.Group());
    // inner: the open office; facade: the closed shell shown when you look down on it
    this.inner = new THREE.Group();
    this.facade = facade();
    this.facade.visible = false;
    g.add(this.inner, this.facade);

    const roomGlow = new THREE.PointLight(0xbfeaff, 8, 30, 2);
    roomGlow.position.set(0, 3.4, 0);
    this.inner.add(roomGlow);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.8, 0.5, D + 0.8), [M.edge, M.edge, M.top, M.edge, M.edge, M.edge]);
    slab.position.y = -0.25;
    slab.receiveShadow = true;
    slab.castShadow = true;
    slab.userData.team = team;
    this.slab = slab;
    g.add(slab);

    const win = windowWall(W);
    win.position.z = -D / 2;
    this.inner.add(win);
    this.inner.add(box(0.35, WALL_H, D, M.wall, -W / 2, WALL_H / 2, 0));

    this.screen = teamScreen(team, number);
    this.screen.position.set(-W / 2 + 0.3, 3.9, -1.5);
    this.screen.rotation.y = Math.PI / 2;
    this.inner.add(this.screen);

    this.seats = [];
    this.meetingSeats = [];
    this.rest = [];
    this.lanes = [-7.4, -0.2, 7.2];
    this.addLift();
    if (team === '公共层') {
      this.lounge();
      this.meeting();
      this.central();
    } else {
      const front = this.deskRow(-5, 3.6, 15.5);
      const back = this.deskRow(-5, -4, 15.5);
      // Seats facing the camera first, alternating rows, nearest the lounge first.
      const order = [];
      for (let i = 0; i < 5; i++) order.push(front.near[i], back.near[i]);
      for (let i = 0; i < 5; i++) order.push(front.far[i], back.far[i]);
      this.seats = order;
    }
    this.spawn = new THREE.Vector3(-13.2, 0, -8.2);
    // neon perimeter: the sci-fi read in the dark
    const glow = M.band;
    this.inner.add(
      box(W - 1, 0.025, 0.07, glow, 0, 0.035, -D / 2 + 0.45),
      box(W - 1, 0.025, 0.07, glow, 0, 0.035, D / 2 - 0.45),
      box(0.07, 0.025, D - 1, glow, -W / 2 + 0.45, 0.035, 0),
      box(0.07, 0.025, D - 1, glow, W / 2 - 0.45, 0.035, 0),
    );
    for (const [x, z] of [[-W / 2 + 0.45, -D / 2 + 0.45], [W / 2 - 0.45, -D / 2 + 0.45], [-W / 2 + 0.45, D / 2 - 0.45], [W / 2 - 0.45, D / 2 - 0.45]]) {
      this.inner.add(box(0.07, 2.6, 0.07, glow, x, 1.3, z));
    }

    bake(this.inner);
    bake(this.facade);
    this.facade.traverse((o) => { o.userData.team = team; });
  }

  deskRow(cx, cz, len) {
    const g = this.inner;
    g.add(box(len, 0.12, 2.3, M.desk, cx, 1.45, cz, 0.05));
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) g.add(box(0.08, 1.4, 0.08, M.frame, cx + ex * (len / 2 - 0.35), 0.7, cz + ez * 0.95));
    const xs = [1, -2, -5, -8, -11];
    const out = { near: [], far: [] };
    for (const side of [-1, 1]) {
      for (const sx of xs) {
        const sz = cz + side * 1.95;
        g.add(cyl(0.42, 0.42, 0.9, M.stool, sx, 0.45, sz));
        g.add(box(0.85, 0.04, 0.58, M.laptop, sx, 1.53, cz + side * 0.55));
        const hinge = new THREE.Group();
        hinge.position.set(sx, 1.53, cz + side * 0.27);
        hinge.rotation.x = -side * 0.28;
        const lid = box(0.85, 0.58, 0.03, M.laptop, 0, 0.29, 0);
        const display = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.48), new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.3, emissive: 0x000000 }));
        display.position.set(0, 0.29, side * 0.02);
        display.userData.keep = true; // lights up per seat, so it keeps its own mesh
        if (side < 0) display.rotation.y = Math.PI;
        hinge.add(lid, display);
        g.add(hinge);
        const seat = {
          pos: new THREE.Vector3(sx, 0.9, sz),
          face: side > 0 ? Math.PI : 0,
          lane: this.lanes.reduce((a, b) => (Math.abs(b - sz) < Math.abs(a - sz) ? b : a)),
          display,
        };
        // side -1 sits on the far side of the desk, facing the camera
        (side < 0 ? out.near : out.far).push(seat);
      }
    }
    return out;
  }

  lounge() {
    const g = this.inner;
    const spot = (x, y, z, face) => this.rest.push({ pos: new THREE.Vector3(x, y, z), face, taken: null });

    // bar along the windows
    g.add(box(6, 1.5, 1.1, M.counter, 10.2, 0.75, -8.9, 0.08));
    g.add(box(0.7, 0.8, 0.55, M.leather, 12.4, 1.9, -9.0, 0.06));
    for (const bx of [8.7, 11.7]) {
      g.add(cyl(0.05, 0.05, 1.05, M.frame, bx, 0.53, -7.6, 8));
      g.add(cyl(0.3, 0.3, 0.04, M.frame, bx, 0.02, -7.6));
      g.add(cyl(0.42, 0.42, 0.12, M.counter, bx, 1.1, -7.6));
      spot(bx, 1.16, -7.6, Math.PI);
    }

    // sofa facing the room
    g.add(box(5, 0.6, 1.8, M.sofa, 9.5, 0.4, 1.6, 0.22));
    g.add(box(5, 1.1, 0.5, M.sofa, 9.5, 0.95, 0.75, 0.2));
    g.add(box(0.5, 0.85, 1.8, M.sofa, 7.25, 0.55, 1.6, 0.2));
    g.add(box(0.5, 0.85, 1.8, M.sofa, 11.75, 0.55, 1.6, 0.2));
    // two seats: the bots are wider than a cushion
    for (const sx of [8.1, 10.9]) spot(sx, 0.7, 1.8, 0);

    // coffee table
    g.add(cyl(1, 1, 0.08, M.stool, 9.5, 0.55, 4.3, 40));
    g.add(cyl(0.1, 0.1, 0.5, M.frame, 9.5, 0.27, 4.3, 10));
    g.add(cyl(0.45, 0.45, 0.04, M.frame, 9.5, 0.02, 4.3));

    // armchair
    const chair = new THREE.Group();
    chair.add(box(1.7, 0.6, 1.6, M.leather, 0, 0.4, 0, 0.18));
    chair.add(box(1.7, 1.1, 0.4, M.leather, 0, 0.9, -0.62, 0.15));
    chair.add(box(0.35, 0.8, 1.6, M.leather, -0.85, 0.55, 0, 0.12));
    chair.add(box(0.35, 0.8, 1.6, M.leather, 0.85, 0.55, 0, 0.12));
    chair.position.set(13.4, 0, 3.6);
    chair.rotation.y = -Math.PI / 3;
    g.add(chair);
    const cp = new THREE.Vector3(0, 0.7, 0.1).applyEuler(chair.rotation).add(chair.position);
    spot(cp.x, cp.y, cp.z, chair.rotation.y);

    // standing around the bar
    spot(6.6, 0, -4.4, Math.PI / 4);
    spot(8.3, 0, -5.6, Math.PI / 3);
    spot(11.3, 0, 6.0, Math.PI / 4);
    spot(7.0, 0, 5.0, 0.4);
    spot(13.6, 0, -1.2, -0.5);

    for (const [x, z, s2] of [[6, -8.9, 1.1], [14.4, -5.4, 1.25], [14.3, 8.9, 1.05], [5.6, 9.2, 0.9], [-14.1, -8.9, 0.95]]) g.add(plant(x, z, s2));
  }

  coworking() {
    const g = this.inner;
    const xs = [-2.4, 2.4];
    const zs = [-8.4, -5.8, -3.2, -0.6, 2.0, 4.6, 7.2];
    for (const x of xs) {
      for (const z of zs) {
        g.add(box(2.8, 0.12, 1.25, M.desk, x, 1.42, z, 0.05));
        for (const ex of [-1, 1]) {
          g.add(box(0.08, 1.36, 0.08, M.frame, x + ex * 1.25, 0.68, z + 0.45));
          g.add(box(0.08, 1.36, 0.08, M.frame, x + ex * 1.25, 0.68, z - 0.45));
        }
        g.add(box(0.86, 0.04, 0.58, M.laptop, x, 1.5, z + 0.28));
        const hinge = new THREE.Group();
        hinge.position.set(x, 1.5, z + 0.02);
        hinge.rotation.x = -0.25;
        const lid = box(0.86, 0.58, 0.03, M.laptop, 0, 0.29, 0);
        const display = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.48), new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.3 }));
        display.position.set(0, 0.29, 0.02);
        hinge.add(lid, display);
        g.add(hinge);
        g.add(cyl(0.42, 0.42, 0.9, M.stool, x, 0.45, z + 1.35));
        g.add(cyl(0.42, 0.42, 0.08, M.leather, x, 0.93, z + 1.35));
        const lane = this.lanes.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
        this.seats.push({ pos: new THREE.Vector3(x, 0.9, z + 1.35), face: Math.PI, lane, display });
      }
    }
    // a few floor lamps, no ceiling
    for (const [x, z] of [[-4.1, 2.2], [4.1, 2.2], [-4.1, -5.0], [4.1, -5.0]]) {
      g.add(cyl(0.06, 0.06, 2.6, M.frame, x, 1.3, z, 8));
      g.add(cyl(0.34, 0.46, 0.4, M.lamp, x, 2.7, z, 24));
      g.add(cyl(0.42, 0.42, 0.05, M.frame, x, 0.03, z, 20));
    }
  }

  central() {
    const g = this.inner;
    // shared island in the middle of the public floor
    g.add(box(9.5, 0.04, 6.2, M.rug, 0.4, 0.03, 0.4, 0.08));
    g.add(box(4.6, 1.15, 1.3, M.counter, 0.4, 0.58, 0.8, 0.12));
    g.add(box(4.8, 0.08, 1.5, M.leather, 0.4, 1.16, 0.8, 0.06));
    for (const [x, z] of [[-1.9, 2.2], [0.4, 2.2], [2.7, 2.2]]) {
      g.add(cyl(0.42, 0.42, 0.9, M.stool, x, 0.45, z));
      g.add(cyl(0.42, 0.42, 0.06, M.leather, x, 0.93, z));
      this.rest.push({ pos: new THREE.Vector3(x, 0.9, z), face: Math.PI, taken: null });
    }
    g.add(cyl(0.42, 0.42, 0.14, M.stool, 0.4, 1.3, 0.8));
    g.add(cyl(0.22, 0.22, 0.18, M.laptop, 0.4, 1.42, 0.8));
    // floor lamps only — this floor has no roof
    for (const [x, z] of [[-3.4, 2.0], [4.0, 2.0]]) {
      g.add(cyl(0.06, 0.06, 2.2, M.frame, x, 1.1, z, 8));
      g.add(cyl(0.34, 0.46, 0.36, M.lamp, x, 2.3, z, 24));
      g.add(cyl(0.42, 0.42, 0.05, M.frame, x, 0.03, z, 20));
    }
    // greenery and a small reading corner
    g.add(plant(-3.4, -2.4, 1.15));
    g.add(plant(3.7, -3.2, 0.95));
    g.add(box(2.4, 0.55, 1.4, M.sofa, -2.6, 0.35, -3.2, 0.18));
    g.add(box(2.4, 0.75, 0.35, M.sofa, -2.6, 0.8, -3.85, 0.15));
    g.add(cyl(0.85, 0.85, 0.08, M.stool, -2.6, 0.5, -1.9, 32));
    g.add(cyl(0.08, 0.08, 0.45, M.frame, -2.6, 0.25, -1.9, 8));
    this.rest.push({ pos: new THREE.Vector3(-2.6, 0.7, -3.2), face: 0, taken: null });
    // a long shared bench under the window
    g.add(box(5.2, 0.14, 0.8, M.counter, -2.4, 0.55, -8.4, 0.08));
    for (const x of [-4.4, -2.4, -0.4]) g.add(cyl(0.35, 0.35, 0.55, M.stool, x, 0.28, -8.4));
    for (const x of [-4.4, -2.4, -0.4]) this.rest.push({ pos: new THREE.Vector3(x, 0.8, -8.4), face: Math.PI, taken: null });
  }

  addLift() {
    const g = this.inner;
    // glass lift in the corner, where new bots arrive
    const lift = new THREE.Group();
    const s = 2.6, half = s / 2;
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) lift.add(box(0.1, WALL_H, 0.1, M.frame, ex * half, WALL_H / 2, ez * half));
    for (const y of [0.05, WALL_H - 0.05]) {
      lift.add(box(s, 0.1, 0.1, M.frame, 0, y, -half));
      lift.add(box(s, 0.1, 0.1, M.frame, 0, y, half));
      lift.add(box(0.1, 0.1, s, M.frame, -half, y, 0));
      lift.add(box(0.1, 0.1, s, M.frame, half, y, 0));
    }
    lift.add(box(s - 0.1, 0.06, s - 0.1, M.lift, 0, 0.03, 0));
    for (const [px, pz, ry] of [[0, -half, 0], [-half, 0, Math.PI / 2], [0, half, 0]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(s, WALL_H), M.glass);
      p.position.set(px, WALL_H / 2, pz);
      p.rotation.y = ry;
      lift.add(p);
    }
    lift.position.set(-13.2, 0, -8.2);
    g.add(lift);
  }

  meeting() {
    const g = this.inner;
    const cx = -8.8, cz = 6.0;
    // larger glass meeting room in the front-left corner
    g.add(box(12, 0.08, 7.2, M.top, cx, 0.04, cz, 0.06));
    const glass = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.glass);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    glass(12, 3.2, 0.08, cx, 1.6, 2.4);
    glass(5.3, 3.2, 0.08, -12.15, 1.6, 9.6);
    glass(5.3, 3.2, 0.08, -5.45, 1.6, 9.6);
    glass(0.08, 3.2, 7.2, -14.8, 1.6, cz);
    glass(0.08, 3.2, 7.2, -2.8, 1.6, cz);
    for (const [w, d, x, z] of [[12, 0.1, cx, 2.4], [12, 0.1, cx, 9.6], [0.1, 7.2, -14.8, cz], [0.1, 7.2, -2.8, cz]]) {
      g.add(box(w, 0.12, d, M.frame, x, 3.2, z));
      g.add(box(w, 0.12, d, M.frame, x, 0.06, z));
    }
    // door posts on the camera-facing side
    g.add(box(0.12, 3.2, 0.12, M.frame, -9.5, 1.6, 9.6));
    g.add(box(0.12, 3.2, 0.12, M.frame, -8.1, 1.6, 9.6));
    // long table + eight chairs
    g.add(box(8.4, 0.14, 3.0, M.desk, cx, 1.1, cz, 0.08));
    for (const [x, z] of [[-12.7, 4.0], [-10.7, 4.0], [-8.7, 4.0], [-6.7, 4.0], [-12.7, 8.0], [-10.7, 8.0], [-8.7, 8.0], [-6.7, 8.0]]) {
      g.add(cyl(0.42, 0.42, 0.9, M.stool, x, 0.45, z));
      g.add(cyl(0.42, 0.42, 0.08, M.leather, x, 0.92, z));
      this.meetingSeats.push({ pos: new THREE.Vector3(x, 0.9, z), face: z < cz ? 0 : Math.PI });
    }
    // a big screen on the window side
    g.add(box(3.8, 1.8, 0.08, M.frame, cx, 2.2, 2.5));
    g.add(box(3.6, 1.6, 0.04, M.laptop, cx, 2.2, 2.56));
    g.add(plant(-2.0, 3.4, 0.75));
    g.add(plant(-14.0, 3.0, 0.8));
  }

  setClosed(closed) {
    this.inner.visible = !closed;
    this.facade.visible = closed;
  }

  claimRest(id) {
    let i = this.rest.findIndex((r) => r.taken === id);
    if (i < 0) i = this.rest.findIndex((r) => !r.taken);
    if (i < 0) {
      this.rest.push({ pos: new THREE.Vector3(7 + Math.random() * 6, 0, -3 + Math.random() * 3), face: Math.PI / 4, taken: null });
      i = this.rest.length - 1;
    }
    this.rest[i].taken = id;
    return i;
  }

  // A different free spot, for a bot on a break that feels like moving.
  moveRest(id) {
    const free = this.rest.map((r, i) => (r.taken ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) return this.rest.findIndex((r) => r.taken === id);
    const i = free[Math.floor(Math.random() * free.length)];
    this.releaseRest(id);
    this.rest[i].taken = id;
    return i;
  }

  releaseRest(id) {
    for (const r of this.rest) if (r.taken === id) r.taken = null;
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
    this.screen.userData.tex.dispose();
  }
}

export class Building {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.floors = new Map();
    this.order = [];
    this.key = '';
  }

  setTeams(teams) {
    const key = teams.join('\u0001');
    if (key === this.key) return false;
    this.key = key;
    for (const f of this.floors.values()) {
      f.group.removeFromParent();
      f.dispose();
    }
    this.floors.clear();
    this.order = teams.slice();
    teams.forEach((team, i) => {
      const f = new Floor(team, teams.length - i);
      f.group.position.y = (f.number - 1) * H;
      this.root.add(f.group);
      this.floors.set(team, f);
    });
    return true;
  }

  floor(team) {
    return this.floors.get(team);
  }

  get count() {
    return this.order.length;
  }

  // Cut the building open: floors above the focused one lift away, the higher ones first.
  showUpTo(team) {
    const top = team && this.floors.has(team) ? this.floors.get(team).number : Infinity;
    for (const f of this.floors.values()) {
      const away = f.number > top;
      if (away !== f.away) f.delay = away ? (this.count - f.number) * 0.07 : f.number * 0.06;
      f.away = away;
      if (!away) f.group.visible = true;
      // floors under the one you look at close up; opening is instant (covered by the
      // floors still above), closing waits until the floors above have come back down
      const closed = f.number < Math.min(top, this.count);
      if (!closed) f.setClosed(false);
      f.closeIn = closed ? 0.75 : -1;
    }
  }

  update(dt) {
    for (const f of this.floors.values()) {
      f.lift ??= 0;
      if (f.closeIn >= 0) { f.closeIn -= dt; if (f.closeIn < 0) f.setClosed(true); }
      if (f.delay > 0) { f.delay -= dt; continue; }
      const target = f.away ? LIFT : 0;
      f.lift += (target - f.lift) * (1 - Math.exp(-dt * 5.5));
      if (Math.abs(target - f.lift) < 0.01) f.lift = target;
      f.group.position.y = (f.number - 1) * H + f.lift;
      f.group.visible = !(f.away && f.lift > LIFT - 0.5);
    }
  }

  // Jump straight to the cut, no lift animation.
  snap() {
    for (const f of this.floors.values()) {
      f.delay = 0;
      f.lift = f.away ? LIFT : 0;
      if (f.closeIn >= 0) { f.closeIn = -1; f.setClosed(true); }
    }
    this.update(0);
  }

  slabs() {
    return [...this.floors.values()].filter((f) => !f.away && f.group.visible).flatMap((f) => (f.inner.visible ? [f.slab] : [f.slab, ...f.facade.children]));
  }
}
