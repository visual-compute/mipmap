// Ported from triangle_renderer.slang getLevel function

export function computeMipLevel(
  dudx: number,
  dvdx: number,
  dudy: number,
  dvdy: number,
  texWidth: number,
  texHeight: number
): number {
  const scaledDuDx = dudx * texWidth
  const scaledDvDx = dvdx * texHeight
  const scaledDuDy = dudy * texWidth
  const scaledDvDy = dvdy * texHeight

  const rhoX = Math.sqrt(scaledDuDx * scaledDuDx + scaledDvDx * scaledDvDx)
  const rhoY = Math.sqrt(scaledDuDy * scaledDuDy + scaledDvDy * scaledDvDy)
  const rho = Math.max(rhoX, rhoY)

  return Math.log2(Math.max(rho, 1e-6))
}

export function estimateScreenDerivatives(
  canvasWidth: number,
  canvasHeight: number,
  cameraDistance: number,
  fov: number = 60
): { dudx: number; dvdy: number } {
  const aspect = canvasWidth / canvasHeight
  const halfFovRad = (fov * Math.PI) / 360
  const planeHalfHeight = Math.tan(halfFovRad) * cameraDistance
  const planeHalfWidth = planeHalfHeight * aspect

  const dudx = (2 * planeHalfWidth) / canvasWidth
  const dvdy = (2 * planeHalfHeight) / canvasHeight

  return { dudx, dvdy }
}
