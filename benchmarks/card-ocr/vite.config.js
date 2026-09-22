import { defineConfig } from "vite";
export default defineConfig({
  publicDir: "../../projects/clientv2/public",
  optimizeDeps: {
    include: [
      "@paddleocr/paddleocr-js",
      "tesseract.js",
      "@techstark/opencv-js",
      "onnxruntime-web",
      "js-yaml",
    ],
  },
  server: { hmr: false, watch: { ignored: ["**/photo-results/**", "**/models/**"] } },
});
