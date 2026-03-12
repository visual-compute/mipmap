import * as THREE from 'three'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export type SamplingMode = 'nearest' | 'bilinear' | 'trilinear' | 'anisotropic' | 'mipVis' | 'autoMip'

import pointSampleFrag from '../shaders/pointSample.frag.glsl'
import bilinearSampleFrag from '../shaders/bilinearSample.frag.glsl'
import trilinearSampleFrag from '../shaders/trilinearSample.frag.glsl'
import anisotropicSampleFrag from '../shaders/anisotropicSample.frag.glsl'
import mipLevelVisFrag from '../shaders/mipLevelVis.frag.glsl'
import autoMipFrag from '../shaders/autoMip.frag.glsl'

const fragShaders: Record<SamplingMode, string> = {
  nearest: pointSampleFrag,
  bilinear: bilinearSampleFrag,
  trilinear: trilinearSampleFrag,
  anisotropic: anisotropicSampleFrag,
  mipVis: mipLevelVisFrag,
  autoMip: autoMipFrag,
}

export function createDataTexture(imageData: ImageData): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    new Uint8Array(imageData.data),
    imageData.width,
    imageData.height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  )
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export function createSamplingMaterial(
  mode: SamplingMode,
  mipmapTextures: THREE.DataTexture[],
  options: {
    mipLevel?: number
    totalLevels?: number
    showLevelColors?: boolean
    maxAniso?: number
    autoMipMode?: number      // 0=textured, 1=level colors, 2=locked
    lockedLevel?: number
  } = {}
): THREE.ShaderMaterial {
  const uniforms: Record<string, THREE.IUniform> = {}

  const fallback = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1, 1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  )
  fallback.minFilter = THREE.NearestFilter
  fallback.magFilter = THREE.NearestFilter
  fallback.needsUpdate = true

  for (let i = 0; i < 8; i++) {
    const tex = mipmapTextures[i] || fallback
    uniforms[`u_texture${i}`] = { value: tex }
    uniforms[`u_texSize${i}`] = { value: new THREE.Vector2(tex.image.width, tex.image.height) }
  }

  uniforms['u_mipLevel'] = { value: options.mipLevel ?? 0 }
  uniforms['u_totalLevels'] = { value: options.totalLevels ?? mipmapTextures.length }
  uniforms['u_showLevelColors'] = { value: options.showLevelColors ?? false }
  uniforms['u_maxAniso'] = { value: options.maxAniso ?? 8 }
  uniforms['u_mode'] = { value: options.autoMipMode ?? 0 }
  uniforms['u_lockedLevel'] = { value: options.lockedLevel ?? 0 }

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: fragShaders[mode],
    uniforms,
  })
}
