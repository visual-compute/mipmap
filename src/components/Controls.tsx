import { useCallback, useRef } from 'react'
import { useViewStore } from '../stores/viewStore'
import { useTextureLoader } from '../hooks/useTextureLoader'

export function Controls() {
  const { viewMode, setViewMode, sceneType, setSceneType } = useViewStore()
  const { loadFromFile } = useTextureLoader()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFromFile(file)
  }, [loadFromFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.type.startsWith('image/png') || file.type.startsWith('image/jpeg'))) {
      loadFromFile(file)
    }
  }, [loadFromFile])

  return (
    <div
      className="flex items-center gap-6 px-6 py-3"
      style={{ borderTop: 'var(--border)', background: 'var(--bg-card)' }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Scene type toggle */}
      <div className="flex">
        <ModeButton
          active={sceneType === 'plane'}
          label="PLANE"
          onClick={() => setSceneType('plane')}
          position="left"
        />
        <ModeButton
          active={sceneType === '3d'}
          label="3D SCENE"
          onClick={() => setSceneType('3d')}
          position="right"
        />
      </div>

      {/* View mode toggle */}
      <div className="flex">
        <ModeButton
          active={viewMode === 'textured'}
          label="TEXTURED"
          onClick={() => setViewMode('textured')}
          position="left"
        />
        <ModeButton
          active={viewMode === 'levels'}
          label="MIP LEVELS"
          onClick={() => setViewMode('levels')}
          position="right"
        />
      </div>

      {/* Drag hint */}
      <span className="text-[10px] opacity-40">drag orbit · right-drag pan · scroll zoom · WASD move · QE up/down</span>

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1.5 text-xs font-bold uppercase transition-transform active:translate-x-[2px] active:translate-y-[2px]"
        style={{
          border: 'var(--border)',
          boxShadow: 'var(--shadow-sm)',
          background: '#FFF',
        }}
      >
        UPLOAD
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFile}
        className="hidden"
      />

      {/* Legend in levels mode */}
      {viewMode === 'levels' && <LevelLegend />}
    </div>
  )
}

function ModeButton({
  active,
  label,
  onClick,
  position,
}: {
  active: boolean
  label: string
  onClick: () => void
  position: 'left' | 'right'
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 text-xs font-bold uppercase transition-transform"
      style={{
        border: 'var(--border)',
        borderRight: position === 'left' ? 'none' : 'var(--border)',
        background: active ? '#111' : '#FFF',
        color: active ? '#FFF' : '#111',
        boxShadow: active ? 'none' : undefined,
        transform: active ? 'translate(1px, 1px)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

const LEGEND_COLORS = [
  '#FF3E3E', '#FF8C00', '#FFD600', '#00C853',
  '#00BCD4', '#2962FF', '#7C4DFF', '#FF4081',
]

function LevelLegend() {
  return (
    <div className="flex items-center gap-1 ml-auto">
      <span className="text-[10px] font-bold uppercase mr-1 opacity-50">Levels:</span>
      {LEGEND_COLORS.map((c, i) => (
        <div
          key={i}
          className="w-4 h-4 flex items-center justify-center text-[8px] font-bold"
          style={{
            background: c,
            border: '1.5px solid #111',
            color: i >= 4 && i <= 6 ? '#FFF' : '#111',
          }}
        >
          {i}
        </div>
      ))}
    </div>
  )
}
