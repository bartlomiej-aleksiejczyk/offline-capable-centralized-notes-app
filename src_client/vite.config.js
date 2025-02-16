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
    lib: {
      entry: path.resolve(__dirname, "src/main.js"),
      name: "OfflineNotesClientLibrary",
      fileName: "offline_notes_client_library",
      formats: ["es"],
    },
  },
});
