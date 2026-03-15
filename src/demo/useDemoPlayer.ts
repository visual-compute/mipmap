import { useCallback, useRef, useState } from 'react'
import { DemoRunner } from './DemoRunner'
import type { DemoState } from './DemoRunner'
import type { TexturedPlaneScene } from '../three/TexturedPlaneScene'
import type { PresetName } from '../hooks/useTextureLoader'

export function useDemoPlayer(
  sceneRef: React.RefObject<TexturedPlaneScene | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  loadPreset: (name: PresetName) => void,
) {
  const [state, setState] = useState<DemoState>({
    playing: false,
    caption: '',
    progress: 0,
    stepIndex: 0,
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const runnerRef = useRef<DemoRunner | null>(null)

  const start = useCallback(() => {
    if (!sceneRef.current || !canvasRef.current) return
    const runner = new DemoRunner(
      sceneRef.current,
      loadPreset,
      canvasRef.current,
      (newState) => setState(newState),
    )
    runner.setAudioFile(audioFile)
    runnerRef.current = runner
    runner.start()
  }, [sceneRef, canvasRef, loadPreset, audioFile])

  const stop = useCallback(() => {
    runnerRef.current?.stop()
    runnerRef.current = null
  }, [])

  return { ...state, audioFile, setAudioFile, start, stop }
}
