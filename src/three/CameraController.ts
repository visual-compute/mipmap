import * as THREE from 'three'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private element: HTMLElement
  private isDragging = false
  private lastX = 0
  private lastY = 0
  private theta = 0 // horizontal angle
  private phi = Math.PI / 2 // vertical angle (from top)
  private distance: number
  private target = new THREE.Vector3(0, 0, 0)
  private onDistanceChange?: (d: number) => void

  constructor(
    camera: THREE.PerspectiveCamera,
    element: HTMLElement,
    options?: { distance?: number; onDistanceChange?: (d: number) => void }
  ) {
    this.camera = camera
    this.element = element
    this.distance = options?.distance ?? 2
    this.onDistanceChange = options?.onDistanceChange

    this.element.addEventListener('mousedown', this.onMouseDown)
    this.element.addEventListener('mousemove', this.onMouseMove)
    this.element.addEventListener('mouseup', this.onMouseUp)
    this.element.addEventListener('wheel', this.onWheel, { passive: false })

    this.updateCamera()
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true
    this.lastX = e.clientX
    this.lastY = e.clientY
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return
    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.theta -= dx * 0.005
    this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi - dy * 0.005))
    this.updateCamera()
  }

  private onMouseUp = () => {
    this.isDragging = false
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.distance = Math.max(0.5, Math.min(20, this.distance + e.deltaY * 0.005))
    this.onDistanceChange?.(this.distance)
    this.updateCamera()
  }

  setDistance(d: number) {
    this.distance = d
    this.updateCamera()
  }

  setAngles(theta: number, phi: number) {
    this.theta = theta
    this.phi = phi
    this.updateCamera()
  }

  private updateCamera() {
    const x = this.distance * Math.sin(this.phi) * Math.cos(this.theta)
    const y = this.distance * Math.cos(this.phi)
    const z = this.distance * Math.sin(this.phi) * Math.sin(this.theta)
    this.camera.position.set(x + this.target.x, y + this.target.y, z + this.target.z)
    this.camera.lookAt(this.target)
  }

  dispose() {
    this.element.removeEventListener('mousedown', this.onMouseDown)
    this.element.removeEventListener('mousemove', this.onMouseMove)
    this.element.removeEventListener('mouseup', this.onMouseUp)
    this.element.removeEventListener('wheel', this.onWheel)
  }
}
