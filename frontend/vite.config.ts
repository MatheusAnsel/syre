import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  define: {
    // Expõe VITE_API_URL para o bundle de produção
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
  },
});
