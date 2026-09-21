import { route } from "quasar/wrappers";
import { createRouter, createWebHistory, createMemoryHistory } from "vue-router";
import routes from "./routes";
import { getToken } from "src/utils/token-storage";

export default route(function () {
  const createHistory = process.env.SERVER ? createMemoryHistory : createWebHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to) => {
    const isAuthenticated = !!getToken();

    if (to.meta.requiresAuth && !isAuthenticated) {
      return "/login";
    }
    if (to.meta.requiresGuest && isAuthenticated) {
      return "/";
    }
    return true;
  });

  return Router;
});
