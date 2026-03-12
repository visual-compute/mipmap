precision highp float;

varying vec2 vUv;

uniform sampler2D u_texture0;
uniform vec2 u_texSize0;

void main() {
  vec2 maxCoord = u_texSize0 - 1.0;
  vec2 texelCoord = vUv * u_texSize0 - 0.5;
  texelCoord = clamp(texelCoord, vec2(0.0), maxCoord);

  float x = texelCoord.x;
  float y = texelCoord.y;

  int x0 = int(floor(x));
  int y0 = int(floor(y));
  int x1 = min(x0 + 1, int(maxCoord.x));
  int y1 = min(y0 + 1, int(maxCoord.y));

  vec4 v00 = texelFetch(u_texture0, ivec2(x0, y0), 0);
  vec4 v10 = texelFetch(u_texture0, ivec2(x1, y0), 0);
  vec4 v01 = texelFetch(u_texture0, ivec2(x0, y1), 0);
  vec4 v11 = texelFetch(u_texture0, ivec2(x1, y1), 0);

  float fx = x - float(x0);
  float fy = y - float(y0);

  vec4 top = mix(v00, v10, fx);
  vec4 bottom = mix(v01, v11, fx);
  gl_FragColor = mix(top, bottom, fy);
}
