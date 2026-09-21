<template>
  <q-page class="q-pa-md">
    <div class="text-h5">Bienvenue, {{ authStore.user?.name }}</div>
    <div class="text-caption text-grey q-mt-sm">
      Backend status: <strong>{{ status }}</strong>
    </div>

    <q-banner class="q-mt-lg bg-grey-2">
      <template #action>
        <q-btn flat color="primary" label="Nouvelle campagne" to="/campaigns/new" />
      </template>
      Créez une campagne pour définir le type de prospect que vous souhaitez cibler.
    </q-banner>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { api } from "boot/axios";
import { useAuthStore } from "stores/auth";

export default defineComponent({
  name: "IndexPage",
  setup() {
    const authStore = useAuthStore();
    const status = ref("checking...");

    onMounted(async () => {
      try {
        const { data } = await api.get("/health");
        status.value = data.status;
      } catch (err) {
        status.value = "unreachable";
      }
    });

    return { authStore, status };
  },
});
</script>
