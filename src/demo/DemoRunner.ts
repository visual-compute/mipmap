import { DEMO_SCRIPT, getTotalDuration } from './demoScript'
import type { DemoStep } from './demoScript'
import type { TexturedPlaneScene } from '../three/TexturedPlaneScene'
import type { PresetName } from '../hooks/useTextureLoader'
import { useViewStore } from '../stores/viewStore'

interface OrbitState {
  theta: number
  phi: number
  dist: number
  targetX: number
  targetY: number
  targetZ: number
}

export interface DemoState {
  playing: boolean
  caption: string
  progress: number // 0-1
  stepIndex: number
  highlight?: string // CSS selector of element to highlight
  fullPage?: boolean // hide overlay UI during screen capture
}

type StateCallback = (state: DemoState) => void

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export class DemoRunner {
  private scene: TexturedPlaneScene
  private loadPreset: (name: PresetName) => void
  private threeCanvas: HTMLCanvasElement
  private onState: StateCallback

  private compositeCanvas: HTMLCanvasElement
  private compositeCtx: CanvasRenderingContext2D
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private rafId = 0
  private stepIndex = 0
  private stepStartTime = 0
  private startTime = 0
  private orbitStart: OrbitState = { theta: 0, phi: 0.3, dist: 3, targetX: 0, targetY: 0, targetZ: 0 }
  private totalDuration = getTotalDuration()
  private stopped = false
  // Delay after texture switch to let React effects propagate
  private textureDelay = 0
  private readonly TEXTURE_DELAY_MS = 200
  // Screen capture for fullPage steps
  private displayStream: MediaStream | null = null
  private displayVideo: HTMLVideoElement | null = null
  // Audio
  private audioFile: File | null = null
  private audioCtx: AudioContext | null = null
  private audioSource: AudioBufferSourceNode | null = null

  constructor(
    scene: TexturedPlaneScene,
    loadPreset: (name: PresetName) => void,
    threeCanvas: HTMLCanvasElement,
    onState: StateCallback,
  ) {
    this.scene = scene
    this.loadPreset = loadPreset
    this.threeCanvas = threeCanvas
    this.onState = onState

    // Create composite canvas at the same resolution
    this.compositeCanvas = document.createElement('canvas')
    this.compositeCanvas.width = threeCanvas.width
    this.compositeCanvas.height = threeCanvas.height
    this.compositeCtx = this.compositeCanvas.getContext('2d')!
  }

  setAudioFile(file: File | null) {
    this.audioFile = file
  }

  async start() {
    this.stopped = false
    this.stepIndex = 0
    this.chunks = []

    // Ensure IBM Plex Mono is loaded before first frame
    await document.fonts.load('700 48px "IBM Plex Mono"')
    await document.fonts.load('400 24px "IBM Plex Mono"')
    await document.fonts.load('800 48px "IBM Plex Mono"')
    await document.fonts.load('600 24px "IBM Plex Mono"')

    // Check if any step needs fullPage capture
    const needsDisplay = DEMO_SCRIPT.some(s => s.fullPage)
    if (needsDisplay) {
      try {
        this.displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' } as MediaTrackConstraints,
          audio: false,
          // @ts-expect-error -- preferCurrentTab is a newer API, not yet in all TS types
          preferCurrentTab: true,
        })
        // Set up a video element to grab frames from the stream
        this.displayVideo = document.createElement('video')
        this.displayVideo.srcObject = this.displayStream
        this.displayVideo.muted = true
        await this.displayVideo.play()
      } catch {
        // User cancelled the picker — proceed without fullPage capture
        this.displayStream = null
        this.displayVideo = null
      }
    }

    // Disable user input
    this.scene.disableInput()

    // Set up recording — merge video + optional audio
    const videoStream = this.compositeCanvas.captureStream(60)
    let combinedStream: MediaStream

    if (this.audioFile) {
      try {
        this.audioCtx = new AudioContext()
        const arrayBuffer = await this.audioFile.arrayBuffer()
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer)
        const dest = this.audioCtx.createMediaStreamDestination()
        const source = this.audioCtx.createBufferSource()
        source.buffer = audioBuffer
        source.loop = true // loop if shorter than demo
        source.connect(dest)
        source.start(0)
        this.audioSource = source

        // Combine video + audio tracks
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ])
      } catch {
        // If audio decoding fails, proceed without audio
        combinedStream = videoStream
      }
    } else {
      combinedStream = videoStream
    }

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    let mimeType = ''
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) {
        mimeType = mt
        break
      }
    }

    this.recorder = new MediaRecorder(combinedStream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 8_000_000,
    })
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.onstop = () => this.downloadVideo()
    this.recorder.start(100) // collect data every 100ms

    // Apply first step
    this.applyStep(DEMO_SCRIPT[0])
    this.startTime = performance.now()
    this.stepStartTime = this.startTime
    this.snapshotOrbit()

    this.emitState()
    this.rafId = requestAnimationFrame((t) => this.tick(t))
  }

  stop() {
    this.stopped = true
    cancelAnimationFrame(this.rafId)
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop()
    }
    // Clean up audio
    if (this.audioSource) {
      try { this.audioSource.stop() } catch { /* already stopped */ }
      this.audioSource = null
    }
    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
    }
    // Clean up screen capture
    if (this.displayStream) {
      this.displayStream.getTracks().forEach(t => t.stop())
      this.displayStream = null
    }
    if (this.displayVideo) {
      this.displayVideo.pause()
      this.displayVideo.srcObject = null
      this.displayVideo = null
    }
    this.scene.enableInput()
    this.onState({ playing: false, caption: '', progress: 1, stepIndex: 0, highlight: undefined })
  }

  private tick(timestamp: number) {
    if (this.stopped) return

    const step = DEMO_SCRIPT[this.stepIndex]
    const elapsed = timestamp - this.stepStartTime

    // Handle texture delay
    if (this.textureDelay > 0) {
      this.textureDelay -= (timestamp - (this.startTime + this.getElapsedUpToStep(this.stepIndex)))
      if (this.textureDelay > 0) {
        // Still waiting — just composite current frame
        this.composite(step)
        this.rafId = requestAnimationFrame((t) => this.tick(t))
        return
      }
    }

    // Animate camera
    if (step.camera) {
      const t = smoothstep(Math.min(elapsed / step.duration, 1))
      const target = step.camera
      this.scene.setOrbitState({
        theta: lerp(this.orbitStart.theta, target.theta ?? this.orbitStart.theta, t),
        phi: lerp(this.orbitStart.phi, target.phi ?? this.orbitStart.phi, t),
        dist: lerp(this.orbitStart.dist, target.dist ?? this.orbitStart.dist, t),
        targetX: lerp(this.orbitStart.targetX, target.targetX ?? this.orbitStart.targetX, t),
        targetY: lerp(this.orbitStart.targetY, target.targetY ?? this.orbitStart.targetY, t),
        targetZ: lerp(this.orbitStart.targetZ, target.targetZ ?? this.orbitStart.targetZ, t),
      })
    }

    // Composite frame
    this.composite(step)

    // Check if step is done
    if (elapsed >= step.duration) {
      this.stepIndex++
      if (this.stepIndex >= DEMO_SCRIPT.length) {
        this.stop()
        return
      }
      this.stepStartTime = timestamp
      this.snapshotOrbit()
      this.applyStep(DEMO_SCRIPT[this.stepIndex])
      this.emitState()
    }

    // Update progress
    const totalElapsed = timestamp - this.startTime
    this.onState({
      playing: true,
      caption: step.caption,
      progress: Math.min(totalElapsed / this.totalDuration, 1),
      stepIndex: this.stepIndex,
      highlight: step.highlight,
      fullPage: step.fullPage,
    })

    this.rafId = requestAnimationFrame((t) => this.tick(t))
  }

  private applyStep(step: DemoStep) {
    const store = useViewStore.getState()

    if (step.texture) {
      this.loadPreset(step.texture)
      this.textureDelay = this.TEXTURE_DELAY_MS
    }
    if (step.filterMode) {
      store.setFilterMode(step.filterMode)
    }
    if (step.viewMode) {
      store.setViewMode(step.viewMode)
    }
    if (step.sceneType) {
      store.setSceneType(step.sceneType)
    }
  }

  private snapshotOrbit() {
    const state = this.scene.getOrbitState()
    this.orbitStart = {
      theta: state.theta,
      phi: state.phi,
      dist: state.dist,
      targetX: state.target.x,
      targetY: state.target.y,
      targetZ: state.target.z,
    }
  }

  private composite(step: DemoStep) {
    const ctx = this.compositeCtx

    // Full-page capture from screen share
    if (step.fullPage && this.displayVideo && this.displayVideo.readyState >= 2) {
      const vw = this.displayVideo.videoWidth
      const vh = this.displayVideo.videoHeight
      if (vw > 0 && vh > 0) {
        if (this.compositeCanvas.width !== vw || this.compositeCanvas.height !== vh) {
          this.compositeCanvas.width = vw
          this.compositeCanvas.height = vh
        }
        ctx.drawImage(this.displayVideo, 0, 0, vw, vh)

        // Draw highlight box on the video frame
        if (step.highlight) {
          const el = document.querySelector(step.highlight)
          if (el) {
            const rect = el.getBoundingClientRect()
            // Scale from CSS pixels to video pixels
            const scaleX = vw / window.innerWidth
            const scaleY = vh / window.innerHeight
            const pad = 6 * scaleX
            const x = rect.left * scaleX - pad
            const y = rect.top * scaleY - pad
            const w = rect.width * scaleX + pad * 2
            const h = rect.height * scaleY + pad * 2

            ctx.save()
            ctx.strokeStyle = '#FF3E3E'
            ctx.lineWidth = 3 * scaleX
            ctx.shadowColor = 'rgba(255, 62, 62, 0.6)'
            ctx.shadowBlur = 16 * scaleX
            ctx.strokeRect(x, y, w, h)
            ctx.strokeRect(x, y, w, h) // double stroke for stronger glow
            ctx.restore()

            // Red arrow pointing to the highlighted element
            const arrowLen = 60 * scaleX
            const arrowSize = 12 * scaleX
            const cx = x + w / 2
            // If element is in the top third, arrow points up from below; otherwise down from above
            const pointUp = y < vh / 3

            ctx.save()
            ctx.strokeStyle = '#FF3E3E'
            ctx.fillStyle = '#FF3E3E'
            ctx.lineWidth = 3 * scaleX
            ctx.shadowColor = 'rgba(255, 62, 62, 0.6)'
            ctx.shadowBlur = 8 * scaleX

            if (pointUp) {
              const arrowTipY = y + h + 8 * scaleY
              const arrowStartY = arrowTipY + arrowLen
              ctx.beginPath()
              ctx.moveTo(cx, arrowStartY)
              ctx.lineTo(cx, arrowTipY)
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(cx, arrowTipY)
              ctx.lineTo(cx - arrowSize, arrowTipY + arrowSize * 1.5)
              ctx.lineTo(cx + arrowSize, arrowTipY + arrowSize * 1.5)
              ctx.closePath()
              ctx.fill()
            } else {
              const arrowTipY = y - 8 * scaleY
              const arrowStartY = arrowTipY - arrowLen
              ctx.beginPath()
              ctx.moveTo(cx, arrowStartY)
              ctx.lineTo(cx, arrowTipY)
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(cx, arrowTipY)
              ctx.lineTo(cx - arrowSize, arrowTipY - arrowSize * 1.5)
              ctx.lineTo(cx + arrowSize, arrowTipY - arrowSize * 1.5)
              ctx.closePath()
              ctx.fill()
            }
            ctx.restore()
          }
        }

        this.drawOverlayText(step)
        return
      }
    }

    // Default: draw Three.js canvas
    if (this.compositeCanvas.width !== this.threeCanvas.width || this.compositeCanvas.height !== this.threeCanvas.height) {
      this.compositeCanvas.width = this.threeCanvas.width
      this.compositeCanvas.height = this.threeCanvas.height
    }
    ctx.drawImage(this.threeCanvas, 0, 0)

    if (step.magnify) this.drawMagnify(step)
    this.drawOverlayText(step)
  }

  private drawMagnify(step: DemoStep) {
    if (!step.magnify) return
    const ctx = this.compositeCtx
    const w = this.compositeCanvas.width
    const h = this.compositeCanvas.height

    for (const m of step.magnify) {
      const tx = m.targetX * w
      const ty = m.targetY * h
      const sx = m.x * w
      const sy = m.y * h
      const isRect = !!m.rect

      if (isRect) {
        const rw = m.rect!.w * w
        const rh = m.rect!.h * h
        const srcW = rw / m.zoom
        const srcH = rh / m.zoom
        // rectAnchor: 'top' means targetY is the top edge; otherwise it's center
        const boxLeft = tx - rw / 2
        const boxTop = m.rectAnchor === 'top' ? ty : ty - rh / 2

        // Dashed line from source to inset center
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(boxLeft + rw / 2, boxTop + rh / 2)
        ctx.stroke()
        ctx.setLineDash([])

        // Source rectangle indicator
        ctx.strokeStyle = '#FF3E3E'
        ctx.lineWidth = 2
        ctx.strokeRect(sx - srcW / 2, sy - srcH / 2, srcW, srcH)

        // Clip to rectangle
        ctx.beginPath()
        ctx.rect(boxLeft, boxTop, rw, rh)
        ctx.clip()

        // Draw magnified region
        ctx.drawImage(
          this.threeCanvas,
          sx - srcW / 2, sy - srcH / 2, srcW, srcH,
          boxLeft, boxTop, rw, rh,
        )
        ctx.restore()

        // Border
        ctx.strokeStyle = '#FF3E3E'
        ctx.lineWidth = 3
        ctx.strokeRect(boxLeft, boxTop, rw, rh)

        // Label
        const labelSize = Math.round(rh * 0.08)
        ctx.font = `700 ${labelSize}px "IBM Plex Mono", monospace`
        ctx.fillStyle = '#FF3E3E'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`${m.zoom}×`, boxLeft + rw / 2, boxTop + rh + 6)
      } else {
        const r = m.radius * w
        const sampleR = r / m.zoom

        // Dashed line from source to inset
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(tx, ty)
        ctx.stroke()
        ctx.setLineDash([])

        // Source circle indicator
        ctx.beginPath()
        ctx.arc(sx, sy, sampleR, 0, Math.PI * 2)
        ctx.strokeStyle = '#FF3E3E'
        ctx.lineWidth = 2
        ctx.stroke()

        // Clip to circle
        ctx.beginPath()
        ctx.arc(tx, ty, r, 0, Math.PI * 2)
        ctx.clip()

        // Draw magnified region
        ctx.drawImage(
          this.threeCanvas,
          sx - sampleR, sy - sampleR, sampleR * 2, sampleR * 2,
          tx - r, ty - r, r * 2, r * 2,
        )
        ctx.restore()

        // Border ring
        ctx.beginPath()
        ctx.arc(tx, ty, r, 0, Math.PI * 2)
        ctx.strokeStyle = '#FF3E3E'
        ctx.lineWidth = 3
        ctx.stroke()

        // Label
        ctx.font = `700 ${Math.round(r * 0.22)}px "IBM Plex Mono", monospace`
        ctx.fillStyle = '#FF3E3E'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`${m.zoom}×`, tx, ty + r + 6)
      }
    }
  }

  private drawOverlayText(step: DemoStep) {
    const ctx = this.compositeCtx
    const w = this.compositeCanvas.width
    const h = this.compositeCanvas.height

    // Center card (title/end cards)
    if (step.centerCard) {
      // Dim overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, 0, w, h)

      const lines = step.centerCard.split('\n')
      const titleSize = Math.round(Math.max(28, w / 25))
      const subSize = Math.round(titleSize * 0.55)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // First line — big title
      ctx.font = `800 ${titleSize}px "IBM Plex Mono", monospace`
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(lines[0], w / 2, h / 2 - (lines.length > 1 ? titleSize * 0.7 : 0))

      // Subsequent lines
      if (lines.length > 1) {
        const smallSize = Math.round(subSize * 0.75)
        let yOffset = h / 2 + titleSize * 0.3
        for (let i = 1; i < lines.length; i++) {
          if (i === 1) {
            ctx.font = `600 ${subSize}px "IBM Plex Mono", monospace`
            ctx.fillStyle = '#FFFFFF'
          } else {
            ctx.font = `400 ${smallSize}px "IBM Plex Mono", monospace`
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
          }
          ctx.fillText(lines[i], w / 2, yOffset)
          yOffset += (i === 1 ? subSize : smallSize) * 1.6
        }
      }
      return
    }

    // Caption bar
    if (step.caption) {
      const lines = step.caption.split('\n')
      const titleSize = Math.round(Math.max(18, w / 50))
      const descSize = Math.round(titleSize * 0.75)
      const hasDesc = lines.length > 1
      const padding = titleSize * 0.8
      const barHeight = titleSize + (hasDesc ? descSize + padding * 0.3 : 0) + padding * 2
      // For fullPage steps, shift caption up so it doesn't cover bottom controls
      const bottomOffset = step.fullPage ? Math.round(h * 0.07) : 0
      const barY = h - barHeight - bottomOffset

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
      ctx.fillRect(0, barY, w, barHeight)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(0, barY, w, 1)

      ctx.textAlign = 'center'

      // Title line
      const titleY = hasDesc
        ? barY + barHeight / 2 - descSize * 0.35
        : barY + barHeight / 2
      ctx.font = `700 ${titleSize}px "IBM Plex Mono", monospace`
      ctx.fillStyle = '#FFFFFF'
      ctx.textBaseline = 'middle'
      ctx.fillText(lines[0], w / 2, titleY)

      // Description line
      if (hasDesc) {
        ctx.font = `400 ${descSize}px "IBM Plex Mono", monospace`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
        ctx.fillText(lines[1], w / 2, titleY + titleSize * 0.9)
      }
    }
  }

  private downloadVideo() {
    const blob = new Blob(this.chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mipmap-explorer-demo.webm'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  private getElapsedUpToStep(stepIndex: number): number {
    let elapsed = 0
    for (let i = 0; i < stepIndex; i++) {
      elapsed += DEMO_SCRIPT[i].duration
    }
    return elapsed
  }

  private emitState() {
    const step = DEMO_SCRIPT[this.stepIndex]
    this.onState({
      playing: true,
      caption: step?.caption ?? '',
      progress: this.getElapsedUpToStep(this.stepIndex) / this.totalDuration,
      stepIndex: this.stepIndex,
      highlight: step?.highlight,
      fullPage: step?.fullPage,
    })
  }
}
