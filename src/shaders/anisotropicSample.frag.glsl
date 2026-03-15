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
uniform int u_maxAniso;

// Mip level colors
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

void main() {
  // Approximate anisotropic filtering using screen-space derivatives
  vec2 dx = dFdx(vUv) * u_texSize0;
  vec2 dy = dFdy(vUv) * u_texSize0;

  float lenDx = length(dx);
  float lenDy = length(dy);

  // Determine major and minor axes
  float majorLen = max(lenDx, lenDy);
  float minorLen = min(lenDx, lenDy);
  vec2 majorDir = lenDx > lenDy ? dx : dy;

  // Anisotropy ratio, clamped to max
  float aniso = clamp(majorLen / max(minorLen, 0.001), 1.0, float(u_maxAniso));
  int numSamples = int(ceil(aniso));
  numSamples = clamp(numSamples, 1, 16);

  // Use effective minor footprint after clamping anisotropy.
  // When true anisotropy exceeds maxAniso, using the raw minor axis picks too fine
  // a mip and causes shimmering/moire in the distance.
  float effectiveMinor = majorLen / float(numSamples);
  float level = log2(max(effectiveMinor, 1.0));
  level = clamp(level, 0.0, float(u_totalLevels - 1));
  int lo = int(floor(level));
  int hi = min(lo + 1, u_totalLevels - 1);
  float frac = level - float(lo);

  // Sample along major axis
  vec4 result = vec4(0.0);
  vec2 step = majorDir / u_texSize0 / float(numSamples);

  for (int i = 0; i < 16; i++) {
    if (i >= numSamples) break;
    float t = (float(i) + 0.5) / float(numSamples) - 0.5;
    vec2 sampleUV = fract(vUv + step * t * float(numSamples));
    vec4 s = mix(sampleLevel(lo, sampleUV), sampleLevel(hi, sampleUV), frac);
    result += s;
  }

  vec4 texColor = result / float(numSamples);

  if (u_mode == 1) {
    // Color-coded mip levels — show the actual level used for sampling (minor axis)
    int lvl = int(clamp(floor(level + 0.5), 0.0, float(u_totalLevels - 1)));
    vec3 col = levelColor(lvl);
    gl_FragColor = vec4(col * 0.7 + texColor.rgb * 0.3, 1.0);
    return;
  }

  gl_FragColor = texColor;
}
