export function sceneConfig(id) {
  let seed = 2166136261;
  for (const c of id) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const number = /^q\d+$/.test(id) ? Number(id.slice(1)) : seed;
  return { seed, mode: id === 'home' ? 0 : number % 8, hue: (seed % 360) / 360, speed: .12 + (seed % 23) / 100, phase: (seed % 628) / 100, count: 18 + seed % 17, twist: 2 + seed % 5 };
}
export function seededRandom(seed) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}
