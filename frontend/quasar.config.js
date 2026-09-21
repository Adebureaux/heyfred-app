/* eslint-env node */
const { configure } = require("quasar/wrappers");

module.exports = configure(function () {
  return {
    boot: ["axios", "pinia"],
    css: ["app.scss"],
    extras: ["roboto-font", "material-icons"],

    build: {
      target: {
        browser: ["es2019", "edge88", "firefox78", "chrome87", "safari13.1"],
        node: "node20",
      },
      vueRouterMode: "history",
      env: {
        API_BASE_URL: process.env.VITE_API_BASE_URL || "http://localhost:3000",
      },
      extendViteConf(viteConf) {
        // @heyfred/shared is a pnpm workspace package (symlinked, not a true
        // node_modules dep), so Vite serves its CommonJS dist/index.js raw via
        // @fs/ instead of pre-bundling it to ESM. Force it through esbuild's
        // CJS->ESM interop so the browser can import named exports from it.
        viteConf.optimizeDeps = viteConf.optimizeDeps || {};
        viteConf.optimizeDeps.include = [
          ...(viteConf.optimizeDeps.include || []),
          "@heyfred/shared",
        ];
      },
    },

    devServer: {
      host: "0.0.0.0",
      port: 9000,
      open: false,
    },

    framework: {
      config: {},
      plugins: ["Notify"],
    },
  };
});
