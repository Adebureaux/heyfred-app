<template>
  <q-page class="flex flex-center">
    <q-card class="auth-card q-pa-md">
      <q-card-section>
        <div class="text-h5">Créer un compte</div>
        <div class="text-caption text-grey">Rejoignez HeyFred</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="name"
            label="Nom"
            lazy-rules
            :rules="[(val) => !!val || 'Nom requis']"
          />
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
            hint="8 caractères minimum"
            lazy-rules
            :rules="[(val) => (val && val.length >= 8) || '8 caractères minimum']"
          />

          <q-btn
            type="submit"
            color="primary"
            label="Créer mon compte"
            class="full-width"
            :loading="loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center">
        Déjà un compte ?
        <router-link to="/login">Se connecter</router-link>
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
  name: "RegisterPage",
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    const name = ref("");
    const email = ref("");
    const password = ref("");
    const loading = ref(false);

    async function onSubmit() {
      loading.value = true;
      try {
        await authStore.register({ name: name.value, email: email.value, password: password.value });
        router.push("/");
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Inscription impossible"),
        });
      } finally {
        loading.value = false;
      }
    }

    return { name, email, password, loading, onSubmit };
  },
});
</script>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 400px;
}
</style>
