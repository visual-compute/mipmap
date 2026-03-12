import { useCallback, useRef, useState } from 'react'
import { useViewStore } from '../stores/viewStore'
import { useTextureLoader } from '../hooks/useTextureLoader'

export function Controls() {
  const { viewMode, setViewMode, sceneType, setSceneType } = useViewStore()
  const { loadFromFile } = useTextureLoader()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showHelp, setShowHelp] = useState(false)

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
      className="flex items-center gap-4 px-6 py-3"
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help button with tooltip */}
      <div className="relative">
        <button
          onMouseEnter={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
          className="w-7 h-7 text-xs font-bold flex items-center justify-center transition-transform active:translate-x-[1px] active:translate-y-[1px]"
          style={{
            border: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
            background: '#FFF',
          }}
        >
          ?
        </button>
        {showHelp && (
          <div
            className="absolute bottom-full right-0 mb-2 px-4 py-3 text-[11px] whitespace-nowrap"
            style={{
              border: 'var(--border)',
              boxShadow: 'var(--shadow)',
              background: 'var(--bg-card)',
              zIndex: 50,
            }}
          >
            <p className="font-bold mb-1.5 text-xs uppercase">Controls</p>
            <p>Drag to orbit</p>
            <p>Right-drag to pan</p>
            <p>Scroll to zoom</p>
            <p>WASD to move</p>
            <p>Q/E for up/down</p>
          </div>
        )}
      </div>
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
