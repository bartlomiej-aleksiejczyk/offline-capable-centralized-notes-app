import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    manifest: true,
    outDir: resolve(__dirname, "client_components__dist"),
    lib: {
      entry: resolve(__dirname, "client_components/main.js"),
      name: "OfflineNotesClientComponents",
      fileName: "offline_notes_client_components",
      formats: ["es"],
    },
  },
});
