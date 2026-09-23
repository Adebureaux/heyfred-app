<template>
  <q-page class="flex flex-center column">
    <HeyFredLogo class="q-mb-lg" />
    <q-card class="auth-card q-pa-md">
      <q-card-section>
        <div class="text-h5">Login</div>
        <div class="text-caption text-grey">Access your HeyFred workspace</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            lazy-rules
            :rules="[(val) => !!val || 'Email required']"
          />
          <q-input
            v-model="password"
            type="password"
            label="Password"
            lazy-rules
            :rules="[(val) => !!val || 'Password required']"
          />

          <q-btn
            type="submit"
            color="primary"
            label="Log in"
            class="full-width"
            :loading="loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center">
        Don't have an account yet?
        <router-link to="/register">Create an account</router-link>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { Notify } from "quasar";
import { useAuthStore } from "stores/auth";
import { extractErrorMessage } from "src/utils/error-message";
import HeyFredLogo from "components/HeyFredLogo.vue";

export default defineComponent({
  name: "LoginPage",
  components: { HeyFredLogo },
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    const email = ref("");
    const password = ref("");
    const loading = ref(false);

    async function onSubmit() {
      loading.value = true;
      try {
        await authStore.login({ email: email.value, password: password.value });
        router.push("/");
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Login failed"),
        });
      } finally {
        loading.value = false;
      }
    }

    return { email, password, loading, onSubmit };
  },
});
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 24px;
  border: 1px solid var(--heyfred-border);
  box-shadow: 0 4px 18px rgba(113, 68, 23, 0.06);
}
</style>
