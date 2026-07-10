import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  ssr: {
    external: ["mongodb", "bson"],
    noExternal: ["@clerk/tanstack-react-start", "@clerk/react", "@clerk/shared"],
  },
  optimizeDeps: {
    exclude: ["mongodb", "bson"],
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
    nitro({
      preset: isNetlify ? "netlify" : "node-server",
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
});
