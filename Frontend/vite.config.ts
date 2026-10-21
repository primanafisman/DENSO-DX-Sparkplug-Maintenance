import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwind()],server:{proxy:{'/api':{target:'http://127.0.0.1:8100',changeOrigin:true},'/health':'http://127.0.0.1:8100','/ready':'http://127.0.0.1:8100'}},test:{environment:'jsdom',setupFiles:['./src/test/setup.ts'],include:['src/**/*.test.{ts,tsx}'],maxWorkers:2},build:{chunkSizeWarningLimit:700}});
