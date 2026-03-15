# Mipmap Explorer

An interactive tool for understanding texture filtering and mipmapping in real time.

**[Live Demo](https://visual-compute.github.io/mipmap/)**

## What it does

Mipmap Explorer lets you see exactly how different texture filtering modes affect rendering. You can switch between filters, swap textures, and move the camera — all while watching the results update instantly.

### Filter modes

- **Point** — Nearest-texel lookup. No filtering, no mipmaps. Shows raw aliasing artifacts.
- **Bilinear** — Interpolates between neighboring texels. Smoother than point, but still no mipmaps.
- **Trilinear** — Bilinear + blending between mip levels. Removes mip boundaries but can overblur.
- **Anisotropic** — Samples along the viewing direction. Best quality for surfaces at steep angles.

### Textures

Five built-in presets: **Checker**, **Checker Fine**, **UV Grid**, **Fabric**, and **4x4**. You can also upload your own PNG/JPEG — it will be auto-resized to power-of-two and mipmapped.

### Scenes

- **Plane** — A flat textured surface stretching into the distance. Great for seeing how filtering changes with distance.
- **3D** — A full scene with geometry. Move the camera freely to explore filtering from different angles.

### Mip level visualization

Toggle the **Levels** view to color-code which mip level is being sampled at each pixel. Hover over the 3D view to see the exact mip level at your cursor.

### Mipmap pyramid

The sidebar shows every level of the generated mipmap chain. Hover a level to lock the 3D view to that level.

### Controls

- **Drag** to orbit, **right-drag** to pan, **scroll** to zoom
- **WASD** to move, **Q/E** for vertical
- **Camera angle** slider (oblique to top-down)

## Getting started

```bash
npm install
npm run dev
```

## Tech stack

React, Three.js, Zustand, Tailwind CSS, TypeScript, Vite. Custom GLSL shaders handle all filtering modes.
