import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // ES2020 target: أصغر bundle + أسرع parse على الجوال
    target: 'es2020',
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: {
          // React core — يتغير نادراً، cache طويل جداً
          'vendor-react': ['react', 'react-dom'],
          // framer-motion — مكتبة ضخمة، منفصلة تماماً
          'vendor-motion': ['framer-motion'],
          // Supabase — لا يتغير مع كل build
          'vendor-supabase': ['@supabase/supabase-js'],
          // Zustand — state management
          'vendor-zustand': ['zustand'],
          // lucide-react — أيقونات (منفصلة لأنها كبيرة)
          'vendor-icons': ['lucide-react'],
        },
        // تسمية الملفات بـ hash لـ cache busting مثالي
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    sourcemap: false,
    cssMinify: true,

    minify: 'terser',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,           // تمريرات أكثر = ضغط أفضل
        pure_funcs: ['console.log', 'console.warn', 'console.info'],
        dead_code: true,
      },
      mangle: { toplevel: true },
      format: { comments: false },
    } as any,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'framer-motion',
      '@supabase/supabase-js',
    ],
  },
})
