// Common utilities for texture sampling shaders

// Fetch a texel from a mipmap level texture using integer coordinates
vec4 texelFetchLevel(sampler2D tex, ivec2 coord, ivec2 texSize) {
  coord = clamp(coord, ivec2(0), texSize - ivec2(1));
  return texelFetch(tex, coord, 0);
}

vec4 lerpVec4(vec4 a, vec4 b, float t) {
  return a * (1.0 - t) + b * t;
}
