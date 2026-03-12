precision highp float;

varying vec2 vUv;

uniform sampler2D u_texture0;
uniform vec2 u_texSize0;

void main() {
  vec2 texelCoord = vUv * (u_texSize0 - 1.0);
  ivec2 nearest = ivec2(texelCoord + 0.5);
  nearest = clamp(nearest, ivec2(0), ivec2(u_texSize0) - ivec2(1));
  gl_FragColor = texelFetch(u_texture0, nearest, 0);
}
