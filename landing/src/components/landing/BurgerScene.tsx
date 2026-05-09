'use client'

import { useRef, useEffect, useMemo, useState, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, ContactShadows, Environment } from '@react-three/drei'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import * as THREE from 'three'

type SceneProps = {
  sectionRef?: RefObject<HTMLElement | null>
  fullBleed?: boolean
}

// ── Layer bands — Y ranges + explode offsets per ingredient ──────────────
type LayerSpec = {
  id: string
  minY: number
  maxY: number
  explodedY: number
}

const LAYERS: LayerSpec[] = [
  { id: 'bun-top', minY:  0.42, maxY:  0.95, explodedY:  1.55 },
  { id: 'sauce',   minY:  0.30, maxY:  0.42, explodedY:  1.20 },
  { id: 'lettuce', minY:  0.14, maxY:  0.30, explodedY:  0.85 },
  { id: 'tomato',  minY:  0.04, maxY:  0.14, explodedY:  0.50 },
  { id: 'onion',   minY: -0.06, maxY:  0.04, explodedY:  0.18 },
  { id: 'cheese',  minY: -0.18, maxY: -0.06, explodedY: -0.20 },
  { id: 'patty',   minY: -0.45, maxY: -0.18, explodedY: -0.70 },
  { id: 'bun-bot', minY: -0.95, maxY: -0.45, explodedY: -1.30 },
]

const MODEL_URL = '/models/burger.glb'

type GLTFLoaderLike = { setMeshoptDecoder: (d: unknown) => void }
const extendLoader = (loader: GLTFLoaderLike) => {
  loader.setMeshoptDecoder(MeshoptDecoder)
}

// Slice geometry by triangle-centroid Y, preserving position/normal/uv per vertex.
function sliceGeometryByY(
  source: THREE.BufferGeometry,
  bands: { minY: number; maxY: number }[],
): THREE.BufferGeometry[] {
  const pos = source.attributes.position as THREE.BufferAttribute
  const nor = source.attributes.normal as THREE.BufferAttribute | undefined
  const uv  = source.attributes.uv as THREE.BufferAttribute | undefined
  const idx = source.index
  const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3)

  type Bucket = { positions: number[]; normals: number[]; uvs: number[] }
  const buckets: Bucket[] = bands.map(() => ({ positions: [], normals: [], uvs: [] }))

  const px = [0, 0, 0], py = [0, 0, 0], pz = [0, 0, 0]
  const nx = [0, 0, 0], ny = [0, 0, 0], nz = [0, 0, 0]
  const uu = [0, 0, 0], vv = [0, 0, 0]

  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k
      px[k] = pos.getX(vi); py[k] = pos.getY(vi); pz[k] = pos.getZ(vi)
      if (nor) { nx[k] = nor.getX(vi); ny[k] = nor.getY(vi); nz[k] = nor.getZ(vi) }
      if (uv)  { uu[k] = uv.getX(vi);  vv[k] = uv.getY(vi) }
    }
    const cy = (py[0] + py[1] + py[2]) / 3
    let band = -1
    for (let b = 0; b < bands.length; b++) {
      if (cy >= bands[b].minY && cy < bands[b].maxY) { band = b; break }
    }
    if (band === -1) continue
    const bucket = buckets[band]
    for (let k = 0; k < 3; k++) {
      bucket.positions.push(px[k], py[k], pz[k])
      if (nor) bucket.normals.push(nx[k], ny[k], nz[k])
      if (uv)  bucket.uvs.push(uu[k], vv[k])
    }
  }

  return buckets.map(b => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3))
    if (b.normals.length) {
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3))
    } else {
      g.computeVertexNormals()
    }
    if (b.uvs.length) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2))
    }
    return g
  })
}

function readSectionProgress(section: HTMLElement | null | undefined): number {
  if (typeof window === 'undefined') return 0
  if (section) {
    const rect = section.getBoundingClientRect()
    const denom = Math.max(1, rect.height)
    const progress = Math.min(1, Math.max(0, -rect.top / denom))
    return progress
  }
  const viewportHeight = Math.max(1, window.innerHeight * 0.85)
  return Math.min(1, window.scrollY / viewportHeight)
}

function BurgerLayers({ sectionRef, fullBleed }: SceneProps) {
  const gltf = useGLTF(MODEL_URL, undefined, undefined, extendLoader)

  // Slice geometry once and grab the original PBR material (with its textures).
  const { slices, material } = useMemo(() => {
    let source: THREE.BufferGeometry | null = null
    let mat: THREE.Material | null = null
    gltf.scene.traverse(o => {
      if (!source && (o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh
        mesh.updateWorldMatrix(true, false)
        source = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
        mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      }
    })
    if (!source) return { slices: [] as THREE.BufferGeometry[], material: null as THREE.Material | null }

    // Tweak the PBR material for cinematic look without losing the baked textures.
    // Meshy's textured exports include an emissive map that washes everything to
    // white — we kill it so the baseColor reads as the real surface colour.
    if (mat) {
      const pbr = mat as THREE.MeshStandardMaterial
      pbr.emissive = new THREE.Color(0x000000)
      pbr.emissiveIntensity = 0
      pbr.emissiveMap = null
      pbr.envMapIntensity = 0.45
      pbr.side = THREE.FrontSide
      if (pbr.map) pbr.map.colorSpace = THREE.SRGBColorSpace
      pbr.needsUpdate = true
    }

    return { slices: sliceGeometryByY(source, LAYERS), material: mat }
  }, [gltf])

  const groupRef     = useRef<THREE.Group>(null)
  const layerRefs    = useRef<(THREE.Group | null)[]>(LAYERS.map(() => null))
  const targetT      = useRef(0)
  const currentT     = useRef(0)
  const elapsed      = useRef(0)
  const reduceMotion = useRef(false)
  const { camera }   = useThree()
  // Burger sits to the right on desktop (lg+), centred on mobile/tablet.
  const [offsetX, setOffsetX] = useState(0)

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const updateLayout = () => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      setOffsetX(isDesktop ? 1.35 : 0)
    }
    const onScroll = () => {
      targetT.current = readSectionProgress(sectionRef?.current)
    }
    updateLayout()
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', () => { onScroll(); updateLayout() }, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateLayout)
    }
  }, [sectionRef])

  useFrame((_, delta) => {
    elapsed.current += delta
    currentT.current = THREE.MathUtils.damp(currentT.current, targetT.current, 6, delta)
    const raw = currentT.current
    const t = 1 - Math.pow(1 - raw, 3)

    const zoomTarget = fullBleed
      ? THREE.MathUtils.lerp(3.0, 4.6, t)
      : (t > 0.05 ? 4.6 : 2.7)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, zoomTarget, 0.06)

    if (groupRef.current) {
      if (reduceMotion.current) {
        groupRef.current.rotation.y = 0
        groupRef.current.position.y = 0
      } else {
        groupRef.current.rotation.y += delta * 0.30 * Math.max(0, 1 - t * 1.4)
        groupRef.current.position.y =
          Math.sin(elapsed.current * 1.0) * 0.04 * Math.max(0, 1 - t * 2.5)
      }
    }

    layerRefs.current.forEach((grp, i) => {
      if (!grp) return
      const explosion = reduceMotion.current ? 0 : t
      const target = THREE.MathUtils.lerp(0, LAYERS[i].explodedY, explosion)
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, target, 0.10)
    })
  })

  const ref = (i: number) => (el: THREE.Group | null) => { layerRefs.current[i] = el }

  if (slices.length === 0 || !material) {
    console.warn('BurgerLayers: Failed to load model or slices')
    return null
  }

  const validSlices = LAYERS.filter((_, i) => slices[i]?.attributes.position.count > 0)
  if (validSlices.length === 0) return null

  return (
    <group ref={groupRef} scale={1.0} position={[offsetX, 0, 0]}>
      {LAYERS.map((layer, i) => {
        const geo = slices[i]
        if (!geo || geo.attributes.position.count === 0) return null
        return (
          <group key={layer.id} ref={ref(i)}>
            <mesh geometry={geo} material={material} castShadow receiveShadow />
          </group>
        )
      })}
    </group>
  )
}

useGLTF.preload(MODEL_URL, undefined, undefined, extendLoader)

function SceneLightsAndShadows({ contactX }: { contactX: number }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <>
      {/* Soft warm key */}
      <directionalLight
        position={[-2, 4.5, 3]}
        intensity={0.95}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-bias={-0.0005}
      />
      {/* Cool fill */}
      <directionalLight position={[4, 2, 2]} intensity={0.30} color="#dbeaff" />
      {/* Warm rim from back */}
      <directionalLight position={[-2, 1.2, -3]} intensity={0.45} color="#ffb070" />
      <ambientLight intensity={0.28} />

      {/* Soft, warm-toned contact shadow — lower res on mobile for performance */}
      <ContactShadows
        position={[contactX, -0.95, 0]}
        opacity={0.45}
        blur={2.4}
        far={4}
        resolution={isMobile ? 512 : 1024}
        color="#3a1a05"
      />
    </>
  )
}

export function BurgerScene({ sectionRef, fullBleed }: SceneProps) {
  // Read the same desktop breakpoint to keep shadow under the burger.
  const [contactX, setContactX] = useState(0)
  useEffect(() => {
    const update = () => {
      setContactX(window.matchMedia('(min-width: 1024px)').matches ? 1.35 : 0)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <>
      <SceneLightsAndShadows contactX={contactX} />
      <Environment files="/hdri/studio_small_03_1k.hdr" />
      <BurgerLayers sectionRef={sectionRef} fullBleed={fullBleed} />
    </>
  )
}
