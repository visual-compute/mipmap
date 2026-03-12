import { useRef, useEffect } from 'react'
import { useTextureStore } from '../stores/textureStore'
import { useViewStore } from '../stores/viewStore'

const LEVEL_COLORS = [
  '#FF3E3E', '#FF8C00', '#FFD600', '#00C853',
  '#00BCD4', '#2962FF', '#7C4DFF', '#FF4081',
]

export function MipmapPyramid() {
  const { mipmapPyramid } = useTextureStore()
  const { hoveredLevel, setHoveredLevel, cursorMipLevel } = useViewStore()

  // Which level is highlighted from hovering the 3D view?
  const activeFromCursor = cursorMipLevel !== null ? Math.round(cursorMipLevel) : null

  return (
    <div className="flex-1 p-3 space-y-2 overflow-y-auto">
      {mipmapPyramid.map((level, i) => {
        const isHoveredFromPyramid = hoveredLevel === i
        const isHighlightedFromCursor = activeFromCursor === i && hoveredLevel === null
        const color = LEVEL_COLORS[Math.min(i, LEVEL_COLORS.length - 1)]

        return (
          <div
            key={i}
            onMouseEnter={() => setHoveredLevel(i)}
            onMouseLeave={() => setHoveredLevel(null)}
            className="cursor-pointer transition-transform"
            style={{
              border: 'var(--border)',
              boxShadow: isHoveredFromPyramid
                ? 'none'
                : isHighlightedFromCursor
                  ? `0 0 0 3px ${color}`
                  : 'var(--shadow-sm)',
              background: isHoveredFromPyramid ? color : 'var(--bg-card)',
              transform: isHoveredFromPyramid ? 'translate(2px, 2px)' : 'none',
            }}
          >
            <div className="flex items-center gap-3 p-2">
              {/* Color dot */}
              <div
                className="w-4 h-4 flex-shrink-0"
                style={{
                  border: '2px solid #111',
                  background: color,
                }}
              />

              {/* Thumbnail */}
              <MipThumb data={level.data} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-bold"
                  style={{
                    color: isHoveredFromPyramid ? '#111' : '#111',
                  }}
                >
                  LEVEL {i}
                </p>
                <p
                  className="text-[10px]"
                  style={{
                    color: isHoveredFromPyramid ? '#111' : '#888',
                  }}
                >
                  {level.width}×{level.height}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MipThumb({ data }: { data: ImageData }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.width = data.width
    canvas.height = data.height
    canvas.getContext('2d')!.putImageData(data, 0, 0)
  }, [data])

  return (
    <canvas
      ref={ref}
      className="flex-shrink-0"
      style={{
        width: 36,
        height: 36,
        imageRendering: 'pixelated',
        border: '2px solid #111',
      }}
    />
  )
}
