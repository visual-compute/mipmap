precision highp float;

varying vec2 vUv;

uniform sampler2D u_texture0;
uniform vec2 u_texSize0;
uniform int u_filterMode; // 0 = point, 1 = bilinear

vec4 bilinearAt(vec2 uv) {
  vec2 maxCoord = u_texSize0 - 1.0;
  vec2 tc = uv * u_texSize0 - 0.5;
  tc = clamp(tc, vec2(0.0), maxCoord);
  int x0 = int(floor(tc.x));
  int y0 = int(floor(tc.y));
  int x1 = min(x0 + 1, int(maxCoord.x));
  int y1 = min(y0 + 1, int(maxCoord.y));
  vec4 v00 = texelFetch(u_texture0, ivec2(x0, y0), 0);
  vec4 v10 = texelFetch(u_texture0, ivec2(x1, y0), 0);
  vec4 v01 = texelFetch(u_texture0, ivec2(x0, y1), 0);
  vec4 v11 = texelFetch(u_texture0, ivec2(x1, y1), 0);
  float fx = tc.x - float(x0);
  float fy = tc.y - float(y0);
  return mix(mix(v00, v10, fx), mix(v01, v11, fx), fy);
}

vec4 pointAt(vec2 uv) {
  vec2 tc = floor(uv * u_texSize0);
  tc = clamp(tc, vec2(0.0), u_texSize0 - 1.0);
  return texelFetch(u_texture0, ivec2(tc), 0);
}

void main() {
  if (u_filterMode == 1) {
    gl_FragColor = bilinearAt(vUv);
  } else {
    gl_FragColor = pointAt(vUv);
  }
}
