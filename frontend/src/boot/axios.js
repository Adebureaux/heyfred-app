import { boot } from "quasar/wrappers";
import axios from "axios";
import { getToken, clearSession } from "src/utils/token-storage";

const api = axios.create({ baseURL: process.env.API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default boot(({ app, router }) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        clearSession();
        if (router.currentRoute.value.meta.requiresAuth) {
          router.push("/login");
        }
      }
      return Promise.reject(error);
    },
  );

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
