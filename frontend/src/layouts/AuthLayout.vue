<template>
  <q-layout view="lHh Lpr lFf" class="heyfred-auth-layout">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "AuthLayout",
});
</script>

<style scoped>
.heyfred-auth-layout {
  background: radial-gradient(ellipse 60% 50% at 50% 0%, var(--heyfred-halo), transparent),
    var(--heyfred-peach);
}
</style>
