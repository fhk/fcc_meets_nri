import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svelte()],
	build: {
		rollupOptions: {
			external: [
				"fast-deep-equal",
				// Add other modules here if you encounter similar "failed to resolve"
				// errors for them during the build process, *after* confirming
				// they are installed and should be external.
			],
		},
	},
	optimizeDeps: {
		include: [
			"fast-deep-equal",
			"clone",
			"semver",
			"json-stringify-pretty-compact",
			"fast-json-stable-stringify",
		],
	},
});
