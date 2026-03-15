import type { PresetName } from '../hooks/useTextureLoader'
import type { FilterMode, ViewMode, SceneType } from '../stores/viewStore'

export interface CameraTarget {
  theta?: number
  phi?: number
  dist?: number
  targetX?: number
  targetY?: number
  targetZ?: number
}

export interface MagnifyRegion {
  x: number // source center X (0-1 normalized)
  y: number // source center Y (0-1 normalized)
  zoom: number // magnification factor
  targetX: number // inset center X (0-1 normalized)
  targetY: number // inset center Y (0-1 normalized)
  radius: number // inset display radius (0-1 normalized to canvas width)
  rect?: { w: number; h: number } // if set, use rectangle instead of circle (0-1 normalized to canvas width)
  rectAnchor?: 'top' // if 'top', targetY is the top edge instead of center
}

export interface DemoStep {
  duration: number // ms
  texture?: PresetName
  filterMode?: FilterMode
  viewMode?: ViewMode
  sceneType?: SceneType
  camera?: CameraTarget
  caption: string
  centerCard?: string // large centered text overlay (title cards, section cards, end cards)
  fullPage?: boolean // capture full app UI instead of just the canvas
  highlight?: string // CSS selector of element to highlight with a pulsing glow
  magnify?: MagnifyRegion[] // magnifying glass insets
}

// Default camera for flat plane view
const PLANE_CAM: CameraTarget = { theta: 0, phi: 0.3, dist: 3, targetX: 0, targetY: 0, targetZ: 0 }
// Camera swept to the right
const PLANE_CAM_RIGHT: CameraTarget = { theta: 1.2, phi: 0.3, dist: 3, targetX: 0, targetY: 0, targetZ: 0 }
// Camera swept to the left
const PLANE_CAM_LEFT: CameraTarget = { theta: -1.2, phi: 0.3, dist: 3, targetX: 0, targetY: 0, targetZ: 0 }
// Camera zoomed in close (mip levels demo)
const PLANE_CAM_CLOSE: CameraTarget = { theta: 0, phi: 0.4, dist: 1.2, targetX: 0, targetY: 0, targetZ: 0 }
// Camera zoomed out far (mip levels demo)
const PLANE_CAM_FAR: CameraTarget = { theta: 0, phi: 0.25, dist: 6, targetX: 0, targetY: 0, targetZ: 0 }
// Mip levels orbit
const MIP_CAM_RIGHT: CameraTarget = { theta: 1.0, phi: 0.3, dist: 3, targetX: 0, targetY: 0, targetZ: 0 }
const MIP_CAM_LEFT: CameraTarget = { theta: -1.0, phi: 0.3, dist: 3, targetX: 0, targetY: 0, targetZ: 0 }
// 3D scene initial
const SCENE_CAM: CameraTarget = { theta: 0.3, phi: 0.45, dist: 6, targetX: 0, targetY: 1, targetZ: -3 }
// 3D scene orbited
const SCENE_CAM_ORBIT: CameraTarget = { theta: 1.8, phi: 0.35, dist: 5, targetX: 0, targetY: 1, targetZ: -3 }

const MAGNIFY_REGIONS: MagnifyRegion[] = [
  { x: 0.12, y: 0.22, zoom: 4, targetX: 0.15, targetY: 0.55, radius: 0.09 },
  { x: 0.42, y: 0.24, zoom: 4, targetX: 0.50, targetY: 0.55, radius: 0.09 },
]

export const DEMO_SCRIPT: DemoStep[] = [
  // ========== TITLE CARD ==========
  {
    duration: 3500,
    texture: 'checker',
    filterMode: 'point',
    sceneType: 'plane',
    viewMode: 'textured',
    camera: PLANE_CAM,
    caption: '',
    centerCard: 'Mipmap Explorer\nRon Wang, Megan Ja\nAn interactive tool for understanding texture filtering',
  },

  // ========== SECTION: Filter Mode Comparison ==========
  {
    duration: 3000,
    texture: 'checker',
    filterMode: 'point',
    sceneType: 'plane',
    viewMode: 'textured',
    camera: PLANE_CAM,
    caption: '',
    centerCard: 'Compare filter modes side-by-side\nPoint, Bilinear, Trilinear, and Anisotropic',
  },
  {
    duration: 3500,
    filterMode: 'point',
    caption: 'Point Sampling\nNearest texel only — heavy aliasing at distance',
    magnify: MAGNIFY_REGIONS,
  },
  {
    duration: 3500,
    filterMode: 'bilinear',
    caption: 'Bilinear Filtering\nInterpolates 4 nearest texels — still aliases at distance',
    magnify: MAGNIFY_REGIONS,
  },
  {
    duration: 3500,
    filterMode: 'trilinear',
    caption: 'Trilinear Filtering\nBlends between mip levels for smooth transitions',
    magnify: MAGNIFY_REGIONS,
  },
  {
    duration: 3500,
    filterMode: 'anisotropic',
    caption: 'Anisotropic Filtering\nSamples along stretch axis — sharp at oblique angles',
    magnify: MAGNIFY_REGIONS,
  },

  // --- Checker Fine: same comparison, higher frequency ---
  {
    duration: 3000,
    caption: '',
    centerCard: 'Now with a finer pattern\nHigher frequency makes the differences much clearer',
  },
  {
    duration: 3000,
    texture: 'checker_fine',
    filterMode: 'point',
    caption: 'Fine Checker + Point\nHigh-frequency pattern creates severe Moire artifacts',
    magnify: MAGNIFY_REGIONS,
  },
  {
    duration: 3000,
    filterMode: 'bilinear',
    caption: 'Fine Checker + Bilinear\nStill cannot handle the high-frequency pattern',
    magnify: MAGNIFY_REGIONS,
  },
  {
    duration: 3000,
    filterMode: 'trilinear',
    caption: 'Fine Checker + Trilinear\nResolves aliasing with mip blending, but overblurs',
    magnify: MAGNIFY_REGIONS,
  },
  {
    duration: 3000,
    filterMode: 'anisotropic',
    caption: 'Fine Checker + Anisotropic\nPreserves detail along the viewing direction',
    magnify: MAGNIFY_REGIONS,
  },

  // ========== SECTION: Real-Time Interaction ==========
  {
    duration: 3000,
    texture: 'checker',
    filterMode: 'trilinear',
    viewMode: 'levels',
    camera: PLANE_CAM,
    caption: '',
    centerCard: 'See Mipmap Levels in real time\nZoom and orbit to watch levels change',
  },
  // Zoom in/out
  {
    duration: 1500,
    camera: PLANE_CAM_CLOSE,
    caption: 'Mip Levels — Zoomed In\nClose up: mostly Level 0 (red) — full resolution',
    magnify: [
      { x: 0.5, y: 0.18, zoom: 2, targetX: 0.80, targetY: 0.0, radius: 0.12, rect: { w: 0.40, h: 0.45 }, rectAnchor: 'top' as const },
    ],
  },
  {
    duration: 2500,
    camera: PLANE_CAM_FAR,
    caption: 'Mip Levels — Zooming Out\nWatch the color bands shift as distance increases',
    magnify: [
      { x: 0.5, y: 0.18, zoom: 2, targetX: 0.80, targetY: 0.0, radius: 0.12, rect: { w: 0.40, h: 0.45 }, rectAnchor: 'top' as const },
    ],
  },
  {
    duration: 2000,
    camera: PLANE_CAM_CLOSE,
    caption: 'Mip Levels — Zooming Back In\nLevels cascade back to red as we get closer',
    magnify: [
      { x: 0.5, y: 0.18, zoom: 2, targetX: 0.80, targetY: 0.0, radius: 0.12, rect: { w: 0.40, h: 0.45 }, rectAnchor: 'top' as const },
    ],
  },
  // Horizontal sweep
  {
    duration: 1500,
    camera: PLANE_CAM,
    caption: 'Mip Levels — Orbiting\nLevel boundaries shift with viewing angle',
    magnify: [
      { x: 0.5, y: 0.18, zoom: 2, targetX: 0.80, targetY: 0.0, radius: 0.12, rect: { w: 0.40, h: 0.45 }, rectAnchor: 'top' as const },
    ],
  },
  {
    duration: 2500,
    camera: MIP_CAM_RIGHT,
    caption: 'Mip Levels — Orbiting\nLevel boundaries shift with viewing angle',
    magnify: [
      { x: 0.5, y: 0.18, zoom: 2, targetX: 0.80, targetY: 0.0, radius: 0.12, rect: { w: 0.40, h: 0.45 }, rectAnchor: 'top' as const },
    ],
  },
  {
    duration: 2500,
    camera: MIP_CAM_LEFT,
    caption: 'Mip Levels — Orbiting\nLevel boundaries shift with viewing angle',
    magnify: [
      { x: 0.5, y: 0.18, zoom: 2, targetX: 0.80, targetY: 0.0, radius: 0.12, rect: { w: 0.40, h: 0.45 }, rectAnchor: 'top' as const },
    ],
  },
  {
    duration: 1500,
    camera: PLANE_CAM,
    caption: 'Mip Levels — Default View',
  },

  // --- Texture showcase ---
  {
    duration: 3000,
    texture: 'uv_grid',
    filterMode: 'trilinear',
    viewMode: 'textured',
    camera: PLANE_CAM,
    caption: '',
    centerCard: 'Fully customizable textures\nChoose from built-in presets or upload your own',
  },
  {
    duration: 2000,
    texture: 'uv_grid',
    camera: PLANE_CAM,
    filterMode: 'point',
    caption: 'UV Grid',
  },
  {
    duration: 2000,
    texture: 'fabric',
    filterMode: 'point',
    caption: 'Fabric',
  },
  {
    duration: 2000,
    texture: 'tiny_4x4',
    filterMode: 'point',
    caption: '4x4',
  },

  // ========== SECTION: Mip Level Visualization ==========
  {
    duration: 3000,
    texture: 'checker',
    filterMode: 'trilinear',
    sceneType: '3d',
    viewMode: 'textured',
    camera: SCENE_CAM,
    caption: '',
    centerCard: 'Visualize 3D scenes',
  },
  {
    duration: 3000,
    caption: 'Included 3D Scene\nMultiple objects at varying distances from the camera',
  },
  {
    duration: 4000,
    camera: SCENE_CAM_ORBIT,
    caption: 'Move the camera around the scene',
  },
  {
    duration: 4000,
    viewMode: 'levels',
    camera: SCENE_CAM,
    caption: 'View Real-Time Mip Levels',
  },

  // ========== SECTION: Interactive Showcase ==========
  {
    duration: 3000,
    sceneType: 'plane',
    texture: 'checker',
    filterMode: 'trilinear',
    viewMode: 'textured',
    camera: PLANE_CAM,
    caption: '',
    centerCard: 'Works in the browser\nInteractive & no install required',
  },
  {
    duration: 3000,
    fullPage: true,
    highlight: '[data-demo="filter-group"]',
    caption: 'Filter Modes\nSwitch between point, bilinear, trilinear, and anisotropic',
  },
  {
    duration: 3000,
    fullPage: true,
    highlight: '[data-demo="texture-bar"]',
    caption: 'Textures\nChoose from presets or upload your own image',
  },
  {
    duration: 3000,
    fullPage: true,
    highlight: '[data-demo="scene-group"]',
    caption: 'Scene Toggle\nSwitch between a flat plane and a full 3D scene',
  },

  // ========== END CARD ==========
  {
    duration: 3500,
    fullPage: true,
    caption: '',
    centerCard: 'Try it yourself!\nvisual-compute.github.io/mipmap\nPlease consider starring us on GitHub!',
  },
]

export function getTotalDuration(): number {
  return DEMO_SCRIPT.reduce((sum, step) => sum + step.duration, 0)
}
