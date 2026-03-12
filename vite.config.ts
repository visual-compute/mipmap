import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  base: '/mipmap/',
  plugins: [react(), tailwindcss(), glsl()],
})
