import { defineConfig } from "vite";
export default defineConfig({
  optimizeDeps: {
    include: [
      "@paddleocr/paddleocr-js",
      "tesseract.js",
      "@techstark/opencv-js",
      "onnxruntime-web",
      "js-yaml",
      "@huggingface/transformers",
    ],
  },
  server: { hmr: false, watch: { ignored: ["**/photo-results/**", "**/models/**"] } },
});
