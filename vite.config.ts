import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json";
import nodePolyfills from "vite-plugin-node-stdlib-browser";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/turbo-app/",
  plugins: [react(), nodePolyfills()],
  define: {
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(packageJson.version),
  },
});
