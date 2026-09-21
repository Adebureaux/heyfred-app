import { defineStore } from "pinia";
import { api } from "boot/axios";
import { getToken, getStoredUser, setSession, clearSession } from "src/utils/token-storage";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: getToken(),
    user: getStoredUser(),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    async register({ email, password, name }) {
      const { data } = await api.post("/auth/register", { email, password, name });
      this.setSession(data.accessToken, data.user);
    },

    async login({ email, password }) {
      const { data } = await api.post("/auth/login", { email, password });
      this.setSession(data.accessToken, data.user);
    },

    setSession(token, user) {
      this.token = token;
      this.user = user;
      setSession(token, user);
    },

    logout() {
      this.token = null;
      this.user = null;
      clearSession();
    },
  },
});
