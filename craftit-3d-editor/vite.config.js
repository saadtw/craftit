import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
  // Allow Three.js large dependency
  optimizeDeps: {
    include: ['three'],
  },
});
