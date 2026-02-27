import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // حجم التحذير: 600KB بدلاً من 500KB (framer-motion كبير)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // تقسيم الـ vendor bundles لتحسين caching
        manualChunks: {
          // React core — يتغير نادراً، cache طويل
          'vendor-react': ['react', 'react-dom'],

          // framer-motion — مكتبة كبيرة (1.2MB) منفصلة
          'vendor-motion': ['framer-motion'],

          // lucide-react — أيقونات
          'vendor-icons': ['lucide-react'],

          // Supabase — لا يتغير مع كل build
          'vendor-supabase': ['@supabase/supabase-js'],

          // Zustand — state management
          'vendor-zustand': ['zustand'],
        },
      },
    },

    // تفعيل source maps فقط في dev
    sourcemap: false,

    // ضغط أفضل
    minify: 'terser',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    terserOptions: {
      compress: {
        // حذف console.log في production
        drop_console: true,
        drop_debugger: true,
        // تحسينات إضافية
        passes: 2,
      },
      format: {
        // إزالة التعليقات
        comments: false,
      },
    } as any,
  },

  // تحسين سرعة الـ dev server
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
