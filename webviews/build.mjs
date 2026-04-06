import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { argv } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildEditor(name) {
  // https://vitejs.dev/config/
  return build({
    plugins: [svelte()],
    base: "",
    build: {
      rollupOptions: {
        input: {
          [name]: resolve(__dirname, name + ".html"),
        },
        output: {
          entryFileNames: `assets/${name}.js`,
          chunkFileNames: `assets/${name}-[name].js`,
          assetFileNames: `assets/${name}.[ext]`,
        },
      },
      cssCodeSplit: false,
      assetsInlineLimit: Infinity,
      emptyOutDir: true,
      watch: argv[2] == "--watch",
    },
    configFile: false,
  });
}

await Promise.all([buildEditor("commonEditor"), buildEditor("storyEditor")]);
