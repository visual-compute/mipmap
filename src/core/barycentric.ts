// Ported from triangle.slang:29-58

export interface Vec2 {
  x: number
  y: number
}

export function calculateBarycentricCoord2D(
  p: Vec2,
  a: Vec2,
  b: Vec2,
  c: Vec2
): [number, number, number] {
  const EPSILON = 1e-6

  // Use 2D cross product (determinant)
  const v0x = b.x - a.x
  const v0y = b.y - a.y
  const v1x = c.x - a.x
  const v1y = c.y - a.y

  const areaABC = v0x * v1y - v0y * v1x
  if (Math.abs(areaABC) < EPSILON) return [0, 0, 0]

  const v2x = p.x - a.x
  const v2y = p.y - a.y

  const v = (v2x * v1y - v2y * v1x) / areaABC
  const w = (v0x * v2y - v0y * v2x) / areaABC
  const u = 1 - v - w

  return [u, v, w]
}

export function interpolateUV(
  bary: [number, number, number],
  uv0: Vec2,
  uv1: Vec2,
  uv2: Vec2
): Vec2 {
  return {
    x: bary[0] * uv0.x + bary[1] * uv1.x + bary[2] * uv2.x,
    y: bary[0] * uv0.y + bary[1] * uv1.y + bary[2] * uv2.y,
  }
}
