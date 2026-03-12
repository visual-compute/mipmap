import * as THREE from 'three'
import { createDataTexture, createSamplingMaterial } from './ShaderMaterialFactory'
import type { SamplingMode } from './ShaderMaterialFactory'
import type { MipmapLevel } from '../stores/textureStore'

// Infinite grid shader — fades into the background at distance
const gridVertexShader = `
varying vec3 vWorldPos;
void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
`
const gridFragmentShader = `
varying vec3 vWorldPos;
uniform vec3 u_bgColor;

void main() {
  vec2 coord = vWorldPos.xz;
  // Two grid scales
  vec2 grid1 = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
  float line1 = min(grid1.x, grid1.y);
  vec2 grid2 = abs(fract(coord * 0.25 - 0.5) - 0.5) / fwidth(coord * 0.25);
  float line2 = min(grid2.x, grid2.y);

  float d = length(vWorldPos.xz) * 0.08;
  float fade = 1.0 - smoothstep(0.0, 1.0, d);

  float a1 = (1.0 - min(line1, 1.0)) * 0.15 * fade;
  float a2 = (1.0 - min(line2, 1.0)) * 0.08 * fade;
  float a = max(a1, a2);

  vec3 lineColor = vec3(0.0);
  gl_FragColor = vec4(mix(u_bgColor, lineColor, a), 1.0);
}
`

const BG_COLOR = new THREE.Color(0xFAFAF5)

export class TexturedPlaneScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  plane: THREE.Mesh
  material: THREE.ShaderMaterial
  private mipmapTextures: THREE.DataTexture[] = []
  private animationId: number = 0
  private currentOptions: Record<string, unknown> = {}
  private sceneMeshes: THREE.Mesh[] = []
  private sceneEdges: THREE.LineSegments[] = []
  private planeEdge: THREE.LineSegments | null = null
  private currentSceneType: 'plane' | '3d' = 'plane'
  private currentFilterMode: 'point' | 'bilinear' | 'trilinear' = 'trilinear'
  private pointMaterial: THREE.ShaderMaterial | null = null
  private bilinearMaterial: THREE.ShaderMaterial | null = null

  // Orbit state
  private orbitTheta = 0
  private orbitPhi = 0.3
  private orbitDist = 3
  private orbitTarget = new THREE.Vector3(0, 0, 0)
  private isDragging = false
  private isPanning = false
  private lastMouseX = 0
  private lastMouseY = 0
  private mouseCleanup?: () => void
  private keys: Set<string> = new Set()
  private keyCleanup?: () => void

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.scene = new THREE.Scene()
    this.scene.background = BG_COLOR.clone()

    // Fog — fades distant geometry into the background
    this.scene.fog = new THREE.Fog(BG_COLOR, 8, 25)

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    this.applyOrbit()

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    // --- Infinite grid floor ---
    const gridGeo = new THREE.PlaneGeometry(80, 80, 1, 1)
    const gridMat = new THREE.ShaderMaterial({
      vertexShader: gridVertexShader,
      fragmentShader: gridFragmentShader,
      uniforms: {
        u_bgColor: { value: new THREE.Vector3(BG_COLOR.r, BG_COLOR.g, BG_COLOR.b) },
      },
      depthWrite: false,
    })
    const gridMesh = new THREE.Mesh(gridGeo, gridMat)
    gridMesh.rotation.x = -Math.PI / 2
    gridMesh.position.y = -0.002 // just below the textured plane
    this.scene.add(gridMesh)

    // --- Textured plane (the subject) ---
    const geo = new THREE.PlaneGeometry(8, 8, 1, 1)
    this.material = new THREE.ShaderMaterial()
    this.plane = new THREE.Mesh(geo, this.material)
    this.plane.rotation.x = -Math.PI / 2
    this.plane.position.y = 0
    this.plane.position.z = -2
    this.scene.add(this.plane)

    // Thin border around the textured plane
    const edgeGeo = new THREE.EdgesGeometry(geo)
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 1 })
    const edges = new THREE.LineSegments(edgeGeo, edgeMat)
    edges.rotation.x = -Math.PI / 2
    edges.position.y = 0.001
    edges.position.z = -2
    this.scene.add(edges)
    this.planeEdge = edges
  }

  enableMouseControls(canvas: HTMLCanvasElement) {
    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    const onMouseDown = (e: MouseEvent) => {
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
      if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
        this.isPanning = true
      } else if (e.button === 0) {
        this.isDragging = true
      }
      canvas.style.cursor = this.isPanning ? 'move' : 'grabbing'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging && !this.isPanning) return
      const dx = e.clientX - this.lastMouseX
      const dy = e.clientY - this.lastMouseY
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY

      if (this.isPanning) {
        const right = new THREE.Vector3()
        const up = new THREE.Vector3()
        this.camera.getWorldDirection(up)
        right.crossVectors(this.camera.up, up).normalize()
        up.copy(this.camera.up)

        const panSpeed = 0.004 * this.orbitDist
        this.orbitTarget.addScaledVector(right, dx * panSpeed)
        this.orbitTarget.addScaledVector(up, dy * panSpeed)
        this.applyOrbit()
      } else {
        this.orbitTheta -= dx * 0.004
        this.orbitPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, this.orbitPhi + dy * 0.004))
        this.applyOrbit()
      }
    }

    const onMouseUp = () => {
      this.isDragging = false
      this.isPanning = false
      canvas.style.cursor = 'crosshair'
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      this.orbitDist = Math.max(0.8, Math.min(12, this.orbitDist + e.deltaY * 0.005))
      this.applyOrbit()
    }

    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    this.mouseCleanup = () => {
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }

  private applyOrbit() {
    const x = this.orbitDist * Math.cos(this.orbitPhi) * Math.sin(this.orbitTheta)
    const y = this.orbitDist * Math.sin(this.orbitPhi)
    const z = this.orbitDist * Math.cos(this.orbitPhi) * Math.cos(this.orbitTheta)
    this.camera.position.set(
      this.orbitTarget.x + x,
      this.orbitTarget.y + y,
      this.orbitTarget.z + z
    )
    this.camera.lookAt(this.orbitTarget)
  }

  get dragging() {
    return this.isDragging || this.isPanning
  }

  updateMipmaps(levels: MipmapLevel[]) {
    this.mipmapTextures.forEach(t => t.dispose())
    this.mipmapTextures = levels.map(l => createDataTexture(l.data))
    this.rebuildFilterMaterials()
  }

  private rebuildFilterMaterials() {
    this.pointMaterial?.dispose()
    this.bilinearMaterial?.dispose()
    this.pointMaterial = createSamplingMaterial('noMip', this.mipmapTextures, {
      totalLevels: this.mipmapTextures.length,
      filterMode: 0,
    })
    this.bilinearMaterial = createSamplingMaterial('noMip', this.mipmapTextures, {
      totalLevels: this.mipmapTextures.length,
      filterMode: 1,
    })
  }

  setMode(mode: SamplingMode, options?: {
    mipLevel?: number
    showLevelColors?: boolean
    maxAniso?: number
    autoMipMode?: number
    lockedLevel?: number
  }) {
    this.currentOptions = options || {}
    this.material.dispose()
    this.material = createSamplingMaterial(mode, this.mipmapTextures, {
      ...options,
      totalLevels: this.mipmapTextures.length,
    })
    this.plane.material = this.material
    for (const mesh of this.sceneMeshes) {
      mesh.material = this.material
    }
  }

  setAutoMipMode(modeInt: number) {
    if (this.material.uniforms['u_mode']) {
      this.material.uniforms['u_mode'].value = modeInt
    }
  }

  setLockedLevel(level: number) {
    if (this.material.uniforms['u_lockedLevel']) {
      this.material.uniforms['u_lockedLevel'].value = level
    }
    if (this.material.uniforms['u_mode']) {
      this.material.uniforms['u_mode'].value = 2
    }
  }

  unlockLevel() {
    if (this.material.uniforms['u_mode']) {
      this.material.uniforms['u_mode'].value = (this.currentOptions as { autoMipMode?: number }).autoMipMode ?? 0
    }
  }

  setMipLevel(level: number) {
    if (this.material.uniforms['u_mipLevel']) {
      this.material.uniforms['u_mipLevel'].value = level
    }
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  setFilterMode(mode: 'point' | 'bilinear' | 'trilinear') {
    if (mode === this.currentFilterMode) return
    this.currentFilterMode = mode
    if (mode === 'point' && this.pointMaterial) {
      this.swapMaterial(this.pointMaterial)
    } else if (mode === 'bilinear' && this.bilinearMaterial) {
      this.swapMaterial(this.bilinearMaterial)
    } else {
      this.swapMaterial(this.material)
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  private swapMaterial(mat: THREE.ShaderMaterial) {
    this.plane.material = mat
    for (const mesh of this.sceneMeshes) {
      mesh.material = mat
    }
  }

  enableKeyboard(canvas: HTMLCanvasElement) {
    canvas.tabIndex = 0
    canvas.style.outline = 'none'

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      this.keys.add(k)
      if ('wasdqe'.includes(k)) e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase())
    }
    // Auto-focus on click so keys work immediately
    canvas.addEventListener('mousedown', () => canvas.focus())
    canvas.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('keyup', onKeyUp)

    this.keyCleanup = () => {
      canvas.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('keyup', onKeyUp)
    }
  }

  private tickKeys() {
    if (this.keys.size === 0) return
    const speed = 0.06

    // Forward/right in the camera's XZ plane
    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    const move = new THREE.Vector3()
    if (this.keys.has('w')) move.addScaledVector(forward, speed)
    if (this.keys.has('s')) move.addScaledVector(forward, -speed)
    if (this.keys.has('a')) move.addScaledVector(right, -speed)
    if (this.keys.has('d')) move.addScaledVector(right, speed)
    if (this.keys.has('e')) move.y += speed
    if (this.keys.has('q')) move.y -= speed

    if (move.lengthSq() > 0) {
      this.orbitTarget.add(move)
      this.applyOrbit()
    }
  }

  startLoop() {
    const loop = () => {
      this.animationId = requestAnimationFrame(loop)
      this.tickKeys()
      this.render()
    }
    loop()
  }

  stopLoop() {
    cancelAnimationFrame(this.animationId)
  }

  dispose() {
    this.stopLoop()
    this.mouseCleanup?.()
    this.keyCleanup?.()
    this.mipmapTextures.forEach(t => t.dispose())
    this.material.dispose()
    this.pointMaterial?.dispose()
    this.bilinearMaterial?.dispose()
    this.plane.geometry.dispose()
    this.clear3DScene()
    this.renderer.dispose()
  }

  setSceneType(type: 'plane' | '3d') {
    if (type === this.currentSceneType) return
    this.currentSceneType = type

    if (type === '3d') {
      // Hide the flat plane and its edge
      this.plane.visible = false
      if (this.planeEdge) this.planeEdge.visible = false
      this.build3DScene()
    } else {
      // Show the flat plane, remove 3D objects
      this.plane.visible = true
      if (this.planeEdge) this.planeEdge.visible = true
      this.clear3DScene()
    }
  }

  private clear3DScene() {
    for (const mesh of this.sceneMeshes) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
    }
    for (const edge of this.sceneEdges) {
      this.scene.remove(edge)
      edge.geometry.dispose()
    }
    this.sceneMeshes = []
    this.sceneEdges = []
  }

  private build3DScene() {
    this.clear3DScene()
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 1 })

    const addMesh = (geo: THREE.BufferGeometry, pos: THREE.Vector3, rot?: THREE.Euler) => {
      const mesh = new THREE.Mesh(geo, this.material)
      mesh.position.copy(pos)
      if (rot) mesh.rotation.copy(rot)
      this.scene.add(mesh)
      this.sceneMeshes.push(mesh)

      const edgeGeo = new THREE.EdgesGeometry(geo, 30)
      const edges = new THREE.LineSegments(edgeGeo, edgeMat)
      edges.position.copy(pos)
      if (rot) edges.rotation.copy(rot)
      this.scene.add(edges)
      this.sceneEdges.push(edges)
    }

    // Floor plane
    const floorGeo = new THREE.PlaneGeometry(12, 12, 1, 1)
    addMesh(floorGeo, new THREE.Vector3(0, 0, -2), new THREE.Euler(-Math.PI / 2, 0, 0))

    // Back wall
    const wallGeo = new THREE.PlaneGeometry(12, 4, 1, 1)
    addMesh(wallGeo, new THREE.Vector3(0, 2, -8), new THREE.Euler(0, 0, 0))

    // Columns — two rows of 3
    const columnGeo = new THREE.CylinderGeometry(0.25, 0.25, 4, 24, 1)
    const columnPositions = [
      [-2.5, 2, -4], [0, 2, -4], [2.5, 2, -4],
      [-2.5, 2, -6], [0, 2, -6], [2.5, 2, -6],
    ]
    for (const [x, y, z] of columnPositions) {
      addMesh(columnGeo, new THREE.Vector3(x, y, z))
    }

    // Torus knot — centerpiece
    const torusKnotGeo = new THREE.TorusKnotGeometry(0.6, 0.2, 128, 32)
    addMesh(torusKnotGeo, new THREE.Vector3(0, 1.2, -2))

    // Sphere
    const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32)
    addMesh(sphereGeo, new THREE.Vector3(-2, 0.5, -1.5))

    // Box
    const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
    addMesh(boxGeo, new THREE.Vector3(2, 0.4, -1.5))

    // Arch — torus section at the back
    const archGeo = new THREE.TorusGeometry(1.5, 0.15, 16, 32, Math.PI)
    addMesh(archGeo, new THREE.Vector3(0, 4, -8), new THREE.Euler(0, 0, 0))

    // Set camera for better initial view
    this.orbitTheta = 0.3
    this.orbitPhi = 0.45
    this.orbitDist = 6
    this.orbitTarget.set(0, 1, -3)
    this.applyOrbit()
  }

  getUVAtScreenPos(x: number, y: number, canvasWidth: number, canvasHeight: number): [number, number] | null {
    const ndc = new THREE.Vector2(
      (x / canvasWidth) * 2 - 1,
      -(y / canvasHeight) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(ndc, this.camera)
    const hits = raycaster.intersectObject(this.plane)
    if (hits.length > 0 && hits[0].uv) {
      return [hits[0].uv.x, hits[0].uv.y]
    }
    return null
  }

  estimateMipLevelAtScreen(
    x: number, y: number,
    canvasWidth: number, canvasHeight: number,
    texWidth: number
  ): number | null {
    const uv = this.getUVAtScreenPos(x, y, canvasWidth, canvasHeight)
    if (!uv) return null

    const uvR = this.getUVAtScreenPos(x + 1, y, canvasWidth, canvasHeight)
    const uvD = this.getUVAtScreenPos(x, y + 1, canvasWidth, canvasHeight)
    if (!uvR || !uvD) return null

    const dudx = (uvR[0] - uv[0]) * texWidth
    const dvdx = (uvR[1] - uv[1]) * texWidth
    const dudy = (uvD[0] - uv[0]) * texWidth
    const dvdy = (uvD[1] - uv[1]) * texWidth

    const rhoX = Math.sqrt(dudx * dudx + dvdx * dvdx)
    const rhoY = Math.sqrt(dudy * dudy + dvdy * dvdy)
    return Math.log2(Math.max(Math.max(rhoX, rhoY), 1))
  }
}
