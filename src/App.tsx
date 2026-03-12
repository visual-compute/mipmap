import { useEffect, useRef, useCallback } from 'react'
import { useTextureStore } from './stores/textureStore'
import { useViewStore } from './stores/viewStore'
import { useTextureLoader } from './hooks/useTextureLoader'
import { TexturedPlaneScene } from './three/TexturedPlaneScene'
import { MipmapPyramid } from './components/MipmapPyramid'
import { Controls } from './components/Controls'
import type { PresetName } from './hooks/useTextureLoader'

// Mip level colors — match shader
const LEVEL_COLORS = [
  '#FF3E3E', '#FF8C00', '#FFD600', '#00C853',
  '#00BCD4', '#2962FF', '#7C4DFF', '#FF4081',
]

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<TexturedPlaneScene | null>(null)

  const { mipmapPyramid, activeTexture } = useTextureStore()
  const { viewMode, hoveredLevel, setCursorMipLevel, sceneType, filterMode } = useViewStore()
  const { loadPreset } = useTextureLoader()

  // Boot scene
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w
    canvas.height = h

    const scene = new TexturedPlaneScene(canvas, w, h)
    sceneRef.current = scene
    scene.enableMouseControls(canvas)
    scene.enableKeyboard(canvas)
    scene.startLoop()

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          canvas.width = width
          canvas.height = height
          scene.resize(width, height)
        }
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  // Update mipmaps on texture change
  useEffect(() => {
    if (!sceneRef.current || mipmapPyramid.length === 0) return
    sceneRef.current.updateMipmaps(mipmapPyramid)
    sceneRef.current.setMode('autoMip', {
      autoMipMode: viewMode === 'levels' ? 1 : 0,
    })
  }, [mipmapPyramid])

  // Update view mode
  useEffect(() => {
    if (!sceneRef.current) return
    sceneRef.current.setAutoMipMode(viewMode === 'levels' ? 1 : 0)
  }, [viewMode])

  // Update scene type
  useEffect(() => {
    if (!sceneRef.current) return
    sceneRef.current.setSceneType(sceneType)
  }, [sceneType])

  // Filter mode
  useEffect(() => {
    if (!sceneRef.current) return
    sceneRef.current.setFilterMode(filterMode)
  }, [filterMode])

  // Hovered pyramid level → lock the 3D view
  useEffect(() => {
    if (!sceneRef.current) return
    if (hoveredLevel !== null) {
      sceneRef.current.setLockedLevel(hoveredLevel)
    } else {
      sceneRef.current.unlockLevel()
    }
  }, [hoveredLevel])

  // Mouse move on 3D view → estimate mip level
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sceneRef.current || !canvasRef.current || !activeTexture) return
    if (sceneRef.current.dragging) { setCursorMipLevel(null); return }
    const rect = canvasRef.current.getBoundingClientRect()
    const dpr = canvasRef.current.width / rect.width
    const x = (e.clientX - rect.left) * dpr
    const y = (e.clientY - rect.top) * dpr
    const level = sceneRef.current.estimateMipLevelAtScreen(
      x, y,
      canvasRef.current.width, canvasRef.current.height,
      activeTexture.width
    )
    setCursorMipLevel(level !== null ? Math.max(0, level) : null)
  }, [activeTexture, setCursorMipLevel])

  const handleCanvasMouseLeave = useCallback(() => {
    setCursorMipLevel(null)
  }, [setCursorMipLevel])

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: 'var(--border)' }}
      >
        <h1 className="text-2xl font-bold tracking-tight uppercase">Mipmap Explorer</h1>
        <PresetBar onSelect={loadPreset} />
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* 3D viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={containerRef} className="flex-1 relative min-h-0" style={{ borderRight: '1px solid #ddd', background: '#f0f0eb' }}>
            <canvas
              ref={canvasRef}
              className="block w-full h-full"
              style={{ cursor: 'crosshair' }}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
            />
            <MipLevelTooltip />
            {filterMode !== 'trilinear' && (
              <div
                className="absolute top-4 right-4 px-3 py-2 text-xs font-bold uppercase pointer-events-none"
                style={{
                  border: 'var(--border)',
                  background: filterMode === 'point' ? '#FF3E3E' : '#FF8C00',
                  color: '#FFF',
                  zIndex: 11,
                }}
              >
                {filterMode === 'point'
                  ? 'Point sampling — no filtering, no mipmaps'
                  : 'Bilinear only — no mipmaps'}
              </div>
            )}
          </div>
          <Controls />
        </div>

        {/* Mipmap pyramid sidebar */}
        <aside
          className="w-[240px] min-w-[240px] flex flex-col overflow-y-auto"
          style={{
            borderLeft: 'var(--border)',
            background: 'var(--bg-card)',
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: 'var(--border)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider">Mipmap Pyramid</h2>
          </div>
          <MipmapPyramid />
        </aside>
      </div>
    </div>
  )
}

/* ---------- Small inline components ---------- */

function PresetBar({ onSelect }: { onSelect: (name: PresetName) => void }) {
  const sourceName = useTextureStore(s => s.sourceName)
  const presets: { id: PresetName; label: string }[] = [
    { id: 'checkerboard', label: 'CHECKER' },
    { id: 'uv_grid', label: 'UV GRID' },
    { id: 'fabric', label: 'FABRIC' },
    { id: 'tiny_4x4', label: '4×4' },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase opacity-40 mr-1">Texture</span>
      {presets.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="px-3 py-1 text-xs font-bold uppercase transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{
            border: 'var(--border)',
            boxShadow: sourceName === p.id ? 'none' : 'var(--shadow-sm)',
            background: sourceName === p.id ? '#111' : '#FFF',
            color: sourceName === p.id ? '#FFF' : '#111',
            transform: sourceName === p.id ? 'translate(2px, 2px)' : 'none',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function MipLevelTooltip() {
  const cursorLevel = useViewStore(s => s.cursorMipLevel)
  if (cursorLevel === null) return null

  const level = Math.round(cursorLevel)
  const color = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)]

  return (
    <div
      className="absolute top-4 left-4 px-3 py-2 text-xs font-bold"
      style={{
        border: 'var(--border)',
        boxShadow: 'var(--shadow-sm)',
        background: color,
        color: level >= 4 && level <= 6 ? '#FFF' : '#111',
      }}
    >
      MIP LEVEL {level}
      <span className="ml-2 font-normal opacity-70">({cursorLevel.toFixed(2)})</span>
    </div>
  )
}
