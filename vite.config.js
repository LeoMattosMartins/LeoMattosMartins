import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/LeoMattosMartins/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('/node_modules/xterm') || id.includes('/node_modules/xterm-addon-fit')) {
            return 'xterm-vendor';
          }

          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom') || id.includes('/node_modules/react-router-dom')) {
            return 'react-vendor';
          }

          if (id.includes('/node_modules/i18next') || id.includes('/node_modules/react-i18next')) {
            return 'i18n-vendor';
          }

          return 'vendor';
        }
      }
    }
  }
});
