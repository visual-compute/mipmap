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

uniform float u_mipLevel;
uniform int u_totalLevels;
uniform bool u_showLevelColors;

vec3 levelColor(float level) {
  // Rainbow colormap for mip levels
  if (level < 1.0) return mix(vec3(1,0,0), vec3(1,0.5,0), level);
  if (level < 2.0) return mix(vec3(1,0.5,0), vec3(1,1,0), level - 1.0);
  if (level < 3.0) return mix(vec3(1,1,0), vec3(0,1,0), level - 2.0);
  if (level < 4.0) return mix(vec3(0,1,0), vec3(0,1,1), level - 3.0);
  if (level < 5.0) return mix(vec3(0,1,1), vec3(0,0,1), level - 4.0);
  if (level < 6.0) return mix(vec3(0,0,1), vec3(0.5,0,1), level - 5.0);
  return vec3(0.5, 0, 1);
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
  float d = clamp(u_mipLevel, 0.0, float(u_totalLevels - 1));
  int lo = int(floor(d));
  int hi = min(lo + 1, u_totalLevels - 1);
  float frac = d - float(lo);
  vec4 texColor = mix(sampleLevel(lo, vUv), sampleLevel(hi, vUv), frac);

  if (u_showLevelColors) {
    vec3 tint = levelColor(d);
    gl_FragColor = vec4(texColor.rgb * 0.4 + tint * 0.6, 1.0);
  } else {
    gl_FragColor = texColor;
  }
}
