import { create } from 'zustand'

export type ViewMode = 'textured' | 'levels'
export type SceneType = 'plane' | '3d'

interface ViewState {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  sceneType: SceneType
  setSceneType: (s: SceneType) => void
  cameraAngle: number         // radians, 0.3=oblique, 1.4=top-down
  setCameraAngle: (a: number) => void
  hoveredLevel: number | null // which mip level is hovered in pyramid
  setHoveredLevel: (l: number | null) => void
  cursorMipLevel: number | null // mip level at cursor position on 3D view
  setCursorMipLevel: (l: number | null) => void
}

export const useViewStore = create<ViewState>((set) => ({
  viewMode: 'levels',
  setViewMode: (m) => set({ viewMode: m }),
  sceneType: 'plane',
  setSceneType: (s) => set({ sceneType: s }),
  cameraAngle: 0.55,
  setCameraAngle: (a) => set({ cameraAngle: a }),
  hoveredLevel: null,
  setHoveredLevel: (l) => set({ hoveredLevel: l }),
  cursorMipLevel: null,
  setCursorMipLevel: (l) => set({ cursorMipLevel: l }),
}))
