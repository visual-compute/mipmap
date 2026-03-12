export function generateCheckerboard(size: number = 512, gridLines: number = 32): ImageData {
  const data = new Uint8ClampedArray(size * size * 4)
  const cellSize = size / gridLines
  const lineWidth = Math.max(2, Math.round(cellSize * 0.15))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inLineX = (x % cellSize) < lineWidth
      const inLineY = (y % cellSize) < lineWidth
      const isLine = inLineX || inLineY

      if (isLine) {
        // Light blue grid line
        data[i] = 100
        data[i + 1] = 160
        data[i + 2] = 255
      } else {
        // Black cell
        data[i] = 5
        data[i + 1] = 5
        data[i + 2] = 10
      }
      data[i + 3] = 255
    }
  }
  return new ImageData(data, size, size)
}

export function generateUVGrid(size: number = 256): ImageData {
  const data = new Uint8ClampedArray(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const u = x / (size - 1)
      const v = y / (size - 1)

      // Grid lines
      const gridU = (x % (size / 8)) < 1
      const gridV = (y % (size / 8)) < 1
      const isGrid = gridU || gridV

      if (isGrid) {
        data[i] = 200
        data[i + 1] = 200
        data[i + 2] = 200
      } else {
        data[i] = Math.round(u * 255)
        data[i + 1] = Math.round(v * 255)
        data[i + 2] = 50
      }
      data[i + 3] = 255
    }
  }
  return new ImageData(data, size, size)
}

export function generateTiny4x4(): ImageData {
  const colors = [
    [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
    [255, 0, 255], [0, 255, 255], [128, 0, 0], [0, 128, 0],
    [0, 0, 128], [128, 128, 0], [128, 0, 128], [0, 128, 128],
    [255, 128, 0], [128, 255, 0], [0, 128, 255], [255, 0, 128],
  ]

  const data = new Uint8ClampedArray(4 * 4 * 4)
  for (let i = 0; i < 16; i++) {
    data[i * 4] = colors[i][0]
    data[i * 4 + 1] = colors[i][1]
    data[i * 4 + 2] = colors[i][2]
    data[i * 4 + 3] = 255
  }
  return new ImageData(data, 4, 4)
}

export function generateFabricTexture(size: number = 256): ImageData {
  const data = new Uint8ClampedArray(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // Weave pattern
      const warpPhase = Math.sin(x * 0.5) * 0.3
      const weftPhase = Math.sin(y * 0.5) * 0.3
      const weave = Math.sin(x * 0.15 + warpPhase) * Math.cos(y * 0.15 + weftPhase)

      // Fabric base color (warm brown/beige)
      const base = 0.55 + weave * 0.15
      const noise = (Math.sin(x * 7.3 + y * 11.7) * 0.5 + 0.5) * 0.05

      data[i] = Math.round((base + noise) * 200 + 40)
      data[i + 1] = Math.round((base + noise) * 170 + 30)
      data[i + 2] = Math.round((base + noise) * 130 + 20)
      data[i + 3] = 255
    }
  }
  return new ImageData(data, size, size)
}
