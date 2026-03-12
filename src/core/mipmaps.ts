import type { MipmapLevel } from '../stores/textureStore'

export function generateMipmapPyramid(source: ImageData): MipmapLevel[] {
  const levels: MipmapLevel[] = [{ data: source, width: source.width, height: source.height }]

  let current = source
  while (current.width > 1 || current.height > 1) {
    const newW = Math.max(1, Math.floor(current.width / 2))
    const newH = Math.max(1, Math.floor(current.height / 2))
    const downsampled = boxFilterDownsample(current, newW, newH)
    levels.push({ data: downsampled, width: newW, height: newH })
    current = downsampled
  }

  return levels
}

function boxFilterDownsample(src: ImageData, newW: number, newH: number): ImageData {
  // Manual box filter for accuracy
  const result = new ImageData(newW, newH)
  const srcW = src.width
  const srcH = src.height

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const sx = x * 2
      const sy = y * 2
      const dstIdx = (y * newW + x) * 4

      // Average 2x2 block (handle edge cases for odd sizes)
      let r = 0, g = 0, b = 0, a = 0
      let count = 0
      for (let dy = 0; dy < 2 && sy + dy < srcH; dy++) {
        for (let dx = 0; dx < 2 && sx + dx < srcW; dx++) {
          const srcIdx = ((sy + dy) * srcW + (sx + dx)) * 4
          r += src.data[srcIdx]
          g += src.data[srcIdx + 1]
          b += src.data[srcIdx + 2]
          a += src.data[srcIdx + 3]
          count++
        }
      }

      result.data[dstIdx] = r / count
      result.data[dstIdx + 1] = g / count
      result.data[dstIdx + 2] = b / count
      result.data[dstIdx + 3] = a / count
    }
  }

  return result
}
