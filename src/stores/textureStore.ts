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
  setActiveTexture: (texture: ImageData, name: string) => void
  setMipmapPyramid: (pyramid: MipmapLevel[]) => void
}

export const useTextureStore = create<TextureState>((set) => ({
  activeTexture: null,
  mipmapPyramid: [],
  sourceName: 'checkerboard',
  setActiveTexture: (texture, name) => set({ activeTexture: texture, sourceName: name }),
  setMipmapPyramid: (pyramid) => set({ mipmapPyramid: pyramid }),
}))
