<template>
  <q-page>
    <div class="page-heading q-mb-md">
      <div>
        <div class="eyebrow">Settings</div>
        <div class="text-h5">Connect LinkedIn</div>
        <div class="text-caption text-grey">
          Required to find and enrich decision-maker profiles via Unipile.
        </div>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <q-icon
            :name="status === 'CONNECTED' ? 'link' : 'link_off'"
            :color="status === 'CONNECTED' ? 'positive' : 'grey-6'"
            size="28px"
          />
          <div>
            <div class="text-body1">{{ statusLabel }}</div>
            <div class="text-caption text-grey">{{ statusDescription }}</div>
          </div>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-btn
            flat
            color="primary"
            label="Sync from Unipile"
            :loading="syncing"
            @click="onSync"
          />
          <q-btn
            color="primary"
            :label="status === 'CONNECTED' ? 'Reconnect' : 'Connect LinkedIn'"
            :loading="connecting"
            @click="onConnect"
          />
        </div>
      </q-card-section>
    </q-card>

    <div class="text-caption text-grey q-mt-sm">
      Connected your account another way (e.g. directly via Unipile)? Use "Sync from Unipile" to
      pick it up instead of reconnecting.
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { Notify } from "quasar";
import { api } from "boot/axios";
import { extractErrorMessage } from "src/utils/error-message";

export default defineComponent({
  name: "LinkedInSettingsPage",
  setup() {
    const route = useRoute();
    const status = ref("DISCONNECTED");
    const connecting = ref(false);
    const syncing = ref(false);

    const statusLabel = computed(() => {
      if (status.value === "CONNECTED") return "LinkedIn connected";
      if (status.value === "ERROR") return "Connection failed";
      return "Not connected";
    });
    const statusDescription = computed(() => {
      if (status.value === "CONNECTED") return "Decision-maker search is ready to use.";
      if (status.value === "ERROR") return "Something went wrong — try connecting again.";
      return "Connect your LinkedIn account to enable decision-maker search.";
    });

    async function fetchStatus() {
      const { data } = await api.get("/unipile/status");
      status.value = data.status;
    }

    async function onConnect() {
      connecting.value = true;
      try {
        const { data } = await api.post("/unipile/connect");
        window.location.href = data.url;
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Unable to start connection"),
        });
        connecting.value = false;
      }
    }

    async function onSync() {
      syncing.value = true;
      try {
        const { data } = await api.post("/unipile/sync");
        status.value = data.status;
        if (data.status === "CONNECTED") {
          Notify.create({ type: "positive", message: `Synced: ${data.name ?? "LinkedIn account"}` });
        } else {
          Notify.create({ type: "warning", message: "No LinkedIn account found in Unipile." });
        }
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Unable to sync"),
        });
      } finally {
        syncing.value = false;
      }
    }

    onMounted(async () => {
      await fetchStatus();
      if (route.query.connected === "1") {
        Notify.create({ type: "positive", message: "LinkedIn connected." });
      } else if (route.query.connected === "0") {
        Notify.create({ type: "negative", message: "LinkedIn connection failed." });
      }
    });

    return { status, statusLabel, statusDescription, connecting, syncing, onConnect, onSync };
  },
});
</script>

<style scoped>
.eyebrow {
  color: var(--heyfred-muted);
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
</style>
