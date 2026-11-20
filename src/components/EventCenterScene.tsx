import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Float,
  Lightformer,
  MeshReflectorMaterial,
  Sparkles,
} from '@react-three/drei';
import {
  createCarpetTextures,
  createCitySkylineTexture,
  createCurtainWallTexture,
  createMarbleTextures,
  createMarqueeSignTexture,
  createPlazaStoneTextures,
  createRadialGlowTexture,
} from './EntranceTextures';

export interface SceneControlState {
  pointerX: number;
  pointerY: number;
  scrollNorm: number;
  doorsOpenFactor: number; // 0..1
  modalPush: number; // 0..1
  reducedMotion: boolean;
}

const _lookTarget = new THREE.Vector3(0, 2.2, -3.5);

function StanchionRopePair({ zPos }: { zPos: number }) {
  const ropeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.85, 0.92, zPos),
      new THREE.Vector3(-1.85, 0.71, zPos + 1.0),
      new THREE.Vector3(-1.85, 0.92, zPos + 2.0),
    ]);
    return new THREE.TubeGeometry(curve, 18, 0.026, 8, false);
  }, [zPos]);

  useEffect(() => () => ropeGeo.dispose(), [ropeGeo]);

  return (
    <group>
      {[-1.85, 1.85].map((x) => (
        <group key={x} position={[x, 0, zPos]}>
          {/* Weighted bevelled brass base */}
          <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.17, 0.21, 0.05, 22]} />
            <meshStandardMaterial color="#d49a33" metalness={0.92} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.065, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.12, 0.03, 18]} />
            <meshStandardMaterial color="#b98324" metalness={0.9} roughness={0.28} />
          </mesh>
          {/* Turned brass post */}
          <mesh position={[0, 0.51, 0]} castShadow>
            <cylinderGeometry args={[0.028, 0.034, 0.88, 16]} />
            <meshStandardMaterial color="#e0a943" metalness={0.94} roughness={0.18} />
          </mesh>
          {/* Rope ring collar */}
          <mesh position={[0, 0.91, 0]}>
            <torusGeometry args={[0.04, 0.008, 8, 18]} />
            <meshStandardMaterial color="#FBBF24" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Crown finial sphere */}
          <mesh position={[0, 0.98, 0]} castShadow>
            <sphereGeometry args={[0.052, 16, 16]} />
            <meshStandardMaterial color="#FBBF24" metalness={0.96} roughness={0.12} />
          </mesh>
        </group>
      ))}
      {/* Draped Velvet Ropes */}
      <mesh geometry={ropeGeo} castShadow>
        <meshPhysicalMaterial
          color="#6b142d"
          roughness={0.85}
          metalness={0.05}
          sheen={0.85}
          sheenColor="#b9385b"
        />
      </mesh>
      <mesh geometry={ropeGeo} position={[3.7, 0, 0]} castShadow>
        <meshPhysicalMaterial
          color="#6b142d"
          roughness={0.85}
          metalness={0.05}
          sheen={0.85}
          sheenColor="#b9385b"
        />
      </mesh>
    </group>
  );
}

/**
 * Multi-Part Architectural Stone Planter with Swaying Ornamental Tree
 */
function OrnamentalPlanterTree({
  position,
  seedOffset,
  reducedMotion,
}: {
  position: [number, number, number];
  seedOffset: number;
  reducedMotion: boolean;
}) {
  const canopyRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    if (reducedMotion || !canopyRef.current) return;
    const t = state.clock.elapsedTime;
    canopyRef.current.rotation.z = Math.sin(t * 0.85 + seedOffset) * 0.028;
    canopyRef.current.rotation.x = Math.cos(t * 0.65 + seedOffset) * 0.02;
  });

  return (
    <group position={position}>
      {/* Architectural Granite Planter Box */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.68, 1.45]} />
        <meshStandardMaterial color="#1b2232" roughness={0.72} metalness={0.15} />
      </mesh>
      {/* Brushed Bronze Planter Trim Rim */}
      <mesh position={[0, 0.69, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.52, 0.06, 1.52]} />
        <meshStandardMaterial color="#a67c33" metalness={0.88} roughness={0.28} />
      </mesh>
      {/* Dark Mulch / Soil Bed */}
      <mesh position={[0, 0.67, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.32, 1.32]} />
        <meshStandardMaterial color="#16110e" roughness={0.96} />
      </mesh>
      {/* Planter Uplight Lens */}
      <mesh position={[0.38, 0.69, 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.07, 14]} />
        <meshStandardMaterial color="#FEF3C7" emissive="#F59E0B" emissiveIntensity={1.6} />
      </mesh>

      {/* Multi-Stemmed Natural Trunk */}
      <group position={[0, 0.68, 0]}>
        <mesh position={[0, 0.9, 0]} rotation={[0.04, 0, -0.05]} castShadow>
          <cylinderGeometry args={[0.075, 0.125, 1.85, 10]} />
          <meshStandardMaterial color="#3b2d23" roughness={0.92} metalness={0.02} />
        </mesh>
        <mesh position={[-0.14, 1.25, 0.08]} rotation={[0.25, 0.2, 0.42]} castShadow>
          <cylinderGeometry args={[0.04, 0.068, 1.1, 8]} />
          <meshStandardMaterial color="#3b2d23" roughness={0.92} metalness={0.02} />
        </mesh>
        <mesh position={[0.16, 1.35, -0.06]} rotation={[-0.22, -0.1, -0.38]} castShadow>
          <cylinderGeometry args={[0.038, 0.064, 1.05, 8]} />
          <meshStandardMaterial color="#3b2d23" roughness={0.92} metalness={0.02} />
        </mesh>

        {/* Layered Organic Foliage Crown */}
        <group ref={canopyRef} position={[0, 2.05, 0]}>
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <icosahedronGeometry args={[0.78, 2]} />
            <meshStandardMaterial color="#1f3a29" roughness={0.86} metalness={0.04} />
          </mesh>
          <mesh position={[-0.45, -0.05, 0.22]} castShadow receiveShadow>
            <icosahedronGeometry args={[0.56, 2]} />
            <meshStandardMaterial color="#254430" roughness={0.84} metalness={0.04} />
          </mesh>
          <mesh position={[0.48, 0.02, -0.18]} castShadow receiveShadow>
            <icosahedronGeometry args={[0.58, 2]} />
            <meshStandardMaterial color="#1a3323" roughness={0.88} metalness={0.04} />
          </mesh>
          <mesh position={[0.08, 0.56, 0.16]} castShadow receiveShadow>
            <icosahedronGeometry args={[0.52, 2]} />
            <meshStandardMaterial color="#2a4d36" roughness={0.82} metalness={0.04} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Architectural Walkway Bollard Light with Louvred Warm Diffuser & Floor Glow
 */
function PathBollard({
  position,
  glowTexture,
}: {
  position: [number, number, number];
  glowTexture: THREE.Texture;
}) {
  return (
    <group position={position}>
      {/* Ground anchor flange */}
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.11, 0.12, 0.04, 16]} />
        <meshStandardMaterial color="#111827" metalness={0.82} roughness={0.32} />
      </mesh>
      {/* Bollard body */}
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.072, 0.078, 0.66, 16]} />
        <meshStandardMaterial color="#161f30" metalness={0.78} roughness={0.34} />
      </mesh>
      {/* Warm louvred glass light core */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.14, 16]} />
        <meshStandardMaterial
          color="#FEF3C7"
          emissive="#F59E0B"
          emissiveIntensity={2.1}
          roughness={0.2}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 0.81, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
        <meshStandardMaterial color="#111827" metalness={0.85} roughness={0.28} />
      </mesh>
      {/* Ground warm pool */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial
          map={glowTexture}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Classical Twin-Globe Architectural Plaza Street Lamp
 */
function PlazaStreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Cast-iron pedestal base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.24, 0.5, 14]} />
        <meshStandardMaterial color="#0f1522" metalness={0.82} roughness={0.36} />
      </mesh>
      {/* Tapered pole */}
      <mesh position={[0, 2.35, 0]} castShadow>
        <cylinderGeometry args={[0.048, 0.09, 3.8, 12]} />
        <meshStandardMaterial color="#111827" metalness={0.84} roughness={0.3} />
      </mesh>
      {/* Brass decorative cross-bar */}
      <mesh position={[0, 4.15, 0]} castShadow>
        <boxGeometry args={[0.82, 0.05, 0.05]} />
        <meshStandardMaterial color="#c99335" metalness={0.9} roughness={0.22} />
      </mesh>
      {/* Dual Frosted Lantern Globes */}
      {[-0.36, 0.36].map((gx) => (
        <group key={gx} position={[gx, 4.35, 0]}>
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.07, 0.04, 0.08, 12]} />
            <meshStandardMaterial color="#0f1522" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial
              color="#FFFBEB"
              emissive="#FBBF24"
              emissiveIntensity={2.0}
              roughness={0.18}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MarqueeCrest() {
  const vGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.56, 0.62);
    shape.lineTo(-0.29, 0.62);
    shape.lineTo(0, -0.18);
    shape.lineTo(0.29, 0.62);
    shape.lineTo(0.56, 0.62);
    shape.lineTo(0.13, -0.56);
    shape.lineTo(-0.13, -0.56);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.032,
      bevelSize: 0.028,
      bevelSegments: 3,
    });
    geo.center();
    return geo;
  }, []);

  useEffect(() => () => vGeo.dispose(), [vGeo]);

  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.14}>
      <group position={[0, 5.72, -1.62]}>
        <mesh geometry={vGeo} castShadow>
          <meshPhysicalMaterial
            color="#F59E0B"
            metalness={0.95}
            roughness={0.16}
            clearcoat={0.9}
            emissive="#78350f"
            emissiveIntensity={0.38}
          />
        </mesh>
        <mesh rotation={[0.08, 0, 0]}>
          <torusGeometry args={[0.88, 0.022, 14, 56]} />
          <meshStandardMaterial
            color="#FBBF24"
            metalness={0.94}
            roughness={0.14}
            emissive="#F59E0B"
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>
    </Float>
  );
}

export function EventCenterEntranceScene({
  controlRef,
  isSoftwareGl,
  isMobile,
}: {
  controlRef: React.MutableRefObject<SceneControlState>;
  isSoftwareGl: boolean;
  isMobile: boolean;
}) {
  const { camera } = useThree();
  const leftDoorRef = useRef<THREE.Group | null>(null);
  const rightDoorRef = useRef<THREE.Group | null>(null);
  const beamLeftRef = useRef<THREE.Mesh | null>(null);
  const beamRightRef = useRef<THREE.Mesh | null>(null);
  const foyerLightRef = useRef<THREE.PointLight | null>(null);

  // Procedural Real-Life Architectural PBR Texture Sets
  const plazaStone = useMemo(() => createPlazaStoneTextures(10), []);
  const darkMarble = useMemo(() => createMarbleTextures('#141a28', 'rgba(235, 195, 118, 0.22)', 2, 2), []);
  const foyerMarble = useMemo(() => createMarbleTextures('#221c18', 'rgba(251, 191, 36, 0.34)', 3, 2), []);
  const carpetTex = useMemo(() => createCarpetTextures(3), []);
  const curtainWallTex = useMemo(() => createCurtainWallTexture(), []);
  const marqueeSignTex = useMemo(() => createMarqueeSignTexture(), []);
  const skylineTex = useMemo(() => createCitySkylineTexture(), []);
  const warmFloorPoolTex = useMemo(
    () => createRadialGlowTexture('rgba(245, 158, 11, 0.52)', 'rgba(245, 158, 11, 0)'),
    [],
  );

  // Volumetric skyward beam alpha texture
  const beamTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 256, 0, 0);
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
      grad.addColorStop(0.5, 'rgba(148, 163, 255, 0.08)');
      grad.addColorStop(1, 'rgba(11, 15, 25, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 256);
    }
    return new THREE.CanvasTexture(c);
  }, []);

  useEffect(() => {
    return () => {
      plazaStone.dispose();
      darkMarble.dispose();
      foyerMarble.dispose();
      carpetTex.dispose();
      curtainWallTex.dispose();
      marqueeSignTex.dispose();
      skylineTex.dispose();
      warmFloorPoolTex.dispose();
      beamTexture.dispose();
    };
  }, [
    plazaStone,
    darkMarble,
    foyerMarble,
    carpetTex,
    curtainWallTex,
    marqueeSignTex,
    skylineTex,
    warmFloorPoolTex,
    beamTexture,
  ]);

  useFrame((state, delta) => {
    const st = controlRef.current;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // 1. Animate Double Entrance Doors swinging open smoothly
    const targetDoorOpen = Math.min(
      1,
      Math.max(st.doorsOpenFactor, st.scrollNorm * 0.95, st.modalPush * 1.0),
    );
    const desiredAngle = targetDoorOpen * (Math.PI * 0.44);
    if (leftDoorRef.current && rightDoorRef.current) {
      leftDoorRef.current.rotation.y = THREE.MathUtils.damp(
        leftDoorRef.current.rotation.y,
        -desiredAngle,
        4.2,
        dt,
      );
      rightDoorRef.current.rotation.y = THREE.MathUtils.damp(
        rightDoorRef.current.rotation.y,
        desiredAngle,
        4.2,
        dt,
      );
    }

    // 2. Warm Foyer Interior Light intensifies as doors open
    if (foyerLightRef.current) {
      const targetIntensity = 8 + targetDoorOpen * 12;
      foyerLightRef.current.intensity = THREE.MathUtils.damp(
        foyerLightRef.current.intensity,
        targetIntensity,
        4,
        dt,
      );
    }

    // 3. Gentle Skyward Venue Searchlights Sweep
    if (!st.reducedMotion && beamLeftRef.current && beamRightRef.current) {
      beamLeftRef.current.rotation.z = 0.22 + Math.sin(t * 0.35) * 0.1;
      beamRightRef.current.rotation.z = -0.22 - Math.sin(t * 0.35 + 1.1) * 0.1;
    }

    // 4. Camera Parallax + Scroll Walk-In Toward the Grand Entrance
    const px = st.reducedMotion ? 0 : st.pointerX * 0.65;
    const py = st.reducedMotion ? 0 : st.pointerY * 0.22;
    const targetZ = 9.8 - st.scrollNorm * 4.0 - st.modalPush * 2.8;
    const targetY = 2.05 - py - st.scrollNorm * 0.15;
    const targetX = px;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4.5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4.2, dt);
    _lookTarget.set(px * 0.2, 2.25, -3.5);
    camera.lookAt(_lookTarget);
  });

  return (
    <>
      <color attach="background" args={['#090e1a']} />
      <fogExp2 attach="fog" args={['#090e1a', 0.028]} />

      {/* Procedural Studio & Twilight Sky Reflections (zero external HDRI 404s) */}
      <Environment resolution={128}>
        <Lightformer
          form="rect"
          intensity={1.8}
          color="#7ea1d9"
          position={[0, 12, 8]}
          scale={[24, 6, 1]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#F59E0B"
          position={[0, 6, 3]}
          scale={[10, 2, 1]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.3}
          color="#6366f1"
          position={[-10, 4, 2]}
          scale={[8, 4, 1]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#FBBF24"
          position={[10, 4, 2]}
          scale={[8, 4, 1]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </Environment>

      {/* Balanced Real-Life Twilight + Warm Architectural Lighting Rig */}
      <hemisphereLight args={['#5d7bb0', '#120e12', 0.58]} />

      {/* Moonlight / City Key Light with Soft Ground Shadows */}
      <directionalLight
        position={[9, 13, 10]}
        intensity={1.35}
        color="#dbeafe"
        castShadow={!isSoftwareGl}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={36}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      {/* Warm Portico Downwash Spotlight */}
      <spotLight
        position={[0, 7.2, 4.5]}
        angle={0.58}
        penumbra={0.75}
        intensity={22}
        color="#FDE68A"
        distance={24}
        castShadow={!isSoftwareGl}
        shadow-bias={-0.0004}
      />

      {/* Warm Interior Lobby Light spilling out through the Open Doors */}
      <pointLight
        ref={foyerLightRef}
        position={[0, 2.9, -4.4]}
        intensity={11}
        distance={16}
        decay={1.6}
        color="#FBBF24"
      />

      {/* Subtle Warm Plaza Street Lamp Fill Lights */}
      <pointLight position={[-6.4, 4.2, 5.2]} intensity={3.2} distance={10} color="#FDE68A" />
      <pointLight position={[6.4, 4.2, 5.2]} intensity={3.2} distance={10} color="#FDE68A" />

      {/* ==================================================================== */}
      {/* DISTANT REAL-LIFE CITY SKYLINE HORIZON                               */}
      {/* ==================================================================== */}
      <mesh position={[0, 5.5, -24]}>
        <planeGeometry args={[76, 13]} />
        <meshBasicMaterial map={skylineTex} transparent opacity={0.88} depthWrite={false} />
      </mesh>

      {/* ==================================================================== */}
      {/* ARCHITECTURAL EVENT CENTRE FACADE & GRAND PORTAL                     */}
      {/* ==================================================================== */}
      <group position={[0, 0, -2.6]}>
        {/* Main Veined Marble Architectural Wings */}
        <mesh position={[-5.4, 3.7, -0.35]} castShadow receiveShadow>
          <boxGeometry args={[6.8, 7.4, 0.75]} />
          <meshStandardMaterial
            map={darkMarble.map}
            roughnessMap={darkMarble.roughnessMap}
            bumpMap={darkMarble.bumpMap}
            bumpScale={0.015}
            roughness={0.45}
            metalness={0.22}
          />
        </mesh>
        <mesh position={[5.4, 3.7, -0.35]} castShadow receiveShadow>
          <boxGeometry args={[6.8, 7.4, 0.75]} />
          <meshStandardMaterial
            map={darkMarble.map}
            roughnessMap={darkMarble.roughnessMap}
            bumpMap={darkMarble.bumpMap}
            bumpScale={0.015}
            roughness={0.45}
            metalness={0.22}
          />
        </mesh>

        {/* Horizontal Bronze Architectural Belt Courses & Cornice */}
        <mesh position={[0, 7.48, -0.15]} castShadow>
          <boxGeometry args={[17.8, 0.24, 1.15]} />
          <meshStandardMaterial color="#1e2536" metalness={0.65} roughness={0.32} />
        </mesh>
        <mesh position={[0, 7.34, 0.43]}>
          <boxGeometry args={[17.8, 0.04, 0.04]} />
          <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.85} />
        </mesh>

        {/* Upper Architrave Header above Portal */}
        <mesh position={[0, 5.65, -0.22]} castShadow receiveShadow>
          <boxGeometry args={[4.6, 3.7, 0.9]} />
          <meshStandardMaterial
            map={darkMarble.map}
            roughnessMap={darkMarble.roughnessMap}
            roughness={0.38}
            metalness={0.32}
          />
        </mesh>

        {/* Vertical Stone Pilasters Framing the Curtain-Wall Windows */}
        {[-6.8, -5.25, -3.75, 3.75, 5.25, 6.8].map((px) => (
          <mesh key={px} position={[px, 3.7, 0.06]} castShadow receiveShadow>
            <boxGeometry args={[0.32, 7.4, 0.16]} />
            <meshStandardMaterial color="#161d2c" roughness={0.42} metalness={0.35} />
          </mesh>
        ))}

        {/* Deep Recessed Architectural Curtain-Wall Glass Bays */}
        {[-6.0, -4.5, -3.0, 3.0, 4.5, 6.0].map((bx) => (
          <group key={bx} position={[bx, 3.1, 0.03]}>
            <mesh>
              <planeGeometry args={[1.18, 4.9]} />
              <meshPhysicalMaterial
                map={curtainWallTex}
                emissiveMap={curtainWallTex}
                emissive="#FBBF24"
                emissiveIntensity={0.42}
                roughness={0.1}
                metalness={0.18}
                clearcoat={1.0}
                clearcoatRoughness={0.08}
              />
            </mesh>
            {/* Horizontal Bronze Mullion Bars */}
            {[-1.2, 0.1, 1.35].map((my) => (
              <mesh key={my} position={[0, my, 0.025]} castShadow>
                <boxGeometry args={[1.22, 0.06, 0.05]} />
                <meshStandardMaterial color="#a67c33" metalness={0.9} roughness={0.22} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Monumental Fluted Marble & Brass Entry Columns with Base Uplights */}
        {[-2.3, 2.3].map((cx) => (
          <group key={cx} position={[cx, 0, 0.4]}>
            {/* Stepped Granite Plinth */}
            <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.74, 0.44, 0.74]} />
              <meshStandardMaterial color="#182030" metalness={0.35} roughness={0.45} />
            </mesh>
            {/* Marble Column Shaft */}
            <mesh position={[0, 2.28, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.25, 0.28, 3.68, 24]} />
              <meshStandardMaterial
                map={darkMarble.map}
                roughnessMap={darkMarble.roughnessMap}
                bumpMap={darkMarble.bumpMap}
                bumpScale={0.01}
                metalness={0.28}
                roughness={0.28}
              />
            </mesh>
            {/* Brass Base & Capital Collars */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.12, 24]} />
              <meshStandardMaterial color="#d49a33" metalness={0.93} roughness={0.2} />
            </mesh>
            <mesh position={[0, 4.05, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.28, 0.16, 24]} />
              <meshStandardMaterial color="#d49a33" metalness={0.93} roughness={0.2} />
            </mesh>
            {/* Column Base Uplight Canister */}
            <mesh position={[0, 0.45, 0.34]}>
              <cylinderGeometry args={[0.06, 0.07, 0.04, 14]} />
              <meshStandardMaterial color="#FEF3C7" emissive="#F59E0B" emissiveIntensity={1.8} />
            </mesh>
          </group>
        ))}

        {/* Cantilevered Coffered Luxury Canopy + Illuminated VENUZA Fascia */}
        <group position={[0, 4.22, 1.38]}>
          {/* Main Steel & Bronze Canopy Slab */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[6.6, 0.32, 2.9]} />
            <meshStandardMaterial color="#121826" metalness={0.78} roughness={0.24} />
          </mesh>
          {/* Warm Brushed Bronze Coffered Soffit Ceiling Underneath */}
          <mesh position={[0, -0.165, 0]}>
            <boxGeometry args={[6.2, 0.02, 2.55]} />
            <meshStandardMaterial color="#3b2b1a" metalness={0.65} roughness={0.38} />
          </mesh>
          {/* Illuminated Front Channel-Letter "VENUZA" Sign */}
          <mesh position={[0, 0.52, 1.38]}>
            <planeGeometry args={[4.4, 1.1]} />
            <meshBasicMaterial map={marqueeSignTex} transparent depthWrite={false} />
          </mesh>
          {/* Electric Gold Rim Accent */}
          <mesh position={[0, 0, 1.46]}>
            <boxGeometry args={[6.62, 0.05, 0.03]} />
            <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={1.45} />
          </mesh>
          {/* Recessed Warm Soffit Downlight Cans */}
          {[-2.2, -1.1, 0, 1.1, 2.2].map((lx) => (
            <mesh key={lx} position={[lx, -0.18, 0.55]}>
              <cylinderGeometry args={[0.11, 0.11, 0.02, 16]} />
              <meshStandardMaterial color="#FEF3C7" emissive="#F59E0B" emissiveIntensity={2.1} />
            </mesh>
          ))}
        </group>

        {/* Sculpted Brushed-Gold "V" Architectural Marquee Crest above Sign */}
        <MarqueeCrest />

        {/* ================================================================== */}
        {/* REAL-LIFE GRAND INTERIOR LOBBY FOYER VISIBLE THROUGH DOORS         */}
        {/* ================================================================== */}
        <group position={[0, 0, -2.4]}>
          {/* Warm Acoustic Wood-Paneled Rear Foyer Wall */}
          <mesh position={[0, 2.6, -2.0]} receiveShadow>
            <planeGeometry args={[7.0, 5.2]} />
            <meshStandardMaterial
              color="#3a2515"
              emissive="#8a4b08"
              emissiveIntensity={0.32}
              roughness={0.55}
            />
          </mesh>
          {/* Interior Lobby Columns */}
          {[-2.1, 2.1].map((ix) => (
            <mesh key={ix} position={[ix, 2.5, -1.2]}>
              <cylinderGeometry args={[0.2, 0.22, 5.0, 18]} />
              <meshStandardMaterial
                map={foyerMarble.map}
                roughnessMap={foyerMarble.roughnessMap}
                roughness={0.24}
                metalness={0.25}
              />
            </mesh>
          ))}
          {/* Concierge Reception Desk */}
          <group position={[0, 0.26, -1.2]}>
            <mesh position={[0, 0.52, 0]}>
              <boxGeometry args={[2.2, 1.04, 0.65]} />
              <meshStandardMaterial
                map={foyerMarble.map}
                roughnessMap={foyerMarble.roughnessMap}
                roughness={0.22}
                metalness={0.3}
              />
            </mesh>
            <mesh position={[0, 1.06, 0]}>
              <boxGeometry args={[2.3, 0.05, 0.72]} />
              <meshStandardMaterial color="#d49a33" metalness={0.92} roughness={0.18} />
            </mesh>
          </group>
          {/* Multi-Tiered Golden Halo Chandelier */}
          <group position={[0, 3.65, -0.35]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.18, 0.036, 12, 48]} />
              <meshStandardMaterial color="#FEF3C7" emissive="#F59E0B" emissiveIntensity={2.2} />
            </mesh>
            <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.72, 0.028, 12, 40]} />
              <meshStandardMaterial color="#FEF3C7" emissive="#FBBF24" emissiveIntensity={2.0} />
            </mesh>
          </group>
          {/* Veined Warm Foyer Marble Floor */}
          <mesh position={[0, 0.26, -0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[7.0, 4.4]} />
            <meshStandardMaterial
              map={foyerMarble.map}
              roughnessMap={foyerMarble.roughnessMap}
              roughness={0.18}
              metalness={0.35}
            />
          </mesh>
        </group>

        {/* Glass Transom Above the Double Doors */}
        <group position={[0, 4.02, 0.05]}>
          <mesh>
            <boxGeometry args={[3.35, 0.44, 0.06]} />
            <meshPhysicalMaterial
              color="#1e293b"
              transparent
              opacity={0.48}
              roughness={0.08}
              clearcoat={1}
            />
          </mesh>
          <mesh position={[0, -0.23, 0]}>
            <boxGeometry args={[3.42, 0.06, 0.1]} />
            <meshStandardMaterial color="#c99335" metalness={0.92} roughness={0.2} />
          </mesh>
        </group>

        {/* Left Swinging Bronze & Glass Door */}
        <group ref={leftDoorRef} position={[-1.65, 0.28, 0.05]}>
          <group position={[0.81, 1.75, 0]}>
            <mesh>
              <boxGeometry args={[1.58, 3.46, 0.06]} />
              <meshPhysicalMaterial
                color="#1f2937"
                transparent
                opacity={0.38}
                roughness={0.06}
                metalness={0.2}
                clearcoat={1.0}
              />
            </mesh>
            {/* Top, Bottom Kickplate & Side Bronze Stiles */}
            <mesh position={[0, 1.71, 0]}>
              <boxGeometry args={[1.62, 0.08, 0.09]} />
              <meshStandardMaterial color="#c99335" metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[0, -1.66, 0]}>
              <boxGeometry args={[1.62, 0.2, 0.09]} />
              <meshStandardMaterial color="#b98324" metalness={0.92} roughness={0.22} />
            </mesh>
            <mesh position={[-0.78, 0, 0]}>
              <boxGeometry args={[0.07, 3.48, 0.09]} />
              <meshStandardMaterial color="#c99335" metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[0.78, 0, 0]}>
              <boxGeometry args={[0.06, 3.48, 0.09]} />
              <meshStandardMaterial color="#c99335" metalness={0.92} roughness={0.2} />
            </mesh>
            {/* Architectural H-Bar Pull Handle */}
            <mesh position={[0.62, 0, 0.09]}>
              <cylinderGeometry args={[0.024, 0.024, 1.38, 12]} />
              <meshStandardMaterial color="#FBBF24" metalness={0.96} roughness={0.12} />
            </mesh>
          </group>
        </group>

        {/* Right Swinging Bronze & Glass Door */}
        <group ref={rightDoorRef} position={[1.65, 0.28, 0.05]}>
          <group position={[-0.81, 1.75, 0]}>
            <mesh>
              <boxGeometry args={[1.58, 3.46, 0.06]} />
              <meshPhysicalMaterial
                color="#1f2937"
                transparent
                opacity={0.38}
                roughness={0.06}
                metalness={0.2}
                clearcoat={1.0}
              />
            </mesh>
            <mesh position={[0, 1.71, 0]}>
              <boxGeometry args={[1.62, 0.08, 0.09]} />
              <meshStandardMaterial color="#c99335" metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[0, -1.66, 0]}>
              <boxGeometry args={[1.62, 0.2, 0.09]} />
              <meshStandardMaterial color="#b98324" metalness={0.92} roughness={0.22} />
            </mesh>
            <mesh position={[-0.78, 0, 0]}>
              <boxGeometry args={[0.06, 3.48, 0.09]} />
              <meshStandardMaterial color="#c99335" metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[0.78, 0, 0]}>
              <boxGeometry args={[0.07, 3.48, 0.09]} />
              <meshStandardMaterial color="#c99335" metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[-0.62, 0, 0.09]}>
              <cylinderGeometry args={[0.024, 0.024, 1.38, 12]} />
              <meshStandardMaterial color="#FBBF24" metalness={0.96} roughness={0.12} />
            </mesh>
          </group>
        </group>

        {/* Stepped Granite Arrival Plinths with Warm Under-Tread LED Strips */}
        {[
          { y: 0.05, z: 1.5, w: 6.4, d: 3.15 },
          { y: 0.14, z: 1.08, w: 5.5, d: 2.32 },
          { y: 0.23, z: 0.66, w: 4.65, d: 1.52 },
        ].map((step, i) => (
          <group key={i} position={[0, step.y, step.z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[step.w, 0.09, step.d]} />
              <meshStandardMaterial
                map={darkMarble.map}
                roughnessMap={darkMarble.roughnessMap}
                roughness={0.42}
                metalness={0.25}
              />
            </mesh>
            <mesh position={[0, -0.02, step.d / 2 + 0.005]}>
              <boxGeometry args={[step.w, 0.018, 0.01]} />
              <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={1.45} />
            </mesh>
          </group>
        ))}

        {/* Woven Gold-Bordered Ceremonial Arrival Carpet Runner */}
        <mesh position={[0, 0.022, 5.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.35, 6.4]} />
          <meshStandardMaterial
            map={carpetTex.map}
            roughnessMap={carpetTex.roughnessMap}
            bumpMap={carpetTex.bumpMap}
            bumpScale={0.012}
            roughness={0.9}
          />
        </mesh>
        <mesh position={[0, 0.285, 0.7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.35, 1.8]} />
          <meshStandardMaterial
            map={carpetTex.map}
            roughnessMap={carpetTex.roughnessMap}
            bumpMap={carpetTex.bumpMap}
            bumpScale={0.012}
            roughness={0.9}
          />
        </mesh>

        {/* Brass Stanchion Bollards & Velvet Ropes */}
        <StanchionRopePair zPos={2.7} />
        <StanchionRopePair zPos={4.7} />

        {/* Real-Life Landscaped Stone Planters with Swaying Ornamental Trees */}
        <OrnamentalPlanterTree
          position={[-4.55, 0, 1.9]}
          seedOffset={0.4}
          reducedMotion={controlRef.current.reducedMotion}
        />
        <OrnamentalPlanterTree
          position={[4.55, 0, 1.9]}
          seedOffset={2.1}
          reducedMotion={controlRef.current.reducedMotion}
        />
        <OrnamentalPlanterTree
          position={[-7.6, 0, 4.6]}
          seedOffset={3.7}
          reducedMotion={controlRef.current.reducedMotion}
        />
        <OrnamentalPlanterTree
          position={[7.6, 0, 4.6]}
          seedOffset={5.0}
          reducedMotion={controlRef.current.reducedMotion}
        />

        {/* Real-Life Architectural Path Bollards */}
        {[-2.85, 2.85].map((bx) =>
          [2.0, 4.3, 6.6].map((bz) => (
            <PathBollard
              key={`${bx}-${bz}`}
              position={[bx, 0, bz]}
              glowTexture={warmFloorPoolTex}
            />
          )),
        )}

        {/* Classical Twin-Globe Plaza Street Lamps */}
        <PlazaStreetLamp position={[-6.4, 0, 7.2]} />
        <PlazaStreetLamp position={[6.4, 0, 7.2]} />
      </group>

      {/* Subtle Skyward Architectural Venue Searchlights */}
      <mesh ref={beamLeftRef} position={[-5.2, 4.8, -5.8]} rotation={[0, 0, 0.22]}>
        <cylinderGeometry args={[1.5, 0.25, 15, 24, 1, true]} />
        <meshBasicMaterial
          map={beamTexture}
          transparent
          opacity={0.48}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={beamRightRef} position={[5.2, 4.8, -5.8]} rotation={[0, 0, -0.22]}>
        <cylinderGeometry args={[1.5, 0.25, 15, 24, 1, true]} />
        <meshBasicMaterial
          map={beamTexture}
          transparent
          opacity={0.48}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Granite Arrival Curb & Damp Valet Driveway */}
      <mesh position={[0, 0.035, 6.2]} receiveShadow>
        <boxGeometry args={[42, 0.07, 0.28]} />
        <meshStandardMaterial color="#1f2737" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.015, 10.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[52, 8.6]} />
        <meshStandardMaterial color="#0b0f17" roughness={0.42} metalness={0.35} />
      </mesh>

      {/* Wet-Stone Ashlar Arrival Plaza Forecourt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4.5]} receiveShadow>
        <planeGeometry args={[48, 22]} />
        {isSoftwareGl ? (
          <meshStandardMaterial
            map={plazaStone.map}
            roughnessMap={plazaStone.roughnessMap}
            bumpMap={plazaStone.bumpMap}
            bumpScale={0.02}
            metalness={0.35}
            roughness={0.55}
          />
        ) : (
          <MeshReflectorMaterial
            map={plazaStone.map}
            roughnessMap={plazaStone.roughnessMap}
            bumpMap={plazaStone.bumpMap}
            bumpScale={0.02}
            blur={[220, 70]}
            resolution={512}
            mixBlur={0.9}
            mixStrength={18}
            roughness={0.55}
            depthScale={0.8}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#d8e0ef"
            metalness={0.38}
            mirror={0.32}
          />
        )}
      </mesh>

      {/* Subtle Warm Evening Light-Catching Dust Motes */}
      {!controlRef.current.reducedMotion && (
        <Sparkles
          count={isMobile ? 28 : 55}
          scale={[14, 6, 12]}
          size={isMobile ? 1.8 : 1.5}
          speed={0.22}
          opacity={0.45}
          color="#FDE68A"
          position={[0, 2.8, 1.5]}
        />
      )}
    </>
  );
}
