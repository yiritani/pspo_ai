import * as THREE from 'three';
import { seededRandom } from './sceneConfig.js';

export const sculptureNames = ['クローム・ノット', '光の軌道', 'キューブ・フィールド', '粒子の波', 'ネオン・ヘリックス', 'クリスタル', '星の渦', 'フローティング・バブル'];
export const sculptureDescriptions = [
  '金属とコーティングの反射。商品ビューアやブランドのキービジュアルに。',
  '発光する軌道と球体。宇宙表現や関係性の可視化に。',
  '立体が連動して動く配置。データ表現やインタラクティブな背景に。',
  '粒子が作る波。音楽のビジュアライザーや有機的なモーションに。',
  '光る構造と回転。科学の説明や立体モデルの観察に。',
  '面ごとの反射と光沢。宝石やプロダクトの質感表現に。',
  '粒子が描く渦。星雲や抽象的なアートに。',
  '反射する球体の浮遊。遊べる装飾や動きのあるヒーロー画面に。',
];
export function createSculpture(scene, config) {
  const random = seededRandom(config.seed);
  const root = new THREE.Group(); scene.add(root);
  const geometries = new Set(), materials = new Set();
  const actors = [], pickables = [];
  const color = new THREE.Color().setHSL(config.hue, .78, .55);
  const accent = new THREE.Color().setHSL((config.hue + .24) % 1, .9, .65);
  const chrome = new THREE.MeshPhysicalMaterial({ color, metalness: .88, roughness: .18, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .9 });
  const pearl = new THREE.MeshPhysicalMaterial({ color: accent, metalness: .45, roughness: .2, clearcoat: 1 });
  const neon = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2, metalness: .3, roughness: .25 });
  [chrome, pearl, neon].forEach(m => materials.add(m));
  function mesh(g, m = chrome) {
    geometries.add(g); const object = new THREE.Mesh(g, m); root.add(object); pickables.push(object); return object;
  }
  const tau = Math.PI * 2;
  if (config.mode === 0) {
    const knot = mesh(new THREE.TorusKnotGeometry(1.25, .36, 160, 20, 2 + config.seed % 2, 3 + config.seed % 3));
    knot.rotation.set(.4, .2, .3); actors.push({ object: knot, kind: 'spin' });
    for (let i = 0; i < 9; i++) { const o = mesh(new THREE.SphereGeometry(.09 + random() * .12, 16, 12), i % 3 ? pearl : neon); actors.push({ object: o, kind: 'orbit', phase: i / 9 * tau, radius: 2.1 + random() * .4, tilt: random() * 2 }); }
  } else if (config.mode === 1) {
    mesh(new THREE.IcosahedronGeometry(.8, 2), chrome);
    for (let i = 0; i < 4; i++) {
      const axis = new THREE.Group(); root.add(axis); axis.rotation.set(i * .6, i * .4, i * .3);
      const g = new THREE.TorusGeometry(1.2 + i * .35, .022, 8, 100); geometries.add(g); axis.add(new THREE.Mesh(g, neon));
      const orb = mesh(new THREE.SphereGeometry(.15 + i * .02, 20, 16), pearl); root.remove(orb); axis.add(orb);
      actors.push({ object: orb, kind: 'orbit', phase: i, radius: 1.2 + i * .35, tilt: 0 });
    }
  } else if (config.mode === 2) {
    const g = new THREE.BoxGeometry(.48, .48, .48); geometries.add(g);
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) {
      const o = mesh(g, (x + y) % 4 === 0 ? neon : chrome);
      o.userData.base = new THREE.Vector3(x * .63, y * .63, (random() - .5) * .9);
      actors.push({ object: o, kind: 'cube', phase: x * .7 + y * .5 });
    }
  } else if (config.mode === 3) {
    const g = new THREE.SphereGeometry(.06, 8, 6); geometries.add(g);
    for (let x = 0; x < 24; x++) for (let z = 0; z < 18; z++) {
      const o = new THREE.Mesh(g, (x + z) % 7 ? pearl : neon); root.add(o);
      actors.push({ object: o, kind: 'wave', x: (x - 11.5) * .19, z: (z - 8.5) * .19 });
    }
    root.rotation.x = .35;
  } else if (config.mode === 4) {
    const g = new THREE.SphereGeometry(.12, 16, 12); geometries.add(g);
    for (let i = 0; i < 32; i++) {
      const a = i / 31 * tau * 2;
      for (let side = 0; side < 2; side++) {
        const o = mesh(g, side ? pearl : chrome); o.userData.base = new THREE.Vector3(Math.cos(a + side * Math.PI), (i / 31 - .5) * 4, Math.sin(a + side * Math.PI));
        actors.push({ object: o, kind: 'helix', phase: a });
      }
      const rod = mesh(new THREE.CylinderGeometry(.018, .018, 2, 6), neon); rod.rotation.z = Math.PI / 2; rod.rotation.y = -a; rod.position.y = (i / 31 - .5) * 4;
    }
  } else if (config.mode === 5) {
    const crystal = mesh(new THREE.IcosahedronGeometry(1.7, 0), new THREE.MeshPhysicalMaterial({ color, metalness: .7, roughness: .12, clearcoat: 1, flatShading: true })); materials.add(crystal.material);
    actors.push({ object: crystal, kind: 'spin' });
    for (let i = 0; i < 12; i++) { const o = mesh(new THREE.OctahedronGeometry(.18 + random() * .15), pearl); actors.push({ object: o, kind: 'orbit', phase: i / 12 * tau, radius: 2.3, tilt: random() * 2 }); }
  } else if (config.mode === 6) {
    const g = new THREE.SphereGeometry(.06, 8, 6); geometries.add(g);
    for (let i = 0; i < 240; i++) {
      const radius = .3 + Math.sqrt(i / 240) * 2.4;
      const phase = i * 2.39996;
      const o = new THREE.Mesh(g, i % 6 ? pearl : neon); root.add(o);
      actors.push({ object: o, kind: 'vortex', radius, phase });
    }
    root.rotation.x = .5;
  } else {
    const g = new THREE.SphereGeometry(1, 32, 24); geometries.add(g);
    for (let i = 0; i < config.count; i++) {
      const o = mesh(g, i % 5 ? chrome : pearl);
      const size = .17 + random() * .35; o.userData.size = size; o.scale.setScalar(size);
      actors.push({ object: o, kind: 'bubble', phase: i * 2.39996, radius: .8 + random() * 1.4, tilt: random() * tau });
    }
  }
  // A luminous pedestal anchors the sculpture in space.
  const pedestal = mesh(new THREE.TorusGeometry(2.35, .012, 6, 128), neon); pedestal.rotation.x = Math.PI / 2; pedestal.position.y = -2.55; pickables.pop();
  const pos = [], colors = [];
  for (let i = 0; i < 180; i++) {
    pos.push((random() - .5) * 12, (random() - .5) * 9, -3 - random() * 5);
    const c = i % 3 ? color : accent; colors.push(c.r, c.g, c.b);
  }
  const starsGeometry = new THREE.BufferGeometry(); starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometries.add(starsGeometry);
  const starsMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, vertexShader: 'varying vec3 vColor; void main(){ vColor=color; vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_PointSize=clamp(22.0/-p.z,1.0,4.0); }', fragmentShader: 'varying vec3 vColor; void main(){ float a=1.0-smoothstep(0.05,0.5,length(gl_PointCoord-0.5)); gl_FragColor=vec4(vColor*1.8,a*.7); }' }); materials.add(starsMaterial);
  const stars = new THREE.Points(starsGeometry, starsMaterial); scene.add(stars);
  let expanded = false, hovered = null;
  const raycaster = new THREE.Raycaster();
  function animate(time) {
    const t = time * config.speed;
    root.rotation.y = t * .45 + config.phase;
    const spread = expanded ? 1.32 : 1;
    actors.forEach(({ object: o, kind, phase = 0, radius = 0, tilt = 0, x = 0, z = 0 }) => {
      if (kind === 'spin') { o.rotation.x = .3 + t * .2; o.rotation.z = .2 + t * .13; }
      if (kind === 'orbit' || kind === 'bubble') {
        const a = phase + t * .8;
        o.position.set(Math.cos(a) * radius, Math.sin(a) * radius * (kind === 'bubble' ? .8 : .2), Math.sin(a + tilt) * radius * .65);
      }
      if (kind === 'cube') { o.position.copy(o.userData.base); o.position.z += Math.sin(t * 2 + phase) * .45; o.rotation.set(t * .2 + phase, t * .3, .1); }
      if (kind === 'helix') o.position.copy(o.userData.base);
      if (kind === 'wave') o.position.set(x, Math.sin(x * 2 + t * 2) * .45 + Math.cos(z * 2 + t) * .35, z);
      if (kind === 'vortex') { const a = phase + t / (radius + .6); o.position.set(Math.cos(a) * radius, Math.sin(radius * 2 - t * 2) * .3, Math.sin(a) * radius); }
      o.position.multiplyScalar(spread);
      const base = o.userData.size || 1;
      o.scale.setScalar(base * (o === hovered ? 1.18 : 1));
    });
    root.scale.setScalar(expanded ? 1.06 : 1);
    stars.rotation.y = t * .04;
  }
  return {
    name: sculptureNames[config.mode],
    animate,
    hover(pointer, camera) { root.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera); hovered = raycaster.intersectObjects(pickables, false)[0]?.object || null; return !!hovered; },
    expand() { expanded = !expanded; },
    reset() { expanded = false; hovered = null; },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
