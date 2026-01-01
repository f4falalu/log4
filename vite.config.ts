import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Gzip compression for production
    mode === "production" && viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
    }),
    // Brotli compression for production (better compression)
    mode === "production" && viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for large dependencies
          if (id.includes('node_modules')) {
            // PDF/Export libraries (isolate these completely)
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
              return 'vendor-export';
            }

            // Maps (Leaflet is heavy)
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }

            // Charts
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }

            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }

            // Date utilities
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }

            // Everything else stays together to avoid circular deps
            return 'vendor';
          }

          // Application code chunks by module
          if (id.includes('src/pages/fleetops/vlms')) {
            return 'pages-vlms';
          }
          if (id.includes('src/pages/fleetops')) {
            return 'pages-fleetops';
          }
          if (id.includes('src/pages/storefront')) {
            return 'pages-storefront';
          }
          if (id.includes('src/components/map')) {
            return 'components-map';
          }
          if (id.includes('src/components/vlms')) {
            return 'components-vlms';
          }
        },
      },
    },
    // Increase chunk size warning limit (we're splitting now)
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (disable in production)
    sourcemap: mode === 'development',
  },
}));
