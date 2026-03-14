import { create } from 'zustand'

export interface MipmapLevel {
  data: ImageData
  width: number
  height: number
}

interface TextureState {
  activeTexture: ImageData | null
  mipmapPyramid: MipmapLevel[]
  sourceName: string
  uvScale: number
  setActiveTexture: (texture: ImageData, name: string, uvScale?: number) => void
  setMipmapPyramid: (pyramid: MipmapLevel[]) => void
}

export const useTextureStore = create<TextureState>((set) => ({
  activeTexture: null,
  mipmapPyramid: [],
  sourceName: 'checker_fine',
  uvScale: 1,
  setActiveTexture: (texture, name, uvScale) => set({ activeTexture: texture, sourceName: name, uvScale: uvScale ?? 1 }),
  setMipmapPyramid: (pyramid) => set({ mipmapPyramid: pyramid }),
}))
