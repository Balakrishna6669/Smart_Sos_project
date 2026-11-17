import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Layers, RotateCcw, Eye, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

interface Emergency3DSceneProps {
  latitude: number | null;
  longitude: number | null;
  triggerType?: string;
  isEmergencyActive?: boolean;
}

export const Emergency3DScene: React.FC<Emergency3DSceneProps> = ({
  latitude,
  longitude,
  triggerType = 'manual',
  isEmergencyActive = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeLayer, setActiveLayer] = useState<'beacon' | 'perimeter' | 'tactical'>('beacon');
  const [pulseSpeed, setPulseSpeed] = useState<number>(1);
  const [radarZoom, setRadarZoom] = useState<number>(1);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070d1e');
    scene.fog = new THREE.FogExp2('#070d1e', 0.035);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 10, 14);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 28;

    // Environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting
    const ambientLight = new THREE.HemisphereLight('#60a5fa', '#0f172a', 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ef4444', 2.0);
    dirLight.position.set(5, 12, 5);
    dirLight.castShadow = !isSoftwareGl;
    scene.add(dirLight);

    const blueLight = new THREE.DirectionalLight('#38bdf8', 1.2);
    blueLight.position.set(-8, 6, -5);
    scene.add(blueLight);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Radar Grid Base
    const gridHelper = new THREE.PolarGridHelper(12, 16, 8, 64, '#1e293b', '#0f172a');
    gridHelper.position.y = 0;
    rootGroup.add(gridHelper);

    // 2. Procedural Concentric Pulse Waves
    const waveRings: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.RingGeometry(1.5 + i * 2.2, 1.65 + i * 2.2, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#ef4444' : '#38bdf8',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45 - i * 0.08,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.02 + i * 0.01;
      rootGroup.add(ringMesh);
      waveRings.push(ringMesh);
    }

    // 3. Multi-part 3D Tactical Emergency Beacon Assembly (THREE.Group with 8 parts)
    const beaconGroup = new THREE.Group();

    // Part 1: Outer Heavy Foundation Base
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.4, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.85,
      roughness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.2;
    beaconGroup.add(baseMesh);

    // Part 2: Middle Metallic Collar
    const collarGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.5, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      metalness: 0.9,
      roughness: 0.2,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.65;
    beaconGroup.add(collarMesh);

    // Part 3: Inner Core Core Pedestal
    const corePedestalGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.4, 32);
    const corePedestalMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.8,
      roughness: 0.25,
    });
    const corePedestalMesh = new THREE.Mesh(corePedestalGeo, corePedestalMat);
    corePedestalMesh.position.y = 1.05;
    beaconGroup.add(corePedestalMesh);

    // Part 4: High-Emission Laser Lens Crystal (Octahedron)
    const crystalGeo = new THREE.OctahedronGeometry(0.85, 2);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: '#ef4444',
      emissive: '#dc2626',
      emissiveIntensity: 0.9,
      metalness: 0.1,
      roughness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.y = 2.0;
    beaconGroup.add(crystalMesh);

    // Part 5: Surrounding Gyro Kinetic Orbit Rings
    const gyroRingGeo = new THREE.TorusGeometry(1.4, 0.06, 16, 64);
    const gyroRingMat = new THREE.MeshStandardMaterial({
      color: '#60a5fa',
      metalness: 0.95,
      roughness: 0.15,
    });
    const gyroRing1 = new THREE.Mesh(gyroRingGeo, gyroRingMat);
    gyroRing1.position.y = 2.0;
    beaconGroup.add(gyroRing1);

    const gyroRing2 = new THREE.Mesh(gyroRingGeo, gyroRingMat);
    gyroRing2.position.y = 2.0;
    gyroRing2.rotation.x = Math.PI / 3;
    beaconGroup.add(gyroRing2);

    // Part 6: Vertical Aerial Emergency Sky-Beam
    const beamGeo = new THREE.CylinderGeometry(0.12, 1.2, 18, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 10.5;
    beaconGroup.add(beamMesh);

    // Part 7: Satellite Radar Dishes (3 outer perimeter nodes)
    const nodeGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.4,
    });
    const perimeterNodes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      const angle = (i * 2 * Math.PI) / 3;
      node.position.set(Math.cos(angle) * 4.5, 0.4, Math.sin(angle) * 4.5);
      beaconGroup.add(node);
      perimeterNodes.push(node);
    }

    // Part 8: Radial Contact Shadow Plate
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    beaconGroup.add(shadowMesh);

    rootGroup.add(beaconGroup);

    // Animation Loop
    let clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime() * pulseSpeed;

      controls.update();

      // Spin crystal and gyro rings
      crystalMesh.rotation.y += 0.8 * dt;
      crystalMesh.rotation.z = Math.sin(elapsed * 2) * 0.15;

      gyroRing1.rotation.y += 1.2 * dt;
      gyroRing1.rotation.x = Math.sin(elapsed) * 0.3;

      gyroRing2.rotation.y -= 1.5 * dt;
      gyroRing2.rotation.z = Math.cos(elapsed) * 0.3;

      // Pulse wave expansion
      waveRings.forEach((r, idx) => {
        const scale = 1 + (Math.sin(elapsed * 2 - idx * 0.8) + 1) * 0.12;
        r.scale.set(scale, scale, 1);
      });

      // Orbit perimeter nodes
      perimeterNodes.forEach((node, i) => {
        const angle = elapsed * 0.6 + (i * 2 * Math.PI) / 3;
        node.position.x = Math.cos(angle) * 4.5;
        node.position.z = Math.sin(angle) * 4.5;
        node.position.y = 0.4 + Math.sin(elapsed * 3 + i) * 0.15;
      });

      // Beam flicker if emergency active
      if (isEmergencyActive) {
        beamMat.opacity = 0.4 + Math.sin(elapsed * 8) * 0.25;
        crystalMat.emissiveIntensity = 1.2 + Math.sin(elapsed * 8) * 0.4;
      } else {
        beamMat.opacity = 0.25 + Math.sin(elapsed * 2) * 0.1;
        crystalMat.emissiveIntensity = 0.8;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [pulseSpeed, isEmergencyActive]);

  return (
    <div className="relative w-full h-[440px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white backdrop-blur-md pointer-events-auto">
          <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="font-bold uppercase tracking-wider">3D Spatial Dispatch Beacon</span>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-emerald-400">
            {latitude && longitude
              ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              : '28.6139, 77.2090'}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
            PBR WebGL 60FPS
          </span>
        </div>
      </div>

      {/* Bottom Collapsible Control Dock (Three.js skill directive) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-lg w-[90%] bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs text-slate-300 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-white">Spatial Layer:</span>
        </div>

        <div className="flex items-center gap-1">
          {(['beacon', 'perimeter', 'tactical'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                activeLayer === layer
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <span className="text-[10px] text-slate-400">Pulse:</span>
          <button
            onClick={() => setPulseSpeed((p) => (p === 1 ? 2 : p === 2 ? 0.5 : 1))}
            className="px-2 py-0.5 rounded bg-slate-800 text-white font-mono text-[10px]"
          >
            {pulseSpeed}x
          </button>
        </div>
      </div>
    </div>
  );
};
