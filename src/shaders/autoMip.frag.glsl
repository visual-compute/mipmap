precision highp float;

varying vec2 vUv;

uniform sampler2D u_texture0;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
uniform sampler2D u_texture4;
uniform sampler2D u_texture5;
uniform sampler2D u_texture6;
uniform sampler2D u_texture7;

uniform vec2 u_texSize0;
uniform vec2 u_texSize1;
uniform vec2 u_texSize2;
uniform vec2 u_texSize3;
uniform vec2 u_texSize4;
uniform vec2 u_texSize5;
uniform vec2 u_texSize6;
uniform vec2 u_texSize7;

uniform int u_totalLevels;
uniform int u_mode; // 0 = trilinear textured, 1 = level colors, 2 = locked to u_lockedLevel
uniform float u_lockedLevel;

// Mip level colors — distinct, bold, flat
vec3 levelColor(int level) {
  if (level == 0) return vec3(1.0, 0.24, 0.24);   // red
  if (level == 1) return vec3(1.0, 0.55, 0.0);     // orange
  if (level == 2) return vec3(1.0, 0.84, 0.0);     // yellow
  if (level == 3) return vec3(0.0, 0.78, 0.33);    // green
  if (level == 4) return vec3(0.0, 0.74, 0.83);    // cyan
  if (level == 5) return vec3(0.16, 0.38, 1.0);    // blue
  if (level == 6) return vec3(0.49, 0.30, 1.0);    // purple
  return vec3(1.0, 0.25, 0.50);                     // pink
}

vec4 bilinearAt(sampler2D tex, vec2 texSize, vec2 uv) {
  vec2 maxCoord = texSize - 1.0;
  vec2 tc = uv * texSize - 0.5;
  tc = clamp(tc, vec2(0.0), maxCoord);
  int x0 = int(floor(tc.x));
  int y0 = int(floor(tc.y));
  int x1 = min(x0 + 1, int(maxCoord.x));
  int y1 = min(y0 + 1, int(maxCoord.y));
  vec4 v00 = texelFetch(tex, ivec2(x0, y0), 0);
  vec4 v10 = texelFetch(tex, ivec2(x1, y0), 0);
  vec4 v01 = texelFetch(tex, ivec2(x0, y1), 0);
  vec4 v11 = texelFetch(tex, ivec2(x1, y1), 0);
  float fx = tc.x - float(x0);
  float fy = tc.y - float(y0);
  return mix(mix(v00, v10, fx), mix(v01, v11, fx), fy);
}

vec4 sampleLevel(int level, vec2 uv) {
  if (level == 0) return bilinearAt(u_texture0, u_texSize0, uv);
  if (level == 1) return bilinearAt(u_texture1, u_texSize1, uv);
  if (level == 2) return bilinearAt(u_texture2, u_texSize2, uv);
  if (level == 3) return bilinearAt(u_texture3, u_texSize3, uv);
  if (level == 4) return bilinearAt(u_texture4, u_texSize4, uv);
  if (level == 5) return bilinearAt(u_texture5, u_texSize5, uv);
  if (level == 6) return bilinearAt(u_texture6, u_texSize6, uv);
  return bilinearAt(u_texture7, u_texSize7, uv);
}

vec4 trilinearSample(float d, vec2 uv) {
  d = clamp(d, 0.0, float(u_totalLevels - 1));
  int lo = int(floor(d));
  int hi = min(lo + 1, u_totalLevels - 1);
  float frac = d - float(lo);
  return mix(sampleLevel(lo, uv), sampleLevel(hi, uv), frac);
}

float computeMipLevel() {
  // Screen-space derivatives of UV, scaled to texel space
  vec2 dx = dFdx(vUv) * u_texSize0;
  vec2 dy = dFdy(vUv) * u_texSize0;
  float rhoX = length(dx);
  float rhoY = length(dy);
  float rho = max(rhoX, rhoY);
  return log2(max(rho, 1.0));
}

void main() {
  float autoLevel = computeMipLevel();

  if (u_mode == 2) {
    // Locked to a specific level
    float d = clamp(u_lockedLevel, 0.0, float(u_totalLevels - 1));
    gl_FragColor = trilinearSample(d, vUv);
    return;
  }

  if (u_mode == 1) {
    // Color-coded mip levels — flat bands, no blending
    int level = int(clamp(floor(autoLevel + 0.5), 0.0, float(u_totalLevels - 1)));
    vec3 col = levelColor(level);
    // Slight texture detail mixed in
    vec4 tex = trilinearSample(autoLevel, vUv);
    gl_FragColor = vec4(col * 0.7 + tex.rgb * 0.3, 1.0);
    return;
  }

  // Mode 0: normal trilinear with auto mip
  gl_FragColor = trilinearSample(autoLevel, vUv);
}
