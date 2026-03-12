// CPU-side texture sampling implementations
// Ported from texture.slang

export function pointSample(data: ImageData, u: number, v: number): [number, number, number, number] {
  const w = data.width
  const h = data.height
  const x = Math.round(u * (w - 1))
  const y = Math.round(v * (h - 1))
  const cx = Math.max(0, Math.min(w - 1, x))
  const cy = Math.max(0, Math.min(h - 1, y))
  const i = (cy * w + cx) * 4
  return [data.data[i], data.data[i + 1], data.data[i + 2], data.data[i + 3]]
}

export function bilinearSample(data: ImageData, u: number, v: number): [number, number, number, number] {
  const w = data.width
  const h = data.height
  const maxX = w - 1
  const maxY = h - 1

  let x = u * w - 0.5
  let y = v * h - 0.5
  x = Math.max(0, Math.min(maxX, x))
  y = Math.max(0, Math.min(maxY, y))

  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, maxX)
  const y1 = Math.min(y0 + 1, maxY)

  const fx = x - x0
  const fy = y - y0

  const getPixel = (px: number, py: number): [number, number, number, number] => {
    const i = (py * w + px) * 4
    return [data.data[i], data.data[i + 1], data.data[i + 2], data.data[i + 3]]
  }

  const v00 = getPixel(x0, y0)
  const v10 = getPixel(x1, y0)
  const v01 = getPixel(x0, y1)
  const v11 = getPixel(x1, y1)

  const result: [number, number, number, number] = [0, 0, 0, 0]
  for (let c = 0; c < 4; c++) {
    const top = v00[c] * (1 - fx) + v10[c] * fx
    const bottom = v01[c] * (1 - fx) + v11[c] * fx
    result[c] = top * (1 - fy) + bottom * fy
  }
  return result
}

export function trilinearSample(
  mipmaps: ImageData[],
  u: number,
  v: number,
  d: number
): [number, number, number, number] {
  const maxLevel = mipmaps.length - 1
  d = Math.max(0, Math.min(maxLevel, d))
  const lo = Math.floor(d)
  const hi = Math.min(lo + 1, maxLevel)
  const frac = d - lo

  const sLo = bilinearSample(mipmaps[lo], u, v)
  const sHi = bilinearSample(mipmaps[hi], u, v)

  const result: [number, number, number, number] = [0, 0, 0, 0]
  for (let c = 0; c < 4; c++) {
    result[c] = sLo[c] * (1 - frac) + sHi[c] * frac
  }
  return result
}
