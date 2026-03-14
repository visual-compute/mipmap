import { useCallback, useEffect } from 'react'
import { useTextureStore } from '../stores/textureStore'
import { generateMipmapPyramid } from '../core/mipmaps'
import { generateCheckerboard, generateUVGrid, generateTiny4x4, generateFabricTexture } from '../utils/textureGenerators'

export type PresetName = 'checker' | 'checker_fine' | 'uv_grid' | 'fabric' | 'tiny_4x4'

const presets: Record<PresetName, { generate: () => ImageData; uvScale: number }> = {
  checker: { generate: () => generateCheckerboard(512, 32), uvScale: 1 },
  checker_fine: { generate: () => generateCheckerboard(512, 32), uvScale: 10 },
  uv_grid: { generate: () => generateUVGrid(256), uvScale: 1 },
  fabric: { generate: () => generateFabricTexture(256), uvScale: 1 },
  tiny_4x4: { generate: () => generateTiny4x4(), uvScale: 1 },
}

export function useTextureLoader() {
  const { setActiveTexture, setMipmapPyramid } = useTextureStore()

  const loadPreset = useCallback((name: PresetName) => {
    const preset = presets[name]
    const img = preset.generate()
    setActiveTexture(img, name, preset.uvScale)
    const pyramid = generateMipmapPyramid(img)
    setMipmapPyramid(pyramid)
  }, [setActiveTexture, setMipmapPyramid])

  const loadFromFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Resize to nearest power of two, max 1024
        const maxSize = 1024
        let w = Math.min(img.width, maxSize)
        let h = Math.min(img.height, maxSize)
        w = nearestPowerOfTwo(w)
        h = nearestPowerOfTwo(h)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        setActiveTexture(imageData, file.name)
        setMipmapPyramid(generateMipmapPyramid(imageData))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [setActiveTexture, setMipmapPyramid])

  const loadFromImageData = useCallback((data: ImageData, name: string) => {
    setActiveTexture(data, name)
    setMipmapPyramid(generateMipmapPyramid(data))
  }, [setActiveTexture, setMipmapPyramid])

  // Load default texture on mount
  useEffect(() => {
    loadPreset('checker')
  }, [])

  return { loadPreset, loadFromFile, loadFromImageData }
}

function nearestPowerOfTwo(v: number): number {
  let p = 1
  while (p < v) p *= 2
  // Return the nearest power of two (could be smaller or equal)
  if (p - v > v - p / 2) return p / 2
  return p
}
