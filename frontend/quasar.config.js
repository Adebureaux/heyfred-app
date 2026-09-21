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
    },

    devServer: {
      host: "0.0.0.0",
      port: 9000,
      open: false,
    },

    framework: {
      config: {},
      plugins: [],
    },
  };
});
