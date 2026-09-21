<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>HeyFred</q-toolbar-title>
        <q-tabs shrink>
          <q-route-tab to="/" exact label="Dashboard" />
          <q-route-tab to="/campaigns" label="Campagnes" />
        </q-tabs>
        <div v-if="authStore.user" class="row items-center q-gutter-sm q-ml-md">
          <span>{{ authStore.user.name }}</span>
          <q-btn flat dense icon="logout" label="Déconnexion" @click="onLogout" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "stores/auth";

export default defineComponent({
  name: "MainLayout",
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    function onLogout() {
      authStore.logout();
      router.push("/login");
    }

    return { authStore, onLogout };
  },
});
</script>
