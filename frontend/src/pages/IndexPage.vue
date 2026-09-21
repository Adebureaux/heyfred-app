<template>
  <q-page class="q-pa-md">
    <div class="text-h5">HeyFred</div>
    <div class="q-mt-md">
      Backend status: <strong>{{ status }}</strong>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { api } from "boot/axios";

export default defineComponent({
  name: "IndexPage",
  setup() {
    const status = ref("checking...");

    onMounted(async () => {
      try {
        const { data } = await api.get("/health");
        status.value = data.status;
      } catch (err) {
        status.value = "unreachable";
      }
    });

    return { status };
  },
});
</script>
