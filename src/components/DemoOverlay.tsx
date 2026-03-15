import { useEffect, useState } from 'react'

interface DemoOverlayProps {
  playing: boolean
  caption: string
  progress: number
  highlight?: string // CSS selector
  fullPage?: boolean // hide overlay UI during screen capture
  audioFile: File | null
  onAudioFileChange: (file: File | null) => void
  onStart: () => void
  onStop: () => void
}

export function DemoOverlay({ playing, caption, progress, highlight, fullPage, audioFile, onAudioFileChange, onStart, onStop }: DemoOverlayProps) {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!playing || !highlight) {
      setHighlightRect(null)
      return
    }
    const el = document.querySelector(highlight)
    if (!el) {
      setHighlightRect(null)
      return
    }
    const update = () => {
      setHighlightRect(el.getBoundingClientRect())
    }
    update()
    const id = setInterval(update, 200)
    return () => clearInterval(id)
  }, [playing, highlight])

  if (!playing) {
    return (
      <div className="absolute bottom-4 right-4 flex items-center gap-2" style={{ zIndex: 20 }}>
        <label
          className="px-3 py-2 text-xs font-bold uppercase cursor-pointer transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{
            border: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
            background: audioFile ? '#111' : '#FFF',
            color: audioFile ? '#FFF' : '#111',
          }}
        >
          {audioFile ? `♪ ${audioFile.name.slice(0, 12)}` : '♪ ADD MUSIC'}
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => onAudioFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          onClick={onStart}
          className="px-4 py-2 text-xs font-bold uppercase transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{
            border: 'var(--border)',
            boxShadow: 'var(--shadow-sm)',
            background: '#FF3E3E',
            color: '#FFF',
          }}
        >
          RECORD DEMO
        </button>
      </div>
    )
  }

  // During fullPage capture, hide all overlay UI to avoid duplicates
  // (the composite canvas already draws captions/highlights on the video)
  if (fullPage) {
    return (
      <style>{`
        @keyframes pulse-rec {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    )
  }

  return (
    <>
      {/* REC indicator */}
      <div
        className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase"
        style={{
          border: 'var(--border)',
          background: '#111',
          color: '#FF3E3E',
          zIndex: 20,
        }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: '#FF3E3E',
            animation: 'pulse-rec 1s ease-in-out infinite',
          }}
        />
        REC
        <button
          onClick={onStop}
          className="ml-3 px-2 py-0.5 text-[10px]"
          style={{
            border: '1px solid #FF3E3E',
            background: 'transparent',
            color: '#FF3E3E',
          }}
        >
          STOP
        </button>
      </div>

      {/* Highlight glow over target element */}
      {highlightRect && (
        <div
          className="pointer-events-none"
          data-demo-highlight
          style={{
            position: 'fixed',
            left: highlightRect.left - 6,
            top: highlightRect.top - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            border: '3px solid #FF3E3E',
            borderRadius: 4,
            boxShadow: '0 0 12px 4px rgba(255, 62, 62, 0.5)',
            animation: 'highlight-pulse 1.2s ease-in-out infinite',
            zIndex: 9999,
          }}
        />
      )}

      {/* Caption bar */}
      {caption && (() => {
        const lines = caption.split('\n')
        return (
          <div
            className="absolute bottom-0 left-0 right-0 text-center pointer-events-none"
            style={{
              padding: '12px 24px',
              background: 'rgba(0, 0, 0, 0.75)',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              fontFamily: '"IBM Plex Mono", monospace',
              zIndex: 20,
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>
              {lines[0]}
            </div>
            {lines[1] && (
              <div style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>
                {lines[1]}
              </div>
            )}
          </div>
        )
      })()}

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[3px]"
        style={{
          width: `${progress * 100}%`,
          background: '#FF3E3E',
          zIndex: 21,
          transition: 'width 0.1s linear',
        }}
      />

      {/* Animations */}
      <style>{`
        @keyframes pulse-rec {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes highlight-pulse {
          0%, 100% { box-shadow: 0 0 12px 4px rgba(255, 62, 62, 0.5); }
          50% { box-shadow: 0 0 20px 8px rgba(255, 62, 62, 0.8); }
        }
      `}</style>
    </>
  )
}
