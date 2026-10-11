import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sceneConfig } from './sceneConfig.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSculpture, sculptureNames, sculptureDescriptions } from './createSculpture.js';

export default function StudyScene({ sceneId, running }) {
  const [demoMode, setDemoMode] = useState(null);
  const activeMode = demoMode ?? sceneConfig(sceneId).mode;
  useEffect(() => { setDemoMode(null); }, [sceneId]);
  const hostRef = useRef(null);
  const resetRef = useRef(null);
  const runningRef = useRef(running);
  const syncRef = useRef(null);
  useEffect(() => { runningRef.current = running; syncRef.current?.(); }, [running]);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    const config = sceneConfig(sceneId);
    config.mode = demoMode ?? config.mode;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
    catch { setUnavailable(true); return; }
    setUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x080e20, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .9;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 60);
    camera.position.set(0, 0, 10);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 6.8;
    controls.maxDistance = 16;
    controls.rotateSpeed = .7;
    controls.zoomSpeed = .65;
    controls.cursorStyle = 'grab';
    controls.update(); controls.saveState();
    resetRef.current = () => controls.reset();
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(environment, .04);
    scene.environment = environmentTarget.texture;
    environment.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xa6caff, 0x15223b, .8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.7); keyLight.position.set(3, 5, 4); scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8a62ff, 2); rimLight.position.set(-4, 1, -2); scene.add(rimLight);
    const sculpture = createSculpture(scene, config);
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(400, 300), .3, .35, 2.1);
    const outputPass = new OutputPass();
    composer.addPass(renderPass); composer.addPass(bloomPass); composer.addPass(outputPass);
    resetRef.current = () => { sculpture.reset(); controls.reset(); render(); };
    const pointer = new THREE.Vector2();
    let downPosition = null;
    function move(event) {
      const rect = host.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      sculpture.hover(pointer, camera); render();
    }
    function down(event) { downPosition = [event.clientX, event.clientY]; }
    function up(event) {
      if (downPosition && Math.hypot(event.clientX - downPosition[0], event.clientY - downPosition[1]) < 5) { sculpture.expand(); render(); }
      downPosition = null;
    }
    function leave() { sculpture.hover(new THREE.Vector2(100, 100), camera); render(); }
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerdown', down);
    host.addEventListener('pointerup', up);
    host.addEventListener('pointerleave', leave);
    let time = 0, last = 0, frame = 0, visible = true, interacting = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function render() {
      sculpture.animate(time);
      composer.render();
    }

    function tick(now) {
      frame = 0;
      if (last && !interacting) time += Math.min((now - last) / 1000, .05);
      last = now; render(); frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (runningRef.current && !reducedMotion.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
      else render();
    }
    function resize() {
      const { width, height } = host.getBoundingClientRect();
      camera.aspect = Math.max(width, 1) / Math.max(height, 1); camera.updateProjectionMatrix();
      renderer.setSize(width, height); composer.setSize(width, height); render();
    }
    syncRef.current = sync;
    const onChange = () => render();
    const onStart = () => { interacting = true; host.classList.add('is-dragging'); };
    const onEnd = () => { interacting = false; host.classList.remove('is-dragging'); };
    controls.addEventListener('change', onChange);
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    function onKey(event) {
      const actions = {
        ArrowLeft: () => controls.rotateLeft(.16), ArrowRight: () => controls.rotateLeft(-.16),
        ArrowUp: () => controls.rotateUp(.16), ArrowDown: () => controls.rotateUp(-.16),
        '+': () => controls.dollyIn(.9), '=': () => controls.dollyIn(.9),
        '-': () => controls.dollyOut(.9), '0': () => controls.reset(),
      };
      if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
    }
    host.addEventListener('keydown', onKey);
    const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }); intersection.observe(host);
    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener('change', sync);
    function lost(event) { event.preventDefault(); cancelAnimationFrame(frame); setUnavailable(true); }
    renderer.domElement.addEventListener('webglcontextlost', lost);
    resize(); sync();
    return () => {
      syncRef.current = null; resetRef.current = null;
      host.removeEventListener('keydown', onKey);
      controls.removeEventListener('change', onChange);
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.dispose();
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', sync); reducedMotion.removeEventListener('change', sync);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointerup', up); host.removeEventListener('pointerleave', leave);
      sculpture.dispose(); environmentTarget.dispose();
      bloomPass.dispose(); outputPass.dispose(); composer.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [sceneId, demoMode]);
  return <aside className={`study-scene ${sceneId === 'home' ? 'home-scene' : 'question-scene'} ${unavailable ? 'scene-fallback' : ''}`} data-scene-id={sceneId} aria-label="操作できる3Dオブジェクト">
    <div ref={hostRef} className="scene-viewport" tabIndex={unavailable ? -1 : 0} role="region" aria-label="3D操作エリア。ドラッグで回転、ホイールで拡大縮小。クリックで配置を広げる。矢印キーで回転、プラスとマイナスで拡大縮小、0でリセット。"/>
    <div className="scene-controls"><label>表現を切り替える<select aria-label="3Dの表現" value={activeMode} onChange={e => setDemoMode(Number(e.target.value))}>{sculptureNames.map((name, i) => <option key={name} value={i}>{name}</option>)}</select></label><p className="scene-description">{sculptureDescriptions[activeMode]}</p></div><div className="scene-toolbar"><span>{unavailable ? '3D表示は利用できません' : 'ドラッグ：回転 · スクロール：ズーム · クリック：広げる'}</span><button type="button" disabled={unavailable} onClick={() => resetRef.current?.()} aria-label="3Dの視点と配置をリセット">↺</button></div>
  </aside>;
}
