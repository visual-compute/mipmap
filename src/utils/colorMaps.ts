export function mipLevelColor(level: number): [number, number, number] {
  const colors: [number, number, number][] = [
    [255, 50, 50],    // Level 0: red
    [255, 150, 0],    // Level 1: orange
    [255, 255, 0],    // Level 2: yellow
    [0, 255, 0],      // Level 3: green
    [0, 255, 255],    // Level 4: cyan
    [0, 100, 255],    // Level 5: blue
    [150, 0, 255],    // Level 6: purple
    [255, 0, 150],    // Level 7: pink
  ]

  const lo = Math.max(0, Math.min(colors.length - 1, Math.floor(level)))
  const hi = Math.min(lo + 1, colors.length - 1)
  const f = level - lo

  return [
    colors[lo][0] * (1 - f) + colors[hi][0] * f,
    colors[lo][1] * (1 - f) + colors[hi][1] * f,
    colors[lo][2] * (1 - f) + colors[hi][2] * f,
  ]
}

export function heatmapColor(value: number): [number, number, number] {
  // 0 = blue, 0.5 = green, 1 = red
  const v = Math.max(0, Math.min(1, value))
  if (v < 0.5) {
    const t = v * 2
    return [0, Math.round(t * 255), Math.round((1 - t) * 255)]
  } else {
    const t = (v - 0.5) * 2
    return [Math.round(t * 255), Math.round((1 - t) * 255), 0]
  }
}
