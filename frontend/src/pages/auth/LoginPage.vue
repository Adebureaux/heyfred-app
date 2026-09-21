<template>
  <q-page class="flex flex-center">
    <q-card class="auth-card q-pa-md">
      <q-card-section>
        <div class="text-h5">Connexion</div>
        <div class="text-caption text-grey">Accédez à votre espace HeyFred</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            lazy-rules
            :rules="[(val) => !!val || 'Email requis']"
          />
          <q-input
            v-model="password"
            type="password"
            label="Mot de passe"
            lazy-rules
            :rules="[(val) => !!val || 'Mot de passe requis']"
          />

          <q-btn
            type="submit"
            color="primary"
            label="Se connecter"
            class="full-width"
            :loading="loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center">
        Pas encore de compte ?
        <router-link to="/register">Créer un compte</router-link>
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

export default defineComponent({
  name: "LoginPage",
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
          message: extractErrorMessage(err, "Connexion impossible"),
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
}
</style>
