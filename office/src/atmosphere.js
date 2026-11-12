import * as THREE from 'three';

const STUDIO = {
  dawn: {
    top: '#f7f1e3',
    bottom: '#dfe8e2',
    glow: 'rgba(255,220,160,.38)',
    side: '#eadfcc',
  },
  neon: {
    top: '#05000c',
    bottom: '#160020',
    glow: 'rgba(255,42,138,.22)',
    side: '#12071d',
  },
  moss: {
    top: '#050b06',
    bottom: '#101a10',
    glow: 'rgba(160,200,120,.13)',
    side: '#0a120b',
  },
  ink: {
    top: '#f6f2e8',
    bottom: '#e6dfd1',
    glow: 'rgba(90,90,78,.06)',
    side: '#eee8dc',
  },
  vermilion: {
    top: '#1b0706',
    bottom: '#3b0d09',
    glow: 'rgba(220,160,60,.2)',
    side: '#2a0b08',
  },
};

function studioTexture(theme) {
  const p = STUDIO[theme] || STUDIO.dawn;
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  const base = x.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, p.top);
  base.addColorStop(0.55, p.bottom);
  base.addColorStop(1, p.side);
  x.fillStyle = base;
  x.fillRect(0, 0, W, H);

  const glow = x.createRadialGradient(W / 2, H * 0.55, 20, W / 2, H * 0.55, H * 0.78);
  glow.addColorStop(0, p.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);

  const vignette = x.createRadialGradient(W / 2, H * 0.48, H * 0.24, W / 2, H * 0.48, H * 0.88);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, theme === 'ink' || theme === 'dawn' ? 'rgba(80,70,55,.12)' : 'rgba(0,0,0,.42)');
  x.fillStyle = vignette;
  x.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  return tex;
}

export function createAtmosphere(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 64, 32),
    new THREE.MeshBasicMaterial({ depthWrite: false, depthTest: false, toneMapped: false, fog: false })
  );
  sky.geometry.scale(-1, 1, 1);
  sky.renderOrder = -200;
  sky.frustumCulled = false;
  root.add(sky);

  let currentTexture = null;
  let activeTheme = 'dawn';
  let photoMode = false;

  function set(theme) {
    activeTheme = STUDIO[theme] ? theme : 'dawn';
    const next = studioTexture(activeTheme);
    if (currentTexture) currentTexture.dispose();
    currentTexture = next;
    sky.material.map = currentTexture;
    sky.material.needsUpdate = true;
    sky.visible = !photoMode;
  }

  function setPhotoMode(active) {
    photoMode = Boolean(active);
    sky.visible = !photoMode;
  }

  return {
    set,
    setPhotoMode,
    update() {},
  };
}
